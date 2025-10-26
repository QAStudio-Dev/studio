<script lang="ts">
	import { GripVertical, TestTube2, ExternalLink } from 'lucide-svelte';

	interface Props {
		testCase: any;
		onDragStart: (event: DragEvent, testCase: any) => void;
		onDragEnd: () => void;
		onOpenModal: (testCase: any) => void;
		isDragging?: boolean;
	}

	let { testCase, onDragStart, onDragEnd, onOpenModal, isDragging = false }: Props = $props();

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
	class="group p-2 border border-surface-200-700 rounded-base hover:border-primary-500 transition-all {isDragging
		? 'opacity-50'
		: ''}"
>
	<div class="flex items-center gap-2">
		<!-- Drag Handle -->
		<button
			onmousedown={handleDragHandleMouseDown}
			class="flex-shrink-0 text-surface-400 hover:text-primary-500 cursor-grab active:cursor-grabbing p-1"
			title="Drag to reorder"
		>
			<GripVertical class="w-3.5 h-3.5" />
		</button>

		<!-- Content -->
		<button onclick={() => onOpenModal(testCase)} class="flex-1 text-left flex items-center gap-2 min-w-0">
			<TestTube2 class="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
			<span class="font-medium text-sm truncate">{testCase.title}</span>
			<span class="badge preset-filled-surface-500 text-xs flex-shrink-0">
				{testCase.priority}
			</span>
		</button>

		<!-- Actions -->
		<a
			href="/test-cases/{testCase.id}"
			class="btn btn-sm preset-ghost-surface-500 opacity-0 group-hover:opacity-100 transition-opacity"
			title="Open full view"
		>
			<ExternalLink class="w-3.5 h-3.5" />
		</a>
	</div>
</div>
