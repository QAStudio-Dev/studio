<script lang="ts">
	import { ClerkProvider } from 'svelte-clerk';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import Header from './Header.svelte';
	import Footer from './Footer.svelte';
	import '../app.css';
	import { clearSelectedProject } from '$lib/stores/projectStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { navigating } from '$app/stores';

	let { children, data } = $props();

	// Merge base meta tags with page-specific meta tags
	let metaTags = $derived(deepMerge(data.baseMetaTags || {}, page.data.pageMetaTags || {}));

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
				console.log(
					'[Layout] User changed from',
					previousUserId,
					'to',
					currentUserId,
					'- clearing project'
				);
				clearSelectedProject();
			}

			previousUserId = currentUserId;
		}
	});
</script>

<svelte:head>
	<script>
		// Initialize theme before page renders to prevent flash
		(function () {
			const mode = localStorage.getItem('mode') || 'light';
			document.documentElement.setAttribute('data-mode', mode);
		})();
	</script>
</svelte:head>

<MetaTags {...metaTags} />

<ClerkProvider>
	<div class="flex min-h-screen flex-col">
		<Header />

		<!-- Loading bar -->
		{#if $navigating}
			<div class="fixed top-0 right-0 left-0 z-[100] h-1 bg-primary-500/20">
				<div class="animate-loading-bar h-full bg-primary-500"></div>
			</div>
		{/if}

		<main class="flex-1">
			{@render children()}
		</main>

		<Footer />
	</div>
</ClerkProvider>
