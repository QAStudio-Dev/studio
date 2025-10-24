import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[id] - Get single project
export const GET: RequestHandler = async ({ params }) => {
	try {
		const project = await db.project.findUnique({
			where: { id: params.id },
			include: {
				_count: {
					select: {
						testCases: true,
						testRuns: true,
						testSuites: true,
						milestones: true,
						environments: true
					}
				},
				milestones: {
					orderBy: { createdAt: 'desc' },
					take: 5
				},
				environments: {
					orderBy: { name: 'asc' }
				}
			}
		});

		if (!project) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		return json(project);
	} catch (error) {
		console.error('Error fetching project:', error);
		return json({ error: 'Failed to fetch project' }, { status: 500 });
	}
};

// PATCH /api/projects/[id] - Update project
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, key } = data;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (key !== undefined) updateData.key = key.toUpperCase();

		const project = await db.project.update({
			where: { id: params.id },
			data: updateData
		});

		return json(project);
	} catch (error: any) {
		console.error('Error updating project:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Project not found' }, { status: 404 });
		}
		if (error.code === 'P2002') {
			return json({ error: 'Project key already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to update project' }, { status: 500 });
	}
};

// DELETE /api/projects/[id] - Delete project
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.project.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting project:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Project not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete project' }, { status: 500 });
	}
};
