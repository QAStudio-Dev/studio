/**
 * Sanitize text content for use in HTML meta tags
 * Defense in depth: While svelte-meta-tags handles escaping,
 * this provides an additional layer of protection for user-generated content
 */
export function sanitizeForMeta(text: string | null | undefined): string {
	if (!text) return '';

	return (
		text
			// Remove any HTML tags
			.replace(/<[^>]*>/g, '')
			// Escape HTML entities
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')
			// Remove control characters and zero-width characters
			.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '')
			// Normalize whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
}
