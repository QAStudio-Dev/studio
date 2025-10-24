<script lang="ts">
	import { ClerkProvider } from 'svelte-clerk';
	import Header from './Header.svelte';
	import '../app.css';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>QA Studio - Test Management Platform</title>
	<script>
		// Initialize theme before page renders to prevent flash
		(function () {
			const mode = localStorage.getItem('mode') || 'light';
			document.documentElement.setAttribute('data-mode', mode);
		})();
	</script>
</svelte:head>

<ClerkProvider>
	<div class="flex min-h-screen flex-col">
		<Header />

		<main class="flex-1">
			{@render children()}
		</main>

		<footer class="border-t border-surface-300-700 bg-surface-100-900">
			<div class="container mx-auto px-4 py-6">
				<div class="flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
					<div class="flex items-center gap-2">
						<span class="text-surface-600-400">© 2024 QA Studio</span>
						<span class="text-surface-400-600">•</span>
						<span class="text-surface-600-400">Test Management Platform</span>
					</div>
					<div class="flex items-center gap-6">
						<a href="/docs" class="text-surface-600-400 transition-colors hover:text-primary-500">
							API Documentation
						</a>
						<a
							href="https://github.com"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							GitHub
						</a>
					</div>
				</div>
			</div>
		</footer>
	</div>
</ClerkProvider>
