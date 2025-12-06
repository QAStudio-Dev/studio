import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { stripe } from '$lib/server/stripe';
import { deleteCache, CacheKeys } from '$lib/server/redis';
import { createAuditLog } from '$lib/server/audit';

/**
 * POST /api/teams/leave
 * Leave the current team (soft delete - removes user from team and all projects)
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	try {
		// Get user's current team
		const user = await db.user.findUnique({
			where: { id: userId },
			include: {
				team: {
					include: {
						members: true,
						subscription: true
					}
				}
			}
		});

		if (!user?.teamId) {
			return json({ message: 'You are not part of a team' }, { status: 400 });
		}

		// If user is the last member, soft delete the team
		if (user.team && user.team.members.length === 1) {
			// Cancel subscription if it exists
			if (user.team.subscription?.stripeSubscriptionId) {
				try {
					// Cancel the Stripe subscription immediately
					await stripe.subscriptions.cancel(user.team.subscription.stripeSubscriptionId);

					// Update database to reflect cancellation
					await db.subscription.update({
						where: { id: user.team.subscription.id },
						data: {
							status: 'CANCELED',
							cancelAtPeriodEnd: false // Already canceled
						}
					});

					console.log(
						`✅ Canceled subscription ${user.team.subscription.stripeSubscriptionId}`
					);
				} catch (subError) {
					console.error('Error canceling subscription:', subError);
					// Continue with team deletion even if subscription cancellation fails
				}
			}

			// Remove user from team
			await db.user.update({
				where: { id: userId },
				data: {
					teamId: null
				}
			});

			// Delete the team and all related data (cascade deletes will handle related records)
			await db.team.delete({
				where: { id: user.teamId }
			});

			// Invalidate user's project cache - team and all team projects are deleted
			await deleteCache(CacheKeys.projects(userId));

			// Audit log team deletion (last member leaving)
			await createAuditLog({
				userId,
				teamId: user.teamId,
				action: 'TEAM_DELETED',
				resourceType: 'Team',
				resourceId: user.teamId,
				metadata: {
					teamName: user.team.name,
					reason: 'Last member left team'
				},
				event
			});

			return json({ message: 'Successfully deleted team and left' });
		}

		const teamId = user.teamId;
		const teamName = user.team?.name;

		// Remove user from team by setting teamId to null
		await db.user.update({
			where: { id: userId },
			data: {
				teamId: null
			}
		});

		// Invalidate caches after member leaves team
		await deleteCache([CacheKeys.projects(userId), CacheKeys.teamStatus(teamId)]);

		// Audit log team member removal
		await createAuditLog({
			userId,
			teamId,
			action: 'TEAM_MEMBER_REMOVED',
			resourceType: 'Team',
			resourceId: teamId,
			metadata: {
				teamName,
				memberEmail: user.email,
				reason: 'User left team voluntarily'
			},
			event
		});

		return json({ message: 'Successfully left the team' });
	} catch (error: any) {
		console.error('Error leaving team:', error);
		return json({ message: error.message || 'Failed to leave team' }, { status: 500 });
	}
};
