import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { JiraClient } from '$lib/server/integrations/jira';
import { encrypt } from '$lib/server/encryption';
import { z } from 'zod';
import { handleValidationError, validateRequestBody } from '$lib/server/validation';
import { IntegrationType, IntegrationStatus } from '$prisma/client';

/**
 * TODO: Rate Limiting
 *
 * Consider implementing rate limiting for integration endpoints to prevent abuse:
 *
 * 1. Connection Tests (POST endpoint): Limit to 5 requests per user per 5 minutes
 *    - Prevents brute force credential testing
 *    - Mitigates API key enumeration attacks
 *
 * 2. Issue Creation: Limit to 100 requests per team per hour
 *    - Prevents accidental API flooding from automated test runs
 *    - Protects against Jira API rate limit exhaustion
 *
 * Implementation Options:
 * - SvelteKit middleware with in-memory store (simple, single-server)
 * - Redis-backed rate limiter (distributed, production-ready)
 * - Third-party service (e.g., Upstash Rate Limit, Unkey)
 *
 * Recommended: Start with SvelteKit hooks.server.ts middleware using a Map-based
 * store for MVP, then migrate to Redis when deploying to multiple servers.
 */

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
			type: IntegrationType.JIRA
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
		body = await validateRequestBody(event.request, CreateJiraIntegrationSchema);
	} catch (error) {
		return handleValidationError(error);
	}

	const { name, baseUrl, email, apiToken } = body;

	// Remove trailing slash from baseUrl
	const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

	// Encrypt the API token immediately to minimize plaintext exposure
	const encryptedApiToken = encrypt(apiToken);

	// Test the connection (Jira client will decrypt internally)
	const jiraClient = new JiraClient({ baseUrl: normalizedBaseUrl, email, apiToken });
	const testResult = await jiraClient.testConnection();

	if (!testResult.success) {
		// Sanitize error message - don't expose internal Jira details
		return json(
			{ error: 'Failed to connect to Jira. Please verify your credentials and URL.' },
			{ status: 400 }
		);
	}

	// Create the integration
	const integration = await db.integration.create({
		data: {
			teamId: user.teamId,
			type: IntegrationType.JIRA,
			name,
			status: IntegrationStatus.ACTIVE,
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
