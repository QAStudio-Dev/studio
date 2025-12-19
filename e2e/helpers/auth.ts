import { Page } from '@playwright/test';
import { AuthPage } from '../pages/auth';

/**
 * Authentication Helper for E2E Tests
 * Provides reusable authentication methods for Playwright tests
 */

/**
 * Get authentication credentials from environment variables
 */
export function getAuthCredentials() {
	const email = process.env.PLAYWRIGHT_USER_EMAIL;
	const password = process.env.PLAYWRIGHT_USER_PASSWORD;

	if (!email || !password) {
		throw new Error(
			'PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD must be set in environment variables'
		);
	}

	return { email, password };
}

/**
 * Login with the configured test user
 * @param page - Playwright page object
 * @param redirectUrl - Optional URL to wait for after successful login (default: /projects)
 */
export async function loginAsTestUser(page: Page, redirectUrl = '**/projects**') {
	const { email, password } = getAuthCredentials();
	const authPage = new AuthPage(page);

	await authPage.navigateToLogin();
	await authPage.login(email, password);

	// Wait for redirect after successful login
	await page.waitForURL(redirectUrl, { timeout: 10000 });
}

/**
 * Logout the current user
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
	// Navigate to logout endpoint or click logout button
	// Implementation depends on your logout mechanism
	await page.goto('/api/auth/logout', { waitUntil: 'networkidle' });

	// Wait for redirect to login page
	await page.waitForURL('**/login**', { timeout: 5000 });
}

/**
 * Check if user is currently authenticated
 * @param page - Playwright page object
 * @returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
	try {
		// Try to access a protected page
		await page.goto('/projects', { waitUntil: 'networkidle' });

		// If we're on the projects page, we're authenticated
		const url = page.url();
		return url.includes('/projects') && !url.includes('/login');
	} catch {
		return false;
	}
}

/**
 * Setup authentication state for use with test fixtures
 * This can be used to create a reusable authentication state
 * that can be loaded in beforeEach hooks
 *
 * Example usage:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupAuthState(page);
 * });
 * ```
 */
export async function setupAuthState(page: Page) {
	await loginAsTestUser(page);

	// Save authentication state for reuse
	await page.context().storageState({ path: '.auth/user.json' });
}
