<script lang="ts">
	import { goto } from '$app/navigation';
	import { Check, Sparkles, Users, Zap } from 'lucide-svelte';
	import { env } from '$env/dynamic/public';
	import { PRICING, getMonthlyEquivalent } from '$lib/constants/pricing';

	let teamName = $state('');
	let teamDescription = $state('');
	let selectedPlan: 'free' | 'pro' | 'enterprise' = $state('pro');
	let billingPeriod: 'monthly' | 'yearly' = $state('yearly');
	let loading = $state(false);
	let error = $state('');

	// These should match your Stripe Price IDs from .env
	const PRICE_IDS = {
		pro_monthly:
			env.PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY ||
			import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
		pro_yearly:
			env.PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY ||
			import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
	};

	async function handleCreateTeam() {
		if (!teamName.trim()) {
			error = 'Please enter a team name';
			return;
		}

		loading = true;
		error = '';

		try {
			// Create the team first
			const createRes = await fetch('/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: teamName,
					description: teamDescription
				})
			});

			if (!createRes.ok) {
				const data = await createRes.json();
				throw new Error(data.message || 'Failed to create team');
			}

			const { team } = await createRes.json();

			// If Enterprise plan selected, redirect to contact sales
			if (selectedPlan === 'enterprise') {
				goto('/contact-sales');
				return;
			}

			// If Pro plan selected, redirect to Stripe Checkout
			if (selectedPlan === 'pro') {
				const priceId =
					billingPeriod === 'monthly' ? PRICE_IDS.pro_monthly : PRICE_IDS.pro_yearly;

				// Validate price ID is set
				if (!priceId) {
					throw new Error(
						'Stripe price ID not configured. Please contact support or check your environment variables.'
					);
				}

				console.log('Using Stripe Price ID:', priceId); // Debug log

				const checkoutRes = await fetch('/api/teams/checkout', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						teamId: team.id,
						priceId
					})
				});

				if (!checkoutRes.ok) {
					throw new Error('Failed to create checkout session');
				}

				const { url } = await checkoutRes.json();

				// Redirect to Stripe Checkout
				window.location.href = url;
			} else {
				// Free plan - redirect to team page
				goto(`/teams/${team.id}`);
			}
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1
			class="mb-4 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl"
		>
			Create Your Team
		</h1>
		<p class="text-surface-600-300 mx-auto max-w-2xl text-lg">
			Start collaborating with your team on test management. Choose the plan that fits your
			needs.
		</p>
	</div>

	{#if error}
		<div class="alert preset-filled-error mx-auto mb-8 max-w-3xl">
			<p>{error}</p>
		</div>
	{/if}

	<!-- Billing Period Toggle -->
	<div class="mb-12 flex items-center justify-center gap-3">
		<button
			class="btn {billingPeriod === 'monthly'
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-500'}"
			onclick={() => (billingPeriod = 'monthly')}
			disabled={loading}
		>
			Monthly
		</button>
		<button
			class="btn {billingPeriod === 'yearly'
				? 'preset-filled-primary-500'
				: 'preset-outlined-surface-500'}"
			onclick={() => (billingPeriod = 'yearly')}
			disabled={loading}
		>
			Yearly
		</button>
	</div>

	<!-- Pricing Cards -->
	<div class="mx-auto mb-12 grid max-w-6xl gap-8 lg:grid-cols-3">
		<!-- Free Plan -->
		<button
			class="card p-8 text-left transition-all duration-200 hover:scale-[1.02] {selectedPlan ===
			'free'
				? 'shadow-xl ring-2 ring-primary-500'
				: 'hover:shadow-lg'}"
			onclick={() => (selectedPlan = 'free')}
			disabled={loading}
		>
			<div class="mb-6 flex items-start justify-between">
				<div>
					<div class="mb-2 inline-flex items-center gap-2">
						<Users class="text-surface-600-300 h-5 w-5" />
						<h3 class="text-2xl font-bold">{PRICING.FREE.name}</h3>
					</div>
					<p class="text-surface-600-300 text-sm">{PRICING.FREE.description}</p>
				</div>
				{#if selectedPlan === 'free'}
					<div class="badge preset-filled-primary-500">Selected</div>
				{/if}
			</div>

			<div class="mb-8">
				<div class="flex items-baseline gap-2">
					<span class="text-5xl font-bold">${PRICING.FREE.price}</span>
					<span class="text-surface-600-300">/month</span>
				</div>
				<p class="text-surface-600-300 mt-2 text-sm">{PRICING.FREE.tagline}</p>
			</div>

			<ul class="space-y-4">
				{#each PRICING.FREE.features as feature}
					<li class="flex items-start gap-3">
						<Check class="mt-0.5 h-5 w-5 flex-shrink-0 text-success-500" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>
		</button>

		<!-- Pro Plan -->
		<button
			class="relative card bg-gradient-to-br from-primary-500/10 to-secondary-500/10 p-8 text-left transition-all duration-200 hover:scale-[1.02] {selectedPlan ===
			'pro'
				? 'shadow-xl ring-2 ring-primary-500'
				: 'hover:shadow-lg'}"
			onclick={() => (selectedPlan = 'pro')}
			disabled={loading}
		>
			<div class="absolute -top-4 left-1/2 -translate-x-1/2">
				<span
					class="badge preset-filled-primary-500 px-4 py-2 text-sm font-semibold shadow-lg"
				>
					<Sparkles class="mr-1 inline h-4 w-4" />
					{PRICING.PRO.tagline}
				</span>
			</div>

			<div class="mt-2 mb-6 flex items-start justify-between">
				<div>
					<div class="mb-2 inline-flex items-center gap-2">
						<Zap class="h-5 w-5 text-primary-500" />
						<h3 class="text-2xl font-bold">{PRICING.PRO.name}</h3>
					</div>
					<p class="text-surface-600-300 text-sm">{PRICING.PRO.description}</p>
				</div>
				{#if selectedPlan === 'pro'}
					<div class="badge preset-filled-primary-500">Selected</div>
				{/if}
			</div>

			<div class="mb-8">
				<div class="flex items-baseline gap-2">
					<span class="text-5xl font-bold">
						${billingPeriod === 'monthly'
							? PRICING.PRO.pricePerSeatMonthly
							: getMonthlyEquivalent('pro').toFixed(2)}
					</span>
					<span class="text-surface-600-300">/seat/month</span>
				</div>
				{#if billingPeriod === 'yearly'}
					<p class="mt-2 text-sm font-medium text-success-500">
						Billed ${PRICING.PRO.pricePerSeatYearly}/seat/year
					</p>
				{:else}
					<p class="text-surface-600-300 mt-2 text-sm">Billed monthly</p>
				{/if}
			</div>

			<ul class="space-y-4">
				{#each PRICING.PRO.features as feature}
					<li class="flex items-start gap-3">
						<Check class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>
		</button>

		<!-- Enterprise Plan -->
		<button
			class="card p-8 text-left transition-all duration-200 hover:scale-[1.02] {selectedPlan ===
			'enterprise'
				? 'shadow-xl ring-2 ring-primary-500'
				: 'hover:shadow-lg'}"
			onclick={() => (selectedPlan = 'enterprise')}
			disabled={loading}
		>
			<div class="mb-6 flex items-start justify-between">
				<div>
					<div class="mb-2 inline-flex items-center gap-2">
						<Sparkles class="h-5 w-5 text-primary-500" />
						<h3 class="text-2xl font-bold">{PRICING.ENTERPRISE.name}</h3>
					</div>
					<p class="text-surface-600-300 text-sm">{PRICING.ENTERPRISE.description}</p>
				</div>
				{#if selectedPlan === 'enterprise'}
					<div class="badge preset-filled-primary-500">Selected</div>
				{/if}
			</div>

			<div class="mb-8">
				<div class="flex items-baseline gap-2">
					<span class="text-5xl font-bold">{PRICING.ENTERPRISE.priceDisplay}</span>
				</div>
				<p class="text-surface-600-300 mt-2 text-sm">{PRICING.ENTERPRISE.tagline}</p>
			</div>

			<ul class="space-y-4">
				{#each PRICING.ENTERPRISE.features as feature}
					<li class="flex items-start gap-3">
						<Check class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>
		</button>
	</div>

	<!-- Team Details Form -->
	<div class="mx-auto mb-8 max-w-3xl card p-8">
		<div class="mb-6 flex items-center gap-3">
			<Users class="h-6 w-6 text-primary-500" />
			<h2 class="text-2xl font-bold">Team Details</h2>
		</div>

		<div class="space-y-6">
			<label class="label">
				<span class="mb-2 block text-base font-medium">Team Name *</span>
				<input
					type="text"
					class="input text-lg"
					placeholder="Acme QA Team"
					bind:value={teamName}
					disabled={loading}
				/>
			</label>

			<label class="label">
				<span class="mb-2 block text-base font-medium">Description (optional)</span>
				<textarea
					class="textarea"
					rows="3"
					placeholder="Tell us about your team and what you'll be testing..."
					bind:value={teamDescription}
					disabled={loading}
				></textarea>
			</label>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 sm:flex-row">
		<a
			href="/teams"
			class="btn w-full preset-outlined-surface-500 sm:w-auto"
			class:opacity-50={loading}
			class:pointer-events-none={loading}
		>
			Cancel
		</a>

		<button
			onclick={handleCreateTeam}
			class="btn w-full preset-filled-primary-500 px-8 py-4 text-lg sm:w-auto"
			disabled={loading || !teamName.trim()}
		>
			{#if loading}
				<span class="inline-flex items-center gap-2">
					<span class="animate-spin">⏳</span>
					Creating...
				</span>
			{:else if selectedPlan === 'pro'}
				<span class="inline-flex items-center gap-2">
					Continue to Payment
					<span>→</span>
				</span>
			{:else}
				Create Free Team
			{/if}
		</button>
	</div>

	<!-- Info Footer -->
	<div class="mx-auto mt-12 max-w-3xl">
		<div class="bg-surface-50-900/50 border-surface-200-700 card border p-6">
			<div class="flex items-start gap-4">
				<div class="text-2xl">
					{selectedPlan === 'pro' ? '💳' : '🎉'}
				</div>
				<div class="flex-1">
					{#if selectedPlan === 'free'}
						<p class="mb-1 font-medium">Start for free - no credit card required</p>
						<p class="text-surface-600-300 text-sm">
							Upgrade to Pro anytime to unlock team collaboration and AI-powered
							features.
						</p>
					{:else}
						<p class="mb-1 font-medium">Secure payment powered by Stripe</p>
						<p class="text-surface-600-300 text-sm">
							You'll be redirected to Stripe to complete payment. Cancel anytime from
							your team settings.
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Trust Signals -->
		<div class="mt-8 text-center">
			<p class="text-surface-600-300 mb-3 text-sm">Trusted by QA teams worldwide</p>
			<div class="text-surface-500-400 flex items-center justify-center gap-6 text-xs">
				<div class="flex items-center gap-2">
					<Check class="h-4 w-4 text-success-500" />
					<span>14-day money back</span>
				</div>
				<div class="flex items-center gap-2">
					<Check class="h-4 w-4 text-success-500" />
					<span>Cancel anytime</span>
				</div>
				<div class="flex items-center gap-2">
					<Check class="h-4 w-4 text-success-500" />
					<span>No setup fees</span>
				</div>
			</div>
		</div>
	</div>
</div>
