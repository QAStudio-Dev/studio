/**
 * Jira API Client
 * Handles communication with Jira REST API
 */

import { decrypt } from '$lib/server/encryption';

export interface JiraConfig {
	baseUrl: string; // e.g., "https://yourcompany.atlassian.net"
	email: string; // Jira account email
	apiToken: string; // Jira API token
}

export interface JiraIssue {
	id: string;
	key: string;
	fields: {
		summary: string;
		description?: string;
		issuetype: {
			name: string;
		};
		status: {
			name: string;
		};
		priority?: {
			name: string;
		};
		assignee?: {
			displayName: string;
		};
		reporter?: {
			displayName: string;
		};
		labels?: string[];
	};
}

export interface JiraProject {
	id: string;
	key: string;
	name: string;
}

export interface JiraIssueType {
	id: string;
	name: string;
	description: string;
}

export interface CreateIssueRequest {
	projectKey: string;
	summary: string;
	description: string;
	issueType: string; // e.g., "Bug", "Task"
	priority?: string; // e.g., "High", "Medium", "Low"
	labels?: string[];
}

/**
 * Convert markdown-style text to Atlassian Document Format (ADF)
 * Supports: **bold**, links, and line breaks
 */
function markdownToADF(text: string): any {
	const content: any[] = [];
	const lines = text.split('\n');

	for (const line of lines) {
		if (line.trim() === '---') {
			// Horizontal rule
			content.push({
				type: 'rule'
			});
			continue;
		}

		if (line.trim() === '') {
			// Empty paragraph for spacing
			content.push({
				type: 'paragraph',
				content: []
			});
			continue;
		}

		// Parse inline formatting (bold and links)
		const paragraphContent: any[] = [];

		// Match **bold** and URLs
		const combinedRegex = /(\*\*([^*]+)\*\*)|(https?:\/\/[^\s]+)/g;

		let lastIndex = 0;
		let match;

		while ((match = combinedRegex.exec(line)) !== null) {
			// Add text before this match
			if (match.index > lastIndex) {
				const plainText = line.substring(lastIndex, match.index);
				paragraphContent.push({
					type: 'text',
					text: plainText
				});
			}

			// Add formatted content
			if (match[2]) {
				// Bold text: **text**
				paragraphContent.push({
					type: 'text',
					text: match[2],
					marks: [{ type: 'strong' }]
				});
			} else if (match[3]) {
				// URL link
				paragraphContent.push({
					type: 'text',
					text: match[3],
					marks: [
						{
							type: 'link',
							attrs: {
								href: match[3]
							}
						}
					]
				});
			}

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < line.length) {
			const plainText = line.substring(lastIndex);
			paragraphContent.push({
				type: 'text',
				text: plainText
			});
		}

		// Add paragraph
		content.push({
			type: 'paragraph',
			content: paragraphContent.length > 0 ? paragraphContent : [{ type: 'text', text: line }]
		});
	}

	return {
		type: 'doc',
		version: 1,
		content
	};
}

export class JiraClient {
	private baseUrl: string;
	private auth: string;

	constructor(config: JiraConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<{ data: T | null; error?: string }> {
		try {
			const url = `${this.baseUrl}/rest/api/3${endpoint}`;
			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Basic ${this.auth}`,
					Accept: 'application/json',
					'Content-Type': 'application/json',
					...options.headers
				}
			});

			if (!response.ok) {
				const errorText = await response.text();
				// Log detailed error server-side for debugging
				console.error(`Jira API error (${response.status}):`, errorText);

				// Return sanitized error message to client
				const sanitizedError =
					response.status === 401
						? 'Authentication failed. Please check your credentials.'
						: response.status === 403
							? 'Access denied. Please check your permissions.'
							: response.status === 404
								? 'Resource not found.'
								: `Request failed with status ${response.status}`;

				return {
					data: null,
					error: sanitizedError
				};
			}

			const data = await response.json();
			return { data };
		} catch (error) {
			// Log detailed error server-side
			console.error('Jira request failed:', error);

			// Return generic error to client
			return {
				data: null,
				error: 'Failed to connect to Jira. Please check your network connection.'
			};
		}
	}

	/**
	 * Test the connection to Jira
	 */
	async testConnection(): Promise<{ success: boolean; error?: string }> {
		const result = await this.request<{ displayName: string }>('/myself');
		if (result.error) {
			return { success: false, error: result.error };
		}
		return { success: true };
	}

	/**
	 * Get all projects
	 */
	async getProjects(): Promise<{ data: JiraProject[] | null; error?: string }> {
		return this.request<JiraProject[]>('/project');
	}

	/**
	 * Get issue types for a project
	 */
	async getIssueTypes(projectKey: string): Promise<{ data: JiraIssueType[]; error?: string }> {
		const result = await this.request<{ issueTypes: JiraIssueType[] }>(`/project/${projectKey}`);
		if (result.error || !result.data) {
			return { data: [], error: result.error };
		}
		return { data: result.data.issueTypes || [], error: result.error };
	}

	/**
	 * Create a new issue
	 */
	async createIssue(
		request: CreateIssueRequest
	): Promise<{ data: JiraIssue | null; error?: string }> {
		const body = {
			fields: {
				project: {
					key: request.projectKey
				},
				summary: request.summary,
				description: markdownToADF(request.description),
				issuetype: {
					name: request.issueType
				},
				...(request.priority && {
					priority: {
						name: request.priority
					}
				}),
				...(request.labels && {
					labels: request.labels
				})
			}
		};

		return this.request<JiraIssue>('/issue', {
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	/**
	 * Get an issue by key
	 */
	async getIssue(issueKey: string): Promise<{ data: JiraIssue | null; error?: string }> {
		return this.request<JiraIssue>(`/issue/${issueKey}`);
	}

	/**
	 * Update an issue
	 */
	async updateIssue(
		issueKey: string,
		updates: Partial<CreateIssueRequest>
	): Promise<{ success: boolean; error?: string }> {
		const body: Record<string, unknown> = { fields: {} };
		const fields = body.fields as Record<string, unknown>;

		if (updates.summary) fields.summary = updates.summary;
		if (updates.description) {
			fields.description = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: updates.description
							}
						]
					}
				]
			};
		}
		if (updates.priority) fields.priority = { name: updates.priority };
		if (updates.labels) fields.labels = updates.labels;

		const result = await this.request<void>(`/issue/${issueKey}`, {
			method: 'PUT',
			body: JSON.stringify(body)
		});

		return { success: !result.error, error: result.error };
	}

	/**
	 * Add a comment to an issue
	 */
	async addComment(
		issueKey: string,
		comment: string
	): Promise<{ success: boolean; error?: string }> {
		const body = {
			body: {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: comment
							}
						]
					}
				]
			}
		};

		const result = await this.request<void>(`/issue/${issueKey}/comment`, {
			method: 'POST',
			body: JSON.stringify(body)
		});

		return { success: !result.error, error: result.error };
	}

	/**
	 * Search issues using JQL
	 */
	async searchIssues(jql: string, maxResults = 50): Promise<{ data: JiraIssue[]; error?: string }> {
		const result = await this.request<{ issues: JiraIssue[] }>(
			`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
		);
		if (result.error || !result.data) {
			return { data: [], error: result.error };
		}
		return { data: result.data.issues || [], error: result.error };
	}
}

/**
 * Type guard for Jira integration config
 */
interface JiraIntegrationConfig {
	baseUrl: string;
	email: string;
	apiToken: string;
}

function isValidJiraConfig(config: unknown): config is JiraIntegrationConfig {
	return (
		typeof config === 'object' &&
		config !== null &&
		'baseUrl' in config &&
		'email' in config &&
		'apiToken' in config &&
		typeof config.baseUrl === 'string' &&
		typeof config.email === 'string' &&
		typeof config.apiToken === 'string'
	);
}

/**
 * Helper function to create a Jira client from an Integration record
 * Automatically decrypts the API token if needed
 */
export function createJiraClientFromIntegration(integration: {
	config: unknown;
}): JiraClient | null {
	if (!isValidJiraConfig(integration.config)) {
		console.error('Invalid Jira integration config');
		return null;
	}

	let apiToken = integration.config.apiToken;

	// Decrypt token if it's encrypted
	try {
		apiToken = decrypt(apiToken);
	} catch (error) {
		console.error('Failed to decrypt Jira API token:', error);
		return null;
	}

	return new JiraClient({
		baseUrl: integration.config.baseUrl,
		email: integration.config.email,
		apiToken
	});
}
