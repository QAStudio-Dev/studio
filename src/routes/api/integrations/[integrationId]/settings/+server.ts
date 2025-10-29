import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

/**
 * PATCH /api/integrations/[integrationId]/settings
 * Update integration notification settings
 */
export const PATCH: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { integrationId } = event.params;

	try {
		const body = await event.request.json();

		// Get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		if (!user?.teamId) {
			return json({ message: 'No team found' }, { status: 403 });
		}

		// Verify the integration belongs to the user's team
		const integration = await db.integration.findUnique({
			where: { id: integrationId },
			select: { teamId: true, config: true }
		});

		if (!integration) {
			return json({ message: 'Integration not found' }, { status: 404 });
		}

		if (integration.teamId !== user.teamId) {
			return json({ message: 'Not authorized to update this integration' }, { status: 403 });
		}

		// Merge new settings with existing config
		const currentConfig = (integration.config as any) || {};
		const updatedConfig = {
			...currentConfig,
			notifications: body.notifications || {}
		};

		// Update the integration
		await db.integration.update({
			where: { id: integrationId },
			data: {
				config: updatedConfig
			}
		});

		return json({ message: 'Settings updated successfully', config: updatedConfig });
	} catch (error: any) {
		console.error('Error updating integration settings:', error);
		return json({ message: error.message || 'Failed to update settings' }, { status: 500 });
	}
};

/**
 * GET /api/integrations/[integrationId]/settings
 * Get integration notification settings
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { integrationId } = event.params;

	try {
		// Get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		if (!user?.teamId) {
			return json({ message: 'No team found' }, { status: 403 });
		}

		// Verify the integration belongs to the user's team
		const integration = await db.integration.findUnique({
			where: { id: integrationId },
			select: { teamId: true, config: true }
		});

		if (!integration) {
			return json({ message: 'Integration not found' }, { status: 404 });
		}

		if (integration.teamId !== user.teamId) {
			return json({ message: 'Not authorized to view this integration' }, { status: 403 });
		}

		const config = (integration.config as any) || {};
		const notifications = config.notifications || {};

		return json({ notifications });
	} catch (error: any) {
		console.error('Error fetching integration settings:', error);
		return json({ message: error.message || 'Failed to fetch settings' }, { status: 500 });
	}
};
