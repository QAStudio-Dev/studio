import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '$lib/server/api-keys';
import { createAuditLog } from '$lib/server/audit';

/**
 * Create a new API key
 * POST /api/api-keys/create
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { name, expiresInDays } = await event.request.json();

	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw error(400, { message: 'API key name is required' });
	}

	if (name.length > 100) {
		throw error(400, { message: 'API key name must be 100 characters or less' });
	}

	// Generate the API key
	const apiKey = generateApiKey();
	const hashedKey = hashApiKey(apiKey);
	const prefix = getApiKeyPrefix(apiKey);

	// Calculate expiration date if provided
	let expiresAt: Date | null = null;
	if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
		expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expiresInDays);
	}

	// Get user info for audit log
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true, email: true }
	});

	// Save to database
	const savedKey = await db.apiKey.create({
		data: {
			name: name.trim(),
			key: hashedKey,
			prefix,
			userId,
			expiresAt
		},
		select: {
			id: true,
			name: true,
			prefix: true,
			expiresAt: true,
			createdAt: true
		}
	});

	// Audit API key creation
	await createAuditLog({
		userId,
		teamId: user?.teamId ?? undefined,
		action: 'API_KEY_CREATED',
		resourceType: 'ApiKey',
		resourceId: savedKey.id,
		metadata: {
			keyName: savedKey.name,
			keyPrefix: savedKey.prefix,
			expiresAt: savedKey.expiresAt?.toISOString()
		},
		event
	});

	// Return the plain API key only once (never stored in DB)
	return json({
		apiKey: savedKey,
		key: apiKey // Only returned on creation!
	});
};
