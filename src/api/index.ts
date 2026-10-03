import { API } from 'sveltekit-api';

export default new API(import.meta.glob('./**/*.ts'), {
	openapi: '3.0.0',
	info: {
		title: 'QA Studio API',
		version: '1.0.0',
		description: `A comprehensive test management and reporting platform API.

## Features

- **Project Management**: Organize testing by projects with unique keys
- **Test Organization**: Create hierarchical test suites and test cases
- **Test Execution**: Plan and execute test runs across different environments
- **Results Tracking**: Record detailed test results with steps, attachments, and metrics
- **Milestone Planning**: Track testing progress against release milestones

## Authentication

Most endpoints require an API key. Create one under **Settings → API Keys**, then send it with every request using either header:

\`\`\`
Authorization: Bearer <your-api-key>
X-API-Key: <your-api-key>
\`\`\`

Requests made from the QA Studio web app are authenticated with your session cookie automatically.

## Base URL

Production: \`https://qastudio.dev/api\`
Development: \`http://localhost:3000/api\`
		`
	},
	servers: [
		{
			url: 'https://qastudio.dev/api',
			description: 'Production server'
		},
		{
			url: 'http://localhost:3000/api',
			description: 'Development server'
		}
	],
	tags: [
		{
			name: 'Projects',
			description: 'Project management endpoints'
		},
		{
			name: 'Suites',
			description: 'Test suite organization endpoints'
		},
		{
			name: 'Cases',
			description: 'Test case management endpoints'
		},
		{
			name: 'Runs',
			description: 'Test execution endpoints'
		},
		{
			name: 'Results',
			description: 'Test result recording endpoints'
		},
		{
			name: 'Milestones',
			description: 'Milestone tracking endpoints'
		},
		{
			name: 'Environments',
			description: 'Environment configuration endpoints'
		},
		{
			name: 'Attachments',
			description: 'File attachment endpoints'
		}
	]
});
