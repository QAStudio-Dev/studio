import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CRON_SECRET } from '$env/static/private';
import { put, list, del } from '@vercel/blob';
import { createAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';

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
					include: {
						results: true
					}
				})
			}
		};

		const backupJSON = JSON.stringify(backup, null, 2);
		const backupSize = Buffer.byteLength(backupJSON, 'utf8');

		// Upload to Vercel Blob (private by default)
		const blob = await put(filename, backupJSON, {
			access: 'public', // Change to 'public' if you need downloadable links
			addRandomSuffix: false,
			contentType: 'application/json'
		});

		console.log(`✅ Backup uploaded to Blob: ${blob.url}`);
		console.log(`📊 Backup size: ${(backupSize / 1024 / 1024).toFixed(2)} MB`);

		// Cleanup old backups (keep last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const { blobs } = await list({ prefix: 'backup-' });
		let deletedCount = 0;

		for (const oldBlob of blobs) {
			if (oldBlob.uploadedAt < thirtyDaysAgo) {
				await del(oldBlob.url);
				deletedCount++;
				console.log(`🗑️  Deleted old backup: ${oldBlob.pathname}`);
			}
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
				tablesBackedUp: Object.keys(backup.data),
				recordCounts: {
					users: backup.data.users.length,
					teams: backup.data.teams.length,
					projects: backup.data.projects.length,
					testSuites: backup.data.testSuites.length,
					testCases: backup.data.testCases.length,
					testRuns: backup.data.testRuns.length
				},
				oldBackupsDeleted: deletedCount
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
				recordCounts: {
					users: backup.data.users.length,
					teams: backup.data.teams.length,
					projects: backup.data.projects.length,
					testSuites: backup.data.testSuites.length,
					testCases: backup.data.testCases.length,
					testRuns: backup.data.testRuns.length
				},
				oldBackupsDeleted: deletedCount
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
