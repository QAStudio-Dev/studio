import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireCurrentSubscription } from '$lib/server/auth';
import { generateProjectId } from '$lib/server/ids';

/**
 * Create a new project
 * POST /api/projects/create
 */
export const POST: RequestHandler = async (event) => {
	// Check subscription status (free users allowed for 1st project)
	const { userId, user, isFree } = await requireCurrentSubscription(event);

	const { name, description, key } = await event.request.json();

	if (!name || typeof name !== 'string') {
		throw error(400, {
			message: 'Project name is required'
		});
	}

	if (!key || typeof key !== 'string') {
		throw error(400, {
			message: 'Project key is required'
		});
	}

	// Validate key format (uppercase letters and numbers only, 2-10 chars)
	if (!/^[A-Z0-9]{2,10}$/.test(key)) {
		throw error(400, {
			message: 'Project key must be 2-10 uppercase letters or numbers (e.g., "PROJ", "TEST123")'
		});
	}

	// Check if key already exists
	const existingProject = await db.project.findUnique({
		where: { key }
	});

	if (existingProject) {
		throw error(400, {
			message: 'Project key already exists. Please choose a different key.'
		});
	}

	// Check project limits for free users (pro users already checked by requireCurrentSubscription)
	if (isFree) {
		const projectCount = await db.project.count({
			where: user.teamId
				? {
						teamId: user.teamId
					}
				: {
						createdBy: userId,
						teamId: null
					}
		});

		if (projectCount >= 1) {
			throw error(402, {
				message:
					'Free plan is limited to 1 project. Upgrade to Pro for unlimited projects and AI features at /teams/new'
			});
		}
	}

	// Create the project with short ID
	const project = await db.project.create({
		data: {
			id: generateProjectId(),
			name,
			description,
			key,
			createdBy: userId,
			teamId: user.teamId
		},
		include: {
			creator: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true
				}
			}
		}
	});

	return json({ project });
};
