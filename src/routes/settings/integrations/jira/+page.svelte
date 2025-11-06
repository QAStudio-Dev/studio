<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { AlertCircle, ArrowLeft, Check, ExternalLink, Link2 } from 'lucide-svelte';

	let baseUrl = $state('');
	let email = $state('');
	let apiToken = $state('');
	let name = $state('My Jira');
	let connecting = $state(false);
	let error = $state<string | null>(null);

	async function handleConnect() {
		error = null;

		// Validation
		if (!baseUrl || !email || !apiToken || !name) {
			error = 'All fields are required';
			return;
		}

		// Ensure baseUrl doesn't have trailing slash
		baseUrl = baseUrl.replace(/\/$/, '');

		// Validate baseUrl format
		try {
			new URL(baseUrl);
		} catch {
			error = 'Invalid Jira URL. Please enter a valid URL (e.g., https://yourcompany.atlassian.net)';
			return;
		}

		connecting = true;

		try {
			const res = await fetch('/api/integrations/jira', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					baseUrl,
					email,
					apiToken
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to connect to Jira');
			}

			// Success!
			await invalidateAll();
			goto('/settings?tab=integrations');
		} catch (err: any) {
			error = err.message;
		} finally {
			connecting = false;
		}
	}
</script>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/settings?tab=integrations"
			class="mb-4 inline-flex items-center gap-2 text-primary-500 hover:underline"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Settings
		</a>
		<h1 class="mb-2 text-4xl font-bold">Connect Jira</h1>
		<p class="text-surface-600-300 text-lg">
			Automatically create Jira issues from failed tests and link them to test results
		</p>
	</div>

	<!-- Connection Form -->
	<div class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-bold">Connection Details</h2>

		<!-- Error Message -->
		{#if error}
			<div class="mb-4 flex items-start gap-3 rounded-container bg-error-500/10 p-4">
				<AlertCircle class="mt-0.5 h-5 w-5 text-error-500" />
				<div class="flex-1">
					<div class="font-semibold text-error-500">Connection Failed</div>
					<div class="text-sm text-error-500">{error}</div>
				</div>
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleConnect(); }} class="space-y-4">
			<!-- Integration Name -->
			<div>
				<label for="name" class="mb-2 block text-sm font-medium">
					Integration Name <span class="text-error-500">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="e.g., Production Jira, Team Jira"
					class="w-full rounded-base border border-surface-300-700 bg-surface-100-900 px-3 py-2"
					required
				/>
				<p class="text-surface-500-400 mt-1 text-xs">A friendly name to identify this connection</p>
			</div>

			<!-- Jira Base URL -->
			<div>
				<label for="baseUrl" class="mb-2 block text-sm font-medium">
					Jira URL <span class="text-error-500">*</span>
				</label>
				<input
					id="baseUrl"
					type="url"
					bind:value={baseUrl}
					placeholder="https://yourcompany.atlassian.net"
					class="w-full rounded-base border border-surface-300-700 bg-surface-100-900 px-3 py-2"
					required
				/>
				<p class="text-surface-500-400 mt-1 text-xs">
					Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
				</p>
			</div>

			<!-- Email -->
			<div>
				<label for="email" class="mb-2 block text-sm font-medium">
					Email <span class="text-error-500">*</span>
				</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="you@company.com"
					class="w-full rounded-base border border-surface-300-700 bg-surface-100-900 px-3 py-2"
					required
				/>
				<p class="text-surface-500-400 mt-1 text-xs">Your Jira account email address</p>
			</div>

			<!-- API Token -->
			<div>
				<label for="apiToken" class="mb-2 block text-sm font-medium">
					API Token <span class="text-error-500">*</span>
				</label>
				<input
					id="apiToken"
					type="password"
					bind:value={apiToken}
					placeholder="••••••••••••••••••••"
					class="w-full rounded-base border border-surface-300-700 bg-surface-100-900 px-3 py-2"
					required
				/>
				<p class="text-surface-500-400 mt-1 text-xs">
					<a
						href="https://id.atlassian.com/manage-profile/security/api-tokens"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-primary-500 hover:underline"
					>
						Create an API token
						<ExternalLink class="h-3 w-3" />
					</a>
					in your Atlassian account
				</p>
			</div>

			<!-- Submit Button -->
			<div class="flex justify-end gap-3 pt-4">
				<a href="/settings?tab=integrations" class="btn preset-outlined-surface-500">
					Cancel
				</a>
				<button
					type="submit"
					disabled={connecting}
					class="btn preset-filled-primary-500"
				>
					{#if connecting}
						<span>Connecting...</span>
					{:else}
						<Link2 class="mr-2 h-4 w-4" />
						<span>Connect Jira</span>
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Setup Instructions -->
	<div class="card p-6">
		<h2 class="mb-4 text-xl font-bold">Setup Instructions</h2>

		<div class="space-y-4">
			<div class="flex items-start gap-3">
				<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
					1
				</div>
				<div>
					<h3 class="mb-1 font-semibold">Get your Jira URL</h3>
					<p class="text-surface-600-300 text-sm">
						This is usually in the format <code class="rounded bg-surface-200-800 px-1 py-0.5 text-xs">https://yourcompany.atlassian.net</code>
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
					2
				</div>
				<div>
					<h3 class="mb-1 font-semibold">Create an API token</h3>
					<p class="text-surface-600-300 mb-2 text-sm">
						Visit <a
							href="https://id.atlassian.com/manage-profile/security/api-tokens"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary-500 hover:underline"
						>Atlassian API Tokens</a> and create a new token
					</p>
					<p class="text-surface-600-300 text-sm">
						Give it a name like "QA Studio Integration" and copy the generated token
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
					3
				</div>
				<div>
					<h3 class="mb-1 font-semibold">Enter your credentials</h3>
					<p class="text-surface-600-300 text-sm">
						Fill in the form above with your Jira URL, email, and API token
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
					4
				</div>
				<div>
					<h3 class="mb-1 font-semibold">Start creating issues</h3>
					<p class="text-surface-600-300 text-sm">
						Once connected, you can create Jira issues directly from failed test results
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Features -->
	<div class="card mt-6 p-6">
		<h2 class="mb-4 text-xl font-bold">What You Can Do</h2>
		<div class="space-y-3">
			<div class="flex items-start gap-3">
				<Check class="mt-0.5 h-5 w-5 text-success-500" />
				<div>
					<h3 class="mb-1 font-semibold">Create issues from test failures</h3>
					<p class="text-surface-600-300 text-sm">
						Automatically or manually create Jira issues when tests fail, with full test context
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3">
				<Check class="mt-0.5 h-5 w-5 text-success-500" />
				<div>
					<h3 class="mb-1 font-semibold">Link test results to issues</h3>
					<p class="text-surface-600-300 text-sm">
						View Jira issue status directly from test result pages
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3">
				<Check class="mt-0.5 h-5 w-5 text-success-500" />
				<div>
					<h3 class="mb-1 font-semibold">Track issue resolution</h3>
					<p class="text-surface-600-300 text-sm">
						See which test failures have been addressed and their current status in Jira
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
