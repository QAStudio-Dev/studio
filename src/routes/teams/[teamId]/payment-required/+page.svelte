<script lang="ts">
	import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-svelte';

	let { data } = $props();
	let { team, subscription, isAdmin } = $derived(data);

	let loading = $state(false);
	let error = $state('');

	async function openBillingPortal() {
		loading = true;
		error = '';

		try {
			const res = await fetch('/api/teams/portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					teamId: team.id
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to open billing portal');
			}

			const { url } = await res.json();
			window.location.href = url;
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	function getStatusInfo() {
		const statusInfo: Record<
			string,
			{ title: string; description: string; color: string; action: string }
		> = {
			CANCELED: {
				title: 'Subscription Canceled',
				description:
					'Your subscription has been canceled. Reactivate your subscription to regain access to all features.',
				color: 'error',
				action: 'Reactivate Subscription'
			},
			UNPAID: {
				title: 'Payment Required',
				description:
					'Your subscription is unpaid. Please update your payment method to continue using premium features.',
				color: 'error',
				action: 'Update Payment Method'
			},
			INCOMPLETE: {
				title: 'Setup Incomplete',
				description:
					'Your subscription setup is not complete. Please finish the payment process to activate your subscription.',
				color: 'warning',
				action: 'Complete Setup'
			},
			INCOMPLETE_EXPIRED: {
				title: 'Setup Expired',
				description:
					'Your subscription setup has expired. Please start a new subscription to continue.',
				color: 'error',
				action: 'Start New Subscription'
			}
		};

		return (
			statusInfo[subscription?.status || ''] || {
				title: 'Subscription Issue',
				description: 'There is an issue with your subscription. Please contact support.',
				color: 'warning',
				action: 'Manage Billing'
			}
		);
	}

	let statusInfo = $derived(getStatusInfo());
</script>

<div class="container mx-auto max-w-3xl p-8">
	<!-- Header -->
	<div class="mb-8 text-center">
		<div class="mb-4 inline-flex rounded-full bg-error-500/10 p-4">
			<AlertTriangle class="h-12 w-12 text-error-500" />
		</div>
		<h1 class="mb-2 text-3xl font-bold">{statusInfo.title}</h1>
		<p class="text-surface-600-300 text-lg">{statusInfo.description}</p>
	</div>

	{#if error}
		<div class="alert preset-filled-error mb-6">
			<AlertTriangle class="h-5 w-5" />
			<p>{error}</p>
		</div>
	{/if}

	<!-- Main Card -->
	<div class="card p-8 mb-8">
		<div class="mb-6 flex items-center gap-3">
			<CreditCard class="h-6 w-6" />
			<h2 class="h3">Subscription Status</h2>
		</div>

		<div class="space-y-6">
			<!-- Status Display -->
			<div class="rounded-container bg-surface-100-800 p-6">
				<div class="mb-4 flex items-center justify-between">
					<span class="text-surface-600-300">Current Status</span>
					<span
						class="badge preset-filled-{statusInfo.color === 'error'
							? 'error'
							: statusInfo.color === 'warning'
								? 'warning'
								: 'surface'}"
					>
						{subscription?.status || 'Unknown'}
					</span>
				</div>

				<div class="mb-4 flex items-center justify-between">
					<span class="text-surface-600-300">Team</span>
					<span class="font-medium">{team.name}</span>
				</div>

				{#if subscription?.currentPeriodEnd}
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Period End</span>
						<span class="font-medium">
							{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</span>
					</div>
				{/if}
			</div>

			<!-- What's Affected -->
			<div>
				<h3 class="mb-3 font-semibold">What's Affected</h3>
				<ul class="space-y-2">
					<li class="flex items-start gap-2">
						<span class="text-error-500 mt-1">✗</span>
						<span>Cannot create new projects (limited to 1 project)</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-error-500 mt-1">✗</span>
						<span>Cannot invite new team members</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-error-500 mt-1">✗</span>
						<span>AI-powered failure analysis disabled</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-error-500 mt-1">✗</span>
						<span>Advanced reporting features unavailable</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-error-500 mt-1">✗</span>
						<span>Custom integrations disabled</span>
					</li>
				</ul>
			</div>

			<!-- What Still Works -->
			<div>
				<h3 class="mb-3 font-semibold">What Still Works</h3>
				<ul class="space-y-2">
					<li class="flex items-start gap-2">
						<span class="text-success-500 mt-1">✓</span>
						<span>View existing projects and test data</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-success-500 mt-1">✓</span>
						<span>Export test results</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="text-success-500 mt-1">✓</span>
						<span>Access basic reporting</span>
					</li>
				</ul>
			</div>

			<!-- Action Button -->
			{#if isAdmin}
				<button
					onclick={openBillingPortal}
					class="btn w-full preset-filled-{statusInfo.color === 'error' ? 'error' : 'primary'}"
					disabled={loading}
				>
					{loading ? 'Loading...' : statusInfo.action}
				</button>
			{:else}
				<div class="rounded-container bg-warning-500/10 p-4 border border-warning-500/20">
					<p class="text-sm text-center">
						Only team admins and managers can manage billing. Please contact your team admin to
						resolve this issue.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Help Section -->
	<div class="card p-6">
		<h3 class="mb-4 font-semibold">Need Help?</h3>
		<div class="space-y-3 text-sm text-surface-600-300">
			<p>
				If you're experiencing issues with your payment or subscription, our support team is here
				to help.
			</p>
			<div class="flex gap-4">
				<a href="mailto:support@qa-studio.com" class="text-primary-500 hover:underline">
					Contact Support
				</a>
				<a href="/docs/billing" class="text-primary-500 hover:underline"> View Billing Docs </a>
			</div>
		</div>
	</div>
</div>
