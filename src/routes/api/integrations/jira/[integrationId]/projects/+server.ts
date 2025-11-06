import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createJiraClientFromIntegration } from '$lib/server/integrations/jira';

/**
 * GET /api/integrations/jira/[integrationId]/projects
 * Get all Jira projects for this integration
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { integrationId } = event.params;

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user?.teamId) {
		return json({ error: 'User must be part of a team' }, { status: 400 });
	}

	// Check that integration belongs to user's team
	const integration = await db.integration.findFirst({
		where: {
			id: integrationId,
			teamId: user.teamId,
			type: 'JIRA'
		}
	});

	if (!integration) {
		return json({ error: 'Integration not found' }, { status: 404 });
	}

	// Create Jira client
	const jiraClient = createJiraClientFromIntegration(integration);
	if (!jiraClient) {
		return json({ error: 'Invalid Jira configuration' }, { status: 500 });
	}

	// Get projects
	const result = await jiraClient.getProjects();
	if (result.error) {
		return json({ error: result.error }, { status: 500 });
	}

	return json({ projects: result.data });
};
