<script lang="ts">
	import {
		Plus,
		FolderOpen,
		TestTube2,
		Play,
		TrendingUp,
		CheckCircle2,
		XCircle,
		Clock,
		Users,
		Crown,
		AlertCircle,
		Trash2
	} from '@lucide/svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let user = $derived(data.user);
	let projects = $derived(data.projects);
	let stats = $derived(data.stats);
	let subscription = $derived(data.subscription);

	let deletingProjectId = $state<string | null>(null);
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	function requestDeleteProject(event: Event, projectId: string, projectName: string) {
		event.preventDefault();
		event.stopPropagation();
		deleteTarget = { id: projectId, name: projectName };
	}

	function closeDeleteDialog() {
		deleteTarget = null;
	}

	async function confirmDeleteProject() {
		if (!deleteTarget) return;

		const { id: projectId } = deleteTarget;
		closeDeleteDialog();
		deletingProjectId = projectId;

		try {
			const res = await fetch(`/api/projects/${projectId}/delete`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete project');
			}

			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			deletingProjectId = null;
		}
	}

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			PASSED: 'text-success-500',
			FAILED: 'text-error-500',
			BLOCKED: 'text-warning-500',
			SKIPPED: 'text-surface-500',
			RETEST: 'text-warning-500',
			UNTESTED: 'text-surface-400'
		};
		return colors[status] || 'text-surface-500';
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
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8" data-testid="dashboard-page">
	{#if user}
		<!-- Header -->
		<div class="mb-8" data-testid="dashboard-header">
			<div class="flex items-start justify-between">
				<div>
					<h1 class="mb-2 text-4xl font-bold" data-testid="welcome-heading">
						Welcome back, {user.firstName || 'there'}!
					</h1>
					<p class="text-surface-600-300 text-lg" data-testid="team-info">
						{#if user.team}
							Team: {user.team.name}
							{#if subscription.hasActiveSubscription}
								<span
									class="ml-2 badge preset-filled-primary-500"
									data-testid="pro-badge"
								>
									<Crown class="mr-1 inline h-3 w-3" />
									Pro
								</span>
							{/if}
						{:else}
							Personal workspace
						{/if}
					</p>
				</div>

				{#if subscription.canCreateProject}
					<a
						href="/projects/new"
						class="btn preset-filled-primary-500"
						data-testid="new-project-button"
					>
						<Plus class="mr-2 h-4 w-4" />
						New Project
					</a>
				{:else}
					<div class="text-right" data-testid="project-limit-warning">
						<div class="mb-2 badge preset-filled-warning-500">
							Project limit reached
						</div>
						<a
							href="/teams/new"
							class="btn preset-filled-primary-500 btn-sm"
							data-testid="upgrade-button"
						>
							<Crown class="mr-2 h-4 w-4" />
							Upgrade to Pro
						</a>
					</div>
				{/if}
			</div>
		</div>

		{#if projects.length === 0}
			<!-- Empty State -->
			<div class="mx-auto max-w-2xl card p-12 text-center" data-testid="empty-state">
				<div class="mb-6">
					<div
						class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-500/10"
					>
						<FolderOpen class="h-12 w-12 text-primary-500" />
					</div>
					<h2 class="mb-2 text-3xl font-bold">Let's get started!</h2>
					<p class="text-surface-600-300 mb-8 text-lg">
						Create your first project to start managing test cases and tracking results.
					</p>
				</div>

				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a
						href="/projects/new"
						class="btn preset-filled-primary-500 px-8 py-4 text-lg"
						data-testid="create-first-project-button"
					>
						<Plus class="mr-2 h-5 w-5" />
						Create Your First Project
					</a>
					<a
						href="/docs"
						class="btn preset-outlined-surface-500"
						data-testid="view-docs-button"
					>
						View Documentation
					</a>
				</div>

				{#if !subscription.hasActiveSubscription}
					<div class="bg-surface-50-900 mt-8 rounded-container p-4">
						<p class="text-surface-600-300 mb-2 text-sm">
							<strong>Free plan:</strong> 1 project · Unlimited test cases
						</p>
						<a href="/teams/new" class="text-sm text-primary-500 hover:underline">
							Upgrade to Pro for unlimited projects and AI features →
						</a>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Stats Grid -->
			<div class="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
				<!-- Projects -->
				<div class="card p-6" data-testid="stat-projects">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-primary-500/10 p-3">
							<FolderOpen class="h-6 w-6 text-primary-500" />
						</div>
						<span class="text-3xl font-bold" data-testid="projects-count"
							>{stats.totalProjects}</span
						>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Projects</h3>
					{#if !subscription.hasActiveSubscription}
						<p class="text-surface-500-400 mt-1 text-xs" data-testid="project-usage">
							{stats.totalProjects} / {subscription.projectLimit} used
						</p>
					{/if}
				</div>

				<!-- Test Cases -->
				<div class="card p-6" data-testid="stat-test-cases">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-secondary-500/10 p-3">
							<TestTube2 class="h-6 w-6 text-secondary-500" />
						</div>
						<span class="text-3xl font-bold" data-testid="test-cases-count"
							>{stats.totalTestCases}</span
						>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Test Cases</h3>
				</div>

				<!-- Test Runs -->
				<div class="card p-6" data-testid="stat-test-runs">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-tertiary-500/10 p-3">
							<Play class="h-6 w-6 text-tertiary-500" />
						</div>
						<span class="text-3xl font-bold" data-testid="test-runs-count"
							>{stats.totalTestRuns}</span
						>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Test Runs</h3>
				</div>

				<!-- Pass Rate -->
				<div class="card p-6" data-testid="stat-pass-rate">
					<div class="mb-4 flex items-center justify-between">
						<div class="rounded-lg bg-success-500/10 p-3">
							<TrendingUp class="h-6 w-6 text-success-500" />
						</div>
						<span class="text-3xl font-bold" data-testid="pass-rate-value"
							>{stats.passRate}%</span
						>
					</div>
					<h3 class="text-surface-600-300 text-sm font-medium">Pass Rate</h3>
				</div>
			</div>

			<div class="grid gap-8 lg:grid-cols-3">
				<!-- Projects List -->
				<div class="lg:col-span-2">
					<div class="card p-6" data-testid="projects-list">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-2xl font-bold">Your Projects</h2>
							{#if subscription.canCreateProject}
								<a
									href="/projects/new"
									class="btn preset-outlined-surface-500 btn-sm"
									data-testid="new-project-button-list"
								>
									<Plus class="mr-1 h-4 w-4" />
									New Project
								</a>
							{/if}
						</div>

						<div class="space-y-4">
							{#each projects as project}
								<div
									class="group hover:bg-surface-100-800 border-surface-200-700 relative block rounded-container border p-4 transition-colors"
									data-testid="project-item"
									data-project-id={project.id}
								>
									<!-- Delete button -->
									<button
										onclick={(e) =>
											requestDeleteProject(e, project.id, project.name)}
										disabled={deletingProjectId === project.id}
										class="text-surface-600-300 absolute top-4 right-4 z-10 rounded-container p-2 opacity-0 transition-colors group-hover:opacity-100 hover:bg-error-500/10 hover:text-error-500"
										title="Delete project"
										data-testid="delete-project-button"
									>
										{#if deletingProjectId === project.id}
											<span class="text-xs">Deleting...</span>
										{:else}
											<Trash2 class="h-4 w-4" />
										{/if}
									</button>

									<a
										href="/projects/{project.id}"
										class="block"
										data-testid="project-link"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1 pr-12">
												<div class="mb-2 flex items-center gap-3">
													<h3
														class="text-lg font-bold"
														data-testid="project-name"
													>
														{project.name}
													</h3>
													<span
														class="badge preset-filled-surface-500 text-xs"
														data-testid="project-key"
														>{project.key}</span
													>
												</div>
												{#if project.description}
													<p
														class="text-surface-600-300 mb-3 text-sm"
														data-testid="project-description"
													>
														{project.description}
													</p>
												{/if}

												<div
													class="text-surface-600-300 flex items-center gap-6 text-sm"
												>
													<div class="flex items-center gap-2">
														<TestTube2 class="h-4 w-4" />
														<span data-testid="project-test-cases-count"
															>{project._count.testCases} test cases</span
														>
													</div>
													<div class="flex items-center gap-2">
														<Play class="h-4 w-4" />
														<span data-testid="project-runs-count"
															>{project._count.testRuns} runs</span
														>
													</div>
												</div>
											</div>
											<!-- TODO: not block the delete button on hover -->
											<!-- <div class="text-right text-sm text-surface-500-400">
											{formatDate(project.updatedAt)}
										</div> -->
										</div>
									</a>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Recent Activity -->
				<div class="card p-6" data-testid="recent-results">
					<h2 class="mb-6 text-xl font-bold">Recent Results</h2>

					{#if stats.recentResults.length > 0}
						<div class="space-y-4">
							{#each stats.recentResults as result}
								{@const StatusIcon = getStatusIcon(result.status)}
								<div
									class="border-surface-200-700 border-b pb-4 last:border-0 last:pb-0"
									data-testid="recent-result-item"
								>
									<div class="flex items-start gap-3">
										<StatusIcon
											class="mt-0.5 h-5 w-5 flex-shrink-0 {getStatusColor(
												result.status
											)}"
											data-testid="result-status-icon"
										/>
										<div class="min-w-0 flex-1">
											<p
												class="truncate text-sm font-medium"
												data-testid="result-test-case-title"
											>
												{result.testCase.title}
											</p>
											<p
												class="text-surface-600-300 truncate text-xs"
												data-testid="result-run-info"
											>
												{result.testRun.project.key} · {result.testRun.name}
											</p>
											<p
												class="text-surface-500-400 mt-1 text-xs"
												data-testid="result-executed-at"
											>
												{formatDate(result.executedAt)}
											</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="py-8 text-center" data-testid="no-results-empty-state">
							<Clock class="mx-auto mb-2 h-12 w-12 text-surface-400" />
							<p class="text-surface-600-300 text-sm">No test results yet</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Upgrade Prompt for Free Users -->
			{#if !subscription.hasActiveSubscription}
				<div class="mt-8" data-testid="upgrade-prompt">
					<div
						class="card border border-primary-500/20 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 p-6"
					>
						<div class="flex items-center gap-4">
							<div class="rounded-lg bg-primary-500 p-3">
								<Crown class="h-6 w-6 text-white" />
							</div>
							<div class="flex-1">
								<h3 class="mb-1 text-lg font-bold">Unlock Pro Features</h3>
								<p class="text-surface-600-300 text-sm">
									Unlimited projects · AI-powered failure analysis · Priority
									support
								</p>
							</div>
							<a
								href="/teams/new"
								class="btn preset-filled-primary-500"
								data-testid="upgrade-to-pro-button"
							>
								Upgrade to Pro
							</a>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<Dialog
	open={deleteTarget !== null}
	onOpenChange={(details) => {
		if (!details.open) closeDeleteDialog();
	}}
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-40 bg-black/50" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="w-full max-w-md card bg-surface-50-950 p-6 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-project-title"
			>
				{#if deleteTarget}
					<Dialog.Title id="delete-project-title" class="mb-2 text-xl font-bold">
						Delete "{deleteTarget.name}"?
					</Dialog.Title>
					<Dialog.Description class="text-surface-600-300 mb-6 text-sm">
						This will permanently delete all test suites, test cases, test runs, and
						test results in this project. This action cannot be undone.
					</Dialog.Description>
					<div class="flex justify-end gap-3">
						<Dialog.CloseTrigger
							class="btn preset-outlined-surface-500"
							onclick={closeDeleteDialog}
						>
							Cancel
						</Dialog.CloseTrigger>
						<button
							type="button"
							class="btn preset-filled-error-500"
							onclick={confirmDeleteProject}
						>
							Delete project
						</button>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
