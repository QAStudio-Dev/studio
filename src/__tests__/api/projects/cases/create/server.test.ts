import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import POST_ENDPOINT from '../../../../../api/projects/[...projectId]/cases/POST';

// The Endpoint.default property contains the handler function after calling .handle()
// sveltekit-api returns the data directly, not a Response object
const POST = (POST_ENDPOINT as any).default as (evt: any) => Promise<any>;

// Mock dependencies before importing the module
vi.mock('$lib/server/db', () => ({
	db: {
		project: {
			findUnique: vi.fn()
		},
		user: {
			findUnique: vi.fn()
		},
		testSuite: {
			findUnique: vi.fn()
		},
		testCase: {
			create: vi.fn(),
			aggregate: vi.fn()
		}
	}
}));

vi.mock('$lib/server/api-auth', () => ({
	requireApiAuth: vi.fn()
}));

vi.mock('$lib/server/ids', () => ({
	generateTestCaseId: vi.fn(() => 'tc_test123')
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

vi.mock('$lib/utils/date', () => ({
	serializeDates: vi.fn((obj) => obj)
}));

// Import mocked modules
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { createAuditLog } from '$lib/server/audit';
import { generateTestCaseId } from '$lib/server/ids';

describe('POST /api/projects/[projectId]/cases', () => {
	let mockEvent: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create default mockEvent with basic test case
		// Note: sveltekit-api endpoints read projectId from params, not body
		mockEvent = {
			request: new Request('http://localhost/api/projects/proj_123/cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Test Login'
				})
			}),
			params: { projectId: 'proj_123' },
			url: new URL('http://localhost/api/projects/proj_123/cases'),
			locals: {},
			platform: undefined,
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn(),
				serialize: vi.fn()
			},
			fetch: vi.fn(),
			getClientAddress: vi.fn(() => '127.0.0.1'),
			isDataRequest: false,
			route: { id: '/api/projects/[projectId]/cases' },
			setHeaders: vi.fn()
		};

		// Default mock: valid user
		vi.mocked(requireApiAuth).mockResolvedValue('user_123');

		// Default mock: valid project
		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: 'proj_123',
			name: 'Test Project',
			key: 'TEST',
			createdBy: 'user_123',
			teamId: 'team_123',
			createdAt: new Date(),
			updatedAt: new Date()
		} as any);

		// Default mock: valid user with team
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: 'user_123',
			email: 'test@example.com',
			teamId: 'team_123'
		} as any);

		// Default mock: no existing test cases (order = 0)
		vi.mocked(db.testCase.aggregate).mockResolvedValue({
			_max: { order: null }
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Successful test case creation', () => {
		it('should create a minimal test case with only title', async () => {
			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test Login',
				description: null,
				preconditions: null,
				steps: null,
				expectedResult: null,
				priority: 'MEDIUM',
				type: 'FUNCTIONAL',
				automationStatus: 'NOT_AUTOMATED',
				tags: [],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_123',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			// sveltekit-api returns data directly, not a Response object
			const result = await POST(mockEvent);

			expect(result.testCase.id).toBe('tc_test123');
			expect(result.testCase.title).toBe('Test Login');
			expect(result.testCase.priority).toBe('MEDIUM');
			expect(result.testCase.type).toBe('FUNCTIONAL');
			expect(result.testCase.automationStatus).toBe('NOT_AUTOMATED');

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_123',
					teamId: 'team_123',
					action: 'TEST_CASE_CREATED',
					resourceType: 'TestCase',
					resourceId: 'tc_test123'
				})
			);
		});

		it('should create a complete test case with all fields', async () => {
			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test User Registration',
				description: 'Verify user can register with valid data',
				preconditions: 'Database is clean',
				steps: [
					{
						action: 'Navigate to registration page',
						expectedResult: 'Page loads',
						order: 0
					},
					{
						action: 'Fill in form with valid data',
						expectedResult: 'Fields accept input',
						order: 1
					},
					{ action: 'Click submit', expectedResult: 'User is created', order: 2 }
				],
				expectedResult: 'User is successfully registered and logged in',
				priority: 'CRITICAL',
				type: 'FUNCTIONAL',
				automationStatus: 'AUTOMATED',
				tags: ['auth', 'registration', 'critical'],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_123',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			const result = await POST(mockEvent);

			expect(result.testCase.title).toBe('Test User Registration');
			expect(result.testCase.description).toBe('Verify user can register with valid data');
			expect(result.testCase.steps).toHaveLength(3);
			expect(result.testCase.priority).toBe('CRITICAL');
			expect(result.testCase.tags).toEqual(['auth', 'registration', 'critical']);
		});

		it('should handle user without team (personal project)', async () => {
			// Mock user without team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user_123',
				email: 'test@example.com',
				teamId: null
			} as any);

			// Mock project without team
			vi.mocked(db.project.findUnique).mockResolvedValue({
				id: 'proj_123',
				name: 'Personal Project',
				key: 'PERS',
				createdBy: 'user_123',
				teamId: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test Login',
				description: null,
				preconditions: null,
				steps: null,
				expectedResult: null,
				priority: 'MEDIUM',
				type: 'FUNCTIONAL',
				automationStatus: 'NOT_AUTOMATED',
				tags: [],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_123',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			const result = await POST(mockEvent);

			expect(result.testCase.id).toBe('tc_test123');
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_123',
					teamId: undefined
				})
			);
		});
	});

	describe('Input validation', () => {
		it('should reject empty title', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: '' })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject whitespace-only title', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: '   ' })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject invalid priority', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Test', priority: 'INVALID' })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject invalid type', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Test', type: 'INVALID' })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject invalid automation status', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Test', automationStatus: 'INVALID' })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject more than 10 tags', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						tags: [
							'tag1',
							'tag2',
							'tag3',
							'tag4',
							'tag5',
							'tag6',
							'tag7',
							'tag8',
							'tag9',
							'tag10',
							'tag11'
						]
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject tag longer than 50 characters', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						tags: ['a'.repeat(51)]
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject tag with special characters', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Test', tags: ['tag@special'] })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject tag with spaces', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Test', tags: ['tag with spaces'] })
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should accept tags with dashes and underscores', async () => {
			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test Login',
				description: null,
				preconditions: null,
				steps: null,
				expectedResult: null,
				priority: 'MEDIUM',
				type: 'FUNCTIONAL',
				automationStatus: 'NOT_AUTOMATED',
				tags: ['smoke-test', 'e2e_test', 'P0'],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_123',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			const result = await POST(mockEvent);
			expect(result.testCase.tags).toEqual(['smoke-test', 'e2e_test', 'P0']);
		});

		it('should reject steps array with empty action', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						steps: [{ action: '', expectedResult: 'Result' }]
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject steps array with more than 100 steps', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						steps: Array(101).fill({ action: 'Step', expectedResult: 'Result' })
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject steps array with negative order', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						steps: [{ action: 'Step 1', expectedResult: 'Result', order: -1 }]
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});

		it('should reject steps array with non-integer order', async () => {
			const invalidEvent = {
				...mockEvent,
				request: new Request('http://localhost/api/projects/proj_123/cases', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Test',
						steps: [{ action: 'Step 1', expectedResult: 'Result', order: 1.5 }]
					})
				})
			};
			await expect(POST(invalidEvent)).rejects.toThrow();
		});
	});

	describe('Authorization', () => {
		it('should reject when project does not exist', async () => {
			vi.mocked(db.project.findUnique).mockResolvedValue(null);

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});

		it('should reject when user does not exist', async () => {
			vi.mocked(db.user.findUnique).mockResolvedValue(null);

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});

		it('should reject when user is not project owner and not in same team', async () => {
			// User from different team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user_456',
				email: 'other@example.com',
				teamId: 'team_456'
			} as any);

			// Project owned by different user and different team
			vi.mocked(db.project.findUnique).mockResolvedValue({
				id: 'proj_123',
				name: 'Test Project',
				key: 'TEST',
				createdBy: 'user_789',
				teamId: 'team_123',
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			vi.mocked(requireApiAuth).mockResolvedValue('user_456');

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});

		it('should allow project owner even if not in team', async () => {
			// User is the owner but has no team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user_123',
				email: 'owner@example.com',
				teamId: null
			} as any);

			vi.mocked(db.project.findUnique).mockResolvedValue({
				id: 'proj_123',
				name: 'Test Project',
				key: 'TEST',
				createdBy: 'user_123',
				teamId: null,
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test',
				description: null,
				preconditions: null,
				steps: null,
				expectedResult: null,
				priority: 'MEDIUM',
				type: 'FUNCTIONAL',
				automationStatus: 'NOT_AUTOMATED',
				tags: [],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_123',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_123',
					email: 'owner@example.com',
					firstName: 'Owner',
					lastName: 'User'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			const result = await POST(mockEvent);
			expect(result.testCase.id).toBe('tc_test123');
		});

		it('should allow team member even if not project owner', async () => {
			// Different user but same team
			vi.mocked(db.user.findUnique).mockResolvedValue({
				id: 'user_456',
				email: 'teammate@example.com',
				teamId: 'team_123'
			} as any);

			vi.mocked(db.project.findUnique).mockResolvedValue({
				id: 'proj_123',
				name: 'Test Project',
				key: 'TEST',
				createdBy: 'user_789',
				teamId: 'team_123',
				createdAt: new Date(),
				updatedAt: new Date()
			} as any);

			vi.mocked(requireApiAuth).mockResolvedValue('user_456');

			const mockTestCase = {
				id: 'tc_test123',
				title: 'Test',
				description: null,
				preconditions: null,
				steps: null,
				expectedResult: null,
				priority: 'MEDIUM',
				type: 'FUNCTIONAL',
				automationStatus: 'NOT_AUTOMATED',
				tags: [],
				projectId: 'proj_123',
				suiteId: null,
				createdBy: 'user_456',
				order: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				creator: {
					id: 'user_456',
					email: 'teammate@example.com',
					firstName: 'Team',
					lastName: 'Member'
				}
			};

			vi.mocked(db.testCase.create).mockResolvedValue(mockTestCase as any);

			const result = await POST(mockEvent);
			expect(result.testCase.id).toBe('tc_test123');
		});
	});

	describe('Suite validation', () => {
		it('should reject when suite does not exist', async () => {
			vi.mocked(db.testSuite.findUnique).mockResolvedValue(null);

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});

		it('should reject when suite belongs to different project', async () => {
			vi.mocked(db.testSuite.findUnique).mockResolvedValue({
				id: 'suite_123',
				name: 'Other Suite',
				projectId: 'proj_456'
			} as any);

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});
	});

	describe('Error handling', () => {
		it('should handle database errors gracefully', async () => {
			vi.mocked(db.testCase.create).mockRejectedValue(new Error('Database error'));

			await expect(async () => {
				const response = await POST(mockEvent);
				await response.json();
			}).rejects.toThrow();
		});

		it('should re-throw API errors without modification', async () => {
			const apiError = { status: 403, message: 'Forbidden' };
			vi.mocked(db.project.findUnique).mockRejectedValue(apiError);

			await expect(POST(mockEvent)).rejects.toThrow();
		});
	});
});
