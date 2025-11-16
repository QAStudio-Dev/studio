<script lang="ts">
	import { page } from '$app/stores';
	import { AlertTriangle, Home, RefreshCw } from 'lucide-svelte';

	let { error } = $derived($page);
</script>

<div class="container mx-auto flex min-h-screen items-center justify-center p-8">
	<div class="max-w-2xl card p-8">
		<div class="mb-6 flex items-center gap-3 text-error-500">
			<AlertTriangle class="h-8 w-8" />
			<h1 class="h2">Something Went Wrong</h1>
		</div>

		<p class="text-surface-600-300 mb-6">
			We encountered an error while loading the seat limit resolution page. This could be due
			to a temporary issue.
		</p>

		{#if error}
			<div class="bg-surface-100-800 mb-6 rounded-container p-4">
				<p class="text-surface-600-300 font-mono text-sm">
					{error.message || 'Unknown error occurred'}
				</p>
			</div>
		{/if}

		<div class="border-surface-200-700 border-t pt-6">
			<p class="text-surface-600-300 mb-4 text-sm">What you can try:</p>
			<ul class="text-surface-600-300 mb-6 space-y-2 text-sm">
				<li>• Refresh the page to try again</li>
				<li>• Contact your team administrator</li>
				<li>• If the issue persists, contact support</li>
			</ul>

			<div class="flex gap-3">
				<button onclick={() => window.location.reload()} class="btn preset-filled">
					<RefreshCw class="h-4 w-4" />
					Refresh Page
				</button>
				<a href="/" class="btn preset-outlined">
					<Home class="h-4 w-4" />
					Go Home
				</a>
			</div>
		</div>
	</div>
</div>
