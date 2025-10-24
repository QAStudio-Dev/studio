import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

// GET /api/projects - List all projects
export const GET: RequestHandler = async (event) => {
	try {
		// Require authentication
		requireAuth(event);

		const projects = await db.project.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				_count: {
					select: {
						testCases: true,
						testRuns: true,
						testSuites: true
					}
				}
			}
		});
		return json(projects);
	} catch (error) {
		console.error('Error fetching projects:', error);
		return json({ error: 'Failed to fetch projects' }, { status: 500 });
	}
};

// POST /api/projects - Create new project
export const POST: RequestHandler = async (event) => {
	try {
		// Require authentication
		const userId = requireAuth(event);

		const data = await event.request.json();
		const { name, description, key } = data;

		if (!name || !key) {
			return json({ error: 'Name and key are required' }, { status: 400 });
		}

		const project = await db.project.create({
			data: {
				name,
				description,
				key: key.toUpperCase(),
				createdBy: userId
			}
		});

		return json(project, { status: 201 });
	} catch (error: any) {
		console.error('Error creating project:', error);
		if (error.code === 'P2002') {
			return json({ error: 'Project key already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to create project' }, { status: 500 });
	}
};
