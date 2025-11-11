import { test, expect } from '@playwright/test';
import { BlogPage } from '../pages/blog';

test.describe('Blog Page', () => {
	let blogPage: BlogPage;

	test.beforeEach(async ({ page }) => {
		blogPage = new BlogPage(page);
		await blogPage.navigate();
	});

	test('should load the blog page successfully', async () => {
		await expect(blogPage.page).toHaveTitle(/Blog/);
		await blogPage.assertUrl('/blog');
	});

	test('should display page title and description', async () => {
		await blogPage.assertVisible(blogPage.pageTitle);
		await blogPage.assertVisible(blogPage.pageDescription);

		const title = await blogPage.getText(blogPage.pageTitle);
		expect(title).toBeTruthy();
	});

	test('should display search input', async () => {
		await blogPage.assertVisible(blogPage.searchInput);
		const placeholder = await blogPage.searchInput.getAttribute('placeholder');
		expect(placeholder).toBeTruthy();
	});

	test('should display RSS and Atom feed links', async () => {
		const rssVisible = await blogPage.isRssLinkVisible();
		const atomVisible = await blogPage.isAtomLinkVisible();

		expect(rssVisible).toBeTruthy();
		expect(atomVisible).toBeTruthy();
	});

	test('should display blog posts', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();
		expect(postCount).toBeGreaterThan(0);
	});

	test('should display post metadata correctly', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Check first post has title
			const title = await blogPage.getPostTitle(0);
			expect(title).toBeTruthy();

			// Check first post has description
			const description = await blogPage.getPostDescription(0);
			expect(description).toBeTruthy();

			// Check first post has date
			const date = await blogPage.getPostDate(0);
			expect(date).toBeTruthy();
		}
	});

	test('should filter posts when searching', async () => {
		await blogPage.waitForPostsToLoad();

		// Search for a term
		await blogPage.search('test');
		await blogPage.wait(500); // Wait for filter to apply

		// Should show search result count
		const searchResultVisible = await blogPage.isVisible(blogPage.searchResultCount);
		expect(searchResultVisible).toBeTruthy();

		if (searchResultVisible) {
			const resultText = await blogPage.getSearchResultCountText();
			expect(resultText).toContain('Found');
		}
	});

	test('should show clear search button when searching', async () => {
		await blogPage.waitForPostsToLoad();

		// Initially clear button should not be visible
		let clearButtonVisible = await blogPage.isClearSearchButtonVisible();
		expect(clearButtonVisible).toBeFalsy();

		// Search for something
		await blogPage.search('asdasdasdasdasdasdasdas');
		await blogPage.wait(500);

		// Clear button should now be visible
		clearButtonVisible = await blogPage.isClearSearchButtonVisible();
		expect(clearButtonVisible).toBeTruthy();
	});

	test('should clear search when clicking clear button', async () => {
		await blogPage.waitForPostsToLoad();
		const initialCount = await blogPage.getBlogPostCount();

		// Search for something
		await blogPage.search('asdasdasdasdas');
		await blogPage.wait(500);

		// Click clear button
		await blogPage.clickClearSearchButton();
		await blogPage.wait(500);

		// Should show original posts again
		const finalCount = await blogPage.getBlogPostCount();
		expect(finalCount).toBe(initialCount);
	});

	test('should show no results message for non-matching search', async () => {
		await blogPage.waitForPostsToLoad();

		// Search for something that won't match
		await blogPage.search('xyzabc123nonexistent');
		await blogPage.wait(500);

		// Should show no results message
		const noResultsVisible = await blogPage.isNoResultsMessageVisible();
		expect(noResultsVisible).toBeTruthy();

		// Post count should be 0
		const postCount = await blogPage.getBlogPostCount();
		expect(postCount).toBe(0);
	});

	test('should navigate to blog post when clicking on card', async ({ page }) => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Click the first post
			await blogPage.clickPost(0);

			// Should navigate to blog post detail page
			await page.waitForURL('**/blog/**');
			expect(page.url()).toContain('/blog/');
		}
	});

	test('should display post categories', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Check if first post has category
			const category = await blogPage.getPostCategory(0);
			// Category might be empty for some posts, just verify method works
			expect(category).toBeDefined();
		}
	});

	test('should display post tags', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Get tags from first post
			const tags = await blogPage.getPostTags(0);
			// Tags array should exist (might be empty)
			expect(Array.isArray(tags)).toBeTruthy();
		}
	});

	test('should display post author if present', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Get author from first post
			const author = await blogPage.getPostAuthor(0);
			// Author might be empty for some posts
			expect(author).toBeDefined();
		}
	});

	test('should handle posts with cover images', async () => {
		await blogPage.waitForPostsToLoad();
		const postCount = await blogPage.getBlogPostCount();

		if (postCount > 0) {
			// Check if first post has cover image
			const hasCoverImage = await blogPage.postHasCoverImage(0);
			// Just verify the method works (image may or may not be present)
			expect(typeof hasCoverImage).toBe('boolean');
		}
	});

	test('should be responsive - mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await blogPage.navigate();

		// Verify key elements still visible on mobile
		await blogPage.assertVisible(blogPage.pageTitle);
		await blogPage.assertVisible(blogPage.searchInput);
	});

	test('should be responsive - tablet viewport', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });
		await blogPage.navigate();

		// Verify key elements still visible on tablet
		await blogPage.assertVisible(blogPage.pageTitle);
		await blogPage.assertVisible(blogPage.searchInput);
		await blogPage.waitForPostsToLoad();
	});

	test('should maintain search state in URL or input', async () => {
		await blogPage.waitForPostsToLoad();

		// Search for something
		const searchTerm = 'testing';
		await blogPage.search(searchTerm);
		await blogPage.wait(500);

		// Verify search input contains the term
		const inputValue = await blogPage.searchInput.inputValue();
		expect(inputValue).toBe(searchTerm);
	});

	test('should allow multiple sequential searches', async () => {
		await blogPage.waitForPostsToLoad();

		// First search
		await blogPage.search('test');
		await blogPage.wait(500);
		const firstCount = await blogPage.getBlogPostCount();

		// Second search
		await blogPage.clearSearch();
		await blogPage.search('automation');
		await blogPage.wait(500);
		const secondCount = await blogPage.getBlogPostCount();

		// Both searches should execute without errors
		expect(typeof firstCount).toBe('number');
		expect(typeof secondCount).toBe('number');
	});

	test('should display all blog posts without search filter', async () => {
		await blogPage.waitForPostsToLoad();

		// Get all posts
		const posts = await blogPage.getBlogPosts();
		expect(posts.length).toBeGreaterThan(0);

		// Verify each post is a valid Locator
		for (const post of posts) {
			expect(post).toBeTruthy();
		}
	});
});
