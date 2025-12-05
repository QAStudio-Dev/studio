<script lang="ts">
	import { goto } from '$app/navigation';
	import { Check } from 'lucide-svelte';
	import { PRICING } from '$lib/constants/pricing';

	let { data } = $props();

	let teamName = $state('');
	let selectedPlan = $state<'free' | 'pro' | 'enterprise'>('free');
	let loading = $state(false);
	let error = $state('');
	let step = $state<1 | 2>(1);

	async function createTeam() {
		if (!teamName.trim()) {
			error = 'Please enter a team name';
			return;
		}

		// If Enterprise plan selected, redirect to contact sales
		if (selectedPlan === 'enterprise') {
			goto('/contact-sales');
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/teams/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: teamName.trim(),
					csrfToken: data.csrfToken
				})
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.message || 'Failed to create team';
				return;
			}

			const result = await response.json();

			// Redirect to create first project
			goto('/projects/new');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Welcome to QA Studio - Get Started</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-primary-50 via-surface-50 to-secondary-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950"
>
	<div class="relative px-4 py-12 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-3xl">
			<!-- Progress Steps -->
			<div class="mb-12">
				<div class="flex items-center justify-center gap-4">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg"
						>
							<Check class="h-5 w-5" />
						</div>
						<span
							class="hidden text-sm font-medium text-surface-900 sm:block dark:text-surface-100"
							>Create Account</span
						>
					</div>

					<div class="h-px w-12 bg-primary-300 sm:w-24 dark:bg-primary-700"></div>

					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {step >=
							1
								? 'bg-primary-500 text-white shadow-lg'
								: 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}"
						>
							{#if step > 1}
								<Check class="h-5 w-5" />
							{:else}
								<span>1</span>
							{/if}
						</div>
						<span
							class="hidden text-sm font-medium {step >= 1
								? 'text-surface-900 dark:text-surface-100'
								: 'text-surface-600 dark:text-surface-400'} sm:block"
							>Create Team</span
						>
					</div>

					<div class="h-px w-12 bg-surface-300 sm:w-24 dark:bg-surface-700"></div>

					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {step >=
							2
								? 'bg-primary-500 text-white shadow-lg'
								: 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}"
						>
							<span>2</span>
						</div>
						<span
							class="hidden text-sm font-medium {step >= 2
								? 'text-surface-900 dark:text-surface-100'
								: 'text-surface-600 dark:text-surface-400'} sm:block"
							>Create Project</span
						>
					</div>
				</div>
			</div>

			<!-- Welcome Header -->
			<div class="mb-8 text-center">
				<h1 class="mb-3 text-4xl font-bold tracking-tight text-surface-900 dark:text-white">
					Welcome to QA Studio! 👋
				</h1>
				<p class="text-lg text-surface-600 dark:text-surface-400">
					Let's get you set up in just a few steps
				</p>
			</div>

			<!-- Main Card -->
			<div
				class="card rounded-2xl border border-surface-200/60 bg-white/80 p-8 shadow-xl backdrop-blur-sm sm:p-12 dark:border-surface-800/60 dark:bg-surface-900/80"
			>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						createTeam();
					}}
					class="space-y-8"
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

					<!-- Step 1: Team Name -->
					<div>
						<label
							for="teamName"
							class="mb-3 block text-lg font-semibold text-surface-900 dark:text-surface-100"
						>
							What's your team name?
						</label>
						<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
							This will be your workspace for organizing projects and collaborating
							with others.
						</p>
						<input
							id="teamName"
							type="text"
							bind:value={teamName}
							required
							disabled={loading}
							class="w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-surface-900 placeholder-surface-400 transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50 dark:focus:border-primary-400 dark:focus:ring-primary-400/20"
							placeholder="e.g., Acme QA Team"
						/>
					</div>

					<!-- Step 2: Choose Plan -->
					<div>
						<label
							class="mb-3 block text-lg font-semibold text-surface-900 dark:text-surface-100"
						>
							Choose your plan
						</label>
						<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
							Start with Free and upgrade anytime as your needs grow.
						</p>

						<div class="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<!-- Free Plan -->
							<button
								type="button"
								onclick={() => (selectedPlan = 'free')}
								class="group relative rounded-xl border-2 p-6 text-left transition-all {selectedPlan ===
								'free'
									? 'border-primary-500 bg-primary-50/50 shadow-lg dark:bg-primary-950/30'
									: 'border-surface-300 bg-white hover:border-primary-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-700'}"
							>
								{#if selectedPlan === 'free'}
									<div class="absolute top-4 right-4">
										<div
											class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500"
										>
											<Check class="h-4 w-4 text-white" />
										</div>
									</div>
								{/if}

								<div class="mb-4 h-[120px]">
									<h3
										class="text-xl font-bold text-surface-900 dark:text-surface-100"
									>
										{PRICING.FREE.name}
									</h3>
									<p
										class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100"
									>
										${PRICING.FREE.price}<span
											class="text-sm font-normal text-surface-600 dark:text-surface-400"
											>/month</span
										>
									</p>
								</div>
								<ul
									class="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400"
								>
									{#each PRICING.FREE.features as feature}
										<li class="flex items-start gap-2">
											<Check
												class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500"
											/>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							</button>

							<!-- Pro Plan -->
							<button
								type="button"
								onclick={() => (selectedPlan = 'pro')}
								class="group relative rounded-xl border-2 p-6 text-left transition-all {selectedPlan ===
								'pro'
									? 'border-primary-500 bg-primary-50/50 shadow-lg dark:bg-primary-950/30'
									: 'border-surface-300 bg-white hover:border-primary-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-700'}"
							>
								<div class="absolute top-4 right-4">
									{#if selectedPlan === 'pro'}
										<div
											class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500"
										>
											<Check class="h-4 w-4 text-white" />
										</div>
									{:else}
										<span
											class="rounded-full bg-primary-500 px-2 py-1 text-xs font-semibold text-white"
											>Popular</span
										>
									{/if}
								</div>

								<div class="mb-4 h-[120px]">
									<h3
										class="text-xl font-bold text-surface-900 dark:text-surface-100"
									>
										{PRICING.PRO.name}
									</h3>
									<p
										class="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100"
									>
										${PRICING.PRO.pricePerSeatMonthly}<span
											class="text-sm font-normal text-surface-600 dark:text-surface-400"
											>/seat/month</span
										>
									</p>
								</div>
								<ul
									class="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400"
								>
									{#each PRICING.PRO.features as feature}
										<li class="flex items-start gap-2">
											<Check
												class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500"
											/>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							</button>

							<!-- Enterprise Plan -->
							<button
								type="button"
								onclick={() => (selectedPlan = 'enterprise')}
								class="group relative rounded-xl border-2 p-6 text-left transition-all {selectedPlan ===
								'enterprise'
									? 'border-primary-500 bg-primary-50/50 shadow-lg dark:bg-primary-950/30'
									: 'border-surface-300 bg-white hover:border-primary-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-700'}"
							>
								{#if selectedPlan === 'enterprise'}
									<div class="absolute top-4 right-4">
										<div
											class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500"
										>
											<Check class="h-4 w-4 text-white" />
										</div>
									</div>
								{/if}

								<div class="mb-4 h-[120px]">
									<h3
										class="text-xl font-bold text-surface-900 dark:text-surface-100"
									>
										{PRICING.ENTERPRISE.name}
									</h3>
									<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
										Contact sales for pricing
									</p>
								</div>
								<ul
									class="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400"
								>
									{#each PRICING.ENTERPRISE.features as feature}
										<li class="flex items-start gap-2">
											<Check
												class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500"
											/>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							</button>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end pt-4">
						<button
							type="submit"
							disabled={loading || !teamName.trim()}
							class="btn rounded-xl preset-filled-primary-500 px-8 py-3 text-base font-semibold shadow-lg shadow-primary-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60"
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
								Creating...
							{:else}
								Continue to create project
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Help Text -->
			<p class="mt-6 text-center text-sm text-surface-500 dark:text-surface-500">
				Need help? Check out our <a
					href="/docs"
					class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
					>documentation</a
				>
				or
				<a
					href="/support"
					class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
					>contact support</a
				>
			</p>
		</div>
	</div>
</div>
