import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { createJiraClientFromIntegration } from '$lib/server/integrations/jira';

/**
 * POST /api/integrations/jira/issues
 * Create a Jira issue from a test result
 */
export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const body = await event.request.json();
	const { integrationId, testResultId, projectKey, summary, description, issueType, priority } =
		body;

	if (!integrationId || !testResultId || !projectKey || !summary || !issueType) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	// Get user's team
	const user = await db.user.findUnique({
		where: { id: userId },
		include: { team: true }
	});

	if (!user?.teamId) {
		return json({ error: 'User must be part of a team' }, { status: 400 });
	}

	// Verify integration belongs to user's team
	const integration = await db.integration.findFirst({
		where: {
			id: integrationId,
			teamId: user.teamId,
			type: 'JIRA'
		}
	});

	if (!integration) {
		return json({ error: 'Integration not found' }, { status: 404 });
	}

	// Get test result
	const testResult = await db.testResult.findUnique({
		where: { id: testResultId },
		include: {
			testCase: {
				include: {
					project: true
				}
			},
			testRun: true
		}
	});

	if (!testResult) {
		return json({ error: 'Test result not found' }, { status: 404 });
	}

	// Create Jira client
	const jiraClient = createJiraClientFromIntegration(integration);
	if (!jiraClient) {
		return json({ error: 'Invalid Jira configuration' }, { status: 500 });
	}

	// Create the issue in Jira
	const result = await jiraClient.createIssue({
		projectKey,
		summary,
		description: description || '',
		issueType,
		priority,
		labels: ['qa-studio', 'automated-test']
	});

	if (result.error) {
		return json({ error: result.error }, { status: 500 });
	}

	// Save the issue link in our database
	const jiraIssue = await db.jiraIssue.create({
		data: {
			jiraIssueKey: result.data.key,
			jiraIssueId: result.data.id,
			integrationId,
			testResultId,
			projectId: testResult.testCase.projectId,
			summary: result.data.fields.summary,
			description: result.data.fields.description || null,
			issueType: result.data.fields.issuetype.name,
			status: result.data.fields.status.name,
			priority: result.data.fields.priority?.name || null,
			assignee: result.data.fields.assignee?.displayName || null,
			reporter: result.data.fields.reporter?.displayName || null,
			labels: result.data.fields.labels || [],
			lastSyncedAt: new Date()
		}
	});

	// Get Jira base URL for the link
	const config = integration.config as { baseUrl: string };
	const jiraUrl = `${config.baseUrl}/browse/${result.data.key}`;

	return json({
		issue: {
			...jiraIssue,
			url: jiraUrl
		}
	});
};
