import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';

export const Param = z.object({
	id: z.string().describe('Token ID')
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
export default new Endpoint({ Param, Output, Modifier }).handle(async (input, event) => {
	const userId = await requireApiAuth(event);

	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user || !user.teamId) {
		throw error(403, 'User must be part of a team to delete authenticator tokens');
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

	return { success: true };
});
