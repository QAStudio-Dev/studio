import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import type {
	ProjectWithCounts,
	ProjectResponse,
	CreateProjectBody,
	ErrorResponse
} from '$lib/api/schemas';

// GET /api/projects - List all projects
export const GET: RequestHandler = async (event) => {
	try {
		// Require authentication
		await requireAuth(event);

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

		const response: ProjectWithCounts[] = projects;
		return json(response);
	} catch (error) {
		console.error('Error fetching projects:', error);
		const errorResponse: ErrorResponse = { error: 'Failed to fetch projects' };
		return json(errorResponse, { status: 500 });
	}
};

// POST /api/projects - Create new project
export const POST: RequestHandler = async (event) => {
	try {
		// Require authentication
		const userId = await requireAuth(event);

		const data = await event.request.json();
		const { name, description, key } = data;

		if (!name || !key) {
			const errorResponse: ErrorResponse = { error: 'Name and key are required' };
			return json(errorResponse, { status: 400 });
		}

		const project = await db.project.create({
			data: {
				name,
				description,
				key: key.toUpperCase(),
				createdBy: userId
			}
		});

		const response: ProjectResponse = project;
		return json(response, { status: 201 });
	} catch (error: any) {
		console.error('Error creating project:', error);
		if (error.code === 'P2002') {
			const errorResponse: ErrorResponse = { error: 'Project key already exists' };
			return json(errorResponse, { status: 409 });
		}
		const errorResponse: ErrorResponse = { error: 'Failed to create project' };
		return json(errorResponse, { status: 500 });
	}
};
