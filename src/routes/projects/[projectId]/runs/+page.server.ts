import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generatePageMetaTags } from '$lib/utils/meta-tags';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	const { projectId } = params;

	// Execute auth checks in parallel for better performance
	const [project, user] = await Promise.all([
		db.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				name: true,
				key: true,
				createdBy: true,
				teamId: true
			}
		}),
		db.user.findUnique({
			where: { id: userId }
		})
	]);

	if (!project) {
		throw error(404, { message: 'Project not found' });
	}

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Check access: user must be creator, team member, or project is in their team
	// This matches the access control pattern used in other pages
	const hasAccess =
		project.createdBy === userId ||
		(project.teamId && user.teamId === project.teamId) ||
		(!project.teamId && project.createdBy === userId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this project' });
	}

	return {
		pageMetaTags: generatePageMetaTags(
			`Test Runs - ${project.name}`,
			`View and manage all test runs for the ${project.name} project (${project.key}). Track test execution progress, analyze results, and monitor quality metrics.`
		)
	};
};
