import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';

/**
 * Verify Slack request signature
 * This ensures the request is actually from Slack and hasn't been tampered with
 */
function verifySlackRequest(
	signingSecret: string,
	requestSignature: string | null,
	timestamp: string | null,
	body: string
): boolean {
	if (!requestSignature || !timestamp) {
		return false;
	}

	// Reject old requests (> 5 minutes old) to prevent replay attacks
	const requestTime = parseInt(timestamp, 10);
	const currentTime = Math.floor(Date.now() / 1000);
	if (Math.abs(currentTime - requestTime) > 60 * 5) {
		console.warn('[Slack] Request timestamp too old');
		return false;
	}

	// Create signature
	const sigBasestring = `v0:${timestamp}:${body}`;
	const mySignature =
		'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

	// Compare signatures using timing-safe comparison
	return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(requestSignature));
}

/**
 * POST /api/integrations/slack/interactions
 * Handle Slack interactive components (buttons, menus, etc.)
 *
 * This endpoint receives callbacks when users interact with buttons in Slack messages.
 * For URL buttons (like our "View Details" button), Slack still sends a callback even though
 * the user is navigated to the URL. We need to acknowledge these callbacks to prevent errors.
 *
 * This endpoint is public (no authentication required) but verifies requests using Slack's
 * signing secret to ensure they're actually from Slack.
 */
export const POST: RequestHandler = async ({ request }) => {
	console.log('[Slack Interactions] Received request from:', request.headers.get('user-agent'));

	try {
		// Get the raw body for signature verification
		const body = await request.text();

		// Verify the request is from Slack
		const signingSecret = process.env.SLACK_SIGNING_SECRET;

		if (signingSecret) {
			const signature = request.headers.get('x-slack-signature');
			const timestamp = request.headers.get('x-slack-request-timestamp');

			const isValid = verifySlackRequest(signingSecret, signature, timestamp, body);

			if (!isValid) {
				console.error('[Slack Interactions] Invalid request signature', {
					signature: signature?.substring(0, 20),
					timestamp,
					bodyLength: body.length
				});
				// Return 200 to Slack to prevent retries, but with error message
				return json({ ok: false, error: 'Invalid signature' }, { status: 200 });
			}
		} else {
			console.warn(
				'[Slack Interactions] SLACK_SIGNING_SECRET not configured - skipping verification'
			);
		}

		// Parse the form data
		const formData = new URLSearchParams(body);
		const payloadString = formData.get('payload');

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
