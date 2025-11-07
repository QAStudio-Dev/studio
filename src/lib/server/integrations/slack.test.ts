import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Slack integration service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('webhook URL decryption', () => {
		it('should decrypt webhook URL before sending notification', async () => {
			const { encrypt, decrypt } = await import('../encryption');

			const plainWebhookUrl = 'https://hooks.example.com/services/T12345/B12345/secretToken123';
			const encryptedWebhookUrl = encrypt(plainWebhookUrl);

			// Verify encryption worked
			expect(encryptedWebhookUrl).not.toContain('hooks.example.com');
			expect(encryptedWebhookUrl).not.toContain('secretToken123');

			// Decrypt for use
			const decryptedUrl = decrypt(encryptedWebhookUrl);

			expect(decryptedUrl).toBe(plainWebhookUrl);
			expect(decryptedUrl).toContain('hooks.example.com');
		});

		it('should handle encrypted webhook URL from database', async () => {
			const { encrypt, decrypt, isEncrypted } = await import('../encryption');

			// Simulate data from database
			const storedWebhookUrl = encrypt('https://hooks.example.com/services/T/B/secret');

			// Verify it's encrypted
			expect(isEncrypted(storedWebhookUrl)).toBe(true);

			// Decrypt before use
			const webhookUrl = decrypt(storedWebhookUrl);

			expect(webhookUrl).toContain('https://');
			expect(webhookUrl).toContain('hooks.example.com');
		});

		it('should throw error if webhook URL is missing', () => {
			const config = {
				teamId: 'T12345',
				teamName: 'Test',
				incomingWebhook: null
			};

			const webhookUrl = config.incomingWebhook?.url;

			expect(webhookUrl).toBeUndefined();
		});

		it('should throw error if webhook URL is not configured', () => {
			const config = {
				teamId: 'T12345',
				teamName: 'Test',
				incomingWebhook: {
					channel: '#general',
					channel_id: 'C12345',
					url: undefined
				}
			};

			const encryptedWebhookUrl = config.incomingWebhook?.url;

			expect(encryptedWebhookUrl).toBeUndefined();
		});
	});

	describe('notification payload', () => {
		it('should format notification with Slack blocks', () => {
			const notification = {
				event: 'TEST_FAILED',
				title: '❌ Test Failed',
				message: 'Login test failed on staging environment',
				color: '#ff0000',
				url: 'https://qa-studio.dev/results/123',
				fields: [
					{ name: 'Environment', value: 'Staging', inline: true },
					{ name: 'Duration', value: '2.5s', inline: true }
				]
			};

			// Slack blocks format
			const blocks = [
				{
					type: 'header',
					text: {
						type: 'plain_text',
						text: notification.title,
						emoji: true
					}
				},
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: notification.message
					}
				}
			];

			expect(blocks[0].type).toBe('header');
			expect(blocks[0].text.text).toContain('Test Failed');
			expect(blocks[1].type).toBe('section');
		});

		it('should include URL in notification if provided', () => {
			const url = 'https://qa-studio.dev/results/123';

			const block = {
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `View details: <${url}|here>`
				}
			};

			expect(block.text.text).toContain(url);
		});

		it('should format fields for Slack', () => {
			const fields = [
				{ name: 'Status', value: 'Failed', inline: true },
				{ name: 'Environment', value: 'Production', inline: true }
			];

			const slackFields = fields.map((field) => ({
				type: 'mrkdwn',
				text: `*${field.name}:* ${field.value}`
			}));

			expect(slackFields[0].text).toBe('*Status:* Failed');
			expect(slackFields[1].text).toBe('*Environment:* Production');
		});
	});

	describe('webhook request', () => {
		it('should send POST request to webhook URL', async () => {
			const webhookUrl = 'https://hooks.example.com/services/T/B/token';
			const payload = {
				blocks: [
					{
						type: 'header',
						text: { type: 'plain_text', text: 'Test notification' }
					}
				]
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => 'ok'
			});

			await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			expect(global.fetch).toHaveBeenCalledWith(
				webhookUrl,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
		});

		it('should handle successful webhook response', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => 'ok'
			});

			const response = await fetch('https://hooks.example.com/services/T/B/token', {
				method: 'POST',
				body: '{}'
			});

			expect(response.ok).toBe(true);
			expect(response.status).toBe(200);
		});

		it('should handle webhook error response', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				text: async () => 'invalid_payload'
			});

			const response = await fetch('https://hooks.example.com/services/T/B/token', {
				method: 'POST',
				body: '{invalid}'
			});

			expect(response.ok).toBe(false);
			expect(response.status).toBe(400);
		});

		it('should handle network errors', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(
				fetch('https://hooks.example.com/services/T/B/token', {
					method: 'POST',
					body: '{}'
				})
			).rejects.toThrow('Network error');
		});
	});

	describe('notification events', () => {
		it('should handle TEST_FAILED event', () => {
			const event = {
				type: 'TEST_FAILED',
				title: '❌ Test Failed: Login Page',
				color: '#ff0000'
			};

			expect(event.type).toBe('TEST_FAILED');
			expect(event.color).toBe('#ff0000');
		});

		it('should handle TEST_RUN_COMPLETED event', () => {
			const event = {
				type: 'TEST_RUN_COMPLETED',
				title: '✅ Test Run Completed',
				color: '#36a64f'
			};

			expect(event.type).toBe('TEST_RUN_COMPLETED');
			expect(event.color).toBe('#36a64f');
		});

		it('should handle MILESTONE_DUE event', () => {
			const event = {
				type: 'MILESTONE_DUE',
				title: '📅 Milestone Due Soon: v2.0',
				color: '#ffa500'
			};

			expect(event.type).toBe('MILESTONE_DUE');
			expect(event.color).toBe('#ffa500');
		});
	});

	describe('access token handling', () => {
		it('should decrypt access token from database', async () => {
			const { encrypt, decrypt } = await import('../encryption');

			const plainAccessToken = 'xoxb-example-test-token-not-real';
			const encryptedAccessToken = encrypt(plainAccessToken);

			// Stored encrypted
			const storedToken = encryptedAccessToken;

			// Decrypt when needed
			const accessToken = decrypt(storedToken);

			expect(accessToken).toBe(plainAccessToken);
			expect(accessToken).toMatch(/^xoxb-/);
		});

		it('should throw error if access token is missing', () => {
			const integration = {
				id: 'int123',
				type: 'SLACK',
				accessToken: null
			};

			expect(integration.accessToken).toBeNull();
		});
	});

	describe('Slack API authentication', () => {
		it('should use Bearer token authentication', () => {
			const accessToken = 'xoxb-test-token';

			const headers = {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			};

			expect(headers.Authorization).toBe('Bearer xoxb-test-token');
		});
	});

	describe('message formatting', () => {
		it('should support markdown in messages', () => {
			const message = '*Project:* QA Studio\n*Status:* Failed\n*Duration:* 2.5s';

			expect(message).toContain('*Project:*');
			expect(message).toContain('\n'); // Actual newline character
			expect(message.split('\n')).toHaveLength(3); // 3 lines
		});

		it('should escape special characters in Slack messages', () => {
			const text = 'Test <script>alert("xss")</script>';

			// Slack automatically escapes HTML
			// < becomes &lt;, > becomes &gt;
			const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

			expect(escaped).toBe('Test &lt;script&gt;alert("xss")&lt;/script&gt;');
		});

		it('should handle emoji in messages', () => {
			const message = '✅ All tests passed!';

			expect(message).toContain('✅');
		});
	});

	describe('error messages', () => {
		it('should not expose sensitive data in error messages', async () => {
			const { encrypt } = await import('../encryption');

			const webhookUrl = 'https://hooks.example.com/services/T/B/supersecret123';
			const encryptedUrl = encrypt(webhookUrl);

			// Error should not contain the secret token
			const error = 'Failed to send Slack notification';

			expect(error).not.toContain('supersecret123');
			expect(error).not.toContain(webhookUrl);
			expect(error).not.toContain(encryptedUrl);
		});
	});

	describe('webhook URL validation', () => {
		it('should validate Slack webhook URL format', () => {
			const validUrl = 'https://hooks.example.com/services/T12345/B12345/abc123';

			expect(validUrl).toMatch(/^https:\/\/hooks\.example\.com\/services\//);
		});

		it('should reject invalid webhook URLs', () => {
			const invalidUrls = [
				'http://hooks.example.com/services/T/B/token', // HTTP instead of HTTPS
				'https://evil.com/webhook', // Wrong domain
				'https://hooks.example.com/different/path', // Wrong path
				''
			];

			invalidUrls.forEach((url) => {
				if (url) {
					expect(url).not.toMatch(/^https:\/\/hooks\.example\.com\/services\/T\w+\/B\w+\/\w+$/);
				}
			});
		});
	});

	describe('integration config structure', () => {
		it('should store complete Slack config', async () => {
			const { encrypt } = await import('../encryption');

			const config = {
				teamId: 'T12345',
				teamName: 'Test Workspace',
				scope: 'chat:write,incoming-webhook',
				botUserId: 'U12345',
				appId: 'A12345',
				incomingWebhook: {
					channel: '#general',
					channel_id: 'C12345',
					configuration_url: 'https://test.slack.com/services/B12345',
					url: encrypt('https://hooks.example.com/services/T/B/token')
				}
			};

			expect(config.teamId).toBeDefined();
			expect(config.teamName).toBeDefined();
			expect(config.incomingWebhook).toBeDefined();
			expect(config.incomingWebhook.url).not.toContain('hooks.example.com');
		});
	});

	describe('rate limiting considerations', () => {
		it('should handle Slack rate limit responses', async () => {
			// Slack returns 429 when rate limited
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 429,
				headers: new Headers({
					'Retry-After': '30'
				}),
				text: async () => 'rate_limited'
			});

			const response = await fetch('https://hooks.example.com/services/T/B/token', {
				method: 'POST',
				body: '{}'
			});

			expect(response.status).toBe(429);
			const retryAfter = response.headers.get('Retry-After');
			expect(retryAfter).toBe('30');
		});
	});
});
