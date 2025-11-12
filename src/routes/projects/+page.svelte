<script lang="ts">
	import { Plus, FolderOpen, TestTube2, PlayCircle, Users, Trash2 } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { user, projects } = $derived(data);

	// Check if user has reached project limit (using $derived for reactivity)
	let hasTeam = $derived(!!user.team);
	let isProUser = $derived(hasTeam && user.team?.subscription?.status === 'ACTIVE');
	let projectLimit = $derived(isProUser ? Infinity : 1);
	let canCreateProject = $derived(projects.length < projectLimit);

	let deletingProjectId = $state<string | null>(null);

	async function handleDeleteProject(event: Event, projectId: string, projectName: string) {
		event.preventDefault();
		event.stopPropagation();

		const confirmed = confirm(
			`Are you sure you want to delete "${projectName}"?\n\nThis will permanently delete:\n• All test suites\n• All test cases\n• All test runs\n• All test results\n\nThis action cannot be undone.`
		);

		if (!confirmed) return;

		deletingProjectId = projectId;

		try {
			const res = await fetch(`/api/projects/${projectId}/delete`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to delete project');
			}

			// Refresh the page data
			await invalidateAll();
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			deletingProjectId = null;
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-6 flex items-start justify-between">
			<div>
				<h1 class="mb-2 text-4xl font-bold">Projects</h1>
				<p class="text-surface-600-300 text-lg">Manage your test projects and suites</p>
			</div>
			{#if canCreateProject}
				<a href="/projects/new" class="btn preset-filled-primary-500">
					<Plus class="mr-2 h-4 w-4" />
					New Project
				</a>
			{:else}
				<div class="text-right">
					<button disabled class="btn cursor-not-allowed preset-filled-surface-500 opacity-50">
						<Plus class="mr-2 h-4 w-4" />
						New Project
					</button>
					<p class="text-surface-600-300 mt-2 text-sm">
						Free plan: {projects.length}/{projectLimit} project used
					</p>
					<a href="/teams/new" class="text-sm text-primary-500 hover:underline">
						Upgrade to Pro for unlimited projects
					</a>
				</div>
			{/if}
		</div>

		<!-- Stats -->
		{#if projects.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-container bg-primary-500/10 p-2">
							<FolderOpen class="h-5 w-5 text-primary-500" />
						</div>
						<div>
							<p class="text-surface-600-300 text-sm">Total Projects</p>
							<p class="text-2xl font-bold">{projects.length}</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-container bg-secondary-500/10 p-2">
							<TestTube2 class="h-5 w-5 text-secondary-500" />
						</div>
						<div>
							<p class="text-surface-600-300 text-sm">Total Test Cases</p>
							<p class="text-2xl font-bold">
								{projects.reduce((sum, p) => sum + p._count.testCases, 0)}
							</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-container bg-tertiary-500/10 p-2">
							<PlayCircle class="h-5 w-5 text-tertiary-500" />
						</div>
						<div>
							<p class="text-surface-600-300 text-sm">Total Test Runs</p>
							<p class="text-2xl font-bold">
								{projects.reduce((sum, p) => sum + p._count.testRuns, 0)}
							</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-container bg-success-500/10 p-2">
							<Users class="h-5 w-5 text-success-500" />
						</div>
						<div>
							<p class="text-surface-600-300 text-sm">Team</p>
							<p class="text-lg font-bold">
								{#if hasTeam && user.team}
									{user.team.name}
								{:else}
									<span class="text-surface-600-300 text-sm">No team</span>
								{/if}
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Projects List -->
	{#if projects.length === 0}
		<div class="card p-12 text-center">
			<FolderOpen class="mx-auto mb-4 h-16 w-16 text-surface-400" />
			<h2 class="mb-2 text-2xl font-bold">No projects yet</h2>
			<p class="text-surface-600-300 mb-6">
				Create your first project to start organizing your test cases
			</p>
			{#if canCreateProject}
				<a
					href="/projects/new"
					class="btn inline-flex items-center gap-2 preset-filled-primary-500"
				>
					<Plus class="h-4 w-4" />
					Create Your First Project
				</a>
			{:else}
				<a href="/teams/new" class="btn inline-flex items-center gap-2 preset-filled-primary-500">
					Upgrade to Create Projects
				</a>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project}
				<div class="group relative card p-6 transition-shadow hover:shadow-lg">
					<!-- Delete button -->
					<button
						onclick={(e) => handleDeleteProject(e, project.id, project.name)}
						disabled={deletingProjectId === project.id}
						class="text-surface-600-300 absolute top-4 right-4 rounded-container p-2 opacity-0 transition-colors group-hover:opacity-100 hover:bg-error-500/10 hover:text-error-500"
						title="Delete project"
					>
						{#if deletingProjectId === project.id}
							<span class="text-xs">Deleting...</span>
						{:else}
							<Trash2 class="h-4 w-4" />
						{/if}
					</button>

					<a href="/projects/{project.id}/runs" class="block">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="rounded-container bg-primary-500/10 p-2 transition-colors group-hover:bg-primary-500/20"
								>
									<FolderOpen class="h-5 w-5 text-primary-500" />
								</div>
								<div>
									<h3 class="text-lg font-bold transition-colors group-hover:text-primary-500">
										{project.name}
									</h3>
									<span class="badge preset-filled-surface-500 text-xs">{project.key}</span>
								</div>
							</div>
						</div>

						{#if project.description}
							<p class="text-surface-600-300 mb-4 line-clamp-2 text-sm">
								{project.description}
							</p>
						{/if}

						<div class="text-surface-600-300 flex items-center gap-4 text-sm">
							<div class="flex items-center gap-1">
								<TestTube2 class="h-4 w-4" />
								<span>{project._count.testCases} tests</span>
							</div>
							<div class="flex items-center gap-1">
								<PlayCircle class="h-4 w-4" />
								<span>{project._count.testRuns} runs</span>
							</div>
						</div>

						<div
							class="border-surface-200-700 text-surface-600-300 mt-4 flex items-center justify-between border-t pt-4 text-xs"
						>
							<span>
								by {project.creator.firstName || project.creator.email}
							</span>
							{#if project.team}
								<span class="badge preset-outlined-surface-500">
									{project.team.name}
								</span>
							{/if}
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>
