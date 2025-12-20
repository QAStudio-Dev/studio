/**
 * Access control utilities for checking user permissions
 */

type ProjectAccess = {
	createdBy: string;
	teamId: string | null;
};

type UserAccess = {
	id: string;
	teamId: string | null;
};

/**
 * Check if a user has access to a project
 *
 * Access is granted if:
 * 1. User is the project creator
 * 2. User is a member of the project's team (if project has a team)
 * 3. Project has no team and user is the creator (redundant with #1, but explicit)
 *
 * @param project - Project with creator and team information
 * @param user - User with ID and team information
 * @param userId - User ID to check (usually same as user.id)
 * @returns true if user has access, false otherwise
 */
export function hasProjectAccess(
	project: ProjectAccess,
	user: UserAccess,
	userId: string
): boolean {
	return (
		project.createdBy === userId ||
		(project.teamId !== null && user.teamId === project.teamId) ||
		(project.teamId === null && project.createdBy === userId)
	);
}
