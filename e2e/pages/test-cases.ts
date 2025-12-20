import { Page, Locator } from '@playwright/test';
import { BasePage } from './base';

/**
 * Test Cases Page Object Model
 * Handles test case management, suite organization, and drag & drop functionality
 * URL Pattern: /projects/[projectId]/cases
 */
export class TestCasesPage extends BasePage {
	// Page identification
	readonly projectId: string;

	// Header elements
	readonly projectName: Locator;
	readonly projectKey: Locator;
	readonly projectDescription: Locator;
	readonly viewTestRunsButton: Locator;

	// Stats
	readonly totalSuitesCount: Locator;
	readonly totalTestCasesCount: Locator;

	// Sidebar - Test Suites Container
	readonly testSuitesContainer: Locator;
	readonly testSuitesHeader: Locator;
	readonly createSuiteButton: Locator;

	// Suite creation form
	readonly newSuiteNameInput: Locator;
	readonly createSuiteSubmitButton: Locator;
	readonly cancelSuiteButton: Locator;

	// Main content area
	readonly testCasesMain: Locator;
	readonly testCasesHeader: Locator;
	readonly newTestCaseButton: Locator;

	// Test case creation form
	readonly newTestCaseTitleInput: Locator;
	readonly newTestCaseDescriptionInput: Locator;
	readonly createTestCaseSubmitButton: Locator;
	readonly cancelTestCaseButton: Locator;

	// Modal elements
	readonly testCaseModal: Locator;
	readonly modalTitle: Locator;
	readonly modalCloseButton: Locator;
	readonly modalOpenFullViewButton: Locator;
	readonly modalEditButton: Locator;

	constructor(page: Page, projectId: string) {
		super(page);
		this.projectId = projectId;

		// Header elements
		this.projectName = page.locator('h1.text-4xl');
		this.projectKey = page.locator('.badge.preset-filled-surface-500').first();
		this.projectDescription = page.locator('.text-surface-600-300.text-lg');
		this.viewTestRunsButton = page.locator('a.btn:has-text("View Test Runs")');

		// Stats
		this.totalSuitesCount = page.locator('text=/\\d+ suites/');
		this.totalTestCasesCount = page.locator('text=/\\d+ test cases/');

		// Sidebar
		this.testSuitesContainer = page.getByTestId('test-suites-container');
		this.testSuitesHeader = this.testSuitesContainer.locator('h2:has-text("Test Suites")');
		this.createSuiteButton = this.testSuitesContainer.locator('button[title="Create Suite"]');

		// Suite form
		this.newSuiteNameInput = page.locator('input[placeholder*="Suite name"]');
		this.createSuiteSubmitButton = page.locator('button[type="submit"]:has-text("Create")');
		this.cancelSuiteButton = page.locator('button[type="button"]:has-text("Cancel")');

		// Main content
		this.testCasesMain = page.getByTestId('test-cases-main');
		this.testCasesHeader = this.testCasesMain.locator('h2:has-text("Test Cases")');
		this.newTestCaseButton = page.getByTestId('new-test-case-button');

		// Test case form
		this.newTestCaseTitleInput = page.locator(
			'input[placeholder*="Test case title"], input[placeholder*="press Enter"]'
		);
		this.newTestCaseDescriptionInput = page.locator('textarea[placeholder*="description"]');
		this.createTestCaseSubmitButton = page.locator('button[type="submit"]:has-text("Add")');
		this.cancelTestCaseButton = page.locator('button:has-text("Cancel")').last();

		// Modal
		this.testCaseModal = page.locator('[role="dialog"]');
		this.modalTitle = this.testCaseModal.locator('h2');
		this.modalCloseButton = this.testCaseModal.locator('button:has-text("✕")');
		this.modalOpenFullViewButton = this.testCaseModal.locator('a:has-text("Open Full View")');
		this.modalEditButton = this.testCaseModal.locator('button:has-text("Edit")');
	}

	/**
	 * Navigate to the test cases page for a specific project
	 */
	async navigate() {
		await this.goto(`/projects/${this.projectId}/cases`);
		await this.waitForPageLoad();
	}

	/**
	 * Wait for the page to fully load
	 */
	async waitForLoad() {
		await this.assertVisible(this.testSuitesContainer);
		await this.assertVisible(this.testCasesMain);
	}

	/**
	 * Get project information
	 */
	async getProjectInfo() {
		return {
			name: await this.getText(this.projectName),
			key: await this.getText(this.projectKey),
			description: (await this.isVisible(this.projectDescription))
				? await this.getText(this.projectDescription)
				: null
		};
	}

	/**
	 * Get stats
	 */
	async getStats() {
		const suitesText = await this.getText(this.totalSuitesCount);
		const casesText = await this.getText(this.totalTestCasesCount);

		return {
			totalSuites: parseInt(suitesText.match(/\d+/)?.[0] || '0'),
			totalTestCases: parseInt(casesText.match(/\d+/)?.[0] || '0')
		};
	}

	/**
	 * Click the "New Test Case" button
	 */
	async clickNewTestCase() {
		await this.click(this.newTestCaseButton);
	}

	/**
	 * Create a new test case
	 * @param title - Test case title
	 * @param description - Optional test case description
	 * @param waitForCreation - Whether to wait for creation to complete
	 */
	async createTestCase(title: string, description?: string, waitForCreation = true) {
		// Make sure we're in the uncategorized section by clicking it if needed
		const uncategorizedButton = this.testSuitesContainer.locator(
			'button:has-text("Uncategorized")'
		);
		if (await this.isVisible(uncategorizedButton)) {
			// Click to ensure it's expanded
			await this.click(uncategorizedButton);
			await this.page.waitForTimeout(500);
		}

		// Click new test case button if form isn't visible
		if (!(await this.isVisible(this.newTestCaseTitleInput))) {
			await this.clickNewTestCase();
			await this.page.waitForTimeout(300);
		}

		// Fill in the title
		await this.fill(this.newTestCaseTitleInput, title);

		// Fill in description if provided
		if (description && (await this.isVisible(this.newTestCaseDescriptionInput))) {
			await this.fill(this.newTestCaseDescriptionInput, description);
		}

		// Submit the form (either click button or press Enter)
		if (await this.isVisible(this.createTestCaseSubmitButton)) {
			await this.click(this.createTestCaseSubmitButton);
		} else {
			await this.pressKey('Enter');
		}

		// Wait for creation to complete
		if (waitForCreation) {
			await this.page.waitForTimeout(2000); // Increased timeout for optimistic rendering
		}
	}

	/**
	 * Cancel test case creation
	 */
	async cancelTestCaseCreation() {
		await this.click(this.cancelTestCaseButton);
	}

	/**
	 * Get all test cases displayed on the page
	 */
	async getTestCases(): Promise<Array<{ title: string; id: string }>> {
		const testCaseElements = await this.page.locator('[data-testcase-id]').all();
		const testCases: Array<{ title: string; id: string }> = [];

		for (const element of testCaseElements) {
			const id = (await element.getAttribute('data-testcase-id')) || '';
			const title = await element.locator('.font-medium').textContent();
			testCases.push({ id, title: title || '' });
		}

		return testCases;
	}

	/**
	 * Click on a test case by title
	 */
	async clickTestCase(title: string) {
		const testCase = this.page.locator(`text="${title}"`).first();
		await this.click(testCase);
	}

	/**
	 * Click on a test case by index (0-based)
	 */
	async clickTestCaseByIndex(index: number) {
		const testCases = await this.page.locator('[data-testcase-id]').all();
		if (index < testCases.length) {
			await testCases[index].click();
		}
	}

	/**
	 * Check if modal is visible
	 */
	async isModalVisible(): Promise<boolean> {
		return await this.isVisible(this.testCaseModal);
	}

	/**
	 * Close the test case modal
	 */
	async closeModal() {
		await this.click(this.modalCloseButton);
	}

	/**
	 * Get modal test case information
	 */
	async getModalTestCaseInfo() {
		if (!(await this.isModalVisible())) {
			return null;
		}

		const title = await this.getText(this.modalTitle);
		const description = await this.testCaseModal
			.locator('h3:has-text("Description") + p')
			.textContent();

		return {
			title: title.trim(),
			description: description?.trim() || null
		};
	}

	/**
	 * Click "Open Full View" in modal
	 */
	async openFullView() {
		await this.click(this.modalOpenFullViewButton);
	}

	/**
	 * Click "View Test Runs" button
	 */
	async clickViewTestRuns() {
		await this.click(this.viewTestRunsButton);
	}

	/**
	 * Click create suite button
	 */
	async clickCreateSuite() {
		await this.click(this.createSuiteButton);
	}

	/**
	 * Create a new test suite
	 * @param name - Suite name
	 * @param description - Optional suite description
	 */
	async createTestSuite(name: string, description?: string) {
		// Click create suite button if form isn't visible
		if (!(await this.isVisible(this.newSuiteNameInput))) {
			await this.clickCreateSuite();
		}

		// Fill in the name
		await this.fill(this.newSuiteNameInput, name);

		// Fill in description if provided and field is visible
		if (description) {
			const descInput = this.page.locator('textarea[placeholder*="Suite description"]');
			if (await this.isVisible(descInput)) {
				await this.fill(descInput, description);
			}
		}

		// Submit the form
		await this.click(this.createSuiteSubmitButton);

		// Wait for creation to complete
		await this.page.waitForTimeout(1000);
	}

	/**
	 * Cancel suite creation
	 */
	async cancelSuiteCreation() {
		await this.click(this.cancelSuiteButton);
	}

	/**
	 * Get all test suites displayed in the sidebar
	 */
	async getTestSuites(): Promise<Array<{ name: string; count: number }>> {
		// Look for suite buttons in the sidebar
		const suiteElements = await this.testSuitesContainer
			.locator('button:has(svg)')
			.filter({ hasNot: this.page.locator('[title="Create Suite"]') })
			.all();

		const suites: Array<{ name: string; count: number }> = [];

		for (const element of suiteElements) {
			const text = await element.textContent();
			if (!text) continue;

			// Extract suite name and count
			const match = text.match(/(.+?)(\d+)$/);
			if (match) {
				suites.push({
					name: match[1].trim(),
					count: parseInt(match[2])
				});
			}
		}

		return suites;
	}

	/**
	 * Click on a test suite to expand/collapse it
	 */
	async clickSuite(suiteName: string) {
		const suite = this.testSuitesContainer.locator(`button:has-text("${suiteName}")`).first();
		await this.click(suite);
	}

	/**
	 * Check if a suite is expanded
	 */
	async isSuiteExpanded(suiteName: string): Promise<boolean> {
		const suite = this.testSuitesContainer.locator(`button:has-text("${suiteName}")`).first();
		// Check if the chevron-down icon is visible (indicates expanded state)
		const chevronDown = suite.locator('svg').first();
		return await chevronDown.isVisible();
	}

	/**
	 * Wait for test case to appear in the list
	 */
	async waitForTestCase(title: string, timeout = 10000) {
		// First ensure the uncategorized section is expanded
		const uncategorizedButton = this.testSuitesContainer.locator(
			'button:has-text("Uncategorized")'
		);
		if (await this.isVisible(uncategorizedButton)) {
			await this.click(uncategorizedButton);
			await this.page.waitForTimeout(500);
		}

		// Now wait for the test case to appear
		await this.page.waitForSelector(`text="${title}"`, { timeout, state: 'visible' });
	}

	/**
	 * Wait for test suite to appear in the sidebar
	 */
	async waitForSuite(name: string, timeout = 5000) {
		await this.testSuitesContainer.waitFor({ state: 'visible' });
		await this.page.waitForSelector(`button:has-text("${name}")`, {
			timeout,
			state: 'visible'
		});
	}

	/**
	 * Get the count of test cases in a specific suite
	 */
	async getSuiteTestCaseCount(suiteName: string): Promise<number> {
		const suite = this.testSuitesContainer.locator(`button:has-text("${suiteName}")`).first();
		const text = await suite.textContent();
		const match = text?.match(/(\d+)$/);
		return match ? parseInt(match[1]) : 0;
	}

	/**
	 * Verify page is loaded correctly
	 */
	async verifyPageLoaded() {
		await this.assertVisible(this.projectName);
		await this.assertVisible(this.testSuitesContainer);
		await this.assertVisible(this.testCasesMain);
		await this.assertVisible(this.newTestCaseButton);
	}
}
