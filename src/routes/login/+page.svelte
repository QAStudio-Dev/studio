<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { handleCsrfError } from '$lib/utils/csrf';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		error = '';
		loading = true;

		try {
			// Get CSRF token from page data
			const csrfToken = data.csrfToken;
			if (!csrfToken) {
				error = 'Security token missing. Please refresh the page.';
				loading = false;
				return;
			}

			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password, csrfToken })
			});

			if (!response.ok) {
				// Handle CSRF errors (will reload page)
				if (handleCsrfError(response)) {
					return;
				}

				const data = await response.json();

				// Check if user needs to set up password (migrated from Clerk)
				if (response.status === 403 && data.message === 'NEEDS_PASSWORD_SETUP') {
					// Redirect to password setup page with email pre-filled
					goto(`/setup-password?email=${encodeURIComponent(email)}`);
					return;
				}

				error = data.message || 'Login failed';
				return;
			}

			// Invalidate all data to refresh user state
			await invalidateAll();

			// Redirect to home page after successful login
			goto('/');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - QA Studio</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
	<div class="w-full max-w-md">
		<div class="card rounded-container p-8">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
					Welcome Back
				</h1>
				<p class="mt-2 text-surface-600 dark:text-surface-400">
					Sign in to your QA Studio account
				</p>
			</div>

			<!-- Info banner for existing users -->
			<div class="mb-6 rounded-base border border-primary-500/30 bg-primary-500/10 px-4 py-3">
				<p class="text-sm text-primary-700 dark:text-primary-300">
					<strong>Existing users:</strong> If you had an account before, enter your email to
					set up a new password.
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
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
				</div>

				<div class="mb-6">
					<label
						for="password"
						class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						autocomplete="current-password"
						disabled={loading}
						class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
						placeholder="••••••••"
					/>
				</div>

				<div class="mb-6 flex items-center justify-between text-sm">
					<div class="flex items-center">
						<input
							id="remember"
							type="checkbox"
							class="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 dark:border-surface-700"
						/>
						<label for="remember" class="ml-2 text-surface-600 dark:text-surface-400">
							Remember me
						</label>
					</div>
					<a
						href="/forgot-password"
						class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
					>
						Forgot password?
					</a>
				</div>

				<button
					type="submit"
					class="btn w-full preset-filled-primary-500"
					disabled={loading}
				>
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>

			<div class="mt-6 text-center text-sm text-surface-600 dark:text-surface-400">
				Don't have an account?
				<a
					href="/signup"
					class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
				>
					Sign up
				</a>
			</div>
		</div>
	</div>
</div>
