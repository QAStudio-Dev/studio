import { test, expect } from '@playwright/test';
import { DocsPage } from '../pages/docs';

test.describe('API Documentation Page', () => {
	let docsPage: DocsPage;

	test.beforeEach(async ({ page }) => {
		docsPage = new DocsPage(page);
		await docsPage.navigate();
	});

	test.describe('Page Loading', () => {
		test('should load the docs page successfully', async () => {
			await expect(docsPage.page).toHaveURL(/\/docs$/);
			await expect(docsPage.pageContainer).toBeVisible();
		});

		test('should load Swagger UI container', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			await expect(docsPage.swaggerContainer).toBeVisible();
			await expect(docsPage.swaggerUI).toBeVisible();
		});

		test('should display info section', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			await expect(docsPage.infoSection).toBeVisible({ timeout: 10000 });
		});
	});

	test.describe('OpenAPI Specification', () => {
		test('should fetch OpenAPI spec successfully', async ({ page }) => {
			// Create new page instance to properly catch the initial request
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();

			expect(response).not.toBeNull();
			expect(response?.status()).toBe(200);
		});

		test('should return valid OpenAPI spec structure', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();
			const spec = await response!.json();
			const validation = freshDocsPage.validateOpenAPISpec(spec);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('OpenAPI Spec Validation Errors:', validation.errors);
			}
			expect(validation.errors).toHaveLength(0);
		});

		test('should have OpenAPI version 3.x', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();
			const spec = await response!.json();
			expect(spec.openapi).toMatch(/^3\./);
		});

		test('should have API title and version', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();
			const spec = await response!.json();
			expect(spec.info.title).toBeTruthy();
			expect(spec.info.version).toBeTruthy();
			expect(typeof spec.info.title).toBe('string');
			expect(typeof spec.info.version).toBe('string');
		});

		test('should have paths defined', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();
			const spec = await response!.json();
			expect(spec.paths).toBeDefined();
			expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
		});
	});

	test.describe('Swagger UI Elements', () => {
		test('should display API title', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			const title = await docsPage.getAPITitle();
			expect(title).toBeTruthy();
			expect(title.length).toBeGreaterThan(0);
		});

		test('should display API version', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			const version = await docsPage.getAPIVersion();
			expect(version).toBeTruthy();
			expect(version.length).toBeGreaterThan(0);
		});

		test('should display operations', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			const operationCount = await docsPage.getOperationCount();
			expect(operationCount).toBeGreaterThan(0);
		});

		test('should have valid HTTP methods', async () => {
			await docsPage.waitForSwaggerUIToLoad();
			const methods = await docsPage.getAllMethods();

			expect(methods.length).toBeGreaterThan(0);

			// All methods should be valid HTTP methods
			const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
			methods.forEach((method) => {
				expect(validMethods).toContain(method);
			});
		});
	});

	test.describe('API Endpoints', () => {
		test('should have projects endpoints', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const hasProjectsGet = await docsPage.verifyEndpointExists('GET', '/api/projects');
			const hasProjectsPost = await docsPage.verifyEndpointExists('POST', '/api/projects');

			expect(hasProjectsGet || hasProjectsPost).toBe(true);
		});

		test('should have test runs endpoints', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const hasRunsEndpoint = await docsPage.verifyEndpointExists('GET', '/api/runs');
			expect(hasRunsEndpoint).toBe(true);
		});

		test('should have test results endpoint', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const hasResultsPost = await docsPage.verifyEndpointExists('POST', '/api/results');
			expect(hasResultsPost).toBe(true);
		});

		test('should have attachments endpoints', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const response = await freshDocsPage.navigateAndWaitForSpec();
			const spec = await response!.json();
			const paths = Object.keys(spec.paths);

			// Check if attachments endpoint exists
			const hasAttachmentsEndpoint = paths.some((path) => path.includes('attachment'));
			expect(hasAttachmentsEndpoint).toBe(true);
		});
	});

	test.describe('Operation Interaction', () => {
		test('should expand operation when clicked', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const operationCount = await docsPage.getOperationCount();
			expect(operationCount).toBeGreaterThan(0);

			await docsPage.expandOperation(0);

			// Check if operation details are now visible
			const firstOperation = docsPage.operationBlocks.nth(0);
			const operationDetails = firstOperation.locator('.opblock-body');

			await expect(operationDetails).toBeVisible({ timeout: 5000 });
		});

		test('should show operation method and path', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const method = await docsPage.getOperationMethod(0);
			const path = await docsPage.getOperationPath(0);

			expect(method).toBeTruthy();
			expect(path).toBeTruthy();
			expect(path).toMatch(/^\/api\//);
		});

		test('should have "Try it out" functionality available', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const operationCount = await docsPage.getOperationCount();
			expect(operationCount).toBeGreaterThan(0);

			// Expand first operation
			await docsPage.expandOperation(0);

			// Wait for operation body to be visible (showing it expanded successfully)
			const firstOperation = docsPage.operationBlocks.nth(0);
			const operationBody = firstOperation.locator('.opblock-body');
			await expect(operationBody).toBeVisible({ timeout: 5000 });

			// Verify the operation expanded and shows interactive elements or response information
			const hasInteractiveElements = await operationBody.locator('button, input, textarea').count();
			const hasResponseSection = await operationBody.locator('.responses-wrapper').count();
			expect(hasInteractiveElements + hasResponseSection).toBeGreaterThan(0);
		});
	});

	test.describe('Search and Filter', () => {
		test('should find operations by path', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const projectsIndex = await docsPage.findOperationByPath('/api/projects');
			expect(projectsIndex).not.toBeNull();

			if (projectsIndex !== null) {
				const path = await docsPage.getOperationPath(projectsIndex);
				expect(path).toContain('/api/projects');
			}
		});

		test('should find operations by method and path', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const resultsPostIndex = await docsPage.findOperation('POST', '/api/results');
			expect(resultsPostIndex).not.toBeNull();

			if (resultsPostIndex !== null) {
				const method = await docsPage.getOperationMethod(resultsPostIndex);
				const path = await docsPage.getOperationPath(resultsPostIndex);

				expect(method.toUpperCase()).toBe('POST');
				expect(path).toContain('/api/results');
			}
		});
	});

	test.describe('HTTP Methods Distribution', () => {
		test('should have GET endpoints', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const getCount = await docsPage.countOperationsByMethod('GET');
			expect(getCount).toBeGreaterThan(0);
		});

		test('should have POST endpoints', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const postCount = await docsPage.countOperationsByMethod('POST');
			expect(postCount).toBeGreaterThan(0);
		});

		test('should count all operations correctly', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const totalCount = await docsPage.getOperationCount();
			const methods = await docsPage.getAllMethods();

			let sumByMethod = 0;
			for (const method of methods) {
				const count = await docsPage.countOperationsByMethod(method);
				sumByMethod += count;
			}

			expect(sumByMethod).toBe(totalCount);
		});
	});

	test.describe('Response Examples', () => {
		test('should show response examples for operations', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			// Find a GET operation which should have a 200 response
			const operationCount = await docsPage.getOperationCount();
			let foundExample = false;

			for (let i = 0; i < Math.min(5, operationCount); i++) {
				const method = await docsPage.getOperationMethod(i);
				if (method.toUpperCase() === 'GET') {
					await docsPage.expandOperation(i);

					const operation = docsPage.operationBlocks.nth(i);
					const responsesSection = operation.locator('.responses-wrapper');

					if (await responsesSection.isVisible({ timeout: 2000 })) {
						foundExample = true;
						break;
					}
				}
			}

			expect(foundExample).toBe(true);
		});
	});

	test.describe('Theme Support', () => {
		test('should detect theme mode', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			const isDark = await docsPage.isDarkMode();
			expect(typeof isDark).toBe('boolean');
		});

		test('should render Swagger UI with appropriate theme', async () => {
			await docsPage.waitForSwaggerUIToLoad();

			// Just verify the UI is visible regardless of theme
			await expect(docsPage.swaggerUI).toBeVisible();
			await expect(docsPage.infoSection).toBeVisible();
		});
	});

	test.describe('Error Handling', () => {
		test('should handle page refresh correctly', async ({ page }) => {
			await docsPage.waitForSwaggerUIToLoad();

			// Reload the page
			await page.reload();

			// Should still load correctly
			await docsPage.waitForSwaggerUIToLoad();
			await expect(docsPage.swaggerUI).toBeVisible();

			const operationCount = await docsPage.getOperationCount();
			expect(operationCount).toBeGreaterThan(0);
		});
	});

	test.describe('Performance', () => {
		test('should load OpenAPI spec within reasonable time', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			const startTime = Date.now();
			await freshDocsPage.navigateAndWaitForSpec();
			const loadTime = Date.now() - startTime;

			// Should load within 5 seconds
			expect(loadTime).toBeLessThan(5000);
		});

		test('should render Swagger UI within reasonable time', async ({ page }) => {
			const freshDocsPage = new DocsPage(page);
			await freshDocsPage.navigate();
			const startTime = Date.now();
			await freshDocsPage.waitForSwaggerUIToLoad();
			const loadTime = Date.now() - startTime;

			// Should render within 10 seconds
			expect(loadTime).toBeLessThan(10000);
		});
	});
});
