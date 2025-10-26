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
		<div class="flex items-start justify-between mb-6">
			<div>
				<h1 class="text-4xl font-bold mb-2">Projects</h1>
				<p class="text-lg text-surface-600-300">
					Manage your test projects and suites
				</p>
			</div>
			{#if canCreateProject}
				<a href="/projects/new" class="btn preset-filled-primary-500">
					<Plus class="w-4 h-4 mr-2" />
					New Project
				</a>
			{:else}
				<div class="text-right">
					<button disabled class="btn preset-filled-surface-500 opacity-50 cursor-not-allowed">
						<Plus class="w-4 h-4 mr-2" />
						New Project
					</button>
					<p class="text-sm text-surface-600-300 mt-2">
						Free plan: {projects.length}/{projectLimit} project used
					</p>
					<a href="/teams/new" class="text-primary-500 hover:underline text-sm">
						Upgrade to Pro for unlimited projects
					</a>
				</div>
			{/if}
		</div>

		<!-- Stats -->
		{#if projects.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-container bg-primary-500/10">
							<FolderOpen class="w-5 h-5 text-primary-500" />
						</div>
						<div>
							<p class="text-sm text-surface-600-300">Total Projects</p>
							<p class="text-2xl font-bold">{projects.length}</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-container bg-secondary-500/10">
							<TestTube2 class="w-5 h-5 text-secondary-500" />
						</div>
						<div>
							<p class="text-sm text-surface-600-300">Total Test Cases</p>
							<p class="text-2xl font-bold">
								{projects.reduce((sum, p) => sum + p._count.testCases, 0)}
							</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-container bg-tertiary-500/10">
							<PlayCircle class="w-5 h-5 text-tertiary-500" />
						</div>
						<div>
							<p class="text-sm text-surface-600-300">Total Test Runs</p>
							<p class="text-2xl font-bold">
								{projects.reduce((sum, p) => sum + p._count.testRuns, 0)}
							</p>
						</div>
					</div>
				</div>

				<div class="card p-4">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-container bg-success-500/10">
							<Users class="w-5 h-5 text-success-500" />
						</div>
						<div>
							<p class="text-sm text-surface-600-300">Team</p>
							<p class="text-lg font-bold">
								{#if hasTeam}
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
			<FolderOpen class="w-16 h-16 mx-auto mb-4 text-surface-400" />
			<h2 class="text-2xl font-bold mb-2">No projects yet</h2>
			<p class="text-surface-600-300 mb-6">
				Create your first project to start organizing your test cases
			</p>
			{#if canCreateProject}
				<a href="/projects/new" class="btn preset-filled-primary-500 inline-flex items-center gap-2">
					<Plus class="w-4 h-4" />
					Create Your First Project
				</a>
			{:else}
				<a href="/teams/new" class="btn preset-filled-primary-500 inline-flex items-center gap-2">
					Upgrade to Create Projects
				</a>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each projects as project}
				<div class="card p-6 hover:shadow-lg transition-shadow group relative">
					<!-- Delete button -->
					<button
						onclick={(e) => handleDeleteProject(e, project.id, project.name)}
						disabled={deletingProjectId === project.id}
						class="absolute top-4 right-4 p-2 rounded-container hover:bg-error-500/10 text-surface-600-300 hover:text-error-500 transition-colors opacity-0 group-hover:opacity-100"
						title="Delete project"
					>
						{#if deletingProjectId === project.id}
							<span class="text-xs">Deleting...</span>
						{:else}
							<Trash2 class="w-4 h-4" />
						{/if}
					</button>

					<a href="/projects/{project.id}" class="block">
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="p-2 rounded-container bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
									<FolderOpen class="w-5 h-5 text-primary-500" />
								</div>
								<div>
									<h3 class="font-bold text-lg group-hover:text-primary-500 transition-colors">
										{project.name}
									</h3>
									<span class="badge preset-filled-surface-500 text-xs">{project.key}</span>
								</div>
							</div>
						</div>

						{#if project.description}
							<p class="text-surface-600-300 text-sm mb-4 line-clamp-2">
								{project.description}
							</p>
						{/if}

						<div class="flex items-center gap-4 text-sm text-surface-600-300">
							<div class="flex items-center gap-1">
								<TestTube2 class="w-4 h-4" />
								<span>{project._count.testCases} tests</span>
							</div>
							<div class="flex items-center gap-1">
								<PlayCircle class="w-4 h-4" />
								<span>{project._count.testRuns} runs</span>
							</div>
						</div>

						<div class="mt-4 pt-4 border-t border-surface-200-700 flex items-center justify-between text-xs text-surface-600-300">
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
