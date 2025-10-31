import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Get test results for a specific test run with pagination, search, and filters
 * GET /api/test-runs/[runId]/results
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - search: string (search in test case title)
 * - status: TestStatus (filter by status)
 * - priority: Priority (filter by priority)
 * - type: TestType (filter by type)
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { runId } = event.params;

	// Parse query params
	const url = new URL(event.request.url);
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
	const search = url.searchParams.get('search') || '';
	const status = url.searchParams.get('status') || undefined;
	const priority = url.searchParams.get('priority') || undefined;
	const type = url.searchParams.get('type') || undefined;

	const skip = (page - 1) * limit;

	// Verify test run access
	const testRun = await db.testRun.findUnique({
		where: { id: runId },
		include: {
			project: {
				include: {
					team: true
				}
			}
		}
	});

	if (!testRun) {
		throw error(404, { message: 'Test run not found' });
	}

	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Check access
	const hasAccess =
		testRun.project.createdBy === userId ||
		(testRun.project.teamId && user?.teamId === testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, { message: 'You do not have access to this test run' });
	}

	// Build where clause for test results
	const where: any = {
		testRunId: runId
	};

	// Filter by status
	if (status) {
		where.status = status;
	}

	// Build where clause for test case filtering
	const testCaseWhere: any = {};

	// Search in test case title
	if (search) {
		testCaseWhere.title = { contains: search, mode: 'insensitive' };
	}

	// Filter by priority
	if (priority) {
		testCaseWhere.priority = priority;
	}

	// Filter by type
	if (type) {
		testCaseWhere.type = type;
	}

	// If there are test case filters, add them to the where clause
	if (Object.keys(testCaseWhere).length > 0) {
		where.testCase = testCaseWhere;
	}

	// Get total count
	const total = await db.testResult.count({ where });

	// Get test results with nested suite hierarchy
	const testResults = await db.testResult.findMany({
		where,
		skip,
		take: limit,
		orderBy: { executedAt: 'desc' },
		include: {
			testCase: {
				include: {
					suite: {
						include: {
							parent: {
								include: {
									parent: {
										include: {
											parent: {
												include: {
													parent: true
												}
											}
										}
									}
								}
							}
						}
					}
				}
			},
			executor: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			},
			_count: {
				select: {
					attachments: true
				}
			}
		}
	});

	// Build suite path for each result (traverse parent chain)
	const resultsWithSuitePath = testResults.map((result) => {
		const suitePath: { id: string; name: string }[] = [];

		if (result.testCase.suite) {
			let currentSuite: any = result.testCase.suite;
			while (currentSuite) {
				suitePath.unshift({ id: currentSuite.id, name: currentSuite.name });
				currentSuite = currentSuite.parent;
			}
		}

		return {
			...result,
			testCase: {
				...result.testCase,
				suitePath
			}
		};
	});

	return json({
		testResults: resultsWithSuitePath,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit)
		}
	});
};
