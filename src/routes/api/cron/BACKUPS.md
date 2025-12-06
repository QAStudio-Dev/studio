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
    - **Test runs with results (last 90 days only)**
        - Older test runs are excluded to prevent memory exhaustion
        - For complete historical data, implement separate archiving

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

## Backup Integrity & Validation

### Automatic Validation

Every backup is automatically validated before upload:

1. **JSON Structure Validation**: Ensures backup can be parsed and contains all required fields
2. **Required Fields Check**: Validates presence of `data`, `version`, and `timestamp` fields
3. **Table Verification**: Confirms all expected tables are present (users, teams, projects, testSuites, testCases, testRuns)
4. **SHA-256 Checksum**: Generates integrity hash for verification during restoration

### Checksum Verification

Each backup includes a SHA-256 checksum in the audit log and response metadata. To verify backup integrity:

```bash
# Download backup
vercel blob download <blob-url> -o backup.json

# Verify checksum
sha256sum backup.json
# Compare with checksum from audit log
```

### Schema Versioning

Backups include a `version` field (currently `1.0`) to handle future schema changes during restoration.

## Security

### Access Control

- **Storage**: Vercel Blob with `access: 'public'` (only supported mode)
- **Endpoint**: Protected by `CRON_SECRET` Bearer token
- **Passwords**: Never backed up (excluded from User data)
- **Tokens**: API keys and auth tokens excluded for security
- **Audit Trail**: All backups logged with 'system' user (special internal user for automated operations)
- **Integrity**: SHA-256 checksums recorded in audit logs for tamper detection

**⚠️ CRITICAL SECURITY LIMITATION**

Vercel Blob currently only supports `access: 'public'`, meaning backup URLs are **publicly accessible** to anyone with the URL. Security relies on:

1. **URL Unpredictability**: Random 128-bit suffix added to filenames
2. **URL Secrecy**: Treat backup URLs as secrets (never log publicly, only in audit logs)
3. **Vercel Account Auth**: Dashboard access requires Vercel authentication

**Risks:**

- If backup URLs leak (logs, error messages, browser history), backups are exposed
- URLs have no expiration - they remain valid indefinitely
- No access logging to detect unauthorized downloads

**Mitigation Strategies:**

1. **Client-Side Encryption** (Recommended for sensitive data):

    ```typescript
    import { createCipheriv, randomBytes } from 'crypto';

    // Encrypt backup before upload
    const encryptionKey = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

    const encryptedBackup = Buffer.concat([cipher.update(backupJSON, 'utf8'), cipher.final()]);
    ```

2. **Rotate Backup URLs**: Delete and recreate backups periodically
3. **Monitor Access**: Enable Vercel Blob analytics to detect suspicious access patterns
4. **Limit Retention**: Current 30-day retention minimizes exposure window
5. **Network Restrictions**: Deploy behind VPN if possible

**For High-Security Environments:**

- Consider alternative blob storage with private access (AWS S3, Azure Blob with SAS tokens)
- Implement application-level access control with signed URLs
- Use database provider's built-in backup features (Supabase, Neon PITR)

### Data Privacy & Compliance

**⚠️ CRITICAL: GDPR/CCPA Compliance Notice**

Backups contain Personally Identifiable Information (PII) and are subject to data protection regulations:

**PII Included in Backups:**

- ✅ User emails (required for account recovery)
- ✅ User first and last names
- ✅ Team names and associations
- ✅ Project metadata (may contain customer names)
- ✅ Test case descriptions (may contain sensitive business data)

**Excluded for Security/Privacy:**

- ❌ Password hashes
- ❌ API keys
- ❌ Authentication tokens (TOTP secrets, reset tokens)
- ❌ Session data

**Compliance Requirements:**

1. **GDPR (EU) Compliance:**
    - **Right to Erasure**: When users request data deletion, backups containing their data remain for 30 days (retention policy). Document this in your privacy policy.
    - **Data Retention**: 30-day retention may exceed necessary retention period. Review with legal counsel.
    - **Data Transfers**: Backups stored in Vercel Blob (US-based). Ensure appropriate safeguards for international transfers.
    - **Access Logs**: Monitor audit logs for backup access compliance (SOC 2, ISO 27001).

2. **CCPA (California) Compliance:**
    - Users have right to know what PII is collected and stored in backups
    - Must be able to provide backup data to users upon request
    - 30-day retention applies to deletion requests

3. **Recommended Actions:**
    - **Update Privacy Policy**: Document backup retention and PII storage
    - **Data Processing Agreement**: Ensure Vercel's DPA covers backup storage
    - **Encryption**: Backups encrypted at rest by Vercel Blob (AES-256)
    - **Access Control**: Limit backup access to authorized personnel only
    - **Audit Trail**: All backup operations logged with `DATABASE_BACKUP_CREATED` events
    - **Deletion Procedure**: Implement process to manually delete backups when legally required

4. **High-Risk Data:**
    - If your application processes health data (HIPAA), financial data (PCI-DSS), or other regulated data, backups may require:
        - Additional encryption (client-side encryption before upload)
        - Shorter retention periods
        - Geographic restrictions on storage location
        - Separate compliance certifications

## Restoration Procedure

**IMPORTANT**: Restoring from backup is a manual process. Follow these steps:

### Prerequisites

1. Download backup JSON from Vercel Blob storage
2. Verify backup integrity (checksum, valid JSON, expected structure)
3. **Stop all application traffic** (maintenance mode)

### Restoration Steps

#### 1. Download and Verify Backup

```bash
# From Vercel Dashboard: Storage → Blob → Download backup JSON
# Or via CLI:
vercel blob list --prefix backup-
vercel blob download <blob-url> -o backup.json

# Verify checksum (get expected checksum from audit log)
sha256sum backup.json
# Should match checksum from: SELECT metadata->>'checksum' FROM audit_log WHERE action = 'DATABASE_BACKUP_CREATED' ORDER BY created_at DESC LIMIT 1;

# Validate JSON structure
jq '.version, .timestamp, .data | keys' backup.json
# Should output: "1.0", timestamp, and list of tables
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

### Deletion Failure Alerts

**IMPORTANT**: Deletion failures are automatically logged to the audit trail for monitoring:

```sql
-- Check for deletion failures
SELECT
  created_at,
  metadata->>'failedCount' as failed_count,
  metadata->>'totalAttempted' as total_attempted,
  metadata->'failedBackups' as failed_backups,
  metadata->>'warning' as warning
FROM audit_log
WHERE action = 'DATABASE_BACKUP_DELETION_FAILED'
ORDER BY created_at DESC;
```

**Recommended Actions**:

1. Set up automated monitoring to query this table periodically
2. Configure alerts when `DATABASE_BACKUP_DELETION_FAILED` events are detected
3. Investigate storage quota and permissions if deletions consistently fail
4. Consider manual cleanup if automated deletion is blocked

**Storage Quota Risks**:

- Failed deletions can lead to storage quota exhaustion
- Vercel Blob free tier: 4.5GB limit
- Monitor total backup storage size regularly
- Manual cleanup may be required if automated cleanup fails repeatedly

### Manual Trigger

To manually trigger a backup:

```bash
curl -X GET https://qastudio.dev/api/cron/backup-database \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Manual Backup Deletion (GDPR/CCPA Compliance)

**When to Delete Backups Manually:**

- User exercises "Right to Erasure" (GDPR Article 17)
- User requests data deletion under CCPA
- Legal hold or investigation requires specific backup removal
- Compliance audit requires proof of deletion

**Deletion Procedure:**

```bash
# 1. List all backups
vercel blob list --prefix backup-

# 2. Identify backups containing user data (by timestamp)
# Example: User deleted on 2025-12-01, backups before this date may contain their data

# 3. Delete specific backup
vercel blob delete <blob-url>

# 4. Verify deletion
vercel blob list --prefix backup- | grep <filename>

# 5. Document deletion in compliance log
# Record: timestamp, backup filename, reason, authorized by
```

**Important Notes:**

- Deletion is **permanent and irreversible**
- Document all manual deletions for compliance audits
- Consider creating a compliance deletion log separate from audit trail
- Automated 30-day retention continues unless manually overridden
- May need to delete multiple backups if user data spans multiple days

**Compliance Checklist:**

- [ ] Verify user's deletion request is authenticated
- [ ] Identify all backups containing user's PII (check 30-day window)
- [ ] Delete backups from Vercel Blob storage
- [ ] Verify deletion from Vercel dashboard
- [ ] Document deletion (timestamp, backup IDs, reason, approver)
- [ ] Respond to user's deletion request within regulatory timeframe (30 days GDPR, 45 days CCPA)

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
    - **Performance Note**: Test runs are limited to the last 90 days
        - This prevents memory exhaustion and blob size limits
        - Older test runs should be archived separately if historical data is needed
        - If you have extremely high test volume, consider further limiting the window

5. **Compliance & Data Protection**
    - **GDPR Compliance**:
        - Document 30-day backup retention in privacy policy
        - Implement process for manual backup deletion (Right to Erasure)
        - Review data transfer safeguards for US-based Vercel Blob storage
        - Maintain audit logs of all backup access and deletion events
    - **CCPA Compliance**:
        - Disclose backup retention in privacy notice
        - Provide backup data to users upon request
        - Respond to deletion requests within 45-day window
    - **HIPAA** (if applicable):
        - Verify Vercel's BAA covers backup storage
        - Consider client-side encryption before upload
        - Implement access controls and audit logging
    - **SOC 2 / ISO 27001**:
        - Monitor backup access via audit logs
        - Document backup procedures and controls
        - Regular restoration testing (quarterly recommended)

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
