<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';

	const user = $derived(page.data.user);

	// Redirect to login if not authenticated
	$effect(() => {
		if (!user) {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>Profile - QA Studio</title>
</svelte:head>

{#if user}
	<div class="container mx-auto max-w-4xl px-4 py-12">
		<div class="card rounded-container p-8">
			<div class="mb-8 flex items-center gap-6">
				<Avatar class="h-24 w-24">
					{#if user.imageUrl}
						<Avatar.Image src={user.imageUrl} alt={user.email} />
					{:else}
						<Avatar.Fallback class="bg-primary-500 text-3xl text-white">
							{user.firstName?.[0] || user.email[0].toUpperCase()}
						</Avatar.Fallback>
					{/if}
				</Avatar>
				<div>
					<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
						{user.firstName}
						{user.lastName}
					</h1>
					<p class="text-surface-600 dark:text-surface-400">{user.email}</p>
					<p
						class="mt-1 inline-block rounded-base bg-primary-500/10 px-2 py-1 text-sm font-medium text-primary-700 dark:text-primary-300"
					>
						{user.role}
					</p>
				</div>
			</div>

			<div class="space-y-6">
				<div>
					<h2 class="mb-4 text-xl font-semibold text-surface-900 dark:text-surface-50">
						Account Information
					</h2>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between border-b border-surface-300-700 pb-2">
							<span class="text-surface-600 dark:text-surface-400">Email</span>
							<span class="font-medium">{user.email}</span>
						</div>
						<div class="flex justify-between border-b border-surface-300-700 pb-2">
							<span class="text-surface-600 dark:text-surface-400">First Name</span>
							<span class="font-medium">{user.firstName || 'Not set'}</span>
						</div>
						<div class="flex justify-between border-b border-surface-300-700 pb-2">
							<span class="text-surface-600 dark:text-surface-400">Last Name</span>
							<span class="font-medium">{user.lastName || 'Not set'}</span>
						</div>
						<div class="flex justify-between border-b border-surface-300-700 pb-2">
							<span class="text-surface-600 dark:text-surface-400">Role</span>
							<span class="font-medium">{user.role}</span>
						</div>
						{#if user.teamId}
							<div class="flex justify-between border-b border-surface-300-700 pb-2">
								<span class="text-surface-600 dark:text-surface-400">Team</span>
								<a
									href="/teams/{user.teamId}"
									class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
								>
									View Team
								</a>
							</div>
						{/if}
					</div>
				</div>

				<div class="flex gap-4 pt-4">
					<a href="/change-password" class="btn preset-tonal-primary">
						Change Password
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}
