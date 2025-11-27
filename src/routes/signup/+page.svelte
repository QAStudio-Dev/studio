<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSignup() {
		error = '';

		// Validate passwords match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password, firstName, lastName })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.message || 'Signup failed';
				return;
			}

			// Redirect to home page after successful signup
			goto('/');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up - QA Studio</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12 dark:bg-surface-900"
>
	<div class="w-full max-w-md">
		<div class="card rounded-container p-8">
			<div class="mb-8 text-center">
				<h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
					Create Account
				</h1>
				<p class="mt-2 text-surface-600 dark:text-surface-400">
					Get started with QA Studio
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSignup();
				}}
			>
				{#if error}
					<div
						class="mb-4 rounded-base bg-error-500/10 px-4 py-3 text-error-700 dark:text-error-400"
					>
						{error}
					</div>
				{/if}

				<div class="mb-4 grid grid-cols-2 gap-4">
					<div>
						<label
							for="firstName"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							First Name
						</label>
						<input
							id="firstName"
							type="text"
							bind:value={firstName}
							autocomplete="given-name"
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="John"
						/>
					</div>
					<div>
						<label
							for="lastName"
							class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
						>
							Last Name
						</label>
						<input
							id="lastName"
							type="text"
							bind:value={lastName}
							autocomplete="family-name"
							disabled={loading}
							class="w-full rounded-base border border-surface-300 bg-white px-4 py-2 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50"
							placeholder="Doe"
						/>
					</div>
				</div>

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

				<div class="mb-4">
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
					{loading ? 'Creating account...' : 'Create account'}
				</button>
			</form>

			<div class="mt-6 text-center text-sm text-surface-600 dark:text-surface-400">
				Already have an account?
				<a
					href="/login"
					class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
				>
					Sign in
				</a>
			</div>
		</div>
	</div>
</div>
