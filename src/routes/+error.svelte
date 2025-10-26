<script lang="ts">
	import { page } from '$app/state';
	import { Bug, Home, ArrowLeft, AlertTriangle, Frown, ServerCrash } from 'lucide-svelte';

	let error = $derived(page.error);
	let status = $derived(page.status);

	// Fun error messages based on status code
	const errorMessages: Record<number, { title: string; message: string; emoji: string }> = {
		404: {
			title: 'Test Case Not Found',
			message: "Looks like this page failed its test! It's missing in action.",
			emoji: '🔍'
		},
		403: {
			title: 'Access Denied',
			message: 'This test case requires higher permissions. Did you forget to login?',
			emoji: '🔒'
		},
		500: {
			title: 'Server Bug Detected',
			message: 'Our servers encountered a critical bug. The QA team has been notified!',
			emoji: '🐛'
		},
		503: {
			title: 'Service Unavailable',
			message: 'The test environment is currently down for maintenance.',
			emoji: '🔧'
		}
	};

	const defaultError = {
		title: 'Something Went Wrong',
		message: 'An unexpected error occurred. Time to file a bug report!',
		emoji: '⚠️'
	};

	let errorInfo = $derived(errorMessages[status] || defaultError);
</script>

<svelte:head>
	<title>{status} - {errorInfo.title} | QA Studio</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 p-4 dark:from-surface-950 dark:to-surface-900"
>
	<div class="w-full max-w-2xl">
		<!-- Error Card -->
		<div class="card p-8 text-center md:p-12">
			<!-- Status Code with Animation -->
			<div class="mb-8">
				<div class="relative inline-block">
					<span
						class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform text-9xl font-bold text-primary-500 opacity-20 blur-sm"
					>
						{status}
					</span>
					<span
						class="relative bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-9xl font-bold text-transparent"
					>
						{status}
					</span>
				</div>
			</div>

			<!-- Emoji Icon -->
			<div class="mb-6 animate-bounce text-6xl">
				{errorInfo.emoji}
			</div>

			<!-- Error Title -->
			<h1 class="mb-4 text-3xl font-bold md:text-4xl">
				{errorInfo.title}
			</h1>

			<!-- Error Message -->
			<p class="text-surface-600-300 mx-auto mb-8 max-w-md text-lg">
				{errorInfo.message}
			</p>

			<!-- Technical Details (collapsible) -->
			{#if error?.message}
				<details class="bg-surface-100-800 mb-8 rounded-container p-4 text-left">
					<summary
						class="text-surface-600-300 flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors hover:text-primary-500"
					>
						<Bug class="h-4 w-4" />
						Technical Details
					</summary>
					<div class="mt-3 font-mono text-xs break-all text-error-500">
						{error.message}
					</div>
				</details>
			{/if}

			<!-- Action Buttons -->
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<button
					onclick={() => window.history.back()}
					class="btn flex items-center gap-2 preset-outlined-surface-500"
				>
					<ArrowLeft class="h-4 w-4" />
					Go Back
				</button>
				<a href="/dashboard" class="btn flex items-center gap-2 preset-filled-primary-500">
					<Home class="h-4 w-4" />
					Back to Dashboard
				</a>
			</div>

			<!-- Fun QA-themed quote -->
			<div class="border-surface-200-700 mt-12 border-t pt-8">
				<p class="text-surface-600-300 text-sm italic">
					"It's not a bug, it's an undocumented feature!"
					<br />
					<span class="text-xs">- Every developer, probably</span>
				</p>
			</div>
		</div>

		<!-- Additional Help Links -->
		<div class="mt-6 text-center">
			<p class="text-surface-600-300 mb-3 text-sm">Need help? Check out these resources:</p>
			<div class="flex flex-wrap justify-center gap-4 text-sm">
				<a href="/projects" class="text-primary-500 hover:underline"> View Projects </a>
				<span class="text-surface-400">•</span>
				<a href="/dashboard" class="text-primary-500 hover:underline"> Dashboard </a>
				<span class="text-surface-400">•</span>
				<a href="/" class="text-primary-500 hover:underline"> Home </a>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-20px);
		}
	}

	.animate-bounce {
		animation: bounce 2s infinite;
	}
</style>
