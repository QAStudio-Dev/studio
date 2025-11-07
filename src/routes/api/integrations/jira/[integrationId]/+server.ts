import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { z } from 'zod';

/**
 * DELETE /api/integrations/jira/[integrationId]
 * Delete a Jira integration
 */
export const DELETE: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { integrationId } = event.params;

	// Validate integrationId format
	if (!z.cuid().safeParse(integrationId).success) {
		return json({ error: 'Invalid integration ID format' }, { status: 400 });
	}

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

// Validation schema for updating integration
const UpdateIntegrationSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional()
});

/**
 * PATCH /api/integrations/jira/[integrationId]
 * Update a Jira integration
 */
export const PATCH: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { integrationId } = event.params;

	// Validate integrationId format
	if (!z.cuid().safeParse(integrationId).success) {
		return json({ error: 'Invalid integration ID format' }, { status: 400 });
	}

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

	// Parse and validate request body
	let body;
	try {
		const rawBody = await event.request.json();
		body = UpdateIntegrationSchema.parse(rawBody);
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
