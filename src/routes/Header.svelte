<script lang="ts">
	import { page } from '$app/state';
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Popover, usePopover } from '@skeletonlabs/skeleton-svelte';

	let projects = $state<any[]>([]);
	let selectedProjectId = $state<string | null>(null);

	// Create popover instance
	const popover = usePopover({ id: 'project-selector' });

	// Determine selected project from URL
	$effect(() => {
		const match = page.url.pathname.match(/^\/projects\/([^/]+)/);
		if (match) {
			selectedProjectId = match[1];
		} else {
			selectedProjectId = null;
		}
	});

	// Fetch projects when component mounts
	onMount(async () => {
		try {
			const response = await fetch('/api/projects');
			if (response.ok) {
				const data = await response.json();
				// API returns projects array directly, not wrapped in {projects: [...]}
				projects = Array.isArray(data) ? data : [];
			}
		} catch (error) {
			console.error('Failed to fetch projects:', error);
		}
	});

	function switchProject(projectId: string) {
		goto(`/projects/${projectId}/runs`);
	}

	let isActive = $derived.by(() => {
		/**
		 * Determines if a route is active.
		 * @param path - The path to match.
		 * @param mode - 'exact' for exact match, 'startsWith' (default) for prefix match.
		 */
		return (path: string, mode: 'exact' | 'startsWith' = 'startsWith') => {
			if (mode === 'exact') {
				return page.url.pathname === path;
			}
			return page.url.pathname.startsWith(path);
		};
	});
</script>

<header
	class="sticky top-0 z-50 border-b border-surface-300-700 bg-surface-50-950 backdrop-blur-sm"
>
	<div class="container mx-auto px-4">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo/Brand -->
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-2 transition-opacity hover:opacity-80">
					<img src="/full.svg" alt="QA Studio Logo" class="h-8" />
				</a>

				<!-- Project Selector (next to logo) -->
				<SignedIn>
					<Popover.Provider value={popover}>
						<Popover.Trigger
							class="flex items-center gap-2 rounded-base border border-surface-300-700 px-3 py-1.5 transition-colors hover:bg-surface-200-800"
						>
							<span class="text-sm font-medium">
								{#if projects.length === 0}
									Loading...
								{:else if selectedProjectId}
									{projects.find((p) => p.id === selectedProjectId)?.name || 'Select Project'}
								{:else}
									Select Project
								{/if}
							</span>
							<svg
								class="h-3.5 w-3.5 transition-transform {popover().open ? 'rotate-180' : ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</Popover.Trigger>
						<Popover.Positioner>
							<Popover.Content
								class="mt-2 max-h-96 w-64 overflow-y-auto rounded-container border border-surface-300-700 bg-surface-100-900 p-2 shadow-xl"
							>
								{#if projects.length > 0}
									<!-- View all projects link -->
									<a
										href="/projects"
										onclick={() => popover().setOpen(false)}
										class="mb-2 block w-full rounded-base border-b border-surface-300-700 px-3 py-2 pb-2 text-left font-medium text-primary-500 transition-colors hover:bg-surface-200-800"
									>
										📁 View All Projects
									</a>

									{#each projects as project}
										<button
											onclick={() => {
												popover().setOpen(false);
												switchProject(project.id);
											}}
											class="w-full rounded-base px-3 py-2 text-left transition-colors hover:bg-surface-200-800 {selectedProjectId ===
											project.id
												? 'bg-surface-200-800'
												: ''}"
										>
											<div class="flex flex-col">
												<span class="font-medium">{project.name}</span>
												<span class="text-surface-500-400 text-xs">{project.key}</span>
											</div>
										</button>
									{/each}
								{/if}
							</Popover.Content>
						</Popover.Positioner>
					</Popover.Provider>
				</SignedIn>

				<!-- Main Navigation -->
				<nav class="hidden items-center gap-2 md:flex">
					<!-- Only show these navigation items when signed in -->
					<SignedIn>
						<!-- Divider -->
						<div class="mx-1 h-6 w-px bg-surface-300-700"></div>

						<!-- Main Navigation Links -->
						{#if selectedProjectId}
							<a
								href="/projects/{selectedProjectId}"
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${selectedProjectId}`,
									'exact'
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Overview
							</a>
						{/if}

						<!-- Show Runs/Cases navigation when a project is selected -->
						{#if selectedProjectId}
							<a
								href="/projects/{selectedProjectId}/runs"
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${selectedProjectId}/runs`,
									'exact'
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Runs
							</a>
							<a
								href="/projects/{selectedProjectId}/cases"
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${selectedProjectId}/cases`,
									'exact'
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Cases
							</a>
						{/if}

						<!-- Divider -->
						<div class="mx-1 h-6 w-px bg-surface-300-700"></div>

						<!-- Settings -->
						<a
							href="/settings"
							class="rounded-base px-4 py-2 transition-colors {isActive('/settings')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Settings
						</a>

						<!-- API Docs -->
						<a
							href="/docs"
							class="rounded-base px-4 py-2 transition-colors {isActive('/docs')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							API Docs
						</a>
					</SignedIn>
				</nav>
			</div>

			<!-- Right Side Actions -->
			<div class="flex items-center gap-4">
				<!-- Theme Toggle -->
				<ThemeToggle />

				<!-- Auth Section -->
				<SignedOut>
					<SignInButton />
				</SignedOut>
				<SignedIn>
					<UserButton />
				</SignedIn>

				<!-- Mobile Menu Button -->
				<button class="rounded-base px-3 py-2 transition-colors hover:bg-surface-200-800 md:hidden">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</header>
