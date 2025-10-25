<script lang="ts">
	import { goto } from '$app/navigation';
	import { Check } from 'lucide-svelte';

	let teamName = $state('');
	let teamDescription = $state('');
	let selectedPlan: 'free' | 'pro' = $state('free');
	let billingPeriod: 'monthly' | 'yearly' = $state('monthly');
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
			description: 'Perfect for individuals getting started',
			features: [
				'1 user (you)',
				'Unlimited projects',
				'Basic test management',
				'Community support'
			]
		},
		pro: {
			name: 'Pro',
			priceMonthly: 15,
			priceYearly: 12,
			description: 'For teams that need collaboration',
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

<div class="container mx-auto max-w-6xl p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Create Your Team</h1>
		<p class="text-surface-600-300">Start collaborating with your team on test management</p>
	</div>

	{#if error}
		<div class="alert preset-filled-error mb-6">
			<p>{error}</p>
		</div>
	{/if}

	<!-- Team Details -->
	<div class="card p-6 mb-8">
		<h2 class="h3 mb-4">Team Details</h2>

		<label class="label mb-4">
			<span class="mb-2 block">Team Name *</span>
			<input
				type="text"
				class="input"
				placeholder="Acme QA Team"
				bind:value={teamName}
				disabled={loading}
			/>
		</label>

		<label class="label">
			<span class="mb-2 block">Description (optional)</span>
			<textarea
				class="textarea"
				rows="3"
				placeholder="What does your team work on?"
				bind:value={teamDescription}
				disabled={loading}
			></textarea>
		</label>
	</div>

	<!-- Pricing Plans -->
	<div class="mb-8">
		<h2 class="h3 mb-4">Choose Your Plan</h2>

		<!-- Billing Period Toggle (for Pro) -->
		{#if selectedPlan === 'pro'}
			<div class="flex items-center justify-center gap-4 mb-6">
				<button
					class="btn {billingPeriod === 'monthly' ? 'preset-filled' : 'preset-outlined'}"
					onclick={() => (billingPeriod = 'monthly')}
					disabled={loading}
				>
					Monthly
				</button>
				<button
					class="btn {billingPeriod === 'yearly' ? 'preset-filled' : 'preset-outlined'}"
					onclick={() => (billingPeriod = 'yearly')}
					disabled={loading}
				>
					Yearly
					<span class="badge preset-filled-success ml-2">Save 20%</span>
				</button>
			</div>
		{/if}

		<div class="grid md:grid-cols-2 gap-6">
			<!-- Free Plan -->
			<button
				class="card p-6 text-left transition-all {selectedPlan === 'free'
					? 'ring-2 ring-primary-500'
					: 'hover:ring-1 hover:ring-surface-300-600'}"
				onclick={() => (selectedPlan = 'free')}
				disabled={loading}
			>
				<div class="flex items-start justify-between mb-4">
					<div>
						<h3 class="h4 mb-1">{plans.free.name}</h3>
						<p class="text-sm text-surface-600-300">{plans.free.description}</p>
					</div>
					{#if selectedPlan === 'free'}
						<div class="badge preset-filled-primary">Selected</div>
					{/if}
				</div>

				<div class="mb-6">
					<span class="text-4xl font-bold">${plans.free.price}</span>
					<span class="text-surface-600-300">/month</span>
				</div>

				<ul class="space-y-3">
					{#each plans.free.features as feature}
						<li class="flex items-start gap-2">
							<Check class="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
							<span class="text-sm">{feature}</span>
						</li>
					{/each}
				</ul>
			</button>

			<!-- Pro Plan -->
			<button
				class="card p-6 text-left transition-all relative {selectedPlan === 'pro'
					? 'ring-2 ring-primary-500'
					: 'hover:ring-1 hover:ring-surface-300-600'}"
				onclick={() => (selectedPlan = 'pro')}
				disabled={loading}
			>
				<div class="absolute -top-3 right-6">
					<span class="badge preset-filled-primary">Popular</span>
				</div>

				<div class="flex items-start justify-between mb-4">
					<div>
						<h3 class="h4 mb-1">{plans.pro.name}</h3>
						<p class="text-sm text-surface-600-300">{plans.pro.description}</p>
					</div>
					{#if selectedPlan === 'pro'}
						<div class="badge preset-filled-primary">Selected</div>
					{/if}
				</div>

				<div class="mb-6">
					<span class="text-4xl font-bold">
						${billingPeriod === 'monthly' ? plans.pro.priceMonthly : plans.pro.priceYearly}
					</span>
					<span class="text-surface-600-300">/user/month</span>
					{#if billingPeriod === 'yearly'}
						<p class="text-sm text-success-500 mt-1">
							Billed ${plans.pro.priceYearly * 12}/user/year
						</p>
					{/if}
				</div>

				<ul class="space-y-3">
					{#each plans.pro.features as feature}
						<li class="flex items-start gap-2">
							<Check class="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
							<span class="text-sm">{feature}</span>
						</li>
					{/each}
				</ul>
			</button>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex items-center justify-between">
		<a href="/teams" class="btn preset-outlined-surface-500" class:opacity-50={loading} class:pointer-events-none={loading}>
			Cancel
		</a>

		<button
			onclick={handleCreateTeam}
			class="btn preset-filled-primary-500"
			disabled={loading || !teamName.trim()}
		>
			{#if loading}
				Creating...
			{:else if selectedPlan === 'pro'}
				Continue to Payment
			{:else}
				Create Free Team
			{/if}
		</button>
	</div>

	<!-- Info -->
	<div class="mt-8 p-4 bg-surface-100-800 rounded-container text-sm">
		<p class="text-surface-600-300">
			{#if selectedPlan === 'free'}
				Start for free - no credit card required. Upgrade to Pro anytime to unlock team
				collaboration and AI features.
			{:else}
				You'll be redirected to Stripe to complete payment. You can cancel anytime from your team
				settings.
			{/if}
		</p>
	</div>
</div>
