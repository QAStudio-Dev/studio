import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { decrypt } from '$lib/server/encryption';

/**
 * DELETE /api/integrations/[integrationId]/delete
 * Delete an integration
 */
export const DELETE: RequestHandler = async (event) => {
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
			select: { teamId: true, type: true, accessToken: true }
		});

		if (!integration) {
			return json({ message: 'Integration not found' }, { status: 404 });
		}

		if (integration.teamId !== user.teamId) {
			return json({ message: 'Not authorized to delete this integration' }, { status: 403 });
		}

		// For Slack, optionally revoke the OAuth token
		if (integration.type === 'SLACK' && integration.accessToken) {
			try {
				// Decrypt access token before revoking
				const accessToken = decrypt(integration.accessToken);
				await fetch('https://slack.com/api/auth.revoke', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Bearer ${accessToken}`
					}
				});
			} catch (err) {
				console.error('Failed to revoke Slack token:', err);
				// Continue with deletion even if revocation fails
			}
		}

		// Delete the integration
		await db.integration.delete({
			where: { id: integrationId }
		});

		return json({ message: 'Integration deleted successfully' });
	} catch (error: any) {
		console.error('Error deleting integration:', error);
		return json({ message: error.message || 'Failed to delete integration' }, { status: 500 });
	}
};
