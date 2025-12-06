import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../routes/api/teams/create/+server';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findUnique: vi.fn(),
			update: vi.fn()
		},
		team: {
			create: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	requireAuth: vi.fn()
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

import { db } from '$lib/server/db';
import { requireAuth } from '$lib/server/auth';
import { createAuditLog } from '$lib/server/audit';

describe('POST /api/teams/create', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: new Request('http://localhost/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Team',
					description: 'Test Description'
				})
			})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful team creation', () => {
		it('should create a team for a user not in a team', async () => {
			// Mock auth to return user ID
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock user without existing team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com',
				teamId: null,
				team: null
			} as any);

			// Mock team creation
			const mockTeam = {
				id: 'team123',
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [
					{
						id: 'user123',
						email: 'test@example.com'
					}
				],
				subscription: null
			};
			vi.mocked(db.team.create).mockResolvedValue(mockTeam as any);

			// Mock user role update
			vi.mocked(db.user.update).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com',
				role: 'ADMIN'
			} as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.team.name).toBe('Test Team');
			expect(result.team.description).toBe('Test Description');

			// Verify user role was updated to ADMIN
			expect(vi.mocked(db.user.update)).toHaveBeenCalledWith({
				where: { id: 'user123' },
				data: { role: 'ADMIN' }
			});

			// Verify audit log
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_CREATED',
				resourceType: 'Team',
				resourceId: 'team123',
				metadata: {
					teamName: 'Test Team',
					description: 'Test Description'
				},
				event: mockEvent
			});
		});

		it('should create a team without description', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Team'
				})
			});

			vi.mocked(requireAuth).mockResolvedValue('user123');

			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com',
				teamId: null,
				team: null
			} as any);

			const mockTeam = {
				id: 'team123',
				name: 'Test Team',
				description: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ id: 'user123', email: 'test@example.com' }],
				subscription: null
			};
			vi.mocked(db.team.create).mockResolvedValue(mockTeam as any);
			vi.mocked(db.user.update).mockResolvedValue({ id: 'user123', role: 'ADMIN' } as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.team.name).toBe('Test Team');
			expect(result.team.description).toBeNull();
		});
	});

	describe('Validation errors', () => {
		it('should reject missing team name', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'Test Description'
				})
			});

			vi.mocked(requireAuth).mockResolvedValue('user123');

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject invalid team name type', async () => {
			mockEvent.request = new Request('http://localhost/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 123,
					description: 'Test Description'
				})
			});

			vi.mocked(requireAuth).mockResolvedValue('user123');

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Business logic errors', () => {
		it('should reject when user is already in a team', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			// Mock user already in a team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com',
				teamId: 'existing_team',
				team: {
					id: 'existing_team',
					name: 'Existing Team'
				}
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Audit logging', () => {
		it('should log team creation with correct metadata', async () => {
			vi.mocked(requireAuth).mockResolvedValue('user123');

			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user123',
				email: 'test@example.com',
				teamId: null,
				team: null
			} as any);

			const mockTeam = {
				id: 'team123',
				name: 'Test Team',
				description: 'Test Description',
				createdAt: new Date(),
				updatedAt: new Date(),
				members: [{ id: 'user123', email: 'test@example.com' }],
				subscription: null
			};
			vi.mocked(db.team.create).mockResolvedValue(mockTeam as any);
			vi.mocked(db.user.update).mockResolvedValue({ id: 'user123', role: 'ADMIN' } as any);

			await POST(mockEvent);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'TEAM_CREATED',
				resourceType: 'Team',
				resourceId: 'team123',
				metadata: {
					teamName: 'Test Team',
					description: 'Test Description'
				},
				event: mockEvent
			});
		});
	});
});
