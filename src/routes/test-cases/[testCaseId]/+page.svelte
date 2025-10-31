<script lang="ts">
	import {
		TestTube2,
		Clock,
		User,
		FolderOpen,
		Calendar,
		Tag,
		CheckCircle2,
		XCircle,
		AlertCircle,
		Edit,
		ArrowLeft,
		Sparkles,
		Loader2
	} from 'lucide-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import AttachmentViewer from '$lib/components/AttachmentViewer.svelte';
	import LoadMoreButton from '$lib/components/LoadMoreButton.svelte';

	let { data } = $props();
	let { testCase } = $derived(data);

	// Strip ANSI escape codes from text (color codes, formatting, etc.)
	function stripAnsi(text: string | null): string {
		if (!text) return '';
		// Remove ANSI escape codes: \x1b[...m or \u001b[...m
		return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
	}

	// Pagination state for execution history
	let allResults = $state(testCase.results);
	let resultsPage = $state(1);
	let loadingMore = $state(false);
	let hasMoreResults = $state(testCase.results.length === 10); // Initial load is 10

	// AI Diagnosis state
	let aiDiagnoses = $state<Map<string, { diagnosis: string; generatedAt?: Date; cached?: boolean }>>(new Map());
	let loadingDiagnosis = $state<Set<string>>(new Set());
	let expandedResults = $state<Set<string>>(new Set());

	async function loadMoreResults() {
		if (loadingMore || !hasMoreResults) return;

		loadingMore = true;
		try {
			const nextPage = resultsPage + 1;
			const response = await fetch(
				`/api/test-cases/${testCase.id}/results?page=${nextPage}&limit=10`
			);

			if (response.ok) {
				const data = await response.json();
				allResults = [...allResults, ...data.data];
				hasMoreResults = data.pagination.hasMore;
				resultsPage = nextPage;
			}
		} catch (error) {
			console.error('Failed to load more results:', error);
		} finally {
			loadingMore = false;
		}
	}

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
		return {
			PASSED: CheckCircle2,
			FAILED: XCircle,
			BLOCKED: AlertCircle,
			SKIPPED: Clock,
			RETEST: Clock,
			UNTESTED: Clock
		}[status] || Clock;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getPriorityColor(priority: string) {
		const colors: Record<string, string> = {
			CRITICAL: 'preset-filled-error-500',
			HIGH: 'preset-filled-warning-500',
			MEDIUM: 'preset-filled-primary-500',
			LOW: 'preset-filled-surface-500'
		};
		return colors[priority] || 'preset-filled-surface-500';
	}

	function toggleResult(resultId: string) {
		if (expandedResults.has(resultId)) {
			expandedResults.delete(resultId);
		} else {
			expandedResults.add(resultId);
		}
		expandedResults = new Set(expandedResults);
	}

	// AI Diagnosis for failed tests
	async function getDiagnosis(resultId: string, regenerate = false) {
		if (aiDiagnoses.has(resultId) && !regenerate) return;

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
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<a
			href="/projects/{testCase.project.id}"
			class="inline-flex items-center gap-2 text-primary-500 hover:underline mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to {testCase.project.name}
		</a>

		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-3 mb-3">
					<div class="p-3 bg-primary-500/10 rounded-lg">
						<TestTube2 class="w-8 h-8 text-primary-500" />
					</div>
					<div>
						<h1 class="text-3xl font-bold">{testCase.title}</h1>
						<p class="text-surface-600-300">
							{testCase.project.key} · {testCase.suite?.name || 'Uncategorized'}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<span class="badge {getPriorityColor(testCase.priority)}">{testCase.priority}</span>
					<span class="badge preset-filled-surface-500">{testCase.type}</span>
					<span class="badge preset-outlined-surface-500">{testCase.automationStatus}</span>
					{#each testCase.tags as tag}
						<span class="badge preset-outlined-primary-500">
							<Tag class="w-3 h-3 mr-1" />
							{tag}
						</span>
					{/each}
				</div>
			</div>

			<button class="btn preset-filled-primary-500">
				<Edit class="w-4 h-4 mr-2" />
				Edit
			</button>
		</div>
	</div>

	<div class="grid lg:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Description -->
			{#if testCase.description}
				<div class="card p-6">
					<h2 class="font-bold text-lg mb-3">Description</h2>
					<p class="text-surface-600-300">{testCase.description}</p>
				</div>
			{/if}

			<!-- Preconditions -->
			{#if testCase.preconditions}
				<div class="card p-6">
					<h2 class="font-bold text-lg mb-3">Preconditions</h2>
					<p class="text-surface-600-300">{testCase.preconditions}</p>
				</div>
			{/if}

			<!-- Test Steps -->
			{#if testCase.steps}
				<div class="card p-6">
					<h2 class="font-bold text-lg mb-3">Test Steps</h2>
					{#if Array.isArray(testCase.steps)}
						<ol class="list-decimal list-inside space-y-2">
							{#each testCase.steps as step}
								<li class="text-surface-600-300">{step}</li>
							{/each}
						</ol>
					{:else}
						<p class="text-surface-600-300">{testCase.steps}</p>
					{/if}
				</div>
			{/if}

			<!-- Expected Result -->
			{#if testCase.expectedResult}
				<div class="card p-6">
					<h2 class="font-bold text-lg mb-3">Expected Result</h2>
					<p class="text-surface-600-300">{testCase.expectedResult}</p>
				</div>
			{/if}

			<!-- Execution History -->
			<div class="card p-6">
				<h2 class="font-bold text-lg mb-4">Execution History</h2>

				{#if allResults.length > 0}
					<div class="space-y-3">
						{#each allResults as result}
							{@const StatusIcon = getStatusIcon(result.status)}
							<div
								class="p-4 rounded-container border border-surface-200-700 hover:border-primary-500 transition-colors"
							>
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-3">
										<span class="badge {getStatusColor(result.status)}">
											<StatusIcon class="w-3 h-3 mr-1" />
											{result.status}
										</span>
										<span class="text-sm font-medium">{result.testRun.name}</span>
									</div>
									{#if result.duration}
										<span class="text-sm text-surface-600-300">
											{Math.round(result.duration / 1000)}s
										</span>
									{/if}
								</div>

								<div class="text-sm text-surface-600-300 flex items-center gap-4">
									<span>
										{result.executor.firstName || result.executor.email}
									</span>
									<span>{formatDate(result.executedAt)}</span>
								</div>

								{#if result.comment}
									<p class="text-sm text-surface-600-300 mt-2">{result.comment}</p>
								{/if}

								{#if result.errorMessage}
									<div class="mt-2 p-3 bg-error-500/10 rounded-base">
										<p class="text-sm text-error-500 whitespace-pre-wrap break-words">{stripAnsi(result.errorMessage)}</p>
									</div>
								{/if}

								<!-- AI Diagnosis for Failed Tests -->
								{#if result.status === 'FAILED'}
									<div class="mt-3 pt-3 border-t border-surface-200-700">
										{#if !aiDiagnoses.has(result.id) && !loadingDiagnosis.has(result.id)}
											<button
												onclick={() => getDiagnosis(result.id)}
												class="btn preset-tonal-primary-500 btn-sm"
											>
												<Sparkles class="h-4 w-4" />
												Get AI Diagnosis
											</button>
										{:else if loadingDiagnosis.has(result.id)}
											<div class="flex items-center gap-2 text-sm text-primary-500">
												<Loader2 class="h-4 w-4 animate-spin" />
												<span>Analyzing failure with AI...</span>
											</div>
										{:else if aiDiagnoses.has(result.id)}
											<div class="rounded-container border-2 border-primary-500 bg-primary-50-950 p-3">
												<div class="mb-2 flex items-center justify-between gap-2">
													<div class="flex items-center gap-2">
														<Sparkles class="h-4 w-4 text-primary-500" />
														<h5 class="text-sm font-semibold text-primary-500">AI Diagnosis</h5>
														{#if aiDiagnoses.get(result.id)?.cached}
															<span class="text-xs text-surface-500">(cached)</span>
														{/if}
													</div>
													<button
														onclick={() => getDiagnosis(result.id, true)}
														class="btn btn-sm preset-tonal-primary-500"
														title="Regenerate diagnosis"
														disabled={loadingDiagnosis.has(result.id)}
													>
														<Sparkles class="h-3 w-3" />
														Regenerate
													</button>
												</div>
												<div class="prose prose-sm max-w-none whitespace-pre-wrap text-xs">
													{aiDiagnoses.get(result.id)?.diagnosis}
												</div>
											</div>
										{/if}
									</div>
								{/if}

								{#if result.attachments && result.attachments.length > 0}
									<div class="mt-3 pt-3 border-t border-surface-200-700">
										<AttachmentViewer attachments={result.attachments} />
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Load More Button -->
					<div class="mt-4">
						<LoadMoreButton
							loading={loadingMore}
							hasMore={hasMoreResults}
							onLoadMore={loadMoreResults}
						/>
					</div>
				{:else}
					<div class="text-center py-8 text-surface-600-300">
						<Clock class="w-12 h-12 mx-auto mb-2 opacity-50" />
						<p>No execution history yet</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Details -->
			<div class="card p-6">
				<h2 class="font-bold text-lg mb-4">Details</h2>

				<div class="space-y-4 text-sm">
					<div>
						<div class="text-surface-600-300 mb-1">Created By</div>
						<div class="flex items-center gap-2">
							<Avatar class="w-6 h-6">
								{#if testCase.creator.imageUrl}
									<Avatar.Image src={testCase.creator.imageUrl} alt={testCase.creator.email} />
								{/if}
								<Avatar.Fallback>
									{testCase.creator.firstName?.[0] || testCase.creator.email[0].toUpperCase()}
								</Avatar.Fallback>
							</Avatar>
							<span>
								{testCase.creator.firstName && testCase.creator.lastName
									? `${testCase.creator.firstName} ${testCase.creator.lastName}`
									: testCase.creator.email}
							</span>
						</div>
					</div>

					<div>
						<div class="text-surface-600-300 mb-1">Project</div>
						<a
							href="/projects/{testCase.project.id}"
							class="flex items-center gap-2 text-primary-500 hover:underline"
						>
							<FolderOpen class="w-4 h-4" />
							{testCase.project.name}
						</a>
					</div>

					{#if testCase.suite}
						<div>
							<div class="text-surface-600-300 mb-1">Test Suite</div>
							<div class="flex items-center gap-2">
								<FolderOpen class="w-4 h-4 text-primary-500" />
								{testCase.suite.name}
							</div>
						</div>
					{/if}

					<div>
						<div class="text-surface-600-300 mb-1">Created</div>
						<div class="flex items-center gap-2">
							<Calendar class="w-4 h-4" />
							{formatDate(testCase.createdAt)}
						</div>
					</div>

					<div>
						<div class="text-surface-600-300 mb-1">Last Updated</div>
						<div class="flex items-center gap-2">
							<Clock class="w-4 h-4" />
							{formatDate(testCase.updatedAt)}
						</div>
					</div>
				</div>
			</div>

			<!-- Quick Stats -->
			<div class="card p-6">
				<h2 class="font-bold text-lg mb-4">Statistics</h2>

				<div class="space-y-3 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Total Executions</span>
						<span class="font-bold text-lg">{testCase.results.length}</span>
					</div>

					{#if testCase.results.length > 0}
						{@const passedCount = testCase.results.filter((r) => r.status === 'PASSED').length}
						{@const passRate = Math.round((passedCount / testCase.results.length) * 100)}
						<div class="flex items-center justify-between">
							<span class="text-surface-600-300">Pass Rate</span>
							<span class="font-bold text-lg text-success-500">{passRate}%</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
