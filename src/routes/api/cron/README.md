# Cron Jobs

QA Studio uses Vercel Cron to run scheduled jobs. All cron endpoints are protected by the `CRON_SECRET` environment variable.

## Available Jobs

### Attachment Cleanup (`/api/cron/cleanup-attachments`)

**Schedule**: Daily at 2:00 AM UTC (`0 2 * * *`)

**Purpose**: Automatically delete old attachments to manage storage costs.

**Retention Policy**:

- **Free teams**: 7 days
- **Paid teams**: 30 days (ACTIVE or PAST_DUE subscription status)

**What it does**:

1. Finds all attachments older than 7 days
2. Checks the team's subscription status for each attachment
3. Deletes attachments based on retention policy
4. Deletes from both database and blob storage (Vercel Blob or local)
5. Returns summary with deletion counts and any errors

**Response Example**:

```json
{
	"success": true,
	"deleted": {
		"free": 42,
		"paid": 15,
		"total": 57
	},
	"timestamp": "2025-01-20T02:00:00.000Z"
}
```

## Setup

### 1. Add Cron Secret to Environment

Generate a secure random string:

```bash
openssl rand -hex 32
```

Add to `.env.local` and Vercel environment variables:

```bash
CRON_SECRET=your_generated_secret_here
```

### 2. Configure in Vercel

The cron jobs are configured in `vercel.json`:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-attachments",
			"schedule": "0 2 * * *"
		}
	]
}
```

Vercel automatically:

- Calls the endpoint at the scheduled time
- Includes `Authorization: Bearer ${CRON_SECRET}` header
- Retries on failure

### 3. Deploy

Cron jobs are automatically deployed with your application. Check the Vercel dashboard to monitor execution.

## Testing Locally

You can test cron endpoints locally:

```bash
# Generate a secret for local testing
export CRON_SECRET=$(openssl rand -hex 32)

# Call the endpoint with the secret
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:5173/api/cron/cleanup-attachments
```

## Monitoring

Check cron execution logs in:

1. **Vercel Dashboard** → Your Project → Cron Jobs
2. **Function Logs** → Filter by `/api/cron/*`

Look for:

- `[Cron] Found X attachments older than 7 days`
- `[Cron] Deleted attachment {id} (free/paid team)`
- `[Cron] Cleanup complete: X attachments deleted`

## Cron Schedule Syntax

The schedule uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

Examples:

- `0 2 * * *` - Daily at 2:00 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

## Security

- All cron endpoints MUST verify the `Authorization` header
- Never expose cron endpoints without authentication
- Use environment variables for secrets
- Log all cron executions for audit trail

## Adding New Cron Jobs

1. Create endpoint in `src/routes/api/cron/{job-name}/+server.ts`
2. Add authorization check:
    ```typescript
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
    	return json({ error: 'Unauthorized' }, { status: 401 });
    }
    ```
3. Add to `vercel.json`:
    ```json
    {
    	"crons": [
    		{
    			"path": "/api/cron/{job-name}",
    			"schedule": "0 * * * *"
    		}
    	]
    }
    ```
4. Deploy and monitor
