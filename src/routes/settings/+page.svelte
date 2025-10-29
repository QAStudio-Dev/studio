<script lang="ts">
	import {
		User,
		Key,
		Users,
		Crown,
		Plus,
		Trash2,
		Copy,
		Check,
		Settings as SettingsIcon,
		Plug,
		Bell,
		Shield,
		LogOut,
		ExternalLink,
		AlertCircle,
		CheckCircle,
		XCircle
	} from 'lucide-svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { invalidateAll } from '$app/navigation';
	import { UserProfile } from 'svelte-clerk/client';
	import { env } from '$env/dynamic/public';

	let { data } = $props();
	let { user } = $derived(data);

	// API Keys state
	let creatingKey = $state(false);
	let newKeyName = $state('');
	let newKeyData = $state<{ key: string; name: string } | null>(null);
	let deletingKeyId = $state<string | null>(null);
	let copiedKey = $state(false);

	// Team state
	let leavingTeam = $state(false);

	// Integration state
	let deletingIntegrationId = $state<string | null>(null);

	// Get Slack OAuth URL
	function getSlackOAuthUrl() {
		// Try both methods - SvelteKit's $env and Vite's import.meta.env
		const clientId = env.PUBLIC_SLACK_CLIENT_ID || import.meta.env.PUBLIC_SLACK_CLIENT_ID;

		if (!clientId) {
			console.error('SLACK_CLIENT_ID not configured');
			console.log('Available env:', { env, importMeta: import.meta.env });
			return '#';
		}

		// Use window.location if available (browser), fallback to placeholder for SSR
		const origin = typeof window !== 'undefined' ? window.location.origin : 'https://qastudio.dev';
		const redirectUri = `${origin}/api/integrations/slack/callback`;
		const scopes = [
			'incoming-webhook',
			'chat:write',
			'channels:read',
			'groups:read',
			'im:read',
			'mpim:read'
		].join(',');

		return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
	}

	// Create API key
	async function handleCreateApiKey() {
		if (!newKeyName.trim()) return;

		try {
			const res = await fetch('/api/api-keys/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newKeyName })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to create API key');
			}

			const data = await res.json();
			newKeyData = { key: data.key, name: newKeyName };
			newKeyName = '';
			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		}
	}

	// Delete API key
	async function handleDeleteApiKey(keyId: string, keyName: string) {
		const confirmed = confirm(
			`Are you sure you want to delete the API key "${keyName}"?\n\nThis action cannot be undone and will immediately revoke access.`
		);

		if (!confirmed) return;

		deletingKeyId = keyId;

		try {
			const res = await fetch(`/api/api-keys/${keyId}/delete`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete API key');
			}

			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			deletingKeyId = null;
		}
	}

	// Copy API key
	function copyApiKey(key: string) {
		navigator.clipboard.writeText(key);
		copiedKey = true;
		setTimeout(() => (copiedKey = false), 2000);
	}

	// Close new key modal
	function closeNewKeyModal() {
		newKeyData = null;
		creatingKey = false;
	}

	// Format date
	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Get subscription status badge
	function getSubscriptionBadge(status: string) {
		const badges: Record<string, { text: string; class: string }> = {
			ACTIVE: { text: 'Active', class: 'preset-filled-success-500' },
			TRIALING: { text: 'Trial', class: 'preset-filled-primary-500' },
			PAST_DUE: { text: 'Past Due', class: 'preset-filled-warning-500' },
			CANCELED: { text: 'Canceled', class: 'preset-filled-error-500' }
		};
		return badges[status] || { text: status, class: 'preset-filled-surface-500' };
	}

	// Leave team
	async function handleLeaveTeam() {
		if (!user.team) return;

		const confirmed = confirm(
			`Are you sure you want to leave "${user.team.name}"?\n\nThis will remove you from the team and all associated projects. This action cannot be undone.`
		);

		if (!confirmed) return;

		leavingTeam = true;

		try {
			const res = await fetch('/api/teams/leave', {
				method: 'POST'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to leave team');
			}

			await invalidateAll();
			alert('Successfully left the team');
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			leavingTeam = false;
		}
	}

	// Delete integration
	async function handleDeleteIntegration(integrationId: string, integrationName: string) {
		const confirmed = confirm(
			`Are you sure you want to remove the "${integrationName}" integration?\n\nThis will stop sending notifications and revoke access.`
		);

		if (!confirmed) return;

		deletingIntegrationId = integrationId;

		try {
			const res = await fetch(`/api/integrations/${integrationId}/delete`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete integration');
			}

			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			deletingIntegrationId = null;
		}
	}

	// Get integration status icon
	function getStatusIcon(status: string) {
		switch (status) {
			case 'ACTIVE':
				return CheckCircle;
			case 'ERROR':
				return AlertCircle;
			case 'INACTIVE':
			case 'EXPIRED':
				return XCircle;
			default:
				return AlertCircle;
		}
	}

	// Get integration status color
	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'text-success-500';
			case 'ERROR':
				return 'text-error-500';
			case 'INACTIVE':
			case 'EXPIRED':
				return 'text-warning-500';
			default:
				return 'text-surface-500';
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-4xl font-bold">Settings</h1>
		<p class="text-surface-600-300 text-lg">Manage your account, API keys, and team settings</p>
	</div>

	<!-- Tabs -->
	<Tabs defaultValue="profile">
		<Tabs.List class="border-surface-200-700 mb-6 flex gap-2 border-b">
			<Tabs.Trigger
				value="profile"
				class="hover:bg-surface-100-800 flex items-center gap-2 rounded-t-base px-4 py-3 transition-colors data-[state=active]:bg-primary-500 data-[state=active]:text-white"
			>
				<User class="h-4 w-4" />
				<span>Profile</span>
			</Tabs.Trigger>

			<Tabs.Trigger
				value="api-keys"
				class="hover:bg-surface-100-800 flex items-center gap-2 rounded-t-base px-4 py-3 transition-colors data-[state=active]:bg-primary-500 data-[state=active]:text-white"
			>
				<Key class="h-4 w-4" />
				<span>API Keys</span>
			</Tabs.Trigger>

			{#if user.team}
				<Tabs.Trigger
					value="team"
					class="hover:bg-surface-100-800 flex items-center gap-2 rounded-t-base px-4 py-3 transition-colors data-[state=active]:bg-primary-500 data-[state=active]:text-white"
				>
					<Users class="h-4 w-4" />
					<span>Team</span>
				</Tabs.Trigger>
			{/if}

			<Tabs.Trigger
				value="integrations"
				class="hover:bg-surface-100-800 flex items-center gap-2 rounded-t-base px-4 py-3 transition-colors data-[state=active]:bg-primary-500 data-[state=active]:text-white"
			>
				<Plug class="h-4 w-4" />
				<span>Integrations</span>
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Profile Tab -->
		<Tabs.Content value="profile">
			<div class="card p-6">
				<h2 class="mb-6 text-2xl font-bold">Profile Settings</h2>

				<!-- Clerk UserProfile Component -->
				<div class="max-w-2xl">
					<UserProfile />
				</div>
			</div>
		</Tabs.Content>

		<!-- API Keys Tab -->
		<Tabs.Content value="api-keys">
			<div class="card p-6">
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">API Keys</h2>
						<p class="text-surface-600-300 mt-1">
							Manage API keys for programmatic access to QA Studio
						</p>
					</div>
					<button
						onclick={() => (creatingKey = true)}
						class="btn preset-filled-primary-500"
						disabled={creatingKey}
					>
						<Plus class="mr-2 h-4 w-4" />
						Create New Key
					</button>
				</div>

				<!-- Create Key Form -->
				{#if creatingKey && !newKeyData}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleCreateApiKey();
						}}
						class="bg-surface-50-900 mb-6 rounded-container border border-primary-500 p-4"
					>
						<label class="mb-2 block text-sm font-medium">Key Name</label>
						<input
							type="text"
							class="input mb-3"
							placeholder="e.g., CI/CD Pipeline, Local Development"
							bind:value={newKeyName}
							autofocus
						/>
						<div class="flex gap-2">
							<button
								type="submit"
								class="btn flex-1 preset-filled-success-500"
								disabled={!newKeyName.trim()}
							>
								Generate Key
							</button>
							<button
								type="button"
								onclick={() => (creatingKey = false)}
								class="btn preset-outlined-surface-500"
							>
								Cancel
							</button>
						</div>
					</form>
				{/if}

				<!-- New Key Display Modal -->
				{#if newKeyData}
					<div class="mb-6 rounded-container border border-warning-500 bg-warning-500/10 p-6">
						<div class="mb-4 flex items-start gap-3">
							<Shield class="mt-1 h-6 w-6 text-warning-500" />
							<div>
								<h3 class="mb-1 font-bold text-warning-500">Save Your API Key</h3>
								<p class="text-surface-600-300 text-sm">
									This is the only time you'll see this key. Copy it now and store it securely.
								</p>
							</div>
						</div>

						<div class="mb-4">
							<label class="mb-2 block text-sm font-medium">Key Name</label>
							<div class="bg-surface-100-800 input mb-3 font-mono">{newKeyData.name}</div>

							<label class="mb-2 block text-sm font-medium">API Key</label>
							<div class="flex gap-2">
								<input
									type="text"
									value={newKeyData.key}
									readonly
									class="bg-surface-100-800 input flex-1 font-mono text-sm"
								/>
								<button
									onclick={() => copyApiKey(newKeyData?.key || '')}
									class="btn preset-filled-primary-500"
									title="Copy to clipboard"
								>
									{#if copiedKey}
										<Check class="h-4 w-4" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<button onclick={closeNewKeyModal} class="btn w-full preset-filled-surface-500">
							Done
						</button>
					</div>
				{/if}

				<!-- API Keys List -->
				{#if user.apiKeys.length === 0}
					<div class="py-12 text-center">
						<Key class="mx-auto mb-4 h-16 w-16 text-surface-400" />
						<h3 class="mb-2 text-xl font-bold">No API Keys</h3>
						<p class="text-surface-600-300 mb-4">
							Create an API key to authenticate with the QA Studio API
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each user.apiKeys as apiKey}
							<div class="border-surface-200-700 group relative rounded-container border p-4">
								<!-- Delete button -->
								<button
									onclick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
									disabled={deletingKeyId === apiKey.id}
									class="text-surface-600-300 absolute top-4 right-4 rounded-container p-2 opacity-0 transition-all group-hover:opacity-100 hover:bg-error-500/10 hover:text-error-500"
									title="Delete API key"
								>
									{#if deletingKeyId === apiKey.id}
										<span class="text-xs">Deleting...</span>
									{:else}
										<Trash2 class="h-4 w-4" />
									{/if}
								</button>

								<div class="pr-12">
									<h3 class="mb-2 font-bold">{apiKey.name}</h3>
									<div class="text-surface-600-300 mb-3 font-mono text-sm">
										{apiKey.prefix}••••••••••••••••
									</div>

									<div class="text-surface-600-300 flex items-center gap-4 text-xs">
										<div>Created: {formatDate(apiKey.createdAt)}</div>
										{#if apiKey.lastUsedAt}
											<div>• Last used: {formatDate(apiKey.lastUsedAt)}</div>
										{:else}
											<div>• Never used</div>
										{/if}
										{#if apiKey.expiresAt}
											<div>
												• Expires: {formatDate(apiKey.expiresAt)}
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Team Tab -->
		{#if user.team}
			<Tabs.Content value="team">
				<div class="space-y-6">
					<!-- Team Info Card -->
					<div class="card p-6">
						<div class="mb-6 flex items-center justify-between">
							<div>
								<h2 class="text-2xl font-bold">{user.team.name}</h2>
								{#if user.team.description}
									<p class="text-surface-600-300 mt-1">{user.team.description}</p>
								{/if}
							</div>
							{#if user.team.subscription}
								{@const badge = getSubscriptionBadge(user.team.subscription.status)}
								<span class="badge {badge.class}">
									{badge.text}
								</span>
							{/if}
						</div>

						{#if user.team.subscription}
							<div class="border-surface-200-700 grid gap-4 border-t pt-4 md:grid-cols-2">
								<div>
									<div class="text-surface-600-300 text-sm">Plan</div>
									<div class="font-semibold">
										{user.team.subscription.status === 'ACTIVE' ? 'Pro' : 'Free Trial'}
									</div>
								</div>
								<div>
									<div class="text-surface-600-300 text-sm">Seats</div>
									<div class="font-semibold">{user.team.subscription.seats}</div>
								</div>
								{#if user.team.subscription.currentPeriodEnd}
									<div>
										<div class="text-surface-600-300 text-sm">
											{user.team.subscription.cancelAtPeriodEnd ? 'Cancels On' : 'Renews On'}
										</div>
										<div class="font-semibold">
											{formatDate(user.team.subscription.currentPeriodEnd)}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Team Members Card -->
					<div class="card p-6">
						<h3 class="mb-4 text-xl font-bold">Team Members ({user.team.members.length})</h3>

						<div class="space-y-3">
							{#each user.team.members as member}
								<div
									class="border-surface-200-700 flex items-center gap-4 rounded-container border p-4"
								>
									<div class="flex-1">
										<div class="font-semibold">
											{member.firstName
												? `${member.firstName} ${member.lastName || ''}`
												: member.email}
										</div>
										<div class="text-surface-600-300 text-sm">{member.email}</div>
									</div>
									<span class="badge preset-outlined-surface-500">{member.role}</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Billing Card -->
					{#if user.team.subscription && user.team.subscription.status === 'ACTIVE'}
						<div class="card p-6">
							<h3 class="mb-4 text-xl font-bold">Billing</h3>
							<p class="text-surface-600-300 mb-4">
								Manage your subscription, payment methods, and invoices.
							</p>
							<a href="/teams/{user.team.id}/billing" class="btn preset-filled-primary-500">
								Manage Billing
							</a>
						</div>
					{/if}

					<!-- Danger Zone -->
					<div class="card border-2 border-error-500 p-6">
						<h3 class="mb-4 text-xl font-bold text-error-500">Danger Zone</h3>
						<div class="flex items-start justify-between gap-4">
							<div>
								<h4 class="mb-1 font-semibold">Leave Team</h4>
								<p class="text-surface-600-300 text-sm">
									Remove yourself from this team and all associated projects. This action cannot be
									undone.
								</p>
							</div>
							<button
								onclick={handleLeaveTeam}
								disabled={leavingTeam}
								class="btn preset-filled-error-500 whitespace-nowrap"
							>
								{#if leavingTeam}
									<span>Leaving...</span>
								{:else}
									<LogOut class="mr-2 h-4 w-4" />
									<span>Leave Team</span>
								{/if}
							</button>
						</div>
					</div>
				</div>
			</Tabs.Content>
		{:else}
			<!-- No Team - Upsell -->
			<Tabs.Content value="team">
				<div class="card p-12 text-center">
					<div
						class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary-500/10"
					>
						<Crown class="h-12 w-12 text-primary-500" />
					</div>
					<h2 class="mb-2 text-3xl font-bold">Unlock Team Features</h2>
					<p class="text-surface-600-300 mx-auto mb-8 max-w-2xl text-lg">
						Create a team to collaborate with others, manage unlimited projects, and access advanced
						features.
					</p>

					<div class="mx-auto mb-8 max-w-md">
						<div class="space-y-3 text-left">
							<div class="flex items-center gap-3">
								<Check class="h-5 w-5 text-success-500" />
								<span>Unlimited projects and test cases</span>
							</div>
							<div class="flex items-center gap-3">
								<Check class="h-5 w-5 text-success-500" />
								<span>Team collaboration and member management</span>
							</div>
							<div class="flex items-center gap-3">
								<Check class="h-5 w-5 text-success-500" />
								<span>Priority support</span>
							</div>
							<div class="flex items-center gap-3">
								<Check class="h-5 w-5 text-success-500" />
								<span>Advanced integrations</span>
							</div>
						</div>
					</div>

					<a href="/teams/new" class="btn inline-flex items-center gap-2 preset-filled-primary-500">
						<Crown class="h-4 w-4" />
						Create a Team
					</a>
				</div>
			</Tabs.Content>
		{/if}

		<!-- Integrations Tab -->
		<Tabs.Content value="integrations">
			<div class="space-y-6">
				<!-- Header -->
				<div class="card p-6">
					<h2 class="mb-2 text-2xl font-bold">Integrations</h2>
					<p class="text-surface-600-300">
						Connect QA Studio with your favorite tools to receive notifications and automate
						workflows
					</p>
				</div>

				<!-- Available Integrations -->
				<div class="card p-6">
					<h3 class="mb-4 text-xl font-bold">Available Integrations</h3>

					<div class="grid gap-4 md:grid-cols-2">
						<!-- Slack Integration -->
						<div class="border-surface-200-700 rounded-container border p-4">
							<div class="mb-3 flex items-start gap-3">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-container bg-[#4A154B]"
								>
									<svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
										<path
											d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<h4 class="mb-1 font-bold">Slack</h4>
									<p class="text-surface-600-300 text-sm">
										Send test results and notifications to Slack channels
									</p>
								</div>
							</div>

							{#if user.team}
								<a
									href={getSlackOAuthUrl()}
									class="btn w-full preset-filled-primary-500"
									target="_blank"
									onclick={(e) => {
										const url = getSlackOAuthUrl();
										if (url === '#') {
											e.preventDefault();
											alert('Slack integration is not configured. Please contact your administrator.');
										}
									}}
								>
									<ExternalLink class="mr-2 h-4 w-4" />
									Connect Slack
								</a>
							{:else}
								<button class="btn w-full preset-outlined-surface-500" disabled>
									Requires Team
								</button>
							{/if}
						</div>

						<!-- More integrations coming soon -->
						<div class="border-surface-200-700 rounded-container border p-4 opacity-50">
							<div class="mb-3 flex items-start gap-3">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-container bg-surface-200-800"
								>
									<Plug class="h-6 w-6" />
								</div>
								<div class="flex-1">
									<h4 class="mb-1 font-bold">More Coming Soon</h4>
									<p class="text-surface-600-300 text-sm">
										GitHub, Jira, Microsoft Teams, and more
									</p>
								</div>
							</div>
							<button class="btn w-full preset-outlined-surface-500" disabled> Coming Soon </button>
						</div>
					</div>
				</div>

				<!-- Active Integrations -->
				{#if user.team?.integrations && user.team.integrations.length > 0}
					<div class="card p-6">
						<h3 class="mb-4 text-xl font-bold">Active Integrations</h3>

						<div class="space-y-3">
							{#each user.team.integrations as integration}
								{@const StatusIcon = getStatusIcon(integration.status)}
								<div class="border-surface-200-700 group relative rounded-container border p-4">
									<!-- Delete button -->
									<button
										onclick={() => handleDeleteIntegration(integration.id, integration.name)}
										disabled={deletingIntegrationId === integration.id}
										class="text-surface-600-300 absolute top-4 right-4 rounded-container p-2 opacity-0 transition-all group-hover:opacity-100 hover:bg-error-500/10 hover:text-error-500"
										title="Remove integration"
									>
										{#if deletingIntegrationId === integration.id}
											<span class="text-xs">Removing...</span>
										{:else}
											<Trash2 class="h-4 w-4" />
										{/if}
									</button>

									<div class="pr-12">
										<div class="mb-2 flex items-center gap-2">
											<h4 class="font-bold">{integration.name}</h4>
											<StatusIcon class="h-4 w-4 {getStatusColor(integration.status)}" />
											<span
												class="rounded-base px-2 py-0.5 text-xs {getStatusColor(
													integration.status
												)}"
											>
												{integration.status}
											</span>
										</div>

										<div class="text-surface-600-300 mb-2 text-sm">
											Type: {integration.type}
										</div>

										<div class="text-surface-600-300 flex items-center gap-4 text-xs">
											<div>
												Connected: {new Date(integration.createdAt).toLocaleDateString()}
											</div>
											{#if integration.lastSyncedAt}
												<div>
													• Last synced: {new Date(integration.lastSyncedAt).toLocaleDateString()}
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</Tabs.Content>
	</Tabs>
</div>
