import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generateSignedUrl } from '$lib/server/signed-urls';
import { env } from '$env/dynamic/public';

/**
 * Generate a signed URL for an attachment (authenticated endpoint)
 * This allows the frontend to get a temporary public URL for trace files
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const { attachmentId } = params;

	// Get expiration from query params (default: 1 hour)
	const expiresInMinutes = parseInt(url.searchParams.get('expiresIn') || '60', 10);
	const expiresInMs = expiresInMinutes * 60 * 1000;

	// Validate expiration (max 24 hours)
	if (expiresInMs > 24 * 60 * 60 * 1000) {
		throw error(400, 'Expiration cannot exceed 24 hours');
	}

	// Verify attachment exists
	const attachment = await db.attachment.findUnique({
		where: { id: attachmentId },
		select: {
			id: true,
			mimeType: true,
			originalName: true
		}
	});

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	// Generate signed URL
	const { signature, expires } = generateSignedUrl(attachmentId, expiresInMs);

	// Get base URL from environment or request
	const baseUrl = env.PUBLIC_BASE_URL || url.origin;

	// Construct full signed URL
	const signedUrl = `${baseUrl}/api/traces/${attachmentId}?signature=${signature}&expires=${expires}`;

	return json({
		signedUrl,
		expires: new Date(expires).toISOString(),
		expiresIn: expiresInMs,
		attachmentId: attachment.id,
		fileName: attachment.originalName
	});
};
