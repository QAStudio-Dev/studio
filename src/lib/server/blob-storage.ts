import { put, del } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';

/**
 * Upload a file to Vercel Blob storage
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
	// Require Vercel Blob token - no local storage fallback
	if (!BLOB_READ_WRITE_TOKEN) {
		throw new Error(
			'BLOB_READ_WRITE_TOKEN is required. Please configure Vercel Blob storage in your environment variables.'
		);
	}

	// Upload to Vercel Blob
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
	if (!BLOB_READ_WRITE_TOKEN) {
		throw new Error(
			'BLOB_READ_WRITE_TOKEN is required. Please configure Vercel Blob storage in your environment variables.'
		);
	}

	// Delete from Vercel Blob
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
