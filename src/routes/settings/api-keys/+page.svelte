<script lang="ts">
	import {
		Plus,
		Key,
		Copy,
		Trash2,
		CheckCircle2,
		AlertCircle,
		Calendar,
		Clock
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
		if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
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
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-6 flex items-start justify-between">
			<div>
				<h1 class="mb-2 text-4xl font-bold">API Keys</h1>
				<p class="text-surface-600-300 text-lg">Manage API keys for integrating with QA Studio</p>
			</div>
			<button onclick={() => (showCreateDialog = true)} class="btn preset-filled-primary-500">
				<Plus class="mr-2 h-4 w-4" />
				Create API Key
			</button>
		</div>

		<!-- Info card -->
		<div class="card border border-primary-500/20 bg-primary-500/5 p-4">
			<div class="flex gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
				<div class="text-sm">
					<p class="mb-1 font-medium">Security Notice</p>
					<p class="text-surface-600-300">
						API keys provide full access to your account. Keep them secure and never share them in
						public repositories. You'll only see the full key once when you create it.
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
									<span class="badge preset-filled-error-500 text-xs">Expired</span>
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
							This is the only time you'll see the full API key. Make sure to copy it and store it
							securely.
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
						onclick={(e) => e.target.select()}
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
						>curl https://qastudio.com/api/test-results \
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
