import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page class that all page objects extend from.
 * Contains common functionality shared across all pages.
 */
export class BasePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Navigate to a specific URL
	 */
	async goto(url: string) {
		await this.page.goto(url);
	}

	/**
	 * Get the current URL
	 */
	async getCurrentUrl(): Promise<string> {
		return this.page.url();
	}

	/**
	 * Wait for page to load
	 */
	async waitForPageLoad() {
		await this.page.waitForLoadState('domcontentloaded');
		await this.page.waitForLoadState('networkidle');
	}

	/**
	 * Get page title
	 */
	async getPageTitle(): Promise<string> {
		return await this.page.title();
	}

	/**
	 * Wait for element to be visible
	 */
	async waitForElement(locator: Locator, timeout: number = 10000) {
		await locator.waitFor({ state: 'visible', timeout });
	}

	/**
	 * Click an element
	 */
	async click(locator: Locator) {
		await locator.click();
	}

	/**
	 * Fill input field
	 */
	async fill(locator: Locator, text: string) {
		await locator.fill(text);
	}

	/**
	 * Get text content from element
	 */
	async getText(locator: Locator): Promise<string> {
		return (await locator.textContent()) || '';
	}

	/**
	 * Check if element is visible
	 */
	async isVisible(locator: Locator): Promise<boolean> {
		return await locator.isVisible();
	}

	/**
	 * Check if element is enabled
	 */
	async isEnabled(locator: Locator): Promise<boolean> {
		return await locator.isEnabled();
	}

	/**
	 * Wait for navigation after action
	 */
	async waitForNavigation(action: () => Promise<void>) {
		await Promise.all([this.page.waitForURL('**/*'), action()]);
	}

	/**
	 * Take screenshot
	 */
	async takeScreenshot(name: string) {
		await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
	}

	/**
	 * Scroll to element
	 */
	async scrollToElement(locator: Locator) {
		await locator.scrollIntoViewIfNeeded();
	}

	/**
	 * Get element count
	 */
	async getElementCount(locator: Locator): Promise<number> {
		return await locator.count();
	}

	/**
	 * Wait for specific time (use sparingly)
	 */
	async wait(ms: number) {
		await this.page.waitForTimeout(ms);
	}

	/**
	 * Press keyboard key
	 */
	async pressKey(key: string) {
		await this.page.keyboard.press(key);
	}

	/**
	 * Hover over element
	 */
	async hover(locator: Locator) {
		await locator.hover();
	}

	/**
	 * Check if URL contains specific text
	 */
	async urlContains(text: string): Promise<boolean> {
		const url = await this.getCurrentUrl();
		return url.includes(text);
	}

	/**
	 * Get element attribute value
	 */
	async getAttribute(locator: Locator, attribute: string): Promise<string | null> {
		return await locator.getAttribute(attribute);
	}

	/**
	 * Select option from dropdown
	 */
	async selectOption(locator: Locator, value: string) {
		await locator.selectOption(value);
	}

	/**
	 * Check checkbox
	 */
	async check(locator: Locator) {
		await locator.check();
	}

	/**
	 * Uncheck checkbox
	 */
	async uncheck(locator: Locator) {
		await locator.uncheck();
	}

	/**
	 * Verify element is visible with assertion
	 */
	async assertVisible(locator: Locator) {
		await expect(locator).toBeVisible();
	}

	/**
	 * Verify element has text with assertion
	 */
	async assertHasText(locator: Locator, text: string | RegExp) {
		await expect(locator).toHaveText(text);
	}

	/**
	 * Verify element contains text with assertion
	 */
	async assertContainsText(locator: Locator, text: string) {
		await expect(locator).toContainText(text);
	}

	/**
	 * Verify URL with assertion
	 */
	async assertUrl(url: string | RegExp) {
		await expect(this.page).toHaveURL(url);
	}

	/**
	 * Verify page title with assertion
	 */
	async assertTitle(title: string | RegExp) {
		await expect(this.page).toHaveTitle(title);
	}
}
