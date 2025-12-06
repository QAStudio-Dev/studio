import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, DELETE } from '../../../../../routes/api/teams/[teamId]/members/invite/+server';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findFirst: vi.fn()
		},
		teamInvitation: {
			findFirst: vi.fn(),
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	requireCurrentSubscription: vi.fn(),
	requireRole: vi.fn()
}));

vi.mock('$lib/server/subscriptions', () => ({
	requireAvailableSeats: vi.fn()
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

import { db } from '$lib/server/db';
import { requireRole } from '$lib/server/auth';
import { requireAvailableSeats } from '$lib/server/subscriptions';
import { createAuditLog } from '$lib/server/audit';

describe('POST /api/teams/[teamId]/members/invite', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { teamId: 'team123' },
			request: new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invitee@example.com',
					role: 'TESTER'
				})
			}),
			url: new URL('http://localhost/api/teams/team123/members/invite')
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful invitation', () => {
		it('should send invitation to new user', async () => {
			// Mock auth to return admin user
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				email: 'admin@example.com',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			// Mock available seats check
			vi.mocked(requireAvailableSeats).mockResolvedValue(undefined);

			// Mock no existing member
			vi.mocked(db.user.findFirst).mockResolvedValue(null);

			// Mock no existing invitation
			vi.mocked(db.teamInvitation.findFirst).mockResolvedValue(null);

			// Mock invitation creation
			const mockInvitation = {
				id: 'inv123',
				teamId: 'team123',
				email: 'invitee@example.com',
				role: 'TESTER',
				token: 'abc123',
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				status: 'PENDING',
				team: {
					name: 'Test Team'
				}
			};
			vi.mocked(db.teamInvitation.create).mockResolvedValue(mockInvitation as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.invitation.email).toBe('invitee@example.com');
			expect(result.invitation.role).toBe('TESTER');

			// Verify audit log
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_INVITATION_SENT',
				resourceType: 'TeamInvitation',
				resourceId: 'inv123',
				metadata: {
					teamName: 'Test Team',
					inviteeEmail: 'invitee@example.com',
					role: 'TESTER',
					expiresAt: mockInvitation.expiresAt
				},
				event: mockEvent
			});
		});

		it('should default to TESTER role if not specified', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invitee@example.com'
				})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			vi.mocked(requireAvailableSeats).mockResolvedValue(undefined);
			vi.mocked(db.user.findFirst).mockResolvedValue(null);
			vi.mocked(db.teamInvitation.findFirst).mockResolvedValue(null);

			const mockInvitation = {
				id: 'inv123',
				teamId: 'team123',
				email: 'invitee@example.com',
				role: 'TESTER',
				token: 'abc123',
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				status: 'PENDING',
				team: { name: 'Test Team' }
			};
			vi.mocked(db.teamInvitation.create).mockResolvedValue(mockInvitation as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.invitation.role).toBe('TESTER');
		});
	});

	describe('Validation errors', () => {
		it('should reject missing email', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					role: 'TESTER'
				})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject invalid email format', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invalid-email',
					role: 'TESTER'
				})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject OWNER role in invitation', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invitee@example.com',
					role: 'OWNER'
				})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject invalid role', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'invitee@example.com',
					role: 'INVALID_ROLE'
				})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Business logic errors', () => {
		it('should reject when user tries to invite to different team', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'different_team',
				role: 'ADMIN'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when user is already a member', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			vi.mocked(requireAvailableSeats).mockResolvedValue(undefined);

			// Mock existing member
			vi.mocked(db.user.findFirst).mockResolvedValue({
				id: 'existing_user',
				email: 'invitee@example.com',
				teamId: 'team123'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when invitation already exists', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			vi.mocked(requireAvailableSeats).mockResolvedValue(undefined);
			vi.mocked(db.user.findFirst).mockResolvedValue(null);

			// Mock existing invitation
			vi.mocked(db.teamInvitation.findFirst).mockResolvedValue({
				id: 'existing_inv',
				email: 'invitee@example.com',
				teamId: 'team123',
				status: 'PENDING'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});
});

describe('DELETE /api/teams/[teamId]/members/invite', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { teamId: 'team123' },
			request: new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					invitationId: 'inv123'
				})
			})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful revocation', () => {
		it('should cancel pending invitation', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			const mockInvitation = {
				id: 'inv123',
				teamId: 'team123',
				email: 'invitee@example.com',
				role: 'TESTER',
				status: 'PENDING'
			};
			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(mockInvitation as any);
			vi.mocked(db.teamInvitation.update).mockResolvedValue({
				...mockInvitation,
				status: 'CANCELED'
			} as any);

			const response = await DELETE(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);

			// Verify invitation was canceled
			expect(vi.mocked(db.teamInvitation.update)).toHaveBeenCalledWith({
				where: { id: 'inv123' },
				data: { status: 'CANCELED' }
			});

			// Verify audit log
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_INVITATION_REVOKED',
				resourceType: 'TeamInvitation',
				resourceId: 'inv123',
				metadata: {
					inviteeEmail: 'invitee@example.com',
					role: 'TESTER'
				},
				event: mockEvent
			});
		});
	});

	describe('Validation errors', () => {
		it('should reject missing invitation ID', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/team123/members/invite', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			await expect(DELETE(mockEvent)).rejects.toThrow();
		});
	});

	describe('Business logic errors', () => {
		it('should reject when invitation not found', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue(null);

			await expect(DELETE(mockEvent)).rejects.toThrow();
		});

		it('should reject when invitation belongs to different team', async () => {
			vi.mocked(requireRole).mockResolvedValue({
				id: 'user123',
				teamId: 'team123',
				role: 'ADMIN'
			} as any);

			vi.mocked(db.teamInvitation.findUnique).mockResolvedValue({
				id: 'inv123',
				teamId: 'different_team',
				email: 'invitee@example.com'
			} as any);

			await expect(DELETE(mockEvent)).rejects.toThrow();
		});
	});
});
