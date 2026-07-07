import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base';

/**
 * Test Case Detail Page Object Model
 * Handles the full test case view at /projects/[projectId]/cases/[testCaseId]
 */
export class TestCaseDetailPage extends BasePage {
	readonly projectId: string;
	readonly testCaseId: string;

	readonly pageTitle: Locator;
	readonly editButton: Locator;
	readonly executionHistoryHeading: Locator;
	readonly serverErrorHeading: Locator;

	readonly editDialogTitle: Locator;
	readonly editTitleInput: Locator;
	readonly editDescriptionInput: Locator;
	readonly editStepsInput: Locator;
	readonly editSaveButton: Locator;
	readonly editCancelButton: Locator;

	constructor(page: Page, projectId: string, testCaseId: string) {
		super(page);
		this.projectId = projectId;
		this.testCaseId = testCaseId;

		this.pageTitle = page.locator('h1.text-3xl');
		this.editButton = page.getByRole('button', { name: 'Edit' });
		this.executionHistoryHeading = page.getByRole('heading', { name: 'Execution History' });
		this.serverErrorHeading = page.getByRole('heading', { name: 'Server Bug Detected' });

		this.editDialogTitle = page.getByRole('heading', { name: 'Edit Test Case' });
		this.editTitleInput = page.locator('form input[placeholder="Test case title"]');
		this.editDescriptionInput = page.locator(
			'form textarea[placeholder="Describe what this test case validates"]'
		);
		this.editStepsInput = page.locator(
			'form textarea[placeholder="Step-by-step instructions to execute this test"]'
		);
		this.editSaveButton = page.getByRole('button', { name: 'Save Changes' });
		this.editCancelButton = page.locator('form button:has-text("Cancel")');
	}

	async navigate() {
		await this.goto(`/projects/${this.projectId}/cases/${this.testCaseId}`);
		await this.waitForPageLoad();
	}

	async waitForLoad() {
		await this.assertNoServerError();
		await this.pageTitle.waitFor({ state: 'visible', timeout: 15000 });
	}

	async assertNoServerError() {
		await expect(this.serverErrorHeading).toHaveCount(0);
		await expect(this.page.getByText('Our servers encountered a critical bug')).toHaveCount(0);
	}

	async getTitle(): Promise<string> {
		return (await this.pageTitle.textContent())?.trim() ?? '';
	}

	async openEditDialog() {
		await this.click(this.editButton);
		await this.editDialogTitle.waitFor({ state: 'visible', timeout: 5000 });
	}

	async fillEditForm(fields: { title?: string; description?: string; steps?: string }) {
		if (fields.title !== undefined) {
			await this.fill(this.editTitleInput, fields.title);
		}
		if (fields.description !== undefined) {
			await this.fill(this.editDescriptionInput, fields.description);
		}
		if (fields.steps !== undefined) {
			await this.fill(this.editStepsInput, fields.steps);
		}
	}

	async saveEdit() {
		const patchResponsePromise = this.page.waitForResponse(
			(response) =>
				response.request().method() === 'PATCH' &&
				new URL(response.url()).pathname === `/api/cases/${this.testCaseId}`,
			{ timeout: 30000 }
		);

		await this.click(this.editSaveButton);

		const patchResponse = await patchResponsePromise;
		expect(
			patchResponse.ok(),
			`PATCH /api/cases/${this.testCaseId} failed (${patchResponse.status()}): ${await patchResponse.text()}`
		).toBe(true);

		await this.editDialogTitle.waitFor({ state: 'hidden', timeout: 10000 });
		await this.waitForPageLoad();
	}

	async assertExecutionHistoryVisible() {
		await this.assertVisible(this.executionHistoryHeading);
	}

	async assertDescriptionVisible(text: string) {
		const descriptionCard = this.page.locator('.card p.text-surface-600-300', {
			hasText: text
		});
		await expect(descriptionCard.first()).toBeVisible();
	}

	async assertStepsVisible(text: string) {
		const stepsCard = this.page.locator('.card', {
			has: this.page.getByRole('heading', { name: 'Test Steps' })
		});
		await expect(stepsCard.getByText(text)).toBeVisible();
	}
}
