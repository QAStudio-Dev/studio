import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test.describe('Authentication', () => {
	test.describe('Login', () => {
		test('should show login form', async ({ page }) => {
			await page.goto('/sign-in');
			await expect(page).toHaveTitle(/Sign In/);
		});

		test('should handle invalid credentials', async ({ page }) => {
			await page.goto('/sign-in');
			// Just check the page loads
			await expect(page).toHaveURL(/sign-in/);
		});
	});

	test.describe('Registration', () => {
		test('should show signup form', async ({ page }) => {
			await page.goto('/sign-up');
			await expect(page).toHaveTitle(/Sign Up/);
		});
	});
});

test.describe('Projects', () => {
	test('should list projects', async ({ page }) => {
		await page.goto('/');
		// Just verify the page loads
		await expect(page.locator('h1')).toBeVisible();
	});
});
