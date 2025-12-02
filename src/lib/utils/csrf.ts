/**
 * CSRF Token Utilities
 *
 * Helper functions for reading and validating CSRF tokens from cookies.
 * Used by authentication forms to protect against Cross-Site Request Forgery attacks.
 */

const CSRF_COOKIE_NAME = 'qa_studio_csrf';

/**
 * Get CSRF token from cookie
 *
 * Handles URL-encoded cookie values properly by using decodeURIComponent.
 * This prevents issues with special characters in the token.
 *
 * @returns CSRF token string or null if not found
 *
 * @example
 * ```typescript
 * const csrfToken = getCsrfToken();
 * if (!csrfToken) {
 *   console.error('CSRF token not found');
 *   return;
 * }
 * ```
 */
export function getCsrfToken(): string | null {
	if (typeof document === 'undefined') {
		// Server-side rendering - no cookies available
		return null;
	}

	try {
		// Parse cookies more robustly
		const cookies = document.cookie.split(';').reduce(
			(acc, cookie) => {
				const [key, value] = cookie.trim().split('=');
				if (key && value) {
					acc[key] = decodeURIComponent(value);
				}
				return acc;
			},
			{} as Record<string, string>
		);

		return cookies[CSRF_COOKIE_NAME] || null;
	} catch (error) {
		// Fallback to simple parsing if decoding fails
		console.warn('Failed to parse CSRF cookie, using fallback method', error);
		const cookie = document.cookie
			.split('; ')
			.find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

		return cookie ? cookie.split('=')[1] : null;
	}
}

/**
 * Check if CSRF token exists in cookies
 *
 * @returns true if token exists, false otherwise
 */
export function hasCsrfToken(): boolean {
	return getCsrfToken() !== null;
}

/**
 * Handle CSRF token errors
 *
 * If CSRF token is missing or invalid, this will reload the page
 * to get a fresh token. This should be called when receiving a 403
 * error from authentication endpoints.
 *
 * @param response - Fetch response to check for CSRF errors
 * @returns true if CSRF error was handled, false otherwise
 */
export function handleCsrfError(response: Response): boolean {
	if (response.status === 403) {
		// CSRF token invalid - reload to get new token
		console.warn('CSRF token invalid - reloading page to get new token');
		window.location.reload();
		return true;
	}
	return false;
}
