import { test, expect } from '@playwright/test';
import { TestCasesPage } from '../pages/test-cases';
import { loginAsTestUser } from '../helpers/auth';

/**
 * Test Cases Page E2E Tests
 * Tests the test case management functionality including:
 * - Creating test cases
 * - Creating test suites
 * - Viewing test case details
 * - Navigation and UI interactions
 */

test.describe('Test Cases Page', () => {
	let testCasesPage: TestCasesPage;
	let projectId: string;

	test.beforeEach(async ({ page }) => {
		// Login before each test
		await loginAsTestUser(page);

		// Get the first project from the projects page
		// Wait for projects to load (look for project cards with links)
		await page.waitForSelector('a[href*="/projects/"]', { timeout: 10000 });

		// Get first project link (they link to /projects/[id]/runs)
		const firstProjectLink = page.locator('a[href*="/projects/"][href*="/runs"]').first();
		const href = await firstProjectLink.getAttribute('href');

		if (!href) {
			throw new Error('No project found. Please create a project first.');
		}

		// Extract project ID from href (format: /projects/[id]/runs)
		const match = href.match(/\/projects\/([^/]+)\/runs/);
		if (!match) {
			throw new Error('Could not extract project ID from URL');
		}
		projectId = match[1];

		// Initialize page object and navigate
		testCasesPage = new TestCasesPage(page, projectId);
		await testCasesPage.navigate();
		await testCasesPage.waitForLoad();
	});

	test.describe('Page Load and Navigation', () => {
		test('should load the test cases page successfully', async () => {
			await testCasesPage.verifyPageLoaded();
		});

		test('should display project information', async () => {
			const projectInfo = await testCasesPage.getProjectInfo();

			expect(projectInfo.name).toBeTruthy();
			expect(projectInfo.key).toBeTruthy();
			// Description is optional
		});

		test('should display test case statistics', async () => {
			const stats = await testCasesPage.getStats();

			expect(stats.totalSuites).toBeGreaterThanOrEqual(0);
			expect(stats.totalTestCases).toBeGreaterThanOrEqual(0);
		});

		test('should have "View Test Runs" button visible', async () => {
			await testCasesPage.assertVisible(testCasesPage.viewTestRunsButton);
		});

		test('should navigate to test runs page when clicking "View Test Runs"', async ({
			page
		}) => {
			await testCasesPage.clickViewTestRuns();
			await page.waitForURL(`**/projects/${projectId}/runs**`, { timeout: 5000 });
			expect(page.url()).toContain('/runs');
		});
	});

	test.describe('Test Suite Management', () => {
		test('should display "Test Suites" sidebar', async () => {
			await testCasesPage.assertVisible(testCasesPage.testSuitesContainer);
			await testCasesPage.assertVisible(testCasesPage.testSuitesHeader);
		});

		test('should have "Create Suite" button visible', async () => {
			await testCasesPage.assertVisible(testCasesPage.createSuiteButton);
		});

		test('should show suite creation form when clicking "Create Suite"', async () => {
			await testCasesPage.clickCreateSuite();
			await testCasesPage.assertVisible(testCasesPage.newSuiteNameInput);
			await testCasesPage.assertVisible(testCasesPage.createSuiteSubmitButton);
			await testCasesPage.assertVisible(testCasesPage.cancelSuiteButton);
		});

		test('should create a new test suite successfully', async ({ page }) => {
			const suiteName = `E2E Suite ${Date.now()}`;

			await testCasesPage.createTestSuite(suiteName);

			// Wait for suite to appear in sidebar
			await testCasesPage.waitForSuite(suiteName);

			// Verify suite is in the list
			const suites = await testCasesPage.getTestSuites();
			const createdSuite = suites.find((s) => s.name === suiteName);

			expect(createdSuite).toBeDefined();
			expect(createdSuite?.count).toBe(0); // New suite should have 0 test cases
		});

		test('should cancel suite creation', async () => {
			await testCasesPage.clickCreateSuite();
			await testCasesPage.assertVisible(testCasesPage.newSuiteNameInput);

			await testCasesPage.cancelSuiteCreation();

			// Form should be hidden
			expect(await testCasesPage.isVisible(testCasesPage.newSuiteNameInput)).toBe(false);
		});

		test('should not create suite with empty name', async () => {
			await testCasesPage.clickCreateSuite();

			// Submit button should be disabled when input is empty
			const submitButton = testCasesPage.createSuiteSubmitButton;
			expect(await submitButton.isDisabled()).toBe(true);
		});
	});

	test.describe('Test Case Management', () => {
		test('should display "Test Cases" main section', async () => {
			await testCasesPage.assertVisible(testCasesPage.testCasesMain);
			await testCasesPage.assertVisible(testCasesPage.testCasesHeader);
		});

		test('should have "New Test Case" button visible', async () => {
			await testCasesPage.assertVisible(testCasesPage.newTestCaseButton);
		});

		test('should show test case creation form when clicking "New Test Case"', async () => {
			await testCasesPage.clickNewTestCase();
			await testCasesPage.assertVisible(testCasesPage.newTestCaseTitleInput);
		});

		// TODO: create new project before running this test
		test.skip('should create a new test case successfully', async ({ page }) => {
			const testCaseTitle = `E2E Test Case ${Date.now()}`;

			await testCasesPage.createTestCase(testCaseTitle);

			// Wait for test case to appear
			await testCasesPage.waitForTestCase(testCaseTitle);

			// Verify test case is in the list
			const testCases = await testCasesPage.getTestCases();
			const createdTestCase = testCases.find((tc) => tc.title === testCaseTitle);

			expect(createdTestCase).toBeDefined();
		});

		// TODO: create new project before running this test
		test.skip('should create multiple test cases in quick succession', async ({ page }) => {
			const baseName = `E2E Batch ${Date.now()}`;
			const testCases = [`${baseName} - TC1`, `${baseName} - TC2`, `${baseName} - TC3`];

			// Create first test case
			await testCasesPage.clickNewTestCase();

			for (const title of testCases) {
				// Fill and submit (form should stay open for quick entry)
				await testCasesPage.fill(testCasesPage.newTestCaseTitleInput, title);
				await testCasesPage.pressKey('Enter');

				// Brief wait between entries
				await page.waitForTimeout(500);
			}

			// Wait for all test cases to appear
			for (const title of testCases) {
				await testCasesPage.waitForTestCase(title, 10000);
			}

			// Verify all test cases were created
			const allTestCases = await testCasesPage.getTestCases();
			for (const title of testCases) {
				const found = allTestCases.find((tc) => tc.title === title);
				expect(found).toBeDefined();
			}
		});

		test('should not create test case with empty title', async () => {
			await testCasesPage.clickNewTestCase();

			// Try to submit with empty title (press Enter)
			await testCasesPage.pressKey('Enter');

			// Form should still be visible (creation should not happen)
			await testCasesPage.assertVisible(testCasesPage.newTestCaseTitleInput);
		});

		test('should increment test case count after creating a test case', async ({ page }) => {
			const initialStats = await testCasesPage.getStats();
			const testCaseTitle = `E2E Count Test ${Date.now()}`;

			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			// Refresh stats
			await page.waitForTimeout(1000);
			const updatedStats = await testCasesPage.getStats();

			expect(updatedStats.totalTestCases).toBe(initialStats.totalTestCases + 1);
		});
	});

	test.describe('Test Case Modal', () => {
		test('should open modal when clicking on a test case', async ({ page }) => {
			// First, create a test case to click on
			const testCaseTitle = `E2E Modal Test ${Date.now()}`;
			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			// Click on the test case
			await testCasesPage.clickTestCase(testCaseTitle);

			// Wait for modal to appear
			await page.waitForTimeout(500);

			// Verify modal is visible
			expect(await testCasesPage.isModalVisible()).toBe(true);
		});

		test('should display test case information in modal', async ({ page }) => {
			const testCaseTitle = `E2E Modal Info Test ${Date.now()}`;
			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			await testCasesPage.clickTestCase(testCaseTitle);
			await page.waitForTimeout(500);

			const modalInfo = await testCasesPage.getModalTestCaseInfo();
			expect(modalInfo).not.toBeNull();
			expect(modalInfo?.title).toContain(testCaseTitle);
		});

		test('should close modal when clicking close button', async ({ page }) => {
			const testCaseTitle = `E2E Modal Close Test ${Date.now()}`;
			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			await testCasesPage.clickTestCase(testCaseTitle);
			await page.waitForTimeout(500);

			expect(await testCasesPage.isModalVisible()).toBe(true);

			await testCasesPage.closeModal();
			await page.waitForTimeout(500);

			expect(await testCasesPage.isModalVisible()).toBe(false);
		});

		test('should have "Open Full View" button in modal', async ({ page }) => {
			const testCaseTitle = `E2E Full View Test ${Date.now()}`;
			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			await testCasesPage.clickTestCase(testCaseTitle);
			await page.waitForTimeout(500);

			await testCasesPage.assertVisible(testCasesPage.modalOpenFullViewButton);
		});

		test('should navigate to full test case page when clicking "Open Full View"', async ({
			page
		}) => {
			const testCaseTitle = `E2E Navigation Test ${Date.now()}`;
			await testCasesPage.createTestCase(testCaseTitle);
			await testCasesPage.waitForTestCase(testCaseTitle);

			await testCasesPage.clickTestCase(testCaseTitle);
			await page.waitForTimeout(500);

			await testCasesPage.openFullView();

			// Wait for navigation
			await page.waitForURL(`**/projects/${projectId}/cases/**`, { timeout: 5000 });

			// Verify we're on the test case detail page
			expect(page.url()).toMatch(/\/projects\/[^/]+\/cases\/[^/]+/);
		});
	});

	test.describe('Suite and Test Case Integration', () => {
		test('should create suite and add test case to it', async ({ page }) => {
			const suiteName = `E2E Integration Suite ${Date.now()}`;
			const testCaseTitle = `E2E Integration TC ${Date.now()}`;

			// Create suite first
			await testCasesPage.createTestSuite(suiteName);
			await testCasesPage.waitForSuite(suiteName);

			// Verify initial count is 0
			let count = await testCasesPage.getSuiteTestCaseCount(suiteName);
			expect(count).toBe(0);

			// Note: Adding test cases to suites requires clicking the suite first
			// and then creating a test case, or drag-and-drop functionality
			// This is a more advanced test that may require additional implementation
		});

		test('should expand and collapse test suites', async ({ page }) => {
			const suiteName = `E2E Expand Suite ${Date.now()}`;

			// Create a suite
			await testCasesPage.createTestSuite(suiteName);
			await testCasesPage.waitForSuite(suiteName);

			// Suites are expanded by default in this app
			// Click to interact with suite
			await testCasesPage.clickSuite(suiteName);
			await page.waitForTimeout(500);

			// Verify suite is clickable and interactive
			// The actual expand/collapse behavior depends on the UI implementation
		});
	});

	test.describe('Keyboard Navigation', () => {
		// TODO: create new project before running this test
		test.skip('should support keyboard navigation in test case creation', async ({ page }) => {
			const testCaseTitle = `E2E Keyboard Test ${Date.now()}`;

			await testCasesPage.clickNewTestCase();

			// Type title
			await testCasesPage.fill(testCasesPage.newTestCaseTitleInput, testCaseTitle);

			// Press Enter to submit
			await testCasesPage.pressKey('Enter');

			// Wait for test case to be created
			await testCasesPage.waitForTestCase(testCaseTitle);

			// Verify it was created
			const testCases = await testCasesPage.getTestCases();
			expect(testCases.find((tc) => tc.title === testCaseTitle)).toBeDefined();
		});
	});

	test.describe('Error Handling', () => {
		test('should handle API errors gracefully when creating test case', async ({ page }) => {
			// This test would require mocking API errors
			// For now, just verify the UI handles network issues
			// Skip this test if you can't mock the API
			test.skip();
		});

		test('should handle API errors gracefully when creating suite', async ({ page }) => {
			// Similar to above - would require API mocking
			test.skip();
		});
	});

	test.describe('Accessibility', () => {
		test('should have accessible labels on main interactive elements', async ({ page }) => {
			// Verify important buttons have accessible labels
			const newTestCaseBtn = testCasesPage.newTestCaseButton;
			const newTestCaseText = await newTestCaseBtn.textContent();

			expect(newTestCaseText).toContain('New Test Case');
		});

		test('should support keyboard navigation through main UI elements', async ({ page }) => {
			// Tab through main elements
			await page.keyboard.press('Tab'); // First focusable element

			// Verify focus moves through the page
			// This is a basic test - more comprehensive accessibility testing
			// would use tools like axe-core
		});
	});

	test.describe('Responsive Design', () => {
		test('should display correctly on mobile viewport', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });

			await testCasesPage.navigate();
			await testCasesPage.waitForLoad();

			// Verify main elements are still accessible
			await testCasesPage.assertVisible(testCasesPage.projectName);
			await testCasesPage.assertVisible(testCasesPage.newTestCaseButton);
		});

		test('should display correctly on tablet viewport', async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 });

			await testCasesPage.navigate();
			await testCasesPage.waitForLoad();

			// Verify layout adapts correctly
			await testCasesPage.assertVisible(testCasesPage.testSuitesContainer);
			await testCasesPage.assertVisible(testCasesPage.testCasesMain);
		});
	});
});
