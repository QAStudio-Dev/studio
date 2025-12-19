<script lang="ts">
	import { ChevronRight, ChevronDown, FolderOpen, FolderPlus, GripVertical } from 'lucide-svelte';

	interface Props {
		suite: any;
		expandedSuites: Set<string>;
		toggleSuite: (suiteId: string, forceToggle?: boolean) => void;
		onDragStart?: (e: DragEvent, suite: any) => void;
		onDragEnd?: () => void;
		onDropOnSuite?: (draggedSuiteId: string, targetSuiteId: string) => void;
		draggedSuite?: any | null;
		level?: number;
		allSuites?: any[];
		onAddSubSuite?: (parentId: string) => void;
	}

	let {
		suite,
		expandedSuites,
		toggleSuite,
		onDragStart,
		onDragEnd,
		onDropOnSuite,
		draggedSuite = null,
		level = 0,
		allSuites = [],
		onAddSubSuite
	}: Props = $props();

	let isExpanded = $derived(expandedSuites.has(suite.id));
	let childSuites = $derived(allSuites.filter((s) => s.parentId === suite.id));

	// Calculate indentation based on nesting level using inline style
	let indentStyle = $derived(`padding-left: ${level * 1.5}rem`);

	// State for drag over this suite
	let isDragOver = $state(false);

	// Check if the dragged suite can be dropped here (prevent dropping suite into itself or its children)
	function canDropHere(draggedId: string, targetId: string): boolean {
		if (draggedId === targetId) return false;

		// Check if target is a descendant of dragged suite
		let current = allSuites.find((s) => s.id === targetId);
		while (current?.parentId) {
			if (current.parentId === draggedId) return false;
			current = allSuites.find((s) => s.id === current.parentId);
		}

		return true;
	}

	function handleDragOver(e: DragEvent) {
		if (!draggedSuite || !canDropHere(draggedSuite.id, suite.id)) return;

		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		isDragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.stopPropagation();
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragOver = false;

		if (draggedSuite && canDropHere(draggedSuite.id, suite.id)) {
			onDropOnSuite?.(draggedSuite.id, suite.id);
		}
	}
</script>

<!-- Suite item -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="{draggedSuite?.id === suite.id ? 'opacity-50' : ''} {isDragOver
		? 'rounded-base bg-primary-500/5 ring-2 ring-primary-500 ring-inset'
		: ''}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		draggable="true"
		ondragstart={(e) => onDragStart?.(e, suite)}
		ondragend={onDragEnd}
		class="hover:bg-surface-100-800 flex w-full items-center gap-2 rounded-base px-3 py-2 transition-colors"
		style={indentStyle}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="h-3.5 w-3.5 flex-shrink-0 cursor-grab text-surface-400 hover:text-primary-500 active:cursor-grabbing"
			ondragstart={(e) => {
				// Prevent button click when starting drag from grip
				e.stopPropagation();
			}}
		>
			<GripVertical class="h-3.5 w-3.5" />
		</div>
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<!-- Chevron button - toggles expand/collapse -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<button
				onclick={(e) => {
					e.stopPropagation();
					toggleSuite(suite.id, true);
				}}
				class="hover:bg-surface-100-800 flex items-center rounded p-0.5"
				title={isExpanded ? 'Collapse' : 'Expand'}
			>
				{#if isExpanded}
					<ChevronDown class="h-4 w-4 flex-shrink-0" />
				{:else}
					<ChevronRight class="h-4 w-4 flex-shrink-0" />
				{/if}
			</button>

			<!-- Suite name button - scrolls to suite -->
			<button
				onclick={() => toggleSuite(suite.id, false)}
				class="hover:bg-surface-100-800 py-0.1 flex min-w-0 flex-1 items-center gap-2 rounded px-1 text-left"
				title={suite.name}
			>
				<FolderOpen class="h-4 w-4 flex-shrink-0 text-primary-500" />
				<span class="min-w-0 flex-1 truncate">{suite.name}</span>
				<span
					class="flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium dark:bg-gray-700"
				>
					{suite.testCases?.length || 0}
				</span>
				<!-- {#if childSuites.length > 0}
					<span class="text-surface-600-300 flex-shrink-0 text-xs">
						({childSuites.length}
						{childSuites.length === 1 ? 'suite' : 'suites'})
					</span>
				{/if} -->
			</button>
		</div>
	</div>
</div>

<!-- Recursively render child suites -->
{#if isExpanded && childSuites.length > 0}
	{#each childSuites as childSuite (childSuite.id)}
		<svelte:self
			suite={childSuite}
			{expandedSuites}
			{toggleSuite}
			{onDragStart}
			{onDragEnd}
			{onDropOnSuite}
			{draggedSuite}
			level={level + 1}
			{allSuites}
			{onAddSubSuite}
		/>
	{/each}
{/if}
