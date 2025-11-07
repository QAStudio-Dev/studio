import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createJiraClientFromIntegration } from '$lib/server/integrations/jira';
import { z } from 'zod';
import { handleValidationError, validateRequestBody } from '$lib/server/validation';
import { IntegrationType } from '@prisma/client';

// Validation schema for creating Jira issues
const CreateJiraIssueSchema = z.object({
	integrationId: z.string().cuid(),
	testResultId: z.string().cuid(),
	projectKey: z
		.string()
		.min(1)
		.max(10)
		.regex(/^[A-Z][A-Z0-9]*$/, 'Project key must be uppercase letters and numbers'),
	summary: z.string().min(1).max(255),
	description: z.string().max(32000).optional(),
	issueType: z.string().min(1).max(50),
	priority: z.string().min(1).max(50).optional(),
	labels: z.array(z.string().max(255)).max(10).optional()
});

/**
 * POST /api/integrations/jira/issues
 * Create a Jira issue from a test result
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Parse and validate request body
	let body;
	try {
		body = await validateRequestBody(event.request, CreateJiraIssueSchema);
	} catch (error) {
		return handleValidationError(error);
	}

	const { integrationId, testResultId, projectKey, summary, description, issueType, priority } =
		body;

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user?.teamId) {
		return json({ error: 'User must be part of a team' }, { status: 400 });
	}

	// Verify integration belongs to user's team
	const integration = await db.integration.findFirst({
		where: {
			id: integrationId,
			teamId: user.teamId,
			type: IntegrationType.JIRA
		}
	});

	if (!integration) {
		return json({ error: 'Integration not found' }, { status: 404 });
	}

	// Get test result
	const testResult = await db.testResult.findUnique({
		where: { id: testResultId },
		include: {
			testCase: {
				include: {
					project: true
				}
			},
			testRun: true
		}
	});

	if (!testResult) {
		return json({ error: 'Test result not found' }, { status: 404 });
	}

	// Create Jira client
	const jiraClient = createJiraClientFromIntegration(integration);
	if (!jiraClient) {
		return json({ error: 'Invalid Jira configuration' }, { status: 500 });
	}

	// Create the issue in Jira
	const result = await jiraClient.createIssue({
		projectKey,
		summary,
		description: description || '',
		issueType,
		priority,
		labels: ['qa-studio', 'automated-test']
	});

	if (result.error) {
		return json({ error: result.error }, { status: 500 });
	}

	// Extract description text from ADF format
	// Jira's description field is an Atlassian Document Format (ADF) object
	let descriptionText: string | null = null;
	if (result.data.fields.description) {
		try {
			// ADF structure: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '...' }] }] }
			const adf = result.data.fields.description as any;
			if (adf.content && Array.isArray(adf.content)) {
				// Extract all text nodes from all paragraphs
				const textParts: string[] = [];
				adf.content.forEach((node: any) => {
					if (node.content && Array.isArray(node.content)) {
						node.content.forEach((textNode: any) => {
							if (textNode.type === 'text' && textNode.text) {
								textParts.push(textNode.text);
							}
						});
					}
				});
				descriptionText = textParts.join('\n');
			}
		} catch (error) {
			console.error('Failed to parse ADF description:', error);
			// Fallback: stringify the ADF object
			descriptionText = JSON.stringify(result.data.fields.description);
		}
	}

	// Save the issue link in our database
	const jiraIssue = await db.jiraIssue.create({
		data: {
			jiraIssueKey: result.data.key,
			jiraIssueId: result.data.id,
			integrationId,
			testResultId,
			projectId: testResult.testCase.projectId,
			summary: result.data.fields.summary,
			description: descriptionText,
			issueType: result.data.fields.issuetype.name,
			status: result.data.fields.status.name,
			priority: result.data.fields.priority?.name || null,
			assignee: result.data.fields.assignee?.displayName || null,
			reporter: result.data.fields.reporter?.displayName || null,
			labels: result.data.fields.labels || [],
			lastSyncedAt: new Date()
		}
	});

	// Get Jira base URL for the link
	const config = integration.config as { baseUrl: string };
	const jiraUrl = `${config.baseUrl}/browse/${result.data.key}`;

	return json({
		issue: {
			...jiraIssue,
			url: jiraUrl
		}
	});
};
