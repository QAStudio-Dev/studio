<script lang="ts">
	import {
		TrendingUp,
		Clock,
		AlertTriangle,
		Shuffle,
		CheckCircle2,
		XCircle,
		Play,
		Loader2,
		Calendar,
		BarChart3
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	// Type definitions for analytics data
	interface TestStats {
		totalTestRuns: number;
		completedTestRuns: number;
		totalTests: number;
		passedTests: number;
		failedTests: number;
		passRate: number;
		avgTestDuration: number;
	}

	interface DayStats {
		date: string;
		total: number;
		passed: number;
		failed: number;
	}

	interface TestMetrics {
		id: string;
		title: string;
		totalRuns: number;
		failures: number;
		retries: number;
		failureRate: number;
		problemScore: number;
	}

	interface SlowTest {
		id: string;
		title: string;
		avgDuration: number;
		maxDuration: number;
		count: number;
	}

	interface AnalyticsData {
		stats: TestStats;
		runsOverTime: DayStats[];
		problematicTests: TestMetrics[];
		slowestTests: SlowTest[];
		flakyTests: TestMetrics[];
		dateRange: {
			start: string;
			end: string;
			days: number;
		};
	}

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedProjectId = $state<string | null>(null);
	let selectedDays = $state(7);
	let analytics = $state<AnalyticsData | null>(null);

	// Project list from page data
	let projects = $derived(data.projects || []);

	async function fetchAnalytics() {
		if (!selectedProjectId) return;

		loading = true;
		error = null;
		try {
			const res = await fetch(
				`/api/reports/analytics?projectId=${selectedProjectId}&days=${selectedDays}`
			);
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to fetch analytics');
			}
			analytics = await res.json();
		} catch (err) {
			console.error('Failed to fetch analytics:', err);
			error = err instanceof Error ? err.message : 'Failed to load analytics data';
			analytics = null;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Auto-select first project if available
		if (projects.length > 0) {
			selectedProjectId = projects[0].id;
			fetchAnalytics();
		} else {
			loading = false;
		}
	});

	function formatDuration(ms: number | null | undefined): string {
		if (!ms) return '0ms';
		if (ms < 1000) return `${Math.round(ms)}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
		return `${(ms / 3600000).toFixed(1)}h`;
	}

	function formatNumber(num: number): string {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toString();
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getBarHeight(value: number, max: number): number {
		if (max === 0) return 0;
		return Math.max((value / max) * 100, 2); // Minimum 2% for visibility
	}
</script>

<svelte:head>
	<title>Reports & Analytics | QA Studio</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="mb-2 text-4xl font-bold">Reports & Analytics</h1>
				<p class="text-surface-600-300 text-lg">
					Insights into test performance, flaky tests, and execution trends
				</p>
			</div>
		</div>
	</div>

	{#if projects.length === 0}
		<!-- Empty State -->
		<div class="mx-auto max-w-2xl card p-12 text-center">
			<div class="mb-6">
				<div
					class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-500/10"
				>
					<BarChart3 class="h-12 w-12 text-primary-500" />
				</div>
				<h2 class="mb-2 text-3xl font-bold">No Projects Yet</h2>
				<p class="text-surface-600-300 mb-8 text-lg">
					Create a project and run some tests to see analytics here.
				</p>
			</div>
			<a href="/projects/new" class="btn preset-filled-primary-500 px-8 py-4">
				Create Your First Project
			</a>
		</div>
	{:else}
		<!-- Filters -->
		<div class="mb-6 card p-4">
			<div class="flex flex-wrap items-center gap-4">
				<!-- Project Selector -->
				<div class="flex items-center gap-2">
					<label for="project-select" class="text-sm font-medium">Project:</label>
					<select
						id="project-select"
						bind:value={selectedProjectId}
						onchange={() => fetchAnalytics()}
						class="select"
					>
						{#each projects as project}
							<option value={project.id}>{project.name} ({project.key})</option>
						{/each}
					</select>
				</div>

				<!-- Days Selector -->
				<div class="flex items-center gap-2">
					<label for="days-select" class="text-sm font-medium">Time Range:</label>
					<select
						id="days-select"
						bind:value={selectedDays}
						onchange={() => fetchAnalytics()}
						class="select"
					>
						<option value={7}>Last 7 days</option>
						<option value={14}>Last 14 days</option>
						<option value={30}>Last 30 days</option>
						<option value={90}>Last 90 days</option>
					</select>
				</div>

				<button
					onclick={() => fetchAnalytics()}
					class="ml-auto btn preset-filled-surface-500 btn-sm"
				>
					Refresh
				</button>
			</div>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-20">
				<Loader2 class="h-8 w-8 animate-spin text-primary-500" />
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="mx-auto max-w-2xl card p-12 text-center">
				<div class="mb-6">
					<div
						class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-error-500/10"
					>
						<AlertTriangle class="h-12 w-12 text-error-500" />
					</div>
					<h2 class="mb-2 text-3xl font-bold">Error Loading Analytics</h2>
					<p class="text-surface-600-300 mb-8 text-lg">{error}</p>
				</div>
				<button
					onclick={() => fetchAnalytics()}
					class="btn preset-filled-primary-500 px-8 py-4"
				>
					Try Again
				</button>
			</div>
		{:else if analytics}
			<!-- Stats Grid -->
			<div class="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Total Test Runs -->
				<div class="card p-6">
					<div class="mb-4 flex items-center justify-between gap-2">
						<div class="flex-shrink-0 rounded-lg bg-primary-500/10 p-3">
							<Play class="h-6 w-6 text-primary-500" />
						</div>
						<span
							class="truncate text-3xl font-bold"
							title={analytics.stats.totalTestRuns.toString()}
						>
							{formatNumber(analytics.stats.totalTestRuns)}
						</span>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Test Runs</h3>
					<p class="text-surface-500-400 mt-1 text-xs">
						{formatNumber(analytics.stats.completedTestRuns)} completed
					</p>
				</div>

				<!-- Total Tests -->
				<div class="card p-6">
					<div class="mb-4 flex items-center justify-between gap-2">
						<div class="flex-shrink-0 rounded-lg bg-secondary-500/10 p-3">
							<CheckCircle2 class="h-6 w-6 text-secondary-500" />
						</div>
						<span
							class="truncate text-3xl font-bold"
							title={analytics.stats.totalTests.toString()}
						>
							{formatNumber(analytics.stats.totalTests)}
						</span>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Test Executions</h3>
					<p
						class="text-surface-500-400 mt-1 truncate text-xs"
						title="{analytics.stats.passedTests} passed, {analytics.stats
							.failedTests} failed"
					>
						{formatNumber(analytics.stats.passedTests)} passed, {formatNumber(
							analytics.stats.failedTests
						)} failed
					</p>
				</div>

				<!-- Pass Rate -->
				<div class="card p-6">
					<div class="mb-4 flex items-center justify-between gap-2">
						<div class="flex-shrink-0 rounded-lg bg-success-500/10 p-3">
							<TrendingUp class="h-6 w-6 text-success-500" />
						</div>
						<span class="truncate text-3xl font-bold">
							{analytics.stats.passRate.toFixed(1)}%
						</span>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Pass Rate</h3>
				</div>

				<!-- Avg Duration -->
				<div class="card p-6">
					<div class="mb-4 flex items-center justify-between gap-2">
						<div class="flex-shrink-0 rounded-lg bg-tertiary-500/10 p-3">
							<Clock class="h-6 w-6 text-tertiary-500" />
						</div>
						<span
							class="truncate text-2xl font-bold"
							title="{analytics.stats.avgTestDuration}ms"
						>
							{formatDuration(analytics.stats.avgTestDuration)}
						</span>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Avg Test Duration</h3>
				</div>
			</div>

			<!-- Charts Grid -->
			<div class="mb-8 grid gap-8 lg:grid-cols-2">
				<!-- Test Runs Over Time -->
				<div class="card p-6">
					<h2 class="mb-6 flex items-center gap-2 text-xl font-bold">
						<Calendar class="h-5 w-5" />
						Test Runs Over Time
					</h2>

					{#if analytics.runsOverTime.length === 0}
						<div class="py-12 text-center">
							<p class="text-surface-600-300 text-sm">No test runs in this period</p>
						</div>
					{:else}
						{@const maxRuns = Math.max(
							...analytics.runsOverTime.map((d: any) => d.total)
						)}
						<div class="max-h-[900px] overflow-y-auto pr-2">
							<div class="space-y-3">
								{#each analytics.runsOverTime as day}
									<div>
										<div class="mb-1 flex items-center justify-between text-sm">
											<span class="text-surface-600-300"
												>{formatDate(day.date)}</span
											>
											<div class="flex items-center gap-3 text-xs">
												<span class="text-success-500"
													>{day.passed} passed</span
												>
												<span class="text-error-500"
													>{day.failed} failed</span
												>
												<span class="font-medium">{day.total} total</span>
											</div>
										</div>
										<div
											class="bg-surface-100-800 relative h-8 w-full overflow-hidden rounded-container"
										>
											{#if day.passed > 0}
												<div
													class="absolute top-0 left-0 h-full bg-success-500"
													style="width: {getBarHeight(
														day.passed,
														maxRuns
													)}%"
												></div>
											{/if}
											{#if day.failed > 0}
												<div
													class="absolute top-0 h-full bg-error-500"
													style="left: {getBarHeight(
														day.passed,
														maxRuns
													)}%; width: {getBarHeight(
														day.failed,
														maxRuns
													)}%"
												></div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Flaky Tests -->
				<div class="card p-6">
					<h2 class="mb-6 flex items-center gap-2 text-xl font-bold">
						<Shuffle class="h-5 w-5" />
						Flaky Tests
					</h2>

					{#if analytics.flakyTests.length === 0}
						<div class="py-12 text-center">
							<CheckCircle2 class="mx-auto mb-2 h-12 w-12 text-success-500" />
							<p class="text-surface-600-300 text-sm">No flaky tests detected!</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each analytics.flakyTests as test}
								<a
									href="/projects/{selectedProjectId}/cases/{test.id}"
									class="hover:bg-surface-100-800 border-surface-200-700 block rounded-container border p-3 transition-colors"
								>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="flex-1 text-sm font-medium">{test.title}</h3>
										<span
											class="ml-2 badge preset-filled-warning-500 text-xs"
											title="Failure rate"
										>
											{test.failureRate.toFixed(0)}%
										</span>
									</div>
									<div
										class="text-surface-600-300 flex items-center gap-4 text-xs"
									>
										<span>{test.totalRuns} runs</span>
										<span>{test.failures} failures</span>
										{#if test.retries > 0}
											<span>{test.retries} retries</span>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Tables Grid -->
			<div class="grid gap-8 lg:grid-cols-2">
				<!-- Most Problematic Tests -->
				<div class="card p-6">
					<h2 class="mb-6 flex items-center gap-2 text-xl font-bold">
						<AlertTriangle class="h-5 w-5" />
						Most Problematic Tests
					</h2>

					{#if analytics.problematicTests.length === 0}
						<div class="py-12 text-center">
							<CheckCircle2 class="mx-auto mb-2 h-12 w-12 text-success-500" />
							<p class="text-surface-600-300 text-sm">All tests passing!</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each analytics.problematicTests as test}
								<a
									href="/projects/{selectedProjectId}/cases/{test.id}"
									class="hover:bg-surface-100-800 border-surface-200-700 block rounded-container border p-3 transition-colors"
								>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="flex-1 text-sm font-medium">{test.title}</h3>
										<span
											class="ml-2 badge preset-filled-error-500 text-xs"
											title="Problem score (failures × 2 + retries)"
										>
											Score: {test.problemScore}
										</span>
									</div>
									<div
										class="text-surface-600-300 flex items-center gap-4 text-xs"
									>
										<span class="flex items-center gap-1">
											<XCircle class="h-3 w-3" />
											{test.failures} failures
										</span>
										{#if test.retries > 0}
											<span>{test.retries} retries</span>
										{/if}
										<span>{test.failureRate.toFixed(0)}% fail rate</span>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Slowest Tests -->
				<div class="card p-6">
					<h2 class="mb-6 flex items-center gap-2 text-xl font-bold">
						<Clock class="h-5 w-5" />
						Slowest Tests
					</h2>

					{#if analytics.slowestTests.length === 0}
						<div class="py-12 text-center">
							<p class="text-surface-600-300 text-sm">
								No test duration data available
							</p>
						</div>
					{:else}
						{@const maxDuration = Math.max(
							...analytics.slowestTests.map((t: any) => t.avgDuration)
						)}
						<div class="space-y-3">
							{#each analytics.slowestTests as test}
								<a
									href="/projects/{selectedProjectId}/cases/{test.id}"
									class="hover:bg-surface-100-800 border-surface-200-700 block rounded-container border p-3 transition-colors"
								>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="flex-1 text-sm font-medium">{test.title}</h3>
										<span class="ml-2 font-mono text-xs">
											{formatDuration(test.avgDuration)}
										</span>
									</div>
									<div class="text-surface-600-300 mb-2 text-xs">
										Max: {formatDuration(test.maxDuration)} · {test.count} runs
									</div>
									<div
										class="bg-surface-100-800 h-1.5 w-full overflow-hidden rounded-full"
									>
										<div
											class="h-full bg-tertiary-500"
											style="width: {getBarHeight(
												test.avgDuration,
												maxDuration
											)}%"
										></div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
