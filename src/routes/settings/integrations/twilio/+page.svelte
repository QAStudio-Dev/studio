<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { AlertCircle, ArrowLeft, Check, ExternalLink, Phone } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let accountSid = $state('');
	let authToken = $state('');
	let phoneNumber = $state('');
	let messagingUrl = $state('');
	let saving = $state(false);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let hasExistingConfig = $state(false);

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		loading = true;
		try {
			const res = await fetch('/api/integrations/twilio');
			if (res.ok) {
				const data = await res.json();
				if (data.twilioEnabled) {
					hasExistingConfig = true;
					phoneNumber = data.twilioPhoneNumber || '';
					messagingUrl = data.twilioMessagingUrl || '';
				}
			}
		} catch (err: any) {
			console.error('Failed to load Twilio config:', err);
		} finally {
			loading = false;
		}
	}

	async function handleSave() {
		error = null;
		success = null;

		// Validation
		if (!accountSid || !authToken || !phoneNumber) {
			error = 'Account SID, Auth Token, and Phone Number are required';
			return;
		}

		// Validate phone number format (E.164)
		if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
			error =
				'Invalid phone number format. Must start with + and country code (e.g., +15551234567)';
			return;
		}

		saving = true;

		try {
			const res = await fetch('/api/integrations/twilio', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					accountSid,
					authToken,
					phoneNumber,
					messagingUrl: messagingUrl || undefined
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Failed to configure Twilio');
			}

			// Success!
			success = 'Twilio configuration saved successfully!';
			hasExistingConfig = true;
			// Clear sensitive fields after save
			accountSid = '';
			authToken = '';
			await invalidateAll();
		} catch (err: any) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleRemove() {
		if (!confirm('Are you sure you want to remove Twilio configuration?')) {
			return;
		}

		error = null;
		success = null;
		saving = true;

		try {
			const res = await fetch('/api/integrations/twilio', {
				method: 'DELETE'
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Failed to remove Twilio configuration');
			}

			// Success!
			success = 'Twilio configuration removed successfully';
			hasExistingConfig = false;
			accountSid = '';
			authToken = '';
			phoneNumber = '';
			messagingUrl = '';
			await invalidateAll();
		} catch (err: any) {
			error = err.message;
		} finally {
			saving = false;
		}
	}
</script>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/settings?tab=integrations"
			class="mb-4 inline-flex items-center gap-2 text-primary-500 hover:underline"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Settings
		</a>
		<div class="flex items-start gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-container bg-primary-500/10"
			>
				<Phone class="h-6 w-6 text-primary-500" />
			</div>
			<div class="flex-1">
				<h1 class="mb-2 text-4xl font-bold">Twilio SMS Integration</h1>
				<p class="text-surface-600-300 text-lg">
					Send and receive SMS messages for automated testing and verification workflows
				</p>
			</div>
		</div>
	</div>

	<!-- Plan Badge -->
	<div class="mb-6 rounded-container border border-primary-500/20 bg-primary-500/5 p-4">
		<div class="flex items-center gap-2">
			<span class="rounded-base bg-primary-500 px-2 py-1 text-xs font-semibold text-white">
				PRO / ENTERPRISE
			</span>
			<span class="text-surface-600-300 text-sm">
				This feature requires a Pro or Enterprise plan
			</span>
		</div>
	</div>

	{#if loading}
		<div class="card p-6 text-center">
			<p class="text-surface-600-300">Loading configuration...</p>
		</div>
	{:else}
		<!-- Configuration Form -->
		<div class="mb-6 card p-6">
			<h2 class="mb-4 text-xl font-bold">Twilio Credentials</h2>

			<!-- Success Message -->
			{#if success}
				<div class="mb-4 flex items-start gap-3 rounded-container bg-success-500/10 p-4">
					<Check class="mt-0.5 h-5 w-5 text-success-500" />
					<div class="flex-1">
						<div class="font-semibold text-success-500">Success</div>
						<div class="text-sm text-success-500">{success}</div>
					</div>
				</div>
			{/if}

			<!-- Error Message -->
			{#if error}
				<div class="mb-4 flex items-start gap-3 rounded-container bg-error-500/10 p-4">
					<AlertCircle class="mt-0.5 h-5 w-5 text-error-500" />
					<div class="flex-1">
						<div class="font-semibold text-error-500">Error</div>
						<div class="text-sm text-error-500">{error}</div>
					</div>
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
				class="space-y-4"
			>
				<!-- Account SID -->
				<div>
					<label for="accountSid" class="mb-1 block text-sm font-medium">
						Account SID
						<span class="text-error-500">*</span>
					</label>
					<input
						id="accountSid"
						type="text"
						bind:value={accountSid}
						placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
						class="w-full"
						autocomplete="off"
						required
					/>
					<p class="text-surface-500-400 mt-1 text-xs">
						Find this in your Twilio Console under Account Info
					</p>
				</div>

				<!-- Auth Token -->
				<div>
					<label for="authToken" class="mb-1 block text-sm font-medium">
						Auth Token
						<span class="text-error-500">*</span>
					</label>
					<input
						id="authToken"
						type="password"
						bind:value={authToken}
						placeholder="Enter your Twilio Auth Token"
						class="w-full"
						autocomplete="off"
						required
					/>
					<p class="text-surface-500-400 mt-1 text-xs">
						Your Auth Token will be encrypted before storage
					</p>
				</div>

				<!-- Phone Number -->
				<div>
					<label for="phoneNumber" class="mb-1 block text-sm font-medium">
						Phone Number
						<span class="text-error-500">*</span>
					</label>
					<input
						id="phoneNumber"
						type="tel"
						bind:value={phoneNumber}
						placeholder="+15551234567"
						class="w-full"
						required
					/>
					<p class="text-surface-500-400 mt-1 text-xs">
						Must be in E.164 format (e.g., +15551234567). This is your Twilio phone
						number.
					</p>
				</div>

				<!-- Messaging URL (Optional) -->
				<div>
					<label for="messagingUrl" class="mb-1 block text-sm font-medium">
						Messaging Service SID or Webhook URL
						<span class="text-surface-500-400">(Optional)</span>
					</label>
					<input
						id="messagingUrl"
						type="text"
						bind:value={messagingUrl}
						placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx or https://..."
						class="w-full"
					/>
					<p class="text-surface-500-400 mt-1 text-xs">
						Optional: Use a Messaging Service SID for advanced features
					</p>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button type="submit" class="btn preset-filled-primary-500" disabled={saving}>
						{#if saving}
							Saving...
						{:else}
							{hasExistingConfig ? 'Update Configuration' : 'Save Configuration'}
						{/if}
					</button>

					{#if hasExistingConfig}
						<button
							type="button"
							class="btn preset-outlined-error-500"
							disabled={saving}
							onclick={handleRemove}
						>
							Remove Configuration
						</button>
					{/if}
				</div>
			</form>
		</div>

		<!-- Setup Instructions -->
		<div class="card p-6">
			<h2 class="mb-4 text-xl font-bold">Setup Instructions</h2>

			<div class="space-y-4">
				<div>
					<h3 class="mb-2 font-semibold">1. Get Your Twilio Credentials</h3>
					<p class="text-surface-600-300 mb-2 text-sm">
						Visit your
						<a
							href="https://console.twilio.com/"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-primary-500 hover:underline"
						>
							Twilio Console
							<ExternalLink class="h-3 w-3" />
						</a>
						to find your Account SID and Auth Token.
					</p>
				</div>

				<div>
					<h3 class="mb-2 font-semibold">2. Purchase a Phone Number</h3>
					<p class="text-surface-600-300 text-sm">
						If you don't have one, purchase a phone number from Twilio's Phone Numbers
						section. Make sure it has SMS capabilities enabled.
					</p>
				</div>

				<div>
					<h3 class="mb-2 font-semibold">3. Configure Webhook (Optional)</h3>
					<p class="text-surface-600-300 mb-2 text-sm">
						To receive incoming SMS messages, configure your Twilio phone number's
						webhook URL to:
					</p>
					<code
						class="block rounded-container bg-surface-200-800 px-3 py-2 font-mono text-sm"
					>
						{window.location.origin}/api/integrations/twilio/sms/receive
					</code>
				</div>

				<div>
					<h3 class="mb-2 font-semibold">4. Start Testing</h3>
					<p class="text-surface-600-300 text-sm">
						Use the Twilio SMS API to send test messages and verify your integration is
						working correctly.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
