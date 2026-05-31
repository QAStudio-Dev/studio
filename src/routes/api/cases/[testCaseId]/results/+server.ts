import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { hasProjectAccess } from '$lib/server/access-control';
import { testResultStepsInclude } from '$lib/server/test-result-steps-select';
import type { RequestHandler } from './$types';

function parsePagination(url: URL) {
	const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
	const rawLimit = parseInt(url.searchParams.get('limit') || '10', 10);

	const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
	const limit =
		Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 10;

	return { page, limit, skip: (page - 1) * limit };
}

// GET /api/cases/[testCaseId]/results - Get paginated results for a test case
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;

	try {
		const userId = await requireAuth(event);
		const { page, limit, skip } = parsePagination(url);

		const testCase = await db.testCase.findUnique({
			where: { id: params.testCaseId },
			select: {
				id: true,
				project: {
					select: {
						createdBy: true,
						teamId: true
					}
				}
			}
		});

		if (!testCase) {
			return json({ error: 'Test case not found' }, { status: 404 });
		}

		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		if (!user) {
			throw error(401, { message: 'User not found' });
		}

		if (!hasProjectAccess(testCase.project, { id: userId, teamId: user.teamId })) {
			throw error(403, { message: 'You do not have access to this test case' });
		}

		const resultsWhere = {
			testCaseId: params.testCaseId,
			testCase: {
				project: {
					OR: [{ createdBy: userId }, ...(user.teamId ? [{ teamId: user.teamId }] : [])]
				}
			}
		};

		const [results, total] = await Promise.all([
			db.testResult.findMany({
				where: resultsWhere,
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
					},
					steps: testResultStepsInclude
				}
			}),
			db.testResult.count({ where: resultsWhere })
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
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching test case results:', err);
		return json({ error: 'Failed to fetch test case results' }, { status: 500 });
	}
};
