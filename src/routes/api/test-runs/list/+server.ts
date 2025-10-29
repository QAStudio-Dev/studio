import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';

/**
 * Get test runs with pagination, search, and filters
 * GET /api/test-runs/list
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (search in name and description)
 * - projectId: string (filter by project)
 * - status: RunStatus (filter by status)
 * - environmentId: string (filter by environment)
 * - milestoneId: string (filter by milestone)
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Parse query params
	const url = new URL(event.request.url);
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
	const search = url.searchParams.get('search') || '';
	const projectId = url.searchParams.get('projectId') || undefined;
	const status = url.searchParams.get('status') || undefined;
	const environmentId = url.searchParams.get('environmentId') || undefined;
	const milestoneId = url.searchParams.get('milestoneId') || undefined;

	const skip = (page - 1) * limit;

	// Build where clause
	const where: any = {};

	// Search in name and description
	if (search) {
		where.OR = [
			{ name: { contains: search, mode: 'insensitive' } },
			{ description: { contains: search, mode: 'insensitive' } }
		];
	}

	// Filter by project
	if (projectId) {
		where.projectId = projectId;
	}

	// Filter by status
	if (status) {
		where.status = status;
	}

	// Filter by environment
	if (environmentId) {
		where.environmentId = environmentId;
	}

	// Filter by milestone
	if (milestoneId) {
		where.milestoneId = milestoneId;
	}

	// Only show test runs from projects the user has access to
	// Get user with team info
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	// Find all projects user has access to
	const accessibleProjects = await db.project.findMany({
		where: {
			OR: [
				{ createdBy: userId },
				...(user?.teamId ? [{ teamId: user.teamId }] : [])
			]
		},
		select: { id: true }
	});

	const accessibleProjectIds = accessibleProjects.map(p => p.id);

	// Add project access filter
	where.projectId = projectId || { in: accessibleProjectIds };

	// Get total count
	const total = await db.testRun.count({ where });

	// Get test runs
	const testRuns = await db.testRun.findMany({
		where,
		skip,
		take: limit,
		orderBy: { createdAt: 'desc' },
		include: {
			project: {
				select: {
					id: true,
					name: true,
					key: true
				}
			},
			environment: {
				select: {
					id: true,
					name: true
				}
			},
			milestone: {
				select: {
					id: true,
					name: true
				}
			},
			creator: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			},
			_count: {
				select: {
					results: true
				}
			}
		}
	});

	// Calculate statistics for each test run
	const testRunsWithStats = await Promise.all(
		testRuns.map(async (testRun) => {
			const stats = await db.testResult.groupBy({
				by: ['status'],
				where: { testRunId: testRun.id },
				_count: true
			});

			const statusCounts = stats.reduce((acc, stat) => {
				acc[stat.status] = stat._count;
				return acc;
			}, {} as Record<string, number>);

			return {
				...testRun,
				stats: {
					total: testRun._count.results,
					passed: statusCounts.PASSED || 0,
					failed: statusCounts.FAILED || 0,
					blocked: statusCounts.BLOCKED || 0,
					skipped: statusCounts.SKIPPED || 0,
					retest: statusCounts.RETEST || 0,
					untested: statusCounts.UNTESTED || 0
				}
			};
		})
	);

	return json({
		testRuns: testRunsWithStats,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit)
		}
	});
};
