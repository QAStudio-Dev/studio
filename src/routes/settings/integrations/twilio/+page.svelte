<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { AlertCircle, ArrowLeft, Check, ExternalLink, Phone, HelpCircle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import {
		TWILIO_ACCOUNT_SID_REGEX,
		E164_PHONE_REGEX,
		isValidMessagingUrl
	} from '$lib/validation/twilio';

	let accountSid = $state('');
	let authToken = $state('');
	let phoneNumber = $state('');
	let messagingUrl = $state('');
	let saving = $state(false);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let hasExistingConfig = $state(false);
	let showA2PModal = $state(false);

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

		// Validate Account SID format
		if (!TWILIO_ACCOUNT_SID_REGEX.test(accountSid)) {
			error =
				'Invalid Account SID format. Should start with AC followed by 32 hexadecimal characters.';
			return;
		}

		// Validate phone number format (E.164)
		if (!E164_PHONE_REGEX.test(phoneNumber)) {
			error =
				'Invalid phone number format. Must start with + and country code (e.g., +15551234567)';
			return;
		}

		// Validate messagingUrl if provided
		if (messagingUrl && !isValidMessagingUrl(messagingUrl)) {
			error =
				'Invalid Messaging URL. Must be a Messaging Service SID (starts with MG) or HTTPS webhook URL.';
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
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex items-start gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-container bg-primary-500/10"
				>
					<Phone class="h-6 w-6 text-primary-500" />
				</div>
				<div class="flex-1">
					<h1 class="mb-2 text-4xl font-bold">Twilio SMS Integration</h1>
					<p class="text-surface-600-300 text-lg">
						Send and receive SMS messages for automated testing and verification
						workflows
					</p>
				</div>
			</div>
			{#if hasExistingConfig}
				<a href="/sms" class="btn preset-filled-primary-500"> Open SMS Messages </a>
			{/if}
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
						{$page.url.origin}/api/integrations/twilio/sms/receive
					</code>
				</div>

				<div>
					<div class="mb-2 flex items-center justify-between">
						<h3 class="font-semibold">4. Complete A2P 10DLC Registration (US Only)</h3>
						<button
							onclick={() => (showA2PModal = true)}
							class="preset-tonal-primary-500 btn flex items-center gap-1 btn-sm"
						>
							<HelpCircle class="h-4 w-4" />
							See Form Examples
						</button>
					</div>
					<p class="text-surface-600-300 mb-2 text-sm">
						If you're sending SMS to US numbers, you must register for A2P
						(Application-to-Person) 10DLC to avoid filtering and ensure deliverability.
					</p>

					<div
						class="mb-3 rounded-container border border-warning-500/20 bg-warning-500/10 p-3"
					>
						<p class="text-sm text-warning-600 dark:text-warning-400">
							<strong>Required:</strong> Without A2P registration, your messages to US
							numbers may be blocked or heavily filtered. This typically takes 1-5 business
							days.
						</p>
					</div>

					<div class="space-y-2 text-sm">
						<p class="text-surface-600-300">
							In the Twilio Console, go to <strong
								>Messaging → Regulatory Compliance → Campaigns</strong
							> and create a new campaign. Click "See Form Examples" above for detailed
							guidance on what to fill out.
						</p>

						<div class="rounded-container bg-surface-100-900 p-3">
							<p class="text-surface-600-300 mb-2 text-xs">
								<strong>Need help?</strong> See Twilio's official A2P registration guide:
							</p>
							<a
								href="https://www.twilio.com/docs/sms/a2p-10dlc"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline"
							>
								A2P 10DLC Registration Guide
								<ExternalLink class="h-3 w-3" />
							</a>
						</div>
					</div>
				</div>

				<div>
					<h3 class="mb-2 font-semibold">5. Start Testing</h3>
					<p class="text-surface-600-300 text-sm">
						Once A2P registration is complete (for US numbers), use the Twilio SMS API
						to send test messages and verify your integration is working correctly.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- A2P Campaign Form Examples Modal -->
<Dialog open={showA2PModal} onOpenChange={(e) => (showA2PModal = e.open)}>
	<Dialog.Backdrop class="fixed inset-0 z-40 bg-black/50" />
	<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<Dialog.Content class="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
			<div class="card rounded-container bg-surface-50-950 p-6 shadow-xl">
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-2xl font-bold">A2P Campaign Form Examples</h2>
					<Dialog.CloseTrigger class="btn-icon preset-tonal">
						<span class="text-xl">&times;</span>
					</Dialog.CloseTrigger>
				</div>

				<div class="space-y-6">
					<!-- Info Banner -->
					<div
						class="rounded-container border border-primary-500/20 bg-primary-500/10 p-4"
					>
						<p class="text-sm text-primary-600 dark:text-primary-400">
							<strong>Copy & Paste Ready:</strong> All fields below are ready to copy.
							Simply click inside any text box and copy the example text to paste into
							the Twilio form. Adapt to match your actual business information.
						</p>
					</div>

					<!-- A2P Brand -->
					<div>
						<h3 class="mb-3 text-lg font-bold">A2P Brand Information</h3>
						<div class="space-y-4">
							<div class="rounded-container bg-surface-100-900 p-4">
								<div class="mb-2 font-medium">A2P Brand (Your business name):</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Definitely Not a Test Company LLC"
									onclick={(e) => e.currentTarget.select()}
								/>
								<p class="text-surface-500-400 mt-2 text-xs">
									Click to select, then copy. Replace with your actual business
									name.
								</p>
							</div>
						</div>
					</div>

					<!-- Campaign Use Case -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Available Campaign Use Cases</h3>
						<div class="space-y-3">
							<div class="rounded-container bg-surface-100-900 p-4">
								<div class="mb-2 font-medium">Use Case (select in dropdown):</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Low Volume Mixed"
									onclick={(e) => e.currentTarget.select()}
								/>
								<p class="text-surface-500-400 mt-2 text-xs">
									<strong>Recommended for QA/Testing:</strong> "Low Volume Mixed" is
									the best choice for testing purposes as it covers multiple message
									types and has the fastest approval time.
								</p>
							</div>

							<div class="text-surface-600-300 space-y-2 text-sm">
								<p><strong>Other common use cases:</strong></p>
								<ul class="ml-4 list-disc space-y-1">
									<li>
										<strong>2FA (Two-Factor Authentication):</strong> One-time passwords
										and verification codes
									</li>
									<li>
										<strong>Account Notifications:</strong> Order confirmations,
										shipping updates, account alerts
									</li>
									<li>
										<strong>Customer Care:</strong> Support messages, appointment
										reminders, service updates
									</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Campaign Description -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Campaign Description</h3>
						<div class="rounded-container bg-surface-100-900 p-4">
							<div class="mb-2 font-medium">Campaign description:</div>
							<textarea
								class="input w-full font-mono"
								rows="3"
								readonly
								onclick={(e) => e.currentTarget.select()}
								>This campaign sends one-time passcodes to the end users when they
								try to log into our company's website.</textarea
							>
							<p class="text-surface-500-400 mt-2 text-xs">
								Click to select all text, then copy. Replace "company's website"
								with your actual use case.
							</p>
						</div>
					</div>

					<!-- Sample Messages -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Sample Messages (5 Required)</h3>
						<p class="text-surface-600-300 mb-3 text-sm">
							Click on each message to select and copy. You need to provide 5
							different examples.
						</p>

						<div class="space-y-3">
							<div class="rounded-container bg-surface-100-900 p-3">
								<div class="text-surface-500-400 mb-1 text-xs font-medium">
									Sample Message #1
								</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Your one-time passcode is 123456."
									onclick={(e) => e.currentTarget.select()}
								/>
							</div>

							<div class="rounded-container bg-surface-100-900 p-3">
								<div class="text-surface-500-400 mb-1 text-xs font-medium">
									Sample Message #2
								</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Your verification code is: 654321"
									onclick={(e) => e.currentTarget.select()}
								/>
							</div>

							<div class="rounded-container bg-surface-100-900 p-3">
								<div class="text-surface-500-400 mb-1 text-xs font-medium">
									Sample Message #3
								</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Use code 789012 to verify your account."
									onclick={(e) => e.currentTarget.select()}
								/>
							</div>

							<div class="rounded-container bg-surface-100-900 p-3">
								<div class="text-surface-500-400 mb-1 text-xs font-medium">
									Sample Message #4
								</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Your authentication code is 345678"
									onclick={(e) => e.currentTarget.select()}
								/>
							</div>

							<div class="rounded-container bg-surface-100-900 p-3">
								<div class="text-surface-500-400 mb-1 text-xs font-medium">
									Sample Message #5
								</div>
								<input
									type="text"
									class="input w-full font-mono"
									readonly
									value="Enter 901234 to complete your login."
									onclick={(e) => e.currentTarget.select()}
								/>
							</div>
						</div>
					</div>

					<!-- Message Contents -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Message Contents</h3>
						<div class="rounded-container bg-surface-100-900 p-4">
							<p class="text-surface-600-300 mb-3 text-sm">
								Check all that apply to your messages:
							</p>
							<div class="space-y-2">
								<label class="flex items-center gap-2">
									<input type="checkbox" class="checkbox" disabled />
									<span class="text-sm"
										>Messages will include embedded links.</span
									>
								</label>
								<label class="flex items-center gap-2">
									<input type="checkbox" class="checkbox" disabled />
									<span class="text-sm">Messages will include phone numbers.</span
									>
								</label>
								<label class="flex items-center gap-2">
									<input type="checkbox" class="checkbox" disabled />
									<span class="text-sm"
										>Messages include content related to direct lending or other
										loan arrangement.</span
									>
								</label>
								<label class="flex items-center gap-2">
									<input type="checkbox" class="checkbox" disabled />
									<span class="text-sm">Messages include age-gated content.</span>
								</label>
							</div>
							<p class="text-surface-500-400 mt-3 text-xs">
								<strong>For 2FA/verification codes:</strong> Typically none of these
								boxes need to be checked unless your codes include links or phone numbers.
							</p>
						</div>
					</div>

					<!-- Opt-in Process -->
					<div>
						<h3 class="mb-3 text-lg font-bold">How Do End-Users Consent?</h3>
						<div class="rounded-container bg-surface-100-900 p-4">
							<div class="mb-2 font-medium">
								Example consent flow (40-2048 characters):
							</div>
							<textarea
								class="input w-full font-mono"
								rows="6"
								readonly
								onclick={(e) => e.currentTarget.select()}
								>Users opt-in by visiting our website and entering their phone
								number in the account settings page. When they click "Enable SMS
								Notifications," they see a confirmation message stating: "By
								enabling SMS notifications, you agree to receive one-time
								verification codes and account alerts from our service. Message and
								data rates may apply. Reply STOP to opt-out at any time or HELP for
								assistance." Users must click "I Agree" to complete opt-in.</textarea
							>
							<p class="text-surface-500-400 mt-2 text-xs">
								Click to select and copy. This is a complete, realistic example you
								can adapt to your actual opt-in process.
							</p>
						</div>
					</div>

					<!-- Opt-in Keywords -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Opt-in Keywords</h3>
						<div class="rounded-container bg-surface-100-900 p-4">
							<div class="mb-2 font-medium">
								Opt-in Keywords (max 255 characters):
							</div>
							<input
								type="text"
								class="input w-full font-mono"
								readonly
								value="SUBSCRIBE, START"
								onclick={(e) => e.currentTarget.select()}
							/>
							<p class="text-surface-500-400 mt-2 text-xs">
								Click to select and copy. For 2FA/verification codes, you can leave
								this blank in Twilio's form if users don't text keywords to opt-in.
							</p>
						</div>
					</div>

					<!-- Opt-in Message -->
					<div>
						<h3 class="mb-3 text-lg font-bold">Opt-in Message</h3>
						<div class="rounded-container bg-surface-100-900 p-4">
							<div class="mb-2 font-medium">Opt-in Message (20-320 characters):</div>
							<textarea
								class="input w-full font-mono"
								rows="3"
								readonly
								onclick={(e) => e.currentTarget.select()}
								>Acme Corporation: You are now opted-in. For help, reply HELP. To
								opt-out, reply STOP.</textarea
							>
							<p class="text-surface-500-400 mt-2 text-xs">
								Click to select and copy. Replace "Acme Corporation" with your
								company name. Must include HELP and STOP instructions.
							</p>
						</div>
					</div>

					<!-- Help Resources -->
					<div
						class="rounded-container border border-primary-500/20 bg-primary-500/10 p-4"
					>
						<div class="flex items-start gap-3">
							<HelpCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
							<div>
								<p
									class="mb-2 font-semibold text-primary-600 dark:text-primary-400"
								>
									Need More Help?
								</p>
								<p class="text-surface-600-300 mb-3 text-sm">
									For detailed guidance and screenshots of the actual Twilio A2P
									registration form:
								</p>
								<a
									href="https://www.twilio.com/docs/sms/a2p-10dlc"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
								>
									View Twilio's A2P 10DLC Documentation
									<ExternalLink class="h-3 w-3" />
								</a>
							</div>
						</div>
					</div>
				</div>

				<!-- Close Button -->
				<div class="mt-6 flex justify-end">
					<button
						onclick={() => (showA2PModal = false)}
						class="btn preset-filled-primary-500"
					>
						Got It
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Positioner>
</Dialog>
