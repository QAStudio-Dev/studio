import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Serve local attachment files in development
 * GET /api/attachments/local/[...path]
 */
export const GET: RequestHandler = async ({ params }) => {
	// Only allow in development
	if (process.env.NODE_ENV === 'production') {
		throw error(404, { message: 'Not found' });
	}

	const { path } = params;

	if (!path) {
		throw error(400, { message: 'Path is required' });
	}

	// Construct file path
	const filePath = join(process.cwd(), 'uploads', 'attachments', path);

	// Security: Prevent path traversal
	const uploadsDir = join(process.cwd(), 'uploads', 'attachments');
	if (!filePath.startsWith(uploadsDir)) {
		throw error(403, { message: 'Access denied' });
	}

	// Check if file exists
	if (!existsSync(filePath)) {
		throw error(404, { message: 'File not found' });
	}

	try {
		// Read file
		const fileBuffer = await readFile(filePath);

		// Determine content type from extension
		const ext = path.split('.').pop()?.toLowerCase();
		const contentTypes: Record<string, string> = {
			png: 'image/png',
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			gif: 'image/gif',
			webp: 'image/webp',
			webm: 'video/webm',
			mp4: 'video/mp4',
			mov: 'video/quicktime',
			zip: 'application/zip',
			json: 'application/json',
			txt: 'text/plain',
			md: 'text/markdown',
			html: 'text/html',
			css: 'text/css',
			js: 'application/javascript'
		};

		const contentType = contentTypes[ext || ''] || 'application/octet-stream';

		// Return file
		return new Response(fileBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				'Content-Length': fileBuffer.length.toString()
			}
		});
	} catch (err: any) {
		console.error('Error serving local file:', err);
		throw error(500, { message: 'Failed to read file' });
	}
};
