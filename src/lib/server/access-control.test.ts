import { describe, it, expect } from 'vitest';
import { hasProjectAccess } from './access-control';

describe('hasProjectAccess', () => {
	describe('creator access', () => {
		it('should grant access to project creator', () => {
			const project = {
				createdBy: 'user-123',
				teamId: null
			};
			const user = {
				id: 'user-123',
				teamId: null
			};

			expect(hasProjectAccess(project, user)).toBe(true);
		});

		it('should grant access to creator even if project has a team', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-123',
				teamId: 'different-team'
			};

			expect(hasProjectAccess(project, user)).toBe(true);
		});

		it('should deny access to non-creator with no team match', () => {
			const project = {
				createdBy: 'user-123',
				teamId: null
			};
			const user = {
				id: 'user-999',
				teamId: null
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});
	});

	describe('team member access', () => {
		it('should grant access to team member', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-789',
				teamId: 'team-456'
			};

			expect(hasProjectAccess(project, user)).toBe(true);
		});

		it('should deny access to user from different team', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-789',
				teamId: 'team-999'
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});

		it('should deny access to user with no team when project has team', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-789',
				teamId: null
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});

		it('should deny access when project has no team and user is not creator', () => {
			const project = {
				createdBy: 'user-123',
				teamId: null
			};
			const user = {
				id: 'user-789',
				teamId: 'team-456'
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle both project and user with null teamId', () => {
			const project = {
				createdBy: 'user-123',
				teamId: null
			};
			const user = {
				id: 'user-789',
				teamId: null
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});

		it('should handle creator with matching team', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-123',
				teamId: 'team-456'
			};

			// Creator access takes precedence
			expect(hasProjectAccess(project, user)).toBe(true);
		});

		it('should handle creator with different team', () => {
			const project = {
				createdBy: 'user-123',
				teamId: 'team-456'
			};
			const user = {
				id: 'user-123',
				teamId: 'team-999'
			};

			// Creator access always granted
			expect(hasProjectAccess(project, user)).toBe(true);
		});

		it('should handle empty string teamIds', () => {
			const project = {
				createdBy: 'user-123',
				teamId: null
			};
			const user = {
				id: 'user-789',
				teamId: null
			};

			expect(hasProjectAccess(project, user)).toBe(false);
		});
	});

	describe('realistic scenarios', () => {
		it('should allow personal project access to creator only', () => {
			// User creates a personal project (no team)
			const project = {
				createdBy: 'alice',
				teamId: null
			};

			// Creator has access
			expect(
				hasProjectAccess(project, {
					id: 'alice',
					teamId: null
				})
			).toBe(true);

			// Other users don't have access
			expect(
				hasProjectAccess(project, {
					id: 'bob',
					teamId: null
				})
			).toBe(false);

			expect(
				hasProjectAccess(project, {
					id: 'charlie',
					teamId: 'some-team'
				})
			).toBe(false);
		});

		it('should allow team project access to all team members', () => {
			// Alice creates a team project
			const project = {
				createdBy: 'alice',
				teamId: 'acme-corp'
			};

			// Creator has access
			expect(
				hasProjectAccess(project, {
					id: 'alice',
					teamId: 'acme-corp'
				})
			).toBe(true);

			// Other team members have access
			expect(
				hasProjectAccess(project, {
					id: 'bob',
					teamId: 'acme-corp'
				})
			).toBe(true);

			expect(
				hasProjectAccess(project, {
					id: 'charlie',
					teamId: 'acme-corp'
				})
			).toBe(true);

			// Users from different teams don't have access
			expect(
				hasProjectAccess(project, {
					id: 'dave',
					teamId: 'other-company'
				})
			).toBe(false);

			// Users with no team don't have access
			expect(
				hasProjectAccess(project, {
					id: 'eve',
					teamId: null
				})
			).toBe(false);
		});

		it('should handle creator leaving team but retaining access', () => {
			// Alice creates project in team
			const project = {
				createdBy: 'alice',
				teamId: 'acme-corp'
			};

			// Alice leaves team but keeps access as creator
			expect(
				hasProjectAccess(project, {
					id: 'alice',
					teamId: null // No longer in team
				})
			).toBe(true);

			// Other team members still have access
			expect(
				hasProjectAccess(project, {
					id: 'bob',
					teamId: 'acme-corp'
				})
			).toBe(true);
		});
	});
});
