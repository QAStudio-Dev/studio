import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sanitizeForMeta } from '$lib/utils/sanitize-meta';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Fetch project and user data in parallel for access control and meta tags
	const [project, user] = await Promise.all([
		db.project.findUnique({
			where: { id: params.projectId },
			select: {
				id: true,
				name: true,
				key: true,
				createdBy: true,
				teamId: true
			}
		}),
		db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				teamId: true
			}
		})
	]);

	if (!project) {
		throw error(404, { message: 'Project not found' });
	}

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Check access: user must be creator, team member, or project is in their team
	const hasAccess =
		project.createdBy === userId ||
		(project.teamId && user.teamId === project.teamId) ||
		(!project.teamId && project.createdBy === userId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this project' });
	}

	return {
		project,
		pageMetaTags: {
			title: `Test Runs - ${sanitizeForMeta(project.name)}`,
			description: `View and manage all test runs for the ${sanitizeForMeta(project.name)} project (${sanitizeForMeta(project.key)}). Track test execution progress, analyze results, and monitor quality metrics.`
		}
	};
};
