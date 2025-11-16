<script lang="ts">
	import {
		Plus,
		Key,
		Copy,
		Trash2,
		CheckCircle2,
		AlertCircle,
		Calendar,
		Clock,
		Code
	} from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { apiKeys } = $derived(data);

	let showCreateDialog = $state(false);
	let newKeyName = $state('');
	let newKeyExpireDays = $state<number | null>(null);
	let loading = $state(false);
	let error = $state('');

	// After creation, show the key once
	let createdKey = $state<string | null>(null);
	let showKeyDialog = $state(false);
	let copied = $state(false);

	// Playwright config example dialog
	let showPlaywrightDialog = $state(false);
	let copiedPlaywright = $state(false);

	async function handleCreateKey() {
		if (!newKeyName.trim()) {
			error = 'Please enter a name for the API key';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/api-keys/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newKeyName.trim(),
					expiresInDays: newKeyExpireDays
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to create API key');
			}

			const { key } = await res.json();

			// Show the key to user (only time they'll see it)
			createdKey = key;
			showCreateDialog = false;
			showKeyDialog = true;

			// Reset form
			newKeyName = '';
			newKeyExpireDays = null;

			// Refresh list
			await invalidateAll();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleDeleteKey(keyId: string) {
		if (
			!confirm('Are you sure you want to delete this API key? This action cannot be undone.')
		) {
			return;
		}

		try {
			const res = await fetch(`/api/api-keys/${keyId}/delete`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				throw new Error('Failed to delete API key');
			}

			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function formatDate(date: string | Date | null) {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isExpired(date: string | Date | null) {
		if (!date) return false;
		return new Date(date) < new Date();
	}

	function copyPlaywrightConfig() {
		const exampleKey = apiKeys.length > 0 ? `${apiKeys[0].prefix}...` : 'qas_your_api_key_here';
		const config = getPlaywrightConfig(exampleKey);
		navigator.clipboard.writeText(config);
		copiedPlaywright = true;
		setTimeout(() => {
			copiedPlaywright = false;
		}, 2000);
	}

	function getPlaywrightConfig(apiKey: string) {
		const baseUrl =
			typeof window !== 'undefined' ? window.location.origin : 'https://qastudio.dev';
		return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration for QA Studio
  reporter: [
    ['list'], // Console output
    ['html'], // HTML report
    ['@qa-studio/playwright-reporter', {
      // QA Studio API configuration
      apiUrl: '${baseUrl}/api',
      apiKey: '${apiKey}',

      // Project configuration (required)
      projectKey: 'YOUR_PROJECT_KEY', // e.g., 'PROJ'

      // Test run configuration (optional)
      testRun: {
        name: process.env.TEST_RUN_NAME || 'Automated Test Run',
        environment: process.env.ENVIRONMENT || 'QA',
        milestone: process.env.MILESTONE, // Optional
      },

      // Upload configuration (optional)
      uploadScreenshots: true, // Upload screenshots for failed tests
      uploadVideos: true,      // Upload videos for failed tests
      uploadTraces: true,      // Upload traces for failed tests
    }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});`;
	}
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-6 flex items-start justify-between">
			<div>
				<h1 class="mb-2 text-4xl font-bold">API Keys</h1>
				<p class="text-surface-600-300 text-lg">
					Manage API keys for integrating with QA Studio
				</p>
			</div>
			<div class="flex gap-2">
				<button onclick={() => (showPlaywrightDialog = true)} class="btn preset-outlined">
					<Code class="mr-2 h-4 w-4" />
					Playwright Config
				</button>
				<button
					onclick={() => (showCreateDialog = true)}
					class="btn preset-filled-primary-500"
				>
					<Plus class="mr-2 h-4 w-4" />
					Create API Key
				</button>
			</div>
		</div>

		<!-- Info card -->
		<div class="card border border-primary-500/20 bg-primary-500/5 p-4">
			<div class="flex gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
				<div class="text-sm">
					<p class="mb-1 font-medium">Security Notice</p>
					<p class="text-surface-600-300">
						API keys provide full access to your account. Keep them secure and never
						share them in public repositories. You'll only see the full key once when
						you create it.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- API Keys List -->
	{#if apiKeys.length === 0}
		<div class="card p-12 text-center">
			<Key class="mx-auto mb-4 h-16 w-16 text-surface-400" />
			<h2 class="mb-2 text-2xl font-bold">No API keys yet</h2>
			<p class="text-surface-600-300 mb-6">
				Create an API key to integrate with CI/CD pipelines, test runners, and other tools
			</p>
			<button onclick={() => (showCreateDialog = true)} class="btn preset-filled-primary-500">
				<Plus class="mr-2 h-4 w-4" />
				Create Your First API Key
			</button>
		</div>
	{:else}
		<div class="space-y-4">
			{#each apiKeys as apiKey}
				<div class="card p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="mb-2 flex items-center gap-3">
								<Key class="h-5 w-5 text-primary-500" />
								<h3 class="text-lg font-bold">{apiKey.name}</h3>
								{#if apiKey.expiresAt && isExpired(apiKey.expiresAt)}
									<span class="badge preset-filled-error-500 text-xs"
										>Expired</span
									>
								{/if}
							</div>

							<div class="text-surface-600-300 mb-3 font-mono text-sm">
								{apiKey.prefix}••••••••••••••••••••••••
							</div>

							<div class="text-surface-600-300 flex flex-wrap gap-4 text-sm">
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4" />
									<span>Created {formatDate(apiKey.createdAt)}</span>
								</div>
								{#if apiKey.lastUsedAt}
									<div class="flex items-center gap-2">
										<Clock class="h-4 w-4" />
										<span>Last used {formatDate(apiKey.lastUsedAt)}</span>
									</div>
								{:else}
									<div class="flex items-center gap-2">
										<Clock class="h-4 w-4" />
										<span class="text-surface-500">Never used</span>
									</div>
								{/if}
								{#if apiKey.expiresAt}
									<div class="flex items-center gap-2">
										<AlertCircle class="h-4 w-4" />
										<span>
											{isExpired(apiKey.expiresAt) ? 'Expired' : 'Expires'}
											{formatDate(apiKey.expiresAt)}
										</span>
									</div>
								{/if}
							</div>
						</div>

						<button
							onclick={() => handleDeleteKey(apiKey.id)}
							class="btn preset-outlined-error-500 btn-sm"
							title="Delete API key"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create API Key Dialog -->
{#if showCreateDialog}
	<!-- Backdrop -->
	<button
		onclick={() => (showCreateDialog = false)}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto w-full max-w-lg card border bg-surface-50-950 p-8 shadow-2xl"
		>
			<h2 class="mb-6 text-2xl font-bold">Create API Key</h2>

			{#if error}
				<div class="alert preset-filled-error mb-4">
					<AlertCircle class="h-5 w-5" />
					<p>{error}</p>
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateKey();
				}}
				class="space-y-4"
			>
				<label class="label">
					<span class="mb-2 block text-base font-medium">Name *</span>
					<input
						type="text"
						class="input"
						placeholder="e.g., CI/CD Pipeline, Playwright Reporter"
						bind:value={newKeyName}
						disabled={loading}
						required
						maxlength="100"
					/>
					<p class="text-surface-600-300 mt-1 text-sm">
						A descriptive name to help you identify this key
					</p>
				</label>

				<label class="label">
					<span class="mb-2 block text-base font-medium">Expiration (optional)</span>
					<select class="select" bind:value={newKeyExpireDays} disabled={loading}>
						<option value={null}>Never expires</option>
						<option value={30}>30 days</option>
						<option value={90}>90 days</option>
						<option value={180}>180 days</option>
						<option value={365}>1 year</option>
					</select>
					<p class="text-surface-600-300 mt-1 text-sm">
						For security, consider setting an expiration date
					</p>
				</label>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCreateDialog = false)}
						class="btn flex-1 preset-outlined-surface-500"
						disabled={loading}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn flex-1 preset-filled-primary-500"
						disabled={loading || !newKeyName.trim()}
					>
						{loading ? 'Creating...' : 'Create API Key'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Show Created Key Dialog -->
{#if showKeyDialog && createdKey}
	<!-- Backdrop -->
	<button
		onclick={() => {
			showKeyDialog = false;
			createdKey = null;
		}}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto w-full max-w-2xl card border bg-surface-50-950 p-8 shadow-2xl"
		>
			<div class="mb-4 flex items-center gap-3">
				<CheckCircle2 class="h-8 w-8 text-success-500" />
				<h2 class="text-2xl font-bold">API Key Created!</h2>
			</div>

			<div class="mb-4 rounded-container border border-warning-500/20 bg-warning-500/10 p-4">
				<div class="flex gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-500" />
					<div class="text-sm">
						<p class="mb-1 font-medium">Important: Save this key now!</p>
						<p class="text-surface-600-300">
							This is the only time you'll see the full API key. Make sure to copy it
							and store it securely.
						</p>
					</div>
				</div>
			</div>

			<label class="label mb-6">
				<span class="mb-2 block text-base font-medium">Your API Key</span>
				<div class="flex gap-2">
					<input
						type="text"
						class="input flex-1 font-mono"
						value={createdKey}
						readonly
						onclick={(e: MouseEvent) => (e.target as HTMLInputElement).select()}
					/>
					<button
						onclick={() => copyToClipboard(createdKey!)}
						class="btn preset-filled-primary-500"
						title="Copy to clipboard"
					>
						{#if copied}
							<CheckCircle2 class="h-5 w-5" />
						{:else}
							<Copy class="h-5 w-5" />
						{/if}
					</button>
				</div>
			</label>

			<div class="bg-surface-50-900 mb-6 rounded-container p-4">
				<p class="mb-2 text-sm font-medium">Example usage:</p>
				<pre class="overflow-x-auto text-xs"><code
						>curl https://qastudio.com/api/results \
  -H "Authorization: Bearer {createdKey}"</code
					></pre>
			</div>

			<button
				onclick={() => {
					showKeyDialog = false;
					createdKey = null;
				}}
				class="btn w-full preset-filled-primary-500"
			>
				I've Saved My Key
			</button>
		</div>
	</div>
{/if}

<!-- Playwright Configuration Dialog -->
{#if showPlaywrightDialog}
	<!-- Backdrop -->
	<button
		onclick={() => (showPlaywrightDialog = false)}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto card border bg-surface-50-950 p-8 shadow-2xl"
		>
			<div class="mb-6 flex items-start justify-between">
				<div>
					<h2 class="mb-2 text-2xl font-bold">Playwright Configuration Example</h2>
					<p class="text-surface-600-300">
						Complete <code class="rounded bg-surface-200-800 px-1.5 py-0.5 text-sm"
							>playwright.config.ts</code
						> with QA Studio reporter
					</p>
				</div>
				<button
					onclick={() => copyPlaywrightConfig()}
					class="btn preset-filled-primary-500"
					title="Copy configuration"
				>
					{#if copiedPlaywright}
						<CheckCircle2 class="mr-2 h-4 w-4" />
						Copied!
					{:else}
						<Copy class="mr-2 h-4 w-4" />
						Copy Config
					{/if}
				</button>
			</div>

			<!-- Installation Steps -->
			<div class="mb-6 space-y-4">
				<div class="rounded-container border border-primary-500/20 bg-primary-500/5 p-4">
					<h3 class="mb-3 font-semibold">Quick Setup</h3>
					<ol class="space-y-2 text-sm">
						<li class="flex gap-2">
							<span class="font-bold text-primary-500">1.</span>
							<div>
								<p class="mb-1 font-medium">
									Install the QA Studio Playwright reporter
								</p>
								<pre
									class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
										>npm install --save-dev @qa-studio/playwright-reporter</code
									></pre>
							</div>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary-500">2.</span>
							<div>
								<p class="mb-1 font-medium">
									Create or update <code>playwright.config.ts</code>
								</p>
								<p class="text-surface-600-300">Copy the configuration below</p>
							</div>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary-500">3.</span>
							<div>
								<p class="mb-1 font-medium">Update the configuration</p>
								<ul class="text-surface-600-300 mt-1 ml-4 list-disc space-y-1">
									<li>
										Replace <code>YOUR_PROJECT_KEY</code> with your project key (e.g.,
										'PROJ')
									</li>
									<li>Replace the API key with your actual key from above</li>
									<li>Configure test run name and environment as needed</li>
								</ul>
							</div>
						</li>
						<li class="flex gap-2">
							<span class="font-bold text-primary-500">4.</span>
							<div>
								<p class="font-medium">Run your tests</p>
								<pre
									class="mt-1 overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
										>npx playwright test</code
									></pre>
							</div>
						</li>
					</ol>
				</div>
			</div>

			<!-- Configuration Code -->
			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between">
					<label class="text-sm font-medium">playwright.config.ts</label>
					<button
						onclick={() => copyPlaywrightConfig()}
						class="btn preset-outlined btn-sm"
						title="Copy configuration"
					>
						<Copy class="mr-1 h-3 w-3" />
						Copy
					</button>
				</div>
				<div
					class="max-h-96 overflow-auto rounded-container border border-surface-300-700 bg-surface-900"
				>
					<pre class="p-4 text-xs leading-relaxed text-surface-50"><code
							>{getPlaywrightConfig(
								apiKeys.length > 0
									? `${apiKeys[0].prefix}...`
									: 'qas_your_api_key_here'
							)}</code
						></pre>
				</div>
			</div>

			<!-- Environment Variables Section -->
			<div
				class="mb-6 rounded-container border border-surface-300-700 bg-surface-100-900 p-4"
			>
				<h3 class="mb-3 text-sm font-semibold">Optional: Using Environment Variables</h3>
				<p class="text-surface-600-300 mb-3 text-sm">
					For better security, store your API key in environment variables:
				</p>

				<div class="space-y-3">
					<div>
						<p class="mb-1 text-xs font-medium">1. Create <code>.env</code> file:</p>
						<pre
							class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
								>QA_STUDIO_API_KEY={apiKeys.length > 0
									? apiKeys[0].prefix + '...'
									: 'qas_your_api_key_here'}
QA_STUDIO_PROJECT_KEY=YOUR_PROJECT_KEY
ENVIRONMENT=QA</code
							></pre>
					</div>

					<div>
						<p class="mb-1 text-xs font-medium">2. Update playwright.config.ts:</p>
						<pre
							class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
								>['@qa-studio/playwright-reporter', {'{'}
  apiUrl: '{typeof window !== 'undefined' ? window.location.origin : 'https://qastudio.dev'}/api',
  apiKey: process.env.QA_STUDIO_API_KEY,
  projectKey: process.env.QA_STUDIO_PROJECT_KEY,
  testRun: {'{'}
    environment: process.env.ENVIRONMENT || 'QA',
  {'}'}
{'}'}]</code
							></pre>
					</div>

					<div>
						<p class="mb-1 text-xs font-medium">
							3. Add <code>.env</code> to <code>.gitignore</code>:
						</p>
						<pre
							class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
								># Keep API keys secure
.env
.env.local</code
							></pre>
					</div>
				</div>
			</div>

			<!-- CI/CD Integration -->
			<div
				class="mb-6 rounded-container border border-surface-300-700 bg-surface-100-900 p-4"
			>
				<h3 class="mb-3 text-sm font-semibold">CI/CD Integration Examples</h3>

				<div class="space-y-4">
					<!-- GitHub Actions -->
					<div>
						<p class="mb-2 text-xs font-medium">
							GitHub Actions (.github/workflows/test.yml):
						</p>
						<pre
							class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
								>name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          QA_STUDIO_API_KEY: {'${{ secrets.QA_STUDIO_API_KEY }}'}
          QA_STUDIO_PROJECT_KEY: YOUR_PROJECT_KEY
          ENVIRONMENT: CI</code
							></pre>
					</div>

					<!-- GitLab CI -->
					<div>
						<p class="mb-2 text-xs font-medium">GitLab CI (.gitlab-ci.yml):</p>
						<pre
							class="overflow-x-auto rounded bg-surface-900 p-2 text-xs text-surface-50"><code
								>test:
  image: mcr.microsoft.com/playwright:latest
  script:
    - npm ci
    - npx playwright test
  variables:
    QA_STUDIO_API_KEY: $QA_STUDIO_API_KEY
    QA_STUDIO_PROJECT_KEY: YOUR_PROJECT_KEY
    ENVIRONMENT: CI</code
							></pre>
					</div>
				</div>
			</div>

			<!-- Close Button -->
			<div class="flex justify-end gap-3">
				<button
					onclick={() => (showPlaywrightDialog = false)}
					class="btn preset-filled-primary-500"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
