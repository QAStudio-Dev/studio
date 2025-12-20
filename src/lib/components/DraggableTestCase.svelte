<script lang="ts">
	import { GripVertical, TestTube2, ExternalLink } from 'lucide-svelte';
	import type { Priority } from '$prisma/client';

	interface TestCase {
		id: string;
		title: string;
		priority: Priority;
	}

	interface Props {
		testCase: TestCase;
		projectId: string;
		onDragStart: (event: DragEvent, testCase: TestCase) => void;
		onDragEnd: () => void;
		onOpenModal: (testCase: TestCase) => void;
		isDragging?: boolean;
	}

	let {
		testCase,
		projectId,
		onDragStart,
		onDragEnd,
		onOpenModal,
		isDragging = false
	}: Props = $props();

	let isDragEnabled = $state(false);

	function handleDragHandleMouseDown() {
		isDragEnabled = true;
	}

	function handleDragStart(e: DragEvent) {
		if (!isDragEnabled) {
			e.preventDefault();
			return;
		}
		onDragStart(e, testCase);
	}

	function handleDragEndLocal() {
		isDragEnabled = false;
		onDragEnd();
	}
</script>

<div
	draggable="true"
	ondragstart={handleDragStart}
	ondragend={handleDragEndLocal}
	data-testcase-id={testCase.id}
	class="group border-surface-200-700 rounded-base border p-2 transition-all hover:border-primary-500 {isDragging
		? 'opacity-50'
		: ''}"
>
	<div class="flex items-center gap-2">
		<!-- Drag Handle -->
		<button
			onmousedown={handleDragHandleMouseDown}
			class="flex-shrink-0 cursor-grab p-1 text-surface-400 hover:text-primary-500 active:cursor-grabbing"
			title="Drag to reorder"
		>
			<GripVertical class="h-3.5 w-3.5" />
		</button>

		<!-- Content -->
		<button
			onclick={() => onOpenModal(testCase)}
			data-test="test-case-button"
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
		>
			<TestTube2 class="h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
			<span class="truncate text-sm font-medium">{testCase.title}</span>
			<span class="badge flex-shrink-0 preset-filled-surface-500 text-xs">
				{testCase.priority}
			</span>
		</button>

		<!-- Actions -->
		<a
			href="/projects/{projectId}/cases/{testCase.id}"
			class="preset-ghost-surface-500 btn btn-sm opacity-0 transition-opacity group-hover:opacity-100"
			title="Open full view"
		>
			<ExternalLink class="h-3.5 w-3.5" />
		</a>
	</div>
</div>
