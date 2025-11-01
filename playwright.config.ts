import { defineConfig } from '@playwright/test';
import 'dotenv/config';

if (!process.env.QA_STUDIO_API_KEY) {
	throw new Error('QA_STUDIO_API_KEY is not set');
}
if (!process.env.QA_STUDIO_PROJECT_ID) {
	throw new Error('QA_STUDIO_PROJECT_ID is not set');
}

// Helper to strip ANSI codes from strings (color codes, etc.)
function stripAnsi(str: string): string {
	return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[\d+m/g, '');
}

export default defineConfig({
	reporter: [
		['list'],
		[
			'@qastudio-dev/playwright',
			{
				apiUrl: stripAnsi(process.env.API_URL || 'https://qastudio.dev/api'),
				apiKey: stripAnsi(process.env.QA_STUDIO_API_KEY),
				projectId: stripAnsi(process.env.QA_STUDIO_PROJECT_ID),
				environment: process.env.CI ? 'CI' : 'local',
				createTestRun: true
			}
		]
	],
	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:5173',
		// Capture screenshots on failure
		screenshot: 'only-on-failure',
		// Capture videos on failure
		video: 'retain-on-failure',
		// Enable tracing on failure
		trace: 'retain-on-failure'
	},
	// Uncomment this if you want Playwright to automatically start the dev server
	// webServer: {
	// 	command: 'npm run dev',
	// 	port: 5173,
	// 	reuseExistingServer: true // Don't fail if server is already running
	// },
	testDir: 'e2e'
});
