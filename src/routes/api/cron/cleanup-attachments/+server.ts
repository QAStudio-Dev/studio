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
	if (!env.CRON_SECRET) {
		console.error('[Cron] CRON_SECRET not configured');
		return json({ error: 'Server misconfiguration' }, { status: 500 });
	}

	const authHeader = request.headers.get('authorization');
	const expectedAuth = `Bearer ${env.CRON_SECRET}`;

	if (authHeader !== expectedAuth) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const deletedCount = {
		free: 0,
		paid: 0,
		total: 0
	};

	const errors: string[] = [];

	try {
		const startTime = Date.now();
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		console.log('[Cron] Starting attachment cleanup job');
		console.log(`[Cron] Retention policy: Free (7 days), Paid (30 days)`);

		// Process in batches to avoid memory issues with large datasets
		const BATCH_SIZE = 100;
		let skip = 0;
		let hasMore = true;
		let totalFound = 0;
		let batchCount = 0;

		while (hasMore) {
			// Find attachments in batches with their team subscription status
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
				},
				take: BATCH_SIZE,
				skip: skip,
				orderBy: { createdAt: 'asc' }
			});

			totalFound += attachments.length;
			hasMore = attachments.length === BATCH_SIZE;
			skip += BATCH_SIZE;
			batchCount++;

			if (batchCount === 1) {
				// Only log once at the start
				console.log(`[Cron] Processing attachments in batches of ${BATCH_SIZE}...`);
			}

			if (attachments.length > 0) {
				console.log(
					`[Cron] Batch ${batchCount}: Processing ${attachments.length} attachments`
				);
			}

			// Process each attachment in this batch
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
					// Note: Using <= means attachments created EXACTLY on the boundary date are deleted
					// This ensures we honor the "X days retention" policy (delete after X days have passed)
					let shouldDelete = false;

					if (isPaid) {
						// Paid teams: delete if 30 days or more have passed since creation
						shouldDelete = attachment.createdAt <= thirtyDaysAgo;
					} else {
						// Free teams: delete if 7 days or more have passed since creation
						shouldDelete = attachment.createdAt <= sevenDaysAgo;
					}

					if (!shouldDelete) {
						continue;
					}

					// Delete from blob storage first with retry logic
					const MAX_BLOB_RETRIES = 3;

					for (let attempt = 1; attempt <= MAX_BLOB_RETRIES; attempt++) {
						try {
							await deleteFromBlob(attachment.url);
							console.log(`[Cron] Deleted blob: ${attachment.url}`);
							break;
						} catch (blobError: any) {
							console.error(
								`[Cron] Blob deletion attempt ${attempt}/${MAX_BLOB_RETRIES} failed for ${attachment.url}:`,
								blobError
							);

							if (attempt === MAX_BLOB_RETRIES) {
								errors.push(
									`Blob deletion failed after ${MAX_BLOB_RETRIES} attempts for ${attachment.id}: ${blobError.message}`
								);
								// Note: We still delete from DB to prevent orphaned DB records
								// The blob will remain in storage and may need manual cleanup
							} else {
								// Wait before retry (exponential backoff: 1s, 2s, 4s)
								await new Promise((resolve) =>
									setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
								);
							}
						}
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
		} // End batch processing loop

		const duration = Date.now() - startTime;
		const durationSeconds = (duration / 1000).toFixed(2);

		console.log(`[Cron] ========================================`);
		console.log(`[Cron] Cleanup Summary:`);
		console.log(`[Cron]   Duration: ${durationSeconds}s`);
		console.log(`[Cron]   Batches processed: ${batchCount}`);
		console.log(`[Cron]   Total found: ${totalFound}`);
		console.log(`[Cron]   Deleted (free): ${deletedCount.free}`);
		console.log(`[Cron]   Deleted (paid): ${deletedCount.paid}`);
		console.log(`[Cron]   Total deleted: ${deletedCount.total}`);
		console.log(`[Cron]   Errors: ${errors.length}`);
		console.log(`[Cron] ========================================`);

		if (errors.length > 0) {
			console.error(`[Cron] Errors during cleanup:`);
			errors.forEach((error, index) => {
				console.error(`[Cron]   ${index + 1}. ${error}`);
			});
		}

		return json({
			success: true,
			deleted: deletedCount,
			duration: duration,
			batches: batchCount,
			errors: errors.length > 0 ? errors : undefined,
			timestamp: now.toISOString()
		});
	} catch (error: any) {
		console.error('[Cron] ========================================');
		console.error('[Cron] FATAL ERROR: Attachment cleanup failed');
		console.error('[Cron]   Error:', error.message);
		console.error('[Cron]   Stack:', error.stack);
		console.error('[Cron] ========================================');
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
