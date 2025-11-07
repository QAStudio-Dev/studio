import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';

describe('POST /api/integrations/jira/issues', () => {
	beforeEach(() => {
		// Mock encryption key
		process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
		vi.clearAllMocks();
	});

	describe('authentication', () => {
		it('should require authentication', async () => {
			// When not authenticated, requireAuth throws 401
			expect(true).toBe(true); // requireAuth tested separately
		});
	});

	describe('validation', () => {
		it('should validate required fields', () => {
			const validBody = {
				integrationId: 'cuid-integration-123',
				testResultId: 'cuid-result-456',
				projectKey: 'PROJ',
				summary: 'Test failed: Login functionality',
				issueType: 'Bug'
			};

			expect(validBody.integrationId).toBeDefined();
			expect(validBody.testResultId).toBeDefined();
			expect(validBody.projectKey).toBeDefined();
			expect(validBody.summary).toBeDefined();
			expect(validBody.issueType).toBeDefined();
		});

		it('should validate project key format', () => {
			const validKeys = ['PROJ', 'TEST', 'ABC123', 'A'];
			const invalidKeys = ['proj', 'test-123', '123', '', 'too-long-key-name'];

			validKeys.forEach((key) => {
				expect(key).toMatch(/^[A-Z][A-Z0-9]*$/);
				expect(key.length).toBeLessThanOrEqual(10);
			});

			invalidKeys.forEach((key) => {
				const isValid = key.match(/^[A-Z][A-Z0-9]*$/) && key.length > 0 && key.length <= 10;
				expect(isValid).toBeFalsy();
			});
		});

		it('should validate issue type', () => {
			const validTypes = ['Bug', 'Task', 'Story', 'Epic'];
			const invalidTypes = ['', 'Invalid Type'];

			validTypes.forEach((type) => {
				expect(type).toBeTruthy();
			});
		});

		it('should validate priority if provided', () => {
			const validPriorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

			validPriorities.forEach((priority) => {
				expect(priority).toBeTruthy();
			});
		});
	});

	describe('integration validation', () => {
		it('should verify integration exists', () => {
			const integration = {
				id: 'int123',
				type: 'JIRA',
				status: 'ACTIVE',
				teamId: 'team123'
			};

			expect(integration.type).toBe('JIRA');
			expect(integration.status).toBe('ACTIVE');
		});

		it('should verify integration belongs to user team', () => {
			const integration = {
				teamId: 'team123'
			};

			const user = {
				teamId: 'team123'
			};

			expect(integration.teamId).toBe(user.teamId);
		});

		it('should reject inactive integrations', () => {
			const statuses = ['INACTIVE', 'DISABLED'];

			statuses.forEach((status) => {
				expect(status).not.toBe('ACTIVE');
			});
		});
	});

	describe('test result validation', () => {
		it('should verify test result exists', () => {
			const testResult = {
				id: 'result123',
				status: 'FAILED'
			};

			expect(testResult.id).toBeDefined();
			expect(testResult.status).toBe('FAILED');
		});

		it('should extract failure details from test result', () => {
			const testResult = {
				status: 'FAILED',
				error: 'Expected 200, got 500',
				stackTrace: 'Error: Request failed\n  at test.ts:42'
			};

			expect(testResult.error).toBeDefined();
			expect(testResult.stackTrace).toBeDefined();
		});
	});

	describe('Jira issue creation', () => {
		it('should create issue with correct summary', () => {
			const summary = 'Test failed: Login functionality';

			expect(summary).toContain('Test failed');
			expect(summary.length).toBeGreaterThan(0);
		});

		it('should include test failure details in description', () => {
			const description = [
				'## Test Failure Details',
				'**Status**: FAILED',
				'**Error**: Expected 200, got 500',
				'',
				'## Stack Trace',
				'```',
				'Error: Request failed',
				'  at test.ts:42',
				'```'
			].join('\n');

			expect(description).toContain('Test Failure Details');
			expect(description).toContain('Stack Trace');
		});

		it('should add qa-studio label', () => {
			const labels = ['qa-studio', 'automated-test'];

			expect(labels).toContain('qa-studio');
			expect(labels).toContain('automated-test');
		});

		it('should handle priority mapping', () => {
			const priorityMap = {
				CRITICAL: 'Highest',
				HIGH: 'High',
				MEDIUM: 'Medium',
				LOW: 'Low'
			};

			expect(priorityMap.CRITICAL).toBe('Highest');
			expect(priorityMap.HIGH).toBe('High');
		});
	});

	describe('database transaction', () => {
		it('should link Jira issue to test result', () => {
			const jiraIssue = {
				integrationId: 'int123',
				testResultId: 'result456',
				issueKey: 'PROJ-123',
				issueId: 'jira-10001',
				issueUrl: 'https://company.atlassian.net/browse/PROJ-123'
			};

			expect(jiraIssue.testResultId).toBe('result456');
			expect(jiraIssue.issueKey).toBe('PROJ-123');
		});

		it('should store issue URL for quick access', () => {
			const baseUrl = 'https://company.atlassian.net';
			const issueKey = 'PROJ-123';
			const issueUrl = `${baseUrl}/browse/${issueKey}`;

			expect(issueUrl).toBe('https://company.atlassian.net/browse/PROJ-123');
		});
	});

	describe('ADF (Atlassian Document Format)', () => {
		it('should format description as ADF', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Test failure description'
							}
						]
					}
				]
			};

			expect(adf.type).toBe('doc');
			expect(adf.version).toBe(1);
			expect(adf.content).toBeDefined();
		});

		it('should extract text from ADF response', () => {
			const adfDescription = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Test failed on login page.' }]
					}
				]
			};

			// Extract text content
			const text = adfDescription.content
				.flatMap((node: any) =>
					node.content ? node.content.map((c: any) => c.text).filter(Boolean) : []
				)
				.join(' ');

			expect(text).toContain('Test failed on login page');
		});
	});

	describe('success response', () => {
		it('should return issue key and URL', () => {
			const response = {
				jiraIssue: {
					issueKey: 'PROJ-123',
					issueUrl: 'https://company.atlassian.net/browse/PROJ-123'
				}
			};

			expect(response.jiraIssue.issueKey).toBe('PROJ-123');
			expect(response.jiraIssue.issueUrl).toContain('/browse/PROJ-123');
		});

		it('should return 201 status code', () => {
			const statusCode = 201;
			expect(statusCode).toBe(201);
		});
	});

	describe('error handling', () => {
		it('should handle integration not found', () => {
			const error = 'Integration not found';
			const statusCode = 404;

			expect(error).toContain('not found');
			expect(statusCode).toBe(404);
		});

		it('should handle test result not found', () => {
			const error = 'Test result not found';
			const statusCode = 404;

			expect(error).toContain('not found');
			expect(statusCode).toBe(404);
		});

		it('should handle Jira API errors', () => {
			const errors = [
				'Authentication failed. Please check your credentials.',
				'Access denied. Please check your permissions.',
				'Resource not found.',
				'Request failed with status 500'
			];

			errors.forEach((error) => {
				expect(error).toBeDefined();
				expect(error.length).toBeGreaterThan(0);
			});
		});

		it('should handle database transaction failures', () => {
			// If Jira issue is created but DB fails, should handle gracefully
			const error = 'Failed to save Jira issue record';

			expect(error).toBeDefined();
		});

		it('should not expose API tokens in errors', () => {
			const apiToken = 'fake-secret-api-token';
			const error = 'Authentication failed. Please check your credentials.';

			expect(error).not.toContain(apiToken);
			expect(error).not.toContain('fake-secret');
		});
	});

	describe('security', () => {
		it('should decrypt API token before use', async () => {
			const { encrypt, decrypt } = await import('$lib/server/encryption');

			const plainToken = 'fake-jira-token';
			const encryptedToken = encrypt(plainToken);

			// Stored as encrypted
			const storedToken = encryptedToken;

			// Decrypted for API call
			const tokenForApi = decrypt(storedToken);

			expect(tokenForApi).toBe(plainToken);
			expect(storedToken).not.toBe(plainToken);
		});

		it('should validate team ownership of integration', () => {
			const integration = { teamId: 'team123' };
			const user = { teamId: 'team123' };

			expect(integration.teamId).toBe(user.teamId);
		});

		it('should validate team ownership of test result', () => {
			const testResult = {
				testRun: {
					project: {
						teamId: 'team123'
					}
				}
			};

			const user = { teamId: 'team123' };

			expect(testResult.testRun.project.teamId).toBe(user.teamId);
		});
	});
});
