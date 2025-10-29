import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/test-cases/[testCaseId]/results - Get paginated results for a test case
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const skip = (page - 1) * limit;

		const [results, total] = await Promise.all([
			db.testResult.findMany({
				where: { testCaseId: params.testCaseId },
				orderBy: { executedAt: 'desc' },
				skip,
				take: limit,
				include: {
					executor: {
						select: {
							firstName: true,
							lastName: true,
							email: true
						}
					},
					testRun: {
						select: {
							id: true,
							name: true
						}
					},
					attachments: {
						select: {
							id: true,
							filename: true,
							originalName: true,
							mimeType: true,
							size: true,
							url: true,
							createdAt: true
						},
						orderBy: {
							createdAt: 'asc'
						}
					}
				}
			}),
			db.testResult.count({ where: { testCaseId: params.testCaseId } })
		]);

		return json({
			data: results,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasMore: skip + results.length < total
			}
		});
	} catch (error) {
		console.error('Error fetching test case results:', error);
		return json({ error: 'Failed to fetch test case results' }, { status: 500 });
	}
};
