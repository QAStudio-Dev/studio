<script lang="ts">
	import {
		Play,
		Search,
		Filter,
		CheckCircle2,
		XCircle,
		Circle,
		Clock,
		AlertCircle,
		ChevronLeft,
		ChevronRight,
		Loader2
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/stores';

	// Get projectId from URL (reactively)
	let projectId = $derived($pageStore.params.projectId);

	// State
	let testRuns = $state<any[]>([]);
	let loading = $state(true);
	let initialLoad = $state(true);
	let page = $state(1);
	let limit = $state(20);
	let total = $state(0);
	let totalPages = $state(0);
	let search = $state('');
	let searchDebounce: any = null;

	// Filters
	let selectedProject = $state('');
	let selectedStatus = $state('');
	let selectedEnvironment = $state('');
	let selectedMilestone = $state('');

	// Projects for filter dropdown (will be populated)
	let projects = $state<any[]>([]);
	let environments = $state<any[]>([]);
	let milestones = $state<any[]>([]);

	// Fetch test runs
	async function fetchTestRuns() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString()
			});

			if (search) params.set('search', search);
			if (selectedProject) params.set('projectId', selectedProject);
			if (selectedStatus) params.set('status', selectedStatus);
			if (selectedEnvironment) params.set('environmentId', selectedEnvironment);
			if (selectedMilestone) params.set('milestoneId', selectedMilestone);

			const res = await fetch(`/api/test-runs/list?${params}`);
			if (!res.ok) throw new Error('Failed to fetch test runs');

			const data = await res.json();
			testRuns = data.testRuns;
			total = data.pagination.total;
			totalPages = data.pagination.totalPages;
		} catch (err) {
			console.error(err);
			alert('Failed to load test runs');
		} finally {
			loading = false;
		}
	}

	// Fetch projects for filter
	async function fetchProjects() {
		try {
			const res = await fetch('/api/projects');
			if (!res.ok) throw new Error('Failed to fetch projects');
			const data = await res.json();
			projects = data;
		} catch (err) {
			console.error(err);
		}
	}

	// Load data on mount
	onMount(() => {
		// Set selectedProject to the projectId from URL
		selectedProject = projectId;

		fetchTestRuns();
		fetchProjects();
		initialLoad = false;
	});

	// Watch for filter changes
	$effect(() => {
		// Reset to page 1 when filters change
		if (selectedProject || selectedStatus || selectedEnvironment || selectedMilestone) {
			page = 1;
			fetchTestRuns();
		}
	});

	// Watch for page changes
	$effect(() => {
		// Fetch when page changes (but not on initial load which is handled by onMount)
		if (!initialLoad && page >= 1) {
			fetchTestRuns();
		}
	});

	// Handle search with debounce
	function handleSearch() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			page = 1;
			fetchTestRuns();
		}, 300);
	}

	// Navigate to test run detail
	function viewTestRun(runId: string) {
		goto(`/projects/${projectId}/runs/${runId}`);
	}

	// Pagination
	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			page = newPage;
		}
	}

	// Status badge styling
	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			PLANNED: 'preset-filled-surface-500',
			IN_PROGRESS: 'preset-filled-primary-500',
			COMPLETED: 'preset-filled-success-500',
			ABORTED: 'preset-filled-error-500'
		};
		return colors[status] || 'preset-filled-surface-500';
	}

	// Format date
	function formatDate(date: string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString();
	}

	// Format duration
	function formatDuration(startedAt: string | null, completedAt: string | null) {
		if (!startedAt) return 'Not started';
		if (!completedAt) return 'In progress';

		const start = new Date(startedAt).getTime();
		const end = new Date(completedAt).getTime();
		const durationMs = end - start;

		const seconds = Math.floor(durationMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	// Calculate pass rate
	function getPassRate(stats: any) {
		if (stats.total === 0) return 0;
		return Math.round((stats.passed / stats.total) * 100);
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-4xl font-bold">Test Runs</h1>
		<p class="text-surface-600-300 text-lg">View and manage all test execution runs</p>
	</div>

	<!-- Search and Filters -->
	<div class="card mb-6 p-6">
		<div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center">
			<!-- Search -->
			<div class="relative flex-1">
				<Search class="text-surface-500 absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
				<input
					type="text"
					placeholder="Search test runs..."
					class="input w-full pl-10"
					bind:value={search}
					oninput={handleSearch}
				/>
			</div>

			<!-- Project Filter -->
			<select class="select w-full lg:w-48" bind:value={selectedProject}>
				<option value="">All Projects</option>
				{#each projects as project}
					<option value={project.id}>{project.name}</option>
				{/each}
			</select>

			<!-- Status Filter -->
			<select class="select w-full lg:w-48" bind:value={selectedStatus}>
				<option value="">All Statuses</option>
				<option value="PLANNED">Planned</option>
				<option value="IN_PROGRESS">In Progress</option>
				<option value="COMPLETED">Completed</option>
				<option value="ABORTED">Aborted</option>
			</select>
		</div>

		<!-- Stats -->
		<div class="text-surface-600-300 flex items-center gap-4 text-sm">
			<span>Showing {testRuns.length} of {total} test runs</span>
			{#if search || selectedProject || selectedStatus}
				<button
					class="text-primary-500 hover:underline"
					onclick={() => {
						search = '';
						selectedProject = '';
						selectedStatus = '';
						selectedEnvironment = '';
						selectedMilestone = '';
						page = 1;
						fetchTestRuns();
					}}
				>
					Clear filters
				</button>
			{/if}
		</div>
	</div>

	<!-- Test Runs List -->
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<Loader2 class="h-8 w-8 animate-spin text-primary-500" />
		</div>
	{:else if testRuns.length === 0}
		<div class="card p-12 text-center">
			<Play class="mx-auto mb-4 h-16 w-16 text-surface-400" />
			<h2 class="mb-2 text-xl font-bold">No test runs found</h2>
			<p class="text-surface-600-300">
				{#if search || selectedProject || selectedStatus}
					Try adjusting your filters
				{:else}
					Start by creating a test run in a project
				{/if}
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each testRuns as testRun (testRun.id)}
				<button
					class="hover:border-primary-500 card block w-full p-6 text-left transition-all hover:shadow-lg"
					onclick={() => viewTestRun(testRun.id)}
				>
					<div class="mb-4 flex items-start justify-between">
						<div class="flex-1">
							<div class="mb-2 flex items-center gap-3">
								<h3 class="text-xl font-bold">{testRun.name}</h3>
								<span class="badge {getStatusColor(testRun.status)}">
									{testRun.status}
								</span>
								{#if testRun.environment}
									<span class="badge preset-outlined-surface-500">
										{testRun.environment.name}
									</span>
								{/if}
							</div>
							{#if testRun.description}
								<p class="text-surface-600-300 mb-2">{testRun.description}</p>
							{/if}
							<div class="text-surface-600-300 flex items-center gap-4 text-sm">
								<span>{testRun.project.name} ({testRun.project.key})</span>
								{#if testRun.milestone}
									<span>• {testRun.milestone.name}</span>
								{/if}
								<span>• Created by {testRun.creator.firstName || testRun.creator.email}</span>
							</div>
						</div>

						<!-- Pass Rate -->
						{#if testRun.stats.total > 0}
							<div class="ml-4 text-center">
								<div class="mb-1 text-3xl font-bold text-primary-500">
									{getPassRate(testRun.stats)}%
								</div>
								<div class="text-surface-600-300 text-xs">Pass Rate</div>
							</div>
						{/if}
					</div>

					<!-- Test Results Stats -->
					<div class="border-surface-200-700 mb-4 flex items-center gap-6 border-t pt-4">
						<div class="flex items-center gap-2">
							<CheckCircle2 class="h-5 w-5 text-success-500" />
							<span class="font-semibold">{testRun.stats.passed}</span>
							<span class="text-surface-600-300 text-sm">Passed</span>
						</div>
						<div class="flex items-center gap-2">
							<XCircle class="h-5 w-5 text-error-500" />
							<span class="font-semibold">{testRun.stats.failed}</span>
							<span class="text-surface-600-300 text-sm">Failed</span>
						</div>
						<div class="flex items-center gap-2">
							<AlertCircle class="h-5 w-5 text-warning-500" />
							<span class="font-semibold">{testRun.stats.blocked}</span>
							<span class="text-surface-600-300 text-sm">Blocked</span>
						</div>
						<div class="flex items-center gap-2">
							<Circle class="h-5 w-5 text-surface-500" />
							<span class="font-semibold">{testRun.stats.skipped}</span>
							<span class="text-surface-600-300 text-sm">Skipped</span>
						</div>
						<div class="ml-auto flex items-center gap-2">
							<span class="text-surface-600-300 text-sm">Total:</span>
							<span class="font-semibold">{testRun.stats.total}</span>
						</div>
					</div>

					<!-- Timestamps -->
					<div class="text-surface-600-300 flex items-center gap-6 text-xs">
						<div class="flex items-center gap-2">
							<Clock class="h-4 w-4" />
							<span>Started: {formatDate(testRun.startedAt)}</span>
						</div>
						{#if testRun.completedAt}
							<span>• Completed: {formatDate(testRun.completedAt)}</span>
							<span>• Duration: {formatDuration(testRun.startedAt, testRun.completedAt)}</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				<button
					class="btn preset-outlined-surface-500 btn-sm"
					disabled={page === 1}
					onclick={() => goToPage(page - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
				</button>

				{#if page > 2}
					<button class="btn preset-outlined-surface-500 btn-sm" onclick={() => goToPage(1)}>
						1
					</button>
					{#if page > 3}
						<span class="text-surface-500">...</span>
					{/if}
				{/if}

				{#if page > 1}
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={() => goToPage(page - 1)}
					>
						{page - 1}
					</button>
				{/if}

				<button class="btn preset-filled-primary-500 btn-sm" disabled>
					{page}
				</button>

				{#if page < totalPages}
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={() => goToPage(page + 1)}
					>
						{page + 1}
					</button>
				{/if}

				{#if page < totalPages - 1}
					{#if page < totalPages - 2}
						<span class="text-surface-500">...</span>
					{/if}
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={() => goToPage(totalPages)}
					>
						{totalPages}
					</button>
				{/if}

				<button
					class="btn preset-outlined-surface-500 btn-sm"
					disabled={page === totalPages}
					onclick={() => goToPage(page + 1)}
				>
					<ChevronRight class="h-4 w-4" />
				</button>
			</div>
		{/if}
	{/if}
</div>
