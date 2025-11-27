<script lang="ts">
	import { getCsrfToken, handleCsrfError } from '$lib/utils/csrf';

	let email = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);

	async function handleRequestReset() {
		error = '';
		loading = true;

		try {
			// Get CSRF token from cookie
			const csrfToken = getCsrfToken();
			if (!csrfToken) {
				error = 'Security token missing. Please refresh the page.';
				loading = false;
				return;
			}

			const response = await fetch('/api/auth/request-reset', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, csrfToken })
			});

			if (!response.ok) {
				// Handle CSRF errors (will reload page)
				if (handleCsrfError(response)) {
					return;
				}

				const data = await response.json();
				error = data.message || 'Request failed';
				return;
			}

			success = true;
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Forgot Password - QA Studio</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
	<div class="w-full max-w-md">
		<div class="card rounded-container p-8">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
					Forgot Password?
				</h1>
				<p class="mt-2 text-surface-600 dark:text-surface-400">
					Enter your email and we'll send you a reset link
				</p>
			</div>

			{#if success}
				<div
					class="mb-4 rounded-base bg-success-500/10 px-4 py-3 text-success-700 dark:text-success-400"
				>
					Check your email for a password reset link
				</div>
				<div class="text-center">
					<a
						href="/login"
						class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
					>
						Back to login
					</a>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleRequestReset();
					}}
				>
					{#if error}
						<div
							class="mb-4 rounded-base bg-error-500/10 px-4 py-3 text-error-700 dark:text-error-400"
						>
							{error}
						</div>
					{/if}

					<div class="mb-6">
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

					<button
						type="submit"
						class="btn w-full preset-filled-primary-500"
						disabled={loading}
					>
						{loading ? 'Sending...' : 'Send reset link'}
					</button>
				</form>

				<div class="mt-6 text-center text-sm text-surface-600 dark:text-surface-400">
					Remember your password?
					<a
						href="/login"
						class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
					>
						Sign in
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
