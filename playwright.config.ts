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
				apiUrl: stripAnsi('https://qastudio.dev/api'),
				// apiUrl: stripAnsi('http://localhost:5173/api'),
				apiKey: stripAnsi(process.env.QA_STUDIO_API_KEY),
				// apiKey: 'qas_nbOw_yvrRJX9Jcmw_1VMxl7l3o1NjlpA',
				projectId: stripAnsi(process.env.QA_STUDIO_PROJECT_ID),
				// projectId: 'ZZt8p4wP',
				environment: process.env.CI ? 'CI' : 'local',
				createTestRun: true
				// verbose: true
			}
		]
	],
	use: {
		baseURL: 'https://qastudio.dev',
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
	testDir: 'e2e/tests',
	workers: 4
});
