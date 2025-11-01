<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { CreditCard, Users, Settings, CheckCircle, AlertCircle } from 'lucide-svelte';
	import { page } from '$app/stores';

	let { data } = $props();
	let { team, currentUser } = $derived(data);

	let loading = $state(false);
	let error = $state('');

	// Check for checkout success/cancel
	let checkoutStatus = $derived($page.url.searchParams.get('checkout'));

	async function openBillingPortal() {
		if (!team.subscription) return;

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/teams/portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					teamId: team.id
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to open billing portal');
			}

			const { url } = await res.json();
			window.location.href = url;
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	function getStatusBadge(status: string) {
		const statusMap: Record<string, { class: string; label: string }> = {
			ACTIVE: { class: 'preset-filled-success', label: 'Active' },
			TRIALING: { class: 'preset-filled-primary', label: 'Trial' },
			PAST_DUE: { class: 'preset-filled-warning', label: 'Past Due' },
			CANCELED: { class: 'preset-filled-error', label: 'Canceled' },
			INCOMPLETE: { class: 'preset-filled-warning', label: 'Incomplete' },
			UNPAID: { class: 'preset-filled-error', label: 'Unpaid' }
		};

		return statusMap[status] || { class: 'preset-filled-surface', label: status };
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="container mx-auto max-w-6xl p-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold">{team.name}</h1>
				{#if team.description}
					<p class="text-surface-600-300">{team.description}</p>
				{/if}
			</div>

			{#if currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'}
				<a href="/teams/{team.id}/settings" class="btn preset-outlined">
					<Settings class="mr-2 h-4 w-4" />
					Settings
				</a>
			{/if}
		</div>
	</div>

	<!-- Checkout Status Alert -->
	{#if checkoutStatus === 'success'}
		<div class="alert preset-filled-success mb-6">
			<CheckCircle class="h-5 w-5" />
			<div>
				<p class="font-medium">Payment Successful!</p>
				<p class="text-sm">Your team subscription is now active.</p>
			</div>
		</div>
	{:else if checkoutStatus === 'canceled'}
		<div class="alert preset-filled-warning mb-6">
			<AlertCircle class="h-5 w-5" />
			<div>
				<p class="font-medium">Checkout Canceled</p>
				<p class="text-sm">You can upgrade to Pro anytime from team settings.</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="alert preset-filled-error mb-6">
			<AlertCircle class="h-5 w-5" />
			<p>{error}</p>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Subscription Status -->
			<div class="card p-6">
				<div class="mb-4 flex items-center gap-3">
					<CreditCard class="h-5 w-5" />
					<h2 class="h3">Subscription</h2>
				</div>

				{#if team.subscription}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-surface-600-300">Status</span>
							<span class="badge {getStatusBadge(team.subscription.status).class}">
								{getStatusBadge(team.subscription.status).label}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="text-surface-600-300">Seats</span>
							<span class="font-medium">{team.subscription.seats} / {team.members.length} used</span
							>
						</div>

						{#if team.subscription.currentPeriodEnd}
							<div class="flex items-center justify-between">
								<span class="text-surface-600-300">
									{team.subscription.cancelAtPeriodEnd ? 'Expires on' : 'Next billing date'}
								</span>
								<span class="font-medium">
									{formatDate(team.subscription.currentPeriodEnd)}
								</span>
							</div>
						{/if}

						{#if currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'}
							<button
								onclick={openBillingPortal}
								class="btn w-full preset-filled"
								disabled={loading}
							>
								{loading ? 'Loading...' : 'Manage Billing'}
							</button>
						{/if}
					</div>
				{:else}
					<div class="py-8 text-center">
						<p class="text-surface-600-300 mb-4">No active subscription</p>
						{#if currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'}
							<a href="/teams/new" class="btn preset-filled"> Upgrade to Pro </a>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Recent Projects -->
			<div class="card p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="h3">Recent Projects</h2>
					<a href="/projects/new" class="preset-filled-primary btn btn-sm"> New Project </a>
				</div>

				{#if team.projects.length > 0}
					<div class="space-y-3">
						{#each team.projects as project}
							<a
								href="/projects/{project.id}"
								class="hover:bg-surface-100-800 block rounded-container p-4 transition-colors"
							>
								<div class="flex items-center justify-between">
									<div>
										<h3 class="font-medium">{project.name}</h3>
										<p class="text-surface-600-300 text-sm">Key: {project.key}</p>
									</div>
									<span class="text-surface-600-300 text-sm">
										{formatDate(project.createdAt)}
									</span>
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-surface-600-300 py-8 text-center">No projects yet</p>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Team Members -->
			<div class="card p-6">
				<div class="mb-4 flex items-center gap-3">
					<Users class="h-5 w-5" />
					<h2 class="h3">Members</h2>
					<span class="preset-filled-surface ml-auto badge">{team.members.length}</span>
				</div>

				<div class="space-y-3">
					{#each team.members as member}
						<div class="flex items-center gap-3">
							<Avatar class="h-10 w-10">
								{#if member.imageUrl}
									<Avatar.Image src={member.imageUrl} alt={member.email} />
								{/if}
								<Avatar.Fallback>
									{member.firstName?.[0] || member.email[0].toUpperCase()}
								</Avatar.Fallback>
							</Avatar>

							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">
									{member.firstName && member.lastName
										? `${member.firstName} ${member.lastName}`
										: member.email}
								</p>
								<p class="text-surface-600-300 text-sm">{member.role}</p>
							</div>

							{#if member.id === currentUser?.id}
								<span class="preset-filled-primary badge text-xs">You</span>
							{/if}
						</div>
					{/each}
				</div>

				{#if currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'}
					<a href="/teams/{team.id}/invite" class="mt-4 btn w-full preset-outlined">
						Invite Members
					</a>
				{/if}
			</div>

			<!-- Quick Stats -->
			<div class="card p-6">
				<h2 class="mb-4 h4">Quick Stats</h2>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Projects</span>
						<span class="text-xl font-bold">{team.projects.length}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Members</span>
						<span class="text-xl font-bold">{team.members.length}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
