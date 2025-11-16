import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';

describe('JiraClient', () => {
	beforeEach(() => {
		// Mock encryption key
		process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
		vi.clearAllMocks();
	});

	describe('error sanitization', () => {
		it('should sanitize 401 authentication errors', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				text: async () => 'Invalid API token: ATATT3xFfGF0... expired'
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Authentication failed. Please check your credentials.');
			expect(result.error).not.toContain('ATATT');
			expect(result.error).not.toContain('expired');
		});

		it('should sanitize 403 permission errors', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				text: async () =>
					'User does not have permission to access project SECRETPROJ. Contact admin@company.com'
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Access denied. Please check your permissions.');
			expect(result.error).not.toContain('SECRETPROJ');
			expect(result.error).not.toContain('admin@company.com');
		});

		it('should sanitize 404 not found errors', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				text: async () =>
					'Project with key INTERNAL-123 not found at /rest/api/2/project/INTERNAL-123'
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Resource not found.');
			expect(result.error).not.toContain('INTERNAL-123');
			expect(result.error).not.toContain('/rest/api');
		});

		it('should sanitize generic errors without exposing internals', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				text: async () => 'Internal server error at service-node-34.internal.atlassian.net'
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Request failed with status 500');
			expect(result.error).not.toContain('service-node');
			expect(result.error).not.toContain('internal.atlassian.net');
		});

		it('should handle network errors', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockRejectedValue(new Error('Network error: ECONNREFUSED'));

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			// Should not expose raw network errors
		});
	});

	describe('createIssue', () => {
		it('should handle successful issue creation', async () => {
			const { JiraClient } = await import('./jira');

			const mockIssueResponse = {
				id: '10001',
				key: 'PROJ-123',
				fields: {
					summary: 'Test failed',
					description: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'Test description' }]
							}
						]
					},
					issuetype: { name: 'Bug' },
					status: { name: 'Open' },
					priority: { name: 'High' },
					assignee: { displayName: 'John Doe' },
					reporter: { displayName: 'Jane Smith' },
					labels: ['qa-studio', 'automated-test']
				}
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => mockIssueResponse
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.createIssue({
				projectKey: 'PROJ',
				summary: 'Test failed',
				description: 'Test description',
				issueType: 'Bug',
				priority: 'High'
			});

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data?.key).toBe('PROJ-123');
		});

		it('should sanitize errors during issue creation', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				text: async () =>
					'Field "assignee" with value "user@internal-company.com" is invalid. Valid users are: admin@internal-company.com'
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.createIssue({
				projectKey: 'PROJ',
				summary: 'Test',
				description: 'Description',
				issueType: 'Bug'
			});

			expect(result.error).toBeDefined();
			expect(result.error).toBe('Request failed with status 400');
			expect(result.error).not.toContain('@internal-company.com');
		});
	});

	describe('testConnection', () => {
		it('should successfully test valid connection', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ displayName: 'Test User' })
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.testConnection();

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should properly encode credentials in Authorization header', async () => {
			const { JiraClient } = await import('./jira');

			let capturedHeaders: Headers | undefined;

			global.fetch = vi.fn().mockImplementation((url, options) => {
				capturedHeaders = new Headers(options?.headers);
				return Promise.resolve({
					ok: true,
					status: 200,
					json: async () => ({ displayName: 'Test User' })
				});
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'test-token-123'
			});

			await client.testConnection();

			expect(capturedHeaders).toBeDefined();
			const authHeader = capturedHeaders!.get('Authorization');
			expect(authHeader).toContain('Basic ');

			// Decode and verify
			const base64Creds = authHeader!.replace('Basic ', '');
			const decoded = Buffer.from(base64Creds, 'base64').toString('utf-8');
			expect(decoded).toBe('test@example.com:test-token-123');
		});
	});

	describe('ADF (Atlassian Document Format) handling', () => {
		it('should handle description as ADF in responses', async () => {
			const { JiraClient } = await import('./jira');

			const adfDescription = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Test failed on login page.' }]
					},
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Expected behavior: User should be logged in.' }
						]
					}
				]
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => ({
					id: '10001',
					key: 'PROJ-123',
					fields: {
						summary: 'Test',
						description: adfDescription,
						issuetype: { name: 'Bug' },
						status: { name: 'Open' },
						labels: []
					}
				})
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			const result = await client.createIssue({
				projectKey: 'PROJ',
				summary: 'Test',
				description: 'Test description',
				issueType: 'Bug'
			});

			expect(result.data?.fields.description).toBeDefined();
		});
	});

	describe('configuration validation', () => {
		it('should normalize baseUrl by removing trailing slash', async () => {
			const { JiraClient } = await import('./jira');

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ displayName: 'Test' })
			});

			const client = new JiraClient({
				baseUrl: 'https://test.atlassian.net/',
				email: 'test@example.com',
				apiToken: 'fake-token'
			});

			await client.testConnection();

			const fetchCall = (global.fetch as any).mock.calls[0];
			const url = fetchCall[0];

			// Should not have double slashes
			expect(url).not.toContain('//myself');
			expect(url).toContain('/rest/api/3/myself'); // Jira uses API v3
		});
	});
});
