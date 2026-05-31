import { db } from '$lib/server/db';
import { getCachedOrFetch, CacheKeys, CacheTTL } from '$lib/server/redis';
import { serializeDates } from '$lib/utils/date';

export type AccessibleProjectNav = {
	id: string;
	name: string;
	key: string;
};

export type AccessibleProjectWithCounts = AccessibleProjectNav & {
	description: string | null;
	createdBy: string;
	teamId: string | null;
	createdAt: Date;
	updatedAt: Date;
	_count: {
		testCases: number;
		testRuns: number;
		testSuites: number;
	};
};

function buildAccessibleProjectsWhere(userId: string, teamId: string | null | undefined) {
	const whereClause: {
		OR: Array<{ createdBy: string } | { teamId: string }>;
	} = {
		OR: [{ createdBy: userId }]
	};

	if (teamId) {
		whereClause.OR.push({ teamId });
	}

	return whereClause;
}

async function fetchAccessibleProjectsNav(userId: string): Promise<AccessibleProjectNav[]> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	return db.project.findMany({
		where: buildAccessibleProjectsWhere(userId, user?.teamId),
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			key: true
		}
	});
}

async function fetchAccessibleProjectsWithCounts(
	userId: string
): Promise<AccessibleProjectWithCounts[]> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { teamId: true }
	});

	return db.project.findMany({
		where: buildAccessibleProjectsWhere(userId, user?.teamId),
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			key: true,
			description: true,
			createdBy: true,
			teamId: true,
			createdAt: true,
			updatedAt: true,
			_count: {
				select: {
					testCases: true,
					testRuns: true,
					testSuites: true
				}
			}
		}
	});
}

/**
 * Cached project list for API and dashboard (includes counts).
 */
export async function getAccessibleProjectsWithCounts(
	userId: string
): Promise<AccessibleProjectWithCounts[]> {
	const projects = await getCachedOrFetch(
		CacheKeys.projects(userId),
		() => fetchAccessibleProjectsWithCounts(userId),
		CacheTTL.project
	);
	return projects;
}

/**
 * Sidebar / header navigation projects (id, name, key only; no aggregate counts).
 */
export async function getAccessibleProjectsNav(userId: string): Promise<AccessibleProjectNav[]> {
	return fetchAccessibleProjectsNav(userId);
}

/**
 * Serialized projects for API responses.
 */
export async function getAccessibleProjectsForApi(userId: string) {
	const projects = await getAccessibleProjectsWithCounts(userId);
	return serializeDates(projects);
}
