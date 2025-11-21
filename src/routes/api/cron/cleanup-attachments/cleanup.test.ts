import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from './+server';
import { db } from '$lib/server/db';
import { deleteFromBlob } from '$lib/server/blob-storage';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		attachment: {
			findMany: vi.fn(),
			delete: vi.fn()
		}
	}
}));

vi.mock('$lib/server/blob-storage', () => ({
	deleteFromBlob: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		CRON_SECRET: 'test-secret-key'
	}
}));

describe('Cron: Attachment Cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const createMockRequest = (authHeader?: string) => {
		return new Request('http://localhost/api/cron/cleanup-attachments', {
			headers: authHeader ? { authorization: authHeader } : {}
		});
	};

	describe('Authorization', () => {
		it('should reject requests without authorization header', async () => {
			const request = createMockRequest();
			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(401);
			expect(body).toEqual({ error: 'Unauthorized' });
		});

		it('should reject requests with invalid authorization header', async () => {
			const request = createMockRequest('Bearer wrong-secret');
			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(401);
			expect(body).toEqual({ error: 'Unauthorized' });
		});

		it('should accept requests with valid authorization header', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			vi.mocked(db.attachment.findMany).mockResolvedValue([]);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);

			expect(response.status).toBe(200);
		});
	});

	describe('Attachment Deletion Logic', () => {
		const now = new Date();
		const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
		const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

		const createMockAttachment = (
			id: string,
			createdAt: Date,
			subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | null,
			viaTestCase = true
		): any => {
			const subscription = subscriptionStatus
				? {
						id: 'sub-1',
						status: subscriptionStatus,
						teamId: 'team-1'
					}
				: null;

			const team = {
				id: 'team-1',
				name: 'Test Team',
				subscription
			};

			const project = {
				id: 'proj-1',
				key: 'TEST',
				name: 'Test Project',
				teamId: 'team-1',
				team
			};

			if (viaTestCase) {
				return {
					id,
					filename: `test-${id}.png`,
					url: `https://blob.vercel.com/${id}`,
					createdAt,
					testCase: {
						id: 'case-1',
						project
					},
					testResult: null
				};
			} else {
				return {
					id,
					filename: `test-${id}.png`,
					url: `https://blob.vercel.com/${id}`,
					createdAt,
					testCase: null,
					testResult: {
						id: 'result-1',
						testRun: {
							id: 'run-1',
							project
						}
					}
				};
			}
		};

		it('should delete attachments older than 7 days for free teams', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const attachment = createMockAttachment('att-1', eightDaysAgo, null);

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue(attachment);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.free).toBe(1);
			expect(body.deleted.paid).toBe(0);
			expect(body.deleted.total).toBe(1);
			expect(deleteFromBlob).toHaveBeenCalledWith(attachment.url);
			expect(db.attachment.delete).toHaveBeenCalledWith({ where: { id: attachment.id } });
		});

		it('should delete attachments older than 30 days for paid teams', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const attachment = createMockAttachment('att-2', thirtyOneDaysAgo, 'ACTIVE');

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue(attachment);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.free).toBe(0);
			expect(body.deleted.paid).toBe(1);
			expect(body.deleted.total).toBe(1);
			expect(deleteFromBlob).toHaveBeenCalledWith(attachment.url);
			expect(db.attachment.delete).toHaveBeenCalledWith({ where: { id: attachment.id } });
		});

		it('should NOT delete attachments newer than 7 days for free teams', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
			const attachment = createMockAttachment('att-3', sixDaysAgo, null);

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(0);
			expect(deleteFromBlob).not.toHaveBeenCalled();
			expect(db.attachment.delete).not.toHaveBeenCalled();
		});

		it('should NOT delete attachments newer than 30 days for paid teams', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
			const attachment = createMockAttachment('att-4', twentyDaysAgo, 'ACTIVE');

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(0);
			expect(deleteFromBlob).not.toHaveBeenCalled();
			expect(db.attachment.delete).not.toHaveBeenCalled();
		});

		it('should treat PAST_DUE subscriptions as paid', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const attachment = createMockAttachment('att-5', thirtyOneDaysAgo, 'PAST_DUE');

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue(attachment);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.paid).toBe(1);
			expect(body.deleted.free).toBe(0);
		});

		it('should treat CANCELED subscriptions as free', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const attachment = createMockAttachment('att-6', eightDaysAgo, 'CANCELED');

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue(attachment);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.free).toBe(1);
			expect(body.deleted.paid).toBe(0);
		});

		it('should handle attachments linked via testResult', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const attachment = createMockAttachment('att-7', eightDaysAgo, null, false);

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue(attachment);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(1);
			expect(deleteFromBlob).toHaveBeenCalled();
		});

		it('should handle mixed free and paid attachments', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const freeAttachment = createMockAttachment('att-free', eightDaysAgo, null);
			const paidAttachment = createMockAttachment('att-paid', thirtyOneDaysAgo, 'ACTIVE');

			vi.mocked(db.attachment.findMany).mockResolvedValue([freeAttachment, paidAttachment]);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue({} as any);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.free).toBe(1);
			expect(body.deleted.paid).toBe(1);
			expect(body.deleted.total).toBe(2);
			expect(deleteFromBlob).toHaveBeenCalledTimes(2);
			expect(db.attachment.delete).toHaveBeenCalledTimes(2);
		});
	});

	describe('Error Handling', () => {
		it('should continue deleting other attachments if blob deletion fails', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
			const attachment1 = {
				id: 'att-1',
				url: 'https://blob.vercel.com/att-1',
				createdAt: eightDaysAgo,
				testCase: {
					project: {
						team: { subscription: null }
					}
				},
				testResult: null
			};
			const attachment2 = {
				id: 'att-2',
				url: 'https://blob.vercel.com/att-2',
				createdAt: eightDaysAgo,
				testCase: {
					project: {
						team: { subscription: null }
					}
				},
				testResult: null
			};

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment1, attachment2] as any);
			// Mock blob deletion to fail 3 times (all retries) for first attachment, succeed for second
			vi.mocked(deleteFromBlob)
				.mockRejectedValueOnce(new Error('Blob not found'))
				.mockRejectedValueOnce(new Error('Blob not found'))
				.mockRejectedValueOnce(new Error('Blob not found'))
				.mockResolvedValueOnce(undefined);
			vi.mocked(db.attachment.delete).mockResolvedValue({} as any);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(2);
			expect(body.errors).toHaveLength(1);
			expect(body.errors[0]).toContain('Blob deletion failed after 3 attempts');
			expect(db.attachment.delete).toHaveBeenCalledTimes(2);
		});

		it('should skip attachments without project association', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
			const orphanAttachment = {
				id: 'att-orphan',
				url: 'https://blob.vercel.com/orphan',
				createdAt: eightDaysAgo,
				testCase: null,
				testResult: null
			};

			vi.mocked(db.attachment.findMany).mockResolvedValue([orphanAttachment] as any);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(0);
			expect(deleteFromBlob).not.toHaveBeenCalled();
			expect(db.attachment.delete).not.toHaveBeenCalled();
		});

		it('should handle database errors gracefully', async () => {
			const request = createMockRequest('Bearer test-secret-key');

			vi.mocked(db.attachment.findMany).mockRejectedValue(
				new Error('Database connection error')
			);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.success).toBe(false);
			expect(body.error).toBe('Database connection error');
		});

		it('should track errors but continue processing', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
			const attachment1 = {
				id: 'att-1',
				url: 'https://blob.vercel.com/att-1',
				createdAt: eightDaysAgo,
				testCase: {
					project: {
						team: { subscription: null }
					}
				},
				testResult: null
			};
			const attachment2 = {
				id: 'att-2',
				url: 'https://blob.vercel.com/att-2',
				createdAt: eightDaysAgo,
				testCase: {
					project: {
						team: { subscription: null }
					}
				},
				testResult: null
			};

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment1, attachment2] as any);
			vi.mocked(deleteFromBlob).mockResolvedValue(undefined);
			vi.mocked(db.attachment.delete)
				.mockRejectedValueOnce(new Error('Delete failed'))
				.mockResolvedValueOnce({} as any);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.deleted.total).toBe(1); // Only second one succeeded
			expect(body.errors).toHaveLength(1);
			expect(body.errors[0]).toContain('Failed to process att-1');
		});
	});

	describe('Response Format', () => {
		it('should return correct response structure on success', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			vi.mocked(db.attachment.findMany).mockResolvedValue([]);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				deleted: {
					free: 0,
					paid: 0,
					total: 0
				},
				timestamp: expect.any(String)
			});
			expect(body.errors).toBeUndefined();
		});

		it('should include errors in response when they occur', async () => {
			const request = createMockRequest('Bearer test-secret-key');
			const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
			const attachment = {
				id: 'att-1',
				url: 'https://blob.vercel.com/att-1',
				createdAt: eightDaysAgo,
				testCase: {
					project: {
						team: { subscription: null }
					}
				},
				testResult: null
			};

			vi.mocked(db.attachment.findMany).mockResolvedValue([attachment] as any);
			vi.mocked(deleteFromBlob).mockRejectedValue(new Error('Blob error'));
			vi.mocked(db.attachment.delete).mockResolvedValue({} as any);

			const response = await GET({ request, params: {}, url: new URL(request.url) } as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.errors).toBeDefined();
			expect(Array.isArray(body.errors)).toBe(true);
			expect(body.errors.length).toBeGreaterThan(0);
		});
	});
});
