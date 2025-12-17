import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	hasActiveSubscription,
	requireActiveSubscription,
	hasAvailableSeats,
	requireAvailableSeats,
	isFeatureAvailable,
	requireFeature,
	getTeamLimits,
	type TeamLimits
} from './subscriptions';

// Mock the database
vi.mock('./db', () => ({
	db: {
		subscription: {
			findUnique: vi.fn()
		},
		team: {
			findUnique: vi.fn()
		}
	}
}));

// Mock the config module - we'll dynamically change IS_SELF_HOSTED in tests
vi.mock('$lib/config', () => ({
	DEPLOYMENT_CONFIG: {
		IS_SELF_HOSTED: false
	}
}));

import { db } from './db';
import { DEPLOYMENT_CONFIG } from '$lib/config';

describe('subscriptions - Self-Hosted Mode', () => {
	const mockTeamId = 'team_test123';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hasActiveSubscription', () => {
		it('should return true in self-hosted mode without DB call', async () => {
			// Mock self-hosted mode by re-assigning the mocked value
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			const result = await hasActiveSubscription(mockTeamId);

			expect(result).toBe(true);
			// Verify no database call was made
			expect(db.subscription.findUnique).not.toHaveBeenCalled();

			// Reset for other tests
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should check database in SaaS mode', async () => {
			// Ensure SaaS mode
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			// Mock active subscription
			vi.mocked(db.subscription.findUnique).mockResolvedValue({
				id: 'sub_123',
				teamId: mockTeamId,
				status: 'ACTIVE',
				seats: 10,
				stripeCustomerId: 'cus_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
				cancelAtPeriodEnd: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const result = await hasActiveSubscription(mockTeamId);

			expect(result).toBe(true);
			expect(db.subscription.findUnique).toHaveBeenCalledWith({
				where: { teamId: mockTeamId }
			});
		});

		it('should return false for no subscription in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.subscription.findUnique).mockResolvedValue(null);

			const result = await hasActiveSubscription(mockTeamId);

			expect(result).toBe(false);
		});
	});

	describe('requireActiveSubscription', () => {
		it('should not throw in self-hosted mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			await expect(requireActiveSubscription(mockTeamId)).resolves.not.toThrow();
			expect(db.subscription.findUnique).not.toHaveBeenCalled();

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should throw error when no subscription in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.subscription.findUnique).mockResolvedValue(null);

			await expect(requireActiveSubscription(mockTeamId)).rejects.toThrow();
		});
	});

	describe('hasAvailableSeats', () => {
		it('should return true in self-hosted mode without DB call', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			const result = await hasAvailableSeats(mockTeamId);

			expect(result).toBe(true);
			expect(db.team.findUnique).not.toHaveBeenCalled();

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should check seat limits in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.team.findUnique).mockResolvedValue({
				id: mockTeamId,
				name: 'Test Team',
				plan: 'PRO',
				createdAt: new Date(),
				updatedAt: new Date(),
				customSeats: null,
				twilioAccountSid: null,
				twilioAuthToken: null,
				twilioPhoneNumber: null,
				defaultProjectId: null,
				slackAccessToken: null,
				slackBotUserId: null,
				slackTeamId: null,
				slackTeamName: null,
				slackChannelId: null,
				slackChannelName: null,
				jiraUrl: null,
				jiraEmail: null,
				jiraApiToken: null,
				jiraProjectKey: null,
				ownerId: 'user_123',
				members: [{ id: 'member1' }, { id: 'member2' }] as any,
				subscription: {
					id: 'sub_123',
					teamId: mockTeamId,
					status: 'ACTIVE',
					seats: 5,
					stripeCustomerId: 'cus_123',
					stripeSubscriptionId: 'sub_123',
					stripePriceId: 'price_123',
					currentPeriodEnd: new Date(),
					cancelAtPeriodEnd: false,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			});

			const result = await hasAvailableSeats(mockTeamId);

			expect(result).toBe(true); // 2 members < 5 seats
		});
	});

	describe('requireAvailableSeats', () => {
		it('should not throw in self-hosted mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			await expect(requireAvailableSeats(mockTeamId)).resolves.not.toThrow();
			expect(db.team.findUnique).not.toHaveBeenCalled();

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});
	});

	describe('isFeatureAvailable', () => {
		it('should return true for all features in self-hosted mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			const aiAnalysis = await isFeatureAvailable(mockTeamId, 'ai_analysis');
			const advancedReports = await isFeatureAvailable(mockTeamId, 'advanced_reports');
			const integrations = await isFeatureAvailable(mockTeamId, 'integrations');

			expect(aiAnalysis).toBe(true);
			expect(advancedReports).toBe(true);
			expect(integrations).toBe(true);
			expect(db.subscription.findUnique).not.toHaveBeenCalled();

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should check subscription for features in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.subscription.findUnique).mockResolvedValue({
				id: 'sub_123',
				teamId: mockTeamId,
				status: 'ACTIVE',
				seats: 10,
				stripeCustomerId: 'cus_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
				cancelAtPeriodEnd: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const result = await isFeatureAvailable(mockTeamId, 'ai_analysis');

			expect(result).toBe(true);
			expect(db.subscription.findUnique).toHaveBeenCalled();
		});

		it('should return false for features without subscription in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.subscription.findUnique).mockResolvedValue(null);

			const result = await isFeatureAvailable(mockTeamId, 'ai_analysis');

			expect(result).toBe(false);
		});
	});

	describe('requireFeature', () => {
		it('should not throw for any feature in self-hosted mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			await expect(requireFeature(mockTeamId, 'ai_analysis')).resolves.not.toThrow();
			await expect(requireFeature(mockTeamId, 'advanced_reports')).resolves.not.toThrow();
			await expect(requireFeature(mockTeamId, 'integrations')).resolves.not.toThrow();
			expect(db.subscription.findUnique).not.toHaveBeenCalled();

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should throw error for features without subscription in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.subscription.findUnique).mockResolvedValue(null);

			// SvelteKit error() throws an object with status and body
			await expect(requireFeature(mockTeamId, 'ai_analysis')).rejects.toMatchObject({
				status: 402
			});
		});
	});

	describe('getTeamLimits', () => {
		const mockTeam = {
			id: mockTeamId,
			name: 'Test Team',
			plan: 'PRO' as const,
			createdAt: new Date(),
			updatedAt: new Date(),
			customSeats: null,
			twilioAccountSid: null,
			twilioAuthToken: null,
			twilioPhoneNumber: null,
			defaultProjectId: null,
			slackAccessToken: null,
			slackBotUserId: null,
			slackTeamId: null,
			slackTeamName: null,
			slackChannelId: null,
			slackChannelName: null,
			jiraUrl: null,
			jiraEmail: null,
			jiraApiToken: null,
			jiraProjectKey: null,
			ownerId: 'user_123',
			members: [
				{ id: 'member1', teamId: mockTeamId, userId: 'user1', role: 'ADMIN' as const },
				{ id: 'member2', teamId: mockTeamId, userId: 'user2', role: 'TESTER' as const }
			],
			subscription: {
				id: 'sub_123',
				teamId: mockTeamId,
				status: 'ACTIVE' as const,
				seats: 10,
				stripeCustomerId: 'cus_123',
				stripeSubscriptionId: 'sub_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: new Date(),
				cancelAtPeriodEnd: false,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			projects: []
		};

		it('should return unlimited limits in self-hosted mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = true;

			// Mock the optimized query that only returns _count
			vi.mocked(db.team.findUnique).mockResolvedValue({
				_count: {
					members: 2
				}
			} as any);

			const limits: TeamLimits = await getTeamLimits(mockTeamId);

			expect(limits).toEqual({
				plan: 'enterprise',
				seats: {
					max: -1, // Unlimited
					used: 2,
					available: -1 // Unlimited
				},
				features: {
					ai_analysis: true,
					advanced_reports: true,
					integrations: true,
					unlimited_projects: true
				},
				subscription: null,
				selfHosted: true
			});

			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;
		});

		it('should return actual limits in SaaS mode', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.team.findUnique).mockResolvedValue(mockTeam);

			const limits: TeamLimits = await getTeamLimits(mockTeamId);

			expect(limits.plan).toBe('pro');
			expect(limits.seats.max).toBe(10);
			expect(limits.seats.used).toBe(2);
			expect(limits.seats.available).toBe(8);
			expect(limits.features.ai_analysis).toBe(true);
			expect(limits.selfHosted).toBe(false);
			expect(limits.subscription).toBeTruthy();
		});

		it('should throw error for non-existent team', async () => {
			(DEPLOYMENT_CONFIG as any).IS_SELF_HOSTED = false;

			vi.mocked(db.team.findUnique).mockResolvedValue(null);

			// SvelteKit error() throws an object with status and body
			await expect(getTeamLimits(mockTeamId)).rejects.toMatchObject({
				status: 404
			});
		});
	});
});
