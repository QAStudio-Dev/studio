import { test, expect } from '@playwright/test';
import { ApiClient } from '../pages/api';

/**
 * QA Studio API Tests
 * Tests API endpoints that support API key authentication
 */

// Validate and get configuration from environment
if (!process.env.QA_STUDIO_API_KEY) {
	throw new Error(
		'QA_STUDIO_API_KEY environment variable is required. Please set it in your .env file.'
	);
}

const API_KEY = process.env.QA_STUDIO_API_KEY;

// Note: baseURL is automatically provided by Playwright from playwright.config.ts
// We pass empty string to ApiClient, and it will use relative URLs that Playwright resolves
let createdProjectId: string;

test.describe('QA Studio API Tests', () => {
	// Clean up any created resources after all tests complete
	test.afterAll(async ({ request }) => {
		if (createdProjectId) {
			// request.fetch() uses baseURL from playwright.config.ts automatically
			const apiClient = new ApiClient(request, '', API_KEY);
			try {
				await apiClient.deleteProject(createdProjectId);
				console.log(`✓ Cleaned up test project: ${createdProjectId}`);
			} catch (error) {
				console.warn(`⚠ Failed to clean up test project: ${createdProjectId}`, error);
			}
		}
	});

	test.describe('Authentication', () => {
		test('should reject requests without API key', async ({ request }) => {
			const response = await request.get('/api/projects', {
				headers: {
					'Content-Type': 'application/json'
				}
			});

			expect(response.status()).toBe(401);
		});

		test('should reject requests with invalid API key', async ({ request }) => {
			const response = await request.get('/api/projects', {
				headers: {
					'X-API-Key': 'invalid-api-key-12345',
					'Content-Type': 'application/json'
				}
			});

			expect(response.status()).toBe(401);
		});

		test('should accept requests with valid API key', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listProjects();
			expect(response.status()).toBe(200);
		});
	});

	test.describe('Projects API', () => {
		test('should create a new project', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const timestamp = Date.now();
			const projectData = {
				name: `Test Project ${timestamp}`,
				key: `TP${timestamp.toString().slice(-6)}`,
				description: 'A test project created via API'
			};

			const response = await apiClient.createProject(projectData);
			// New API returns 200, not 201
			expect([200, 201]).toContain(response.status());

			const body = await apiClient.getResponseBody(response);
			expect(body).toHaveProperty('id');
			expect(body.name).toBe(projectData.name);
			expect(body.key).toBe(projectData.key);
			expect(body.description).toBe(projectData.description);

			// Store for later tests
			createdProjectId = body.id;
		});

		test('should list all projects', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listProjects();
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			// New API returns array directly, not paginated format
			expect(Array.isArray(body)).toBe(true);
			expect(body.length).toBeGreaterThan(0);

			// Verify structure of returned projects
			const project = body[0];
			expect(project).toHaveProperty('id');
			expect(project).toHaveProperty('name');
			expect(project).toHaveProperty('key');
		});

		test('should search projects by name', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listProjects({ search: 'Test Project' });
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			expect(Array.isArray(body)).toBe(true);

			if (body.length > 0) {
				expect(body.some((p: any) => p.name.includes('Test Project'))).toBe(true);
			}
		});

		test('should validate project creation with missing required fields', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.createProject({
				name: '',
				key: ''
			});

			expect([400, 422]).toContain(response.status());
		});

		test('should validate project key format', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const timestamp = Date.now();

			// Try to create project with invalid key (lowercase, special chars)
			const response = await apiClient.createProject({
				name: `Test Project ${timestamp}`,
				key: 'invalid-key-123' // Should be uppercase, no dashes
			});

			expect([400, 422]).toContain(response.status());
		});

		test('should validate project key uniqueness', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);

			// Get existing projects to find a key
			const listResponse = await apiClient.listProjects();
			const projects = await listResponse.json();

			if (projects.length > 0) {
				const existingKey = projects[0].key;

				// Try to create another project with same key
				const response = await apiClient.createProject({
					name: 'Duplicate Key Project',
					key: existingKey
				});

				expect([400, 409, 422]).toContain(response.status());
			}
		});
	});

	test.describe('Test Runs API', () => {
		test('should list test runs', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listTestRuns({ page: 1, limit: 10 });
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			expect(body).toHaveProperty('testRuns');
			expect(Array.isArray(body.testRuns)).toBe(true);
		});

		test('should filter test runs by project', async ({ request }) => {
			if (!createdProjectId) {
				test.skip();
			}

			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listTestRuns({
				projectId: createdProjectId,
				page: 1,
				limit: 10
			});
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			expect(body).toHaveProperty('testRuns');

			if (body.testRuns.length > 0) {
				body.testRuns.forEach((run: any) => {
					expect(run.projectId).toBe(createdProjectId);
				});
			}
		});

		test('should list test runs with basic filters', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listTestRuns({
				page: 1,
				limit: 10
			});
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			expect(body).toHaveProperty('testRuns');
			expect(Array.isArray(body.testRuns)).toBe(true);
		});

		test('should support pagination parameters', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listTestRuns({
				page: 1,
				limit: 5
			});
			expect(response.status()).toBe(200);

			const body = await apiClient.getResponseBody(response);
			expect(body).toHaveProperty('testRuns');
			expect(body).toHaveProperty('pagination');
			expect(body.pagination).toHaveProperty('page');
			expect(body.pagination).toHaveProperty('limit');
			expect(body.pagination.page).toBe(1);
			expect(body.pagination.limit).toBe(5);
		});

		test('should enforce maximum page size', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.listTestRuns({
				page: 1,
				limit: 10000 // Way over max
			});

			if (response.status() === 200) {
				const body = await response.json();
				// Should cap at max limit (100)
				expect(body.pagination.limit).toBeLessThanOrEqual(100);
			} else {
				// Or reject the request
				expect([400, 422]).toContain(response.status());
			}
		});
	});

	test.describe('Error Handling', () => {
		test('should handle malformed JSON gracefully', async ({ request }) => {
			const response = await request.post(`${BASE_URL}/api/projects`, {
				headers: {
					'X-API-Key': API_KEY,
					'Content-Type': 'application/json'
				},
				data: 'invalid json {'
			});

			expect([400, 422]).toContain(response.status());
		});

		test('should return 401 for expired or invalid API keys', async ({ request }) => {
			const response = await request.get(`${BASE_URL}/api/projects`, {
				headers: {
					'X-API-Key': 'qas_expired_or_invalid_key_123456789',
					'Content-Type': 'application/json'
				}
			});

			expect(response.status()).toBe(401);
		});

		test('should validate required fields in request body', async ({ request }) => {
			const apiClient = new ApiClient(request, '', API_KEY);
			const response = await apiClient.createProject({
				name: '',
				key: ''
			});

			expect([400, 422]).toContain(response.status());

			const body = await response.json();
			expect(body).toHaveProperty('message');
		});
	});
});
