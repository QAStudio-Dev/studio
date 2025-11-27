<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { handleCsrfError } from '$lib/utils/csrf';

	let { data } = $props();

	// Pre-fill email from URL parameter if available
	let email = $state(page.url.searchParams.get('email') || '');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSetupPassword() {
		error = '';

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			// Get CSRF token from page data
			const csrfToken = data.csrfToken;
			if (!csrfToken) {
				error = 'Security token missing. Please refresh the page.';
				loading = false;
				return;
			}

			const response = await fetch('/api/auth/setup-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, newPassword, csrfToken })
			});

			if (!response.ok) {
				// Handle CSRF errors (will reload page)
				if (handleCsrfError(response)) {
					return;
				}

				const data = await response.json();
				error = data.message || 'Setup failed';
				return;
			}

			// Invalidate all data to refresh user state
			await invalidateAll();

			// Redirect to home page after successful setup
			goto('/');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Set Up Password - QA Studio</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
	<div class="w-full max-w-md">
		<div class="card rounded-container p-8">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
					Welcome Back!
				</h1>
				<p class="mt-2 text-surface-600 dark:text-surface-400">
					We've upgraded our authentication system
				</p>
				<p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
					Please set a new password to continue
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSetupPassword();
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
						for="email"
						class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
					>
						Email
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						disabled={loading}
						class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
						placeholder="you@example.com"
					/>
					<p class="mt-1 text-xs text-surface-500 dark:text-surface-400">
						Use the email from your previous account
					</p>
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
					{loading ? 'Setting password...' : 'Set Password & Continue'}
				</button>
			</form>

			<div class="mt-6 text-center text-sm text-surface-600 dark:text-surface-400">
				<p class="mb-2">Already set your password?</p>
				<a
					href="/login"
					class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
				>
					Sign in here
				</a>
			</div>
		</div>
	</div>
</div>
