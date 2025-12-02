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
		Loader2,
		ChevronDown,
		ChevronRight,
		X,
		Save,
		Play,
		Bug
	} from 'lucide-svelte';
	import { Avatar, Accordion } from '@skeletonlabs/skeleton-svelte';
	import AttachmentViewer from '$lib/components/AttachmentViewer.svelte';
	import LoadMoreButton from '$lib/components/LoadMoreButton.svelte';
	import JiraIssueModal from '$lib/components/JiraIssueModal.svelte';
	import TestStepsViewer from '$lib/components/TestStepsViewer.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { testCase } = $derived(data);

	// Edit mode state
	let showEditDialog = $state(false);
	let editForm = $state({
		title: '',
		description: '',
		preconditions: '',
		steps: '',
		expectedResult: '',
		priority: 'MEDIUM',
		type: 'FUNCTIONAL',
		automationStatus: 'NOT_AUTOMATED'
	});
	let savingEdit = $state(false);

	function openEditDialog() {
		// Reset form with current values
		editForm = {
			title: testCase.title,
			description: testCase.description || '',
			preconditions: testCase.preconditions || '',
			steps:
				(typeof testCase.steps === 'string'
					? testCase.steps
					: JSON.stringify(testCase.steps)) || '',
			expectedResult: testCase.expectedResult || '',
			priority: testCase.priority,
			type: testCase.type,
			automationStatus: testCase.automationStatus
		};
		showEditDialog = true;
	}

	async function handleSaveEdit() {
		if (!editForm.title.trim()) {
			alert('Title is required');
			return;
		}

		savingEdit = true;
		try {
			const res = await fetch(`/api/cases/${testCase.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editForm)
			});

			if (!res.ok) throw new Error('Failed to update test case');

			await invalidateAll();
			showEditDialog = false;
		} catch (err) {
			console.error(err);
			alert('Failed to update test case');
		} finally {
			savingEdit = false;
		}
	}

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
	let aiDiagnoses = $state<
		Map<string, { diagnosis: string; generatedAt?: Date; cached?: boolean }>
	>(new Map());
	let loadingDiagnosis = $state<Set<string>>(new Set());

	// Jira integration
	let showJiraModal = $state(false);
	let jiraModalSummary = $state('');
	let jiraModalDescription = $state('');

	function openJiraModal() {
		jiraModalSummary = `Test Case: ${testCase.title}`;
		jiraModalDescription = `**Test Case**: ${testCase.title}
**Project**: ${testCase.project.name} (${testCase.project.key})
**Priority**: ${testCase.priority}
**Type**: ${testCase.type}
**Automation Status**: ${testCase.automationStatus}

${testCase.description ? `**Description**:\n${testCase.description}\n\n` : ''}${testCase.preconditions ? `**Preconditions**:\n${testCase.preconditions}\n\n` : ''}**Test Steps**:
${testCase.steps || 'See test case for details'}

**Expected Result**:
${testCase.expectedResult || 'See test case for details'}`;
		showJiraModal = true;
	}

	async function loadMoreResults() {
		if (loadingMore || !hasMoreResults) return;

		loadingMore = true;
		try {
			const nextPage = resultsPage + 1;
			const response = await fetch(
				`/api/cases/${testCase.id}/results?page=${nextPage}&limit=10`
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
		return (
			{
				PASSED: CheckCircle2,
				FAILED: XCircle,
				BLOCKED: AlertCircle,
				SKIPPED: Clock,
				RETEST: Clock,
				UNTESTED: Clock
			}[status] || Clock
		);
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

<div class="container mx-auto max-w-[1600px] px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<a
			href="/projects/{testCase.project.id}"
			class="mb-4 inline-flex items-center gap-2 text-primary-500 hover:underline"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to {testCase.project.name}
		</a>

		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="mb-3 flex items-center gap-3">
					<div class="rounded-lg bg-primary-500/10 p-3">
						<TestTube2 class="h-8 w-8 text-primary-500" />
					</div>
					<div>
						<h1 class="text-3xl font-bold">{testCase.title}</h1>
						<p class="text-surface-600-300">
							{testCase.project.key} · {testCase.suite?.name || 'Uncategorized'}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<span class="badge {getPriorityColor(testCase.priority)}"
						>{testCase.priority}</span
					>
					<span class="badge preset-filled-surface-500">{testCase.type}</span>
					<span class="badge preset-outlined-surface-500"
						>{testCase.automationStatus}</span
					>
					{#each testCase.tags as tag}
						<span class="badge preset-outlined-primary-500">
							<Tag class="mr-1 h-3 w-3" />
							{tag}
						</span>
					{/each}
				</div>
			</div>

			<div class="flex gap-2">
				<button onclick={openJiraModal} class="preset-tonal-warning-500 btn">
					<Bug class="mr-2 h-4 w-4" />
					Create Jira Issue
				</button>
				<button onclick={openEditDialog} class="btn preset-filled-primary-500">
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</button>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Description -->
			{#if testCase.description}
				<div class="card p-6">
					<h2 class="mb-3 text-lg font-bold">Description</h2>
					<p class="text-surface-600-300">{testCase.description}</p>
				</div>
			{/if}

			<!-- Preconditions -->
			{#if testCase.preconditions}
				<div class="card p-6">
					<h2 class="mb-3 text-lg font-bold">Preconditions</h2>
					<p class="text-surface-600-300">{testCase.preconditions}</p>
				</div>
			{/if}

			<!-- Test Steps -->
			{#if testCase.steps}
				<div class="card p-6">
					<h2 class="mb-3 text-lg font-bold">Test Steps</h2>
					{#if Array.isArray(testCase.steps)}
						<ol class="list-inside list-decimal space-y-2">
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
					<h2 class="mb-3 text-lg font-bold">Expected Result</h2>
					<p class="text-surface-600-300">{testCase.expectedResult}</p>
				</div>
			{/if}

			<!-- Execution History -->
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-bold">Execution History</h2>

				{#if allResults.length > 0}
					<Accordion>
						{#each allResults as result}
							{@const StatusIcon = getStatusIcon(result.status)}
							<Accordion.Item value={result.id}>
								<Accordion.ItemTrigger
									class="border-surface-200-700 w-full rounded-container border p-4 transition-colors hover:border-primary-500"
								>
									<div class="flex w-full items-start justify-between">
										<div class="flex items-center gap-3">
											<ChevronRight
												class="h-4 w-4 transition-transform group-data-[state=open]:rotate-90"
											/>
											<span class="badge {getStatusColor(result.status)}">
												<StatusIcon class="mr-1 h-3 w-3" />
												{result.status}
											</span>
											<span class="text-sm font-medium"
												>{result.testRun.name}</span
											>
										</div>
										<div class="flex items-center gap-4">
											{#if result.duration}
												<span class="text-surface-600-300 text-sm">
													{Math.round(result.duration / 1000)}s
												</span>
											{/if}
											<span class="text-surface-600-300 text-sm"
												>{formatDate(result.executedAt)}</span
											>
										</div>
									</div>
								</Accordion.ItemTrigger>

								<Accordion.ItemContent class="px-4 pb-4">
									<div class="mb-3 flex items-center justify-between gap-4">
										<div class="text-surface-600-300 text-sm">
											Executed by: {result.executor.firstName ||
												result.executor.email}
										</div>
										<a
											href="/projects/{testCase.project.id}/runs/{result
												.testRun.id}"
											class="preset-tonal-primary-500 btn btn-sm"
										>
											<Play class="h-3 w-3" />
											View Test Run
										</a>
									</div>

									{#if result.comment}
										<p class="text-surface-600-300 mt-2 text-sm">
											{result.comment}
										</p>
									{/if}

									<!-- Error/Stack Trace in nested accordion -->
									{#if result.errorMessage || result.stackTrace}
										<div class="mt-3">
											<Accordion>
												{#if result.errorMessage}
													<Accordion.Item value="error">
														<Accordion.ItemTrigger
															class="w-full rounded-base bg-error-500/10 p-2 transition-colors hover:bg-error-500/20"
														>
															<div
																class="flex items-center gap-2 text-sm font-medium text-error-500"
															>
																<ChevronRight
																	class="h-3 w-3 transition-transform group-data-[state=open]:rotate-90"
																/>
																Error Message
															</div>
														</Accordion.ItemTrigger>
														<Accordion.ItemContent class="px-2 pb-2">
															<div
																class="mt-2 rounded-base bg-error-500/5 p-3"
															>
																<p
																	class="font-mono text-sm break-words whitespace-pre-wrap text-error-500"
																>
																	{stripAnsi(result.errorMessage)}
																</p>
															</div>
														</Accordion.ItemContent>
													</Accordion.Item>
												{/if}

												{#if result.stackTrace}
													<Accordion.Item value="stack">
														<Accordion.ItemTrigger
															class="mt-2 w-full rounded-base bg-surface-200-800 p-2 transition-colors hover:bg-surface-300-700"
														>
															<div
																class="flex items-center gap-2 text-sm font-medium"
															>
																<ChevronRight
																	class="h-3 w-3 transition-transform group-data-[state=open]:rotate-90"
																/>
																Stack Trace
															</div>
														</Accordion.ItemTrigger>
														<Accordion.ItemContent class="px-2 pb-2">
															<div
																class="mt-2 rounded-base bg-surface-100-900 p-3"
															>
																<pre
																	class="font-mono text-xs break-words whitespace-pre-wrap">{stripAnsi(
																		result.stackTrace
																	)}</pre>
															</div>
														</Accordion.ItemContent>
													</Accordion.Item>
												{/if}
											</Accordion>
										</div>
									{/if}

									<!-- Test Steps -->
									{#if result.steps && result.steps.length > 0}
										<div class="mt-3">
											<TestStepsViewer
												steps={result.steps as any}
												compact={true}
											/>
										</div>
									{/if}

									<!-- AI Diagnosis for Failed Tests -->
									{#if result.status === 'FAILED'}
										<div class="border-surface-200-700 mt-3 border-t pt-3">
											{#if !aiDiagnoses.has(result.id) && !loadingDiagnosis.has(result.id)}
												<button
													onclick={() => getDiagnosis(result.id)}
													class="preset-tonal-primary-500 btn btn-sm"
												>
													<Sparkles class="h-4 w-4" />
													Get AI Diagnosis
												</button>
											{:else if loadingDiagnosis.has(result.id)}
												<div
													class="flex items-center gap-2 text-sm text-primary-500"
												>
													<Loader2 class="h-4 w-4 animate-spin" />
													<span>Analyzing failure with AI...</span>
												</div>
											{:else if aiDiagnoses.has(result.id)}
												<div
													class="rounded-container border-2 border-primary-500 bg-primary-50-950 p-3"
												>
													<div
														class="mb-2 flex items-center justify-between gap-2"
													>
														<div class="flex items-center gap-2">
															<Sparkles
																class="h-4 w-4 text-primary-500"
															/>
															<h5
																class="text-sm font-semibold text-primary-500"
															>
																AI Diagnosis
															</h5>
															{#if aiDiagnoses.get(result.id)?.cached}
																<span
																	class="text-xs text-surface-500"
																	>(cached)</span
																>
															{/if}
														</div>
														<button
															onclick={() =>
																getDiagnosis(result.id, true)}
															class="preset-tonal-primary-500 btn btn-sm"
															title="Regenerate diagnosis"
															disabled={loadingDiagnosis.has(
																result.id
															)}
														>
															<Sparkles class="h-3 w-3" />
															Regenerate
														</button>
													</div>
													<div
														class="prose prose-sm max-w-none text-xs whitespace-pre-wrap text-surface-900 dark:text-surface-50"
													>
														{aiDiagnoses.get(result.id)?.diagnosis}
													</div>
												</div>
											{/if}
										</div>
									{/if}

									{#if result.attachments && result.attachments.length > 0}
										<div class="border-surface-200-700 mt-3 border-t pt-3">
											<AttachmentViewer attachments={result.attachments} />
										</div>
									{/if}
								</Accordion.ItemContent>
							</Accordion.Item>
						{/each}
					</Accordion>

					<!-- Load More Button -->
					<div class="mt-4">
						<LoadMoreButton
							loading={loadingMore}
							hasMore={hasMoreResults}
							onLoadMore={loadMoreResults}
						/>
					</div>
				{:else}
					<div class="text-surface-600-300 py-8 text-center">
						<Clock class="mx-auto mb-2 h-12 w-12 opacity-50" />
						<p>No execution history yet</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Details -->
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-bold">Details</h2>

				<div class="space-y-4 text-sm">
					<div>
						<div class="text-surface-600-300 mb-1">Created By</div>
						<div class="flex items-center gap-2">
							<Avatar class="h-6 w-6">
								{#if testCase.creator.imageUrl}
									<Avatar.Image
										src={testCase.creator.imageUrl}
										alt={testCase.creator.email}
									/>
								{/if}
								<Avatar.Fallback>
									{testCase.creator.firstName?.[0] ||
										testCase.creator.email[0].toUpperCase()}
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
							<FolderOpen class="h-4 w-4" />
							{testCase.project.name}
						</a>
					</div>

					{#if testCase.suite}
						<div>
							<div class="text-surface-600-300 mb-1">Test Suite</div>
							<div class="flex items-center gap-2">
								<FolderOpen class="h-4 w-4 text-primary-500" />
								{testCase.suite.name}
							</div>
						</div>
					{/if}

					<div>
						<div class="text-surface-600-300 mb-1">Created</div>
						<div class="flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							{formatDate(testCase.createdAt)}
						</div>
					</div>

					<div>
						<div class="text-surface-600-300 mb-1">Last Updated</div>
						<div class="flex items-center gap-2">
							<Clock class="h-4 w-4" />
							{formatDate(testCase.updatedAt)}
						</div>
					</div>
				</div>
			</div>

			<!-- Quick Stats -->
			<div class="card p-6">
				<h2 class="mb-4 text-lg font-bold">Statistics</h2>

				<div class="space-y-3 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Total Executions</span>
						<span class="text-lg font-bold">{testCase.results.length}</span>
					</div>

					{#if testCase.results.length > 0}
						{@const passedCount = testCase.results.filter(
							(r) => r.status === 'PASSED'
						).length}
						{@const failedCount = testCase.results.filter(
							(r) => r.status === 'FAILED'
						).length}
						{@const executedTests = passedCount + failedCount}
						{@const passRate =
							executedTests > 0 ? Math.round((passedCount / executedTests) * 100) : 0}
						<div class="flex items-center justify-between">
							<span class="text-surface-600-300">Pass Rate</span>
							<span class="text-lg font-bold text-success-500">{passRate}%</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Edit Dialog -->
{#if showEditDialog}
	<!-- Backdrop -->
	<button
		onclick={() => (showEditDialog = false)}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto card border bg-surface-50-950 p-6 shadow-2xl"
		>
			<div class="mb-6 flex items-start justify-between">
				<div>
					<div class="mb-2 flex items-center gap-3">
						<Edit class="h-6 w-6 text-primary-500" />
						<h2 class="text-2xl font-bold">Edit Test Case</h2>
					</div>
					<p class="text-surface-600-300">Update test case details and documentation</p>
				</div>
				<button
					class="preset-ghost-surface-500 btn btn-sm"
					onclick={() => (showEditDialog = false)}
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSaveEdit();
				}}
				class="space-y-6"
			>
				<!-- Title -->
				<div class="label">
					<span class="mb-2 block text-sm font-medium">
						Title <span class="text-error-500">*</span>
					</span>
					<input
						type="text"
						class="input"
						placeholder="Test case title"
						bind:value={editForm.title}
						required
						disabled={savingEdit}
					/>
				</div>

				<!-- Description -->
				<div class="label">
					<span class="mb-2 block text-sm font-medium">Description</span>
					<textarea
						class="textarea"
						rows="3"
						placeholder="Describe what this test case validates"
						bind:value={editForm.description}
						disabled={savingEdit}
					></textarea>
				</div>

				<!-- Priority, Type, Automation Status -->
				<div class="grid gap-4 md:grid-cols-3">
					<div class="label">
						<span class="mb-2 block text-sm font-medium">Priority</span>
						<select class="select" bind:value={editForm.priority} disabled={savingEdit}>
							<option value="CRITICAL">Critical</option>
							<option value="HIGH">High</option>
							<option value="MEDIUM">Medium</option>
							<option value="LOW">Low</option>
						</select>
					</div>

					<div class="label">
						<span class="mb-2 block text-sm font-medium">Type</span>
						<select class="select" bind:value={editForm.type} disabled={savingEdit}>
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

					<div class="label">
						<span class="mb-2 block text-sm font-medium">Automation</span>
						<select
							class="select"
							bind:value={editForm.automationStatus}
							disabled={savingEdit}
						>
							<option value="AUTOMATED">Automated</option>
							<option value="NOT_AUTOMATED">Not Automated</option>
							<option value="CANDIDATE">Candidate</option>
						</select>
					</div>
				</div>

				<!-- Preconditions -->
				<div class="label">
					<span class="mb-2 block text-sm font-medium">Preconditions</span>
					<textarea
						class="textarea"
						rows="3"
						placeholder="Setup steps or conditions required before test execution"
						bind:value={editForm.preconditions}
						disabled={savingEdit}
					></textarea>
				</div>

				<!-- Test Steps -->
				<div class="label">
					<span class="mb-2 block text-sm font-medium">Test Steps</span>
					<textarea
						class="textarea"
						rows="5"
						placeholder="Step-by-step instructions to execute this test"
						bind:value={editForm.steps}
						disabled={savingEdit}
					></textarea>
					<span class="text-surface-600-300 mt-1 text-xs">
						Enter each step on a new line for better readability
					</span>
				</div>

				<!-- Expected Result -->
				<div class="label">
					<span class="mb-2 block text-sm font-medium">Expected Result</span>
					<textarea
						class="textarea"
						rows="3"
						placeholder="What should happen when the test passes"
						bind:value={editForm.expectedResult}
						disabled={savingEdit}
					></textarea>
				</div>

				<!-- Actions -->
				<div class="border-surface-200-700 flex justify-end gap-3 border-t pt-4">
					<button
						type="button"
						onclick={() => (showEditDialog = false)}
						class="btn preset-outlined-surface-500"
						disabled={savingEdit}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn preset-filled-primary-500"
						disabled={savingEdit}
					>
						{#if savingEdit}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Saving...
						{:else}
							<Save class="mr-2 h-4 w-4" />
							Save Changes
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Jira Issue Modal -->
<JiraIssueModal
	bind:open={showJiraModal}
	onClose={() => (showJiraModal = false)}
	testCaseId={testCase.id}
	prefillSummary={jiraModalSummary}
	prefillDescription={jiraModalDescription}
/>
