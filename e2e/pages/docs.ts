import { Page, Locator, Response } from '@playwright/test';
import { BasePage } from './base';

/**
 * Page Object for the API Documentation page (/docs)
 */
export class DocsPage extends BasePage {
	// Page elements
	readonly pageContainer: Locator;
	readonly swaggerContainer: Locator;
	readonly swaggerUI: Locator;
	readonly infoSection: Locator;
	readonly apiTitle: Locator;
	readonly apiVersion: Locator;
	readonly apiDescription: Locator;
	readonly operationBlocks: Locator;
	readonly modelsSection: Locator;
	readonly tryItOutButtons: Locator;
	readonly executeButtons: Locator;
	readonly authorizeButton: Locator;
	readonly serversDropdown: Locator;

	constructor(page: Page) {
		super(page);
		this.pageContainer = page.locator('body');
		this.swaggerContainer = page.locator('#swagger-ui');
		// Use div.swagger-ui to target the main Swagger UI container (not sections)
		this.swaggerUI = page.locator('#swagger-ui div.swagger-ui').first();
		this.infoSection = page.locator('#swagger-ui .information-container').first();
		this.apiTitle = page.locator('#swagger-ui .info .title').first();
		this.apiVersion = page.locator('#swagger-ui .info .version').first();
		this.apiDescription = page.locator('#swagger-ui .info .description').first();
		this.operationBlocks = page.locator('#swagger-ui .opblock');
		this.modelsSection = page.locator('#model-section');
		this.tryItOutButtons = page.locator('#swagger-ui button:has-text("Try it out")');
		this.executeButtons = page.locator('#swagger-ui button:has-text("Execute")');
		this.authorizeButton = page.locator('#swagger-ui .auth-wrapper button').first();
		this.serversDropdown = page.locator('#swagger-ui .servers select').first();
	}

	/**
	 * Navigate to the docs page
	 */
	async navigate() {
		await this.goto('/docs');
		await this.waitForPageLoad();
	}

	/**
	 * Wait for Swagger UI to fully load
	 */
	async waitForSwaggerUIToLoad() {
		await this.waitForElement(this.swaggerUI, 10000);
		await this.waitForElement(this.infoSection, 10000);
	}

	/**
	 * Navigate to docs and wait for OpenAPI spec to load
	 * Sets up response listener BEFORE navigation to avoid race conditions
	 */
	async navigateAndWaitForSpec(): Promise<Response | null> {
		// Set up response listener BEFORE navigating to avoid race condition
		const responsePromise = this.page.waitForResponse(
			(response) => response.url().includes('/api/openapi'),
			{ timeout: 10000 }
		);

		await this.goto('/docs');
		const response = await responsePromise;
		await this.waitForPageLoad();

		return response;
	}

	/**
	 * Check if Swagger UI is visible
	 */
	async isSwaggerUIVisible(): Promise<boolean> {
		return await this.isVisible(this.swaggerUI);
	}

	/**
	 * Get the API title from the info section
	 */
	async getAPITitle(): Promise<string> {
		return await this.getText(this.apiTitle);
	}

	/**
	 * Get the API version
	 */
	async getAPIVersion(): Promise<string> {
		return await this.getText(this.apiVersion);
	}

	/**
	 * Get the API description
	 */
	async getAPIDescription(): Promise<string> {
		return await this.getText(this.apiDescription);
	}

	/**
	 * Get count of API operation blocks (endpoints)
	 */
	async getOperationCount(): Promise<number> {
		return await this.getElementCount(this.operationBlocks);
	}

	/**
	 * Get all operation blocks
	 */
	async getOperations(): Promise<Locator[]> {
		const count = await this.getOperationCount();
		const operations: Locator[] = [];
		for (let i = 0; i < count; i++) {
			operations.push(this.operationBlocks.nth(i));
		}
		return operations;
	}

	/**
	 * Expand a specific operation by index
	 */
	async expandOperation(index: number) {
		const operation = this.operationBlocks.nth(index);
		const summary = operation.locator('.opblock-summary');

		// Check if already expanded
		const isExpanded = await operation
			.getAttribute('class')
			.then((cls) => cls?.includes('is-open'));
		if (!isExpanded) {
			await this.click(summary);
			// Wait for the operation body to become visible
			const operationBody = operation.locator('.opblock-body');
			await operationBody.waitFor({ state: 'visible', timeout: 5000 });
		}
	}

	/**
	 * Get operation method (GET, POST, etc.) by index
	 */
	async getOperationMethod(index: number): Promise<string> {
		const operation = this.operationBlocks.nth(index);
		const method = operation.locator('.opblock-summary-method');
		return await this.getText(method);
	}

	/**
	 * Get operation path by index
	 */
	async getOperationPath(index: number): Promise<string> {
		const operation = this.operationBlocks.nth(index);
		const path = operation.locator('.opblock-summary-path span');
		return await this.getText(path);
	}

	/**
	 * Get operation summary/description by index
	 */
	async getOperationSummary(index: number): Promise<string> {
		const operation = this.operationBlocks.nth(index);
		const summary = operation.locator('.opblock-summary-description');
		return await this.getText(summary);
	}

	/**
	 * Search for an operation by path
	 */
	async findOperationByPath(path: string): Promise<number | null> {
		const operations = await this.getOperations();
		for (let i = 0; i < operations.length; i++) {
			const opPath = await this.getOperationPath(i);
			if (opPath.includes(path)) {
				return i;
			}
		}
		return null;
	}

	/**
	 * Search for an operation by method and path
	 */
	async findOperation(method: string, path: string): Promise<number | null> {
		const operations = await this.getOperations();
		for (let i = 0; i < operations.length; i++) {
			const opMethod = await this.getOperationMethod(i);
			const opPath = await this.getOperationPath(i);
			if (opMethod.toUpperCase() === method.toUpperCase() && opPath.includes(path)) {
				return i;
			}
		}
		return null;
	}

	/**
	 * Click "Try it out" button for a specific operation
	 */
	async tryOperation(operationIndex: number) {
		await this.expandOperation(operationIndex);
		const operation = this.operationBlocks.nth(operationIndex);
		const tryButton = operation.locator('button:has-text("Try it out")');
		await this.click(tryButton);
	}

	/**
	 * Check if models section is visible
	 */
	async isModelsSectionVisible(): Promise<boolean> {
		return await this.isVisible(this.modelsSection);
	}

	/**
	 * Check if authorize button is visible
	 */
	async isAuthorizeButtonVisible(): Promise<boolean> {
		return await this.isVisible(this.authorizeButton);
	}

	/**
	 * Get the list of available servers
	 */
	async getServers(): Promise<string[]> {
		if (!(await this.isVisible(this.serversDropdown))) {
			return [];
		}

		const options = this.serversDropdown.locator('option');
		const count = await options.count();
		const servers: string[] = [];

		for (let i = 0; i < count; i++) {
			const value = await options.nth(i).getAttribute('value');
			if (value) {
				servers.push(value);
			}
		}
		return servers;
	}

	/**
	 * Check if a specific tag/section exists
	 */
	async hasTagSection(tagName: string): Promise<boolean> {
		const tag = this.page.locator(`.opblock-tag-section:has-text("${tagName}")`);
		return await this.isVisible(tag);
	}

	/**
	 * Expand a tag section
	 */
	async expandTagSection(tagName: string) {
		const tagButton = this.page.locator(`button.opblock-tag-section:has-text("${tagName}")`);
		await this.click(tagButton);
		// Wait for tag content to expand
		const tagSection = this.page.locator(`.opblock-tag-section:has-text("${tagName}")`);
		await tagSection.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Get operations under a specific tag
	 */
	async getOperationsForTag(tagName: string): Promise<number> {
		const tagSection = this.page.locator(`.opblock-tag-section:has-text("${tagName}")`);
		const operations = tagSection.locator('~ .opblock');
		return await operations.count();
	}

	/**
	 * Verify specific API endpoints exist
	 */
	async verifyEndpointExists(method: string, path: string): Promise<boolean> {
		const index = await this.findOperation(method, path);
		return index !== null;
	}

	/**
	 * Get response example for an operation
	 */
	async getResponseExample(
		operationIndex: number,
		statusCode: string = '200'
	): Promise<string | null> {
		await this.expandOperation(operationIndex);
		const operation = this.operationBlocks.nth(operationIndex);
		const responseSection = operation.locator(`.response-col_status:has-text("${statusCode}")`);

		if (!(await this.isVisible(responseSection))) {
			return null;
		}

		const exampleValue = operation.locator('.example-value');
		if (await this.isVisible(exampleValue)) {
			return await this.getText(exampleValue);
		}

		return null;
	}

	/**
	 * Check if dark mode is active
	 */
	async isDarkMode(): Promise<boolean> {
		const htmlElement = this.page.locator('html');
		const dataMode = await htmlElement.getAttribute('data-mode');
		return dataMode === 'dark';
	}

	/**
	 * Wait for OpenAPI spec to be fetched with validation
	 */
	async waitForOpenAPISpecLoad(): Promise<any> {
		const response = await this.page.waitForResponse(
			(response) => response.url().includes('/api/openapi'),
			{ timeout: 10000 }
		);

		if (!response.ok()) {
			throw new Error(`OpenAPI spec failed to load: ${response.status()} ${response.statusText()}`);
		}

		return await response.json();
	}

	/**
	 * Validate OpenAPI spec structure
	 */
	validateOpenAPISpec(spec: any): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!spec.openapi) {
			errors.push('Missing openapi version');
		}

		if (!spec.info) {
			errors.push('Missing info section');
		} else {
			if (!spec.info.title) errors.push('Missing API title');
			if (!spec.info.version) errors.push('Missing API version');
		}

		if (!spec.paths || Object.keys(spec.paths).length === 0) {
			errors.push('Missing or empty paths');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Get all available HTTP methods across all operations
	 */
	async getAllMethods(): Promise<string[]> {
		const count = await this.getOperationCount();
		const methods = new Set<string>();

		for (let i = 0; i < count; i++) {
			const method = await this.getOperationMethod(i);
			methods.add(method.toUpperCase());
		}

		return Array.from(methods);
	}

	/**
	 * Count operations by method
	 */
	async countOperationsByMethod(method: string): Promise<number> {
		const count = await this.getOperationCount();
		let methodCount = 0;

		for (let i = 0; i < count; i++) {
			const opMethod = await this.getOperationMethod(i);
			if (opMethod.toUpperCase() === method.toUpperCase()) {
				methodCount++;
			}
		}

		return methodCount;
	}
}
