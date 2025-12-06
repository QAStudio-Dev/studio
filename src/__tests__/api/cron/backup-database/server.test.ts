import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../../routes/api/cron/backup-database/+server';

// Mock dependencies
vi.mock('$env/static/private', () => ({
	CRON_SECRET: 'test-cron-secret-123'
}));

vi.mock('@vercel/blob', () => ({
	put: vi.fn(),
	list: vi.fn(),
	del: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		user: {
			findMany: vi.fn()
		},
		team: {
			findMany: vi.fn()
		},
		project: {
			findMany: vi.fn()
		},
		testSuite: {
			findMany: vi.fn()
		},
		testCase: {
			findMany: vi.fn()
		},
		testRun: {
			findMany: vi.fn()
		}
	}
}));

vi.mock('$lib/server/audit', () => ({
	createAuditLog: vi.fn()
}));

import { put, list, del } from '@vercel/blob';
import { db } from '$lib/server/db';
import { createAuditLog } from '$lib/server/audit';

describe('GET /api/cron/backup-database', () => {
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(db.user.findMany).mockResolvedValue([
			{
				id: 'user1',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				role: 'ADMIN',
				teamId: 'team1',
				createdAt: new Date()
			}
		] as any);
		vi.mocked(db.team.findMany).mockResolvedValue([
			{ id: 'team1', name: 'Test Team', subscription: null, members: [] }
		] as any);
		vi.mocked(db.project.findMany).mockResolvedValue([
			{ id: 'proj1', name: 'Test Project', milestones: [], environments: [] }
		] as any);
		vi.mocked(db.testSuite.findMany).mockResolvedValue([
			{ id: 'suite1', name: 'Test Suite' }
		] as any);
		vi.mocked(db.testCase.findMany).mockResolvedValue([
			{ id: 'case1', name: 'Test Case' }
		] as any);
		vi.mocked(db.testRun.findMany).mockResolvedValue([
			{ id: 'run1', name: 'Test Run', results: [] }
		] as any);

		vi.mocked(put).mockResolvedValue({
			url: 'https://blob.vercel-storage.com/backup-test.json',
			pathname: 'backup-test.json',
			contentType: 'application/json',
			contentDisposition: 'attachment'
		} as any);

		vi.mocked(list).mockResolvedValue({
			blobs: []
		} as any);

		vi.mocked(createAuditLog).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Authentication', () => {
		it('should reject requests without Authorization header', async () => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET'
			});

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(401);
			expect(result.error).toBe('Unauthorized');
		});

		it('should reject requests with invalid CRON_SECRET', async () => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer wrong-secret'
				}
			});

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(401);
			expect(result.error).toBe('Unauthorized');
		});

		it('should accept requests with valid CRON_SECRET', async () => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});

			const response = await GET({ request: mockRequest } as any);
			expect(response.status).toBe(200);
		});
	});

	describe('Successful backup creation', () => {
		beforeEach(() => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});
		});

		it('should create a backup with all database tables', async () => {
			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);

			// Verify all tables were queried
			expect(vi.mocked(db.user.findMany)).toHaveBeenCalled();
			expect(vi.mocked(db.team.findMany)).toHaveBeenCalled();
			expect(vi.mocked(db.project.findMany)).toHaveBeenCalled();
			expect(vi.mocked(db.testSuite.findMany)).toHaveBeenCalled();
			expect(vi.mocked(db.testCase.findMany)).toHaveBeenCalled();
			expect(vi.mocked(db.testRun.findMany)).toHaveBeenCalled();
		});

		it('should upload backup to Vercel Blob with correct settings', async () => {
			const response = await GET({ request: mockRequest } as any);
			expect(response.status).toBe(200);

			// Verify put was called with correct parameters
			expect(vi.mocked(put)).toHaveBeenCalledWith(
				expect.stringMatching(/^backup-[\d-TZ]+\.json$/),
				expect.any(String),
				{
					access: 'public',
					addRandomSuffix: true,
					contentType: 'application/json'
				}
			);
		});

		it('should create audit log for successful backup', async () => {
			const response = await GET({ request: mockRequest } as any);
			expect(response.status).toBe(200);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'system',
				teamId: undefined,
				action: 'DATABASE_BACKUP_CREATED',
				resourceType: 'System',
				resourceId: 'database',
				metadata: expect.objectContaining({
					filename: expect.stringMatching(/^backup-[\d-TZ]+\.json$/),
					blobUrl: expect.any(String),
					size: expect.any(Number),
					checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					recordCounts: {
						users: 1,
						teams: 1,
						projects: 1,
						testSuites: 1,
						testCases: 1,
						testRuns: 1
					}
				})
			});
		});

		it('should return backup metadata in response', async () => {
			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(result).toEqual({
				success: true,
				backup: expect.objectContaining({
					filename: expect.stringMatching(/^backup-[\d-TZ]+\.json$/),
					url: expect.any(String),
					size: expect.any(Number),
					sizeHuman: expect.stringMatching(/\d+\.\d+ MB/),
					checksum: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hex
					recordCounts: {
						users: 1,
						teams: 1,
						projects: 1,
						testSuites: 1,
						testCases: 1,
						testRuns: 1
					},
					oldBackupsChecked: 0,
					oldBackupsDeleted: 0,
					deletionErrors: 0
				})
			});
		});
	});

	describe('Cleanup of old backups', () => {
		beforeEach(() => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});
		});

		it('should delete backups older than 30 days', async () => {
			const now = new Date();
			const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
			const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

			vi.mocked(list).mockResolvedValue({
				blobs: [
					{
						pathname: 'backup-old.json',
						url: 'https://blob/old',
						uploadedAt: thirtyOneDaysAgo
					},
					{
						pathname: 'backup-recent.json',
						url: 'https://blob/recent',
						uploadedAt: twentyDaysAgo
					}
				]
			} as any);

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(vi.mocked(del)).toHaveBeenCalledTimes(1);
			expect(vi.mocked(del)).toHaveBeenCalledWith('https://blob/old');
			expect(result.backup.oldBackupsChecked).toBe(1);
			expect(result.backup.oldBackupsDeleted).toBe(1);
			expect(result.backup.deletionErrors).toBe(0);
		});

		it('should continue backup even if deletion fails', async () => {
			const now = new Date();
			const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

			vi.mocked(list).mockResolvedValue({
				blobs: [
					{
						pathname: 'backup-old.json',
						url: 'https://blob/old',
						uploadedAt: thirtyOneDaysAgo
					}
				]
			} as any);

			// Mock deletion failure
			vi.mocked(del).mockRejectedValue(new Error('Blob deletion failed'));

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.backup.oldBackupsDeleted).toBe(0);
			expect(result.backup.deletionErrors).toBe(1);
		});

		it('should create audit log alert when deletion fails', async () => {
			const now = new Date();
			const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

			vi.mocked(list).mockResolvedValue({
				blobs: [
					{
						pathname: 'backup-old.json',
						url: 'https://blob/old',
						uploadedAt: thirtyOneDaysAgo
					}
				]
			} as any);

			// Mock deletion failure
			vi.mocked(del).mockRejectedValue(new Error('Blob deletion failed'));

			const response = await GET({ request: mockRequest } as any);
			expect(response.status).toBe(200);

			// Should have TWO audit log calls: one for deletion failure alert, one for backup success
			expect(vi.mocked(createAuditLog)).toHaveBeenCalledTimes(2);

			// First call should be the deletion failure alert
			expect(vi.mocked(createAuditLog)).toHaveBeenNthCalledWith(1, {
				userId: 'system',
				teamId: undefined,
				action: 'DATABASE_BACKUP_DELETION_FAILED',
				resourceType: 'System',
				resourceId: 'backup-cleanup',
				metadata: expect.objectContaining({
					failedCount: 1,
					totalAttempted: 1,
					failedBackups: [
						{
							pathname: 'backup-old.json',
							error: 'Blob deletion failed'
						}
					],
					warning: expect.stringContaining('Failed to delete old backups')
				})
			});

			// Second call should be the successful backup
			expect(vi.mocked(createAuditLog)).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					action: 'DATABASE_BACKUP_CREATED'
				})
			);
		});

		it('should track deletion statistics correctly', async () => {
			const now = new Date();
			const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

			vi.mocked(list).mockResolvedValue({
				blobs: [
					{ pathname: 'backup-1.json', url: 'https://blob/1', uploadedAt: oldDate },
					{ pathname: 'backup-2.json', url: 'https://blob/2', uploadedAt: oldDate },
					{ pathname: 'backup-3.json', url: 'https://blob/3', uploadedAt: oldDate }
				]
			} as any);

			// Mock one deletion failure
			vi.mocked(del)
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Failed'))
				.mockResolvedValueOnce(undefined);

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(result.backup.oldBackupsChecked).toBe(3);
			expect(result.backup.oldBackupsDeleted).toBe(2);
			expect(result.backup.deletionErrors).toBe(1);
		});
	});

	describe('Error handling', () => {
		beforeEach(() => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});
		});

		it('should handle database query errors', async () => {
			vi.mocked(db.user.findMany).mockRejectedValue(new Error('Database connection failed'));

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Database connection failed');
		});

		it('should handle blob upload errors', async () => {
			vi.mocked(put).mockRejectedValue(new Error('Blob upload failed'));

			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Blob upload failed');
		});

		it('should create audit log for failed backup', async () => {
			vi.mocked(db.user.findMany).mockRejectedValue(new Error('Database error'));

			const response = await GET({ request: mockRequest } as any);
			expect(response.status).toBe(500);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
				userId: 'system',
				teamId: undefined,
				action: 'DATABASE_BACKUP_FAILED',
				resourceType: 'System',
				resourceId: 'database',
				metadata: expect.objectContaining({
					error: 'Database error',
					stack: expect.any(String)
				})
			});
		});
	});

	describe('Filename validation', () => {
		beforeEach(() => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});
		});

		it('should generate valid backup filename format', async () => {
			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(result.backup.filename).toMatch(/^backup-[\d-TZ]+\.json$/);
		});
	});

	describe('Backup validation and integrity', () => {
		beforeEach(() => {
			mockRequest = new Request('http://localhost/api/cron/backup-database', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-cron-secret-123'
				}
			});
		});

		it('should validate backup JSON structure', async () => {
			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			// If validation fails, the endpoint would throw an error
		});

		it('should generate SHA-256 checksum for backup', async () => {
			const response = await GET({ request: mockRequest } as any);
			const result = await response.json();

			expect(result.backup.checksum).toMatch(/^[a-f0-9]{64}$/);
			expect(result.backup.checksum.length).toBe(64);
		});

		it('should include checksum in audit log', async () => {
			await GET({ request: mockRequest } as any);

			expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/)
					})
				})
			);
		});
	});
});
