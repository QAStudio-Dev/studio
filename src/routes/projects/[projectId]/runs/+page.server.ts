import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sanitizeForMeta } from '$lib/utils/sanitize-meta';
import { hasProjectAccess } from '$lib/server/access-control';
import type { PageMetaTags } from '$lib/types/meta';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.userId;

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

	// Check access: user must be creator or team member
	if (!hasProjectAccess(project, user)) {
		throw error(403, { message: 'You do not have access to this project' });
	}

	const pageMetaTags: PageMetaTags = {
		title: `Test Runs - ${sanitizeForMeta(project.name)}`,
		description: `View test runs for ${sanitizeForMeta(project.name)} (${sanitizeForMeta(project.key)}). Track execution and analyze results.`
	};

	return {
		project,
		pageMetaTags
	};
};
