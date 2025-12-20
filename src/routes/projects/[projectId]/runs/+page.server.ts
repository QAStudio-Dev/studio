import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/login');
	}

	const { projectId } = params;

	// Fetch project info for meta tags
	const project = await db.project.findUnique({
		where: { id: projectId },
		select: {
			id: true,
			name: true,
			key: true,
			createdBy: true,
			teamId: true
		}
	});

	if (!project) {
		throw error(404, { message: 'Project not found' });
	}

	// Check access
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this project' });
	}

	return {
		pageMetaTags: {
			title: `Test Runs - ${project.name} | QA Studio`,
			description: `View and manage test runs for ${project.name} (${project.key})`
		}
	};
};
