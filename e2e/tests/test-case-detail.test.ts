import { test, expect } from '@playwright/test';
import { TestCasesPage } from '../pages/test-cases';
import { TestCaseDetailPage } from '../pages/test-case-detail';
import { loginAsTestUser } from '../helpers/auth';
import {
	cleanupE2eTestData,
	E2E_DETAIL_PREFIX,
	getE2eProjectId,
	waitForTestCaseInApi
} from '../helpers/cleanup';
import { createTestCaseWithExecutionHistory } from '../helpers/test-case-fixtures';

/**
 * Test Case Detail Page E2E Tests
 *
 * Regression coverage for the production 500 error when opening or editing
 * test cases (especially those with execution history and nested step results).
 */
test.describe('Test Case Detail Page', () => {
	test.describe.configure({ mode: 'serial' });

	let projectId: string;

	test.beforeAll(async ({ request }) => {
		projectId = getE2eProjectId();
		await cleanupE2eTestData(request, projectId, { prefix: E2E_DETAIL_PREFIX });
	});

	test.afterEach(async ({ request }) => {
		if (projectId) {
			await cleanupE2eTestData(request, projectId, { prefix: E2E_DETAIL_PREFIX });
		}
	});

	test.describe('Open test case', () => {
		test.describe.configure({ timeout: 60_000 });

		test('should open a newly created test case without a server error', async ({
			page,
			request
		}) => {
			const title = `E2E Detail Open ${Date.now()}`;

			await loginAsTestUser(page);

			const listPage = new TestCasesPage(page, projectId);
			await listPage.navigate();
			await listPage.waitForLoad();
			const created = await listPage.createTestCase(title);
			expect(created).toBeDefined();
			expect(created?.id).toBeTruthy();
			expect(created?.id.startsWith('temp-')).toBe(false);

			await waitForTestCaseInApi(request, projectId, created!.id);

			const detailPage = new TestCaseDetailPage(page, projectId, created!.id);
			await detailPage.navigate();
			await detailPage.waitForLoad();

			await expect(detailPage.pageTitle).toHaveText(title);
			await detailPage.assertVisible(detailPage.editButton);
		});

		test('should open a test case with execution history without a server error', async ({
			page,
			request
		}) => {
			const title = `E2E Detail History ${Date.now()}`;
			const fixture = await createTestCaseWithExecutionHistory(request, projectId, title);

			await loginAsTestUser(page);

			const detailPage = new TestCaseDetailPage(page, projectId, fixture.testCaseId);
			await detailPage.navigate();
			await detailPage.waitForLoad();

			await expect(detailPage.pageTitle).toHaveText(title);
			await detailPage.assertExecutionHistoryVisible();
			await expect(page.getByText('FAILED', { exact: true }).first()).toBeVisible();
		});
	});

	test.describe('Edit test case', () => {
		test.describe.configure({ timeout: 60_000 });

		test('should edit and save test case content on the detail page', async ({
			page,
			request
		}) => {
			const originalTitle = `E2E Detail Edit ${Date.now()}`;
			const updatedTitle = `${originalTitle} Updated`;
			const description = 'Updated description from E2E test';
			const steps = 'Step 1: Do something\nStep 2: Verify outcome';

			await loginAsTestUser(page);

			const listPage = new TestCasesPage(page, projectId);
			await listPage.navigate();
			await listPage.waitForLoad();
			const created = await listPage.createTestCase(originalTitle);
			expect(created).toBeDefined();

			await waitForTestCaseInApi(request, projectId, created!.id);

			const detailPage = new TestCaseDetailPage(page, projectId, created!.id);
			await detailPage.navigate();
			await detailPage.waitForLoad();

			await detailPage.openEditDialog();
			await detailPage.fillEditForm({
				title: updatedTitle,
				description,
				steps
			});
			await detailPage.saveEdit();

			await expect(detailPage.pageTitle).toHaveText(updatedTitle);
			await detailPage.assertDescriptionVisible(description);
			await detailPage.assertStepsVisible('Step 1: Do something');
		});
	});
});
