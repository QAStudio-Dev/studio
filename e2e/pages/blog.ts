import { Page, Locator } from '@playwright/test';
import { BasePage } from './base';

/**
 * Page Object for the Blog listing page
 */
export class BlogPage extends BasePage {
	// Page elements
	readonly pageTitle: Locator;
	readonly pageDescription: Locator;
	readonly searchInput: Locator;
	readonly searchResultCount: Locator;
	readonly clearSearchButton: Locator;
	readonly rssLink: Locator;
	readonly atomLink: Locator;
	readonly blogPosts: Locator;
	readonly noPostsMessage: Locator;
	readonly noResultsMessage: Locator;

	constructor(page: Page) {
		super(page);
		this.pageTitle = page.locator('h1');
		this.pageDescription = page.locator('p.text-surface-600-400').first();
		this.searchInput = page.locator('input[type="text"]');
		this.searchResultCount = page.locator('text=/Found \\d+ posts?/');
		this.clearSearchButton = page.locator('button:has-text("Clear search")');
		this.rssLink = page.locator('a[href="/rss.xml"]');
		this.atomLink = page.locator('a[href="/atom.xml"]');
		this.blogPosts = page.locator('.card');
		this.noPostsMessage = page.locator('text=No blog posts yet');
		this.noResultsMessage = page.locator('text=/No posts found matching/');
	}

	/**
	 * Navigate to the blog page
	 */
	async navigate() {
		await this.goto('/blog');
		await this.waitForPageLoad();
	}

	/**
	 * Search for blog posts
	 */
	async search(query: string) {
		await this.fill(this.searchInput, query);
		// Wait a bit for the reactive filter to apply
		await this.wait(100);
	}

	/**
	 * Clear the search input
	 */
	async clearSearch() {
		await this.fill(this.searchInput, '');
	}

	/**
	 * Click the clear search button
	 */
	async clickClearSearchButton() {
		await this.click(this.clearSearchButton);
	}

	/**
	 * Get all blog post cards
	 */
	async getBlogPosts(): Promise<Locator[]> {
		const count = await this.getElementCount(this.blogPosts);
		const posts: Locator[] = [];
		for (let i = 0; i < count; i++) {
			posts.push(this.blogPosts.nth(i));
		}
		return posts;
	}

	/**
	 * Get the count of visible blog posts
	 */
	async getBlogPostCount(): Promise<number> {
		return await this.getElementCount(this.blogPosts);
	}

	/**
	 * Get a specific blog post by index
	 */
	getPostByIndex(index: number): Locator {
		return this.blogPosts.nth(index);
	}

	/**
	 * Get post title by index
	 */
	async getPostTitle(index: number): Promise<string> {
		const post = this.getPostByIndex(index);
		return await this.getText(post.locator('h2'));
	}

	/**
	 * Get post description by index
	 */
	async getPostDescription(index: number): Promise<string> {
		const post = this.getPostByIndex(index);
		return await this.getText(post.locator('p.line-clamp-2'));
	}

	/**
	 * Get post category by index
	 */
	async getPostCategory(index: number): Promise<string> {
		const post = this.getPostByIndex(index);
		const categoryBadge = post.locator('.bg-primary-500\\/10');
		if (await categoryBadge.isVisible()) {
			return await this.getText(categoryBadge);
		}
		return '';
	}

	/**
	 * Get post date by index
	 */
	async getPostDate(index: number): Promise<string> {
		const post = this.getPostByIndex(index);
		const dateElement = post.locator('svg.lucide-calendar').locator('..').locator('span');
		return await this.getText(dateElement);
	}

	/**
	 * Get post author by index
	 */
	async getPostAuthor(index: number): Promise<string> {
		const post = this.getPostByIndex(index);
		const authorElement = post.locator('svg.lucide-user').locator('..').locator('span');
		if (await authorElement.isVisible()) {
			return await this.getText(authorElement);
		}
		return '';
	}

	/**
	 * Get post tags by index
	 */
	async getPostTags(index: number): Promise<string[]> {
		const post = this.getPostByIndex(index);
		const tagElements = post.locator('.bg-surface-200-800');
		const count = await tagElements.count();
		const tags: string[] = [];
		for (let i = 0; i < count; i++) {
			const tagText = await this.getText(tagElements.nth(i));
			tags.push(tagText.trim());
		}
		return tags;
	}

	/**
	 * Click on a blog post by index
	 */
	async clickPost(index: number) {
		await this.click(this.getPostByIndex(index));
	}

	/**
	 * Check if post has cover image
	 */
	async postHasCoverImage(index: number): Promise<boolean> {
		const post = this.getPostByIndex(index);
		const coverImage = post.locator('img');
		return await coverImage.isVisible();
	}

	/**
	 * Get the search result count text
	 */
	async getSearchResultCountText(): Promise<string> {
		return await this.getText(this.searchResultCount);
	}

	/**
	 * Check if RSS link is visible
	 */
	async isRssLinkVisible(): Promise<boolean> {
		return await this.isVisible(this.rssLink);
	}

	/**
	 * Check if Atom link is visible
	 */
	async isAtomLinkVisible(): Promise<boolean> {
		return await this.isVisible(this.atomLink);
	}

	/**
	 * Click RSS link
	 */
	async clickRssLink() {
		await this.click(this.rssLink);
	}

	/**
	 * Click Atom link
	 */
	async clickAtomLink() {
		await this.click(this.atomLink);
	}

	/**
	 * Wait for blog posts to load
	 */
	async waitForPostsToLoad() {
		await this.waitForElement(this.blogPosts.first());
	}

	/**
	 * Check if no results message is visible
	 */
	async isNoResultsMessageVisible(): Promise<boolean> {
		return await this.isVisible(this.noResultsMessage);
	}

	/**
	 * Check if clear search button is visible
	 */
	async isClearSearchButtonVisible(): Promise<boolean> {
		return await this.isVisible(this.clearSearchButton);
	}
}
