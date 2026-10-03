<script lang="ts">
	import { page } from '$app/state';
	import { Bug, Home, ArrowLeft } from '@lucide/svelte';

	let error = $derived(page.error);
	let status = $derived(page.status);
	let isAuthenticated = $derived(!!page.data.userId);

	// Fun error messages based on status code
	const errorMessages: Record<number, { title: string; message: string; emoji: string }> = {
		404: {
			title: 'Page Not Found',
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

	let helpLinks = $derived(
		isAuthenticated
			? [
					{ label: 'Projects', href: '/projects' },
					{ label: 'Dashboard', href: '/dashboard' },
					{ label: 'API Docs', href: '/docs' }
				]
			: [
					{ label: 'Features', href: '/features' },
					{ label: 'Pricing', href: '/pricing' },
					{ label: 'Blog', href: '/blog' },
					{ label: 'Contact', href: '/contact' }
				]
	);
</script>

<svelte:head>
	<title>{status} - {errorInfo.title} | QA Studio</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
	class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 px-4 py-16 dark:from-surface-950 dark:to-surface-900"
>
	<div class="w-full max-w-2xl">
		<!-- Error Card -->
		<div
			class="rounded-container border border-surface-200-800 bg-surface-50-950 p-8 text-center shadow-xl md:p-12"
		>
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
			<p class="mx-auto mb-8 max-w-md text-lg text-surface-600-400">
				{errorInfo.message}
			</p>

			<!-- Technical Details (collapsible) -->
			{#if error?.message && status !== 404}
				<details class="mb-8 rounded-container bg-surface-100-900 p-4 text-left">
					<summary
						class="flex cursor-pointer items-center gap-2 text-sm font-medium text-surface-600-400 transition-colors hover:text-primary-500"
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
				<a
					href={isAuthenticated ? '/dashboard' : '/'}
					class="btn flex items-center gap-2 preset-filled-primary-500"
				>
					<Home class="h-4 w-4" />
					{isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
				</a>
			</div>

			<!-- Fun QA-themed quote -->
			<div class="mt-12 border-t border-surface-200-800 pt-8">
				<p class="text-sm text-surface-600-400 italic">
					"It's not a bug, it's an undocumented feature!"
					<br />
					<span class="text-xs">- Every developer, probably</span>
				</p>
			</div>
		</div>

		<!-- Additional Help Links -->
		<div class="mt-6 text-center">
			<p class="mb-3 text-sm text-surface-600-400">Need help? Check out these resources:</p>
			<div class="flex flex-wrap justify-center gap-4 text-sm">
				{#each helpLinks as link, i (link.href)}
					{#if i > 0}
						<span class="text-surface-400-600" aria-hidden="true">•</span>
					{/if}
					<a href={link.href} class="text-primary-600-400 hover:underline">{link.label}</a
					>
				{/each}
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
