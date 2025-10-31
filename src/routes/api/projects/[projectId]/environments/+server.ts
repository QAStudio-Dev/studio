import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { generateEnvironmentId } from '$lib/server/ids';

// GET /api/projects/[projectId]/environments - List environments for project
export const GET: RequestHandler = async ({ params }) => {
	try {
		const environments = await db.environment.findMany({
			where: { projectId: params.projectId },
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: { testRuns: true }
				}
			}
		});
		return json(environments);
	} catch (error) {
		console.error('Error fetching environments:', error);
		return json({ error: 'Failed to fetch environments' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/environments - Create environment
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description } = data;

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const environment = await db.environment.create({
			data: {
				id: generateEnvironmentId(),
				name,
				description,
				projectId: params.projectId
			}
		});

		return json(environment, { status: 201 });
	} catch (error: any) {
		console.error('Error creating environment:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Project not found' }, { status: 404 });
		}
		if (error.code === 'P2002') {
			return json({ error: 'Environment name already exists in this project' }, { status: 409 });
		}
		return json({ error: 'Failed to create environment' }, { status: 500 });
	}
};
