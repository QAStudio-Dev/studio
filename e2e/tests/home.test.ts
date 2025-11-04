import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home';

test.describe('Home Page', () => {
	let homePage: HomePage;

	test.beforeEach(async ({ page }) => {
		homePage = new HomePage(page);
		await homePage.navigate();
	});

	test('should load the home page successfully', async () => {
		await expect(homePage.page).toHaveTitle(/QA Studio/);
		await homePage.assertUrl('/');
	});

	test('should display the logo', async () => {
		await homePage.assertVisible(homePage.logo);
		const isVisible = await homePage.isLogoVisible();
		expect(isVisible).toBeTruthy();
	});

	test('should display hero section with title and description', async () => {
		await homePage.assertVisible(homePage.heroTitle);
		await homePage.assertVisible(homePage.heroDescription);

		const isHeroVisible = await homePage.isHeroSectionVisible();
		expect(isHeroVisible).toBeTruthy();
	});

	test('should display navigation buttons', async () => {
		await homePage.assertVisible(homePage.signInButton);
		await homePage.assertVisible(homePage.signUpButton);

		const navLinksVisible = await homePage.areNavigationLinksVisible();
		expect(navLinksVisible).toBeTruthy();
	});

	test('should navigate to sign in page when clicking Sign In', async ({ page }) => {
		await homePage.clickSignIn();
		await page.waitForURL('**/sign-in**');
		expect(page.url()).toContain('sign-in');
	});

	test('should navigate to sign up page when clicking Sign Up', async ({ page }) => {
		await homePage.clickSignUp();
		await page.waitForURL('**/sign-up**');
		expect(page.url()).toContain('sign-up');
	});

	test('should display footer with company information', async () => {
		await homePage.scrollToFooter();
		await homePage.assertVisible(homePage.footer);

		const isFooterVisible = await homePage.isFooterVisible();
		expect(isFooterVisible).toBeTruthy();
	});

	test('should have working social links', async () => {
		const socialLinks = await homePage.getSocialLinks();
		expect(socialLinks.length).toBeGreaterThan(0);

		// Verify Discord link exists and is correct
		await homePage.assertVisible(homePage.discordLink);
		const discordHref = await homePage.getAttribute(homePage.discordLink, 'href');
		expect(discordHref).toContain('discord');

		// Verify GitHub link exists and is correct
		await homePage.assertVisible(homePage.githubLink);
		const githubHref = await homePage.getAttribute(homePage.githubLink, 'href');
		expect(githubHref).toContain('github');
	});

	test('should navigate to docs page', async ({ page }) => {
		await homePage.navigateToDocs();
		await page.waitForURL('**/docs**');
		expect(page.url()).toContain('/docs');
	});

	test('should navigate to blog page', async ({ page }) => {
		await homePage.navigateToBlog();
		await page.waitForURL('**/blog**');
		expect(page.url()).toContain('/blog');
	});

	test('should have all main CTAs present', async () => {
		const ctasPresent = await homePage.areMainCTAsPresent();
		expect(ctasPresent).toBeTruthy();
	});

	test('should be responsive - mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await homePage.navigate();

		// Verify key elements still visible on mobile
		await homePage.assertVisible(homePage.logo);
		await homePage.assertVisible(homePage.heroTitle);
	});

	test('should be responsive - tablet viewport', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });
		await homePage.navigate();

		// Verify key elements still visible on tablet
		await homePage.assertVisible(homePage.logo);
		await homePage.assertVisible(homePage.heroTitle);
		await homePage.assertVisible(homePage.signInButton);
	});

	test('should load without console errors', async ({ page }) => {
		const consoleErrors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});

		await homePage.navigate();

		// Allow some time for any async errors to appear
		await page.waitForTimeout(2000);

		// Filter out known acceptable errors (if any)
		const criticalErrors = consoleErrors.filter(
			(error) => !error.includes('favicon') // Ignore favicon errors
		);

		expect(criticalErrors).toHaveLength(0);
	});

	test('should have valid external links', async () => {
		// Check that social links are valid URLs
		const discordHref = await homePage.getAttribute(homePage.discordLink, 'href');
		const githubHref = await homePage.getAttribute(homePage.githubLink, 'href');

		expect(discordHref).toMatch(/^https?:\/\//);
		expect(githubHref).toMatch(/^https?:\/\//);
	});

	test('should display copyright year in footer', async () => {
		await homePage.scrollToFooter();
		const footerText = await homePage.getText(homePage.footerText);
		const currentYear = new Date().getFullYear().toString();
		expect(footerText).toContain(currentYear);
	});
});
