<script lang="ts">
	import { ClerkProvider } from 'svelte-clerk';
	import Header from './Header.svelte';
	import '../app.css';
	import { clearSelectedProject } from '$lib/stores/projectStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	// Clear localStorage on sign out
	onMount(() => {
		if (browser) {
			// Listen for sign out event from Clerk
			window.addEventListener('clerk:signedOut', () => {
				console.log('[Layout] User signed out - clearing all localStorage');
				clearSelectedProject();
			});

			// Also clear on beforeunload if user is not signed in
			// This handles the case where user signs out in another tab
			const handleStorageChange = (e: StorageEvent) => {
				// If Clerk session is cleared, clear our data too
				if (e.key && e.key.includes('clerk') && !e.newValue) {
					console.log('[Layout] Clerk session cleared - clearing project');
					clearSelectedProject();
				}
			};
			window.addEventListener('storage', handleStorageChange);

			return () => {
				window.removeEventListener('clerk:signedOut', () => {});
				window.removeEventListener('storage', handleStorageChange);
			};
		}
	});

	// Track the current user ID to detect user changes (as backup)
	let previousUserId = $state<string | null | undefined>(undefined);

	// Clear selected project when user changes (sign out/switch account)
	$effect(() => {
		if (browser) {
			const currentUserId = data?.userId || null;

			// If we've seen a user before and it changed, clear the selected project
			if (previousUserId !== undefined && previousUserId !== currentUserId) {
				console.log('[Layout] User changed from', previousUserId, 'to', currentUserId, '- clearing project');
				clearSelectedProject();
			}

			previousUserId = currentUserId;
		}
	});
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
