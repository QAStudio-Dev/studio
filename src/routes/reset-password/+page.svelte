<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getCsrfToken, handleCsrfError } from '$lib/utils/csrf';

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	// Get token from URL query parameter
	const token = $derived(page.url.searchParams.get('token'));

	async function handleResetPassword() {
		error = '';

		if (!token) {
			error = 'Invalid reset link';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			// Get CSRF token from cookie
			const csrfToken = getCsrfToken();
			if (!csrfToken) {
				error = 'Security token missing. Please refresh the page.';
				loading = false;
				return;
			}

			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token, password, csrfToken })
			});

			if (!response.ok) {
				// Handle CSRF errors (will reload page)
				if (handleCsrfError(response)) {
					return;
				}

				const data = await response.json();
				error = data.message || 'Reset failed';
				return;
			}

			// Redirect to login after successful reset
			goto('/login');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Reset Password - QA Studio</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
	<div class="w-full max-w-md">
		<div class="card rounded-container p-8">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
					Reset Password
				</h1>
				<p class="mt-2 text-surface-600 dark:text-surface-400">Enter your new password</p>
			</div>

			{#if !token}
				<div
					class="mb-4 rounded-base bg-error-500/10 px-4 py-3 text-error-700 dark:text-error-400"
				>
					Invalid or missing reset token
				</div>
				<div class="text-center">
					<a
						href="/forgot-password"
						class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
					>
						Request a new reset link
					</a>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleResetPassword();
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
							for="password"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							New Password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							autocomplete="new-password"
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
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							autocomplete="new-password"
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						class="btn w-full preset-filled-primary-500"
						disabled={loading}
					>
						{loading ? 'Resetting password...' : 'Reset password'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
