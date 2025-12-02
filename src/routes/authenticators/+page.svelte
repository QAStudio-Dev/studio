<script lang="ts">
	import { Plus, Key, Copy, Trash2, Clock, QrCode, KeyRound } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import { Html5Qrcode } from 'html5-qrcode';
	import { parseOTPAuthURL, isValidBase32Secret } from '$lib/utils/otpauth-parser';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let showAddModal = $state(false);
	let activeTab = $state<'manual' | 'qr'>('manual'); // Tab state
	let totpCodes = $state<Record<string, { code: string; timeRemaining: number }>>({});
	let intervalId: number | null = null;

	// QR Scanner state
	let qrScanner: Html5Qrcode | null = null;
	let scannerStarted = $state(false);
	let scanError = $state<string | null>(null);

	// Form state (shared between manual and QR)
	let formData = $state({
		name: '',
		secret: '',
		issuer: '',
		accountName: '',
		description: '',
		algorithm: 'SHA1',
		digits: 6,
		period: 30
	});

	// Fetch TOTP codes for all tokens
	async function fetchTOTPCodes() {
		for (const token of data.tokens) {
			try {
				const response = await fetch(`/api/authenticator-tokens/${token.id}/code`);
				if (response.ok) {
					const data = await response.json();
					totpCodes[token.id] = {
						code: data.code,
						timeRemaining: data.timeRemaining
					};
				}
			} catch (error) {
				console.error(`Failed to fetch code for token ${token.id}:`, error);
			}
		}
	}

	// Copy code to clipboard
	async function copyCode(code: string, tokenName: string) {
		try {
			await navigator.clipboard.writeText(code);
			// TODO: Show toast notification
			console.log(`Copied ${tokenName} code to clipboard`);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	}

	// Delete token
	async function deleteToken(tokenId: string, tokenName: string) {
		if (!confirm(`Are you sure you want to delete "${tokenName}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/authenticator-tokens/${tokenId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				// Invalidate all data to refresh the list
				await invalidateAll();
			} else {
				const error = await response.json();
				alert(`Failed to delete token: ${error.message}`);
			}
		} catch (error) {
			console.error('Failed to delete token:', error);
			alert('Failed to delete token');
		}
	}

	// Start QR scanner
	async function startQRScanner() {
		try {
			scanError = null;
			qrScanner = new Html5Qrcode('qr-reader');

			await qrScanner.start(
				{ facingMode: 'environment' }, // Use back camera
				{
					fps: 10,
					qrbox: { width: 250, height: 250 }
				},
				onScanSuccess,
				onScanError
			);

			scannerStarted = true;
		} catch (err) {
			scanError = 'Failed to start camera. Please check camera permissions.';
			console.error('QR Scanner error:', err);
		}
	}

	// Stop QR scanner
	async function stopQRScanner() {
		if (qrScanner && scannerStarted) {
			try {
				await qrScanner.stop();
				await qrScanner.clear();
				scannerStarted = false;
			} catch (err) {
				console.error('Failed to stop scanner:', err);
			}
		}
	}

	// Handle successful QR scan
	function onScanSuccess(decodedText: string) {
		try {
			const otpData = parseOTPAuthURL(decodedText);

			// Populate form with scanned data
			formData.secret = otpData.secret;
			formData.issuer = otpData.issuer || '';
			formData.accountName = otpData.label || '';
			formData.name = otpData.issuer ? `${otpData.issuer} - ${otpData.label}` : otpData.label;
			formData.algorithm = otpData.algorithm || 'SHA1';
			formData.digits = otpData.digits || 6;
			formData.period = otpData.period || 30;

			// Switch to manual tab to show the populated form
			activeTab = 'manual';

			// Stop scanner
			stopQRScanner();
		} catch (err) {
			scanError = err instanceof Error ? err.message : 'Failed to parse QR code';
		}
	}

	// Handle QR scan errors (most are ignorable)
	function onScanError(_errorMessage: string) {
		// Ignore - this fires constantly while scanning
	}

	// Close modal and cleanup
	function closeModal() {
		stopQRScanner();
		showAddModal = false;
		activeTab = 'manual';
		scanError = null;
		// Reset form
		formData = {
			name: '',
			secret: '',
			issuer: '',
			accountName: '',
			description: '',
			algorithm: 'SHA1',
			digits: 6,
			period: 30
		};
	}

	// Watch for tab changes to manage scanner
	$effect(() => {
		if (activeTab === 'qr' && showAddModal) {
			startQRScanner();
		} else {
			stopQRScanner();
		}
	});

	onMount(() => {
		// Fetch codes immediately
		fetchTOTPCodes();

		// Update codes every second
		intervalId = window.setInterval(() => {
			// Decrement time remaining
			for (const tokenId in totpCodes) {
				if (totpCodes[tokenId].timeRemaining > 0) {
					totpCodes[tokenId].timeRemaining--;
				} else {
					// Refresh code when it expires
					fetchTOTPCodes();
				}
			}
		}, 1000);
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<svelte:head>
	<title>Authenticators - QA Studio</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Authenticator Tokens</h1>
			<p class="mt-2 text-surface-600 dark:text-surface-400">
				Shared 2FA tokens for your team: {data.teamName}
			</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="btn inline-flex items-center preset-filled-primary-500"
		>
			<Plus class="mr-2 h-4 w-4" />
			Add Token
		</button>
	</div>

	<!-- Empty State -->
	{#if data.tokens.length === 0}
		<div class="card p-12 text-center">
			<Key class="mx-auto mb-4 h-16 w-16 text-surface-400" />
			<h2 class="mb-2 text-xl font-semibold">No authenticator tokens yet</h2>
			<p class="mb-4 text-surface-600 dark:text-surface-400">
				Add your first shared 2FA token to get started
			</p>
			<button
				onclick={() => (showAddModal = true)}
				class="btn inline-flex items-center preset-filled-primary-500"
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Your First Token
			</button>
		</div>
	{:else}
		<!-- Token Grid -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.tokens as token (token.id)}
				<div class="space-y-4 card p-6">
					<!-- Token Header -->
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<h3 class="text-lg font-semibold">{token.name}</h3>
							{#if token.issuer}
								<p class="text-sm text-surface-600 dark:text-surface-400">
									{token.issuer}
								</p>
							{/if}
							{#if token.accountName}
								<p class="text-xs text-surface-500 dark:text-surface-500">
									{token.accountName}
								</p>
							{/if}
						</div>
						<button
							onclick={() => deleteToken(token.id, token.name)}
							class="p-2 text-error-500 hover:text-error-600"
							title="Delete token"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>

					<!-- TOTP Code Display -->
					{#if totpCodes[token.id]}
						<div class="space-y-2 rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
							<div class="flex items-center justify-between">
								<div class="font-mono text-3xl font-bold tracking-wider">
									{totpCodes[token.id].code}
								</div>
								<button
									onclick={() => copyCode(totpCodes[token.id].code, token.name)}
									class="btn preset-tonal"
									title="Copy code"
								>
									<Copy class="h-4 w-4" />
								</button>
							</div>

							<!-- Time Remaining -->
							<div
								class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
							>
								<Clock class="h-4 w-4" />
								<span>Expires in {totpCodes[token.id].timeRemaining}s</span>
								<div
									class="h-1.5 flex-1 rounded-full bg-surface-300 dark:bg-surface-700"
								>
									<div
										class="h-1.5 rounded-full bg-primary-500 transition-all"
										style="width: {(totpCodes[token.id].timeRemaining /
											token.period) *
											100}%"
									></div>
								</div>
							</div>
						</div>
					{:else}
						<div class="rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
							<div class="animate-pulse space-y-2">
								<div class="h-8 rounded bg-surface-300 dark:bg-surface-700"></div>
								<div
									class="h-4 w-2/3 rounded bg-surface-300 dark:bg-surface-700"
								></div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Token Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
	>
		<div
			class="w-full max-w-2xl space-y-4 rounded-container border-2 border-surface-300 bg-white p-6 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
		>
			<h2 class="text-2xl font-bold">Add Authenticator Token</h2>

			<!-- Tab Switcher -->
			<div class="flex gap-2 border-b border-surface-300 dark:border-surface-700">
				<button
					type="button"
					onclick={() => (activeTab = 'qr')}
					class="flex items-center gap-2 border-b-2 px-4 py-2 transition-colors {activeTab ===
					'qr'
						? 'border-primary-500 text-primary-500'
						: 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
				>
					<QrCode class="h-4 w-4" />
					Scan QR Code
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'manual')}
					class="flex items-center gap-2 border-b-2 px-4 py-2 transition-colors {activeTab ===
					'manual'
						? 'border-primary-500 text-primary-500'
						: 'border-transparent text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100'}"
				>
					<KeyRound class="h-4 w-4" />
					Enter Manually
				</button>
			</div>

			<!-- QR Scanner Tab -->
			{#if activeTab === 'qr'}
				<div class="space-y-4">
					<p class="text-sm text-surface-600 dark:text-surface-400">
						Scan the QR code from your authenticator app (Google Authenticator, Authy,
						etc.)
					</p>

					<!-- QR Reader -->
					<div class="relative">
						<div id="qr-reader" class="overflow-hidden rounded-lg"></div>
					</div>

					{#if scanError}
						<div
							class="rounded-base bg-error-500/10 px-4 py-3 text-error-700 dark:text-error-400"
						>
							{scanError}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Manual Entry Tab -->
			{#if activeTab === 'manual'}
				<form
					onsubmit={async (e) => {
						e.preventDefault();

						try {
							const response = await fetch('/api/authenticator-tokens', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									name: formData.name,
									secret: formData.secret,
									issuer: formData.issuer || undefined,
									accountName: formData.accountName || undefined,
									algorithm: formData.algorithm || 'SHA1',
									digits: formData.digits || 6,
									period: formData.period || 30
								})
							});

							if (response.ok) {
								// Invalidate all data to refresh the list
								await invalidateAll();
								closeModal();
							} else {
								const error = await response.json();
								alert(`Failed to create token: ${error.message}`);
							}
						} catch (error) {
							console.error('Failed to create token:', error);
							alert('Failed to create token');
						}
					}}
					class="space-y-4"
				>
					<label class="block">
						<span class="text-sm font-medium">Name *</span>
						<input
							type="text"
							bind:value={formData.name}
							required
							placeholder="e.g., Production Login"
							class="mt-1 input"
						/>
					</label>

					<label class="block">
						<span class="text-sm font-medium">Secret Key *</span>
						<input
							type="text"
							bind:value={formData.secret}
							required
							placeholder="Paste your secret key here"
							class="mt-1 input font-mono"
						/>
					</label>

					<div class="flex justify-end gap-2">
						<button
							type="button"
							onclick={closeModal}
							class="preset-tonal-surface-500 btn"
						>
							Cancel
						</button>
						<button type="submit" class="btn preset-filled-primary-500"
							>Add Token</button
						>
					</div>
				</form>
			{/if}

			<!-- Close button for QR tab -->
			{#if activeTab === 'qr'}
				<div class="flex justify-end">
					<button type="button" onclick={closeModal} class="preset-tonal-surface-500 btn">
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
