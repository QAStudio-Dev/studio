import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import DELETE_ENDPOINT, {
	Param
} from '../../../../../api/projects/[...projectId]/cases/[...id]/DELETE';

const endpointHandler = DELETE_ENDPOINT.default;

type CaseDeleteInput = Parameters<typeof endpointHandler>[0];
type CaseDeleteEvent = Parameters<typeof endpointHandler>[1];

type MockDeleteEvent = {
	params: { projectId: string; id: string };
	url: URL;
	locals: Record<string, unknown>;
	cookies: {
		get: Mock;
		set: Mock;
		delete: Mock;
		serialize: Mock;
	};
	fetch: Mock;
	getClientAddress: Mock;
	isDataRequest: boolean;
	route: { id: string };
	setHeaders: Mock;
};

type MockTx = {
	testCase: {
		findFirst: Mock;
		delete: Mock;
	};
};

/** Mirrors sveltekit-api param validation before invoking the route handler. */
async function DELETE(
	event: MockDeleteEvent
): Promise<Awaited<ReturnType<typeof endpointHandler>>> {
	const param = Param.parse({
		projectId: event.params.projectId,
		id: event.params.id
	});
	return endpointHandler(param as CaseDeleteInput, event as unknown as CaseDeleteEvent);
}

vi.mock('$lib/server/db', () => ({
	db: {
		$transaction: vi.fn(),
		project: {
			findUnique: vi.fn()
		},
		user: {
			findUnique: vi.fn()
		}
	}
}));

vi.mock('$lib/server/api-auth', () => ({
	requireApiAuth: vi.fn()
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { createAuditLog } from '$lib/server/audit';

type ProjectRecord = NonNullable<Awaited<ReturnType<typeof db.project.findUnique>>>;
type UserRecord = NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>>;
type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function createMockProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
	return {
		id: 'proj_123',
		name: 'Test Project',
		key: 'TEST',
		createdBy: 'user_123',
		teamId: 'team_123',
		createdAt: new Date(),
		updatedAt: new Date(),
		description: null,
		...overrides
	};
}

function createMockUser(overrides: Partial<UserRecord> = {}): UserRecord {
	return {
		id: 'user_123',
		email: 'test@example.com',
		passwordHash: null,
		firstName: 'Test',
		lastName: 'User',
		imageUrl: null,
		role: 'TESTER',
		emailVerified: true,
		ssoProvider: null,
		ssoProviderId: null,
		teamId: 'team_123',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('DELETE /api/projects/[projectId]/cases/[id]', () => {
	let mockEvent: MockDeleteEvent;
	let mockTx: MockTx;

	beforeEach(() => {
		vi.clearAllMocks();

		mockTx = {
			testCase: {
				findFirst: vi.fn(),
				delete: vi.fn()
			}
		};

		vi.mocked(db.$transaction).mockImplementation(async (callback) => {
			return callback(mockTx as unknown as TransactionClient);
		});

		mockEvent = {
			params: { projectId: 'proj_123', id: 'tc_test123' },
			url: new URL('http://localhost/api/projects/proj_123/cases/tc_test123'),
			locals: {},
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn(),
				serialize: vi.fn()
			},
			fetch: vi.fn(),
			getClientAddress: vi.fn(() => '127.0.0.1'),
			isDataRequest: false,
			route: { id: '/api/projects/[projectId]/cases/[id]' },
			setHeaders: vi.fn()
		};

		vi.mocked(requireApiAuth).mockResolvedValue('user_123');
		vi.mocked(db.project.findUnique).mockResolvedValue(createMockProject());
		vi.mocked(db.user.findUnique).mockResolvedValue(createMockUser());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should delete a test case when user has project access', async () => {
		mockTx.testCase.findFirst.mockResolvedValue({
			id: 'tc_test123',
			title: 'Login test',
			projectId: 'proj_123'
		});
		mockTx.testCase.delete.mockResolvedValue({ id: 'tc_test123' });

		const result = await DELETE(mockEvent);

		expect(result.success).toBe(true);
		expect(mockTx.testCase.delete).toHaveBeenCalledWith({ where: { id: 'tc_test123' } });
		expect(createAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user_123',
				action: 'TEST_CASE_DELETED',
				resourceType: 'TestCase',
				resourceId: 'tc_test123',
				metadata: {
					testCaseTitle: 'Login test',
					projectId: 'proj_123'
				}
			})
		);
	});

	it('should reject when test case is not found', async () => {
		mockTx.testCase.findFirst.mockResolvedValue(null);

		await expect(DELETE(mockEvent)).rejects.toMatchObject({
			status: 404
		});
	});

	it('should reject when user lacks project access', async () => {
		vi.mocked(requireApiAuth).mockResolvedValue('user_other');
		vi.mocked(db.user.findUnique).mockResolvedValue(
			createMockUser({
				id: 'user_other',
				email: 'other@example.com',
				teamId: 'team_other'
			})
		);

		await expect(DELETE(mockEvent)).rejects.toMatchObject({
			status: 403
		});
	});

	it('should succeed when audit logging fails', async () => {
		mockTx.testCase.findFirst.mockResolvedValue({
			id: 'tc_test123',
			title: 'Login test',
			projectId: 'proj_123'
		});
		mockTx.testCase.delete.mockResolvedValue({ id: 'tc_test123' });
		vi.mocked(createAuditLog).mockRejectedValue(new Error('Audit service unavailable'));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await DELETE(mockEvent);

		expect(result.success).toBe(true);
		expect(mockTx.testCase.delete).toHaveBeenCalledWith({ where: { id: 'tc_test123' } });
		expect(createAuditLog).toHaveBeenCalled();
		consoleErrorSpy.mockRestore();
	});
});
