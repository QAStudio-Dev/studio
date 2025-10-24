import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

// POST /api/attachments - Upload attachment
export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const testCaseId = formData.get('testCaseId') as string | null;
		const testResultId = formData.get('testResultId') as string | null;

		if (!file) {
			return json({ error: 'File is required' }, { status: 400 });
		}

		// Generate unique filename
		const ext = file.name.split('.').pop();
		const filename = `${randomBytes(16).toString('hex')}.${ext}`;

		// Create uploads directory if it doesn't exist
		const uploadDir = join(process.cwd(), 'uploads', 'attachments');
		await mkdir(uploadDir, { recursive: true });

		// Write file to disk
		const filepath = join(uploadDir, filename);
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);

		// Create database record
		const attachment = await db.attachment.create({
			data: {
				filename,
				originalName: file.name,
				mimeType: file.type,
				size: file.size,
				url: `/uploads/attachments/${filename}`,
				testCaseId: testCaseId || null,
				testResultId: testResultId || null
			}
		});

		return json(attachment, { status: 201 });
	} catch (error: any) {
		console.error('Error uploading attachment:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Test case or test result not found' }, { status: 404 });
		}
		return json({ error: 'Failed to upload attachment' }, { status: 500 });
	}
};

// GET /api/attachments - List attachments (optional filters)
export const GET: RequestHandler = async ({ url }) => {
	try {
		const testCaseId = url.searchParams.get('testCaseId');
		const testResultId = url.searchParams.get('testResultId');

		const where: any = {};
		if (testCaseId) where.testCaseId = testCaseId;
		if (testResultId) where.testResultId = testResultId;

		const attachments = await db.attachment.findMany({
			where,
			orderBy: { createdAt: 'desc' }
		});

		return json(attachments);
	} catch (error) {
		console.error('Error fetching attachments:', error);
		return json({ error: 'Failed to fetch attachments' }, { status: 500 });
	}
};
