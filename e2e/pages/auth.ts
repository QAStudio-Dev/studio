import { Page, Locator } from '@playwright/test';
import { BasePage } from './base';

/**
 * Authentication Page Object Model
 * Handles login, signup, password reset, and setup password flows
 */
export class AuthPage extends BasePage {
	// Common selectors
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	readonly errorMessage: Locator;
	readonly successMessage: Locator;

	// Login specific
	readonly forgotPasswordLink: Locator;
	readonly signupLink: Locator;

	// Signup specific
	readonly firstNameInput: Locator;
	readonly lastNameInput: Locator;
	readonly confirmPasswordInput: Locator;
	readonly loginLink: Locator;

	// Password reset specific
	readonly newPasswordInput: Locator;
	readonly backToLoginLink: Locator;

	constructor(page: Page) {
		super(page);

		// Common inputs
		this.emailInput = page.locator('input[type="email"], input[name="email"]');
		this.passwordInput = page.locator('input[type="password"]').first();
		this.submitButton = page.locator('button[type="submit"]');
		this.errorMessage = page.locator('[role="alert"], .error, .text-error-500');
		this.successMessage = page.locator('.success, .text-success-500');

		// Login page
		this.forgotPasswordLink = page.locator('a[href*="forgot-password"]');
		this.signupLink = page.locator('a[href*="signup"]');

		// Signup page
		this.firstNameInput = page.locator('input[name="firstName"]');
		this.lastNameInput = page.locator('input[name="lastName"]');
		this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
		this.loginLink = page.locator('a[href*="login"]');

		// Password reset
		this.newPasswordInput = page.locator('input[name="newPassword"], input[name="password"]');
		this.backToLoginLink = page.locator('a[href*="login"]');
	}

	/**
	 * Navigate to login page
	 */
	async navigateToLogin() {
		await this.goto('/login');
		await this.waitForPageLoad();
	}

	/**
	 * Navigate to signup page
	 */
	async navigateToSignup() {
		await this.goto('/signup');
		await this.waitForPageLoad();
	}

	/**
	 * Navigate to forgot password page
	 */
	async navigateToForgotPassword() {
		await this.goto('/forgot-password');
		await this.waitForPageLoad();
	}

	/**
	 * Navigate to password setup page
	 */
	async navigateToSetupPassword() {
		await this.goto('/setup-password');
		await this.waitForPageLoad();
	}

	/**
	 * Login with email and password
	 */
	async login(email: string, password: string) {
		await this.fill(this.emailInput, email);
		await this.fill(this.passwordInput, password);
		await this.click(this.submitButton);
	}

	/**
	 * Sign up with email, password, and optional name
	 */
	async signup(email: string, password: string, firstName?: string, lastName?: string) {
		await this.fill(this.emailInput, email);
		await this.fill(this.passwordInput, password);

		if (firstName) {
			await this.fill(this.firstNameInput, firstName);
		}

		if (lastName) {
			await this.fill(this.lastNameInput, lastName);
		}

		// If there's a confirm password field, fill it
		if (await this.isVisible(this.confirmPasswordInput)) {
			await this.fill(this.confirmPasswordInput, password);
		}

		await this.click(this.submitButton);
	}

	/**
	 * Request password reset
	 */
	async requestPasswordReset(email: string) {
		await this.fill(this.emailInput, email);
		await this.click(this.submitButton);
	}

	/**
	 * Reset password with token
	 */
	async resetPassword(token: string, newPassword: string) {
		await this.goto(`/reset-password?token=${token}`);
		await this.waitForPageLoad();
		await this.fill(this.newPasswordInput, newPassword);
		await this.click(this.submitButton);
	}

	/**
	 * Setup password (for migrated users)
	 */
	async setupPassword(email: string, newPassword: string) {
		await this.fill(this.emailInput, email);
		await this.fill(this.newPasswordInput, newPassword);
		await this.click(this.submitButton);
	}

	/**
	 * Get error message text
	 */
	async getErrorMessage(): Promise<string> {
		return await this.getText(this.errorMessage);
	}

	/**
	 * Get success message text
	 */
	async getSuccessMessage(): Promise<string> {
		return await this.getText(this.successMessage);
	}

	/**
	 * Check if error message is visible
	 */
	async hasError(): Promise<boolean> {
		return await this.isVisible(this.errorMessage);
	}

	/**
	 * Check if success message is visible
	 */
	async hasSuccess(): Promise<boolean> {
		return await this.isVisible(this.successMessage);
	}

	/**
	 * Click forgot password link
	 */
	async clickForgotPassword() {
		await this.click(this.forgotPasswordLink);
	}

	/**
	 * Click signup link
	 */
	async clickSignup() {
		await this.click(this.signupLink);
	}

	/**
	 * Click login link
	 */
	async clickLogin() {
		await this.click(this.loginLink);
	}
}
