import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { createAuditLog, sanitizeMetadata } from '$lib/server/audit';
import { requireCsrfForSession } from '$lib/server/sessions';

export const Param = z.object({
	id: z.string().describe('Token ID')
});

export const Input = z.object({
	csrfToken: z.string().optional().describe('CSRF token for session-based auth')
});

export const Output = z.object({
	success: z.boolean()
});

export const Modifier = (r: any) => {
	r.tags = ['Authenticator Tokens'];
	r.summary = 'Delete authenticator token';
	r.description = 'Permanently delete an authenticator token.';
	return r;
};

/**
 * DELETE /api/authenticator-tokens/:id
 * Delete an authenticator token
 */
export default new Endpoint({ Param, Input, Output, Modifier }).handle(async (input, event) => {
	// Validate CSRF token for session-based auth
	try {
		requireCsrfForSession(event, input.csrfToken);
	} catch (e) {
		throw error(403, 'Invalid CSRF token');
	}

	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to delete authenticator tokens');
	}

	// RBAC: Only OWNER and ADMIN can manage authenticator tokens
	if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
		throw error(403, 'Only team owners and admins can delete authenticator tokens');
	}

	// Check token exists and belongs to user's team
	const existingToken = await db.authenticatorToken.findFirst({
		where: {
			id: input.id,
			teamId: user.teamId
		}
	});

	if (!existingToken) {
		throw error(404, 'Authenticator token not found');
	}

	// Delete token
	await db.authenticatorToken.delete({
		where: { id: input.id }
	});

	// Create audit log
	await createAuditLog({
		userId,
		teamId: user.teamId,
		action: 'AUTHENTICATOR_TOKEN_DELETED',
		resourceType: 'AuthenticatorToken',
		resourceId: input.id,
		metadata: sanitizeMetadata({
			tokenName: existingToken.name
		}),
		event
	});

	return { success: true };
});
