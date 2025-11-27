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

		const navLinksVisible = await homePage.areNavigationLinksVisible();
		expect(navLinksVisible).toBeTruthy();
	});

	test('should navigate to sign in page when clicking Sign In', async ({ page }) => {
		await homePage.clickSignIn();
		await page.waitForURL('**/login**');
		expect(page.url()).toContain('login');
	});

	test('should display footer with company information', async () => {
		await homePage.scrollToFooter();
		await homePage.assertVisible(homePage.footer);

		const isFooterVisible = await homePage.isFooterVisible();
		expect(isFooterVisible).toBeTruthy();
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

	test('should display copyright year in footer', async () => {
		await homePage.scrollToFooter();
		const footerText = await homePage.getText(homePage.footerText.first());
		const currentYear = new Date().getFullYear().toString();
		expect(footerText).toContain(currentYear);
	});
});
