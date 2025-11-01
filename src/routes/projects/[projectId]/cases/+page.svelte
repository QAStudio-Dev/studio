<script lang="ts">
	import {
		Plus,
		FolderOpen,
		FolderPlus,
		ChevronRight,
		ChevronDown,
		TestTube2,
		ExternalLink,
		CheckCircle2,
		AlertCircle,
		MoreVertical,
		GripVertical,
		Play
	} from 'lucide-svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { invalidateAll } from '$app/navigation';
	import DraggableTestCase from '$lib/components/DraggableTestCase.svelte';
	import TestCaseDropZone from '$lib/components/TestCaseDropZone.svelte';
	import TestCaseInsertionZone from '$lib/components/TestCaseInsertionZone.svelte';
	import NestedTestSuite from '$lib/components/NestedTestSuite.svelte';
	import NestedSuiteTestCases from '$lib/components/NestedSuiteTestCases.svelte';
	import { setSelectedProject } from '$lib/stores/projectStore';

	let { data } = $props();
	let { project, stats } = $derived(data);

	// Set this project as selected when page loads
	$effect(() => {
		if (project) {
			setSelectedProject({
				id: project.id,
				name: project.name,
				key: project.key
			});
		}
	});

	// State - Initialize expanded suites
	let expandedSuites = $state<Set<string>>(new Set());
	let creatingTestCase = $state<string | null>(null); // suiteId or 'root'
	let creatingSuite = $state(false);
	let selectedTestCase = $state<any | null>(null);
	let showTestCaseModal = $state(false);

	// Get only root-level suites (those without a parent)
	let rootSuites = $derived(project.testSuites.filter((s) => !s.parentId));

	// Initialize all suites as expanded by default
	$effect(() => {
		if (project && expandedSuites.size === 0) {
			expandedSuites = new Set(['root', ...project.testSuites.map((s) => s.id)]);
		}
	});

	// Expand/collapse all functionality
	let allExpanded = $derived(
		expandedSuites.has('root') && project.testSuites.every((s) => expandedSuites.has(s.id))
	);

	function toggleExpandCollapseAll() {
		if (allExpanded) {
			// Collapse all
			expandedSuites = new Set();
		} else {
			// Expand all (including nested suites)
			expandedSuites = new Set(['root', ...project.testSuites.map((s) => s.id)]);
		}
	}

	// Drag and drop state
	let draggedTestCase = $state<any | null>(null);
	let dragOverSuite = $state<string | null>(null);
	let dragOverPosition = $state<{ suiteId: string | null; index: number } | null>(null);
	let draggedSuite = $state<any | null>(null);
	let dragOverSuitePosition = $state<number | null>(null);

	// New test case form
	let newTestCaseTitle = $state('');
	let newTestCaseDescription = $state('');
	let loading = $state(false);

	// New suite form
	let newSuiteName = $state('');
	let newSuiteDescription = $state('');
	let newSuiteParentId = $state<string | null>(null);

	function toggleSuite(suiteId: string) {
		if (expandedSuites.has(suiteId)) {
			expandedSuites.delete(suiteId);
		} else {
			expandedSuites.add(suiteId);
		}
		expandedSuites = new Set(expandedSuites);
	}

	function startCreatingTestCase(suiteId: string | null) {
		creatingTestCase = suiteId || 'root';
		newTestCaseTitle = '';
		newTestCaseDescription = '';
	}

	function cancelCreatingTestCase() {
		creatingTestCase = null;
	}

	async function handleCreateTestCase(suiteId: string | null, keepOpen = true) {
		if (!newTestCaseTitle.trim()) return;

		loading = true;
		try {
			const res = await fetch(`/api/projects/${project.id}/test-cases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTestCaseTitle,
					description: newTestCaseDescription,
					suiteId
				})
			});

			if (!res.ok) throw new Error('Failed to create test case');

			await invalidateAll();

			// Clear form but keep it open for rapid entry
			newTestCaseTitle = '';
			newTestCaseDescription = '';

			if (!keepOpen) {
				creatingTestCase = null;
			}

			// Focus back to title input
			setTimeout(() => {
				const input = document.querySelector<HTMLInputElement>(
					'input[placeholder="Test case title"]'
				);
				input?.focus();
			}, 100);
		} catch (err) {
			console.error(err);
			alert('Failed to create test case');
		} finally {
			loading = false;
		}
	}

	function startCreatingSuite(parentId: string | null = null) {
		creatingSuite = true;
		newSuiteName = '';
		newSuiteDescription = '';
		newSuiteParentId = parentId;
	}

	function cancelCreatingSuite() {
		creatingSuite = false;
	}

	async function handleCreateSuite(event?: Event) {
		event?.preventDefault();
		if (!newSuiteName.trim()) return;

		loading = true;
		try {
			const res = await fetch(`/api/projects/${project.id}/suites`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newSuiteName,
					description: newSuiteDescription,
					parentId: newSuiteParentId
				})
			});

			if (!res.ok) throw new Error('Failed to create suite');

			await invalidateAll();
			creatingSuite = false;
		} catch (err) {
			console.error(err);
			alert('Failed to create suite');
		} finally {
			loading = false;
		}
	}

	function openTestCaseModal(testCase: any) {
		selectedTestCase = testCase;
		showTestCaseModal = true;
	}

	// Drag and drop handlers
	// Store the ID for use in async operation
	let originalTestCaseId = $state<string | null>(null);

	function handleDragStart(event: DragEvent, testCase: any) {
		draggedTestCase = testCase;
		originalTestCaseId = testCase.id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			const target = event.currentTarget as HTMLElement;
			event.dataTransfer.setData('text/html', target.innerHTML);
		}
	}

	function handleDragEnd() {
		// unchanged
		draggedTestCase = null;
		dragOverSuite = null;
		dragOverPosition = null;
		originalTestCaseId = null;
	}

	function handleDragOver(event: DragEvent, suiteId: string | null) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverSuite = suiteId;
	}

	function handleDragLeave() {
		dragOverSuite = null;
	}

	function handleInsertionDragOver(event: DragEvent, suiteId: string | null, index: number) {
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverPosition = { suiteId, index };
	}

	function handleInsertionDragLeave() {
		dragOverPosition = null;
	}

	// Suite drag handlers
	function handleSuiteDragStart(event: DragEvent, suite: any) {
		draggedSuite = suite;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleSuiteDragEnd() {
		draggedSuite = null;
		dragOverSuitePosition = null;
	}

	async function handleDropSuiteOnSuite(draggedSuiteId: string, targetSuiteId: string) {
		// Move suite to be a child of target suite
		try {
			const res = await fetch(`/api/test-suites/${draggedSuiteId}/move-to-parent`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parentId: targetSuiteId
				})
			});

			if (!res.ok) {
				throw new Error('Failed to move suite');
			}

			// Refresh data
			await invalidateAll();
		} catch (err) {
			console.error(err);
			alert('Failed to move suite');
		}
	}

	function handleSuiteDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverSuitePosition = index;
	}

	function handleSuiteDragLeave() {
		dragOverSuitePosition = null;
	}

	async function handleSuiteDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		event.stopPropagation();

		if (!draggedSuite) return;

		const suiteId = draggedSuite.id;
		const movedSuite = { ...draggedSuite };

		// Clear drag state
		draggedSuite = null;
		dragOverSuitePosition = null;

		// Find current index
		const currentIndex = project.testSuites.findIndex((s) => s.id === suiteId);
		if (currentIndex === -1) return;

		// Adjust target index if moving down
		let adjustedIndex = targetIndex;
		if (currentIndex < targetIndex) {
			adjustedIndex = targetIndex - 1;
		}

		// Optimistically update local data
		const suites = [...project.testSuites];
		suites.splice(currentIndex, 1);
		suites.splice(adjustedIndex, 0, movedSuite);
		project.testSuites = suites;
		project = { ...project };

		try {
			const res = await fetch(`/api/test-suites/${suiteId}/reorder`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order: adjustedIndex })
			});

			if (!res.ok) throw new Error('Failed to reorder suite');

			invalidateAll();
		} catch (err) {
			console.error(err);
			alert('Failed to move suite. Rolling back...');
			await invalidateAll();
		}
	}

	async function handleInsertionDrop(
		event: DragEvent,
		targetSuiteId: string | null,
		targetIndex: number
	) {
		event.preventDefault();
		event.stopPropagation();

		if (!draggedTestCase) return;

		// Store the test case ID and details before clearing draggedTestCase
		const testCaseId = draggedTestCase.id;
		const movedTestCase = { ...draggedTestCase };
		const currentSuiteId = movedTestCase.suiteId;

		// Clear drag state immediately
		draggedTestCase = null;
		dragOverSuite = null;
		dragOverPosition = null;

		// Optimistically update the local data
		// Remove from current location
		let removedIndex = -1;
		if (currentSuiteId === null) {
			removedIndex = project.testCases?.findIndex((tc) => tc.id === testCaseId) ?? -1;
			project.testCases = project.testCases?.filter((tc) => tc.id !== testCaseId) || [];
		} else {
			const suite = project.testSuites.find((s) => s.id === currentSuiteId);
			if (suite) {
				removedIndex = suite.testCases?.findIndex((tc) => tc.id === testCaseId) ?? -1;
				suite.testCases = suite.testCases?.filter((tc) => tc.id !== testCaseId) || [];
			}
		}

		// Adjust target index if moving within same suite and moving down
		let adjustedIndex = targetIndex;
		if (currentSuiteId === targetSuiteId && removedIndex !== -1 && removedIndex < targetIndex) {
			adjustedIndex = targetIndex - 1;
		}

		// Add to new location at specific position
		movedTestCase.suiteId = targetSuiteId;
		movedTestCase.order = adjustedIndex;

		if (targetSuiteId === null) {
			const cases = project.testCases || [];
			cases.splice(adjustedIndex, 0, movedTestCase);
			project.testCases = cases;
		} else {
			const targetSuite = project.testSuites.find((s) => s.id === targetSuiteId);
			if (targetSuite) {
				const cases = targetSuite.testCases || [];
				cases.splice(adjustedIndex, 0, movedTestCase);
				targetSuite.testCases = cases;
			}
		}

		// Trigger re-render with optimistic data
		project = { ...project };

		try {
			// Make the API call in the background
			const res = await fetch(`/api/test-cases/${testCaseId}/reorder`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					suiteId: targetSuiteId,
					order: adjustedIndex
				})
			});

			if (!res.ok) throw new Error('Failed to reorder');

			// Refresh to get the actual state from server (in background)
			invalidateAll();
		} catch (err) {
			console.error(err);
			alert('Failed to move test case. Rolling back...');

			// Rollback on failure
			await invalidateAll();
		}
	}

	async function handleDrop(event: DragEvent, targetSuiteId: string | null, testCases: any[]) {
		event.preventDefault();

		if (!draggedTestCase) return;

		// Use insertion drop at the end
		handleInsertionDrop(event, targetSuiteId, testCases.length);
	}

	function getPriorityColor(priority: string) {
		const colors: Record<string, string> = {
			CRITICAL: 'text-error-500',
			HIGH: 'text-warning-500',
			MEDIUM: 'text-primary-500',
			LOW: 'text-surface-500'
		};
		return colors[priority] || 'text-surface-500';
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between">
			<div>
				<div class="mb-2 flex items-center gap-3">
					<h1 class="text-4xl font-bold">{project.name}</h1>
					<span class="badge preset-filled-surface-500">{project.key}</span>
				</div>
				{#if project.description}
					<p class="text-surface-600-300 text-lg">{project.description}</p>
				{/if}
			</div>
			<div>
				<a href="/projects/{project.id}/runs" class="btn preset-filled-primary-500">
					<Play class="mr-2 h-4 w-4" />
					View Test Runs
				</a>
			</div>
		</div>

		<!-- Stats -->
		<div class="text-surface-600-300 mt-6 flex items-center gap-6 text-sm">
			<div class="flex items-center gap-2">
				<FolderOpen class="h-4 w-4" />
				<span>{stats.totalSuites} suites</span>
			</div>
			<div class="flex items-center gap-2">
				<TestTube2 class="h-4 w-4" />
				<span>{stats.totalTestCases} test cases</span>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-[300px_1fr]">
		<!-- Sidebar - Test Suites -->
		<div class="card p-4">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-bold">Test Suites</h2>
				<div class="flex items-center gap-2">
					<button
						onclick={toggleExpandCollapseAll}
						class="btn preset-outlined-surface-500 btn-sm"
						title={allExpanded ? 'Collapse All' : 'Expand All'}
					>
						{#if allExpanded}
							<ChevronRight class="h-4 w-4" />
						{:else}
							<ChevronDown class="h-4 w-4" />
						{/if}
					</button>
					<button
						onclick={() => startCreatingSuite(null)}
						class="btn preset-filled-primary-500 btn-sm"
						title="Create Suite"
					>
						<FolderPlus class="h-4 w-4" />
					</button>
				</div>
			</div>

			{#if creatingSuite}
				<form
					onsubmit={handleCreateSuite}
					class="bg-surface-50-900 mb-4 rounded-container border border-primary-500 p-3"
				>
					<input
						type="text"
						class="input-sm input mb-2"
						placeholder="Suite name (press Enter to create)"
						bind:value={newSuiteName}
						disabled={loading}
						autofocus
					/>
					<div class="flex gap-2">
						<button
							type="submit"
							class="btn flex-1 preset-filled-success-500 btn-sm"
							disabled={loading || !newSuiteName.trim()}
						>
							Create
						</button>
						<button
							type="button"
							onclick={cancelCreatingSuite}
							class="btn preset-outlined-surface-500 btn-sm"
							disabled={loading}
						>
							Cancel
						</button>
					</div>
				</form>
			{/if}

			<div class="space-y-1">
				<!-- Test Suites - Recursive rendering -->
				{#each rootSuites as suite (suite.id)}
					<NestedTestSuite
						{suite}
						{expandedSuites}
						{toggleSuite}
						onDragStart={handleSuiteDragStart}
						onDragEnd={handleSuiteDragEnd}
						onDropOnSuite={handleDropSuiteOnSuite}
						{draggedSuite}
						allSuites={project.testSuites}
						level={0}
					/>
				{/each}

				<!-- Final insertion zone at the end -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					ondragover={(e) => handleSuiteDragOver(e, project.testSuites.length)}
					ondragleave={handleSuiteDragLeave}
					ondrop={(e) => handleSuiteDrop(e, project.testSuites.length)}
					class="h-1 transition-all {!!draggedSuite
						? 'opacity-100'
						: 'opacity-0'} {dragOverSuitePosition === project.testSuites.length
						? 'h-6 bg-primary-500/20'
						: ''}"
				>
					{#if dragOverSuitePosition === project.testSuites.length}
						<div class="mx-2 h-0.5 bg-primary-500"></div>
					{/if}
				</div>

				<!-- Root test cases (no suite) - at the bottom -->
				<button
					onclick={() => toggleSuite('root')}
					class="hover:bg-surface-100-800 flex w-full items-center gap-2 rounded-base px-3 py-2 text-left transition-colors"
				>
					{#if expandedSuites.has('root')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
					<FolderOpen class="h-4 w-4 text-surface-500" />
					<span>Uncategorized</span>
					<span class="ml-auto badge preset-filled-surface-500 text-xs">
						{project.testCases?.length || 0}
					</span>
				</button>
			</div>
		</div>

		<!-- Main Content - Test Cases -->
		<div class="card p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-bold">Test Cases</h2>
				<button onclick={() => startCreatingTestCase(null)} class="btn preset-filled-primary-500">
					<Plus class="mr-2 h-4 w-4" />
					New Test Case
				</button>
			</div>

			<!-- Display test cases based on expanded suites - Recursive rendering -->
			{#each rootSuites as suite (suite.id)}
				<NestedSuiteTestCases
					{suite}
					{expandedSuites}
					allSuites={project.testSuites}
					{creatingTestCase}
					{newTestCaseTitle}
					{newTestCaseDescription}
					{loading}
					{draggedTestCase}
					{dragOverSuite}
					{dragOverPosition}
					onCreateTestCase={handleCreateTestCase}
					onStartCreatingTestCase={startCreatingTestCase}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onInsertionDragOver={handleInsertionDragOver}
					onInsertionDragLeave={handleInsertionDragLeave}
					onInsertionDrop={handleInsertionDrop}
					onOpenModal={openTestCaseModal}
				/>
			{/each}

			<!-- Uncategorized - at the bottom -->
			{#if expandedSuites.has('root')}
				<div class="mb-8">
					<h3 class="mb-4 flex items-center gap-2 text-lg font-bold">
						<FolderOpen class="h-5 w-5 text-surface-500" />
						Uncategorized
					</h3>

					{#if creatingTestCase === 'root'}
						<form
							onsubmit={(e) => {
								e.preventDefault();
								handleCreateTestCase(null);
							}}
							class="bg-surface-50-900 mb-3 rounded-container border border-primary-500 p-3"
						>
							<div class="flex gap-2">
								<input
									type="text"
									class="input-sm input flex-1"
									placeholder="Test case title (press Enter to create)"
									bind:value={newTestCaseTitle}
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
						ondrop={(e) => handleDrop(e, null, project.testCases || [])}
						ondragover={(e) => handleDragOver(e, null)}
						ondragleave={handleDragLeave}
						onCreate={() => startCreatingTestCase(null)}
						isOver={dragOverSuite === null && !!draggedTestCase}
						isEmpty={!project.testCases?.length && creatingTestCase !== 'root'}
						isDragging={!!draggedTestCase}
					>
						<div>
							{#each project.testCases || [] as testCase, index}
								<TestCaseInsertionZone
									ondragover={(e) => handleInsertionDragOver(e, null, index)}
									ondragleave={handleInsertionDragLeave}
									ondrop={(e) => handleInsertionDrop(e, null, index)}
									isOver={dragOverPosition?.suiteId === null && dragOverPosition?.index === index}
									isDragging={!!draggedTestCase && draggedTestCase.id !== testCase.id}
								/>
								<DraggableTestCase
									{testCase}
									onDragStart={handleDragStart}
									onDragEnd={handleDragEnd}
									onOpenModal={openTestCaseModal}
									isDragging={draggedTestCase?.id === testCase.id}
								/>
							{/each}
							<TestCaseInsertionZone
								ondragover={(e) => handleInsertionDragOver(e, null, project.testCases?.length || 0)}
								ondragleave={handleInsertionDragLeave}
								ondrop={(e) => handleInsertionDrop(e, null, project.testCases?.length || 0)}
								isOver={dragOverPosition?.suiteId === null &&
									dragOverPosition?.index === (project.testCases?.length || 0)}
								isDragging={!!draggedTestCase}
							/>

							{#if project.testCases?.length && creatingTestCase !== 'root'}
								<button
									onclick={() => startCreatingTestCase(null)}
									class="hover:bg-surface-100-800 text-surface-600-300 mt-1 flex w-full items-center justify-center gap-2 rounded-base p-2 text-sm transition-colors hover:text-primary-500"
								>
									<Plus class="h-4 w-4" />
									<span>Add test case</span>
								</button>
							{/if}
						</div>
					</TestCaseDropZone>
				</div>
			{/if}

			{#if !expandedSuites.size}
				<div class="text-surface-600-300 py-12 text-center">
					<FolderOpen class="mx-auto mb-4 h-16 w-16 opacity-50" />
					<p>Select a suite from the sidebar to view test cases</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Test Case Quick View Modal -->
{#if showTestCaseModal}
	<Dialog>
		<Portal>
			<Dialog.Backdrop
				class="fixed inset-0 z-40 bg-black/50"
				onclick={() => (showTestCaseModal = false)}
			/>
			<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<Dialog.Content
					class="max-h-[90vh] w-full max-w-2xl overflow-y-auto card bg-surface-50-950 p-6 shadow-xl"
				>
					{#if selectedTestCase}
						<div class="mb-6">
							<div class="mb-4 flex items-start justify-between">
								<div class="flex-1">
									<Dialog.Title class="mb-2 flex items-center gap-3">
										<TestTube2 class="h-6 w-6 text-primary-500" />
										<h2 class="text-2xl font-bold">{selectedTestCase.title}</h2>
									</Dialog.Title>
									<div class="flex items-center gap-3">
										<span class="badge {getPriorityColor(selectedTestCase.priority)}">
											{selectedTestCase.priority}
										</span>
										<span class="badge preset-filled-surface-500">{selectedTestCase.type}</span>
										<span class="badge preset-outlined-surface-500">
											{selectedTestCase.automationStatus}
										</span>
									</div>
								</div>
								<Dialog.CloseTrigger
									class="preset-ghost-surface-500 btn btn-sm"
									onclick={() => (showTestCaseModal = false)}
								>
									✕
								</Dialog.CloseTrigger>
							</div>

							<Dialog.Description class="space-y-6">
								{#if selectedTestCase.description}
									<div>
										<h3 class="mb-2 font-bold">Description</h3>
										<p class="text-surface-600-300">{selectedTestCase.description}</p>
									</div>
								{/if}

								{#if selectedTestCase.preconditions}
									<div>
										<h3 class="mb-2 font-bold">Preconditions</h3>
										<p class="text-surface-600-300">{selectedTestCase.preconditions}</p>
									</div>
								{/if}

								{#if selectedTestCase.expectedResult}
									<div>
										<h3 class="mb-2 font-bold">Expected Result</h3>
										<p class="text-surface-600-300">{selectedTestCase.expectedResult}</p>
									</div>
								{/if}
							</Dialog.Description>

							<div class="border-surface-200-700 flex gap-3 border-t pt-4">
								<a
									href="/projects/{project.id}/cases/{selectedTestCase.id}"
									class="btn flex-1 preset-filled-primary-500"
								>
									<ExternalLink class="mr-2 h-4 w-4" />
									Open Full View
								</a>
								<button class="btn preset-outlined-surface-500">Edit</button>
							</div>
						</div>
					{/if}
				</Dialog.Content>
			</Dialog.Positioner>
		</Portal>
	</Dialog>
{/if}
