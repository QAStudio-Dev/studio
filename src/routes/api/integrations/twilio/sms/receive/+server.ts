import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { decrypt } from '$lib/server/encryption';
import { createHmac, timingSafeEqual } from 'crypto';
import { sanitizeForLog } from '$lib/validation/twilio';

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
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Missing required fields</Message>
</Response>`,
				{
					status: 400,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
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
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Phone number not configured</Message>
</Response>`,
				{
					status: 404,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Verify auth token is configured
		if (!team.twilioAuthToken || !team.twilioAccountSid) {
			console.error('Team Twilio configuration incomplete');
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Configuration error</Message>
</Response>`,
				{
					status: 500,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Verify Twilio signature BEFORE processing any other data
		const authToken = decrypt(team.twilioAuthToken);
		if (!verifyTwilioSignature(signature, url, formData, authToken)) {
			console.error('Invalid Twilio signature');
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Invalid signature</Message>
</Response>`,
				{
					status: 403,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Verify Twilio account ownership
		const storedAccountSid = decrypt(team.twilioAccountSid);
		if (accountSid !== storedAccountSid) {
			console.error('Account SID mismatch');
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Account verification failed</Message>
</Response>`,
				{
					status: 403,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// NOW safely parse the rest of the payload after verification
		const messageSid = formData.get('MessageSid') as string;
		const from = formData.get('From') as string;
		const body = formData.get('Body') as string;
		const numMedia = parseInt((formData.get('NumMedia') as string) || '0');

		// Validate all required fields
		if (!messageSid || !from) {
			console.error('Missing required Twilio webhook fields');
			return text(
				`<?xml version="1.0" encoding="UTF-8"?>
<Response>
	<Message>Missing required fields</Message>
</Response>`,
				{
					status: 400,
					headers: { 'Content-Type': 'text/xml' }
				}
			);
		}

		// Log the received message (sanitized to prevent log injection)
		console.log(`[Twilio SMS] Received message for team ${sanitizeForLog(team.name)}:`, {
			messageSid,
			from: sanitizeForLog(from),
			to: sanitizeForLog(to),
			body: body
				? sanitizeForLog(body.substring(0, 50)) + (body.length > 50 ? '...' : '')
				: null,
			numMedia
		});

		// Store the message in the database
		try {
			// Convert FormData to a plain object for JSON storage
			const formDataObj: Record<string, string> = {};
			for (const [key, value] of formData.entries()) {
				formDataObj[key] = typeof value === 'string' ? value : value.name;
			}

			await db.smsMessage.create({
				data: {
					teamId: team.id,
					direction: 'INBOUND',
					messageSid,
					from,
					to,
					body: body || null,
					accountSid,
					numMedia,
					metadata: {
						// Store any additional webhook data that might be useful
						rawFormData: formDataObj
					}
				}
			});
		} catch (dbError: any) {
			// If duplicate messageSid, it's a replay - log but continue
			if (dbError.code === 'P2002') {
				console.warn(`[Twilio SMS] Duplicate message ignored: ${messageSid}`);
			} else {
				// Log database error but don't fail the webhook
				console.error('[Twilio SMS] Failed to store message:', dbError);
			}
		}

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

	// Use constant-time comparison to prevent timing attacks
	const expectedBuffer = Buffer.from(expectedSignature);
	const actualBuffer = Buffer.from(signature);

	if (expectedBuffer.length !== actualBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, actualBuffer);
}
