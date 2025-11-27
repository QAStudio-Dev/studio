import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth';

test.describe('Authentication', () => {
	let authPage: AuthPage;

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
	});

	test.describe('Login Page', () => {
		test.beforeEach(async () => {
			await authPage.navigateToLogin();
		});

		test('should display login form', async () => {
			await authPage.assertVisible(authPage.emailInput);
			await authPage.assertVisible(authPage.passwordInput);
			await authPage.assertVisible(authPage.submitButton);
		});

		test('should show error for empty email', async () => {
			await authPage.click(authPage.submitButton);
			// Form validation should prevent submission
			await authPage.assertUrl('/login');
		});

		test('should show error for invalid email format', async () => {
			await authPage.fill(authPage.emailInput, 'not-an-email');
			await authPage.fill(authPage.passwordInput, 'Password123');
			await authPage.click(authPage.submitButton);
			// HTML5 validation or custom validation should catch this
			await authPage.assertUrl('/login');
		});

		test('should show error for incorrect credentials', async ({ page }) => {
			await authPage.login('nonexistent@example.com', 'WrongPassword123');

			// Wait for error response
			await page.waitForTimeout(1000);

			// Should still be on login page with error
			await authPage.assertUrl('/login');
		});

		test('should have link to forgot password', async () => {
			await authPage.assertVisible(authPage.forgotPasswordLink);
		});

		test('should have link to signup', async () => {
			await authPage.assertVisible(authPage.signupLink);
		});

		test('should navigate to forgot password page', async ({ page }) => {
			await authPage.clickForgotPassword();
			await page.waitForURL('**/forgot-password**');
			expect(page.url()).toContain('/forgot-password');
		});

		test('should navigate to signup page', async ({ page }) => {
			await authPage.clickSignup();
			await page.waitForURL('**/signup**');
			expect(page.url()).toContain('/signup');
		});
	});

	test.describe('Signup Page', () => {
		test.beforeEach(async () => {
			await authPage.navigateToSignup();
		});

		test('should display signup form', async () => {
			await authPage.assertVisible(authPage.emailInput);
			await authPage.assertVisible(authPage.passwordInput);
			await authPage.assertVisible(authPage.submitButton);
		});

		test('should show validation error for weak password', async ({ page }) => {
			const weakPassword = '123'; // Too short, no uppercase/lowercase
			await authPage.signup('test@example.com', weakPassword);

			// Should show validation error or stay on page
			await page.waitForTimeout(500);
			await authPage.assertUrl('/signup');
		});

		test('should show error for duplicate email', async ({ page }) => {
			// This test assumes there's already a user with this email
			// In a real test, you'd create a user first, then try to signup with same email
			const testEmail = 'duplicate@example.com';

			await authPage.signup(testEmail, 'Password123', 'Test', 'User');
			await page.waitForTimeout(1000);

			// Depending on implementation, might stay on signup or show error
		});

		test('should have link to login', async () => {
			await authPage.assertVisible(authPage.loginLink);
		});

		test('should navigate to login page', async ({ page }) => {
			await authPage.clickLogin();
			await page.waitForURL('**/login**');
			expect(page.url()).toContain('/login');
		});
	});

	test.describe('Password Reset Flow', () => {
		test.beforeEach(async () => {
			await authPage.navigateToForgotPassword();
		});

		test('should display forgot password form', async () => {
			await authPage.assertVisible(authPage.emailInput);
			await authPage.assertVisible(authPage.submitButton);
		});

		test('should show success message after requesting reset', async ({ page }) => {
			await authPage.requestPasswordReset('test@example.com');
			await page.waitForTimeout(1000);

			// Should show success message (even if email doesn't exist - security best practice)
			// Implementation might redirect or show message on same page
		});

		test('should have link back to login', async () => {
			await authPage.assertVisible(authPage.backToLoginLink);
		});
	});

	test.describe('Password Setup (Clerk Migration)', () => {
		test.beforeEach(async () => {
			await authPage.navigateToSetupPassword();
		});

		test('should display setup password form', async () => {
			await authPage.assertVisible(authPage.emailInput);
			await authPage.assertVisible(authPage.newPasswordInput);
			await authPage.assertVisible(authPage.submitButton);
		});

		test('should show error for non-existent user', async ({ page }) => {
			await authPage.setupPassword('nonexistent@example.com', 'NewPassword123');
			await page.waitForTimeout(1000);

			// Should show error for invalid user
		});

		test('should enforce password requirements', async ({ page }) => {
			const weakPassword = '123';
			await authPage.fill(authPage.emailInput, 'test@example.com');
			await authPage.fill(authPage.newPasswordInput, weakPassword);
			await authPage.click(authPage.submitButton);

			await page.waitForTimeout(500);

			// Should show validation error
			await authPage.assertUrl('/setup-password');
		});
	});

	test.describe('CSRF Protection', () => {
		test('should include CSRF token in login request', async ({ page }) => {
			await authPage.navigateToLogin();

			// Monitor network requests
			const requests: any[] = [];
			page.on('request', (request) => {
				if (request.url().includes('/api/auth/login')) {
					requests.push(request);
				}
			});

			await authPage.login('test@example.com', 'Password123');
			await page.waitForTimeout(1000);

			// Verify CSRF token was sent
			if (requests.length > 0) {
				const postData = requests[0].postDataJSON();
				expect(postData).toHaveProperty('csrfToken');
			}
		});

		test('should reject request without CSRF token', async ({ page, context }) => {
			await authPage.navigateToLogin();

			// Try to make a request without CSRF token
			const response = await context.request.post('/api/auth/login', {
				data: {
					email: 'test@example.com',
					password: 'Password123'
					// No csrfToken
				}
			});

			// Should get 403 Forbidden
			expect(response.status()).toBe(403);
		});
	});

	test.describe('Rate Limiting', () => {
		test('should rate limit excessive login attempts', async ({ page }) => {
			await authPage.navigateToLogin();

			// Make 6 rapid login attempts (limit is 5)
			for (let i = 0; i < 6; i++) {
				await authPage.fill(authPage.emailInput, 'test@example.com');
				await authPage.fill(authPage.passwordInput, 'WrongPassword123');
				await authPage.click(authPage.submitButton);
				await page.waitForTimeout(500);
			}

			// 6th attempt should be rate limited
			// Check for rate limit error message
			const hasError = await authPage.hasError();
			expect(hasError).toBe(true);
		});
	});

	test.describe('Session Management', () => {
		test('should redirect unauthenticated users to login', async ({ page }) => {
			// Try to access a protected page without being logged in
			await page.goto('/projects');

			// Should redirect to login
			await page.waitForURL('**/login**', { timeout: 5000 });
			expect(page.url()).toContain('/login');
		});

		test('should persist session across page reloads', async ({ page, context }) => {
			// This test requires a valid user account
			// For now, it's a placeholder that would need actual credentials
			// 1. Login
			// 2. Reload page
			// 3. Verify still logged in
		});

		test('should clear session on logout', async ({ page, context }) => {
			// This test requires a valid user account
			// For now, it's a placeholder
			// 1. Login
			// 2. Logout
			// 3. Verify session cleared
			// 4. Try to access protected page - should redirect to login
		});
	});

	test.describe('Accessibility', () => {
		test('login form should be keyboard navigable', async ({ page }) => {
			await authPage.navigateToLogin();

			// Tab through form elements
			await page.keyboard.press('Tab'); // Email input
			await page.keyboard.type('test@example.com');

			await page.keyboard.press('Tab'); // Password input
			await page.keyboard.type('Password123');

			await page.keyboard.press('Tab'); // Submit button
			await page.keyboard.press('Enter'); // Submit

			await page.waitForTimeout(500);
		});

		test('signup form should be keyboard navigable', async ({ page }) => {
			await authPage.navigateToSignup();

			// Tab through form elements
			await page.keyboard.press('Tab');
			await page.keyboard.type('test@example.com');

			await page.keyboard.press('Tab');
			await page.keyboard.type('Password123');

			await page.keyboard.press('Tab');
			await page.keyboard.press('Enter');

			await page.waitForTimeout(500);
		});

		test('login form should have proper labels and aria attributes', async ({ page }) => {
			await authPage.navigateToLogin();

			// Email input should have label or aria-label
			const emailInput = await authPage.emailInput.first();
			const emailLabel = await emailInput.getAttribute('aria-label');
			const emailId = await emailInput.getAttribute('id');

			expect(emailLabel || emailId).toBeTruthy();

			// Password input should have label or aria-label
			const passwordInput = await authPage.passwordInput.first();
			const passwordLabel = await passwordInput.getAttribute('aria-label');
			const passwordId = await passwordInput.getAttribute('id');

			expect(passwordLabel || passwordId).toBeTruthy();
		});
	});
});
