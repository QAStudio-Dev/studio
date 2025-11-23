import { db } from './db';
import type { NotificationEvent, IntegrationType } from '$prisma/client';
import { decrypt } from './encryption';

/**
 * Integration Service
 * Handles sending notifications to various integrations (Slack, Discord, etc.)
 */

interface NotificationPayload {
	event: NotificationEvent;
	title: string;
	message: string;
	url?: string;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	color?: string;
}

/**
 * Result of a notification send operation
 */
export interface NotificationResult {
	success: boolean;
	integrationsSent: number;
	integrationsFailed: number;
	errors?: Array<{ integrationId: string; error: string }>;
}

/**
 * Send a notification to all active integrations for a team
 */
export async function sendNotification(
	teamId: string,
	payload: NotificationPayload
): Promise<NotificationResult> {
	const result: NotificationResult = {
		success: false,
		integrationsSent: 0,
		integrationsFailed: 0,
		errors: []
	};

	try {
		// Get all active integrations for the team
		const integrations = await db.integration.findMany({
			where: {
				teamId,
				status: 'ACTIVE'
			}
		});

		if (integrations.length === 0) {
			console.log('No active integrations found for team:', teamId);
			return result;
		}

		// Filter integrations based on notification preferences
		// Skip JIRA/GITHUB/GITLAB - they're for issue tracking, not notifications
		const notificationTypes: IntegrationType[] = ['SLACK', 'DISCORD', 'TEAMS', 'WEBHOOK'];

		const enabledIntegrations = integrations.filter((integration) => {
			// Skip non-notification integration types
			if (!notificationTypes.includes(integration.type)) {
				return false;
			}

			const config = integration.config as any;
			const notifications = config?.notifications || {};

			// Check if this event type is enabled (default to true if not configured)
			const isEnabled = notifications[payload.event] ?? true;

			if (!isEnabled) {
				console.log(
					`Notification ${payload.event} disabled for integration ${integration.id}`
				);
			}

			return isEnabled;
		});

		if (enabledIntegrations.length === 0) {
			console.log('No integrations have this notification enabled:', payload.event);
			return result;
		}

		// Send to each enabled integration
		const promises = enabledIntegrations.map((integration) =>
			sendToIntegration(integration.id, integration.type, payload)
		);

		const results = await Promise.allSettled(promises);

		// Process results
		results.forEach((promiseResult, index) => {
			if (promiseResult.status === 'fulfilled') {
				const integrationResult = promiseResult.value;
				if (integrationResult.success) {
					result.integrationsSent++;
				} else {
					result.integrationsFailed++;
					result.errors?.push({
						integrationId: enabledIntegrations[index].id,
						error: integrationResult.error || 'Unknown error'
					});
				}
			} else {
				result.integrationsFailed++;
				result.errors?.push({
					integrationId: enabledIntegrations[index].id,
					error: promiseResult.reason?.message || 'Unknown error'
				});
			}
		});

		result.success = result.integrationsSent > 0;

		// Log summary
		if (result.integrationsFailed > 0) {
			console.error(
				`Notification ${payload.event} partially failed: ${result.integrationsSent} sent, ${result.integrationsFailed} failed`,
				result.errors
			);
		} else {
			console.log(
				`Notification ${payload.event} sent successfully to ${result.integrationsSent} integration(s)`
			);
		}

		return result;
	} catch (error: any) {
		console.error('Error sending notifications:', error);
		result.errors?.push({
			integrationId: 'system',
			error: error.message || 'System error'
		});
		return result;
	}
}

/**
 * Send a notification to a specific integration
 */
async function sendToIntegration(
	integrationId: string,
	type: IntegrationType,
	payload: NotificationPayload
) {
	try {
		// Create notification record
		const notification = await db.integrationNotification.create({
			data: {
				integrationId,
				eventType: payload.event,
				status: 'PENDING',
				payload: payload as any,
				attempts: 0
			}
		});

		// Send based on integration type
		let success = false;
		let response = null;
		let error = null;

		try {
			switch (type) {
				case 'SLACK':
					response = await sendSlackNotification(integrationId, payload);
					success = true;
					break;

				case 'DISCORD':
					response = await sendDiscordNotification(integrationId, payload);
					success = true;
					break;

				case 'WEBHOOK':
					response = await sendWebhookNotification(integrationId, payload);
					success = true;
					break;

				default:
					throw new Error(`Unsupported integration type: ${type}`);
			}
		} catch (err: any) {
			error = err.message;
			success = false;
		}

		// Update notification record
		await db.integrationNotification.update({
			where: { id: notification.id },
			data: {
				status: success ? 'SENT' : 'FAILED',
				response: response as any,
				error,
				sentAt: success ? new Date() : null,
				attempts: 1
			}
		});

		return { success, response, error };
	} catch (error: any) {
		console.error(`Error sending to integration ${integrationId}:`, error);
		throw error;
	}
}

/**
 * Send notification to Slack
 */
async function sendSlackNotification(integrationId: string, payload: NotificationPayload) {
	const integration = await db.integration.findUnique({
		where: { id: integrationId },
		select: { accessToken: true, config: true }
	});

	if (!integration?.accessToken) {
		throw new Error('Slack access token not found');
	}

	// Get webhook URL from config (if using incoming webhook)
	const encryptedWebhookUrl = (integration.config as any)?.incomingWebhook?.url;

	if (!encryptedWebhookUrl) {
		throw new Error('Slack webhook URL not configured');
	}

	// Decrypt webhook URL (contains sensitive token)
	const webhookUrl = decrypt(encryptedWebhookUrl);

	// Build blocks for Slack message with improved formatting
	const blocks: any[] = [
		{
			type: 'header',
			text: {
				type: 'plain_text',
				text: payload.title,
				emoji: true
			}
		},
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: payload.message
			}
		}
	];

	// Add fields as a rich section if provided
	if (payload.fields && payload.fields.length > 0) {
		blocks.push({
			type: 'section',
			fields: payload.fields.map((f) => ({
				type: 'mrkdwn',
				text: `*${f.name}*\n${f.value}`
			}))
		});
	}

	// Add link as markdown text instead of button
	if (payload.url) {
		blocks.push({ type: 'divider' });
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `🔍 <${payload.url}|View Details>`
			}
		});
	}

	// Format message for Slack with color-coded attachment
	const slackMessage: any = {
		text: payload.title,
		blocks,
		attachments: [
			{
				color: payload.color || '#36a64f',
				blocks: []
			}
		]
	};

	// Send to Slack
	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(slackMessage)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Slack API error: ${response.status} ${response.statusText} - ${errorText}`
		);
	}

	return { status: response.status, statusText: response.statusText };
}

/**
 * Send notification to Discord
 */
async function sendDiscordNotification(integrationId: string, payload: NotificationPayload) {
	const integration = await db.integration.findUnique({
		where: { id: integrationId },
		select: { webhookUrl: true }
	});

	if (!integration?.webhookUrl) {
		throw new Error('Discord webhook URL not found');
	}

	// Decrypt webhook URL (contains sensitive token)
	const webhookUrl = decrypt(integration.webhookUrl);

	// Format message for Discord
	const discordMessage = {
		embeds: [
			{
				title: payload.title,
				description: payload.message,
				color: parseInt((payload.color || '#36a64f').replace('#', ''), 16),
				fields: payload.fields,
				url: payload.url,
				timestamp: new Date().toISOString()
			}
		]
	};

	// Send to Discord
	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(discordMessage)
	});

	if (!response.ok) {
		throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
	}

	return { status: response.status, statusText: response.statusText };
}

/**
 * Send notification to generic webhook
 */
async function sendWebhookNotification(integrationId: string, payload: NotificationPayload) {
	const integration = await db.integration.findUnique({
		where: { id: integrationId },
		select: { webhookUrl: true, webhookSecret: true }
	});

	if (!integration?.webhookUrl) {
		throw new Error('Webhook URL not found');
	}

	// Decrypt sensitive webhook data
	const webhookUrl = decrypt(integration.webhookUrl);
	const webhookSecret = integration.webhookSecret ? decrypt(integration.webhookSecret) : null;

	// Send to webhook
	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(webhookSecret && { 'X-Webhook-Secret': webhookSecret })
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
	}

	return { status: response.status, statusText: response.statusText };
}

/**
 * Helper functions for common notification types
 */

export async function notifyTestRunCompleted(
	teamId: string,
	testRun: {
		id: string;
		name: string;
		projectId: string;
		projectName: string;
		passRate: number;
		total: number;
		passed: number;
		failed: number;
		skipped?: number;
	}
): Promise<NotificationResult> {
	const color =
		testRun.passRate === 100 ? '#36a64f' : testRun.passRate >= 80 ? '#ffa500' : '#ff0000';
	const emoji = testRun.passRate === 100 ? '✅' : testRun.passRate >= 80 ? '⚠️' : '❌';
	const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';

	const fields = [
		{ name: '📊 Pass Rate', value: `${testRun.passRate}%`, inline: true },
		{ name: '📝 Total Tests', value: testRun.total.toString(), inline: true },
		{ name: '✅ Passed', value: testRun.passed.toString(), inline: true },
		{ name: '❌ Failed', value: testRun.failed.toString(), inline: true }
	];

	// Add skipped count if present
	if (testRun.skipped && testRun.skipped > 0) {
		fields.push({ name: '⏭️ Skipped', value: testRun.skipped.toString(), inline: true });
	}

	return await sendNotification(teamId, {
		event: 'TEST_RUN_COMPLETED',
		title: `${emoji} Test Run Completed: ${testRun.name}`,
		message: `*Project:* ${testRun.projectName}\n*Status:* ${testRun.passRate === 100 ? 'All tests passed' : `${testRun.failed} test(s) failed`}`,
		url: `${baseUrl}/projects/${testRun.projectId}/runs/${testRun.id}`,
		color,
		fields
	});
}

export async function notifyTestRunFailed(
	teamId: string,
	testRun: {
		id: string;
		name: string;
		projectId: string;
		projectName: string;
		failedCount: number;
	}
): Promise<NotificationResult> {
	const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';

	return await sendNotification(teamId, {
		event: 'TEST_RUN_FAILED',
		title: `❌ Test Run Failed: ${testRun.name}`,
		message: `*Project:* ${testRun.projectName}\n*Failures:* ${testRun.failedCount} test(s) failed\n\n⚠️ Immediate attention required`,
		url: `${baseUrl}/projects/${testRun.projectId}/runs/${testRun.id}`,
		color: '#ff0000',
		fields: [{ name: '🔴 Failed Tests', value: testRun.failedCount.toString(), inline: true }]
	});
}

export async function notifyMilestoneDue(
	teamId: string,
	milestone: {
		id: string;
		name: string;
		projectName: string;
		dueDate: Date;
		daysUntilDue: number;
	}
): Promise<NotificationResult> {
	const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';

	return await sendNotification(teamId, {
		event: 'MILESTONE_DUE',
		title: `📅 Milestone Due Soon: ${milestone.name}`,
		message: `*Project:* ${milestone.projectName}\n*Due Date:* ${milestone.dueDate.toLocaleDateString()}\n*Days Remaining:* ${milestone.daysUntilDue}`,
		color: milestone.daysUntilDue <= 3 ? '#ff0000' : '#ffa500',
		fields: [
			{ name: '⏰ Days Until Due', value: milestone.daysUntilDue.toString(), inline: true }
		]
	});
}
