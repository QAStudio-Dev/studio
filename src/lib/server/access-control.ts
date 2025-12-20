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
 *
 * @param project - Project with creator and team information
 * @param user - User with ID and team information
 * @returns true if user has access, false otherwise
 */
export function hasProjectAccess(project: ProjectAccess, user: UserAccess): boolean {
	return (
		project.createdBy === user.id || (project.teamId !== null && user.teamId === project.teamId)
	);
}
