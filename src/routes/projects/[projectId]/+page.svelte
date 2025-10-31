<script lang="ts">
	import {
		FolderOpen,
		TestTube2,
		PlayCircle,
		TrendingUp,
		Calendar,
		Users,
		Settings,
		FileText
	} from 'lucide-svelte';
	import { setSelectedProject } from '$lib/stores/projectStore';

	let { data } = $props();
	let { project, stats, recentRuns } = $derived(data);

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

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			PASSED: 'text-success-500',
			FAILED: 'text-error-500',
			BLOCKED: 'text-warning-500',
			SKIPPED: 'text-surface-500',
			IN_PROGRESS: 'text-primary-500'
		};
		return colors[status] || 'text-surface-500';
	}

	function getStatusBgColor(status: string) {
		const colors: Record<string, string> = {
			PASSED: 'bg-success-500/10',
			FAILED: 'bg-error-500/10',
			BLOCKED: 'bg-warning-500/10',
			SKIPPED: 'bg-surface-500/10',
			IN_PROGRESS: 'bg-primary-500/10'
		};
		return colors[status] || 'bg-surface-500/10';
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
					<p class="text-lg text-surface-600-300">{project.description}</p>
				{/if}
			</div>
		</div>

		<!-- Stats Cards -->
		<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<a href="/projects/{project.id}/cases" class="card p-4 transition-shadow hover:shadow-lg">
				<div class="flex items-center gap-3">
					<div class="rounded-container bg-primary-500/10 p-2">
						<TestTube2 class="h-5 w-5 text-primary-500" />
					</div>
					<div>
						<p class="text-sm text-surface-600-300">Test Cases</p>
						<p class="text-2xl font-bold">{stats.totalTestCases}</p>
					</div>
				</div>
			</a>

			<a href="/projects/{project.id}/cases" class="card p-4 transition-shadow hover:shadow-lg">
				<div class="flex items-center gap-3">
					<div class="rounded-container bg-secondary-500/10 p-2">
						<FolderOpen class="h-5 w-5 text-secondary-500" />
					</div>
					<div>
						<p class="text-sm text-surface-600-300">Test Suites</p>
						<p class="text-2xl font-bold">{stats.totalSuites}</p>
					</div>
				</div>
			</a>

			<a href="/projects/{project.id}/runs" class="card p-4 transition-shadow hover:shadow-lg">
				<div class="flex items-center gap-3">
					<div class="rounded-container bg-tertiary-500/10 p-2">
						<PlayCircle class="h-5 w-5 text-tertiary-500" />
					</div>
					<div>
						<p class="text-sm text-surface-600-300">Test Runs</p>
						<p class="text-2xl font-bold">{stats.totalTestRuns}</p>
					</div>
				</div>
			</a>

			<div class="card p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-container bg-success-500/10 p-2">
						<TrendingUp class="h-5 w-5 text-success-500" />
					</div>
					<div>
						<p class="text-sm text-surface-600-300">Pass Rate</p>
						<p class="text-2xl font-bold">
							{stats.totalResults > 0 ? Math.round((stats.passedResults / stats.totalResults) * 100) : 0}%
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Recent Test Runs -->
		<div class="card p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold">Recent Test Runs</h2>
				<a href="/projects/{project.id}/runs" class="text-sm text-primary-500 hover:underline">
					View All
				</a>
			</div>

			{#if recentRuns.length === 0}
				<div class="py-8 text-center text-surface-600-300">
					<PlayCircle class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>No test runs yet</p>
					<a href="/projects/{project.id}/runs" class="mt-2 inline-block text-primary-500 hover:underline">
						Create your first test run
					</a>
				</div>
			{:else}
				<div class="space-y-3">
					{#each recentRuns as run}
						<a
							href="/projects/{project.id}/runs/{run.id}"
							class="block rounded-container border border-surface-300-700 p-4 transition-colors hover:bg-surface-100-800"
						>
							<div class="mb-2 flex items-center justify-between">
								<h3 class="font-medium">{run.name}</h3>
								<span
									class="badge {getStatusBgColor(run.status)} {getStatusColor(run.status)}"
								>
									{run.status}
								</span>
							</div>
							<div class="flex items-center gap-4 text-sm text-surface-600-300">
								{#if run.environment}
									<span>{run.environment.name}</span>
								{/if}
								{#if run.milestone}
									<span>{run.milestone.name}</span>
								{/if}
								<span>{new Date(run.createdAt).toLocaleDateString()}</span>
							</div>
							{#if run._count}
								<div class="mt-2 flex items-center gap-3 text-sm">
									<span class="text-success-500">{run._count.passedResults || 0} passed</span>
									<span class="text-error-500">{run._count.failedResults || 0} failed</span>
									<span class="text-surface-600-300">{run._count.totalResults || 0} total</span>
								</div>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Quick Links -->
		<div class="card p-6">
			<h2 class="mb-4 text-xl font-bold">Quick Actions</h2>
			<div class="grid gap-3">
				<a
					href="/projects/{project.id}/cases"
					class="flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors hover:bg-surface-100-800"
				>
					<TestTube2 class="h-5 w-5 text-primary-500" />
					<div>
						<p class="font-medium">Manage Test Cases</p>
						<p class="text-sm text-surface-600-300">Create and organize test cases</p>
					</div>
				</a>

				<a
					href="/projects/{project.id}/runs"
					class="flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors hover:bg-surface-100-800"
				>
					<PlayCircle class="h-5 w-5 text-tertiary-500" />
					<div>
						<p class="font-medium">View Test Runs</p>
						<p class="text-sm text-surface-600-300">Track test execution history</p>
					</div>
				</a>

				<a
					href="/docs"
					class="flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors hover:bg-surface-100-800"
				>
					<FileText class="h-5 w-5 text-secondary-500" />
					<div>
						<p class="font-medium">API Documentation</p>
						<p class="text-sm text-surface-600-300">Integrate with your test framework</p>
					</div>
				</a>
			</div>
		</div>
	</div>

	<!-- Project Details -->
	<div class="mt-6 card p-6">
		<h2 class="mb-4 text-xl font-bold">Project Details</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<p class="mb-1 text-sm text-surface-600-300">Created by</p>
				<p class="font-medium">
					{project.creator.firstName || project.creator.email}
				</p>
			</div>
			{#if project.team}
				<div>
					<p class="mb-1 text-sm text-surface-600-300">Team</p>
					<p class="font-medium">{project.team.name}</p>
				</div>
			{/if}
			<div>
				<p class="mb-1 text-sm text-surface-600-300">Created on</p>
				<p class="font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
			</div>
			<div>
				<p class="mb-1 text-sm text-surface-600-300">Last updated</p>
				<p class="font-medium">{new Date(project.updatedAt).toLocaleDateString()}</p>
			</div>
		</div>
	</div>
</div>
