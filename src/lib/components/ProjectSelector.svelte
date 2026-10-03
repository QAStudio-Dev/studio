<script lang="ts">
	import { ChevronDown, FolderOpen, Check, X } from '@lucide/svelte';
	import {
		selectedProject,
		setSelectedProject,
		clearSelectedProject
	} from '$lib/stores/projectStore';
	import { goto } from '$app/navigation';

	interface Props {
		projects: Array<{
			id: string;
			name: string;
			key: string;
		}>;
	}

	let { projects }: Props = $props();

	let showDropdown = $state(false);
	let currentProject = $state($selectedProject);
	let lastValidatedProjectId = $state<string | null>(null);

	// Subscribe to store changes
	$effect(() => {
		currentProject = $selectedProject;
	});

	// Validate selected project against available projects
	$effect(() => {
		// Only validate if we have a selected project and haven't already validated this exact project
		if (currentProject && currentProject?.id !== lastValidatedProjectId) {
			// Check if project exists in the available projects list
			const projectExists = projects.some((p) => p.id === currentProject?.id);

			if (!projectExists && projects.length > 0) {
				// Selected project doesn't belong to this user, clear it
				console.log('[ProjectSelector] Clearing invalid project:', currentProject?.name);
				lastValidatedProjectId = currentProject?.id || ''; // Mark as validated to prevent loop
				clearSelectedProject();
			} else if (projectExists) {
				// Valid project, update the last validated ID
				lastValidatedProjectId = currentProject?.id || '';
			}
		} else if (!currentProject) {
			// No project selected, reset validation
			lastValidatedProjectId = null;
		}
	});

	function selectProject(project: { id: string; name: string; key: string }) {
		setSelectedProject(project);
		showDropdown = false;
		goto(`/projects/${project.id}`);
	}

	function deselectProject() {
		clearSelectedProject();
		showDropdown = false;
	}

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}
</script>

<div class="relative">
	<button
		onclick={toggleDropdown}
		class="flex min-w-[200px] items-center justify-between gap-2 rounded-base px-4 py-2 transition-colors hover:bg-surface-200-800"
	>
		{#if currentProject}
			<div class="flex items-center gap-2">
				<FolderOpen class="h-4 w-4 text-primary-500" />
				<div class="text-left">
					<div class="text-sm font-medium">{currentProject.name}</div>
					<div class="text-xs text-surface-600-400">{currentProject.key}</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-2 text-surface-600-400">
				<FolderOpen class="h-4 w-4" />
				<span>Select Project</span>
			</div>
		{/if}
		<ChevronDown class="h-4 w-4 {showDropdown ? 'rotate-180' : ''} transition-transform" />
	</button>

	{#if showDropdown}
		<!-- Backdrop -->
		<button
			onclick={() => (showDropdown = false)}
			class="fixed inset-0 z-40 bg-transparent"
			tabindex="-1"
			aria-label="Close dropdown"
		></button>

		<!-- Dropdown -->
		<div
			class="absolute top-full left-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto card border border-surface-200-800 bg-surface-50-950 p-2 shadow-xl"
		>
			{#if currentProject}
				<button
					onclick={deselectProject}
					class="flex w-full items-center justify-between rounded-base px-3 py-2 text-left text-error-500 transition-colors hover:bg-surface-100-900"
				>
					<span class="text-sm">Clear selection</span>
					<X class="h-4 w-4" />
				</button>
				<div class="my-2 h-px bg-surface-200-800"></div>
			{/if}

			{#if projects.length === 0}
				<div class="px-3 py-8 text-center text-surface-600-400">
					<FolderOpen class="mx-auto mb-2 h-8 w-8 opacity-50" />
					<p class="text-sm">No projects available</p>
					<a
						href="/projects/new"
						class="mt-2 inline-block text-xs text-primary-500 hover:underline"
					>
						Create a project
					</a>
				</div>
			{:else}
				{#each projects as project}
					<button
						onclick={() => selectProject(project)}
						class="group flex w-full items-center justify-between rounded-base px-3 py-2 text-left transition-colors hover:bg-surface-100-900"
					>
						<div class="flex items-center gap-3">
							<FolderOpen class="h-4 w-4 text-primary-500" />
							<div>
								<div
									class="text-sm font-medium transition-colors group-hover:text-primary-500"
								>
									{project.name}
								</div>
								<div class="text-xs text-surface-600-400">{project.key}</div>
							</div>
						</div>
						{#if currentProject?.id === project.id}
							<Check class="h-4 w-4 text-success-500" />
						{/if}
					</button>
				{/each}
			{/if}

			<div class="my-2 h-px bg-surface-200-800"></div>
			<a
				href="/projects"
				class="flex w-full items-center gap-2 rounded-base px-3 py-2 text-left text-sm text-primary-500 transition-colors hover:bg-surface-100-900"
			>
				<FolderOpen class="h-4 w-4" />
				<span>View all projects</span>
			</a>
		</div>
	{/if}
</div>
