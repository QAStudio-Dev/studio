import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/integrations/slack/webhook
 * Webhook endpoint for Slack Events API
 *
 * This receives events from Slack (like messages, reactions, etc.)
 * You'll configure this URL in your Slack app settings
 */
export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();

		// Handle Slack URL verification challenge
		// When you first configure the webhook, Slack sends a challenge
		if (body.type === 'url_verification') {
			return json({ challenge: body.challenge });
		}

		// Handle Slack event callbacks
		if (body.type === 'event_callback') {
			const slackEvent = body.event;

			// Log the event for debugging (in production, process based on event type)
			console.log('Slack event received:', {
				type: slackEvent.type,
				team: body.team_id,
				user: slackEvent.user,
				channel: slackEvent.channel,
				timestamp: body.event_time
			});

			// Process different event types
			switch (slackEvent.type) {
				case 'message':
					// Handle message events
					// You could implement bot commands here
					break;

				case 'app_mention':
					// Handle when your bot is mentioned
					break;

				case 'reaction_added':
					// Handle reactions
					break;

				default:
					console.log('Unhandled Slack event type:', slackEvent.type);
			}

			// Always return 200 OK to acknowledge receipt
			return json({ ok: true });
		}

		// Unknown event type
		console.warn('Unknown Slack webhook event:', body.type);
		return json({ ok: true });
	} catch (error: any) {
		console.error('Error processing Slack webhook:', error);
		// Return 200 even on error to prevent Slack from retrying
		return json({ ok: false, error: error.message }, { status: 200 });
	}
};
