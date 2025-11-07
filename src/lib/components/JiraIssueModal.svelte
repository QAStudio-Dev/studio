<script lang="ts">
	import { X, ExternalLink, Loader2, AlertCircle } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		testCaseId?: string;
		testResultId?: string;
		prefillSummary?: string;
		prefillDescription?: string;
	}

	let {
		open = $bindable(),
		onClose,
		testCaseId,
		testResultId,
		prefillSummary = '',
		prefillDescription = ''
	}: Props = $props();

	// Form state
	let loading = $state(false);
	let loadingIntegrations = $state(true);
	let loadingProjects = $state(false);
	let loadingIssueTypes = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let createdIssueKey = $state<string | null>(null);
	let createdIssueUrl = $state<string | null>(null);

	// Data
	let integrations = $state<any[]>([]);
	let projects = $state<any[]>([]);
	let issueTypes = $state<any[]>([]);

	// Form values
	let selectedIntegrationId = $state('');
	let selectedProjectKey = $state('');
	let selectedIssueType = $state('');
	let selectedPriority = $state('MEDIUM');
	let summary = $state(prefillSummary);
	let description = $state(prefillDescription);

	// Computed: Get selected integration
	let selectedIntegration = $derived(integrations.find((i) => i.id === selectedIntegrationId));

	// Watch for prefill changes
	$effect(() => {
		summary = prefillSummary;
		description = prefillDescription;
	});

	// Load integrations when modal opens
	$effect(() => {
		if (open) {
			loadIntegrations();
		}
	});

	// Load projects when integration selected
	$effect(() => {
		if (selectedIntegrationId) {
			loadProjects();
		}
	});

	// Load issue types when project selected
	$effect(() => {
		if (selectedIntegrationId && selectedProjectKey) {
			loadIssueTypes();
		}
	});

	async function loadIntegrations() {
		loadingIntegrations = true;
		error = null;
		try {
			const res = await fetch('/api/integrations?type=JIRA');
			if (!res.ok) throw new Error('Failed to load Jira integrations');

			const data = await res.json();
			integrations = data.integrations || [];

			// Auto-select first integration if only one exists
			if (integrations.length === 1) {
				selectedIntegrationId = integrations[0].id;
			}

			if (integrations.length === 0) {
				error = 'No Jira integrations found. Please connect Jira in Settings first.';
			}
		} catch (err: any) {
			console.error(err);
			error = err.message || 'Failed to load Jira integrations';
		} finally {
			loadingIntegrations = false;
		}
	}

	async function loadProjects() {
		if (!selectedIntegrationId) return;

		loadingProjects = true;
		error = null;
		try {
			const res = await fetch(`/api/integrations/jira/${selectedIntegrationId}/projects`);
			if (!res.ok) throw new Error('Failed to load projects');

			const data = await res.json();
			projects = data.projects || [];

			// Reset project and issue type selection
			selectedProjectKey = '';
			selectedIssueType = '';
			issueTypes = [];
		} catch (err: any) {
			console.error(err);
			error = err.message || 'Failed to load projects';
		} finally {
			loadingProjects = false;
		}
	}

	async function loadIssueTypes() {
		if (!selectedIntegrationId || !selectedProjectKey) return;

		loadingIssueTypes = true;
		error = null;
		try {
			const res = await fetch(
				`/api/integrations/jira/${selectedIntegrationId}/issue-types?projectKey=${selectedProjectKey}`
			);
			if (!res.ok) throw new Error('Failed to load issue types');

			const data = await res.json();
			issueTypes = data.issueTypes || [];

			// Auto-select "Bug" if available, otherwise first type
			const bugType = issueTypes.find((t) => t.name.toLowerCase() === 'bug');
			selectedIssueType = bugType ? bugType.id : issueTypes[0]?.id || '';
		} catch (err: any) {
			console.error(err);
			error = err.message || 'Failed to load issue types';
		} finally {
			loadingIssueTypes = false;
		}
	}

	async function handleSubmit() {
		if (!selectedIntegrationId || !selectedProjectKey || !selectedIssueType || !summary.trim()) {
			error = 'Please fill in all required fields';
			return;
		}

		loading = true;
		error = null;
		success = false;

		try {
			const payload: any = {
				integrationId: selectedIntegrationId,
				projectKey: selectedProjectKey,
				issueType: selectedIssueType,
				summary: summary.trim(),
				description: description.trim() || undefined,
				priority: selectedPriority
			};

			// Only send the ID that was provided
			if (testResultId) {
				payload.testResultId = testResultId;
			} else if (testCaseId) {
				payload.testCaseId = testCaseId;
			}

			const res = await fetch('/api/integrations/jira/issues', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create issue');
			}

			const data = await res.json();
			success = true;
			createdIssueKey = data.issue.key;
			createdIssueUrl = data.issue.url;

			// Close modal after 2 seconds
			setTimeout(() => {
				handleClose();
			}, 2000);
		} catch (err: any) {
			console.error(err);
			error = err.message || 'Failed to create Jira issue';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		// Reset state
		success = false;
		error = null;
		createdIssueKey = null;
		createdIssueUrl = null;
		selectedProjectKey = '';
		selectedIssueType = '';
		issueTypes = [];
		projects = [];

		onClose();
	}
</script>

{#if open}
	<!-- Backdrop -->
	<button
		onclick={handleClose}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
		aria-label="Close dialog"
	></button>

	<!-- Dialog -->
	<div class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
		<div
			class="border-surface-200-700 pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto card border bg-surface-50-950 p-6 shadow-2xl"
		>
			<div class="mb-6 flex items-start justify-between">
				<div>
					<div class="mb-2 flex items-center gap-3">
						<svg class="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M11.5 2C10.5 2 9.7 2.8 9.7 3.8v7.5c0 1 .8 1.8 1.8 1.8h7.5c1 0 1.8-.8 1.8-1.8V3.8c0-1-.8-1.8-1.8-1.8h-7.5z"
							/>
							<path
								d="M3.8 2C2.8 2 2 2.8 2 3.8v7.5c0 1 .8 1.8 1.8 1.8h7.5c1 0 1.8-.8 1.8-1.8V3.8c0-1-.8-1.8-1.8-1.8H3.8z"
							/>
							<path d="M11.5 11.3h7.5l-.1 8.9H11.5z" />
						</svg>
						<h2 class="text-2xl font-bold">Create Jira Issue</h2>
					</div>
					<p class="text-surface-600-300">Create a new issue in Jira linked to this test</p>
				</div>
				<button class="preset-ghost-surface-500 btn btn-sm" onclick={handleClose}>
					<X class="h-4 w-4" />
				</button>
			</div>

			{#if success && createdIssueKey}
				<!-- Success Message -->
				<div class="mb-4 rounded-container border-2 border-success-500 bg-success-50-950 p-4">
					<div class="mb-2 flex items-center gap-2">
						<svg
							class="h-5 w-5 text-success-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<h3 class="font-semibold text-success-500">Issue Created Successfully!</h3>
					</div>
					<p class="mb-3 text-sm">
						Jira issue <strong>{createdIssueKey}</strong> has been created and linked to this test.
					</p>
					{#if createdIssueUrl}
						<a
							href={createdIssueUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="preset-tonal-success-500 btn btn-sm"
						>
							<ExternalLink class="h-4 w-4" />
							View in Jira
						</a>
					{/if}
				</div>
			{:else}
				<!-- Error Message -->
				{#if error}
					<div class="mb-4 flex items-start gap-3 rounded-container bg-error-500/10 p-4">
						<AlertCircle class="mt-0.5 h-5 w-5 text-error-500" />
						<div class="flex-1">
							<div class="font-semibold text-error-500">Error</div>
							<div class="text-sm text-error-500">{error}</div>
						</div>
					</div>
				{/if}

				{#if loadingIntegrations}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="h-8 w-8 animate-spin text-primary-500" />
					</div>
				{:else if integrations.length === 0}
					<div class="py-8 text-center">
						<AlertCircle class="mx-auto mb-3 h-12 w-12 text-warning-500" />
						<h3 class="mb-2 text-lg font-semibold">No Jira Integration Found</h3>
						<p class="text-surface-600-300 mb-4">
							Connect Jira in Settings to create issues from test failures.
						</p>
						<a href="/settings?tab=integrations" class="btn preset-filled-primary-500">
							Go to Settings
						</a>
					</div>
				{:else}
					<!-- Form -->
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
						class="space-y-4"
					>
						<!-- Jira Integration -->
						{#if integrations.length > 1}
							<div>
								<label for="integration" class="mb-2 block text-sm font-medium">
									Jira Integration <span class="text-error-500">*</span>
								</label>
								<select
									id="integration"
									class="select w-full"
									bind:value={selectedIntegrationId}
									required
									disabled={loading}
								>
									<option value="">Select integration...</option>
									{#each integrations as integration}
										<option value={integration.id}>{integration.name}</option>
									{/each}
								</select>
							</div>
						{/if}

						<!-- Project -->
						<div>
							<label for="project" class="mb-2 block text-sm font-medium">
								Project <span class="text-error-500">*</span>
							</label>
							<select
								id="project"
								class="select w-full"
								bind:value={selectedProjectKey}
								required
								disabled={loading || loadingProjects || !selectedIntegrationId}
							>
								<option value="">
									{loadingProjects ? 'Loading projects...' : 'Select project...'}
								</option>
								{#each projects as project}
									<option value={project.key}>{project.name} ({project.key})</option>
								{/each}
							</select>
						</div>

						<!-- Issue Type -->
						<div>
							<label for="issueType" class="mb-2 block text-sm font-medium">
								Issue Type <span class="text-error-500">*</span>
							</label>
							<select
								id="issueType"
								class="select w-full"
								bind:value={selectedIssueType}
								required
								disabled={loading || loadingIssueTypes || !selectedProjectKey}
							>
								<option value="">
									{loadingIssueTypes ? 'Loading issue types...' : 'Select issue type...'}
								</option>
								{#each issueTypes as issueType}
									<option value={issueType.id}>{issueType.name}</option>
								{/each}
							</select>
						</div>

						<!-- Priority -->
						<div>
							<label for="priority" class="mb-2 block text-sm font-medium">Priority</label>
							<select
								id="priority"
								class="select w-full"
								bind:value={selectedPriority}
								disabled={loading}
							>
								<option value="HIGHEST">Highest</option>
								<option value="HIGH">High</option>
								<option value="MEDIUM">Medium</option>
								<option value="LOW">Low</option>
								<option value="LOWEST">Lowest</option>
							</select>
						</div>

						<!-- Summary -->
						<div>
							<label for="summary" class="mb-2 block text-sm font-medium">
								Summary <span class="text-error-500">*</span>
							</label>
							<input
								id="summary"
								type="text"
								class="input w-full"
								placeholder="Brief description of the issue"
								bind:value={summary}
								required
								disabled={loading}
							/>
						</div>

						<!-- Description -->
						<div>
							<label for="description" class="mb-2 block text-sm font-medium">Description</label>
							<textarea
								id="description"
								class="textarea w-full"
								rows="6"
								placeholder="Detailed description of the issue..."
								bind:value={description}
								disabled={loading}
							></textarea>
							<p class="text-surface-500-400 mt-1 text-xs">
								Test case details and error information will be automatically included
							</p>
						</div>

						<!-- Actions -->
						<div class="border-surface-200-700 flex justify-end gap-3 border-t pt-4">
							<button
								type="button"
								onclick={handleClose}
								class="btn preset-outlined-surface-500"
								disabled={loading}
							>
								Cancel
							</button>
							<button
								type="submit"
								class="btn preset-filled-primary-500"
								disabled={loading ||
									!selectedIntegrationId ||
									!selectedProjectKey ||
									!selectedIssueType}
							>
								{#if loading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Creating...
								{:else}
									Create Issue
								{/if}
							</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>
	</div>
{/if}
