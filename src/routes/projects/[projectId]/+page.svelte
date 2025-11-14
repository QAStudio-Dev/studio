<script lang="ts">
	import {
		FolderOpen,
		TestTube2,
		PlayCircle,
		TrendingUp,
		Calendar,
		Users,
		Settings,
		FileText,
		Edit,
		Trash2
	} from 'lucide-svelte';
	import { setSelectedProject } from '$lib/stores/projectStore';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { project, stats, recentRuns } = $derived(data);

	// Edit modal state
	let showEditModal = $state(false);
	let editName = $state(project.name);
	let editKey = $state(project.key);
	let editDescription = $state(project.description || '');
	let isSaving = $state(false);
	let errorMessage = $state('');

	// Delete modal state
	let showDeleteModal = $state(false);
	let deleteConfirmation = $state('');
	let isDeleting = $state(false);
	let deleteError = $state('');

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

	function openEditModal() {
		editName = project.name;
		editKey = project.key;
		editDescription = project.description || '';
		errorMessage = '';
		showEditModal = true;
	}

	async function saveProject() {
		if (!editName.trim() || !editKey.trim()) {
			errorMessage = 'Name and key are required';
			return;
		}

		isSaving = true;
		errorMessage = '';

		try {
			const response = await fetch(`/api/projects/${project.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName.trim(),
					key: editKey.trim().toUpperCase(),
					description: editDescription.trim() || null
				})
			});

			if (!response.ok) {
				const error = await response.json();
				errorMessage = error.error || 'Failed to update project';
				return;
			}

			// Update the selected project in the store
			setSelectedProject({
				id: project.id,
				name: editName.trim(),
				key: editKey.trim().toUpperCase()
			});

			// Refresh the page data
			await invalidateAll();
			showEditModal = false;
		} catch (error) {
			console.error('Error updating project:', error);
			errorMessage = 'Failed to update project';
		} finally {
			isSaving = false;
		}
	}

	function openDeleteModal() {
		deleteConfirmation = '';
		deleteError = '';
		showDeleteModal = true;
	}

	async function deleteProject() {
		if (deleteConfirmation !== project.key) {
			deleteError = `Please type "${project.key}" to confirm deletion`;
			return;
		}

		isDeleting = true;
		deleteError = '';

		try {
			const response = await fetch(`/api/projects/${project.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				deleteError = error.message || 'Failed to delete project';
				return;
			}

			// Clear the selected project from the store
			setSelectedProject(null);

			// Redirect to projects list
			await goto('/projects');
		} catch (error) {
			console.error('Error deleting project:', error);
			deleteError = 'Failed to delete project';
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="mb-2 flex items-center gap-3">
					<h1 class="text-4xl font-bold">{project.name}</h1>
					<span class="badge preset-filled-surface-500">{project.key}</span>
				</div>
				{#if project.description}
					<p class="text-surface-600-300 text-lg">{project.description}</p>
				{/if}
			</div>
			<div class="flex gap-2">
				<button
					onclick={openDeleteModal}
					class="btn flex items-center gap-2 preset-filled-error-500"
				>
					<Trash2 class="h-4 w-4" />
					Delete
				</button>
				<button
					onclick={openEditModal}
					class="btn flex items-center gap-2 preset-filled-surface-500"
				>
					<Edit class="h-4 w-4" />
					Edit
				</button>
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
						<p class="text-surface-600-300 text-sm">Test Cases</p>
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
						<p class="text-surface-600-300 text-sm">Test Suites</p>
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
						<p class="text-surface-600-300 text-sm">Test Runs</p>
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
						<p class="text-surface-600-300 text-sm">Pass Rate</p>
						<p class="text-2xl font-bold">
							{stats.totalResults > 0
								? Math.round((stats.passedResults / stats.totalResults) * 100)
								: 0}%
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
				<div class="text-surface-600-300 py-8 text-center">
					<PlayCircle class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>No test runs yet</p>
					<a
						href="/projects/{project.id}/runs"
						class="mt-2 inline-block text-primary-500 hover:underline"
					>
						Create your first test run
					</a>
				</div>
			{:else}
				<div class="space-y-3">
					{#each recentRuns as run}
						<a
							href="/projects/{project.id}/runs/{run.id}"
							class="hover:bg-surface-100-800 block rounded-container border border-surface-300-700 p-4 transition-colors"
						>
							<div class="mb-2 flex items-center justify-between">
								<h3 class="font-medium">{run.name}</h3>
								<span class="badge {getStatusBgColor(run.status)} {getStatusColor(run.status)}">
									{run.status}
								</span>
							</div>
							<div class="text-surface-600-300 flex items-center gap-4 text-sm">
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
					class="hover:bg-surface-100-800 flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors"
				>
					<TestTube2 class="h-5 w-5 text-primary-500" />
					<div>
						<p class="font-medium">Manage Test Cases</p>
						<p class="text-surface-600-300 text-sm">Create and organize test cases</p>
					</div>
				</a>

				<a
					href="/projects/{project.id}/runs"
					class="hover:bg-surface-100-800 flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors"
				>
					<PlayCircle class="h-5 w-5 text-tertiary-500" />
					<div>
						<p class="font-medium">View Test Runs</p>
						<p class="text-surface-600-300 text-sm">Track test execution history</p>
					</div>
				</a>

				<a
					href="/docs"
					class="hover:bg-surface-100-800 flex items-center gap-3 rounded-container border border-surface-300-700 p-4 transition-colors"
				>
					<FileText class="h-5 w-5 text-secondary-500" />
					<div>
						<p class="font-medium">API Documentation</p>
						<p class="text-surface-600-300 text-sm">Integrate with your test framework</p>
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
				<p class="text-surface-600-300 mb-1 text-sm">Created by</p>
				<p class="font-medium">
					{project.creator.firstName || project.creator.email}
				</p>
			</div>
			{#if project.team}
				<div>
					<p class="text-surface-600-300 mb-1 text-sm">Team</p>
					<p class="font-medium">{project.team.name}</p>
				</div>
			{/if}
			<div>
				<p class="text-surface-600-300 mb-1 text-sm">Created on</p>
				<p class="font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
			</div>
			<div>
				<p class="text-surface-600-300 mb-1 text-sm">Last updated</p>
				<p class="font-medium">{new Date(project.updatedAt).toLocaleDateString()}</p>
			</div>
		</div>
	</div>
</div>

<!-- Edit Project Dialog -->
<Dialog open={showEditModal} onOpenChange={(e) => (showEditModal = e.open)}>
	<Dialog.Backdrop class="fixed inset-0 z-40 bg-black/50" />
	<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<Dialog.Content class="w-full max-w-lg">
			<div class="card rounded-container bg-surface-50-950 p-6 shadow-xl">
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-2xl font-bold">Edit Project</h2>
					<Dialog.CloseTrigger class="btn-icon preset-tonal">
						<span class="text-xl">&times;</span>
					</Dialog.CloseTrigger>
				</div>

				{#if errorMessage}
					<div class="mb-4 rounded-container bg-error-500/10 p-3 text-sm text-error-500">
						{errorMessage}
					</div>
				{/if}

				<form
					onsubmit={(e) => {
						e.preventDefault();
						saveProject();
					}}
					class="space-y-4"
				>
					<!-- Project Name -->
					<div>
						<label for="edit-name" class="mb-2 block text-sm font-medium">
							Project Name <span class="text-error-500">*</span>
						</label>
						<input
							id="edit-name"
							type="text"
							bind:value={editName}
							required
							class="input"
							placeholder="My Project"
						/>
					</div>

					<!-- Project Key -->
					<div>
						<label for="edit-key" class="mb-2 block text-sm font-medium">
							Project Key <span class="text-error-500">*</span>
						</label>
						<input
							id="edit-key"
							type="text"
							bind:value={editKey}
							required
							maxlength="10"
							pattern="[A-Z0-9]+"
							class="input uppercase"
							placeholder="PROJ"
							oninput={(e) => {
								const target = e.target as HTMLInputElement;
								target.value = target.value.toUpperCase();
							}}
						/>
						<p class="mt-1 text-xs text-surface-600-400">
							3-10 uppercase letters/numbers (e.g., PROJ, QA, TEST123)
						</p>
					</div>

					<!-- Description -->
					<div>
						<label for="edit-description" class="mb-2 block text-sm font-medium">
							Description
						</label>
						<textarea
							id="edit-description"
							bind:value={editDescription}
							rows="3"
							class="input"
							placeholder="Optional description"
						></textarea>
					</div>

					<!-- Actions -->
					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={() => (showEditModal = false)}
							class="btn preset-outlined"
							disabled={isSaving}
						>
							Cancel
						</button>
						<button type="submit" class="btn preset-filled-primary-500" disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		</Dialog.Content>
	</Dialog.Positioner>
</Dialog>

<!-- Delete Project Dialog -->
<Dialog open={showDeleteModal} onOpenChange={(e) => (showDeleteModal = e.open)}>
	<Dialog.Backdrop class="fixed inset-0 z-40 bg-black/50" />
	<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<Dialog.Content class="w-full max-w-lg">
			<div class="card rounded-container bg-surface-50-950 p-6 shadow-xl">
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-error-500">Delete Project</h2>
					<Dialog.CloseTrigger class="btn-icon preset-tonal">
						<span class="text-xl">&times;</span>
					</Dialog.CloseTrigger>
				</div>

				<div class="mb-6 space-y-4">
					<!-- Warning -->
					<div class="rounded-container border border-error-500/20 bg-error-500/10 p-4">
						<div class="flex items-start gap-3">
							<Trash2 class="mt-0.5 h-5 w-5 flex-shrink-0 text-error-500" />
							<div class="flex-1">
								<p class="mb-2 font-semibold text-error-500">This action cannot be undone!</p>
								<p class="text-surface-600-300 text-sm">
									Deleting this project will permanently remove:
								</p>
								<ul class="text-surface-600-300 mt-2 space-y-1 text-sm">
									<li>• All test cases ({stats.totalTestCases})</li>
									<li>• All test suites ({stats.totalSuites})</li>
									<li>• All test runs ({stats.totalTestRuns})</li>
									<li>• All test results ({stats.totalResults})</li>
									<li>• All attachments and files</li>
									<li>• All milestones and environments</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Project Info -->
					<div class="rounded-container border border-surface-300-700 bg-surface-100-900 p-4">
						<p class="text-surface-600-300 mb-2 text-sm">You are about to delete:</p>
						<p class="text-lg font-semibold">{project.name}</p>
						<p class="text-surface-600-300 mt-1 text-sm">Key: {project.key}</p>
					</div>

					{#if deleteError}
						<div class="rounded-container bg-error-500/10 p-3 text-sm text-error-500">
							{deleteError}
						</div>
					{/if}

					<!-- Confirmation Input -->
					<div>
						<label for="delete-confirmation" class="mb-2 block text-sm font-medium">
							Type <code class="rounded bg-surface-200-800 px-1.5 py-0.5 font-mono text-sm"
								>{project.key}</code
							> to confirm deletion
						</label>
						<input
							id="delete-confirmation"
							type="text"
							bind:value={deleteConfirmation}
							class="input"
							placeholder={project.key}
							autocomplete="off"
							disabled={isDeleting}
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showDeleteModal = false)}
						class="btn preset-outlined"
						disabled={isDeleting}
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={deleteProject}
						class="btn preset-filled-error-500"
						disabled={isDeleting || deleteConfirmation !== project.key}
					>
						{isDeleting ? 'Deleting...' : 'Delete Project'}
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Positioner>
</Dialog>
