import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { decrypt } from '$lib/server/encryption';
import { createHmac } from 'crypto';

/**
 * POST /api/integrations/twilio/sms/receive
 * Webhook endpoint for receiving incoming SMS messages from Twilio
 *
 * This endpoint should be configured in your Twilio phone number settings:
 * Messaging > Webhook > A MESSAGE COMES IN
 * Set to: https://your-domain.com/api/integrations/twilio/sms/receive
 *
 * Twilio will POST to this endpoint with form data containing:
 * - MessageSid: Unique message identifier
 * - From: Sender's phone number (E.164)
 * - To: Recipient's phone number (your Twilio number)
 * - Body: Message text
 * - NumMedia: Number of media attachments
 * - (and other optional fields)
 */
export const POST: RequestHandler = async (event) => {
	try {
		// Get signature header first
		const signature = event.request.headers.get('X-Twilio-Signature');
		const url = event.url.toString();

		// Parse form data from Twilio
		const formData = await event.request.formData();

		// Extract only the minimal fields needed for team lookup and signature verification
		const to = formData.get('To') as string;
		const accountSid = formData.get('AccountSid') as string;

		// Validate minimal required fields for team lookup
		if (!to || !accountSid) {
			console.error('Missing To or AccountSid fields');
			return text('Missing required fields', { status: 400 });
		}

		// Find the team with this Twilio phone number
		const team = await db.team.findFirst({
			where: {
				twilioPhoneNumber: to,
				twilioEnabled: true
			},
			select: {
				id: true,
				name: true,
				twilioAccountSid: true,
				twilioAuthToken: true
			}
		});

		if (!team) {
			console.error(`No team found with Twilio phone number: ${to}`);
			return text('Phone number not configured', { status: 404 });
		}

		// Verify auth token is configured
		if (!team.twilioAuthToken || !team.twilioAccountSid) {
			console.error('Team Twilio configuration incomplete');
			return text('Configuration error', { status: 500 });
		}

		// Verify Twilio signature BEFORE processing any other data
		const authToken = decrypt(team.twilioAuthToken);
		if (!verifyTwilioSignature(signature, url, formData, authToken)) {
			console.error('Invalid Twilio signature');
			return text('Invalid signature', { status: 403 });
		}

		// Verify Twilio account ownership
		const storedAccountSid = decrypt(team.twilioAccountSid);
		if (accountSid !== storedAccountSid) {
			console.error('Account SID mismatch');
			return text('Account verification failed', { status: 403 });
		}

		// NOW safely parse the rest of the payload after verification
		const messageSid = formData.get('MessageSid') as string;
		const from = formData.get('From') as string;
		const body = formData.get('Body') as string;
		const numMedia = parseInt((formData.get('NumMedia') as string) || '0');

		// Validate all required fields
		if (!messageSid || !from) {
			console.error('Missing required Twilio webhook fields');
			return text('Missing required fields', { status: 400 });
		}

		// Log the received message
		console.log(`[Twilio SMS] Received message for team ${team.name}:`, {
			messageSid,
			from,
			to,
			body: body?.substring(0, 50) + (body?.length > 50 ? '...' : ''),
			numMedia
		});

		// TODO: Store the message in your database or trigger an event
		// Example: Create a TestResult with the SMS verification code
		// Example: Trigger a webhook or notification to your test automation

		// Return TwiML response (empty response acknowledges receipt)
		return text(
			`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<!-- Message received successfully -->
</Response>`,
			{
				headers: {
					'Content-Type': 'text/xml'
				}
			}
		);
	} catch (error: any) {
		console.error('Error processing incoming SMS:', error);

		// Return error in TwiML format
		return text(
			`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Error processing message</Message>
</Response>`,
			{
				status: 500,
				headers: {
					'Content-Type': 'text/xml'
				}
			}
		);
	}
};

/**
 * Verify Twilio webhook signature
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
	signature: string | null,
	url: string,
	formData: FormData,
	authToken: string
): boolean {
	if (!signature) {
		console.warn('No X-Twilio-Signature header provided');
		return false;
	}

	// Build the signature data string according to Twilio's specification
	// Start with the full URL
	let data = url;

	// Sort parameters alphabetically and append to the URL
	const sortedParams = Array.from(formData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	for (const [key, value] of sortedParams) {
		data += key + value;
	}

	// Compute HMAC-SHA1
	const hmac = createHmac('sha1', authToken);
	hmac.update(data, 'utf8');
	const expectedSignature = hmac.digest('base64');

	return signature === expectedSignature;
}
