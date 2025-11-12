import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifySignedUrl } from '$lib/server/signed-urls';

/**
 * Public endpoint for serving trace files with signed URL verification
 * This allows external services (like trace.playwright.dev) to access trace files
 * without authentication, using time-limited signed URLs instead.
 */
export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const { attachmentId } = params;
	const signature = url.searchParams.get('signature');
	const expiresParam = url.searchParams.get('expires');

	// Verify required parameters
	if (!signature || !expiresParam) {
		throw error(400, 'Missing signature or expiration parameter');
	}

	const expires = parseInt(expiresParam, 10);
	if (isNaN(expires)) {
		throw error(400, 'Invalid expiration parameter');
	}

	// Verify signature
	const verification = verifySignedUrl(attachmentId, signature, expires);
	if (!verification.valid) {
		throw error(403, verification.error || 'Invalid or expired URL');
	}

	// Fetch attachment from database
	const attachment = await db.attachment.findUnique({
		where: { id: attachmentId }
	});

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	// Only allow trace files through this endpoint for security
	if (!attachment.mimeType.includes('zip') && !attachment.mimeType.includes('application/zip')) {
		throw error(403, 'This endpoint only serves trace files');
	}

	try {
		// If it's a local file path, serve from uploads directory
		if (attachment.url.startsWith('/api/attachments/local/')) {
			const { readFile } = await import('fs/promises');
			const { join } = await import('path');

			const filename = attachment.url.replace('/api/attachments/local/', '');
			const filePath = join(process.cwd(), 'uploads', 'attachments', filename);

			const buffer = await readFile(filePath);

			// Return file with appropriate headers for CORS
			return new Response(buffer, {
				headers: {
					'Content-Type': attachment.mimeType,
					'Content-Length': attachment.size.toString(),
					'Content-Disposition': `inline; filename="${attachment.originalName}"`,
					'Cache-Control': 'public, max-age=3600',
					// CORS headers to allow trace.playwright.dev to access the file
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Range'
				}
			});
		}

		// Otherwise, fetch from Vercel Blob storage URL directly
		const response = await fetch(attachment.url);

		if (!response.ok) {
			throw error(404, 'File not found in storage');
		}

		// Get the blob data
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Return file with appropriate headers for CORS
		return new Response(buffer, {
			headers: {
				'Content-Type': attachment.mimeType,
				'Content-Length': attachment.size.toString(),
				'Content-Disposition': `inline; filename="${attachment.originalName}"`,
				'Cache-Control': 'public, max-age=3600',
				// CORS headers to allow trace.playwright.dev to access the file
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Range'
			}
		});
	} catch (err: any) {
		console.error(`Failed to fetch attachment ${attachmentId}:`, err);
		throw error(500, 'Failed to retrieve file');
	}
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Range',
			'Access-Control-Max-Age': '86400' // 24 hours
		}
	});
};
