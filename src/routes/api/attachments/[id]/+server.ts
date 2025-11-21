import { json, error as svelteError } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { deleteFromBlob } from '$lib/server/blob-storage';

// GET /api/attachments/[id] - Download/view attachment
// GET /api/attachments/[id]?metadata=true - Get attachment metadata only
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { id } = event.params;
	const metadata = event.url.searchParams.get('metadata') === 'true';

	try {
		const attachment = await db.attachment.findUnique({
			where: { id },
			include: {
				testCase: {
					select: {
						id: true,
						title: true,
						project: {
							include: {
								team: true
							}
						}
					}
				},
				testResult: {
					select: {
						id: true,
						testCase: {
							select: {
								title: true
							}
						},
						testRun: {
							include: {
								project: {
									include: {
										team: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!attachment) {
			throw svelteError(404, { message: 'Attachment not found' });
		}

		// Check access control
		const user = await db.user.findUnique({
			where: { id: userId }
		});

		const project = attachment.testResult?.testRun.project || attachment.testCase?.project;

		if (!project) {
			throw svelteError(404, { message: 'Associated project not found' });
		}

		const hasAccess =
			project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

		if (!hasAccess) {
			throw svelteError(403, { message: 'You do not have access to this attachment' });
		}

		// If metadata only, return JSON
		if (metadata) {
			return json(attachment);
		}

		// Redirect to Vercel Blob URL
		return new Response(null, {
			status: 302,
			headers: {
				Location: attachment.url,
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch (err: any) {
		console.error('Error fetching attachment:', err);
		if (err.status) throw err;
		throw svelteError(500, { message: 'Failed to fetch attachment' });
	}
};

// DELETE /api/attachments/[id] - Delete attachment
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const attachment = await db.attachment.findUnique({
			where: { id: params.id }
		});

		if (!attachment) {
			return json({ error: 'Attachment not found' }, { status: 404 });
		}

		// Delete file from Vercel Blob storage
		try {
			await deleteFromBlob(attachment.url);
		} catch (blobError) {
			console.error('Error deleting blob:', blobError);
			// Continue with database deletion even if blob deletion fails
		}

		// Delete database record
		await db.attachment.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting attachment:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Attachment not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete attachment' }, { status: 500 });
	}
};
