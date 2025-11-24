import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { userId } = locals.auth() || {};

	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	// Execute auth checks and data fetching in parallel
	const [project, user] = await Promise.all([
		db.project.findUnique({
			where: { id: params.projectId },
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true
					}
				},
				team: {
					include: {
						members: true
					}
				}
			}
		}),
		db.user.findUnique({
			where: { id: userId },
			include: {
				team: true
			}
		})
	]);

	if (!project) {
		throw error(404, {
			message: 'Project not found'
		});
	}

	if (!user) {
		throw error(401, { message: 'User not found' });
	}

	// Check access: user must be creator, team member, or project is in their team
	const hasAccess =
		project.createdBy === userId ||
		(project.teamId && user.teamId === project.teamId) ||
		(!project.teamId && project.createdBy === userId);

	if (!hasAccess) {
		throw error(403, {
			message: 'You do not have access to this project'
		});
	}

	// Execute all data queries in parallel for maximum performance
	const [statsResult, recentRunsData] = await Promise.all([
		// Single aggregation query for all statistics
		db.$queryRaw<
			Array<{
				totalTestCases: bigint;
				totalSuites: bigint;
				totalTestRuns: bigint;
				totalResults: bigint;
				passedResults: bigint;
			}>
		>`
			SELECT
				(SELECT COUNT(*) FROM "TestCase" WHERE "projectId" = ${project.id}) as "totalTestCases",
				(SELECT COUNT(*) FROM "TestSuite" WHERE "projectId" = ${project.id}) as "totalSuites",
				(SELECT COUNT(*) FROM "TestRun" WHERE "projectId" = ${project.id}) as "totalTestRuns",
				(SELECT COUNT(*) FROM "TestResult" tr
					INNER JOIN "TestRun" run ON run.id = tr."testRunId"
					WHERE run."projectId" = ${project.id}) as "totalResults",
				(SELECT COUNT(*) FROM "TestResult" tr
					INNER JOIN "TestRun" run ON run.id = tr."testRunId"
					WHERE run."projectId" = ${project.id} AND tr.status = 'PASSED') as "passedResults"
		`,
		// Single query for recent runs with aggregated result counts
		db.$queryRaw<
			Array<{
				id: string;
				name: string;
				description: string | null;
				status: string;
				createdAt: Date;
				environmentId: string | null;
				milestoneId: string | null;
				environmentName: string | null;
				environmentDescription: string | null;
				milestoneName: string | null;
				milestoneDescription: string | null;
				totalResults: bigint;
				passedResults: bigint;
				failedResults: bigint;
			}>
		>`
			SELECT
				tr.id,
				tr.name,
				tr.description,
				tr.status,
				tr."createdAt",
				tr."environmentId",
				tr."milestoneId",
				e.name as "environmentName",
				e.description as "environmentDescription",
				m.name as "milestoneName",
				m.description as "milestoneDescription",
				COUNT(result.id)::int as "totalResults",
				COUNT(result.id) FILTER (WHERE result.status = 'PASSED')::int as "passedResults",
				COUNT(result.id) FILTER (WHERE result.status = 'FAILED')::int as "failedResults"
			FROM "TestRun" tr
			LEFT JOIN "Environment" e ON e.id = tr."environmentId"
			LEFT JOIN "Milestone" m ON m.id = tr."milestoneId"
			LEFT JOIN "TestResult" result ON result."testRunId" = tr.id
			WHERE tr."projectId" = ${project.id}
			GROUP BY tr.id, tr.name, tr.description, tr.status, tr."createdAt",
				tr."environmentId", tr."milestoneId", e.name, e.description, m.name, m.description
			ORDER BY tr."createdAt" DESC
			LIMIT 5
		`
	]);

	// Convert BigInt to Number for JSON serialization
	const stats = {
		totalTestCases: Number(statsResult[0].totalTestCases),
		totalSuites: Number(statsResult[0].totalSuites),
		totalTestRuns: Number(statsResult[0].totalTestRuns),
		totalResults: Number(statsResult[0].totalResults),
		passedResults: Number(statsResult[0].passedResults)
	};

	// Transform recent runs data into expected format
	const recentRuns = recentRunsData.map((run) => ({
		id: run.id,
		name: run.name,
		description: run.description,
		status: run.status,
		createdAt: run.createdAt,
		environment: run.environmentId
			? {
					id: run.environmentId,
					name: run.environmentName!,
					description: run.environmentDescription
				}
			: null,
		milestone: run.milestoneId
			? {
					id: run.milestoneId,
					name: run.milestoneName!,
					description: run.milestoneDescription
				}
			: null,
		_count: {
			results: Number(run.totalResults),
			totalResults: Number(run.totalResults),
			passedResults: Number(run.passedResults),
			failedResults: Number(run.failedResults)
		}
	}));

	return {
		project,
		stats,
		recentRuns,
		currentUser: user
	};
};
