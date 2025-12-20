/**
 * Sanitize user-provided content for use in meta tags to prevent XSS attacks
 *
 * Escapes HTML special characters that could be used for injection:
 * - < becomes &lt;
 * - > becomes &gt;
 * - & becomes &amp;
 * - " becomes &quot;
 * - ' becomes &#x27;
 *
 * @param input - User-provided string to sanitize
 * @returns Sanitized string safe for meta tag content
 */
export function sanitizeMetaContent(input: string | null | undefined): string {
	if (!input) return '';

	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

/**
 * Generate page meta tags with sanitized user content
 *
 * @param title - Page title (will be sanitized)
 * @param description - Page description (will be sanitized)
 * @returns Meta tags object for svelte-meta-tags
 */
export function generatePageMetaTags(title: string, description: string) {
	return {
		title: sanitizeMetaContent(title),
		description: sanitizeMetaContent(description)
	};
}
