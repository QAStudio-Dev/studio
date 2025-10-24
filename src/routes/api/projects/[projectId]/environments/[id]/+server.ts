import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/environments/[id] - Get single environment
export const GET: RequestHandler = async ({ params }) => {
	try {
		const environment = await db.environment.findFirst({
			where: {
				id: params.id,
				projectId: params.projectId
			},
			include: {
				_count: {
					select: { testRuns: true }
				}
			}
		});

		if (!environment) {
			return json({ error: 'Environment not found' }, { status: 404 });
		}

		return json(environment);
	} catch (error) {
		console.error('Error fetching environment:', error);
		return json({ error: 'Failed to fetch environment' }, { status: 500 });
	}
};

// PATCH /api/projects/[projectId]/environments/[id] - Update environment
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description } = data;

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;

		const environment = await db.environment.update({
			where: { id: params.id },
			data: updateData
		});

		return json(environment);
	} catch (error: any) {
		console.error('Error updating environment:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Environment not found' }, { status: 404 });
		}
		if (error.code === 'P2002') {
			return json({ error: 'Environment name already exists in this project' }, { status: 409 });
		}
		return json({ error: 'Failed to update environment' }, { status: 500 });
	}
};

// DELETE /api/projects/[projectId]/environments/[id] - Delete environment
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await db.environment.delete({
			where: { id: params.id }
		});

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting environment:', error);
		if (error.code === 'P2025') {
			return json({ error: 'Environment not found' }, { status: 404 });
		}
		return json({ error: 'Failed to delete environment' }, { status: 500 });
	}
};
