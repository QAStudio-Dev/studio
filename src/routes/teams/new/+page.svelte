<script lang="ts">
	import { goto } from '$app/navigation';
	import { Check, Sparkles, Users, Zap } from 'lucide-svelte';

	let teamName = $state('');
	let teamDescription = $state('');
	let selectedPlan: 'free' | 'pro' = $state('pro');
	let billingPeriod: 'monthly' | 'yearly' = $state('yearly');
	let loading = $state(false);
	let error = $state('');

	// These should match your Stripe Price IDs from .env
	const PRICE_IDS = {
		pro_monthly: import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || 'price_test_monthly',
		pro_yearly: import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY || 'price_test_yearly'
	};

	const plans = {
		free: {
			name: 'Free',
			price: 0,
			description: 'Perfect for individuals',
			tagline: 'Get started for free',
			features: [
				'1 user (you)',
				'Unlimited projects',
				'Basic test management',
				'Community support'
			]
		},
		pro: {
			name: 'Pro',
			priceMonthly: 10,
			priceYearly: 8.33, // $100/year = $8.33/month
			yearlyTotal: 100,
			description: 'For teams that ship fast',
			tagline: 'Most popular',
			features: [
				'Up to 10 team members',
				'Unlimited projects',
				'Advanced test management',
				'AI-powered failure analysis',
				'Priority support',
				'Custom integrations'
			]
		}
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

			// If Pro plan selected, redirect to Stripe Checkout
			if (selectedPlan === 'pro') {
				const priceId =
					billingPeriod === 'monthly' ? PRICE_IDS.pro_monthly : PRICE_IDS.pro_yearly;

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
	<div class="text-center mb-12">
		<h1 class="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
			Create Your Team
		</h1>
		<p class="text-lg text-surface-600-300 max-w-2xl mx-auto">
			Start collaborating with your team on test management. Choose the plan that fits your needs.
		</p>
	</div>

	{#if error}
		<div class="alert preset-filled-error mb-8 max-w-3xl mx-auto">
			<p>{error}</p>
		</div>
	{/if}

	<!-- Billing Period Toggle -->
	<div class="flex items-center justify-center gap-3 mb-12">
		<button
			class="btn {billingPeriod === 'monthly' ? 'preset-filled-primary-500' : 'preset-outlined-surface-500'}"
			onclick={() => (billingPeriod = 'monthly')}
			disabled={loading}
		>
			Monthly
		</button>
		<button
			class="btn {billingPeriod === 'yearly' ? 'preset-filled-primary-500' : 'preset-outlined-surface-500'}"
			onclick={() => (billingPeriod = 'yearly')}
			disabled={loading}
		>
			Yearly
			<span class="badge preset-filled-success-500 ml-2 text-xs">Save 17%</span>
		</button>
	</div>

	<!-- Pricing Cards -->
	<div class="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
		<!-- Free Plan -->
		<button
			class="card p-8 text-left transition-all duration-200 hover:scale-[1.02] {selectedPlan === 'free'
				? 'ring-2 ring-primary-500 shadow-xl'
				: 'hover:shadow-lg'}"
			onclick={() => (selectedPlan = 'free')}
			disabled={loading}
		>
			<div class="flex items-start justify-between mb-6">
				<div>
					<div class="inline-flex items-center gap-2 mb-2">
						<Users class="w-5 h-5 text-surface-600-300" />
						<h3 class="text-2xl font-bold">{plans.free.name}</h3>
					</div>
					<p class="text-sm text-surface-600-300">{plans.free.description}</p>
				</div>
				{#if selectedPlan === 'free'}
					<div class="badge preset-filled-primary-500">Selected</div>
				{/if}
			</div>

			<div class="mb-8">
				<div class="flex items-baseline gap-2">
					<span class="text-5xl font-bold">${plans.free.price}</span>
					<span class="text-surface-600-300">/month</span>
				</div>
				<p class="text-sm text-surface-600-300 mt-2">{plans.free.tagline}</p>
			</div>

			<ul class="space-y-4">
				{#each plans.free.features as feature}
					<li class="flex items-start gap-3">
						<Check class="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>
		</button>

		<!-- Pro Plan -->
		<button
			class="card p-8 text-left transition-all duration-200 hover:scale-[1.02] relative bg-gradient-to-br from-primary-500/10 to-secondary-500/10 {selectedPlan === 'pro'
				? 'ring-2 ring-primary-500 shadow-xl'
				: 'hover:shadow-lg'}"
			onclick={() => (selectedPlan = 'pro')}
			disabled={loading}
		>
			<div class="absolute -top-4 left-1/2 -translate-x-1/2">
				<span class="badge preset-filled-primary-500 px-4 py-2 text-sm font-semibold shadow-lg">
					<Sparkles class="w-4 h-4 inline mr-1" />
					{plans.pro.tagline}
				</span>
			</div>

			<div class="flex items-start justify-between mb-6 mt-2">
				<div>
					<div class="inline-flex items-center gap-2 mb-2">
						<Zap class="w-5 h-5 text-primary-500" />
						<h3 class="text-2xl font-bold">{plans.pro.name}</h3>
					</div>
					<p class="text-sm text-surface-600-300">{plans.pro.description}</p>
				</div>
				{#if selectedPlan === 'pro'}
					<div class="badge preset-filled-primary-500">Selected</div>
				{/if}
			</div>

			<div class="mb-8">
				<div class="flex items-baseline gap-2">
					<span class="text-5xl font-bold">
						${billingPeriod === 'monthly' ? plans.pro.priceMonthly : plans.pro.priceYearly}
					</span>
					<span class="text-surface-600-300">/user/month</span>
				</div>
				{#if billingPeriod === 'yearly'}
					<p class="text-sm text-success-500 mt-2 font-medium">
						Billed ${plans.pro.yearlyTotal}/user/year · Save $20/year
					</p>
				{:else}
					<p class="text-sm text-surface-600-300 mt-2">Billed monthly</p>
				{/if}
			</div>

			<ul class="space-y-4">
				{#each plans.pro.features as feature}
					<li class="flex items-start gap-3">
						<Check class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>
		</button>
	</div>

	<!-- Team Details Form -->
	<div class="card p-8 max-w-3xl mx-auto mb-8">
		<div class="flex items-center gap-3 mb-6">
			<Users class="w-6 h-6 text-primary-500" />
			<h2 class="text-2xl font-bold">Team Details</h2>
		</div>

		<div class="space-y-6">
			<label class="label">
				<span class="text-base font-medium mb-2 block">Team Name *</span>
				<input
					type="text"
					class="input text-lg"
					placeholder="Acme QA Team"
					bind:value={teamName}
					disabled={loading}
				/>
			</label>

			<label class="label">
				<span class="text-base font-medium mb-2 block">Description (optional)</span>
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
	<div class="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
		<a
			href="/teams"
			class="btn preset-outlined-surface-500 w-full sm:w-auto"
			class:opacity-50={loading}
			class:pointer-events-none={loading}
		>
			Cancel
		</a>

		<button
			onclick={handleCreateTeam}
			class="btn preset-filled-primary-500 w-full sm:w-auto text-lg px-8 py-4"
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
	<div class="mt-12 max-w-3xl mx-auto">
		<div class="card p-6 bg-surface-50-900/50 border border-surface-200-700">
			<div class="flex items-start gap-4">
				<div class="text-2xl">
					{selectedPlan === 'pro' ? '💳' : '🎉'}
				</div>
				<div class="flex-1">
					{#if selectedPlan === 'free'}
						<p class="font-medium mb-1">Start for free - no credit card required</p>
						<p class="text-sm text-surface-600-300">
							Upgrade to Pro anytime to unlock team collaboration and AI-powered features.
						</p>
					{:else}
						<p class="font-medium mb-1">Secure payment powered by Stripe</p>
						<p class="text-sm text-surface-600-300">
							You'll be redirected to Stripe to complete payment. Cancel anytime from your team settings.
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Trust Signals -->
		<div class="mt-8 text-center">
			<p class="text-sm text-surface-600-300 mb-3">Trusted by QA teams worldwide</p>
			<div class="flex items-center justify-center gap-6 text-xs text-surface-500-400">
				<div class="flex items-center gap-2">
					<Check class="w-4 h-4 text-success-500" />
					<span>14-day money back</span>
				</div>
				<div class="flex items-center gap-2">
					<Check class="w-4 h-4 text-success-500" />
					<span>Cancel anytime</span>
				</div>
				<div class="flex items-center gap-2">
					<Check class="w-4 h-4 text-success-500" />
					<span>No setup fees</span>
				</div>
			</div>
		</div>
	</div>
</div>
