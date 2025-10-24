import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { unlink } from 'fs/promises';
import { join } from 'path';

// GET /api/attachments/[id] - Get attachment metadata
export const GET: RequestHandler = async ({ params }) => {
	try {
		const attachment = await db.attachment.findUnique({
			where: { id: params.id },
			include: {
				testCase: {
					select: {
						id: true,
						title: true
					}
				},
				testResult: {
					select: {
						id: true,
						testCase: {
							select: {
								title: true
							}
						}
					}
				}
			}
		});

		if (!attachment) {
			return json({ error: 'Attachment not found' }, { status: 404 });
		}

		return json(attachment);
	} catch (error) {
		console.error('Error fetching attachment:', error);
		return json({ error: 'Failed to fetch attachment' }, { status: 500 });
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

		// Delete file from disk
		try {
			const filepath = join(process.cwd(), 'uploads', 'attachments', attachment.filename);
			await unlink(filepath);
		} catch (fileError) {
			console.error('Error deleting file:', fileError);
			// Continue with database deletion even if file deletion fails
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
