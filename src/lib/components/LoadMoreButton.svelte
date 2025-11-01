<script lang="ts">
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		loading?: boolean;
		hasMore?: boolean;
		onLoadMore: () => void;
		class?: string;
	}

	let { loading = false, hasMore = true, onLoadMore, class: className = '' }: Props = $props();
</script>

{#if hasMore}
	<button onclick={onLoadMore} disabled={loading} class="btn w-full preset-tonal {className}">
		{#if loading}
			<Loader2 class="h-4 w-4 animate-spin" />
			<span>Loading...</span>
		{:else}
			<span>Load More</span>
		{/if}
	</button>
{:else if !hasMore}
	<div class="text-surface-600-300 py-2 text-center text-sm">No more items to load</div>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
