<script lang="ts">
	import type { PageData } from './$types';
	import type { AnalysisCategory } from '$prisma/client';
	import {
		TrendingUp,
		AlertCircle,
		CheckCircle,
		Clock,
		Target,
		Activity,
		Sparkles
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const { project, stats } = data;

	function getCategoryTonalClass(category: AnalysisCategory): string {
		const classes: Record<AnalysisCategory, string> = {
			STALE_LOCATOR: 'badge preset-tonal-warning-500',
			TIMING_ISSUE: 'badge preset-tonal-tertiary-500',
			NETWORK_ERROR: 'badge preset-tonal-error-500',
			ASSERTION_FAILURE: 'badge preset-tonal-secondary-500',
			DATA_ISSUE: 'badge preset-tonal-primary-500',
			ENVIRONMENT_ISSUE: 'badge preset-tonal-warning-500',
			CONFIGURATION_ERROR: 'badge preset-tonal-error-500',
			OTHER: 'badge preset-tonal-surface-500'
		};
		return classes[category] || 'badge preset-tonal-surface-500';
	}

	function getCategoryFilledClass(category: AnalysisCategory): string {
		const classes: Record<AnalysisCategory, string> = {
			STALE_LOCATOR: 'badge preset-filled-warning-500',
			TIMING_ISSUE: 'badge preset-filled-tertiary-500',
			NETWORK_ERROR: 'badge preset-filled-error-500',
			ASSERTION_FAILURE: 'badge preset-filled-secondary-500',
			DATA_ISSUE: 'badge preset-filled-primary-500',
			ENVIRONMENT_ISSUE: 'badge preset-filled-warning-500',
			CONFIGURATION_ERROR: 'badge preset-filled-error-500',
			OTHER: 'badge preset-filled-surface-500'
		};
		return classes[category] || 'badge preset-filled-surface-500';
	}

	function getCategoryIcon(category: AnalysisCategory): string {
		const icons: Record<AnalysisCategory, string> = {
			STALE_LOCATOR: '🔍',
			TIMING_ISSUE: '⏱️',
			NETWORK_ERROR: '🌐',
			ASSERTION_FAILURE: '✅',
			DATA_ISSUE: '📊',
			ENVIRONMENT_ISSUE: '🖥️',
			CONFIGURATION_ERROR: '⚙️',
			OTHER: '🔧'
		};
		return icons[category] || '🔧';
	}

	function formatCategory(category: AnalysisCategory): string {
		return category.replace(/_/g, ' ');
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Calculate category percentages for visualization
	const categoryData = $derived(() => {
		if (!stats) return [];
		const total = stats.totalAnalyzed;
		if (total === 0) return [];

		return Object.entries(stats.categoryBreakdown)
			.filter(([_, count]) => count > 0)
			.map(([category, count]) => ({
				category: category as AnalysisCategory,
				count,
				percentage: (count / total) * 100
			}))
			.sort((a, b) => b.count - a.count);
	});
</script>

{#if project && stats}
	<div class="container mx-auto space-y-8 p-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="flex items-center gap-3 h1">
					<Sparkles class="h-8 w-8 text-primary-500" />
					AI Healing Dashboard
				</h1>
				<p class="text-surface-600-300 mt-2">
					Project: <span class="font-semibold">{project.name}</span>
				</p>
			</div>
		</div>

		{#if stats.totalAnalyzed === 0}
			<!-- Empty State -->
			<div class="bg-surface-100-800 space-y-4 card rounded-container p-12 text-center">
				<div class="flex justify-center">
					<AlertCircle class="h-16 w-16 text-surface-400-600" />
				</div>
				<h2 class="h2">No AI Analyses Yet</h2>
				<p class="text-surface-600-300 mx-auto max-w-lg">
					AI trace analyses will appear here once you start analyzing test failures. Run
					tests with trace files and use the "Analyze Trace" button on failed tests.
				</p>
			</div>
		{:else}
			<!-- Stats Overview -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Total Analyzed -->
				<div
					class="card rounded-container border border-primary-500/20 bg-primary-500/10 p-6"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-surface-600-300 text-sm">Total Analyzed</p>
							<p class="text-3xl font-bold text-primary-500">{stats.totalAnalyzed}</p>
						</div>
						<Activity class="h-10 w-10 text-primary-500 opacity-50" />
					</div>
				</div>

				<!-- Avg Confidence -->
				<div
					class="card rounded-container border border-success-500/20 bg-success-500/10 p-6"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-surface-600-300 text-sm">Avg Confidence</p>
							<p class="text-3xl font-bold text-success-500">
								{Math.round(stats.avgConfidence * 100)}%
							</p>
						</div>
						<TrendingUp class="h-10 w-10 text-success-500 opacity-50" />
					</div>
				</div>

				<!-- Fixes Applied -->
				<div
					class="card rounded-container border border-tertiary-500/20 bg-tertiary-500/10 p-6"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-surface-600-300 text-sm">Fixes Applied</p>
							<p class="text-3xl font-bold text-tertiary-500">{stats.fixesApplied}</p>
						</div>
						<CheckCircle class="h-10 w-10 text-tertiary-500 opacity-50" />
					</div>
				</div>

				<!-- Time Saved Estimate -->
				<div
					class="card rounded-container border border-warning-500/20 bg-warning-500/10 p-6"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-surface-600-300 text-sm">Est. Time Saved</p>
							<p class="text-3xl font-bold text-warning-500">
								{Math.round(stats.totalAnalyzed * 0.5)}h
							</p>
						</div>
						<Clock class="h-10 w-10 text-warning-500 opacity-50" />
					</div>
					<p class="text-surface-600-300 mt-2 text-xs">~30min per analysis</p>
				</div>
			</div>

			<!-- Category Breakdown -->
			<div class="bg-surface-100-800 card rounded-container p-6">
				<h2 class="mb-6 flex items-center gap-2 h2">
					<Target class="h-6 w-6" />
					Failure Categories
				</h2>

				<div class="space-y-4">
					{#each categoryData() as { category, count, percentage }}
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-2">
									<span>{getCategoryIcon(category)}</span>
									<span class="font-semibold">{formatCategory(category)}</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-surface-600-300">{count} failures</span>
									<span class="font-bold">{percentage.toFixed(1)}%</span>
								</div>
							</div>
							<div class="bg-surface-300-600 h-3 w-full overflow-hidden rounded-full">
								<div
									class="h-full rounded-full transition-all duration-500"
									class:bg-warning-500={category === 'STALE_LOCATOR'}
									class:bg-tertiary-500={category === 'TIMING_ISSUE'}
									class:bg-error-500={category === 'NETWORK_ERROR'}
									class:bg-secondary-500={category === 'ASSERTION_FAILURE'}
									class:bg-primary-500={category === 'DATA_ISSUE'}
									class:bg-accent-500={category === 'ENVIRONMENT_ISSUE'}
									class:bg-success-500={category === 'CONFIGURATION_ERROR'}
									class:bg-surface-500={category === 'OTHER'}
									style="width: {percentage}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Most Problematic Tests -->
			{#if stats.mostProblematicTests.length > 0}
				<div class="bg-surface-100-800 card rounded-container p-6">
					<h2 class="mb-6 flex items-center gap-2 h2">
						<AlertCircle class="h-6 w-6 text-error-500" />
						Most Problematic Tests
					</h2>

					<div class="space-y-3">
						{#each stats.mostProblematicTests as test}
							<div
								class="bg-surface-200-700 border-surface-300-600 rounded-container border p-4 transition-colors hover:border-primary-500"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 flex-1">
										<h3 class="truncate font-semibold">
											{test.testCase.title}
										</h3>
										<div class="mt-2 flex flex-wrap items-center gap-3">
											<span class="text-surface-600-300 text-sm">
												{test.failureCount} failures
											</span>
											<span class="text-surface-600-300 text-sm">
												{Math.round(test.avgConfidence * 100)}% confidence
											</span>
											<div class="flex items-center gap-1">
												{#each [...new Set(test.categories)].slice(0, 3) as category}
													<span
														class="{getCategoryTonalClass(
															category
														)} text-xs"
													>
														{getCategoryIcon(category)}
													</span>
												{/each}
											</div>
										</div>
									</div>
									<a
										href="/projects/{project.id}/test-cases/{test.testCase.id}"
										class="preset-filled-surface btn btn-sm"
									>
										View Test
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recent Analyses -->
			{#if stats.recentAnalyses.length > 0}
				<div class="bg-surface-100-800 card rounded-container p-6">
					<h2 class="mb-6 h2">Recent Analyses</h2>

					<div class="space-y-3">
						{#each stats.recentAnalyses as analysis}
							<div
								class="bg-surface-200-700 border-surface-300-600 rounded-container border p-4 transition-colors hover:border-primary-500"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0 flex-1">
										<div class="mb-2 flex items-center gap-2">
											<span class={getCategoryFilledClass(analysis.category)}>
												{getCategoryIcon(analysis.category)}
												{formatCategory(analysis.category)}
											</span>
											{#if analysis.wasFixed}
												<span class="badge preset-filled-success-500">
													<CheckCircle class="h-3 w-3" />
													Fixed
												</span>
											{/if}
										</div>
										<h3 class="truncate font-semibold">
											{analysis.testCase.title}
										</h3>
										<p class="text-surface-600-300 mt-1 line-clamp-2 text-sm">
											{analysis.rootCause}
										</p>
										<div
											class="text-surface-600-300 mt-2 flex items-center gap-4 text-xs"
										>
											<span>Run: {analysis.testRun.name}</span>
											<span>{formatDate(analysis.analyzedAt)}</span>
											<span
												>Confidence: {Math.round(
													analysis.confidence * 100
												)}%</span
											>
										</div>
									</div>
									<a
										href="/projects/{project.id}/runs/{analysis.testRun.id}"
										class="preset-filled-surface btn btn-sm"
									>
										View Details
									</a>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
{/if}
