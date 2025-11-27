<script lang="ts">
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import Header from './Header.svelte';
	import Footer from './Footer.svelte';
	import '../app.css';
	import { clearSelectedProject } from '$lib/stores/projectStore';
	import { browser } from '$app/environment';
	import { navigating } from '$app/stores';

	let { children, data } = $props();

	// Merge base meta tags with page-specific meta tags
	let metaTags = $derived(deepMerge(data.baseMetaTags || {}, page.data.pageMetaTags || {}));

	// Track the current user ID to detect user changes (sign out/switch account)
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
