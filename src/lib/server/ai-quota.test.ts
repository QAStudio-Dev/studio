import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAIAnalysisQuota, incrementAIAnalysisUsage, shouldResetQuota } from './ai-quota';
import { db } from './db';

// Mock the database
vi.mock('./db', () => ({
	db: {
		subscription: {
			update: vi.fn(),
			updateMany: vi.fn(),
			findUnique: vi.fn()
		}
	}
}));

describe('AI Analysis Quota Management', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('shouldResetQuota', () => {
		it('should return true when resetAt is null', () => {
			expect(shouldResetQuota(null)).toBe(true);
		});

		it('should return true when resetAt is undefined', () => {
			expect(shouldResetQuota(undefined)).toBe(true);
		});

		it('should return false when in same month and year', () => {
			const now = new Date('2025-11-21');
			const resetAt = new Date('2025-11-15'); // Same month
			expect(shouldResetQuota(resetAt, now)).toBe(false);
		});

		it('should return true when month changed', () => {
			const now = new Date('2025-12-01');
			const resetAt = new Date('2025-11-30'); // Previous month
			expect(shouldResetQuota(resetAt, now)).toBe(true);
		});

		it('should return true when year changed', () => {
			const now = new Date('2026-01-15');
			const resetAt = new Date('2025-12-31'); // Previous year
			expect(shouldResetQuota(resetAt, now)).toBe(true);
		});

		it('should return true when both month and year changed', () => {
			const now = new Date('2026-02-01');
			const resetAt = new Date('2025-11-30'); // Different month and year
			expect(shouldResetQuota(resetAt, now)).toBe(true);
		});
	});

	describe('checkAIAnalysisQuota - Pro Tier', () => {
		it('should allow unlimited analyses for ACTIVE subscription', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'ACTIVE',
				aiAnalysisCount: 50
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: -1, // Unlimited
				used: 50
			});
			expect(db.subscription.update).not.toHaveBeenCalled();
		});

		it('should allow unlimited analyses for PAST_DUE subscription', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'PAST_DUE',
				aiAnalysisCount: 100
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: -1,
				used: 100
			});
		});

		it('should handle zero usage for pro subscription', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'ACTIVE',
				aiAnalysisCount: 0
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: -1,
				used: 0
			});
		});
	});

	describe('checkAIAnalysisQuota - Free Tier with Reset', () => {
		it('should reset quota when resetAt is null', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 8,
				aiAnalysisResetAt: null
			};

			vi.mocked(db.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 0
			});

			expect(db.subscription.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'sub_123',
					OR: [
						{ aiAnalysisResetAt: null },
						{ aiAnalysisResetAt: { lt: expect.any(Date) } }
					]
				},
				data: {
					aiAnalysisCount: 0,
					aiAnalysisResetAt: expect.any(Date)
				}
			});
		});

		it('should reset quota when month changed', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 10,
				aiAnalysisResetAt: new Date('2025-10-15') // Previous month
			};

			vi.mocked(db.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 0
			});

			expect(db.subscription.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'sub_123',
					OR: [
						{ aiAnalysisResetAt: null },
						{ aiAnalysisResetAt: { lt: expect.any(Date) } }
					]
				},
				data: {
					aiAnalysisCount: 0,
					aiAnalysisResetAt: expect.any(Date)
				}
			});
		});

		it('should reset quota when year changed', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 10,
				aiAnalysisResetAt: new Date('2024-12-31')
			};

			vi.mocked(db.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result.allowed).toBe(true);
			expect(result.used).toBe(0);
			expect(db.subscription.updateMany).toHaveBeenCalled();
		});

		it('should handle null subscription gracefully during reset', async () => {
			const result = await checkAIAnalysisQuota('team_123', null);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 0
			});

			expect(db.subscription.update).not.toHaveBeenCalled();
		});
	});

	describe('checkAIAnalysisQuota - Free Tier within Month', () => {
		const currentResetAt = new Date(); // Same month

		it('should allow analysis when usage is 0/10', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 0,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 0
			});
			expect(db.subscription.update).not.toHaveBeenCalled();
		});

		it('should allow analysis when usage is 5/10', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 5,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 5
			});
		});

		it('should allow analysis when usage is 9/10 (last one)', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 9,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 9
			});
		});

		it('should deny analysis when quota exceeded (10/10)', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 10,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result.allowed).toBe(false);
			expect(result.limit).toBe(10);
			expect(result.used).toBe(10);
			expect(result.message).toContain('Free tier limit');
			expect(result.message).toContain('Upgrade to Pro');
		});

		it('should deny analysis when quota exceeded (15/10)', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 15,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result.allowed).toBe(false);
			expect(result.used).toBe(15);
		});

		it('should handle undefined aiAnalysisCount as 0', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: undefined,
				aiAnalysisResetAt: currentResetAt
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result).toEqual({
				allowed: true,
				limit: 10,
				used: 0
			});
		});
	});

	describe('incrementAIAnalysisUsage', () => {
		it('should increment usage for free tier user', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'INACTIVE',
				aiAnalysisCount: 5
			};

			vi.mocked(db.subscription.update).mockResolvedValue(subscription as any);

			await incrementAIAnalysisUsage('team_123', subscription);

			expect(db.subscription.update).toHaveBeenCalledWith({
				where: { id: 'sub_123' },
				data: {
					aiAnalysisCount: { increment: 1 }
				}
			});
		});

		it('should NOT increment usage for ACTIVE pro user', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'ACTIVE',
				aiAnalysisCount: 50
			};

			await incrementAIAnalysisUsage('team_123', subscription);

			expect(db.subscription.update).not.toHaveBeenCalled();
		});

		it('should NOT increment usage for PAST_DUE pro user', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'PAST_DUE',
				aiAnalysisCount: 100
			};

			await incrementAIAnalysisUsage('team_123', subscription);

			expect(db.subscription.update).not.toHaveBeenCalled();
		});

		it('should handle null subscription gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await incrementAIAnalysisUsage('team_123', null);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Team team_123 has no subscription record, skipping usage increment'
			);
			expect(db.subscription.update).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should handle undefined subscription gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			await incrementAIAnalysisUsage('team_123', undefined);

			expect(consoleSpy).toHaveBeenCalled();
			expect(db.subscription.update).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('Edge Cases', () => {
		it('should handle CANCELED subscription as free tier', async () => {
			const subscription = {
				id: 'sub_123',
				status: 'CANCELED',
				aiAnalysisCount: 3,
				aiAnalysisResetAt: new Date()
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(10);
			expect(result.used).toBe(3);
		});

		it('should handle missing status as free tier', async () => {
			const subscription = {
				id: 'sub_123',
				aiAnalysisCount: 7,
				aiAnalysisResetAt: new Date()
			};

			const result = await checkAIAnalysisQuota('team_123', subscription);

			expect(result.allowed).toBe(true);
			expect(result.limit).toBe(10);
		});
	});
});
