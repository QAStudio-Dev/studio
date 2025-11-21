import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { deleteFromBlob } from '$lib/server/blob-storage';
import { env } from '$env/dynamic/private';

/**
 * Cron job to clean up old attachments
 * - Free teams: Delete attachments older than 7 days
 * - Paid teams: Delete attachments older than 30 days
 *
 * This endpoint should be called by Vercel Cron or similar scheduler
 * Protected by CRON_SECRET environment variable
 */
export const GET: RequestHandler = async ({ request }) => {
	// Verify authorization
	const authHeader = request.headers.get('authorization');
	const expectedAuth = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : undefined;

	if (!expectedAuth || authHeader !== expectedAuth) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const deletedCount = {
		free: 0,
		paid: 0,
		total: 0
	};

	const errors: string[] = [];

	try {
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Find all attachments with their team subscription status
		// We need to check both testCase and testResult paths to get to the project and team
		const attachments = await db.attachment.findMany({
			where: {
				createdAt: {
					lte: sevenDaysAgo // Start with 7 days to cover both free and paid
				}
			},
			include: {
				testCase: {
					include: {
						project: {
							include: {
								team: {
									include: {
										subscription: true
									}
								}
							}
						}
					}
				},
				testResult: {
					include: {
						testRun: {
							include: {
								project: {
									include: {
										team: {
											include: {
												subscription: true
											}
										}
									}
								}
							}
						}
					}
				}
			}
		});

		console.log(`[Cron] Found ${attachments.length} attachments older than 7 days`);

		// Process each attachment
		for (const attachment of attachments) {
			try {
				// Get the team through either testCase or testResult
				const project =
					attachment.testCase?.project || attachment.testResult?.testRun.project;

				if (!project) {
					console.warn(
						`[Cron] Attachment ${attachment.id} has no associated project, skipping`
					);
					continue;
				}

				const team = project.team;
				const subscription = team?.subscription;

				// Determine if team is on paid plan
				const isPaid =
					subscription &&
					(subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE');

				// Determine if attachment should be deleted
				let shouldDelete = false;

				if (isPaid) {
					// Paid teams: delete if older than 30 days
					shouldDelete = attachment.createdAt <= thirtyDaysAgo;
				} else {
					// Free teams: delete if older than 7 days
					shouldDelete = attachment.createdAt <= sevenDaysAgo;
				}

				if (!shouldDelete) {
					continue;
				}

				// Delete from blob storage first
				try {
					await deleteFromBlob(attachment.url);
					console.log(`[Cron] Deleted blob: ${attachment.url}`);
				} catch (blobError: any) {
					console.error(`[Cron] Failed to delete blob ${attachment.url}:`, blobError);
					errors.push(`Blob deletion failed for ${attachment.id}: ${blobError.message}`);
					// Continue with DB deletion even if blob deletion fails
				}

				// Delete from database
				await db.attachment.delete({
					where: { id: attachment.id }
				});

				// Track stats
				if (isPaid) {
					deletedCount.paid++;
				} else {
					deletedCount.free++;
				}
				deletedCount.total++;

				console.log(
					`[Cron] Deleted attachment ${attachment.id} (${isPaid ? 'paid' : 'free'} team)`
				);
			} catch (attachmentError: any) {
				console.error(
					`[Cron] Error processing attachment ${attachment.id}:`,
					attachmentError
				);
				errors.push(`Failed to process ${attachment.id}: ${attachmentError.message}`);
			}
		}

		console.log(
			`[Cron] Cleanup complete: ${deletedCount.total} attachments deleted (${deletedCount.free} free, ${deletedCount.paid} paid)`
		);

		return json({
			success: true,
			deleted: deletedCount,
			errors: errors.length > 0 ? errors : undefined,
			timestamp: now.toISOString()
		});
	} catch (error: any) {
		console.error('[Cron] Attachment cleanup failed:', error);
		return json(
			{
				success: false,
				error: error.message,
				deleted: deletedCount,
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
