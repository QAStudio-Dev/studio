import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { JiraClient } from '$lib/server/integrations/jira';
import { encrypt } from '$lib/server/encryption';
import { z } from 'zod';

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

// Validation schema
const CreateJiraIntegrationSchema = z.object({
	name: z.string().min(1).max(100),
	baseUrl: z.string().refine(
		(url) => {
			try {
				const parsed = new URL(url);
				return parsed.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'Must be a valid HTTPS URL' }
	),
	email: z.string().email(),
	apiToken: z.string().min(1)
});

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

	// Parse and validate request body
	let body;
	try {
		const rawBody = await event.request.json();
		body = CreateJiraIntegrationSchema.parse(rawBody);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0];
			return json(
				{ error: firstError.message || `Invalid ${firstError.path.join('.')}` },
				{ status: 400 }
			);
		}
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { name, baseUrl, email, apiToken } = body;

	// Remove trailing slash from baseUrl
	const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

	// Test the connection
	const jiraClient = new JiraClient({ baseUrl: normalizedBaseUrl, email, apiToken });
	const testResult = await jiraClient.testConnection();

	if (!testResult.success) {
		return json({ error: `Failed to connect to Jira: ${testResult.error}` }, { status: 400 });
	}

	// Encrypt the API token
	const encryptedApiToken = encrypt(apiToken);

	// Create the integration
	const integration = await db.integration.create({
		data: {
			teamId: user.teamId,
			type: 'JIRA',
			name,
			status: 'ACTIVE',
			config: {
				baseUrl: normalizedBaseUrl,
				email,
				apiToken: encryptedApiToken
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
				baseUrl: normalizedBaseUrl,
				email
			},
			createdAt: integration.createdAt
		}
	});
};
