<script lang="ts">
	interface Props {
		ondragover: (event: DragEvent) => void;
		ondragleave: () => void;
		ondrop: (event: DragEvent) => void;
		isOver?: boolean;
		isDragging?: boolean;
	}

	let { ondragover, ondragleave, ondrop, isOver = false, isDragging = false }: Props = $props();
</script>

<div
	{ondragover}
	{ondragleave}
	{ondrop}
	class="h-2 transition-all {isDragging ? 'opacity-100' : 'opacity-0'} {isOver ? 'h-8 bg-primary-500/20' : ''}"
>
	{#if isOver}
		<div class="h-0.5 bg-primary-500 mx-2"></div>
	{/if}
</div>
