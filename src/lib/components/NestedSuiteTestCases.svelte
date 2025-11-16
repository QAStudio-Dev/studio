<script lang="ts">
	import { FolderOpen, Plus } from 'lucide-svelte';
	import DraggableTestCase from './DraggableTestCase.svelte';
	import TestCaseDropZone from './TestCaseDropZone.svelte';
	import TestCaseInsertionZone from './TestCaseInsertionZone.svelte';

	interface Props {
		suite: any;
		projectId: string;
		expandedSuites: Set<string>;
		allSuites: any[];
		creatingTestCase: string | null;
		newTestCaseTitle: string;
		newTestCaseDescription: string;
		loading: boolean;
		draggedTestCase: any | null;
		dragOverSuite: string | null;
		dragOverPosition: { suiteId: string | null; index: number } | null;
		onCreateTestCase: (suiteId: string | null, keepOpen?: boolean) => void;
		onStartCreatingTestCase: (suiteId: string) => void;
		onUpdateNewTestCaseTitle?: (value: string) => void;
		onDragStart: (e: DragEvent, testCase: any) => void;
		onDragEnd: () => void;
		onDrop: (e: DragEvent, suiteId: string, testCases: any[]) => void;
		onDragOver: (e: DragEvent, suiteId: string) => void;
		onDragLeave: () => void;
		onInsertionDragOver: (e: DragEvent, suiteId: string, index: number) => void;
		onInsertionDragLeave: () => void;
		onInsertionDrop: (e: DragEvent, suiteId: string, index: number) => void;
		onOpenModal: (testCase: any) => void;
		level?: number;
	}

	let {
		suite,
		projectId,
		expandedSuites,
		allSuites,
		creatingTestCase,
		newTestCaseTitle,
		newTestCaseDescription,
		loading,
		draggedTestCase,
		dragOverSuite,
		dragOverPosition,
		onCreateTestCase,
		onStartCreatingTestCase,
		onUpdateNewTestCaseTitle,
		onDragStart,
		onDragEnd,
		onDrop,
		onDragOver,
		onDragLeave,
		onInsertionDragOver,
		onInsertionDragLeave,
		onInsertionDrop,
		onOpenModal,
		level = 0
	}: Props = $props();

	let isExpanded = $derived(expandedSuites.has(suite.id));
	let childSuites = $derived(allSuites.filter((s) => s.parentId === suite.id));
	let indentStyle = $derived(`margin-left: ${level * 2}rem`);
</script>

{#if isExpanded}
	<div class="mb-8" style={indentStyle}>
		<h3 class="mb-4 flex items-center gap-2 text-lg font-bold">
			<FolderOpen class="h-5 w-5 text-primary-500" />
			{suite.name}
		</h3>

		{#if creatingTestCase === suite.id}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					onCreateTestCase(suite.id);
				}}
				class="bg-surface-50-900 mb-3 rounded-container border border-primary-500 p-3"
			>
				<div class="flex gap-2">
					<input
						type="text"
						class="input-sm input flex-1"
						placeholder="Test case title (press Enter to create)"
						value={newTestCaseTitle}
						oninput={(e) => onUpdateNewTestCaseTitle?.(e.currentTarget.value)}
						disabled={loading}
						autofocus
					/>
					<button
						type="submit"
						class="btn preset-filled-success-500 btn-sm"
						disabled={loading || !newTestCaseTitle.trim()}
					>
						Add
					</button>
				</div>
			</form>
		{/if}

		<TestCaseDropZone
			ondrop={(e) => onDrop(e, suite.id, suite.testCases || [])}
			ondragover={(e) => onDragOver(e, suite.id)}
			ondragleave={onDragLeave}
			onCreate={() => onStartCreatingTestCase(suite.id)}
			isOver={dragOverSuite === suite.id && !!draggedTestCase}
			isEmpty={!suite.testCases?.length && creatingTestCase !== suite.id}
			isDragging={!!draggedTestCase}
		>
			<div>
				{#each suite.testCases || [] as testCase, index}
					<TestCaseInsertionZone
						ondragover={(e) => onInsertionDragOver(e, suite.id, index)}
						ondragleave={onInsertionDragLeave}
						ondrop={(e) => onInsertionDrop(e, suite.id, index)}
						isOver={dragOverPosition?.suiteId === suite.id &&
							dragOverPosition?.index === index}
						isDragging={!!draggedTestCase && draggedTestCase.id !== testCase.id}
					/>
					<DraggableTestCase
						{testCase}
						{projectId}
						{onDragStart}
						{onDragEnd}
						{onOpenModal}
						isDragging={draggedTestCase?.id === testCase.id}
					/>
				{/each}
				<TestCaseInsertionZone
					ondragover={(e) =>
						onInsertionDragOver(e, suite.id, suite.testCases?.length || 0)}
					ondragleave={onInsertionDragLeave}
					ondrop={(e) => onInsertionDrop(e, suite.id, suite.testCases?.length || 0)}
					isOver={dragOverPosition?.suiteId === suite.id &&
						dragOverPosition?.index === (suite.testCases?.length || 0)}
					isDragging={!!draggedTestCase}
				/>

				{#if suite.testCases?.length && creatingTestCase !== suite.id}
					<button
						onclick={() => onStartCreatingTestCase(suite.id)}
						class="hover:bg-surface-100-800 text-surface-600-300 mt-1 flex w-full items-center justify-center gap-2 rounded-base p-2 text-sm transition-colors hover:text-primary-500"
					>
						<Plus class="h-4 w-4" />
						<span>Add test case</span>
					</button>
				{/if}
			</div>
		</TestCaseDropZone>
	</div>

	<!-- Recursively render child suites -->
	{#each childSuites as childSuite (childSuite.id)}
		<svelte:self
			suite={childSuite}
			{projectId}
			{expandedSuites}
			{allSuites}
			{creatingTestCase}
			{newTestCaseTitle}
			{newTestCaseDescription}
			{loading}
			{draggedTestCase}
			{dragOverSuite}
			{dragOverPosition}
			{onCreateTestCase}
			{onStartCreatingTestCase}
			{onUpdateNewTestCaseTitle}
			{onDragStart}
			{onDragEnd}
			{onDrop}
			{onDragOver}
			{onDragLeave}
			{onInsertionDragOver}
			{onInsertionDragLeave}
			{onInsertionDrop}
			{onOpenModal}
			level={level + 1}
		/>
	{/each}
{/if}
