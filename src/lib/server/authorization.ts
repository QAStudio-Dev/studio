import { error } from 'sveltekit-api';
import { db } from './db';

/**
 * Authorization helpers for API endpoints
 * Provides reusable functions for checking access control
 */

/**
 * Check if a user has access to a project
 * User has access if they created the project OR belong to the same team
 */
export async function requireProjectAccess(
	userId: string,
	projectId: string
): Promise<{ project: any; user: any }> {
	const project = await db.project.findUnique({
		where: { id: projectId },
		include: { team: true }
	});

	if (!project) {
		throw error(404, 'Project not found');
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

	if (!hasAccess) {
		throw error(403, 'You do not have access to this project');
	}

	return { project, user };
}

/**
 * Check if a user has access to a test case
 * Access is granted through the test case's project
 */
export async function requireTestCaseAccess(
	userId: string,
	testCaseId: string
): Promise<{ testCase: any; user: any }> {
	const testCase = await db.testCase.findUnique({
		where: { id: testCaseId },
		include: {
			project: {
				include: {
					team: true
				}
			}
		}
	});

	if (!testCase) {
		throw error(404, 'Test case not found');
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		testCase.project.createdBy === userId ||
		(testCase.project.teamId && user?.teamId === testCase.project.teamId);

	if (!hasAccess) {
		throw error(403, 'You do not have access to this test case');
	}

	return { testCase, user };
}

/**
 * Check if a user has access to a test result
 * Access is granted through the test result's project (via test run)
 */
export async function requireTestResultAccess(
	userId: string,
	testResultId: string
): Promise<{ testResult: any; user: any }> {
	const testResult = await db.testResult.findUnique({
		where: { id: testResultId },
		include: {
			testRun: {
				include: {
					project: {
						include: {
							team: true
						}
					}
				}
			}
		}
	});

	if (!testResult) {
		throw error(404, 'Test result not found');
	}

	const user = await db.user.findUnique({
		where: { id: userId }
	});

	const hasAccess =
		testResult.testRun.project.createdBy === userId ||
		(testResult.testRun.project.teamId && user?.teamId === testResult.testRun.project.teamId);

	if (!hasAccess) {
		throw error(403, 'You do not have access to this test result');
	}

	return { testResult, user };
}
