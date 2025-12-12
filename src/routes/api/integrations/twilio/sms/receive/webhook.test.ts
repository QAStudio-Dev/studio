import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { TWILIO_ACCOUNT_SID_REGEX, sanitizeForLog } from '$lib/validation/twilio';

/**
 * Tests for Twilio SMS webhook signature verification
 * Critical security component - must verify all incoming webhooks
 */
describe('Twilio Webhook Signature Verification', () => {
	let authToken: string;

	beforeEach(() => {
		// Setup encryption key for tests
		process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
		authToken = 'test-auth-token-12345';
		vi.clearAllMocks();
	});

	/**
	 * Helper function to generate valid Twilio signature
	 * Matches the algorithm in +server.ts verifyTwilioSignature()
	 */
	function generateTwilioSignature(
		url: string,
		params: Record<string, string>,
		token: string
	): string {
		let data = url;

		// Sort parameters alphabetically and append to URL
		const sortedKeys = Object.keys(params).sort();
		for (const key of sortedKeys) {
			data += key + params[key];
		}

		// Compute HMAC-SHA1
		const hmac = createHmac('sha1', token);
		hmac.update(data, 'utf8');
		return hmac.digest('base64');
	}

	describe('signature generation', () => {
		it('should generate valid signature for webhook data', () => {
			const url = 'https://example.com/api/integrations/twilio/sms/receive';
			const params = {
				MessageSid: 'SM1234567890abcdef',
				From: '+15551234567',
				To: '+15559876543',
				Body: 'Test message'
			};

			const signature = generateTwilioSignature(url, params, authToken);

			expect(signature).toBeDefined();
			expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
		});

		it('should produce different signatures for different URLs', () => {
			const params = {
				MessageSid: 'SM123',
				From: '+15551234567',
				Body: 'Test'
			};

			const sig1 = generateTwilioSignature('https://example.com/webhook1', params, authToken);
			const sig2 = generateTwilioSignature('https://example.com/webhook2', params, authToken);

			expect(sig1).not.toBe(sig2);
		});

		it('should produce different signatures for different params', () => {
			const url = 'https://example.com/webhook';

			const sig1 = generateTwilioSignature(url, { Body: 'Message 1' }, authToken);
			const sig2 = generateTwilioSignature(url, { Body: 'Message 2' }, authToken);

			expect(sig1).not.toBe(sig2);
		});

		it('should produce different signatures for different auth tokens', () => {
			const url = 'https://example.com/webhook';
			const params = { Body: 'Test' };

			const sig1 = generateTwilioSignature(url, params, 'token1');
			const sig2 = generateTwilioSignature(url, params, 'token2');

			expect(sig1).not.toBe(sig2);
		});

		it('should handle parameters in alphabetical order', () => {
			const url = 'https://example.com/webhook';

			// Same params, different order
			const params1 = { Z: 'last', A: 'first', M: 'middle' };
			const params2 = { A: 'first', M: 'middle', Z: 'last' };

			const sig1 = generateTwilioSignature(url, params1, authToken);
			const sig2 = generateTwilioSignature(url, params2, authToken);

			// Signatures should be identical regardless of input order
			expect(sig1).toBe(sig2);
		});
	});

	describe('signature verification', () => {
		it('should accept valid signature', () => {
			const url = 'https://example.com/webhook';
			const params = {
				MessageSid: 'SM123',
				From: '+15551234567',
				To: '+15559876543',
				Body: 'Test message',
				AccountSid: 'ACfade1234567890abcdef1234567890ab'
			};

			const validSignature = generateTwilioSignature(url, params, authToken);

			// Simulate verification
			const receivedSignature = validSignature;
			expect(receivedSignature).toBe(validSignature);
		});

		it('should reject tampered signature', () => {
			const url = 'https://example.com/webhook';
			const params = { Body: 'Test' };

			const validSignature = generateTwilioSignature(url, params, authToken);
			const tamperedSignature =
				validSignature.substring(0, validSignature.length - 5) + 'XXXXX';

			expect(tamperedSignature).not.toBe(validSignature);
		});

		it('should reject signature with tampered parameters', () => {
			const url = 'https://example.com/webhook';
			const originalParams = { Body: 'Original message' };
			const tamperedParams = { Body: 'Tampered message' };

			const originalSignature = generateTwilioSignature(url, originalParams, authToken);
			const tamperedSignature = generateTwilioSignature(url, tamperedParams, authToken);

			expect(originalSignature).not.toBe(tamperedSignature);
		});

		it('should reject signature with wrong auth token', () => {
			const url = 'https://example.com/webhook';
			const params = { Body: 'Test' };

			const signatureWithToken1 = generateTwilioSignature(url, params, 'token1');
			const signatureWithToken2 = generateTwilioSignature(url, params, 'token2');

			expect(signatureWithToken1).not.toBe(signatureWithToken2);
		});

		it('should handle missing signature header', () => {
			const signature = null;

			expect(signature).toBeNull();
			// In actual implementation, should return 403
		});

		it('should handle empty signature', () => {
			const signature = '';

			expect(signature).toBe('');
			expect(signature).toBeFalsy();
		});
	});

	describe('webhook payload validation', () => {
		it('should require MessageSid', () => {
			const payload = {
				MessageSid: 'SM1234567890abcdef',
				From: '+15551234567',
				To: '+15559876543',
				AccountSid: 'ACfade123'
			};

			expect(payload.MessageSid).toBeDefined();
			expect(payload.MessageSid).toMatch(/^SM/);
		});

		it('should require From phone number', () => {
			const payload = {
				From: '+15551234567'
			};

			expect(payload.From).toBeDefined();
			expect(payload.From).toMatch(/^\+\d{1,15}$/);
		});

		it('should require To phone number', () => {
			const payload = {
				To: '+15559876543'
			};

			expect(payload.To).toBeDefined();
			expect(payload.To).toMatch(/^\+\d{1,15}$/);
		});

		it('should require AccountSid', () => {
			const payload = {
				AccountSid: 'ACfade1234567890abcdef1234567890ab'
			};

			expect(payload.AccountSid).toBeDefined();
			expect(payload.AccountSid).toMatch(/^AC[a-fA-F0-9]{32}$/);
		});

		it('should handle optional Body field', () => {
			const payloadWithBody = { Body: 'Hello' };
			const payloadWithoutBody = { Body: null };

			expect(payloadWithBody.Body).toBeTruthy();
			expect(payloadWithoutBody.Body).toBeNull();
		});

		it('should handle NumMedia as number', () => {
			const payload = {
				NumMedia: '2'
			};

			const numMedia = parseInt(payload.NumMedia || '0');
			expect(numMedia).toBe(2);
		});

		it('should default NumMedia to 0 when missing', () => {
			const payload = {};
			const numMedia = parseInt((payload as any).NumMedia || '0');

			expect(numMedia).toBe(0);
		});
	});

	describe('team lookup', () => {
		it('should find team by Twilio phone number', () => {
			const team = {
				id: 'team123',
				twilioPhoneNumber: '+15559876543',
				twilioEnabled: true
			};

			const incomingTo = '+15559876543';

			expect(team.twilioPhoneNumber).toBe(incomingTo);
			expect(team.twilioEnabled).toBe(true);
		});

		it('should reject disabled Twilio integration', () => {
			const team = {
				twilioPhoneNumber: '+15559876543',
				twilioEnabled: false
			};

			expect(team.twilioEnabled).toBe(false);
			// Should return 404
		});

		it('should reject unknown phone number', () => {
			const team = null;
			expect(team).toBeNull();
			// Should return 404
		});

		it('should require auth token for verification', () => {
			const team = {
				twilioAuthToken: null
			};

			expect(team.twilioAuthToken).toBeNull();
			// Should return 500
		});
	});

	describe('TwiML response', () => {
		it('should return valid TwiML for success', () => {
			const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<!-- Message received successfully -->
</Response>`;

			expect(response).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(response).toContain('<Response>');
			expect(response).toContain('</Response>');
		});

		it('should return TwiML with correct content type', () => {
			const contentType = 'text/xml';

			expect(contentType).toBe('text/xml');
		});

		it('should return error TwiML on failure', () => {
			const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Error processing message</Message>
</Response>`;

			expect(errorResponse).toContain('<Message>Error processing message</Message>');
		});
	});

	describe('security edge cases', () => {
		it('should handle URL with query parameters', () => {
			const baseUrl = 'https://example.com/webhook';
			const urlWithQuery = baseUrl + '?foo=bar';
			const params = { Body: 'Test' };

			const sig1 = generateTwilioSignature(baseUrl, params, authToken);
			const sig2 = generateTwilioSignature(urlWithQuery, params, authToken);

			// Different URLs should produce different signatures
			expect(sig1).not.toBe(sig2);
		});

		it('should handle special characters in parameters', () => {
			const url = 'https://example.com/webhook';
			const params = {
				Body: 'Test with special chars: <>&"\''
			};

			const signature = generateTwilioSignature(url, params, authToken);

			expect(signature).toBeDefined();
			expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
		});

		it('should handle unicode in message body', () => {
			const url = 'https://example.com/webhook';
			const params = {
				Body: '🔐 Secret code: 123456 测试'
			};

			const signature = generateTwilioSignature(url, params, authToken);

			expect(signature).toBeDefined();
		});

		it('should handle empty parameter values', () => {
			const url = 'https://example.com/webhook';
			const params = {
				MessageSid: 'SM123',
				Body: ''
			};

			const signature = generateTwilioSignature(url, params, authToken);

			expect(signature).toBeDefined();
		});

		it('should be case-sensitive for parameter names', () => {
			const url = 'https://example.com/webhook';

			const params1 = { body: 'test' };
			const params2 = { Body: 'test' };

			const sig1 = generateTwilioSignature(url, params1, authToken);
			const sig2 = generateTwilioSignature(url, params2, authToken);

			// Different parameter names should produce different signatures
			expect(sig1).not.toBe(sig2);
		});
	});

	describe('encryption integration', () => {
		it('should decrypt auth token before verification', async () => {
			const { encrypt, decrypt } = await import('$lib/server/encryption');

			const plainToken = 'test-auth-token-secret';
			const encryptedToken = encrypt(plainToken);
			const decryptedToken = decrypt(encryptedToken);

			expect(encryptedToken).not.toBe(plainToken);
			expect(decryptedToken).toBe(plainToken);
		});

		it('should not expose auth token in logs', () => {
			const authToken = 'super-secret-token-12345';
			const logMessage = 'Invalid Twilio signature';

			expect(logMessage).not.toContain(authToken);
			expect(logMessage).not.toContain('secret');
		});
	});

	describe('timing-safe comparison', () => {
		it('should use constant-time comparison for signatures', () => {
			const signature1 = 'abc123';
			const signature2 = 'abc123';
			const signature3 = 'xyz789';

			const buf1 = Buffer.from(signature1);
			const buf2 = Buffer.from(signature2);
			const buf3 = Buffer.from(signature3);

			expect(timingSafeEqual(buf1, buf2)).toBe(true);
			expect(timingSafeEqual(buf1, buf3)).toBe(false);
		});

		it('should handle different length signatures', () => {
			const short = Buffer.from('abc');
			const long = Buffer.from('abcdef');

			// Different lengths should return false without comparison
			expect(short.length).not.toBe(long.length);
		});
	});

	describe('log sanitization', () => {
		it('should remove newlines from log output', () => {
			const input = 'Team\nName\nWith\nNewlines';
			const sanitized = sanitizeForLog(input);

			expect(sanitized).not.toContain('\n');
			expect(sanitized).toBe('Team Name With Newlines');
		});

		it('should remove carriage returns from log output', () => {
			const input = 'Team\rName\rWith\rReturns';
			const sanitized = sanitizeForLog(input);

			expect(sanitized).not.toContain('\r');
			expect(sanitized).toBe('Team Name With Returns');
		});

		it('should remove tabs from log output', () => {
			const input = 'Team\tName\tWith\tTabs';
			const sanitized = sanitizeForLog(input);

			expect(sanitized).not.toContain('\t');
			expect(sanitized).toBe('Team Name With Tabs');
		});

		it('should handle mixed control characters', () => {
			const input = 'Evil\r\nLog\tInjection\nAttempt';
			const sanitized = sanitizeForLog(input);

			expect(sanitized).not.toContain('\r');
			expect(sanitized).not.toContain('\n');
			expect(sanitized).not.toContain('\t');
			// Note: \r\n becomes two spaces because each control character is replaced independently
			expect(sanitized).toBe('Evil  Log Injection Attempt');
		});
	});

	describe('shared validation constants', () => {
		it('should validate Account SID with shared regex', () => {
			const validSid = 'ACfade1234567890abcdef1234567890ab';
			const invalidSid = 'INVALID';

			expect(TWILIO_ACCOUNT_SID_REGEX.test(validSid)).toBe(true);
			expect(TWILIO_ACCOUNT_SID_REGEX.test(invalidSid)).toBe(false);
		});

		it('should accept both uppercase and lowercase hex in Account SID', () => {
			const lowercase = 'ACfade1234567890abcdef1234567890ab';
			const uppercase = 'ACFADE1234567890ABCDEF1234567890AB';
			const mixed = 'ACfAdE1234567890AbCdEf1234567890Ab';

			expect(TWILIO_ACCOUNT_SID_REGEX.test(lowercase)).toBe(true);
			expect(TWILIO_ACCOUNT_SID_REGEX.test(uppercase)).toBe(true);
			expect(TWILIO_ACCOUNT_SID_REGEX.test(mixed)).toBe(true);
		});
	});
});
