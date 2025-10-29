import { db } from './db';
import type { NotificationEvent, IntegrationType } from '@prisma/client';

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
 * Send a notification to all active integrations for a team
 */
export async function sendNotification(teamId: string, payload: NotificationPayload) {
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
			return;
		}

		// Filter integrations based on notification preferences
		const enabledIntegrations = integrations.filter((integration) => {
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
			return;
		}

		// Send to each enabled integration
		const promises = enabledIntegrations.map((integration) =>
			sendToIntegration(integration.id, integration.type, payload)
		);

		await Promise.allSettled(promises);
	} catch (error) {
		console.error('Error sending notifications:', error);
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
	const webhookUrl = (integration.config as any)?.incomingWebhook?.url;

	if (!webhookUrl) {
		throw new Error('Slack webhook URL not configured');
	}

	// Format message for Slack
	const slackMessage = {
		text: payload.title,
		blocks: [
			{
				type: 'header',
				text: {
					type: 'plain_text',
					text: payload.title
				}
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: payload.message
				}
			}
		],
		attachments: payload.fields
			? [
					{
						color: payload.color || '#36a64f',
						fields: payload.fields.map((f) => ({
							title: f.name,
							value: f.value,
							short: f.inline ?? true
						}))
					}
				]
			: []
	};

	if (payload.url) {
		slackMessage.blocks.push({
			type: 'actions',
			elements: [
				{
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'View Details'
					},
					url: payload.url
				}
			]
		} as any);
	}

	// Send to Slack
	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(slackMessage)
	});

	if (!response.ok) {
		throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
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
	const response = await fetch(integration.webhookUrl, {
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

	// Send to webhook
	const response = await fetch(integration.webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(integration.webhookSecret && { 'X-Webhook-Secret': integration.webhookSecret })
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
		projectName: string;
		passRate: number;
		total: number;
		passed: number;
		failed: number;
	}
) {
	const color = testRun.passRate === 100 ? '#36a64f' : testRun.passRate >= 80 ? '#ffa500' : '#ff0000';

	await sendNotification(teamId, {
		event: 'TEST_RUN_COMPLETED',
		title: `Test Run Completed: ${testRun.name}`,
		message: `*${testRun.projectName}*\nTest run "${testRun.name}" has completed.`,
		url: `${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/test-runs/${testRun.id}`,
		color,
		fields: [
			{ name: 'Pass Rate', value: `${testRun.passRate}%`, inline: true },
			{ name: 'Total Tests', value: testRun.total.toString(), inline: true },
			{ name: 'Passed', value: testRun.passed.toString(), inline: true },
			{ name: 'Failed', value: testRun.failed.toString(), inline: true }
		]
	});
}

export async function notifyTestRunFailed(
	teamId: string,
	testRun: {
		id: string;
		name: string;
		projectName: string;
		failedCount: number;
	}
) {
	await sendNotification(teamId, {
		event: 'TEST_RUN_FAILED',
		title: `⚠️ Test Run Failed: ${testRun.name}`,
		message: `*${testRun.projectName}*\nTest run "${testRun.name}" has failed with ${testRun.failedCount} failures.`,
		url: `${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/test-runs/${testRun.id}`,
		color: '#ff0000'
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
) {
	await sendNotification(teamId, {
		event: 'MILESTONE_DUE',
		title: `📅 Milestone Due Soon: ${milestone.name}`,
		message: `*${milestone.projectName}*\nMilestone "${milestone.name}" is due in ${milestone.daysUntilDue} days.`,
		color: milestone.daysUntilDue <= 3 ? '#ff0000' : '#ffa500'
	});
}
