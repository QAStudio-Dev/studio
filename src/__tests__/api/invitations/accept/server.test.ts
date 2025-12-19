import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../routes/api/invitations/[token]/accept/+server';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		teamInvitation: {
			findUnique: vi.fn(),
			update: vi.fn()
		},
		user: {
			update: vi.fn(),
			findUnique: vi.fn()
		},
		$transaction: vi.fn((operations) => Promise.all(operations))
	}
}));

vi.mock('$lib/server/auth', () => ({
	requireAuth: vi.fn()
}));

vi.mock('$lib/server/users', () => ({
	ensureUser: vi.fn(),
	getUserDisplayName: vi.fn((user) => {
		if (!user.firstName && !user.lastName) return user.email;
		const parts = [];
		if (user.firstName) parts.push(user.firstName);
		if (user.lastName) parts.push(user.lastName);
		return parts.join(' ');
	})
}));

vi.mock('$lib/server/redis', () => ({
	deleteCache: vi.fn(),
	CacheKeys: {
		projects: (userId: string) => `projects:${userId}`,
		teamStatus: (teamId: string) => `team:${teamId}:status`
	}
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

vi.mock('$lib/server/email', () => {
	return {
		sendInvitationAcceptedEmail: vi.fn(() => Promise.resolve({ success: true }))
	};
});

import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { ensureUser } from '$lib/server/users';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { createAuditLog } from '$lib/server/audit';
import { sendInvitationAcceptedEmail } from '$lib/server/email';

describe('POST /api/invitations/[token]/accept', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { token: 'test_token_123' },
			request: new Request('http://localhost/api/invitations/test_token_123/accept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful invitation acceptance', () => {
		it('should accept valid pending invitation', async () => {
			// Mock auth
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			// Mock valid pending invitation
			const mockInvitation = {
				id: 'inv123',
				token: 'test_token_123',
				teamId: 'team123',
				email: 'invitee@example.com',
				role: 'TESTER',
				status: 'PENDING',
				invitedBy: 'owner123',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
				team: {
					name: 'Test Team',
					subscription: {
						seats: 5
					},
					members: [{ id: 'owner123' }]
				}
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			// Mock inviter lookup for email notification
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'owner123',
				email: 'owner@example.com',
				firstName: 'Team',
				lastName: 'Owner'
			} as any);

			// Mock transaction operations
			vi.mocked(db.$transaction).mockResolvedValue([
				{ id: 'user123', teamId: 'team123', role: 'TESTER' },
				{ id: 'inv123', status: 'ACCEPTED', acceptedAt: new Date() }
			] as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.team.id).toBe('team123');
			expect(result.team.name).toBe('Test Team');

			// Verify cache invalidation
			expect(vi.mocked(deleteCache)).toHaveBeenCalledWith([
				CacheKeys.projects('user123'),
				CacheKeys.teamStatus('team123')
			]);

			// Verify audit logs
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledTimes(2);
			expect(vi.mocked(createAuditLog)).toHaveBeenNthCalledWith(1, {
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_INVITATION_ACCEPTED',
				resourceType: 'TeamInvitation',
				resourceId: 'inv123',
				metadata: {
					teamName: 'Test Team',
					userEmail: 'invitee@example.com',
					role: 'TESTER'
				},
				event: mockEvent
			});
			expect(vi.mocked(createAuditLog)).toHaveBeenNthCalledWith(2, {
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_MEMBER_ADDED',
				resourceType: 'Team',
				resourceId: 'team123',
				metadata: {
					teamName: 'Test Team',
					memberEmail: 'invitee@example.com',
					role: 'TESTER'
				},
				event: mockEvent
			});
		});

		it('should accept invitation for free tier team (first member)', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				token: 'test_token_123',
				teamId: 'team123',
				email: 'invitee@example.com',
				role: 'ADMIN',
				status: 'PENDING',
				invitedBy: 'owner123',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: {
					name: 'Test Team',
					subscription: null, // Free tier
					members: [] // No members yet
				}
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			// Mock inviter lookup for email notification
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'owner123',
				email: 'owner@example.com',
				firstName: 'Team',
				lastName: 'Owner'
			} as any);

			vi.mocked(db.$transaction).mockResolvedValue([
				{ id: 'user123', teamId: 'team123', role: 'ADMIN' },
				{ id: 'inv123', status: 'ACCEPTED' }
			] as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
		});
	});

	describe('Validation errors', () => {
		it('should reject when invitation not found', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');
			vi.mocked(ensureUser).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com'
			} as any);

			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(null);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when email does not match', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'different@example.com'
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'PENDING',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: { subscription: null, members: [] }
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject expired invitation', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'PENDING',
				expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
				team: { subscription: null, members: [] }
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject already accepted invitation', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'ACCEPTED',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: { subscription: null, members: [] }
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Business logic errors', () => {
		it('should reject when user is already in a team', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				teamId: 'existing_team'
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'PENDING',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: { subscription: null, members: [] }
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when free team has reached member limit', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'PENDING',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: {
					subscription: null, // Free tier
					members: [{ id: 'member1' }] // Already 1 member
				}
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when pro team has reached seat limit', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				teamId: null
			};
			vi.mocked(ensureUser).mockResolvedValue(mockUser as any);

			const mockInvitation = {
				id: 'inv123',
				email: 'invitee@example.com',
				status: 'PENDING',
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				team: {
					subscription: { seats: 2 },
					members: [{ id: 'member1' }, { id: 'member2' }] // 2/2 seats filled
				}
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});
});
