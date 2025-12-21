/**
 * Type definitions for page-specific meta tags
 */

/**
 * Page-specific meta tags that get merged with base meta tags
 * in the layout component
 */
export interface PageMetaTags {
	/** Page title (will be used with titleTemplate: "%s | QA Studio") */
	title: string;
	/** Page meta description (150-160 characters recommended for SEO) */
	description: string;
	/** Optional canonical URL override (defaults to current page URL) */
	canonical?: string;
	/** Optional OpenGraph overrides for social sharing */
	openGraph?: {
		title?: string;
		description?: string;
		images?: Array<{
			url: string;
			alt?: string;
			width?: number;
			height?: number;
		}>;
	};
}
