/**
 * Sanitize text content for use in HTML meta tags
 *
 * Defense in depth approach:
 * - Removes potentially dangerous content (HTML tags, control characters)
 * - Does NOT escape HTML entities (svelte-meta-tags handles that)
 * - Normalizes whitespace for cleaner meta descriptions
 *
 * Note: svelte-meta-tags automatically escapes HTML entities, so we only
 * need to remove problematic content, not escape it.
 */
export function sanitizeForMeta(text: string | null | undefined): string {
	if (!text) return '';

	return (
		text
			// Remove any HTML tags (strip tags, don't escape)
			.replace(/<[^>]*>/g, '')
			// Remove control characters and zero-width characters
			.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '')
			// Remove newlines and normalize whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
}
