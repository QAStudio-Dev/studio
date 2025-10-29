<script lang="ts">
	import { Plus, Key, Copy, Trash2, CheckCircle2, AlertCircle, Calendar, Clock } from 'lucide-svelte';
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
		<div class="flex items-start justify-between mb-6">
			<div>
				<h1 class="text-4xl font-bold mb-2">API Keys</h1>
				<p class="text-lg text-surface-600-300">
					Manage API keys for integrating with QA Studio
				</p>
			</div>
			<button onclick={() => (showCreateDialog = true)} class="btn preset-filled-primary-500">
				<Plus class="w-4 h-4 mr-2" />
				Create API Key
			</button>
		</div>

		<!-- Info card -->
		<div class="card p-4 bg-primary-500/5 border border-primary-500/20">
			<div class="flex gap-3">
				<AlertCircle class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
				<div class="text-sm">
					<p class="font-medium mb-1">Security Notice</p>
					<p class="text-surface-600-300">
						API keys provide full access to your account. Keep them secure and never share them in public
						repositories. You'll only see the full key once when you create it.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- API Keys List -->
	{#if apiKeys.length === 0}
		<div class="card p-12 text-center">
			<Key class="w-16 h-16 mx-auto mb-4 text-surface-400" />
			<h2 class="text-2xl font-bold mb-2">No API keys yet</h2>
			<p class="text-surface-600-300 mb-6">
				Create an API key to integrate with CI/CD pipelines, test runners, and other tools
			</p>
			<button onclick={() => (showCreateDialog = true)} class="btn preset-filled-primary-500">
				<Plus class="w-4 h-4 mr-2" />
				Create Your First API Key
			</button>
		</div>
	{:else}
		<div class="space-y-4">
			{#each apiKeys as apiKey}
				<div class="card p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<Key class="w-5 h-5 text-primary-500" />
								<h3 class="text-lg font-bold">{apiKey.name}</h3>
								{#if apiKey.expiresAt && isExpired(apiKey.expiresAt)}
									<span class="badge preset-filled-error-500 text-xs">Expired</span>
								{/if}
							</div>

							<div class="font-mono text-sm text-surface-600-300 mb-3">
								{apiKey.prefix}••••••••••••••••••••••••
							</div>

							<div class="flex flex-wrap gap-4 text-sm text-surface-600-300">
								<div class="flex items-center gap-2">
									<Calendar class="w-4 h-4" />
									<span>Created {formatDate(apiKey.createdAt)}</span>
								</div>
								{#if apiKey.lastUsedAt}
									<div class="flex items-center gap-2">
										<Clock class="w-4 h-4" />
										<span>Last used {formatDate(apiKey.lastUsedAt)}</span>
									</div>
								{:else}
									<div class="flex items-center gap-2">
										<Clock class="w-4 h-4" />
										<span class="text-surface-500">Never used</span>
									</div>
								{/if}
								{#if apiKey.expiresAt}
									<div class="flex items-center gap-2">
										<AlertCircle class="w-4 h-4" />
										<span>
											{isExpired(apiKey.expiresAt) ? 'Expired' : 'Expires'} {formatDate(
												apiKey.expiresAt
											)}
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
							<Trash2 class="w-4 h-4" />
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
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
		<div class="card p-8 w-full max-w-lg shadow-2xl pointer-events-auto bg-surface-50-950 border border-surface-200-700">
			<h2 class="text-2xl font-bold mb-6">Create API Key</h2>

			{#if error}
				<div class="alert preset-filled-error mb-4">
					<AlertCircle class="w-5 h-5" />
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
					<span class="text-base font-medium mb-2 block">Name *</span>
					<input
						type="text"
						class="input"
						placeholder="e.g., CI/CD Pipeline, Playwright Reporter"
						bind:value={newKeyName}
						disabled={loading}
						required
						maxlength="100"
					/>
					<p class="text-sm text-surface-600-300 mt-1">
						A descriptive name to help you identify this key
					</p>
				</label>

				<label class="label">
					<span class="text-base font-medium mb-2 block">Expiration (optional)</span>
					<select class="select" bind:value={newKeyExpireDays} disabled={loading}>
						<option value={null}>Never expires</option>
						<option value={30}>30 days</option>
						<option value={90}>90 days</option>
						<option value={180}>180 days</option>
						<option value={365}>1 year</option>
					</select>
					<p class="text-sm text-surface-600-300 mt-1">
						For security, consider setting an expiration date
					</p>
				</label>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={() => (showCreateDialog = false)}
						class="btn preset-outlined-surface-500 flex-1"
						disabled={loading}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn preset-filled-primary-500 flex-1"
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
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
		<div class="card p-8 w-full max-w-2xl shadow-2xl pointer-events-auto bg-surface-50-950 border border-surface-200-700">
			<div class="flex items-center gap-3 mb-4">
				<CheckCircle2 class="w-8 h-8 text-success-500" />
				<h2 class="text-2xl font-bold">API Key Created!</h2>
			</div>

			<div class="bg-warning-500/10 border border-warning-500/20 rounded-container p-4 mb-4">
				<div class="flex gap-3">
					<AlertCircle class="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
					<div class="text-sm">
						<p class="font-medium mb-1">Important: Save this key now!</p>
						<p class="text-surface-600-300">
							This is the only time you'll see the full API key. Make sure to copy it and store it
							securely.
						</p>
					</div>
				</div>
			</div>

			<label class="label mb-6">
				<span class="text-base font-medium mb-2 block">Your API Key</span>
				<div class="flex gap-2">
					<input
						type="text"
						class="input font-mono flex-1"
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
							<CheckCircle2 class="w-5 h-5" />
						{:else}
							<Copy class="w-5 h-5" />
						{/if}
					</button>
				</div>
			</label>

			<div class="bg-surface-50-900 rounded-container p-4 mb-6">
				<p class="text-sm font-medium mb-2">Example usage:</p>
				<pre
					class="text-xs overflow-x-auto"><code>curl https://qastudio.com/api/test-results \
  -H "Authorization: Bearer {createdKey}"</code></pre>
			</div>

			<button
				onclick={() => {
					showKeyDialog = false;
					createdKey = null;
				}}
				class="btn preset-filled-primary-500 w-full"
			>
				I've Saved My Key
			</button>
		</div>
	</div>
{/if}
