import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generateSignedUrl } from '$lib/server/signed-urls';
import { env } from '$env/dynamic/public';

/**
 * Generate a signed URL for an attachment (authenticated endpoint)
 * This allows the frontend to get a temporary public URL for trace files
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const { attachmentId } = params;

	// Require authentication
	const { userId } = locals.auth() || {};
	if (!userId) {
		throw error(401, 'Authentication required');
	}

	// Get expiration from query params (default: 1 hour)
	const expiresInMinutes = parseInt(url.searchParams.get('expiresIn') || '60', 10);

	// Validate expiration (1 minute to 24 hours)
	if (isNaN(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 1440) {
		throw error(400, 'Expiration must be between 1 and 1440 minutes');
	}

	const expiresInMs = expiresInMinutes * 60 * 1000;

	// Verify attachment exists and check user has access
	const attachment = await db.attachment.findUnique({
		where: { id: attachmentId },
		select: {
			id: true,
			mimeType: true,
			originalName: true,
			testResult: {
				select: {
					testRun: {
						select: {
							project: {
								select: {
									id: true,
									createdBy: true,
									teamId: true
								}
							}
						}
					}
				}
			}
		}
	});

	if (!attachment) {
		throw error(404, 'Attachment not found');
	}

	// Check user has access to the project
	const project = attachment.testResult?.testRun?.project;
	if (!project) {
		throw error(404, 'Project not found for attachment');
	}

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	// Verify access: user must be project creator OR in same team
	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, 'You do not have access to this attachment');
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
