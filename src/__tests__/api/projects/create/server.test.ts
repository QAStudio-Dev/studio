import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../routes/api/projects/create/+server';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		project: {
			findUnique: vi.fn(),
			create: vi.fn(),
			count: vi.fn()
		},
		user: {
			findUnique: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	requireCurrentSubscription: vi.fn()
}));

vi.mock('$lib/server/ids', () => ({
	generateProjectId: vi.fn(() => 'proj_test123')
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

import { db } from '$lib/server/db';
import { requireCurrentSubscription } from '$lib/server/auth';
import { createAuditLog } from '$lib/server/audit';

describe('POST /api/projects/create', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description',
					key: 'TEST'
				})
			})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful project creation', () => {
		it('should create a project for a Pro user with team', async () => {
			// Mock auth to return Pro user with team
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: 'team123',
					role: 'ADMIN',
					team: null
				} as any,
				isFree: false
			});

			// Mock no existing project with same key
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			// Mock project creation
			const mockProject = {
				id: 'proj_test123',
				name: 'Test Project',
				description: 'Test Description',
				key: 'TEST',
				createdBy: 'user123',
				teamId: 'team123',
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};
			vi.mocked(db.project.create).mockResolvedValue(mockProject as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.project.name).toBe('Test Project');
			expect(result.project.key).toBe('TEST');
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user123',
					teamId: 'team123',
					action: 'PROJECT_CREATED',
					resourceType: 'Project',
					resourceId: 'proj_test123'
				})
			);
		});

		it('should create a project for a free user (first project)', async () => {
			// Mock auth to return free user without team
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: true
			});

			// Mock project count = 0 (no existing projects)
			vi.mocked(db.project.count).mockResolvedValue(0);

			// Mock no existing project with same key
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			// Mock project creation
			const mockProject = {
				id: 'proj_test123',
				name: 'Test Project',
				description: 'Test Description',
				key: 'TEST',
				createdBy: 'user123',
				teamId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};
			vi.mocked(db.project.create).mockResolvedValue(mockProject as any);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.project.name).toBe('Test Project');
			expect(vi.mocked(db.project.count)).toHaveBeenCalledWith({
				where: {
					createdBy: 'user123',
					teamId: null
				}
			});
		});
	});

	describe('Validation errors', () => {
		it('should reject missing project name', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: 'Test Description',
					key: 'TEST'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject missing project key', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject invalid project key format (lowercase)', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description',
					key: 'test'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject project key with special characters', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description',
					key: 'TEST-123'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject project key that is too short', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description',
					key: 'T'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject project key that is too long', async () => {
			mockEvent.request = new Request('http://localhost/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test Project',
					description: 'Test Description',
					key: 'TOOLONGKEY1'
				})
			});

			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: false
			});

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Business logic errors', () => {
		it('should reject duplicate project key', async () => {
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: 'team123',
					role: 'ADMIN',
					team: null
				} as any,
				isFree: false
			});

			// Mock existing project with same key
			vi.mocked(db.project.findUnique).mockResolvedValue({
				id: 'existing_proj',
				key: 'TEST',
				name: 'Existing Project'
			} as any);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when free user tries to create second project', async () => {
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: true
			});

			// Mock project count = 1 (already has 1 project)
			vi.mocked(db.project.count).mockResolvedValue(1);

			// Mock no existing project with same key
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should reject when free team tries to create second project', async () => {
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: 'team123',
					role: 'ADMIN',
					team: null
				} as any,
				isFree: true
			});

			// Mock project count = 1 (team already has 1 project)
			vi.mocked(db.project.count).mockResolvedValue(1);

			// Mock no existing project with same key
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});

	describe('Audit logging', () => {
		it('should log project creation with correct metadata', async () => {
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: 'team123',
					role: 'ADMIN',
					team: null
				} as any,
				isFree: false
			});

			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			const mockProject = {
				id: 'proj_test123',
				name: 'Test Project',
				description: 'Test Description',
				key: 'TEST',
				createdBy: 'user123',
				teamId: 'team123',
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};
			vi.mocked(db.project.create).mockResolvedValue(mockProject as any);

			await POST(mockEvent);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: 'team123',
				action: 'PROJECT_CREATED',
				resourceType: 'Project',
				resourceId: 'proj_test123',
				metadata: {
					projectName: 'Test Project',
					projectKey: 'TEST',
					description: 'Test Description'
				},
				event: mockEvent
			});
		});

		it('should log project creation for user without team', async () => {
			vi.mocked(requireCurrentSubscription).mockResolvedValue({
				userId: 'user123',
				user: {
					id: 'user123',
					email: 'test@example.com',
					teamId: null,
					role: 'TESTER',
					team: null
				} as any,
				isFree: true
			});

			vi.mocked(db.project.count).mockResolvedValue(0);
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			const mockProject = {
				id: 'proj_test123',
				name: 'Test Project',
				description: 'Test Description',
				key: 'TEST',
				createdBy: 'user123',
				teamId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};
			vi.mocked(db.project.create).mockResolvedValue(mockProject as any);

			await POST(mockEvent);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'user123',
				teamId: undefined,
				action: 'PROJECT_CREATED',
				resourceType: 'Project',
				resourceId: 'proj_test123',
				metadata: {
					projectName: 'Test Project',
					projectKey: 'TEST',
					description: 'Test Description'
				},
				event: mockEvent
			});
		});
	});
});
