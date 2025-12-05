<script lang="ts">
	import { goto } from '$app/navigation';
	import { Building2, Mail, Phone, Users, Check } from 'lucide-svelte';
	import { PRICING } from '$lib/constants/pricing';

	let { data } = $props();

	let companyName = $state('');
	let contactName = $state('');
	let email = $state('');
	let phone = $state('');
	let estimatedSeats = $state<number | undefined>(undefined);
	let requirements = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	const REDIRECT_DELAY_MS = 3000;

	async function handleSubmit() {
		if (!companyName.trim() || !email.trim()) {
			error = 'Please fill in required fields';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/enterprise-inquiries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					companyName: companyName.trim(),
					contactName: contactName.trim() || null,
					email: email.trim(),
					phone: phone.trim() || null,
					estimatedSeats,
					requirements: requirements.trim() || null,
					csrfToken: data.csrfToken
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to submit inquiry');
			}

			success = true;

			// Redirect to home page after delay
			setTimeout(() => {
				goto('/');
			}, REDIRECT_DELAY_MS);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: 'An unexpected error occurred. Please try again.';
			console.error('Enterprise inquiry submission error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
	{#if success}
		<!-- Success State -->
		<div class="mx-auto max-w-2xl text-center">
			<div class="mb-6 flex justify-center">
				<div class="flex h-20 w-20 items-center justify-center rounded-full bg-success-500">
					<Check class="h-10 w-10 text-white" />
				</div>
			</div>
			<h1 class="mb-4 text-4xl font-bold">Thank You!</h1>
			<p class="text-surface-600-300 mb-8 text-lg">
				We've received your inquiry and our team will contact you within 1 business day.
			</p>
			<a href="/" class="btn preset-filled-primary-500"> Return to Home </a>
		</div>
	{:else}
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1
				class="mb-4 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl"
			>
				Enterprise Solutions
			</h1>
			<p class="text-surface-600-300 mx-auto max-w-2xl text-lg">
				Get a custom quote tailored to your organization's needs
			</p>
		</div>

		<div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
			<!-- Left Column - Enterprise Features -->
			<div>
				<div class="mb-8 card p-8">
					<h2 class="mb-6 text-2xl font-bold">What's Included</h2>
					<ul class="space-y-4">
						{#each PRICING.ENTERPRISE.features as feature}
							<li class="flex items-start gap-3">
								<Check class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="bg-surface-50-900 card p-6">
					<h3 class="mb-4 text-lg font-semibold">Why Enterprise?</h3>
					<div class="text-surface-600-300 space-y-3 text-sm">
						<p>
							<strong>Custom Pricing:</strong> Pay only for what you need with flexible
							contract terms
						</p>
						<p>
							<strong>Dedicated Support:</strong> Direct access to our engineering team
							and account manager
						</p>
						<p>
							<strong>Security & Compliance:</strong> SSO, SAML, audit logs, and SOC 2
							compliance
						</p>
						<p>
							<strong>On-Premise Options:</strong> Deploy QA Studio in your own infrastructure
						</p>
					</div>
				</div>
			</div>

			<!-- Right Column - Contact Form -->
			<div>
				<div class="card p-8">
					<h2 class="mb-6 text-2xl font-bold">Request a Quote</h2>

					{#if error}
						<div
							role="alert"
							class="mb-6 flex gap-3 rounded-xl border border-error-200 bg-gradient-to-r from-error-50 to-error-100/50 px-4 py-3.5 dark:border-error-900/50 dark:from-error-950/50 dark:to-error-900/30"
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

					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
						class="space-y-6"
					>
						<!-- Company Name -->
						<label class="label">
							<span class="mb-2 block font-medium">Company Name *</span>
							<div class="relative">
								<Building2
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-surface-400"
								/>
								<input
									type="text"
									class="input pl-10"
									placeholder="Acme Corporation"
									bind:value={companyName}
									required
									disabled={loading}
								/>
							</div>
						</label>

						<!-- Contact Name -->
						<label class="label">
							<span class="mb-2 block font-medium">Your Name</span>
							<input
								type="text"
								class="input"
								placeholder="John Doe"
								bind:value={contactName}
								disabled={loading}
							/>
						</label>

						<!-- Email -->
						<label class="label">
							<span class="mb-2 block font-medium">Work Email *</span>
							<div class="relative">
								<Mail
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-surface-400"
								/>
								<input
									type="email"
									class="input pl-10"
									placeholder="john@acme.com"
									bind:value={email}
									required
									disabled={loading}
								/>
							</div>
						</label>

						<!-- Phone -->
						<label class="label">
							<span class="mb-2 block font-medium">Phone Number</span>
							<div class="relative">
								<Phone
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-surface-400"
								/>
								<input
									type="tel"
									class="input pl-10"
									placeholder="+1 (555) 123-4567"
									bind:value={phone}
									disabled={loading}
								/>
							</div>
						</label>

						<!-- Estimated Seats -->
						<label class="label">
							<span class="mb-2 block font-medium">Estimated Team Size</span>
							<div class="relative">
								<Users
									class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-surface-400"
								/>
								<input
									type="number"
									class="input pl-10"
									placeholder="50"
									bind:value={estimatedSeats}
									min="1"
									disabled={loading}
								/>
							</div>
							<p class="text-surface-600-300 mt-2 text-sm">
								How many team members will use QA Studio?
							</p>
						</label>

						<!-- Requirements -->
						<label class="label">
							<span class="mb-2 block font-medium">Additional Requirements</span>
							<textarea
								class="textarea"
								rows="4"
								placeholder="Tell us about your needs: SSO provider, compliance requirements, custom features, etc."
								bind:value={requirements}
								disabled={loading}
							></textarea>
						</label>

						<!-- Submit Button -->
						<button
							type="submit"
							class="btn w-full preset-filled-primary-500 py-3 text-lg"
							disabled={loading || !companyName.trim() || !email.trim()}
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
								Submitting...
							{:else}
								Request Quote
							{/if}
						</button>

						<p class="text-surface-600-300 text-center text-sm">
							We'll respond within 1 business day
						</p>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>
