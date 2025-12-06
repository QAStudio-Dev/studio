# Database Backup System

## Overview

QA Studio implements automated daily database backups via Vercel Cron. Backups are stored securely in Vercel Blob storage with automatic cleanup.

## Backup Schedule

- **Frequency**: Daily at 3:00 AM UTC
- **Retention**: 30 days (older backups automatically deleted)
- **Format**: JSON (human-readable, version-controlled format)
- **Storage**: Vercel Blob (private to your Vercel account)

## What Gets Backed Up

The backup includes the following tables with all their data:

### ✅ Included Tables

1. **Users** (`users` table)
    - User IDs, emails, names, roles
    - Team associations
    - **Excluded**: `passwordHash` (security)

2. **Teams** (`teams` table)
    - All team data
    - Team members (user references)
    - Subscriptions (included)

3. **Projects** (`projects` table)
    - Project metadata
    - Milestones
    - Environments

4. **Test Data** (`testSuites`, `testCases`, `testRuns` tables)
    - Test suites and hierarchies
    - Test cases with steps
    - Test runs with results

### ❌ Intentionally Excluded Tables

These tables are NOT included in backups for the following reasons:

1. **Sessions** (`session` table)
    - Reason: Ephemeral data, expires automatically
    - Alternative: Users can re-login

2. **Password Reset Tokens** (`passwordResetToken` table)
    - Reason: Short-lived tokens (1 hour), security risk to backup
    - Alternative: Users can request new tokens

3. **API Keys** (`apiKey` table)
    - Reason: Contains bcrypt hashes, should be regenerated after restore
    - Action Required: After restoration, notify users to regenerate API keys

4. **Authenticator Tokens** (`authenticatorToken` table)
    - Reason: Contains encrypted TOTP secrets
    - Security: Should not be backed up to prevent compromise
    - Action Required: Users must re-add authenticators after restore

5. **Attachments** (`attachment` table metadata)
    - Reason: File metadata only, actual files stored separately
    - Action Required: Blob storage has separate retention policies
    - Note: Actual file data requires separate blob backup

6. **Audit Logs** (`auditLog` table)
    - Reason: Large volume, grows indefinitely
    - Alternative: Consider separate compliance archiving strategy
    - **Recommendation**: Implement separate audit log archiving for compliance

7. **Team Invitations** (`teamInvitation` table)
    - Reason: Time-sensitive, expire after 7 days
    - Alternative: Can be re-sent after restore

8. **Enterprise Inquiries** (`enterpriseInquiry` table)
    - Reason: CRM-style data, typically managed separately
    - Alternative: May need separate archiving if required

9. **Jira Integration Data** (`jiraIssue`, `jiraIntegration` tables)
    - Reason: Synced from external system (Jira)
    - Alternative: Can be re-synced from Jira after restore

10. **Slack Integration Data** (`slackIntegration` table)
    - Reason: OAuth tokens and webhooks, should be re-authorized
    - Action Required: Users must re-connect Slack after restore

## Security

### Access Control

- **Storage**: Vercel Blob (requires Vercel account access)
- **Endpoint**: Protected by `CRON_SECRET` Bearer token
- **Passwords**: Never backed up (excluded from User data)
- **Tokens**: API keys and auth tokens excluded for security

### Data Privacy

- Backups comply with GDPR by excluding sensitive authentication data
- User emails are included (required for account recovery)
- Team and project data is business-critical and included

## Restoration Procedure

**IMPORTANT**: Restoring from backup is a manual process. Follow these steps:

### Prerequisites

1. Download backup JSON from Vercel Blob storage
2. Verify backup integrity (valid JSON, expected structure)
3. **Stop all application traffic** (maintenance mode)

### Restoration Steps

#### 1. Download Backup

```bash
# From Vercel Dashboard: Storage → Blob → Download backup JSON
# Or via CLI:
vercel blob list --prefix backup-
vercel blob download <blob-url> -o backup.json
```

#### 2. Prepare Database

```bash
# CRITICAL: Backup current database first
pg_dump $DATABASE_URL > pre-restore-backup.sql

# Clear existing data (if full restore)
# WARNING: This deletes ALL data - ensure you have a backup!
psql $DATABASE_URL -c "TRUNCATE users, teams, projects, test_suites, test_cases, test_runs CASCADE;"
```

#### 3. Restore Data

```typescript
// restoration-script.ts
import { PrismaClient } from '@prisma/client';
import backup from './backup.json';

const prisma = new PrismaClient();

async function restore() {
	// Disable foreign key checks temporarily
	await prisma.$executeRaw`SET session_replication_role = replica;`;

	try {
		// Restore users (exclude passwords)
		for (const user of backup.data.users) {
			await prisma.user.upsert({
				where: { id: user.id },
				update: user,
				create: { ...user, passwordHash: 'RESET_REQUIRED' }
			});
		}

		// Restore teams
		for (const team of backup.data.teams) {
			await prisma.team.upsert({
				where: { id: team.id },
				update: team,
				create: team
			});
		}

		// Restore projects, test suites, cases, runs...
		// (Similar pattern for each table)

		console.log('✅ Restoration complete');
	} finally {
		// Re-enable foreign key checks
		await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
	}
}

restore();
```

#### 4. Post-Restoration Actions

**REQUIRED** after restoration:

1. **Reset All Passwords**
    - Passwords are not backed up (security)
    - Send password reset emails to all users
    - Script: `npm run send-password-resets`

2. **Regenerate API Keys**
    - API keys are not backed up
    - Notify users to regenerate API keys
    - Invalidate old keys if compromised

3. **Re-connect Integrations**
    - Slack: Users must re-authorize
    - Jira: Re-sync projects and issues
    - Authenticators: Users must re-add TOTP codes

4. **Verify Data Integrity**
    - Run database integrity checks
    - Verify foreign key relationships
    - Check user counts, project counts

5. **Resume Application**
    - Exit maintenance mode
    - Monitor error logs
    - Send notification to users

## RPO/RTO

- **RPO** (Recovery Point Objective): 24 hours
    - Daily backups mean up to 24 hours of data loss
    - For lower RPO, enable Point-in-Time Recovery on your database provider

- **RTO** (Recovery Time Objective): 2-4 hours
    - Manual restoration process
    - Depends on database size and team availability

## Monitoring

### Backup Success

Check the `AuditLog` table for backup confirmations:

```sql
SELECT * FROM audit_log
WHERE action = 'DATABASE_BACKUP_CREATED'
ORDER BY created_at DESC
LIMIT 10;
```

### Backup Failures

```sql
SELECT * FROM audit_log
WHERE action = 'DATABASE_BACKUP_FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

### Manual Trigger

To manually trigger a backup:

```bash
curl -X GET https://qastudio.dev/api/cron/backup-database \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Recommendations

### For Production Use

1. **Enable Database Provider Backups**
    - Use Supabase/Neon/PlanetScale built-in backups
    - Enable Point-in-Time Recovery (PITR)
    - This JSON backup is for disaster recovery only

2. **Implement Audit Log Archiving**
    - Audit logs grow indefinitely
    - Move old logs to cold storage (S3 Glacier)
    - Keep 90 days in database, archive older

3. **Test Restoration Regularly**
    - Quarterly restoration tests
    - Document any issues found
    - Update this guide accordingly

4. **Monitor Backup Size**
    - Large databases may exceed Blob limits
    - Consider chunked/compressed backups
    - Alert if backup size grows significantly

5. **Consider Compliance**
    - GDPR: Right to erasure (ensure deleted users not in backups)
    - HIPAA: Encrypt backups at rest (Vercel Blob does this)
    - SOC 2: Audit backup access logs

## Troubleshooting

### Backup Fails Silently

Check Vercel cron logs:

```bash
vercel logs --since 24h | grep backup-database
```

### Backup Too Large

If backups exceed 4.5GB (Vercel Blob limit for free tier):

1. Implement compression (gzip)
2. Exclude test run results (largest table)
3. Upgrade to Pro tier for larger limits

### Restoration Errors

Common issues:

- Foreign key violations: Restore tables in dependency order
- Duplicate key errors: Use `upsert` instead of `create`
- Type mismatches: Verify JSON dates are converted to `Date` objects

## File Locations

- Backup endpoint: `src/routes/api/cron/backup-database/+server.ts`
- Cron schedule: `vercel.json`
- Audit actions: `src/lib/server/audit.ts`
- This documentation: `src/routes/api/cron/BACKUPS.md`

## Support

For backup issues, check:

1. Vercel cron logs
2. AuditLog table for backup confirmations
3. Vercel Blob dashboard for stored backups
4. This documentation for restoration procedures
