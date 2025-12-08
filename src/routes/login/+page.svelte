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

			// Redirect to projects page after successful login
			goto('/projects');
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

<div
	class="min-h-screen bg-gradient-to-br from-primary-50 via-surface-50 to-secondary-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950"
>
	<!-- Background pattern overlay -->
	<div
		class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE0YzAtOC44MzcgNy4xNjMtMTYgMTYtMTZzMTYgNy4xNjMgMTYgMTYtNy4xNjMgMTYtMTYgMTYtMTYtNy4xNjMtMTYtMTZ6TTIgMzBjMC04LjgzNyA3LjE2My0xNiAxNi0xNnMxNiA3LjE2MyAxNiAxNi03LjE2MyAxNi0xNiAxNi0xNi03LjE2My0xNi0xNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"
	></div>

	<div class="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
		<div class="w-full max-w-md">
			<!-- Logo and branding -->
			<div class="mb-8 text-center">
				<div class="mb-4 flex justify-center">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-lg shadow-primary-500/30"
					>
						<svg
							class="h-8 w-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
				<h1 class="text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
					Welcome Back
				</h1>
				<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
					Sign in to continue to QA Studio
				</p>
			</div>

			<!-- Main card -->
			<div
				class="card rounded-2xl border border-surface-200/60 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-surface-800/60 dark:bg-surface-900/80"
			>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleLogin();
					}}
					class="space-y-5"
				>
					{#if error}
						<div
							role="alert"
							class="flex gap-3 rounded-xl border border-error-200 bg-gradient-to-r from-error-50 to-error-100/50 px-4 py-3.5 dark:border-error-900/50 dark:from-error-950/50 dark:to-error-900/30"
						>
							<svg
								class="h-5 w-5 flex-shrink-0 text-error-600 dark:text-error-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p class="text-sm text-error-900 dark:text-error-100">{error}</p>
						</div>
					{/if}

					<div>
						<label
							for="email"
							class="mb-2 block text-sm font-medium text-surface-900 dark:text-surface-100"
						>
							Email address
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							autocomplete="email"
							disabled={loading}
							class="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-surface-900 placeholder-surface-400 transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50 dark:focus:border-primary-400 dark:focus:ring-primary-400/20"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label
							for="password"
							class="mb-2 block text-sm font-medium text-surface-900 dark:text-surface-100"
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
							class="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-surface-900 placeholder-surface-400 transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50 dark:focus:border-primary-400 dark:focus:ring-primary-400/20"
							placeholder="Enter your password"
						/>
					</div>

					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<input
								id="remember"
								type="checkbox"
								class="h-4 w-4 rounded-md border-surface-300 text-primary-600 transition-all focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0 dark:border-surface-700 dark:bg-surface-800"
							/>
							<label
								for="remember"
								class="ml-2.5 text-sm text-surface-700 dark:text-surface-300"
							>
								Remember me
							</label>
						</div>
						<a
							href="/forgot-password"
							class="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
						>
							Forgot password?
						</a>
					</div>

					<button
						type="submit"
						class="btn w-full rounded-xl preset-filled-primary-500 py-3 text-base font-semibold shadow-lg shadow-primary-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={loading}
					>
						{#if loading}
							<svg
								class="mr-2 inline h-5 w-5 animate-spin"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Signing in...
						{:else}
							Sign in to your account
						{/if}
					</button>
				</form>

				<!-- SSO Divider -->
				<div class="relative my-6">
					<div class="absolute inset-0 flex items-center">
						<div
							class="w-full border-t border-surface-300 dark:border-surface-700"
						></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span
							class="bg-white px-4 text-surface-500 dark:bg-surface-900 dark:text-surface-400"
							>Or continue with</span
						>
					</div>
				</div>

				<!-- SSO Buttons -->
				<div class="space-y-3">
					<a
						href="/api/auth/sso/okta"
						class="dark:hover:bg-surface-750 btn w-full rounded-xl border border-surface-300 bg-white py-3 text-sm font-medium text-surface-700 transition-all duration-200 hover:bg-surface-50 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
					>
						<svg class="mr-2 inline h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4z"
							/>
						</svg>
						Sign in with Okta
					</a>

					<a
						href="/api/auth/sso/google"
						class="dark:hover:bg-surface-750 btn w-full rounded-xl border border-surface-300 bg-white py-3 text-sm font-medium text-surface-700 transition-all duration-200 hover:bg-surface-50 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
					>
						<svg class="mr-2 inline h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Sign in with Google
					</a>
				</div>

				<div class="mt-6 text-center">
					<p class="text-sm text-surface-600 dark:text-surface-400">
						Don't have an account?
						<a
							href="/signup"
							class="font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
						>
							Sign up for free
						</a>
					</p>
				</div>
			</div>

			<!-- Footer -->
			<p class="mt-8 text-center text-xs text-surface-500 dark:text-surface-500">
				By signing in, you agree to our Terms of Service and Privacy Policy
			</p>
		</div>
	</div>
</div>
