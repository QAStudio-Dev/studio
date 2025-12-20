import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestSuite, Project, User } from '$prisma/client';

/**
 * Unit tests for POST /api/projects/[...projectId]/test-suites
 *
 * Tests cover:
 * - Authentication and authorization
 * - Parent suite validation
 * - Order calculation
 * - Audit logging
 * - Error handling
 */

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		project: {
			findUnique: vi.fn()
		},
		user: {
			findUnique: vi.fn()
		},
		testSuite: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn()
		}
	}
}));

vi.mock('$lib/server/api-auth', () => ({
	requireApiAuth: vi.fn()
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

vi.mock('$lib/server/ids', () => ({
	generateTestSuiteId: vi.fn(() => 'TS_test123')
}));

import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { createAuditLog } from '$lib/server/audit';
import endpoint from './POST';

describe('POST /api/projects/[...projectId]/test-suites', () => {
	const mockUserId = 'user_123';
	const mockProjectId = 'proj_123';
	const mockTeamId = 'team_123';

	const mockProject: Partial<Project> = {
		id: mockProjectId,
		createdBy: mockUserId,
		teamId: mockTeamId
	};

	const mockUser: Partial<User> = {
		id: mockUserId,
		teamId: mockTeamId
	};

	const mockEvent = {
		request: new Request('http://localhost/api/projects/proj_123/test-suites')
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(requireApiAuth).mockResolvedValue(mockUserId);
	});

	describe('Authorization', () => {
		it('should allow project owner to create test suite', async () => {
			// Owner creates test suite in their project
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);
			vi.mocked(db.testSuite.create).mockResolvedValue({
				id: 'TS_test123',
				name: 'Test Suite',
				description: null,
				projectId: mockProjectId,
				parentId: null,
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			const result = await endpoint.handle(
				{ projectId: mockProjectId, name: 'Test Suite' },
				mockEvent
			);

			expect(result).toBeDefined();
			expect(db.testSuite.create).toHaveBeenCalled();
		});

		it('should allow team member to create test suite', async () => {
			// Team member creates suite in team project
			const teamProject = { ...mockProject, createdBy: 'other_user' };
			vi.mocked(db.project.findUnique).mockResolvedValue(teamProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);
			vi.mocked(db.testSuite.create).mockResolvedValue({
				id: 'TS_test123',
				name: 'Test Suite',
				description: null,
				projectId: mockProjectId,
				parentId: null,
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			const result = await endpoint.handle(
				{ projectId: mockProjectId, name: 'Test Suite' },
				mockEvent
			);

			expect(result).toBeDefined();
			expect(db.testSuite.create).toHaveBeenCalled();
		});

		it('should reject unauthorized user (403)', async () => {
			// User tries to create suite in someone else's project
			const otherProject = { ...mockProject, createdBy: 'other_user', teamId: null };
			vi.mocked(db.project.findUnique).mockResolvedValue(otherProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);

			await expect(
				endpoint.handle({ projectId: mockProjectId, name: 'Test Suite' }, mockEvent)
			).rejects.toThrow();
		});

		it('should reject when project not found (404)', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			await expect(
				endpoint.handle({ projectId: mockProjectId, name: 'Test Suite' }, mockEvent)
			).rejects.toThrow();
		});

		it('should reject when user not found (401)', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(null);

			await expect(
				endpoint.handle({ projectId: mockProjectId, name: 'Test Suite' }, mockEvent)
			).rejects.toThrow();
		});
	});

	describe('Parent Suite Validation', () => {
		it('should create root-level suite when parentId is null', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);
			vi.mocked(db.testSuite.create).mockResolvedValue({
				id: 'TS_test123',
				name: 'Root Suite',
				description: null,
				projectId: mockProjectId,
				parentId: null,
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			const result = await endpoint.handle(
				{ projectId: mockProjectId, name: 'Root Suite', parentId: null },
				mockEvent
			);

			expect(result.parentId).toBeNull();
		});

		it('should create nested suite when parentId is valid', async () => {
			const parentSuiteId = 'TS_parent';
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findUnique).mockResolvedValue({
				id: parentSuiteId,
				name: 'Parent Suite',
				projectId: mockProjectId,
				parentId: null,
				order: 0,
				description: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);
			vi.mocked(db.testSuite.create).mockResolvedValue({
				id: 'TS_test123',
				name: 'Child Suite',
				description: null,
				projectId: mockProjectId,
				parentId: parentSuiteId,
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			const result = await endpoint.handle(
				{ projectId: mockProjectId, name: 'Child Suite', parentId: parentSuiteId },
				mockEvent
			);

			expect(result.parentId).toBe(parentSuiteId);
		});

		it('should reject when parent suite belongs to different project (400)', async () => {
			const parentSuiteId = 'TS_parent';
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findUnique).mockResolvedValue({
				id: parentSuiteId,
				name: 'Parent Suite',
				projectId: 'different_project', // Wrong project!
				parentId: null,
				order: 0,
				description: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			await expect(
				endpoint.handle(
					{ projectId: mockProjectId, name: 'Child Suite', parentId: parentSuiteId },
					mockEvent
				)
			).rejects.toThrow();
		});

		it('should reject when parent suite does not exist (400)', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findUnique).mockResolvedValue(null);

			await expect(
				endpoint.handle(
					{ projectId: mockProjectId, name: 'Child Suite', parentId: 'nonexistent' },
					mockEvent
				)
			).rejects.toThrow();
		});
	});

	describe('Order Calculation', () => {
		it('should set order to 0 for first suite', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null); // No existing suites

			let capturedOrder: number | undefined;
			vi.mocked(db.testSuite.create).mockImplementation((args: any) => {
				capturedOrder = args.data.order;
				return Promise.resolve({
					id: 'TS_test123',
					name: 'First Suite',
					description: null,
					projectId: mockProjectId,
					parentId: null,
					order: args.data.order,
					createdAt: new Date(),
					updatedAt: new Date()
				} as TestSuite);
			});

			await endpoint.handle({ projectId: mockProjectId, name: 'First Suite' }, mockEvent);

			expect(capturedOrder).toBe(0);
		});

		it('should increment order for subsequent suites', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue({
				id: 'TS_existing',
				name: 'Existing Suite',
				projectId: mockProjectId,
				parentId: null,
				order: 2, // Max order is 2
				description: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			let capturedOrder: number | undefined;
			vi.mocked(db.testSuite.create).mockImplementation((args: any) => {
				capturedOrder = args.data.order;
				return Promise.resolve({
					id: 'TS_test123',
					name: 'New Suite',
					description: null,
					projectId: mockProjectId,
					parentId: null,
					order: args.data.order,
					createdAt: new Date(),
					updatedAt: new Date()
				} as TestSuite);
			});

			await endpoint.handle({ projectId: mockProjectId, name: 'New Suite' }, mockEvent);

			expect(capturedOrder).toBe(3); // Should be maxOrder + 1
		});
	});

	describe('Audit Logging', () => {
		it('should create audit log entry', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);
			vi.mocked(db.testSuite.create).mockResolvedValue({
				id: 'TS_test123',
				name: 'Test Suite',
				description: null,
				projectId: mockProjectId,
				parentId: null,
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date()
			} as TestSuite);

			await endpoint.handle({ projectId: mockProjectId, name: 'Test Suite' }, mockEvent);

			expect(createAuditLog).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: mockUserId,
					teamId: mockTeamId,
					action: 'TEST_SUITE_CREATED',
					resourceType: 'TestSuite',
					resourceId: 'TS_test123'
				})
			);
		});
	});

	describe('Input Validation', () => {
		it('should trim whitespace from name', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(mockProject as Project);
			vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as User);
			vi.mocked(db.testSuite.findFirst).mockResolvedValue(null);

			let capturedName: string | undefined;
			vi.mocked(db.testSuite.create).mockImplementation((args: any) => {
				capturedName = args.data.name;
				return Promise.resolve({
					id: 'TS_test123',
					name: args.data.name,
					description: null,
					projectId: mockProjectId,
					parentId: null,
					order: 0,
					createdAt: new Date(),
					updatedAt: new Date()
				} as TestSuite);
			});

			await endpoint.handle({ projectId: mockProjectId, name: '  Test Suite  ' }, mockEvent);

			expect(capturedName).toBe('Test Suite');
		});

		it('should reject name longer than 255 characters', async () => {
			const longName = 'a'.repeat(256);

			await expect(
				endpoint.handle({ projectId: mockProjectId, name: longName }, mockEvent)
			).rejects.toThrow();
		});

		it('should reject description longer than 1000 characters', async () => {
			const longDescription = 'a'.repeat(1001);

			await expect(
				endpoint.handle(
					{ projectId: mockProjectId, name: 'Test', description: longDescription },
					mockEvent
				)
			).rejects.toThrow();
		});
	});
});
