<script lang="ts">
	import { ChevronDown, FolderOpen, Check, X } from 'lucide-svelte';
	import { selectedProject, setSelectedProject, clearSelectedProject } from '$lib/stores/projectStore';
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
		if (currentProject && currentProject.id !== lastValidatedProjectId) {
			// Check if project exists in the available projects list
			const projectExists = projects.some(p => p.id === currentProject.id);

			if (!projectExists && projects.length > 0) {
				// Selected project doesn't belong to this user, clear it
				console.log('[ProjectSelector] Clearing invalid project:', currentProject.name);
				lastValidatedProjectId = currentProject.id; // Mark as validated to prevent loop
				clearSelectedProject();
			} else if (projectExists) {
				// Valid project, update the last validated ID
				lastValidatedProjectId = currentProject.id;
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
		class="flex items-center gap-2 px-4 py-2 rounded-base transition-colors hover:bg-surface-200-800 min-w-[200px] justify-between"
	>
		{#if currentProject}
			<div class="flex items-center gap-2">
				<FolderOpen class="w-4 h-4 text-primary-500" />
				<div class="text-left">
					<div class="font-medium text-sm">{currentProject.name}</div>
					<div class="text-xs text-surface-600-300">{currentProject.key}</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-2 text-surface-600-300">
				<FolderOpen class="w-4 h-4" />
				<span>Select Project</span>
			</div>
		{/if}
		<ChevronDown class="w-4 h-4 {showDropdown ? 'rotate-180' : ''} transition-transform" />
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
			class="absolute top-full left-0 mt-2 w-80 card p-2 shadow-xl z-50 max-h-96 overflow-y-auto bg-surface-50-950 border border-surface-200-700"
		>
			{#if currentProject}
				<button
					onclick={deselectProject}
					class="w-full text-left px-3 py-2 rounded-base hover:bg-surface-100-800 transition-colors flex items-center justify-between text-error-500"
				>
					<span class="text-sm">Clear selection</span>
					<X class="w-4 h-4" />
				</button>
				<div class="h-px bg-surface-200-700 my-2"></div>
			{/if}

			{#if projects.length === 0}
				<div class="px-3 py-8 text-center text-surface-600-300">
					<FolderOpen class="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p class="text-sm">No projects available</p>
					<a href="/projects/new" class="text-primary-500 hover:underline text-xs mt-2 inline-block">
						Create a project
					</a>
				</div>
			{:else}
				{#each projects as project}
					<button
						onclick={() => selectProject(project)}
						class="w-full text-left px-3 py-2 rounded-base hover:bg-surface-100-800 transition-colors flex items-center justify-between group"
					>
						<div class="flex items-center gap-3">
							<FolderOpen class="w-4 h-4 text-primary-500" />
							<div>
								<div class="font-medium text-sm group-hover:text-primary-500 transition-colors">
									{project.name}
								</div>
								<div class="text-xs text-surface-600-300">{project.key}</div>
							</div>
						</div>
						{#if currentProject?.id === project.id}
							<Check class="w-4 h-4 text-success-500" />
						{/if}
					</button>
				{/each}
			{/if}

			<div class="h-px bg-surface-200-700 my-2"></div>
			<a
				href="/projects"
				class="w-full text-left px-3 py-2 rounded-base hover:bg-surface-100-800 transition-colors flex items-center gap-2 text-sm text-primary-500"
			>
				<FolderOpen class="w-4 h-4" />
				<span>View all projects</span>
			</a>
		</div>
	{/if}
</div>
