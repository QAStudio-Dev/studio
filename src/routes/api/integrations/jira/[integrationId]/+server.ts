import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

/**
 * DELETE /api/integrations/jira/[integrationId]
 * Delete a Jira integration
 */
export const DELETE: RequestHandler = async (event) => {
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

	// Delete the integration
	await db.integration.delete({
		where: { id: integrationId }
	});

	return json({ success: true });
};

/**
 * PATCH /api/integrations/jira/[integrationId]
 * Update a Jira integration
 */
export const PATCH: RequestHandler = async (event) => {
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

	const body = await event.request.json();
	const { name, status } = body;

	// Update the integration
	const updated = await db.integration.update({
		where: { id: integrationId },
		data: {
			...(name && { name }),
			...(status && { status })
		}
	});

	return json({
		integration: {
			id: updated.id,
			name: updated.name,
			status: updated.status,
			updatedAt: updated.updatedAt
		}
	});
};
