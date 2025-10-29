import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/integrations/slack/interactions
 * Handle Slack interactive components (buttons, menus, etc.)
 *
 * This endpoint receives callbacks when users interact with buttons in Slack messages.
 * For URL buttons (like our "View Details" button), Slack still sends a callback even though
 * the user is navigated to the URL. We need to acknowledge these callbacks to prevent errors.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Slack sends the payload as form-encoded data
		const formData = await request.formData();
		const payloadString = formData.get('payload') as string;

		if (!payloadString) {
			return json({ error: 'No payload provided' }, { status: 400 });
		}

		const payload = JSON.parse(payloadString);

		console.log('[Slack Interactions] Received interaction:', {
			type: payload.type,
			user: payload.user?.id,
			action: payload.actions?.[0]?.action_id
		});

		// Handle different interaction types
		switch (payload.type) {
			case 'block_actions':
				// User clicked a button or interacted with a component
				// For URL buttons, we don't need to do anything special
				// Just acknowledge the interaction
				return json({ ok: true });

			case 'message_action':
				// User triggered a message action (right-click menu)
				return json({ ok: true });

			case 'view_submission':
				// User submitted a modal
				return json({ ok: true });

			default:
				console.warn('[Slack Interactions] Unknown interaction type:', payload.type);
				return json({ ok: true });
		}
	} catch (error) {
		console.error('[Slack Interactions] Error processing interaction:', error);

		// Always return 200 to Slack to prevent retries
		return json({ ok: false, error: 'Internal error' }, { status: 200 });
	}
};
