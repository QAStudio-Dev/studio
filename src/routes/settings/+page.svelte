<script lang="ts">
	import {
		User,
		Key,
		Users,
		Crown,
		Plus,
		Check,
		Settings as SettingsIcon,
		Plug,
		LogOut,
		ExternalLink,
		AlertCircle,
		CheckCircle,
		XCircle,
		X,
		Trash2
	} from 'lucide-svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { invalidateAll } from '$app/navigation';
	import { UserProfile } from 'svelte-clerk/client';
	import { env } from '$env/dynamic/public';

	let { data } = $props();
	let { user } = $derived(data);

	// Team state
	let leavingTeam = $state(false);
	let loadingBillingPortal = $state(false);
	let updatingSeats = $state(false);
	let newSeats = $state(0);
	let showSeatUpdateDialog = $state(false);

	// Integration state
	let deletingIntegrationId = $state<string | null>(null);
	let configuringIntegrationId = $state<string | null>(null);
	let savingSettings = $state(false);

	// Notification settings for the integration being configured
	let notificationSettings = $state<Record<string, boolean>>({
		TEST_RUN_STARTED: true,
		TEST_RUN_COMPLETED: true,
		TEST_RUN_FAILED: true,
		TEST_CASE_FAILED: true,
		TEST_CASE_PASSED: false,
		MILESTONE_DUE: true,
		PROJECT_CREATED: false
	});

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
			PAST_DUE: { text: 'Past Due', class: 'preset-filled-warning-500' },
			CANCELED: { text: 'Canceled', class: 'preset-filled-error-500' },
			INCOMPLETE: { text: 'Setup Pending', class: 'preset-filled-warning-500' },
			INCOMPLETE_EXPIRED: { text: 'Setup Failed', class: 'preset-filled-error-500' },
			UNPAID: { text: 'Unpaid', class: 'preset-filled-error-500' }
		};
		return badges[status] || { text: status, class: 'preset-filled-surface-500' };
	}

	// Get subscription plan name
	function getSubscriptionPlanName(status: string) {
		// All paid statuses show "Pro" plan
		if (status === 'ACTIVE') return 'Pro';
		if (status === 'PAST_DUE') return 'Pro';
		if (status === 'CANCELED') return 'Pro (Canceled)';
		if (status === 'INCOMPLETE') return 'Pro (Setup Required)';
		if (status === 'INCOMPLETE_EXPIRED') return 'Pro (Setup Failed)';
		if (status === 'UNPAID') return 'Pro (Unpaid)';
		return 'Pro';
	}

	// Manage billing via Stripe Customer Portal
	async function handleManageBilling() {
		loadingBillingPortal = true;

		try {
			const res = await fetch('/api/billing/portal', {
				method: 'POST'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to open billing portal');
			}

			const data = await res.json();
			// Redirect to Stripe Customer Portal
			window.location.href = data.url;
		} catch (err: any) {
			alert('Error: ' + err.message);
			loadingBillingPortal = false;
		}
	}

	// Open seat update dialog
	function openSeatUpdateDialog() {
		if (!user.team?.subscription) return;
		newSeats = user.team.subscription.seats;
		showSeatUpdateDialog = true;
	}

	// Update seats
	async function handleUpdateSeats() {
		if (!user.team) return;

		const currentMembers = user.team.members.length;
		if (newSeats < currentMembers) {
			alert(
				`Cannot reduce seats to ${newSeats}. You currently have ${currentMembers} team members. Please remove members first.`
			);
			return;
		}

		updatingSeats = true;

		try {
			const res = await fetch('/api/billing/update-seats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seats: newSeats })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to update seats');
			}

			await invalidateAll();
			showSeatUpdateDialog = false;
			alert(data.message || 'Successfully updated seat count');
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			updatingSeats = false;
		}
	}

	// Leave team
	async function handleLeaveTeam() {
		if (!user.team) return;

		// Check if user is the only member
		const isOnlyMember = user.team.members.length === 1;

		let message = isOnlyMember
			? `Are you sure you want to delete "${user.team.name}"?\n\nYou are the only member, so leaving will permanently delete the team and all associated data (projects, test cases, test runs, etc.).`
			: `Are you sure you want to leave "${user.team.name}"?\n\nThis will remove you from the team and all associated projects.`;

		// Add subscription warning if user is deleting team and has active subscription
		if (isOnlyMember && user.team.subscription) {
			message += '\n\nYour subscription will also be canceled immediately.';
		}

		message += '\n\nThis action cannot be undone.';

		const confirmed = confirm(message);

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

			const data = await res.json();
			await invalidateAll();
			alert(data.message || 'Successfully left the team');
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

	// Open configuration modal
	async function handleConfigureIntegration(integrationId: string, currentConfig: any) {
		configuringIntegrationId = integrationId;

		// Load current settings
		const notifications = currentConfig?.notifications || {};
		notificationSettings = {
			TEST_RUN_STARTED: notifications.TEST_RUN_STARTED ?? true,
			TEST_RUN_COMPLETED: notifications.TEST_RUN_COMPLETED ?? true,
			TEST_RUN_FAILED: notifications.TEST_RUN_FAILED ?? true,
			TEST_CASE_FAILED: notifications.TEST_CASE_FAILED ?? true,
			TEST_CASE_PASSED: notifications.TEST_CASE_PASSED ?? false,
			MILESTONE_DUE: notifications.MILESTONE_DUE ?? true,
			PROJECT_CREATED: notifications.PROJECT_CREATED ?? false
		};
	}

	// Save integration settings
	async function handleSaveIntegrationSettings() {
		if (!configuringIntegrationId) return;

		savingSettings = true;

		try {
			const res = await fetch(`/api/integrations/${configuringIntegrationId}/settings`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notifications: notificationSettings })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to save settings');
			}

			await invalidateAll();
			configuringIntegrationId = null;
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			savingSettings = false;
		}
	}

	// Get notification event label
	function getEventLabel(event: string): string {
		const labels: Record<string, string> = {
			TEST_RUN_STARTED: 'Test Run Started',
			TEST_RUN_COMPLETED: 'Test Run Completed',
			TEST_RUN_FAILED: 'Test Run Failed',
			TEST_CASE_FAILED: 'Test Case Failed',
			TEST_CASE_PASSED: 'Test Case Passed',
			MILESTONE_DUE: 'Milestone Due Soon',
			PROJECT_CREATED: 'Project Created'
		};
		return labels[event] || event;
	}

	// Get notification event description
	function getEventDescription(event: string): string {
		const descriptions: Record<string, string> = {
			TEST_RUN_STARTED: 'When a test run begins execution',
			TEST_RUN_COMPLETED: 'When a test run finishes (pass or fail)',
			TEST_RUN_FAILED: 'When a test run has failures',
			TEST_CASE_FAILED: 'When an individual test case fails',
			TEST_CASE_PASSED: 'When an individual test case passes',
			MILESTONE_DUE: 'When a milestone is approaching its due date',
			PROJECT_CREATED: 'When a new project is created'
		};
		return descriptions[event] || '';
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
					<a href="/settings/api-keys" class="btn preset-filled-primary-500">
						<Key class="mr-2 h-4 w-4" />
						Manage API Keys
					</a>
				</div>

				<!-- Quick Overview -->
				<div class="bg-surface-50-900 mb-6 rounded-container border border-primary-500/20 p-6">
					<div class="mb-4 flex items-start gap-4">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
							<Key class="h-6 w-6 text-primary-500" />
						</div>
						<div class="flex-1">
							<h3 class="mb-2 font-bold">Full API Keys Management</h3>
							<p class="text-surface-600-300 mb-4 text-sm">
								Access the dedicated API Keys page for complete management including:
							</p>
							<ul class="text-surface-600-300 space-y-2 text-sm">
								<li class="flex items-center gap-2">
									<Check class="h-4 w-4 text-success-500" />
									<span>Create and manage API keys</span>
								</li>
								<li class="flex items-center gap-2">
									<Check class="h-4 w-4 text-success-500" />
									<span>Playwright configuration examples with your API key</span>
								</li>
								<li class="flex items-center gap-2">
									<Check class="h-4 w-4 text-success-500" />
									<span>CI/CD integration examples (GitHub Actions, GitLab)</span>
								</li>
								<li class="flex items-center gap-2">
									<Check class="h-4 w-4 text-success-500" />
									<span>Environment variables setup guide</span>
								</li>
							</ul>
						</div>
					</div>
					<a href="/settings/api-keys" class="btn w-full preset-filled-primary-500">
						<Key class="mr-2 h-4 w-4" />
						Go to API Keys Page
					</a>
				</div>

				<!-- Current API Keys Summary -->
				{#if user.apiKeys.length === 0}
					<div class="border-surface-200-700 rounded-container border p-8 text-center">
						<Key class="mx-auto mb-4 h-12 w-12 text-surface-400" />
						<h3 class="mb-2 text-lg font-bold">No API Keys Yet</h3>
						<p class="text-surface-600-300 mb-4 text-sm">
							Create your first API key to get started with API access
						</p>
						<a href="/settings/api-keys" class="btn preset-filled-primary-500">
							<Plus class="mr-2 h-4 w-4" />
							Create API Key
						</a>
					</div>
				{:else}
					<div>
						<h3 class="mb-3 text-sm font-semibold">Your API Keys ({user.apiKeys.length})</h3>
						<div class="space-y-2">
							{#each user.apiKeys.slice(0, 3) as apiKey}
								<div class="border-surface-200-700 rounded-container border p-3">
									<div class="mb-1 font-medium">{apiKey.name}</div>
									<div class="text-surface-600-300 font-mono text-xs">
										{apiKey.prefix}••••••••••••••••
									</div>
								</div>
							{/each}
						</div>
						{#if user.apiKeys.length > 3}
							<div class="text-surface-600-300 mt-3 text-center text-sm">
								And {user.apiKeys.length - 3} more key{user.apiKeys.length - 3 !== 1 ? 's' : ''}
							</div>
						{/if}
						<a href="/settings/api-keys" class="mt-4 btn w-full preset-outlined-primary-500">
							View All Keys & Get Playwright Config
						</a>
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
										{getSubscriptionPlanName(user.team.subscription.status)}
									</div>
								</div>
								<div>
									<div class="text-surface-600-300 mb-1 text-sm">Seats</div>
									<div class="flex items-center gap-2">
										<span class="font-semibold">{user.team.subscription.seats}</span>
										<button
											onclick={openSeatUpdateDialog}
											class="btn preset-outlined-primary-500 btn-sm"
											title="Update seat count"
										>
											<Users class="h-3 w-3" />
											Update
										</button>
									</div>
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
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-xl font-bold">Team Members ({user.team.members.length})</h3>
							<a href="/teams/{user.team.id}/invite" class="btn preset-filled-primary-500 btn-sm">
								<Users class="mr-2 h-4 w-4" />
								Invite Members
							</a>
						</div>

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
					{#if user.team.subscription}
						<div class="card p-6">
							<h3 class="mb-4 text-xl font-bold">Billing</h3>
							<p class="text-surface-600-300 mb-4">
								Manage your subscription, update payment methods, and view invoices through the
								Stripe Customer Portal.
							</p>
							<button
								onclick={handleManageBilling}
								disabled={loadingBillingPortal}
								class="btn preset-filled-primary-500"
							>
								{#if loadingBillingPortal}
									Opening Portal...
								{:else}
									<ExternalLink class="mr-2 h-4 w-4" />
									Manage Billing
								{/if}
							</button>
						</div>
					{/if}

					<!-- Danger Zone -->
					<div class="card border-2 border-error-500 p-6">
						<h3 class="mb-4 text-xl font-bold text-error-500">Danger Zone</h3>
						<div class="flex items-start justify-between gap-4">
							<div>
								<h4 class="mb-1 font-semibold">
									{user.team.members.length === 1 ? 'Delete Team' : 'Leave Team'}
								</h4>
								<p class="text-surface-600-300 text-sm">
									{#if user.team.members.length === 1}
										You are the only member. Leaving will permanently delete the team and all
										associated data (projects, test cases, test runs, etc.).
										{#if user.team.subscription}
											Your subscription will also be canceled immediately.
										{/if}
									{:else}
										Remove yourself from this team and all associated projects.
									{/if}
									This action cannot be undone.
								</p>
							</div>
							<button
								onclick={handleLeaveTeam}
								disabled={leavingTeam}
								class="btn preset-filled-error-500 whitespace-nowrap"
							>
								{#if leavingTeam}
									<span>{user.team.members.length === 1 ? 'Deleting...' : 'Leaving...'}</span>
								{:else}
									<LogOut class="mr-2 h-4 w-4" />
									<span>{user.team.members.length === 1 ? 'Delete Team' : 'Leave Team'}</span>
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
						{#if !user.team?.integrations?.some((i) => i.type === 'SLACK')}
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
												alert(
													'Slack integration is not configured. Please contact your administrator.'
												);
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
						{/if}

						<!-- Jira Integration -->
						{#if !user.team?.integrations?.some((i) => i.type === 'JIRA')}
							<div class="border-surface-200-700 rounded-container border p-4">
								<div class="mb-3 flex items-start gap-3">
									<div
										class="flex h-12 w-12 items-center justify-center rounded-container bg-[#0052CC]"
									>
										<svg class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
											<path
												d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"
											/>
										</svg>
									</div>
									<div class="flex-1">
										<h4 class="mb-1 font-bold">Jira</h4>
										<p class="text-surface-600-300 text-sm">
											Create and track issues from test failures
										</p>
									</div>
								</div>

								{#if user.team}
									<a
										href="/settings/integrations/jira"
										class="btn w-full preset-filled-primary-500"
									>
										<ExternalLink class="mr-2 h-4 w-4" />
										Connect Jira
									</a>
								{:else}
									<button class="btn w-full preset-outlined-surface-500" disabled>
										Requires Team
									</button>
								{/if}
							</div>
						{/if}

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
										GitHub, Microsoft Teams, Discord, and more
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
									<!-- Action buttons -->
									<div
										class="absolute top-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<!-- Configure button -->
										<button
											onclick={() => handleConfigureIntegration(integration.id, integration.config)}
											class="text-surface-600-300 rounded-container p-2 transition-colors hover:bg-primary-500/10 hover:text-primary-500"
											title="Configure notifications"
										>
											<SettingsIcon class="h-4 w-4" />
										</button>

										<!-- Delete button -->
										<button
											onclick={() => handleDeleteIntegration(integration.id, integration.name)}
											disabled={deletingIntegrationId === integration.id}
											class="text-surface-600-300 rounded-container p-2 transition-colors hover:bg-error-500/10 hover:text-error-500"
											title="Remove integration"
										>
											{#if deletingIntegrationId === integration.id}
												<span class="text-xs">Removing...</span>
											{:else}
												<Trash2 class="h-4 w-4" />
											{/if}
										</button>
									</div>

									<div class="pr-24">
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

<!-- Integration Configuration Modal -->
{#if configuringIntegrationId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget) configuringIntegrationId = null;
		}}
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto card bg-surface-50-950 p-6 shadow-2xl"
		>
			<!-- Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold">Notification Settings</h2>
				<button
					onclick={() => (configuringIntegrationId = null)}
					class="rounded-container p-2 transition-colors hover:bg-surface-200-800"
					aria-label="Close"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Description -->
			<p class="text-surface-600-300 mb-6">
				Configure which events trigger notifications. Notifications will be sent to your configured
				channel or webhook.
			</p>

			<!-- Notification Toggles -->
			<div class="space-y-3">
				{#each Object.entries(notificationSettings) as [event, enabled]}
					<label
						class="border-surface-200-700 flex cursor-pointer items-start gap-3 rounded-container border p-4 transition-colors hover:bg-surface-100-900"
					>
						<input
							type="checkbox"
							bind:checked={notificationSettings[event]}
							class="mt-1 h-4 w-4 rounded border-surface-300-700"
						/>
						<div class="flex-1">
							<div class="mb-1 font-semibold">{getEventLabel(event)}</div>
							<div class="text-surface-600-300 text-sm">{getEventDescription(event)}</div>
						</div>
					</label>
				{/each}
			</div>

			<!-- Actions -->
			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={() => (configuringIntegrationId = null)}
					class="btn preset-outlined-surface-500"
					disabled={savingSettings}
				>
					Cancel
				</button>
				<button
					onclick={handleSaveIntegrationSettings}
					class="btn preset-filled-primary-500"
					disabled={savingSettings}
				>
					{#if savingSettings}
						Saving...
					{:else}
						Save Settings
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Seat Update Dialog -->
{#if showSeatUpdateDialog}
	<!-- Backdrop -->
	<button
		onclick={() => (showSeatUpdateDialog = false)}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto w-full max-w-md overflow-y-auto card border bg-surface-50-950 p-6 shadow-2xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold">Update Seat Count</h2>
				<button
					onclick={() => (showSeatUpdateDialog = false)}
					class="text-surface-500-400 hover:text-surface-900-50 rounded-base p-1 transition-colors"
					aria-label="Close"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="mb-4">
				<p class="text-surface-600-300 mb-4 text-sm">
					Current team members: <strong>{user.team?.members.length || 0}</strong>
				</p>

				<label class="mb-2 block text-sm font-medium">New Seat Count</label>
				<input
					type="number"
					bind:value={newSeats}
					min={user.team?.members.length || 1}
					class="w-full rounded-base border border-surface-300-700 bg-surface-100-900 px-3 py-2"
				/>

				{#if newSeats < (user.team?.members.length || 0)}
					<p class="mt-2 text-sm text-error-500">
						Cannot reduce seats below current member count ({user.team?.members.length || 0}).
						Please remove members first.
					</p>
				{/if}

				<p class="text-surface-500-400 mt-2 text-xs">
					Changes will be prorated on your next invoice.
				</p>
			</div>

			<div class="flex justify-end gap-2">
				<button
					onclick={() => (showSeatUpdateDialog = false)}
					disabled={updatingSeats}
					class="btn preset-outlined"
				>
					Cancel
				</button>
				<button
					onclick={handleUpdateSeats}
					disabled={updatingSeats || newSeats < (user.team?.members.length || 0)}
					class="btn preset-filled-primary-500"
				>
					{#if updatingSeats}
						Updating...
					{:else}
						Update Seats
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
