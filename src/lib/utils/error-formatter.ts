/**
 * Utility functions for cleaning and formatting error messages and stack traces
 */

/**
 * Remove ANSI escape codes from a string
 * ANSI codes are used for terminal colors and formatting like [2m, [31m, etc.
 */
export function removeAnsiCodes(text: string): string {
	if (!text) return text;

	// Remove ANSI escape sequences
	// Matches patterns like:
	// - \x1b[0m, \x1b[31m (hex escape sequences)
	// - \u001b[0m, \u001b[31m (unicode escape sequences)
	// - [0m, [31m, [2m (bracket sequences)
	return text
		.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // Hex escape codes
		.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '') // Unicode escape codes
		.replace(/\[\d+m/g, '') // Bracket codes like [2m, [31m
		.replace(/\[[\d;]+m/g, ''); // Multi-digit bracket codes like [0;31m
}

/**
 * Remove excessive newlines and normalize whitespace
 */
export function normalizeWhitespace(text: string): string {
	if (!text) return text;

	return text
		.replace(/\r\n/g, '\n') // Normalize line endings
		.replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
		.trim();
}

/**
 * Remove terminal control characters and other non-printable characters
 */
export function removeControlCharacters(text: string): string {
	if (!text) return text;

	// Remove control characters except newline (\n), tab (\t), and carriage return (\r)
	return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Clean error message by removing ANSI codes, control characters, and normalizing whitespace
 */
export function cleanErrorMessage(errorMessage: string | null | undefined): string {
	if (!errorMessage) return '';

	let cleaned = errorMessage;
	cleaned = removeAnsiCodes(cleaned);
	cleaned = removeControlCharacters(cleaned);
	cleaned = normalizeWhitespace(cleaned);

	return cleaned;
}

/**
 * Clean stack trace by removing ANSI codes, control characters, and normalizing whitespace
 * Also removes duplicate stack frames and cleans up formatting
 */
export function cleanStackTrace(stackTrace: string | null | undefined): string {
	if (!stackTrace) return '';

	let cleaned = stackTrace;
	cleaned = removeAnsiCodes(cleaned);
	cleaned = removeControlCharacters(cleaned);

	// Split into lines for processing
	const lines = cleaned.split('\n');
	const uniqueLines: string[] = [];
	const seenLines = new Set<string>();

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip empty lines at the beginning
		if (uniqueLines.length === 0 && !trimmedLine) {
			continue;
		}

		// Remove duplicate consecutive lines
		if (!seenLines.has(trimmedLine)) {
			uniqueLines.push(line);
			seenLines.add(trimmedLine);
		}
	}

	// Join back and normalize whitespace
	cleaned = uniqueLines.join('\n');
	cleaned = normalizeWhitespace(cleaned);

	return cleaned;
}

/**
 * Format error details for display
 */
export function formatErrorDetails(error: {
	errorMessage?: string | null;
	stackTrace?: string | null;
}): {
	errorMessage: string;
	stackTrace: string;
} {
	return {
		errorMessage: cleanErrorMessage(error.errorMessage),
		stackTrace: cleanStackTrace(error.stackTrace)
	};
}

/**
 * Truncate error message to a specific length (useful for previews)
 */
export function truncateError(
	errorMessage: string,
	maxLength: number = 200
): { truncated: string; isTruncated: boolean } {
	if (!errorMessage) return { truncated: '', isTruncated: false };

	const cleaned = cleanErrorMessage(errorMessage);

	if (cleaned.length <= maxLength) {
		return { truncated: cleaned, isTruncated: false };
	}

	return {
		truncated: cleaned.substring(0, maxLength) + '...',
		isTruncated: true
	};
}

/**
 * Detect if an error is a timeout error
 */
export function isTimeoutError(errorMessage: string | null | undefined): boolean {
	if (!errorMessage) return false;

	const message = errorMessage.toLowerCase();
	return (
		message.includes('timeout') &&
		(message.includes('exceeded') ||
			message.includes('ms') ||
			message.includes('timed out') ||
			message.includes('test timeout'))
	);
}

/**
 * Extract timeout duration from error message if available
 */
export function extractTimeoutDuration(errorMessage: string | null | undefined): number | null {
	if (!errorMessage) return null;

	// Match patterns like "Test timeout of 30000ms exceeded" or "Timeout of 5000ms"
	const match = errorMessage.match(/timeout\s+of\s+(\d+)\s*ms/i);
	if (match && match[1]) {
		return parseInt(match[1], 10);
	}

	return null;
}
