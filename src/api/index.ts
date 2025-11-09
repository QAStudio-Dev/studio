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

Most endpoints require authentication via Clerk. Include your session token in the Authorization header:

\`\`\`
Authorization: Bearer <your-session-token>
\`\`\`

## Base URL

Production: \`https://qastudio.dev/api\`
Development: \`http://localhost:5173/api\`
		`
	},
	servers: [
		{
			url: 'https://qastudio.dev/api',
			description: 'Production server'
		},
		{
			url: 'http://localhost:5173/api',
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
