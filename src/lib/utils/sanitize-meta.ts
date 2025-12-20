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
			// Only match actual HTML tags (letters after < and before >)
			.replace(/<\/?[a-zA-Z][^>]*>/g, '')
			// Remove control characters (but keep tab and newline for now)
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
			// Remove zero-width characters
			.replace(/[\u200B-\u200D\uFEFF]/g, '')
			// Normalize whitespace (convert tabs, newlines, multiple spaces to single space)
			.replace(/\s+/g, ' ')
			.trim()
	);
}
