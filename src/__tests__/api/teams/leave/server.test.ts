import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../routes/api/teams/leave/+server';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findUnique: vi.fn(),
			update: vi.fn()
		},
		team: {
			delete: vi.fn()
		},
		subscription: {
			update: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	requireAuth: vi.fn()
}));

vi.mock('$lib/server/stripe', () => ({
	stripe: {
		subscriptions: {
			cancel: vi.fn()
		}
	}
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

import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { stripe } from '$lib/server/stripe';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { createAuditLog } from '$lib/server/audit';

describe('POST /api/teams/leave', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: new Request('http://localhost/api/teams/leave', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful team leave', () => {
		it('should remove user from team (not last member)', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock user in team with multiple members
			const mockUser = {
				id: 'user123',
				email: 'member@example.com',
				teamId: 'team123',
				team: {
					id: 'team123',
					name: 'Test Team',
					members: [
						{ id: 'user123', email: 'member@example.com' },
						{ id: 'user456', email: 'other@example.com' }
					],
					subscription: null
				}
			};
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

			vi.mocked(db.user.update).mockResolvedValue({
				id: 'user123',
				teamId: null
			} as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Successfully left the team');

			// Verify user was removed from team
			expect(vi.mocked(db.user.update)).toHaveBeenCalledWith({
				where: { id: 'user123' },
				data: { teamId: null }
			});

			// Verify cache invalidation
			expect(vi.mocked(deleteCache)).toHaveBeenCalledWith([
				CacheKeys.projects('user123'),
				CacheKeys.teamStatus('team123')
			]);

			// Verify audit log
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_MEMBER_REMOVED',
				resourceType: 'Team',
				resourceId: 'team123',
				metadata: {
					teamName: 'Test Team',
					memberEmail: 'member@example.com',
					reason: 'User left team voluntarily'
				},
				event: mockEvent
			});
		});

		it('should delete team when last member leaves (no subscription)', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock last member in team
			const mockUser = {
				id: 'user123',
				email: 'last@example.com',
				teamId: 'team123',
				team: {
					id: 'team123',
					name: 'Test Team',
					members: [{ id: 'user123', email: 'last@example.com' }],
					subscription: null
				}
			};
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

			vi.mocked(db.user.update).mockResolvedValue({
				id: 'user123',
				teamId: null
			} as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Successfully deleted team and left');

			// Verify team was deleted
			expect(vi.mocked(db.team.delete)).toHaveBeenCalledWith({
				where: { id: 'team123' }
			});

			// Verify audit logs
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_DELETED',
				resourceType: 'Team',
				resourceId: 'team123',
				metadata: {
					teamName: 'Test Team',
					reason: 'Last member left team'
				},
				event: mockEvent
			});
		});

		it('should cancel subscription and delete team when last member leaves', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock last member with active subscription
			const mockUser = {
				id: 'user123',
				email: 'last@example.com',
				teamId: 'team123',
				team: {
					id: 'team123',
					name: 'Test Team',
					members: [{ id: 'user123', email: 'last@example.com' }],
					subscription: {
						id: 'sub123',
						stripeSubscriptionId: 'sub_stripe123'
					}
				}
			};
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

			vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({
				id: 'sub_stripe123'
			} as any);
			vi.mocked(db.subscription.update).mockResolvedValue({
				id: 'sub123',
				status: 'CANCELED'
			} as any);
			vi.mocked(db.user.update).mockResolvedValue({ id: 'user123', teamId: null } as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Successfully deleted team and left');

			// Verify subscription was canceled
			expect(vi.mocked(stripe.subscriptions.cancel)).toHaveBeenCalledWith('sub_stripe123');
			expect(vi.mocked(db.subscription.update)).toHaveBeenCalledWith({
				where: { id: 'sub123' },
				data: {
					status: 'CANCELED',
					cancelAtPeriodEnd: false
				}
			});

			// Verify team was deleted
			expect(vi.mocked(db.team.delete)).toHaveBeenCalledWith({
				where: { id: 'team123' }
			});
		});

		it('should continue team deletion even if subscription cancellation fails', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'last@example.com',
				teamId: 'team123',
				team: {
					id: 'team123',
					name: 'Test Team',
					members: [{ id: 'user123', email: 'last@example.com' }],
					subscription: {
						id: 'sub123',
						stripeSubscriptionId: 'sub_stripe123'
					}
				}
			};
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

			// Mock Stripe cancellation failure
			vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error('Stripe error'));

			vi.mocked(db.user.update).mockResolvedValue({ id: 'user123', teamId: null } as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.message).toBe('Successfully deleted team and left');

			// Verify team was still deleted despite subscription error
			expect(vi.mocked(db.team.delete)).toHaveBeenCalledWith({
				where: { id: 'team123' }
			});
		});
	});

	describe('Validation errors', () => {
		it('should reject when user is not in a team', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			const mockUser = {
				id: 'user123',
				email: 'solo@example.com',
				teamId: null
			};
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.message).toBe('You are not part of a team');
		});
	});

	describe('Error handling', () => {
		it('should handle database errors gracefully', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock database error
			vi.mocked(db.user.findUnique).mockRejectedValue(new Error('Database error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.message).toContain('Database error');
		});
	});
});
