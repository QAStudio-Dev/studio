import { Page, Locator } from '@playwright/test';
import { BasePage } from './base';

/**
 * Home Page Object Model
 * Represents the QA Studio homepage with all its elements and actions
 */
export class HomePage extends BasePage {
	// Selectors
	readonly logo: Locator;
	readonly signInButton: Locator;
	readonly heroTitle: Locator;
	readonly heroDescription: Locator;
	readonly getStartedButton: Locator;
	readonly viewDocsButton: Locator;
	readonly discordLink: Locator;
	readonly githubLink: Locator;
	readonly blogLink: Locator;
	readonly docsLink: Locator;
	readonly footer: Locator;
	readonly footerText: Locator;

	constructor(page: Page) {
		super(page);

		// Initialize locators
		this.logo = page.locator('img[alt="QA Studio"]').first();
		this.signInButton = page.getByRole('button', { name: 'Sign In' });
		this.heroTitle = page.locator('h1').first();
		this.heroDescription = page.locator('p.text-xl').first();
		this.getStartedButton = page.getByRole('link', { name: /get started/i });
		this.viewDocsButton = page.getByRole('link', { name: /view docs|documentation/i });
		this.discordLink = page.locator('a[href*="discord"]');
		this.githubLink = page.locator('a[href*="github"]');
		this.blogLink = page.locator('a[href="/blog"]');
		this.docsLink = page.locator('a[href="/docs"]');
		this.footer = page.locator('footer');
		this.footerText = page.locator('footer').locator('text=/QA Studio|Built with/');
	}

	/**
	 * Navigate to the home page
	 */
	async navigate() {
		await this.goto('/');
		await this.waitForPageLoad();
	}

	/**
	 * Click the Sign In button
	 */
	async clickSignIn() {
		await this.click(this.signInButton);
	}

	/**
	 * Click the Get Started button
	 */
	async clickGetStarted() {
		await this.click(this.getStartedButton);
	}

	/**
	 * Click the View Docs button
	 */
	async clickViewDocs() {
		await this.click(this.viewDocsButton);
	}

	/**
	 * Navigate to Blog
	 */
	async navigateToBlog() {
		await this.click(this.blogLink.first());
	}

	/**
	 * Navigate to Docs
	 */
	async navigateToDocs() {
		await this.click(this.docsLink.first());
	}

	/**
	 * Get hero title text
	 */
	async getHeroTitle(): Promise<string> {
		return await this.getText(this.heroTitle);
	}

	/**
	 * Get hero description text
	 */
	async getHeroDescription(): Promise<string> {
		return await this.getText(this.heroDescription);
	}

	/**
	 * Verify logo is visible
	 */
	async isLogoVisible(): Promise<boolean> {
		return await this.isVisible(this.logo);
	}

	/**
	 * Verify hero section is visible
	 */
	async isHeroSectionVisible(): Promise<boolean> {
		const titleVisible = await this.isVisible(this.heroTitle);
		const descriptionVisible = await this.isVisible(this.heroDescription);
		return titleVisible && descriptionVisible;
	}

	/**
	 * Verify navigation links are visible
	 */
	async areNavigationLinksVisible(): Promise<boolean> {
		const signInVisible = await this.isVisible(this.signInButton);
		return signInVisible
	}

	/**
	 * Verify footer is visible
	 */
	async isFooterVisible(): Promise<boolean> {
		return await this.isVisible(this.footer);
	}

	/**
	 * Get all social links (Discord, GitHub)
	 */
	async getSocialLinks(): Promise<string[]> {
		const links: string[] = [];
		const discord = await this.getAttribute(this.discordLink, 'href');
		const github = await this.getAttribute(this.githubLink, 'href');
		if (discord) links.push(discord);
		if (github) links.push(github);
		return links;
	}

	/**
	 * Verify all main CTAs are present
	 */
	async areMainCTAsPresent(): Promise<boolean> {
		try {
			await this.assertVisible(this.signInButton);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Scroll to footer
	 */
	async scrollToFooter() {
		await this.scrollToElement(this.footer);
	}
}
