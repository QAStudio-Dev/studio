import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { JiraClient } from '$lib/server/integrations/jira';

/**
 * GET /api/integrations/jira
 * List all Jira integrations for the user's team
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user?.teamId) {
		return json({ error: 'User must be part of a team' }, { status: 400 });
	}

	// Get all Jira integrations for the team
	const integrations = await db.integration.findMany({
		where: {
			teamId: user.teamId,
			type: 'JIRA'
		},
		select: {
			id: true,
			name: true,
			status: true,
			config: true,
			lastSyncedAt: true,
			createdAt: true,
			updatedAt: true
		}
	});

	// Remove sensitive data from config
	const safeIntegrations = integrations.map((integration) => {
		const config = integration.config as { baseUrl?: string; email?: string };
		return {
			...integration,
			config: {
				baseUrl: config.baseUrl,
				email: config.email
				// Don't return apiToken
			}
		};
	});

	return json({ integrations: safeIntegrations });
};

/**
 * POST /api/integrations/jira
 * Create a new Jira integration
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user?.teamId) {
		return json({ error: 'User must be part of a team' }, { status: 400 });
	}

	const body = await event.request.json();
	const { name, baseUrl, email, apiToken } = body;

	if (!name || !baseUrl || !email || !apiToken) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	// Test the connection
	const jiraClient = new JiraClient({ baseUrl, email, apiToken });
	const testResult = await jiraClient.testConnection();

	if (!testResult.success) {
		return json(
			{ error: `Failed to connect to Jira: ${testResult.error}` },
			{ status: 400 }
		);
	}

	// Create the integration
	const integration = await db.integration.create({
		data: {
			teamId: user.teamId,
			type: 'JIRA',
			name,
			status: 'ACTIVE',
			config: {
				baseUrl,
				email,
				apiToken // TODO: Encrypt this in production
			},
			installedBy: userId
		}
	});

	// Return without sensitive data
	return json({
		integration: {
			id: integration.id,
			name: integration.name,
			status: integration.status,
			config: {
				baseUrl,
				email
			},
			createdAt: integration.createdAt
		}
	});
};
