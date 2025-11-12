import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// GET /api/projects/[projectId]/test-runs/[runId]/results - List results for test run
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const status = url.searchParams.get('status');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const skip = (page - 1) * limit;

		const where: any = { testRunId: params.runId };
		if (status) where.status = status;

		const [results, total] = await Promise.all([
			db.testResult.findMany({
				where,
				orderBy: { executedAt: 'desc' },
				skip,
				take: limit,
				include: {
					testCase: {
						select: {
							id: true,
							title: true,
							priority: true,
							type: true,
							suite: {
								select: {
									id: true,
									name: true
								}
							}
						}
					},
					_count: {
						select: {
							attachments: true,
							steps: true
						}
					}
				}
			}),
			db.testResult.count({ where })
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
		console.error('Error fetching test results:', error);
		return json({ error: 'Failed to fetch test results' }, { status: 500 });
	}
};

// POST /api/projects/[projectId]/test-runs/[runId]/results - Create test result
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { userId } = locals.auth() || {};
		const data = await request.json();
		const { testCaseId, status, comment, duration, stackTrace, errorMessage, steps } = data;

		if (!testCaseId || !status) {
			return json({ error: 'Test case ID and status are required' }, { status: 400 });
		}

		// Create result with steps if provided
		const result = await db.testResult.create({
			data: {
				testCaseId: testCaseId,
				testRunId: params.runId,
				status: status,
				comment: comment || null,
				duration: duration || null,
				stackTrace: stackTrace || null,
				errorMessage: errorMessage || null,
				executedBy: userId || 'anonymous',
				steps: steps
					? {
							create: steps.map((step: any, index: number) => ({
								stepNumber: index + 1,
								description: step.description,
								status: step.status,
								comment: step.comment || null
							}))
						}
					: undefined
			},
			include: {
				steps: true,
				testCase: {
					select: {
						id: true,
						title: true
					}
				}
			}
		});

		return json(result, { status: 201 });
	} catch (error: any) {
		console.error('Error creating test result:', error);
		if (error.code === 'P2003') {
			return json({ error: 'Test case or test run not found' }, { status: 404 });
		}
		return json({ error: 'Failed to create test result' }, { status: 500 });
	}
};
