import { defineConfig } from '@playwright/test';

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
			apiUrl: stripAnsi(process.env.API_URL || 'http://localhost:5173/api'),
			apiKey: stripAnsi(process.env.QA_STUDIO_API_KEY || 'qas_BnFz5Pj5rPZqEmN4NZx1nWVJCZ-kaPOd'),
			projectId: stripAnsi(process.env.QA_STUDIO_PROJECT_ID || 'cmh7bw2wy0001luub1xau08h6'),
			environment: process.env.CI ? 'CI' : 'local',
			createTestRun: true,
		  },
		],
	  ],
	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:5173',
		// Capture screenshots on failure
		screenshot: 'only-on-failure',
		// Capture videos on failure
		video: 'retain-on-failure',
		// Enable tracing on failure
		trace: 'retain-on-failure',
	},
	// Uncomment this if you want Playwright to automatically start the dev server
	// webServer: {
	// 	command: 'npm run dev',
	// 	port: 5173,
	// 	reuseExistingServer: true // Don't fail if server is already running
	// },
	testDir: 'e2e'
});
