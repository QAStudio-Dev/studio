<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		MessageSquare,
		Send,
		AlertCircle,
		Check,
		RefreshCw,
		ArrowUpRight,
		ArrowDownLeft,
		Clock,
		Settings
	} from 'lucide-svelte';
	import { E164_PHONE_REGEX } from '$lib/validation/twilio';

	type SmsMessage = {
		id: string;
		direction: 'INBOUND' | 'OUTBOUND';
		messageSid: string;
		from: string;
		to: string;
		body: string | null;
		status?: string;
		createdAt: string;
		sentBy?: string;
		errorMessage?: string;
	};

	// State
	let messages = $state<SmsMessage[]>([]);
	let loading = $state(true);
	let loadingMessages = $state(false);
	let twilioEnabled = $state(false);
	let twilioPhoneNumber = $state<string | null>(null);

	// Send SMS form state
	let recipientNumber = $state('');
	let messageBody = $state('');
	let sending = $state(false);
	let sendError = $state<string | null>(null);
	let sendSuccess = $state<string | null>(null);

	// Auto-refresh
	let autoRefresh = $state(false);
	let refreshInterval: NodeJS.Timeout | null = null;

	onMount(() => {
		loadConfig();
		loadMessages();

		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	async function loadConfig() {
		try {
			const res = await fetch('/api/integrations/twilio');
			if (res.ok) {
				const data = await res.json();
				twilioEnabled = data.twilioEnabled;
				twilioPhoneNumber = data.twilioPhoneNumber;
			}
		} catch (err) {
			console.error('Failed to load Twilio config:', err);
		} finally {
			loading = false;
		}
	}

	async function loadMessages() {
		loadingMessages = true;
		try {
			const res = await fetch('/api/integrations/twilio/messages');
			if (res.ok) {
				const data = await res.json();
				messages = data.sort(
					(a: SmsMessage, b: SmsMessage) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			}
		} catch (err) {
			console.error('Failed to load messages:', err);
		} finally {
			loadingMessages = false;
		}
	}

	async function handleSendSms(e: Event) {
		e.preventDefault();
		sendError = null;
		sendSuccess = null;

		// Validation
		if (!recipientNumber || !messageBody) {
			sendError = 'Recipient number and message are required';
			return;
		}

		if (!E164_PHONE_REGEX.test(recipientNumber)) {
			sendError = 'Invalid phone number format. Must be E.164 format (e.g., +15551234567)';
			return;
		}

		if (messageBody.length > 1600) {
			sendError = 'Message body must be 1600 characters or less';
			return;
		}

		sending = true;

		try {
			const res = await fetch('/api/integrations/twilio/sms/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: recipientNumber,
					body: messageBody
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Failed to send SMS');
			}

			sendSuccess = `Message sent successfully! (${data.messageSid})`;
			recipientNumber = '';
			messageBody = '';

			// Reload messages
			await loadMessages();
		} catch (err: any) {
			sendError = err.message;
		} finally {
			sending = false;
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;

		if (autoRefresh) {
			// Refresh every 5 seconds
			refreshInterval = setInterval(() => {
				loadMessages();
			}, 5000);
		} else {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		}
	}

	function formatDate(date: string) {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	function getStatusColor(status?: string) {
		if (!status) return 'text-surface-500';
		switch (status.toLowerCase()) {
			case 'delivered':
			case 'sent':
				return 'text-success-500';
			case 'failed':
			case 'undelivered':
				return 'text-error-500';
			case 'queued':
			case 'sending':
				return 'text-warning-500';
			default:
				return 'text-surface-500';
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex items-start gap-4">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-container bg-primary-500/10"
				>
					<MessageSquare class="h-6 w-6 text-primary-500" />
				</div>
				<div class="flex-1">
					<h1 class="mb-2 text-4xl font-bold">SMS Messages</h1>
					<p class="text-surface-600-300 text-lg">
						Send and receive SMS messages for testing and automation
					</p>
				</div>
			</div>
			<div class="flex gap-3">
				<button
					class="btn preset-outlined-surface-500"
					onclick={toggleAutoRefresh}
					class:preset-filled-primary-500={autoRefresh}
					class:preset-outlined-surface-500={!autoRefresh}
				>
					<RefreshCw class="h-4 w-4 {autoRefresh ? 'animate-spin' : ''}" />
					{autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
				</button>
				<a href="/settings/integrations/twilio" class="btn preset-outlined-surface-500">
					<Settings class="h-4 w-4" />
					Configure Twilio
				</a>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="card p-6 text-center">
			<p class="text-surface-600-300">Loading...</p>
		</div>
	{:else if !twilioEnabled}
		<!-- Not Configured -->
		<div class="card p-8 text-center">
			<AlertCircle class="mx-auto mb-4 h-12 w-12 text-warning-500" />
			<h2 class="mb-2 text-2xl font-bold">Twilio Not Configured</h2>
			<p class="text-surface-600-300 mb-6">
				You need to configure Twilio credentials before you can send or receive SMS
				messages.
			</p>
			<a href="/settings/integrations/twilio" class="btn preset-filled-primary-500">
				Configure Twilio Integration
			</a>
		</div>
	{:else}
		<!-- Main Content: Two Column Layout -->
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Left Column: Send SMS -->
			<div class="card p-6">
				<h2 class="mb-4 text-xl font-bold">Send SMS Message</h2>

				{#if twilioPhoneNumber}
					<div class="mb-4 rounded-container bg-primary-500/10 p-3">
						<p class="text-sm text-primary-600 dark:text-primary-400">
							<strong>From:</strong>
							{twilioPhoneNumber}
						</p>
					</div>
				{/if}

				<!-- Success Message -->
				{#if sendSuccess}
					<div
						class="mb-4 flex items-start gap-3 rounded-container bg-success-500/10 p-4"
					>
						<Check class="mt-0.5 h-5 w-5 text-success-500" />
						<div class="flex-1">
							<div class="text-sm text-success-600 dark:text-success-400">
								{sendSuccess}
							</div>
						</div>
					</div>
				{/if}

				<!-- Error Message -->
				{#if sendError}
					<div class="mb-4 flex items-start gap-3 rounded-container bg-error-500/10 p-4">
						<AlertCircle class="mt-0.5 h-5 w-5 text-error-500" />
						<div class="flex-1">
							<div class="text-sm text-error-600 dark:text-error-400">
								{sendError}
							</div>
						</div>
					</div>
				{/if}

				<form onsubmit={handleSendSms} class="space-y-4">
					<!-- Recipient Number -->
					<div>
						<label for="recipient" class="mb-1 block text-sm font-medium">
							To (Recipient)
							<span class="text-error-500">*</span>
						</label>
						<input
							id="recipient"
							type="tel"
							bind:value={recipientNumber}
							placeholder="+15551234567"
							class="w-full"
							required
							disabled={sending}
						/>
						<p class="text-surface-500-400 mt-1 text-xs">
							Must be in E.164 format (e.g., +15551234567)
						</p>
					</div>

					<!-- Message Body -->
					<div>
						<label for="message" class="mb-1 block text-sm font-medium">
							Message
							<span class="text-error-500">*</span>
						</label>
						<textarea
							id="message"
							bind:value={messageBody}
							placeholder="Enter your message here..."
							rows="5"
							class="w-full"
							maxlength="1600"
							required
							disabled={sending}
						></textarea>
						<div class="text-surface-500-400 mt-1 flex justify-between text-xs">
							<span>Max 1600 characters for SMS</span>
							<span>{messageBody.length} / 1600</span>
						</div>
					</div>

					<!-- Send Button -->
					<button
						type="submit"
						class="btn w-full preset-filled-primary-500"
						disabled={sending}
					>
						{#if sending}
							<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
							Sending...
						{:else}
							<Send class="mr-2 h-4 w-4" />
							Send SMS
						{/if}
					</button>
				</form>
			</div>

			<!-- Right Column: Recent Messages Preview -->
			<div class="card p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-bold">Recent Messages</h2>
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={loadMessages}
						disabled={loadingMessages}
					>
						<RefreshCw class="h-4 w-4 {loadingMessages ? 'animate-spin' : ''}" />
					</button>
				</div>

				{#if loadingMessages && messages.length === 0}
					<div class="text-surface-600-300 py-8 text-center">
						<RefreshCw class="mx-auto mb-2 h-8 w-8 animate-spin" />
						<p>Loading messages...</p>
					</div>
				{:else if messages.length === 0}
					<div class="text-surface-600-300 py-8 text-center">
						<MessageSquare class="mx-auto mb-2 h-8 w-8" />
						<p>No messages yet</p>
						<p class="text-sm">Send your first SMS to get started</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each messages.slice(0, 5) as message}
							<div
								class="bg-surface-50-900 rounded-container border border-surface-200-800 p-3 transition-all hover:border-primary-500/30"
							>
								<div class="mb-2 flex items-start justify-between">
									<div class="flex items-center gap-2">
										{#if message.direction === 'OUTBOUND'}
											<ArrowUpRight class="h-4 w-4 text-primary-500" />
											<span class="text-xs font-medium text-primary-500"
												>Sent</span
											>
										{:else}
											<ArrowDownLeft class="h-4 w-4 text-success-500" />
											<span class="text-xs font-medium text-success-500"
												>Received</span
											>
										{/if}
										{#if message.status}
											<span class="text-xs {getStatusColor(message.status)}">
												({message.status})
											</span>
										{/if}
									</div>
									<div
										class="text-surface-500-400 flex items-center gap-1 text-xs"
									>
										<Clock class="h-3 w-3" />
										{formatDate(message.createdAt)}
									</div>
								</div>

								<div class="mb-1 text-sm">
									<span class="font-medium">
										{message.direction === 'OUTBOUND' ? 'To:' : 'From:'}
									</span>
									<span class="text-surface-600-300">
										{message.direction === 'OUTBOUND'
											? message.to
											: message.from}
									</span>
								</div>

								{#if message.body}
									<p class="text-surface-700-200 line-clamp-2 text-sm">
										{message.body}
									</p>
								{/if}

								{#if message.errorMessage}
									<p class="mt-2 text-xs text-error-500">
										Error: {message.errorMessage}
									</p>
								{/if}
							</div>
						{/each}

						{#if messages.length > 5}
							<p class="text-surface-500-400 pt-2 text-center text-xs">
								Showing {Math.min(5, messages.length)} of {messages.length} messages
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Full Message History -->
		{#if messages.length > 0}
			<div class="mt-6 card p-6">
				<h2 class="mb-4 text-xl font-bold">Message History</h2>

				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="border-b border-surface-200-800">
							<tr class="text-surface-600-300 text-left text-sm">
								<th class="pb-3 font-medium">Direction</th>
								<th class="pb-3 font-medium">From / To</th>
								<th class="pb-3 font-medium">Message</th>
								<th class="pb-3 font-medium">Status</th>
								<th class="pb-3 font-medium">Time</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-surface-200-800">
							{#each messages as message}
								<tr class="group hover:bg-surface-100-900/50">
									<td class="py-3">
										<div class="flex items-center gap-2">
											{#if message.direction === 'OUTBOUND'}
												<ArrowUpRight class="h-4 w-4 text-primary-500" />
												<span class="text-sm text-primary-500">Sent</span>
											{:else}
												<ArrowDownLeft class="h-4 w-4 text-success-500" />
												<span class="text-sm text-success-500"
													>Received</span
												>
											{/if}
										</div>
									</td>
									<td class="py-3">
										<div class="text-sm">
											<div class="font-medium">
												{message.direction === 'OUTBOUND'
													? message.to
													: message.from}
											</div>
											<div class="text-surface-500-400 text-xs">
												{message.direction === 'OUTBOUND'
													? `From: ${message.from}`
													: `To: ${message.to}`}
											</div>
										</div>
									</td>
									<td class="max-w-md py-3">
										{#if message.body}
											<p class="line-clamp-2 text-sm">
												{message.body}
											</p>
										{:else}
											<span class="text-surface-500-400 text-sm italic"
												>No message body</span
											>
										{/if}
										{#if message.errorMessage}
											<p class="mt-1 text-xs text-error-500">
												Error: {message.errorMessage}
											</p>
										{/if}
									</td>
									<td class="py-3">
										{#if message.status}
											<span
												class="inline-block rounded-full px-2 py-1 text-xs font-medium {getStatusColor(
													message.status
												)}"
											>
												{message.status}
											</span>
										{:else}
											<span class="text-surface-500-400 text-sm">-</span>
										{/if}
									</td>
									<td class="py-3">
										<div class="text-surface-600-300 text-sm">
											{formatDate(message.createdAt)}
										</div>
										<div class="text-surface-500-400 text-xs">
											{new Date(message.createdAt).toLocaleTimeString()}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
