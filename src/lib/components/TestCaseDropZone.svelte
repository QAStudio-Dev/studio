<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		ondrop: (event: DragEvent) => void;
		ondragover: (event: DragEvent) => void;
		ondragleave: () => void;
		onCreate?: () => void;
		isOver?: boolean;
		isEmpty?: boolean;
		isDragging?: boolean;
		children?: Snippet;
	}

	let {
		ondrop,
		ondragover,
		ondragleave,
		onCreate,
		isOver = false,
		isEmpty = false,
		isDragging = false,
		children
	}: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	{ondrop}
	{ondragover}
	{ondragleave}
	class="min-h-[60px] rounded-container transition-all {isOver
		? 'border-2 border-dashed border-primary-500 bg-primary-500/10'
		: isDragging
			? 'border-surface-300-600 border-2 border-dashed'
			: ''} {isEmpty ? 'flex items-center justify-center' : ''}"
>
	{#if isEmpty}
		<div class="text-surface-600-300 py-4 text-center">
			<p class="mb-2 text-sm">
				{isOver ? 'Drop test case here' : 'No test cases yet'}
			</p>
			{#if onCreate}
				<button
					onclick={onCreate}
					class="mx-auto flex items-center justify-center gap-2 text-sm text-primary-500 hover:underline"
				>
					<Plus class="h-4 w-4" />
					<span>Add test case</span>
				</button>
			{/if}
		</div>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
