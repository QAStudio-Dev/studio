<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let teamId = $page.params.teamId;

	// SSO Form State
	let ssoEnabled = $state(false);
	let ssoProvider = $state<'okta' | 'google' | ''>('');
	let ssoClientId = $state('');
	let ssoClientSecret = $state('');
	let ssoIssuer = $state('');
	let ssoDomains = $state<string[]>([]);
	let newDomain = $state('');

	// UI State
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	// Load current SSO configuration
	$effect(() => {
		loadSsoConfig();
	});

	async function loadSsoConfig() {
		loading = true;
		error = '';

		try {
			const res = await fetch(`/api/teams/${teamId}/sso`);
			if (!res.ok) throw new Error('Failed to load SSO configuration');

			const data = await res.json();
			ssoEnabled = data.ssoEnabled || false;
			ssoProvider = data.ssoProvider || '';
			ssoClientId = data.ssoClientId || '';
			ssoIssuer = data.ssoIssuer || '';
			ssoDomains = data.ssoDomains || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load SSO configuration';
		} finally {
			loading = false;
		}
	}

	async function saveSsoConfig() {
		if (!validateForm()) return;

		saving = true;
		error = '';
		success = '';

		try {
			const res = await fetch(`/api/teams/${teamId}/sso`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ssoEnabled,
					ssoProvider: ssoEnabled ? ssoProvider : null,
					ssoClientId: ssoEnabled ? ssoClientId : null,
					ssoClientSecret: ssoClientSecret || undefined,
					ssoIssuer: ssoEnabled ? ssoIssuer : null,
					ssoDomains: ssoEnabled ? ssoDomains : []
				})
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to save SSO configuration');
			}

			success = 'SSO configuration saved successfully';
			ssoClientSecret = ''; // Clear sensitive field
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save SSO configuration';
		} finally {
			saving = false;
		}
	}

	async function disableSso() {
		if (
			!confirm('Are you sure you want to disable SSO? Users will need to use password login.')
		)
			return;

		saving = true;
		error = '';
		success = '';

		try {
			const res = await fetch(`/api/teams/${teamId}/sso`, {
				method: 'DELETE'
			});

			if (!res.ok) throw new Error('Failed to disable SSO');

			success = 'SSO disabled successfully';
			await loadSsoConfig();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to disable SSO';
		} finally {
			saving = false;
		}
	}

	function validateForm(): boolean {
		if (!ssoEnabled) return true;

		if (!ssoProvider) {
			error = 'Please select an SSO provider';
			return false;
		}

		if (!ssoClientId.trim()) {
			error = 'Client ID is required';
			return false;
		}

		if (!ssoIssuer.trim()) {
			error = 'Issuer URL is required';
			return false;
		}

		if (!ssoClientSecret.trim() && !ssoClientId) {
			error = 'Client Secret is required when enabling SSO';
			return false;
		}

		return true;
	}

	function addDomain() {
		const domain = newDomain.trim().toLowerCase();
		if (!domain) return;

		if (ssoDomains.includes(domain)) {
			error = 'Domain already added';
			return;
		}

		// Basic domain validation
		if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
			error = 'Invalid domain format (e.g., example.com)';
			return;
		}

		ssoDomains = [...ssoDomains, domain];
		newDomain = '';
		error = '';
	}

	function removeDomain(domain: string) {
		ssoDomains = ssoDomains.filter((d) => d !== domain);
	}
</script>

<div class="container mx-auto max-w-4xl p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">SSO Configuration</h1>
		<p class="mt-2 text-surface-600 dark:text-surface-400">
			Configure enterprise Single Sign-On (SSO) for your team using Okta, Google Workspace, or
			other OIDC providers.
		</p>
	</div>

	{#if error}
		<div
			class="mb-4 rounded-lg bg-error-100 p-4 text-error-900 dark:bg-error-900 dark:text-error-100"
		>
			{error}
		</div>
	{/if}

	{#if success}
		<div
			class="mb-4 rounded-lg bg-success-100 p-4 text-success-900 dark:bg-success-900 dark:text-success-100"
		>
			{success}
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-surface-600 dark:text-surface-400">Loading SSO configuration...</div>
		</div>
	{:else}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				saveSsoConfig();
			}}
			class="space-y-6"
		>
			<!-- Enable SSO Toggle -->
			<div class="card rounded-container p-6">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={ssoEnabled} class="checkbox" />
					<div>
						<div class="font-semibold">Enable SSO</div>
						<div class="text-sm text-surface-600 dark:text-surface-400">
							Require users with matching email domains to sign in via SSO
						</div>
					</div>
				</label>
			</div>

			{#if ssoEnabled}
				<!-- Provider Selection -->
				<div class="card rounded-container p-6">
					<label class="mb-2 block font-semibold">SSO Provider</label>
					<select bind:value={ssoProvider} class="select w-full" required>
						<option value="">Select provider...</option>
						<option value="okta">Okta</option>
						<option value="google">Google Workspace</option>
					</select>
					<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
						Choose your identity provider (OIDC compatible)
					</p>
				</div>

				<!-- Client ID -->
				<div class="card rounded-container p-6">
					<label class="mb-2 block font-semibold">Client ID</label>
					<input
						type="text"
						bind:value={ssoClientId}
						class="input w-full"
						placeholder="your-client-id"
						required
					/>
					<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
						OAuth 2.0 Client ID from your SSO provider
					</p>
				</div>

				<!-- Client Secret -->
				<div class="card rounded-container p-6">
					<label class="mb-2 block font-semibold">Client Secret</label>
					<input
						type="password"
						bind:value={ssoClientSecret}
						class="input w-full"
						placeholder={ssoClientId
							? 'Leave blank to keep existing secret'
							: 'your-client-secret'}
						required={!ssoClientId}
					/>
					<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
						OAuth 2.0 Client Secret (encrypted before storage)
					</p>
				</div>

				<!-- Issuer URL -->
				<div class="card rounded-container p-6">
					<label class="mb-2 block font-semibold">Issuer URL</label>
					<input
						type="url"
						bind:value={ssoIssuer}
						class="input w-full"
						placeholder="https://your-domain.okta.com/oauth2/default"
						required
					/>
					<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
						OIDC Issuer URL (e.g., https://company.okta.com/oauth2/default)
					</p>
				</div>

				<!-- Email Domains -->
				<div class="card rounded-container p-6">
					<label class="mb-2 block font-semibold">Email Domains</label>
					<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
						Users with these email domains will be required to use SSO
					</p>

					<div class="mb-4 flex gap-2">
						<input
							type="text"
							bind:value={newDomain}
							class="input flex-1"
							placeholder="example.com"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addDomain();
								}
							}}
						/>
						<button type="button" onclick={addDomain} class="btn preset-filled"
							>Add Domain</button
						>
					</div>

					{#if ssoDomains.length > 0}
						<div class="space-y-2">
							{#each ssoDomains as domain}
								<div
									class="flex items-center justify-between rounded bg-surface-100 px-4 py-2 dark:bg-surface-800"
								>
									<span class="font-mono text-sm">{domain}</span>
									<button
										type="button"
										onclick={() => removeDomain(domain)}
										class="text-error-600 hover:text-error-700 dark:text-error-400"
									>
										Remove
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="rounded bg-surface-50 p-4 text-center text-sm text-surface-600 dark:bg-surface-900 dark:text-surface-400"
						>
							No domains configured. Add email domains that should use SSO.
						</div>
					{/if}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center justify-between">
				<div>
					{#if ssoEnabled && ssoClientId}
						<button
							type="button"
							onclick={disableSso}
							disabled={saving}
							class="btn preset-outlined"
						>
							Disable SSO
						</button>
					{/if}
				</div>

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => goto(`/teams/${teamId}`)}
						class="btn preset-outlined"
					>
						Cancel
					</button>
					<button type="submit" disabled={saving} class="btn preset-filled">
						{saving ? 'Saving...' : 'Save Configuration'}
					</button>
				</div>
			</div>
		</form>

		<!-- Help Section -->
		<div class="mt-8 card rounded-container p-6">
			<h2 class="mb-4 text-xl font-semibold">Setup Instructions</h2>
			<div class="space-y-4 text-sm text-surface-600 dark:text-surface-400">
				<div>
					<h3 class="mb-2 font-semibold text-surface-900 dark:text-surface-100">
						Okta Setup
					</h3>
					<ol class="ml-4 list-decimal space-y-1">
						<li>Log in to your Okta Admin Console</li>
						<li>Go to Applications → Create App Integration</li>
						<li>Select "OIDC - OpenID Connect" and "Web Application"</li>
						<li>
							Set Sign-in redirect URIs to: <code
								class="rounded bg-surface-100 px-1 dark:bg-surface-800"
								>https://your-domain.com/api/auth/sso/okta/callback</code
							>
						</li>
						<li>Copy the Client ID and Client Secret</li>
						<li>Copy the Issuer URL from the settings</li>
					</ol>
				</div>

				<div>
					<h3 class="mb-2 font-semibold text-surface-900 dark:text-surface-100">
						Google Workspace Setup
					</h3>
					<ol class="ml-4 list-decimal space-y-1">
						<li>Go to Google Cloud Console</li>
						<li>Create or select a project</li>
						<li>Enable Google+ API</li>
						<li>Go to Credentials → Create OAuth 2.0 Client ID</li>
						<li>
							Set Authorized redirect URIs to: <code
								class="rounded bg-surface-100 px-1 dark:bg-surface-800"
								>https://your-domain.com/api/auth/sso/google/callback</code
							>
						</li>
						<li>Copy the Client ID and Client Secret</li>
						<li>
							Issuer is always: <code
								class="rounded bg-surface-100 px-1 dark:bg-surface-800"
								>https://accounts.google.com</code
							>
						</li>
					</ol>
				</div>
			</div>
		</div>
	{/if}
</div>
