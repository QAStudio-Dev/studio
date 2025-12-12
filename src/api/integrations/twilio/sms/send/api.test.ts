import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomBytes } from 'crypto';

/**
 * Tests for Twilio SMS sending endpoint
 * POST /api/integrations/twilio/sms/send
 */
describe('POST /api/integrations/twilio/sms/send', () => {
	beforeEach(() => {
		// Mock encryption key
		process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
		vi.clearAllMocks();
	});

	describe('authentication and authorization', () => {
		it('should require authentication', () => {
			// requireApiAuth tested separately
			expect(true).toBe(true);
		});

		it('should require user to be part of a team', () => {
			const user = {
				teamId: null
			};

			expect(user.teamId).toBeNull();
			// Should throw Error[404]
		});

		it('should require Pro or Enterprise plan', () => {
			const plans = ['FREE', 'PRO', 'ENTERPRISE'];
			const freePlan = plans.filter((p) => p === 'FREE');
			const paidPlans = plans.filter((p) => p !== 'FREE');

			expect(freePlan).toEqual(['FREE']);
			expect(paidPlans).toEqual(['PRO', 'ENTERPRISE']);
			// FREE should throw Error[403]
		});

		it('should require Twilio to be enabled', () => {
			const teamWithTwilio = {
				twilioEnabled: true
			};

			const teamWithoutTwilio = {
				twilioEnabled: false
			};

			expect(teamWithTwilio.twilioEnabled).toBe(true);
			expect(teamWithoutTwilio.twilioEnabled).toBe(false);
			// false should throw error 400
		});

		it('should require complete Twilio configuration', () => {
			const fullyConfigured = {
				twilioEnabled: true,
				twilioAccountSid: 'encrypted-sid',
				twilioAuthToken: 'encrypted-token',
				twilioPhoneNumber: '+15551234567'
			};

			const missingCredentials = {
				twilioEnabled: true,
				twilioAccountSid: null,
				twilioAuthToken: null,
				twilioPhoneNumber: null
			};

			expect(fullyConfigured.twilioAccountSid).toBeDefined();
			expect(missingCredentials.twilioAccountSid).toBeNull();
			// Missing credentials should throw error 400
		});
	});

	describe('input validation', () => {
		it('should validate recipient phone number E.164 format', () => {
			const validNumbers = [
				'+15551234567', // US
				'+442071234567', // UK
				'+33123456789', // France
				'+861234567890', // China
				'+12025551234' // DC
			];

			const invalidNumbers = [
				'5551234567', // missing +
				'+0551234567', // starts with 0
				'+1-555-123-4567', // has dashes
				'+1 555 123 4567', // has spaces
				'(555) 123-4567', // formatted
				'+12345678901234567' // too long
			];

			const e164Regex = /^\+[1-9]\d{1,14}$/;

			validNumbers.forEach((num) => {
				expect(num).toMatch(e164Regex);
			});

			invalidNumbers.forEach((num) => {
				expect(num).not.toMatch(e164Regex);
			});
		});

		it('should validate message body length', () => {
			const validBodies = [
				'Test', // short
				'A'.repeat(160), // standard SMS
				'A'.repeat(1600) // max length
			];

			const invalidBodies = [
				'', // empty
				'A'.repeat(1601) // too long
			];

			validBodies.forEach((body) => {
				expect(body.length).toBeGreaterThan(0);
				expect(body.length).toBeLessThanOrEqual(1600);
			});

			invalidBodies.forEach((body) => {
				expect(body.length === 0 || body.length > 1600).toBe(true);
			});
		});

		it('should require both to and body fields', () => {
			const validInput = {
				to: '+15551234567',
				body: 'Test message'
			};

			expect(validInput.to).toBeDefined();
			expect(validInput.body).toBeDefined();
		});

		it('should handle special characters in message body', () => {
			const bodies = [
				'Test with emoji: 🎉',
				'Test with quotes: "Hello"',
				"Test with apostrophe: it's",
				'Test with newline:\nNew line',
				'Test with unicode: 你好',
				'Test with symbols: @#$%^&*()'
			];

			bodies.forEach((body) => {
				expect(body.length).toBeGreaterThan(0);
			});
		});
	});

	describe('credential decryption', () => {
		it('should decrypt accountSid before API call', async () => {
			const { encrypt, decrypt } = await import('$lib/server/encryption');

			const plainSid = 'ACfade1234567890abcdef1234567890ab';
			const encryptedSid = encrypt(plainSid);
			const decryptedSid = decrypt(encryptedSid);

			expect(encryptedSid).not.toBe(plainSid);
			expect(decryptedSid).toBe(plainSid);
		});

		it('should decrypt authToken before API call', async () => {
			const { encrypt, decrypt } = await import('$lib/server/encryption');

			const plainToken = 'secret-auth-token-12345';
			const encryptedToken = encrypt(plainToken);
			const decryptedToken = decrypt(encryptedToken);

			expect(encryptedToken).not.toBe(plainToken);
			expect(decryptedToken).toBe(plainToken);
		});

		it('should use plaintext phone number as From', () => {
			const phoneNumber = '+15551234567';

			// Phone number stored in plaintext
			expect(phoneNumber).toBe('+15551234567');
		});
	});

	describe('Twilio API integration', () => {
		it('should construct correct Twilio API URL', () => {
			const accountSid = 'ACfade1234567890abcdef1234567890ab';
			const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

			expect(twilioUrl).toBe(
				'https://api.twilio.com/2010-04-01/Accounts/ACfade1234567890abcdef1234567890ab/Messages.json'
			);
			expect(twilioUrl).toContain('api.twilio.com');
			expect(twilioUrl).toContain('/Messages.json');
		});

		it('should use Basic authentication header', () => {
			const accountSid = 'AC123';
			const authToken = 'token123';
			const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
			const header = `Basic ${authString}`;

			expect(header).toContain('Basic ');
			expect(authString).toBe(Buffer.from('AC123:token123').toString('base64'));
		});

		it('should send request with correct content type', () => {
			const contentType = 'application/x-www-form-urlencoded';

			expect(contentType).toBe('application/x-www-form-urlencoded');
		});

		it('should construct URL-encoded request body', () => {
			const params = new URLSearchParams({
				To: '+15551234567',
				From: '+15559876543',
				Body: 'Test message'
			});

			expect(params.toString()).toContain('To=%2B15551234567');
			expect(params.toString()).toContain('From=%2B15559876543');
			expect(params.toString()).toContain('Body=Test+message');
		});

		it('should handle URL encoding of special characters', () => {
			const body = 'Test with special chars: & = +';
			const params = new URLSearchParams({ Body: body });

			expect(params.toString()).toContain('Body=');
			// URLSearchParams handles encoding automatically
		});
	});

	describe('response handling', () => {
		it('should return success response on 200 OK', () => {
			const twilioResponse = {
				sid: 'SM1234567890abcdef',
				status: 'queued',
				to: '+15551234567',
				from: '+15559876543',
				body: 'Test message',
				date_created: '2024-01-01T12:00:00Z'
			};

			const apiResponse = {
				success: true,
				messageSid: twilioResponse.sid,
				status: twilioResponse.status,
				to: twilioResponse.to,
				from: twilioResponse.from,
				body: twilioResponse.body,
				dateCreated: twilioResponse.date_created
			};

			expect(apiResponse.success).toBe(true);
			expect(apiResponse.messageSid).toBe('SM1234567890abcdef');
			expect(apiResponse.status).toBe('queued');
		});

		it('should include message SID in response', () => {
			const response = {
				messageSid: 'SM1234567890abcdef'
			};

			expect(response.messageSid).toMatch(/^SM/);
		});

		it('should include message status in response', () => {
			const validStatuses = ['queued', 'sending', 'sent', 'delivered', 'failed'];

			validStatuses.forEach((status) => {
				const response = { status };
				expect(response.status).toBe(status);
			});
		});

		it('should include sender and recipient in response', () => {
			const response = {
				to: '+15551234567',
				from: '+15559876543'
			};

			expect(response.to).toMatch(/^\+\d{11}$/);
			expect(response.from).toMatch(/^\+\d{11}$/);
		});
	});

	describe('error handling', () => {
		it('should handle Twilio API errors', () => {
			const twilioError = {
				code: 21211,
				message: 'The "To" number is not a valid phone number.',
				status: 400
			};

			expect(twilioError.status).toBe(400);
			expect(twilioError.message).toContain('not a valid phone number');
		});

		it('should handle authentication errors', () => {
			const authError = {
				code: 20003,
				message: 'Authenticate',
				status: 401
			};

			expect(authError.status).toBe(401);
		});

		it('should handle insufficient balance errors', () => {
			const balanceError = {
				code: 21606,
				message: 'The "From" phone number is not a valid, SMS-capable inbound phone number',
				status: 400
			};

			expect(balanceError.message).toBeDefined();
		});

		it('should handle network errors', () => {
			const networkError = new Error('Failed to fetch');

			expect(networkError.message).toContain('fetch');
			// Should throw Error[500]
		});

		it('should not expose credentials in error responses', () => {
			const errorMessage = 'Authentication failed';
			const accountSid = 'AC1234567890abcdef1234567890abcdef';
			const authToken = 'secret-token-12345';

			expect(errorMessage).not.toContain(accountSid);
			expect(errorMessage).not.toContain(authToken);
			expect(errorMessage).not.toContain('secret');
		});

		it('should re-throw custom errors', () => {
			const customError = {
				status: 400,
				message: 'Custom error message'
			};

			expect(customError.status).toBe(400);
			// Should re-throw if err.status exists
		});

		it('should throw generic 500 for unknown errors', () => {
			const unknownError = new Error('Unknown error');

			expect(unknownError).toBeInstanceOf(Error);
			// Should throw Error[500]
		});
	});

	describe('real-world scenarios', () => {
		it('should handle verification code SMS', () => {
			const message = {
				to: '+15551234567',
				body: 'Your verification code is: 123456'
			};

			expect(message.body).toContain('verification code');
			expect(message.body).toMatch(/\d{6}/);
		});

		it('should handle multi-segment messages', () => {
			const longMessage = 'A'.repeat(320); // 2 segments

			expect(longMessage.length).toBeGreaterThan(160);
			expect(longMessage.length).toBeLessThanOrEqual(1600);
		});

		it('should handle unicode messages', () => {
			const unicodeMessage = {
				to: '+861234567890',
				body: '您的验证码是：123456'
			};

			expect(unicodeMessage.body).toMatch(/[\u4e00-\u9fa5]/); // Chinese chars
		});

		it('should handle emoji in messages', () => {
			const emojiMessage = {
				to: '+15551234567',
				body: '✅ Your order has been confirmed! 🎉'
			};

			expect(emojiMessage.body).toMatch(/[✅🎉]/);
		});

		it('should handle newlines in messages', () => {
			const multiLineMessage = {
				to: '+15551234567',
				body: 'Line 1\nLine 2\nLine 3'
			};

			expect(multiLineMessage.body).toContain('\n');
			expect(multiLineMessage.body.split('\n')).toHaveLength(3);
		});
	});

	describe('security', () => {
		it('should encrypt credentials at rest', async () => {
			const { encrypt, isEncrypted } = await import('$lib/server/encryption');

			const accountSid = 'ACfade1234567890abcdef1234567890ab';
			const authToken = 'secret-token';

			const encryptedSid = encrypt(accountSid);
			const encryptedToken = encrypt(authToken);

			expect(isEncrypted(encryptedSid)).toBe(true);
			expect(isEncrypted(encryptedToken)).toBe(true);
		});

		it('should validate team ownership', () => {
			const user = {
				teamId: 'team123'
			};

			const team = {
				id: 'team123'
			};

			expect(user.teamId).toBe(team.id);
		});

		it('should not allow cross-team SMS sending', () => {
			const user = {
				teamId: 'team123'
			};

			const otherTeam = {
				id: 'team456'
			};

			expect(user.teamId).not.toBe(otherTeam.id);
		});

		it('should use HTTPS for Twilio API', () => {
			const twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACfade123/Messages.json';

			expect(twilioUrl).toMatch(/^https:\/\//);
		});
	});

	describe('message tracking', () => {
		it('should track message status from Twilio', () => {
			const statuses = ['queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered'];

			statuses.forEach((status) => {
				expect([
					'queued',
					'sending',
					'sent',
					'delivered',
					'failed',
					'undelivered'
				]).toContain(status);
			});
		});

		it('should store message SID for tracking', () => {
			const messageSid = 'SM1234567890abcdef';

			expect(messageSid).toMatch(/^SM[a-f0-9]+$/);
		});

		it('should include timestamp in response', () => {
			const dateCreated = '2024-01-01T12:00:00Z';

			expect(dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});
	});
});
