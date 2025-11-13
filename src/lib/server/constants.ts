/**
 * Server-side constants
 * Shared configuration values used across API endpoints
 */

/**
 * Maximum file upload size in bytes (10MB)
 * Used for attachment uploads to prevent DoS attacks
 */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum file upload size in megabytes
 * For displaying user-friendly error messages
 */
export const MAX_UPLOAD_SIZE_MB = 10;

/**
 * Default pagination page size for list endpoints
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum allowed page size for pagination
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Maximum search string length
 * Prevents ReDoS attacks via extremely long search queries
 */
export const MAX_SEARCH_LENGTH = 200;
