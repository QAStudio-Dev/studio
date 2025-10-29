import { put, del } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Upload a file to Vercel Blob storage (production) or local storage (development)
 * @param filename The name to give the file (e.g., 'screenshots/test-123.png')
 * @param content The file content (Buffer, string, or ReadableStream)
 * @param options Additional options
 * @returns Object with url and downloadUrl
 */
export async function uploadToBlob(
	filename: string,
	content: Buffer | string,
	options?: {
		contentType?: string;
		access?: 'public';
	}
): Promise<{ url: string; downloadUrl: string }> {
	// Use local file storage only if no Vercel Blob token is available
	if (!BLOB_READ_WRITE_TOKEN) {
		try {
			// Create uploads directory structure
			const uploadsDir = join(process.cwd(), 'uploads', 'attachments');
			const filePath = join(uploadsDir, filename);
			const fileDir = join(uploadsDir, filename.split('/').slice(0, -1).join('/'));

			// Create directories if they don't exist
			await mkdir(fileDir, { recursive: true });

			// Write file
			const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
			await writeFile(filePath, buffer);

			// Return local URL
			const localUrl = `/api/attachments/local/${filename}`;
			return {
				url: localUrl,
				downloadUrl: localUrl
			};
		} catch (err) {
			console.error('Failed to save file locally:', err);
			throw new Error(`Failed to save attachment: ${err}`);
		}
	}

	// Upload to Vercel Blob (works in both dev and production when token is available)
	const blob = await put(filename, content, {
		access: options?.access || 'public',
		contentType: options?.contentType,
		token: BLOB_READ_WRITE_TOKEN
	});

	return {
		url: blob.url,
		downloadUrl: blob.downloadUrl || blob.url
	};
}

/**
 * Delete a file from Vercel Blob storage
 * @param url The URL of the blob to delete
 */
export async function deleteFromBlob(url: string): Promise<void> {
	// Skip deletion in development
	if (!BLOB_READ_WRITE_TOKEN || process.env.NODE_ENV === 'development') {
		return;
	}

	await del(url, {
		token: BLOB_READ_WRITE_TOKEN
	});
}

/**
 * Generate a unique filename for an attachment
 * @param originalName Original filename
 * @param testRunId Test run ID
 * @param testResultId Test result ID
 * @returns Unique filename with path
 */
export function generateAttachmentPath(
	originalName: string,
	testRunId: string,
	testResultId?: string
): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const extension = originalName.split('.').pop();
	const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '-');

	const folder = testResultId ? `results/${testResultId}` : `runs/${testRunId}`;

	return `${folder}/${baseName}-${timestamp}-${randomSuffix}.${extension}`;
}
