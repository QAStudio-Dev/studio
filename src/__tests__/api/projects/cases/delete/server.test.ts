import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DELETE_ENDPOINT, {
	Param
} from '../../../../../api/projects/[...projectId]/cases/[...id]/DELETE';

const endpointHandler = DELETE_ENDPOINT.default;

type CaseDeleteInput = Parameters<typeof endpointHandler>[0];

/** Mirrors sveltekit-api param validation before invoking the route handler. */
async function DELETE(event: {
	params: { projectId: string; id: string };
}): Promise<Awaited<ReturnType<typeof endpointHandler>>> {
	const param = Param.parse({
		projectId: event.params.projectId,
		id: event.params.id
	});
	return endpointHandler(
		param as CaseDeleteInput,
		event as Parameters<typeof endpointHandler>[1]
	);
}

vi.mock('$lib/server/db', () => ({
	db: {
		$transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
			const tx = {
				testCase: {
					findFirst: vi.fn(),
					delete: vi.fn()
				}
			};
			await callback(tx);
			return tx;
		}),
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

describe('DELETE /api/projects/[projectId]/cases/[id]', () => {
	let mockEvent: any;
	let mockTx: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockTx = {
			testCase: {
				findFirst: vi.fn(),
				delete: vi.fn()
			}
		};

		vi.mocked(db.$transaction).mockImplementation(async (callback: any) => {
			await callback(mockTx);
			return mockTx;
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
		vi.mocked(db.project.findUnique).mockResolvedValue({
			id: 'proj_123',
			name: 'Test Project',
			key: 'TEST',
			createdBy: 'user_123',
			teamId: 'team_123'
		} as any);
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: 'user_123',
			email: 'test@example.com',
			teamId: 'team_123'
		} as any);
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
				resourceId: 'tc_test123'
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
		vi.mocked(db.user.findUnique).mockResolvedValue({
			id: 'user_other',
			email: 'other@example.com',
			teamId: 'team_other'
		} as any);

		await expect(DELETE(mockEvent)).rejects.toMatchObject({
			status: 403
		});
	});
});
