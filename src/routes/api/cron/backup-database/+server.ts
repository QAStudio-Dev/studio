import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CRON_SECRET, BACKUP_RETENTION_DAYS } from '$env/static/private';
import { put, list, del } from '@vercel/blob';
import { createAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { createHash } from 'crypto';

// Backup retention configuration (days)
// Environment variable allows different retention for dev vs production
// Default: 30 days (GDPR/CCPA compliant retention period)
const retentionDays = parseInt(BACKUP_RETENTION_DAYS ?? '30', 10);

/**
 * Daily database backup via Vercel Cron
 * GET /api/cron/backup-database
 *
 * This creates a JSON backup of critical database tables.
 * For full SQL backups, use your database provider's built-in backup features.
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/backup-database",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */
export const GET: RequestHandler = async ({ request }) => {
	// Verify cron secret
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${CRON_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `backup-${timestamp}.json`;

		// Validate filename format (e.g., backup-2025-12-06T19-20-28-123Z.json)
		if (!/^backup-[\d-TZ]+\.json$/.test(filename)) {
			throw new Error(`Invalid backup filename format: ${filename}`);
		}

		console.log(`📦 Starting database backup: ${filename}`);

		// Create backup of critical data
		// Note: For full SQL backups, use your database provider's backup features
		const backup = {
			timestamp: new Date().toISOString(),
			version: '1.0',
			data: {
				users: await db.user.findMany({
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						role: true,
						teamId: true,
						createdAt: true
						// Exclude: passwordHash (security)
					}
				}),
				teams: await db.team.findMany({
					include: {
						subscription: true,
						members: {
							select: {
								id: true,
								email: true,
								role: true
							}
						}
					}
				}),
				projects: await db.project.findMany({
					include: {
						milestones: true,
						environments: true
					}
				}),
				testSuites: await db.testSuite.findMany(),
				testCases: await db.testCase.findMany(),
				testRuns: await db.testRun.findMany({
					where: {
						// Only backup test runs from last 90 days to prevent memory exhaustion
						// Older test runs should be archived separately if needed
						createdAt: {
							gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
						}
					},
					include: {
						results: true
					}
				})
			}
		};

		const backupJSON = JSON.stringify(backup, null, 2);
		const backupSize = Buffer.byteLength(backupJSON, 'utf8');

		// Validate backup integrity (ensure it can be parsed and has required fields)
		try {
			const parsed = JSON.parse(backupJSON);
			if (!parsed.data || !parsed.version || !parsed.timestamp) {
				throw new Error('Backup missing required fields (data, version, timestamp)');
			}
			if (typeof parsed.version !== 'string' || typeof parsed.timestamp !== 'string') {
				throw new Error('Backup has invalid field types');
			}
			// Verify all expected tables are present
			const requiredTables = [
				'users',
				'teams',
				'projects',
				'testSuites',
				'testCases',
				'testRuns'
			];
			for (const table of requiredTables) {
				if (!Array.isArray(parsed.data[table])) {
					throw new Error(`Backup missing required table: ${table}`);
				}
			}
		} catch (error: any) {
			throw new Error(`Backup validation failed: ${error.message}`);
		}

		// Generate checksum for integrity verification
		const checksum = createHash('sha256').update(backupJSON).digest('hex');

		// Upload to Vercel Blob
		// SECURITY NOTE: Vercel Blob only supports 'public' access mode
		// - URLs are publicly accessible but require knowledge of the URL
		// - addRandomSuffix provides URL unpredictability (128-bit entropy)
		// - Vercel Blob dashboard requires Vercel account authentication
		// - URLs should be treated as secrets (never log publicly, use audit logs)
		//
		// RECOMMENDATIONS FOR PRODUCTION:
		// 1. Enable client-side encryption before upload for sensitive environments
		// 2. Implement signed URLs with expiration for downloads
		// 3. Monitor access patterns via Vercel Blob analytics
		// 4. Consider Vercel Blob's private storage if/when available
		const blob = await put(filename, backupJSON, {
			access: 'public', // Only supported value in Vercel Blob
			addRandomSuffix: true, // Adds 128-bit random suffix for URL unpredictability
			contentType: 'application/json'
		});

		console.log(`✅ Backup uploaded to Blob: ${blob.url}`);
		console.log(`📊 Backup size: ${(backupSize / 1024 / 1024).toFixed(2)} MB`);

		// Cleanup old backups (keep last N days)
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

		const { blobs } = await list({ prefix: 'backup-' });
		const oldBlobs = blobs.filter((b) => b.uploadedAt < cutoffDate);
		const oldBackupsChecked = oldBlobs.length;

		// Delete old backups in parallel for better performance
		const deletionPromises = oldBlobs.map(async (blob) => {
			try {
				await del(blob.url);
				console.log(`🗑️  Deleted old backup: ${blob.pathname}`);
				return { success: true, pathname: blob.pathname };
			} catch (error: any) {
				const errorMessage = error?.message || String(error);
				console.error(`❌ Failed to delete backup ${blob.pathname}:`, error);
				return {
					success: false,
					pathname: blob.pathname,
					error: errorMessage
				};
			}
		});

		const results = await Promise.allSettled(deletionPromises);

		// Process results to count successes and failures
		let deletedCount = 0;
		let deletionErrors = 0;
		const failedDeletions: Array<{ pathname: string; error: string }> = [];

		for (const result of results) {
			if (result.status === 'fulfilled') {
				if (result.value.success) {
					deletedCount++;
				} else {
					deletionErrors++;
					failedDeletions.push({
						pathname: result.value.pathname,
						error: result.value.error
					});
				}
			} else {
				// This should not happen since we catch errors inside the promise
				// but handle it just in case
				deletionErrors++;
				failedDeletions.push({
					pathname: 'unknown',
					error: result.reason?.message || String(result.reason)
				});
			}
		}

		// Alert on deletion failures via audit log
		if (deletionErrors > 0) {
			await createAuditLog({
				userId: 'system',
				teamId: undefined,
				action: 'DATABASE_BACKUP_DELETION_FAILED',
				resourceType: 'System',
				resourceId: 'backup-cleanup',
				metadata: {
					timestamp: new Date().toISOString(),
					failedCount: deletionErrors,
					totalAttempted: oldBackupsChecked,
					failedBackups: failedDeletions,
					warning:
						'Failed to delete old backups. This may lead to storage quota issues. Manual cleanup may be required.'
				}
			});
		}

		// Audit log the backup
		await createAuditLog({
			userId: 'system',
			teamId: undefined,
			action: 'DATABASE_BACKUP_CREATED',
			resourceType: 'System',
			resourceId: 'database',
			metadata: {
				filename,
				blobUrl: blob.url,
				size: backupSize,
				sizeHuman: `${(backupSize / 1024 / 1024).toFixed(2)} MB`,
				timestamp: new Date().toISOString(),
				checksum,
				tablesBackedUp: Object.keys(backup.data),
				recordCounts: {
					users: backup.data.users.length,
					teams: backup.data.teams.length,
					projects: backup.data.projects.length,
					testSuites: backup.data.testSuites.length,
					testCases: backup.data.testCases.length,
					testRuns: backup.data.testRuns.length
				},
				oldBackupsChecked,
				oldBackupsDeleted: deletedCount,
				deletionErrors
			}
		});

		return json({
			success: true,
			backup: {
				filename,
				url: blob.url,
				size: backupSize,
				sizeHuman: `${(backupSize / 1024 / 1024).toFixed(2)} MB`,
				timestamp,
				checksum,
				recordCounts: {
					users: backup.data.users.length,
					teams: backup.data.teams.length,
					projects: backup.data.projects.length,
					testSuites: backup.data.testSuites.length,
					testCases: backup.data.testCases.length,
					testRuns: backup.data.testRuns.length
				},
				oldBackupsChecked,
				oldBackupsDeleted: deletedCount,
				deletionErrors
			}
		});
	} catch (error: any) {
		console.error('❌ Backup failed:', error);

		// Audit log the failure
		await createAuditLog({
			userId: 'system',
			teamId: undefined,
			action: 'DATABASE_BACKUP_FAILED',
			resourceType: 'System',
			resourceId: 'database',
			metadata: {
				error: error.message,
				stack: error.stack,
				timestamp: new Date().toISOString()
			}
		});

		return json(
			{
				success: false,
				error: error.message
			},
			{ status: 500 }
		);
	}
};
