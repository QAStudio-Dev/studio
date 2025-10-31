import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { generateMilestoneId } from '$lib/server/ids';

// GET /api/projects/[projectId]/milestones - List milestones for project
export const GET: RequestHandler = async ({ params }) => {
	try {
		const milestones = await db.milestone.findMany({
			where: { projectId: params.projectId },
			orderBy: { createdAt: 'desc' },
			include: {
				_count: {
					select: { testRuns: true }
				}
			}
		});
		return json(milestones);
	} catch (error) {
		console.error('Error fetching milestones:', error);
		return json({ error: 'Failed to fetch milestones' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/milestones - Create milestone
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();
		const { name, description, dueDate, status } = data;

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const milestone = await db.milestone.create({
			data: {
				id: generateMilestoneId(),
				name,
				description,
				dueDate: dueDate ? new Date(dueDate) : null,
				status: status || 'ACTIVE',
				projectId: params.projectId
			}
		});

		return json(milestone, { status: 201 });
	} catch (error: any) {
		console.error('Error creating milestone:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Project not found' }, { status: 404 });
		}
		return json({ error: 'Failed to create milestone' }, { status: 500 });
	}
};
