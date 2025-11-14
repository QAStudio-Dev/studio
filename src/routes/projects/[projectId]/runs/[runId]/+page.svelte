<script lang="ts">
	import {
		Play,
		Search,
		CheckCircle2,
		XCircle,
		Circle,
		Clock,
		AlertCircle,
		ChevronLeft,
		ChevronRight,
		ChevronDown,
		Loader2,
		ArrowLeft,
		Calendar,
		User,
		Folder,
		Target,
		Image as ImageIcon,
		FileText,
		Download,
		Sparkles,
		TrendingUp,
		Bug
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
	import AttachmentViewer from '$lib/components/AttachmentViewer.svelte';
	import JiraIssueModal from '$lib/components/JiraIssueModal.svelte';
	import TestStepsViewer from '$lib/components/TestStepsViewer.svelte';

	let { data } = $props();
	let { testRun, stats } = $derived(data);

	// Get projectId from URL (reactively)
	let projectId = $derived($page.params.projectId);

	// State
	let testResults = $state<any[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let limit = $state(1000); // Set high limit to get all results on one page
	let total = $state(0);
	let totalPages = $state(0);
	let search = $state('');
	let searchDebounce: any = null;

	// Filters
	let selectedStatus = $state('');
	let selectedPriority = $state('');
	let selectedType = $state('');

	// Expandable test result details
	let expandedResults = $state<Set<string>>(new Set());

	// AI features
	let aiDiagnoses = $state<
		Map<string, { diagnosis: string; generatedAt?: Date; cached?: boolean }>
	>(new Map());
	let loadingDiagnosis = $state<Set<string>>(new Set());
	let runSummary = $state<{
		summary: string;
		patternAnalysis: string | null;
		generatedAt?: Date;
		cached?: boolean;
	} | null>(null);
	let loadingSummary = $state(false);

	// Jira integration
	let showJiraModal = $state(false);
	let jiraModalTestCaseId = $state<string | undefined>(undefined);
	let jiraModalTestResultId = $state<string | undefined>(undefined);
	let jiraModalSummary = $state('');
	let jiraModalDescription = $state('');

	function openJiraModal(result: any) {
		jiraModalTestCaseId = result.testCase.id;
		jiraModalTestResultId = result.id;
		jiraModalSummary = `Test Failure: ${result.testCase.title}`;
		jiraModalDescription = `**Test Case**: ${result.testCase.title}
**Test Run**: ${testRun.name}
**Environment**: ${testRun.environment?.name || 'N/A'}
**Status**: ${result.status}
**Priority**: ${result.testCase.priority}

${result.errorMessage ? `**Error Message**:\n${result.errorMessage}\n\n` : ''}${result.testCase.description ? `**Test Description**:\n${result.testCase.description}\n\n` : ''}**Steps to Reproduce**:
${result.testCase.steps || 'See test case for details'}

**Expected Result**:
${result.testCase.expectedResult || 'See test case for details'}`;
		showJiraModal = true;
	}

	// Fetch test results
	async function fetchTestResults() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString()
			});

			if (search) params.set('search', search);
			if (selectedStatus) params.set('status', selectedStatus);
			if (selectedPriority) params.set('priority', selectedPriority);
			if (selectedType) params.set('type', selectedType);

			const res = await fetch(`/api/runs/${testRun.id}/results?${params}`);
			if (!res.ok) throw new Error('Failed to fetch test results');

			const resultData = await res.json();
			testResults = resultData.testResults;
			total = resultData.pagination.total;
			totalPages = resultData.pagination.totalPages;
		} catch (err) {
			console.error(err);
			alert('Failed to load test results');
		} finally {
			loading = false;
		}
	}

	// Load data on mount
	onMount(() => {
		fetchTestResults();
	});

	// Watch for filter changes
	$effect(() => {
		if (selectedStatus || selectedPriority || selectedType) {
			currentPage = 1;
			fetchTestResults();
		}
	});

	// Watch for page changes
	$effect(() => {
		if (currentPage > 1) {
			fetchTestResults();
		}
	});

	// Handle search with debounce
	function handleSearch() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			currentPage = 1;
			fetchTestResults();
		}, 300);
	}

	// Pagination
	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			currentPage = newPage;
		}
	}

	// Toggle expanded result
	function toggleResult(resultId: string) {
		if (expandedResults.has(resultId)) {
			expandedResults.delete(resultId);
		} else {
			expandedResults.add(resultId);
		}
		expandedResults = new Set(expandedResults);
	}

	// Status badge styling
	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			PASSED: 'preset-filled-success-500',
			FAILED: 'preset-filled-error-500',
			BLOCKED: 'preset-filled-warning-500',
			SKIPPED: 'preset-filled-surface-500',
			RETEST: 'preset-filled-warning-500',
			UNTESTED: 'preset-outlined-surface-500'
		};
		return colors[status] || 'preset-filled-surface-500';
	}

	function getStatusIcon(status: string) {
		const icons: Record<string, any> = {
			PASSED: CheckCircle2,
			FAILED: XCircle,
			BLOCKED: AlertCircle,
			SKIPPED: Circle,
			RETEST: AlertCircle,
			UNTESTED: Circle
		};
		return icons[status] || Circle;
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

	// Format date
	function formatDate(date: string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString();
	}

	// Format duration
	function formatDuration(durationMs: number | null) {
		if (!durationMs) return 'N/A';

		const seconds = Math.floor(durationMs / 1000);
		const minutes = Math.floor(seconds / 60);

		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	// Calculate pass rate (excluding skipped tests - industry standard)
	function getPassRate() {
		const executedTests = stats.passed + stats.failed;
		if (executedTests === 0) return 0;
		return Math.round((stats.passed / executedTests) * 100);
	}

	// Get run status color
	function getRunStatusColor(status: string) {
		const colors: Record<string, string> = {
			PLANNED: 'preset-filled-surface-500',
			IN_PROGRESS: 'preset-filled-primary-500',
			COMPLETED: 'preset-filled-success-500',
			ABORTED: 'preset-filled-error-500'
		};
		return colors[status] || 'preset-filled-surface-500';
	}

	// Group test results by suite
	function groupResultsBySuite(results: any[]) {
		const groups = new Map<
			string,
			{ suite: { id: string; name: string; path: any[] } | null; results: any[] }
		>();

		for (const result of results) {
			let groupKey = 'uncategorized';
			let suiteInfo: { id: string; name: string; path: any[] } | null = null;

			if (result.testCase.suitePath && result.testCase.suitePath.length > 0) {
				// Use the immediate parent suite (last in path)
				const parentSuite = result.testCase.suitePath[result.testCase.suitePath.length - 1];
				groupKey = parentSuite.id;
				suiteInfo = {
					id: parentSuite.id,
					name: parentSuite.name,
					path: result.testCase.suitePath
				};
			}

			if (!groups.has(groupKey)) {
				groups.set(groupKey, { suite: suiteInfo, results: [] });
			}
			groups.get(groupKey)!.results.push(result);
		}

		return Array.from(groups.values());
	}

	// Derived grouped results
	let groupedResults = $derived(groupResultsBySuite(testResults));

	// Track expanded suites
	let expandedSuites = $state<Set<string>>(new Set());

	// Initialize all suites as expanded
	$effect(() => {
		if (testResults.length > 0) {
			const allSuiteIds = new Set<string>(['uncategorized']);
			testResults.forEach((result) => {
				if (result.testCase.suitePath && result.testCase.suitePath.length > 0) {
					const parentSuite = result.testCase.suitePath[result.testCase.suitePath.length - 1];
					allSuiteIds.add(parentSuite.id);
				}
			});
			expandedSuites = new Set(allSuiteIds);
		}
	});

	function toggleSuite(suiteId: string) {
		if (expandedSuites.has(suiteId)) {
			expandedSuites.delete(suiteId);
		} else {
			expandedSuites.add(suiteId);
		}
		expandedSuites = new Set(expandedSuites);
	}

	// AI Diagnosis for individual test
	async function getDiagnosis(resultId: string, regenerate = false) {
		if (aiDiagnoses.has(resultId) && !regenerate) return; // Already loaded

		loadingDiagnosis.add(resultId);
		loadingDiagnosis = new Set(loadingDiagnosis);

		try {
			const res = await fetch('/api/ai/diagnose-test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ testResultId: resultId, regenerate })
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to get AI diagnosis');
			}

			const { diagnosis, generatedAt, cached } = await res.json();
			aiDiagnoses.set(resultId, { diagnosis, generatedAt, cached });
			aiDiagnoses = new Map(aiDiagnoses);
		} catch (err: any) {
			console.error(err);
			alert(err.message || 'Failed to get AI diagnosis');
		} finally {
			loadingDiagnosis.delete(resultId);
			loadingDiagnosis = new Set(loadingDiagnosis);
		}
	}

	// AI Summary for entire test run
	async function getRunSummary(regenerate = false) {
		if (runSummary && !regenerate) return; // Already loaded

		loadingSummary = true;

		try {
			const res = await fetch('/api/ai/summarize-run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ testRunId: testRun.id, regenerate })
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to get AI summary');
			}

			const { summary, patternAnalysis, generatedAt, cached } = await res.json();
			runSummary = { summary, patternAnalysis, generatedAt, cached };
		} catch (err: any) {
			console.error(err);
			alert(err.message || 'Failed to get AI summary');
		} finally {
			loadingSummary = false;
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Back Button -->
	<button
		class="text-surface-600-300 mb-4 flex items-center gap-2 transition-colors hover:text-primary-500"
		onclick={() => goto(`/projects/${projectId}/runs`)}
	>
		<ArrowLeft class="h-4 w-4" />
		<span>Back to Test Runs</span>
	</button>

	<!-- Header -->
	<div class="mb-6 card p-6">
		<div class="mb-4 flex items-start justify-between">
			<div class="flex-1">
				<div class="mb-3 flex items-center gap-3">
					<h1 class="text-3xl font-bold">{testRun.name}</h1>
					<span class="badge {getRunStatusColor(testRun.status)}">
						{testRun.status}
					</span>
					{#if testRun.environment}
						<span class="badge preset-outlined-surface-500">
							{testRun.environment.name}
						</span>
					{/if}
				</div>
				{#if testRun.description}
					<p class="text-surface-600-300 mb-4">{testRun.description}</p>
				{/if}
			</div>

			<!-- Pass Rate -->
			{#if stats.total > 0}
				<div class="ml-4 text-center">
					<div class="mb-1 text-4xl font-bold text-primary-500">
						{getPassRate()}%
					</div>
					<div class="text-surface-600-300">Pass Rate</div>
				</div>
			{/if}
		</div>

		<!-- Metadata -->
		<div
			class="border-surface-200-700 mb-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2 lg:grid-cols-4"
		>
			<div class="flex items-start gap-3">
				<Folder class="mt-1 h-5 w-5 text-surface-500" />
				<div>
					<div class="text-surface-600-300 text-xs">Project</div>
					<div class="font-semibold">{testRun.project.name}</div>
					<div class="text-xs text-surface-500">{testRun.project.key}</div>
				</div>
			</div>

			{#if testRun.milestone}
				<div class="flex items-start gap-3">
					<Target class="mt-1 h-5 w-5 text-surface-500" />
					<div>
						<div class="text-surface-600-300 text-xs">Milestone</div>
						<div class="font-semibold">{testRun.milestone.name}</div>
						{#if testRun.milestone.dueDate}
							<div class="text-xs text-surface-500">
								Due: {new Date(testRun.milestone.dueDate).toLocaleDateString()}
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<div class="flex items-start gap-3">
				<User class="mt-1 h-5 w-5 text-surface-500" />
				<div>
					<div class="text-surface-600-300 text-xs">Created By</div>
					<div class="font-semibold">
						{testRun.creator.firstName
							? `${testRun.creator.firstName} ${testRun.creator.lastName || ''}`
							: testRun.creator.email}
					</div>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<Clock class="mt-1 h-5 w-5 text-surface-500" />
				<div>
					<div class="text-surface-600-300 text-xs">Started</div>
					<div class="font-semibold">{formatDate(testRun.startedAt?.toISOString() || null)}</div>
					{#if testRun.completedAt}
						<div class="text-xs text-surface-500">
							Completed: {formatDate(testRun.completedAt?.toISOString())}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Stats -->
		<div class="border-surface-200-700 flex flex-wrap items-center gap-6 border-t pt-4">
			<div class="flex items-center gap-2">
				<CheckCircle2 class="h-5 w-5 text-success-500" />
				<span class="font-semibold">{stats.passed}</span>
				<span class="text-surface-600-300 text-sm">Passed</span>
			</div>
			<div class="flex items-center gap-2">
				<XCircle class="h-5 w-5 text-error-500" />
				<span class="font-semibold">{stats.failed}</span>
				<span class="text-surface-600-300 text-sm">Failed</span>
			</div>
			<div class="flex items-center gap-2">
				<AlertCircle class="h-5 w-5 text-warning-500" />
				<span class="font-semibold">{stats.blocked}</span>
				<span class="text-surface-600-300 text-sm">Blocked</span>
			</div>
			<div class="flex items-center gap-2">
				<Circle class="h-5 w-5 text-surface-500" />
				<span class="font-semibold">{stats.skipped}</span>
				<span class="text-surface-600-300 text-sm">Skipped</span>
			</div>
			<div class="ml-auto flex items-center gap-2">
				<span class="text-surface-600-300 text-sm">Total:</span>
				<span class="text-xl font-bold">{stats.total}</span>
			</div>
		</div>

		<!-- AI Summary Section -->
		{#if stats.total > 0}
			<div class="border-surface-200-700 border-t pt-4">
				{#if !runSummary && !loadingSummary}
					<button
						onclick={() => getRunSummary()}
						class="preset-tonal-primary-500 btn btn-sm"
						disabled={loadingSummary}
					>
						<Sparkles class="h-4 w-4" />
						<span>Get AI Summary</span>
					</button>
				{:else if loadingSummary}
					<div class="flex items-center gap-2 text-sm text-primary-500">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Generating AI insights...</span>
					</div>
				{:else if runSummary}
					<div class="space-y-4">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<Sparkles class="h-5 w-5 text-primary-500" />
								<h3 class="font-semibold">AI Summary</h3>
								{#if runSummary.cached}
									<span class="text-xs text-surface-500">(cached)</span>
								{/if}
							</div>
							<button
								onclick={() => getRunSummary(true)}
								class="preset-tonal-primary-500 btn btn-sm"
								title="Regenerate summary"
								disabled={loadingSummary}
							>
								<Sparkles class="h-4 w-4" />
								Regenerate
							</button>
						</div>
						<div class="rounded-container border border-primary-200-800 bg-primary-50-950 p-4">
							<div class="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
								{runSummary.summary}
							</div>
						</div>

						{#if runSummary.patternAnalysis}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<TrendingUp class="h-5 w-5 text-warning-500" />
									<h3 class="font-semibold">Failure Pattern Analysis</h3>
								</div>
								<div class="rounded-container border border-warning-200-800 bg-warning-50-950 p-4">
									<div class="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
										{runSummary.patternAnalysis}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Search and Filters -->
	<div class="mb-6 card p-6">
		<div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center">
			<!-- Search -->
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-surface-500" />
				<input
					type="text"
					placeholder="Search test cases..."
					class="input w-full pl-10"
					bind:value={search}
					oninput={handleSearch}
				/>
			</div>

			<!-- Status Filter -->
			<select class="select w-full lg:w-48" bind:value={selectedStatus}>
				<option value="">All Statuses</option>
				<option value="PASSED">Passed</option>
				<option value="FAILED">Failed</option>
				<option value="BLOCKED">Blocked</option>
				<option value="SKIPPED">Skipped</option>
				<option value="RETEST">Retest</option>
				<option value="UNTESTED">Untested</option>
			</select>

			<!-- Priority Filter -->
			<select class="select w-full lg:w-48" bind:value={selectedPriority}>
				<option value="">All Priorities</option>
				<option value="CRITICAL">Critical</option>
				<option value="HIGH">High</option>
				<option value="MEDIUM">Medium</option>
				<option value="LOW">Low</option>
			</select>

			<!-- Type Filter -->
			<select class="select w-full lg:w-48" bind:value={selectedType}>
				<option value="">All Types</option>
				<option value="FUNCTIONAL">Functional</option>
				<option value="REGRESSION">Regression</option>
				<option value="SMOKE">Smoke</option>
				<option value="INTEGRATION">Integration</option>
				<option value="PERFORMANCE">Performance</option>
				<option value="SECURITY">Security</option>
				<option value="UI">UI</option>
				<option value="API">API</option>
				<option value="UNIT">Unit</option>
				<option value="E2E">E2E</option>
			</select>
		</div>

		<!-- Results Summary -->
		<div class="text-surface-600-300 flex items-center gap-4 text-sm">
			<span>Showing {testResults.length} of {total} results</span>
			{#if search || selectedStatus || selectedPriority || selectedType}
				<button
					class="text-primary-500 hover:underline"
					onclick={() => {
						search = '';
						selectedStatus = '';
						selectedPriority = '';
						selectedType = '';
						currentPage = 1;
						fetchTestResults();
					}}
				>
					Clear filters
				</button>
			{/if}
		</div>
	</div>

	<!-- Test Results List -->
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<Loader2 class="h-8 w-8 animate-spin text-primary-500" />
		</div>
	{:else if testResults.length === 0}
		<div class="card p-12 text-center">
			<Play class="mx-auto mb-4 h-16 w-16 text-surface-400" />
			<h2 class="mb-2 text-xl font-bold">No test results found</h2>
			<p class="text-surface-600-300">
				{#if search || selectedStatus || selectedPriority || selectedType}
					Try adjusting your filters
				{:else}
					This test run has no results yet
				{/if}
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each groupedResults as group}
				{@const suiteId = group.suite?.id || 'uncategorized'}
				{@const isExpanded = expandedSuites.has(suiteId)}

				<!-- Suite Group -->
				<div class="overflow-hidden card">
					<!-- Suite Header -->
					<button
						class="hover:bg-surface-50-900 border-surface-200-700 flex w-full items-center gap-3 border-b bg-surface-100-900 px-4 py-3 text-left transition-colors"
						onclick={() => toggleSuite(suiteId)}
					>
						{#if isExpanded}
							<ChevronDown class="h-5 w-5 text-surface-500" />
						{:else}
							<ChevronRight class="h-5 w-5 text-surface-500" />
						{/if}
						<Folder class="h-5 w-5 text-primary-500" />
						<div class="flex-1">
							{#if group.suite}
								<div class="flex items-center gap-2">
									<h3 class="font-semibold">{group.suite.name}</h3>
									{#if group.suite.path.length > 1}
										<span class="text-surface-600-300 text-xs">
											({group.suite.path
												.slice(0, -1)
												.map((s) => s.name)
												.join(' > ')})
										</span>
									{/if}
								</div>
							{:else}
								<h3 class="font-semibold">Uncategorized</h3>
							{/if}
						</div>
						<span class="badge preset-outlined-surface-500">
							{group.results.length}
							{group.results.length === 1 ? 'test' : 'tests'}
						</span>
					</button>

					<!-- Test Results in Suite -->
					{#if isExpanded}
						<div class="divide-surface-200-700 divide-y">
							{#each group.results as result (result.id)}
								{@const Icon = getStatusIcon(result.status)}
								<div>
									<!-- Main Row (Clickable) -->
									<button
										class="hover:bg-surface-50-900 flex w-full items-center gap-4 p-4 text-left transition-colors"
										onclick={() => toggleResult(result.id)}
									>
										<!-- Status Icon -->
										<div>
											<Icon
												class="h-6 w-6 {result.status === 'PASSED'
													? 'text-success-500'
													: result.status === 'FAILED'
														? 'text-error-500'
														: result.status === 'BLOCKED'
															? 'text-warning-500'
															: 'text-surface-500'}"
											/>
										</div>

										<!-- Test Case Info -->
										<div class="min-w-0 flex-1">
											<div class="mb-1">
												<h4 class="truncate font-medium">{result.testCase.title}</h4>
											</div>
											<div class="text-surface-600-300 flex items-center gap-3 text-xs">
												<span class={getPriorityColor(result.testCase.priority)}>
													{result.testCase.priority}
												</span>
												<span>• {result.testCase.type}</span>
												<span>• {formatDuration(result.duration)}</span>
												{#if result._count.attachments > 0}
													<span class="flex items-center gap-1">
														• <ImageIcon class="h-3 w-3" />
														{result._count.attachments}
													</span>
												{/if}
											</div>
										</div>

										<!-- Status Badge -->
										<span class="badge {getStatusColor(result.status)}">
											{result.status}
										</span>
									</button>

									<!-- Expanded Details -->
									{#if expandedResults.has(result.id)}
										<div class="bg-surface-50-900 border-surface-200-700 border-t p-4">
											<div class="space-y-4">
												<!-- Test Case Details -->
												{#if result.testCase.description}
													<div>
														<h4 class="mb-1 text-sm font-semibold">Description</h4>
														<p class="text-surface-600-300 text-sm">
															{result.testCase.description}
														</p>
													</div>
												{/if}

												<!-- Action Buttons Row (for failed tests) -->
												{#if result.status === 'FAILED'}
													<div class="flex flex-wrap gap-2">
														{#if !aiDiagnoses.has(result.id) && !loadingDiagnosis.has(result.id)}
															<button
																onclick={() => getDiagnosis(result.id)}
																class="btn flex-1 preset-tonal-primary"
															>
																<Sparkles class="h-4 w-4" />
																Get AI Diagnosis
															</button>
														{/if}
														<button
															onclick={() => openJiraModal(result)}
															class="btn flex-1 preset-tonal-warning"
														>
															<Bug class="h-4 w-4" />
															Create Jira Issue
														</button>
														{#if result.attachments && result.attachments.length > 0}
															<div class="flex-1">
																<AttachmentViewer attachments={result.attachments} />
															</div>
														{/if}
														<a
															href="/projects/{projectId}/cases/{result.testCase.id}"
															class="btn flex-1 preset-tonal-tertiary"
														>
															<FileText class="h-4 w-4" />
															View Test Case
														</a>
													</div>
												{/if}

												<!-- AI Diagnosis Display (when loaded) -->
												{#if result.status === 'FAILED'}
													{#if loadingDiagnosis.has(result.id)}
														<div
															class="rounded-container border border-primary-200-800 bg-primary-50-950 p-4"
														>
															<div class="flex items-center gap-3 text-primary-500">
																<Loader2 class="h-5 w-5 animate-spin" />
																<span class="font-medium">Analyzing failure with AI...</span>
															</div>
														</div>
													{:else if aiDiagnoses.has(result.id)}
														<div
															class="rounded-container border-2 border-primary-500 bg-primary-50-950 p-4"
														>
															<div class="mb-3 flex items-center justify-between gap-2">
																<div class="flex items-center gap-2">
																	<Sparkles class="h-5 w-5 text-primary-500" />
																	<h5 class="font-semibold text-primary-500">AI Diagnosis</h5>
																	{#if aiDiagnoses.get(result.id)?.cached}
																		<span class="text-xs text-surface-500">(cached)</span>
																	{/if}
																</div>
																<button
																	onclick={() => getDiagnosis(result.id, true)}
																	class="preset-tonal-primary-500 btn btn-sm"
																	title="Regenerate diagnosis"
																	disabled={loadingDiagnosis.has(result.id)}
																>
																	<Sparkles class="h-4 w-4" />
																	Regenerate
																</button>
															</div>
															<div class="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
																{aiDiagnoses.get(result.id)?.diagnosis}
															</div>
														</div>
													{/if}
												{/if}

												<!-- Error Details -->
												<ErrorDisplay
													errorMessage={result.errorMessage}
													stackTrace={result.stackTrace}
													compact={false}
												/>

												<!-- Test Steps -->
												{#if result.steps && result.steps.length > 0}
													<TestStepsViewer steps={result.steps} />
												{/if}

												<!-- Comment -->
												{#if result.comment}
													<div>
														<h4 class="mb-1 text-sm font-semibold">Comment</h4>
														<p class="text-surface-600-300 text-sm">{result.comment}</p>
													</div>
												{/if}

												<!-- Execution Info -->
												<div class="text-surface-600-300 flex items-center gap-6 text-xs">
													<span>
														Executed by: {result.executor.firstName
															? `${result.executor.firstName} ${result.executor.lastName || ''}`
															: result.executor.email}
													</span>
													<span>• {formatDate(result.executedAt)}</span>
												</div>

												<!-- View Test Case Button (for non-failed tests) -->
												{#if result.status !== 'FAILED'}
													<div class="flex gap-2">
														{#if result.attachments && result.attachments.length > 0}
															<div class="flex-1">
																<AttachmentViewer attachments={result.attachments} />
															</div>
														{/if}
														<a
															href="/projects/{projectId}/cases/{result.testCase.id}"
															class="btn flex-1 preset-tonal-tertiary"
														>
															<FileText class="h-4 w-4" />
															View Test Case
														</a>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				<button
					class="btn preset-outlined-surface-500 btn-sm"
					disabled={currentPage === 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
				</button>

				{#if currentPage > 2}
					<button class="btn preset-outlined-surface-500 btn-sm" onclick={() => goToPage(1)}>
						1
					</button>
					{#if currentPage > 3}
						<span class="text-surface-500">...</span>
					{/if}
				{/if}

				{#if currentPage > 1}
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={() => goToPage(currentPage - 1)}
					>
						{currentPage - 1}
					</button>
				{/if}

				<button class="btn preset-filled-primary-500 btn-sm" disabled>
					{currentPage}
				</button>

				{#if currentPage < totalPages}
					<button
						class="btn preset-outlined-surface-500 btn-sm"
						onclick={() => goToPage(currentPage + 1)}
					>
						{currentPage + 1}
					</button>
				{/if}

				{#if currentPage < totalPages - 1}
					{#if currentPage < totalPages - 2}
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
					disabled={currentPage === totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					<ChevronRight class="h-4 w-4" />
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Jira Issue Modal -->
<JiraIssueModal
	bind:open={showJiraModal}
	onClose={() => (showJiraModal = false)}
	testCaseId={jiraModalTestCaseId}
	testResultId={jiraModalTestResultId}
	prefillSummary={jiraModalSummary}
	prefillDescription={jiraModalDescription}
/>
