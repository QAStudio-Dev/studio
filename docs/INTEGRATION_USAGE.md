# Integration Usage Examples

## How to Send Notifications

The integration system is now fully configured and ready to use. Here's how to send notifications from your code:

### Basic Example: Test Run Completed

```typescript
import { notifyTestRunCompleted } from '$lib/server/integrations';

// After a test run finishes
const testRun = await db.testRun.findUnique({
	where: { id: testRunId },
	include: {
		project: true,
		results: true
	}
});

const passed = testRun.results.filter((r) => r.status === 'PASSED').length;
const failed = testRun.results.filter((r) => r.status === 'FAILED').length;
const total = testRun.results.length;
const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

// Get team ID from project
const project = await db.project.findUnique({
	where: { id: testRun.projectId },
	select: { teamId: true }
});

if (project?.teamId) {
	await notifyTestRunCompleted(project.teamId, {
		id: testRun.id,
		name: testRun.name,
		projectName: testRun.project.name,
		passRate,
		total,
		passed,
		failed
	});
}
```

### Example: Test Run Failed

```typescript
import { notifyTestRunFailed } from '$lib/server/integrations';

if (project?.teamId && failedCount > 0) {
	await notifyTestRunFailed(project.teamId, {
		id: testRun.id,
		name: testRun.name,
		projectName: project.name,
		failedCount
	});
}
```

### Example: Custom Notification

```typescript
import { sendNotification } from '$lib/server/integrations';

await sendNotification(teamId, {
	event: 'TEST_CASE_FAILED',
	title: '❌ Test Case Failed',
	message: `Test case "${testCase.title}" failed in ${project.name}`,
	url: `https://qastudio.dev/test-cases/${testCase.id}`,
	color: '#ff0000',
	fields: [
		{ name: 'Test Case', value: testCase.title, inline: false },
		{ name: 'Project', value: project.name, inline: true },
		{ name: 'Priority', value: testCase.priority, inline: true }
	]
});
```

## Where to Add Notifications

### 1. Test Result Creation API

**File**: `/src/routes/api/test-results/+server.ts`

Add notification when a test result is created:

```typescript
// After creating the test result
if (result.status === 'FAILED') {
	// Get project team
	const testRun = await db.testRun.findUnique({
		where: { id: result.testRunId },
		include: { project: true }
	});

	if (testRun?.project.teamId) {
		await sendNotification(testRun.project.teamId, {
			event: 'TEST_CASE_FAILED',
			title: `Test Case Failed: ${testCase.title}`,
			message: `Failed in test run "${testRun.name}"`,
			url: `${process.env.PUBLIC_BASE_URL}/test-runs/${testRun.id}`,
			color: '#ff0000'
		});
	}
}
```

### 2. Test Run Completion

**File**: `/src/routes/api/test-runs/[runId]/complete/+server.ts` (create this)

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notifyTestRunCompleted, notifyTestRunFailed } from '$lib/server/integrations';

export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { runId } = event.params;

	// Update test run status
	const testRun = await db.testRun.update({
		where: { id: runId },
		data: {
			status: 'COMPLETED',
			completedAt: new Date()
		},
		include: {
			project: true,
			results: true
		}
	});

	// Calculate stats
	const passed = testRun.results.filter((r) => r.status === 'PASSED').length;
	const failed = testRun.results.filter((r) => r.status === 'FAILED').length;
	const total = testRun.results.length;
	const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

	// Send notifications
	if (testRun.project.teamId) {
		if (failed > 0) {
			await notifyTestRunFailed(testRun.project.teamId, {
				id: testRun.id,
				name: testRun.name,
				projectName: testRun.project.name,
				failedCount: failed
			});
		}

		await notifyTestRunCompleted(testRun.project.teamId, {
			id: testRun.id,
			name: testRun.name,
			projectName: testRun.project.name,
			passRate,
			total,
			passed,
			failed
		});
	}

	return json(testRun);
};
```

### 3. Milestone Due Date Reminders

**File**: `/src/lib/server/cron/milestone-reminders.ts` (create this)

```typescript
import { db } from '$lib/server/db';
import { notifyMilestoneDue } from '$lib/server/integrations';

export async function sendMilestoneReminders() {
	const now = new Date();
	const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

	const dueMilestones = await db.milestone.findMany({
		where: {
			status: 'ACTIVE',
			dueDate: {
				gte: now,
				lte: threeDaysFromNow
			}
		},
		include: {
			project: true
		}
	});

	for (const milestone of dueMilestones) {
		const daysUntilDue = Math.ceil(
			(milestone.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (milestone.project.teamId) {
			await notifyMilestoneDue(milestone.project.teamId, {
				id: milestone.id,
				name: milestone.name,
				projectName: milestone.project.name,
				dueDate: milestone.dueDate!,
				daysUntilDue
			});
		}
	}
}
```

## User Configuration

Users can now configure notifications in the UI:

1. Go to **Settings → Integrations**
2. Connect their Slack workspace (or other integration)
3. Click the **⚙️ Settings** icon on the integration card
4. Toggle which events they want to receive:
   - ✅ Test Run Started
   - ✅ Test Run Completed
   - ✅ Test Run Failed
   - ✅ Test Case Failed
   - ⬜ Test Case Passed (off by default - can be noisy)
   - ✅ Milestone Due Soon
   - ⬜ Project Created (off by default)

The integration service automatically respects these settings - if a notification type is disabled, it won't be sent to that integration.

## Testing Notifications

To test your Slack integration:

```typescript
// In any API route or server function
import { sendNotification } from '$lib/server/integrations';

await sendNotification('your-team-id', {
	event: 'TEST_RUN_COMPLETED',
	title: '🧪 Test Notification',
	message: 'This is a test message from QA Studio!',
	url: 'https://qastudio.dev',
	color: '#36a64f'
});
```

## Notification Event Types

Available event types (from Prisma schema):

- `TEST_RUN_STARTED` - When a test run begins
- `TEST_RUN_COMPLETED` - When a test run finishes (regardless of pass/fail)
- `TEST_RUN_FAILED` - When a test run has failures (more urgent than completed)
- `TEST_CASE_FAILED` - Individual test case failure
- `TEST_CASE_PASSED` - Individual test case pass (off by default, can be verbose)
- `MILESTONE_DUE` - Milestone approaching due date
- `PROJECT_CREATED` - New project created (off by default)

## Retry Logic

Failed notifications are automatically tracked in the `IntegrationNotification` table with retry information. You can implement a retry worker later to resend failed notifications.

## Multiple Integrations

If a team has multiple integrations (e.g., Slack + Discord), the notification will be sent to all active integrations that have that event enabled.
