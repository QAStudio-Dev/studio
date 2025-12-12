/**
 * Shared validation constants and helpers for Twilio integration
 */

/**
 * Twilio Account SID format: AC followed by 32 hexadecimal characters (case-insensitive)
 * Example: ACfade1234567890abcdef1234567890ab
 */
export const TWILIO_ACCOUNT_SID_REGEX = /^AC[a-fA-F0-9]{32}$/;

/**
 * E.164 phone number format: + followed by country code and number (1-15 digits)
 * Example: +15551234567
 */
export const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Twilio Messaging Service SID format: MG followed by 32 hexadecimal characters
 * Example: MGfade1234567890abcdef1234567890ab
 */
export const TWILIO_MESSAGING_SERVICE_SID_REGEX = /^MG[a-fA-F0-9]{32}$/;

/**
 * Validate if a string is a valid Twilio Account SID
 */
export function isValidAccountSid(sid: string): boolean {
	return TWILIO_ACCOUNT_SID_REGEX.test(sid);
}

/**
 * Validate if a string is a valid E.164 phone number
 */
export function isValidE164PhoneNumber(phone: string): boolean {
	return E164_PHONE_REGEX.test(phone);
}

/**
 * Validate if a string is a valid Messaging Service SID or HTTPS URL
 */
export function isValidMessagingUrl(url: string): boolean {
	return TWILIO_MESSAGING_SERVICE_SID_REGEX.test(url) || url.startsWith('https://');
}

/**
 * Sanitize log output to prevent log injection attacks
 * Removes newlines, carriage returns, and tabs that could be used for log injection
 */
export function sanitizeForLog(str: string): string {
	return str.replace(/[\r\n\t]/g, ' ').trim();
}
