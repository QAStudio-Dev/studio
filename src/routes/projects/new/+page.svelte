<script lang="ts">
	import { goto } from '$app/navigation';
	import { FolderPlus, AlertCircle, Sparkles } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let name = $state('');
	let key = $state('');
	let description = $state('');
	let loading = $state(false);
	let error = $state('');

	function handleKeyInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Auto-format key to uppercase
		key = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
	}

	function generateKeyFromName() {
		if (!name) return;
		// Generate key from name (first letters of words, max 6 chars)
		const words = name.trim().split(/\s+/);
		const generated = words
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 6);
		key = generated;
	}

	async function handleSubmit() {
		if (!name.trim() || !key.trim()) {
			error = 'Please enter project name and key';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/projects/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					key,
					description
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to create project');
			}

			const { project } = await res.json();

			// Redirect to project page
			goto(`/projects/${project.id}`);
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}
</script>

<div class="container mx-auto max-w-3xl px-4 py-12">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-4">
			<div class="p-3 bg-primary-500/10 rounded-lg">
				<FolderPlus class="w-8 h-8 text-primary-500" />
			</div>
			<div>
				<h1 class="text-3xl font-bold">Create New Project</h1>
				<p class="text-surface-600-300">Organize your test cases by project</p>
			</div>
		</div>
	</div>

	{#if error}
		<div class="alert preset-filled-error mb-6">
			<AlertCircle class="w-5 h-5" />
			<p>{error}</p>
		</div>
	{/if}

	{#if !data.canCreateProject}
		<div class="card p-8 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border-2 border-primary-500/20 mb-6">
			<div class="flex items-start gap-4">
				<div class="p-3 bg-primary-500/20 rounded-lg">
					<Sparkles class="w-8 h-8 text-primary-500" />
				</div>
				<div class="flex-1">
					<h2 class="text-2xl font-bold mb-2">Upgrade to Create More Projects</h2>
					<p class="text-surface-600-300 mb-4">
						You've reached the free plan limit of 1 project. Upgrade to Pro to create unlimited
						projects and unlock powerful features:
					</p>
					<ul class="space-y-2 mb-6 text-surface-700-200">
						<li class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
							<span>Unlimited projects</span>
						</li>
						<li class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
							<span>AI-powered failure analysis</span>
						</li>
						<li class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
							<span>Advanced reporting and analytics</span>
						</li>
						<li class="flex items-center gap-2">
							<div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
							<span>Custom integrations</span>
						</li>
					</ul>
					<div class="flex gap-3">
						<a href="/teams/new" class="btn preset-filled-primary-500">
							Upgrade to Pro
						</a>
						<a href="/projects" class="btn preset-outlined-surface-500">
							View My Projects
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="card p-8" class:opacity-50={!data.canCreateProject} class:pointer-events-none={!data.canCreateProject}>
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
			<!-- Project Name -->
			<label class="label">
				<span class="text-base font-medium mb-2 block">Project Name *</span>
				<input
					type="text"
					class="input text-lg"
					placeholder="My Awesome Project"
					bind:value={name}
					oninput={generateKeyFromName}
					disabled={loading}
					required
				/>
			</label>

			<!-- Project Key -->
			<label class="label">
				<span class="text-base font-medium mb-2 block">Project Key *</span>
				<input
					type="text"
					class="input text-lg font-mono"
					placeholder="PROJ"
					value={key}
					oninput={handleKeyInput}
					disabled={loading}
					maxlength="10"
					required
				/>
				<p class="text-sm text-surface-600-300 mt-2">
					2-10 uppercase letters or numbers. Used to identify test cases (e.g., {key || 'PROJ'}-123)
				</p>
			</label>

			<!-- Description -->
			<label class="label">
				<span class="text-base font-medium mb-2 block">Description (optional)</span>
				<textarea
					class="textarea"
					rows="4"
					placeholder="What will you be testing in this project?"
					bind:value={description}
					disabled={loading}
				></textarea>
			</label>

			<!-- Actions -->
			<div class="flex items-center justify-between pt-4">
				<a
					href="/dashboard"
					class="btn preset-outlined-surface-500"
					class:opacity-50={loading}
					class:pointer-events-none={loading}
				>
					Cancel
				</a>

				<button
					type="submit"
					class="btn preset-filled-primary-500 text-lg px-8"
					disabled={loading || !name.trim() || !key.trim()}
				>
					{#if loading}
						Creating...
					{:else}
						Create Project
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Help Text -->
	<div class="mt-6 p-4 bg-surface-50-900 rounded-container text-sm">
		<p class="text-surface-600-300">
			<strong>💡 Tip:</strong> Choose a short, memorable project key. It will be used as a prefix
			for all test cases in this project.
		</p>
	</div>
</div>
