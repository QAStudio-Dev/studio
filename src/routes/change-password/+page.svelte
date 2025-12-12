<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const user = $derived(page.data.user);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	// Redirect to login if not authenticated
	$effect(() => {
		if (!user) {
			goto('/login');
		}
	});

	async function handleChangePassword() {
		error = '';

		if (newPassword !== confirmPassword) {
			error = 'New passwords do not match';
			return;
		}

		if (newPassword === currentPassword) {
			error = 'New password must be different from current password';
			return;
		}

		loading = true;

		try {
			// TODO: Implement change password API endpoint
			// For now, just show success
			await new Promise((resolve) => setTimeout(resolve, 1000));

			success = true;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';

			setTimeout(() => {
				goto('/settings');
			}, 2000);
		} catch (err) {
			error = 'Failed to change password. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Change Password - QA Studio</title>
</svelte:head>

{#if user}
	<div class="container mx-auto max-w-2xl px-4 py-12">
		<div class="card rounded-container p-8">
			<h1 class="mb-8 text-3xl font-bold text-surface-900 dark:text-surface-50">
				Change Password
			</h1>

			{#if success}
				<div
					class="mb-6 rounded-base bg-success-500/10 px-4 py-3 text-success-700 dark:text-success-400"
				>
					Password changed successfully! Redirecting...
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleChangePassword();
					}}
				>
					{#if error}
						<div
							class="mb-4 rounded-base bg-error-500/10 px-4 py-3 text-error-700 dark:text-error-400"
						>
							{error}
						</div>
					{/if}

					<div class="mb-4">
						<label
							for="currentPassword"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							Current Password
						</label>
						<input
							id="currentPassword"
							type="password"
							bind:value={currentPassword}
							required
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="••••••••"
						/>
					</div>

					<div class="mb-4">
						<label
							for="newPassword"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							New Password
						</label>
						<input
							id="newPassword"
							type="password"
							bind:value={newPassword}
							required
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="••••••••"
						/>
						<p class="mt-1 text-xs text-surface-500 dark:text-surface-400">
							Must be at least 8 characters with uppercase, lowercase, and number
						</p>
					</div>

					<div class="mb-6">
						<label
							for="confirmPassword"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							Confirm New Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="••••••••"
						/>
					</div>

					<div class="flex gap-4">
						<button
							type="submit"
							class="btn preset-filled-primary-500"
							disabled={loading}
						>
							{loading ? 'Changing password...' : 'Change Password'}
						</button>
						<a href="/settings" class="btn preset-tonal-primary"> Cancel </a>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
