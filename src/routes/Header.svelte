<script lang="ts">
	import { page } from '$app/state';
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { goto } from '$app/navigation';
	import { Popover, usePopover } from '@skeletonlabs/skeleton-svelte';
	import { X, Menu } from 'lucide-svelte';

	let projects = $state<any[]>([]);
	let selectedProjectId = $state<string | null>(null);
	let isLoadingProjects = $state(false);
	let mobileMenuOpen = $state(false);

	// Create popover instance
	const popover = usePopover({ id: 'project-selector' });

	// Determine selected project from URL, or default to first project
	$effect(() => {
		const match = page.url.pathname.match(/^\/projects\/([^/]+)/);
		if (match) {
			selectedProjectId = match[1];
		} else if (projects.length > 0 && !selectedProjectId) {
			// Default to first project if none selected
			selectedProjectId = projects[0].id;
		}
	});

	// Fetch projects - always fetches fresh data, relies on Redis cache on backend
	async function fetchProjects() {
		if (isLoadingProjects) return;

		isLoadingProjects = true;
		try {
			const response = await fetch('/api/projects');
			if (response.ok) {
				const data = await response.json();
				projects = Array.isArray(data) ? data : [];
			}
		} catch (error) {
			console.error('Failed to fetch projects:', error);
		} finally {
			isLoadingProjects = false;
		}
	}

	// Refetch projects when user navigates (relies on backend Redis cache for performance)
	$effect(() => {
		// Watch pathname changes to refetch projects
		page.url.pathname;
		fetchProjects();
	});

	// Svelte action to fetch projects when element mounts (only used within SignedIn)
	function initProjectFetch(node: HTMLElement) {
		fetchProjects();
		return {
			destroy() {}
		};
	}

	function switchProject(projectId: string) {
		mobileMenuOpen = false;
		goto(`/projects/${projectId}`);
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Close mobile menu when route changes
	$effect(() => {
		page.url.pathname;
		mobileMenuOpen = false;
	});

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
					<div use:initProjectFetch class="hidden md:block">
						{#if isLoadingProjects && projects.length === 0}
							<!-- Loading state (only show if no projects cached) -->
							<div
								class="flex items-center gap-2 rounded-base border border-surface-300-700 px-3 py-1.5"
							>
								<span class="text-surface-600-300 text-sm font-medium">Loading...</span>
							</div>
						{:else if projects.length === 0}
							<!-- No projects - show New Project button -->
							<a
								href="/projects/new"
								class="flex items-center gap-2 rounded-base border border-primary-500 bg-primary-500 px-3 py-1.5 transition-colors hover:bg-primary-600"
							>
								<span class="text-sm font-medium text-white">New Project</span>
							</a>
						{:else}
							<!-- Has projects - show selector -->
							<Popover.Provider value={popover}>
								<Popover.Trigger
									class="flex items-center gap-2 rounded-base border border-surface-300-700 px-3 py-1.5 transition-colors hover:bg-surface-200-800"
								>
									<span class="text-sm font-medium">
										{#if selectedProjectId}
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
									</Popover.Content>
								</Popover.Positioner>
							</Popover.Provider>
						{/if}
					</div>
				</SignedIn>

				<!-- Main Navigation -->
				<nav class="hidden items-center gap-2 md:flex">
					<!-- Only show these navigation items when signed in -->
					<SignedIn>
						{#if selectedProjectId}
							<!-- Divider -->
							<div class="mx-1 h-6 w-px bg-surface-300-700"></div>

							<!-- Main Navigation Links -->
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

							<!-- Show Runs/Cases navigation when a project is selected -->
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

							<!-- Divider -->
							<div class="mx-1 h-6 w-px bg-surface-300-700"></div>
						{/if}

						<!-- Settings -->
						<a
							href="/settings"
							class="rounded-base px-4 py-2 transition-colors {isActive('/settings')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Settings
						</a>
					</SignedIn>
				</nav>
			</div>

			<!-- Right Side Actions -->
			<div class="flex items-center gap-4">
				<!-- API Docs - Hidden on mobile -->
				<a
					href="/docs"
					class="hidden rounded-base px-4 py-2 transition-colors md:block {isActive('/docs')
						? 'bg-primary-500 text-white'
						: 'hover:bg-surface-200-800'}"
				>
					API Docs
				</a>

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
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="rounded-base px-3 py-2 transition-colors hover:bg-surface-200-800 md:hidden"
					aria-label="Toggle menu"
				>
					{#if mobileMenuOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="border-t border-surface-300-700 py-4 md:hidden">
				<nav class="flex flex-col gap-1">
					<!-- Project Selector in Mobile Menu -->
					<SignedIn>
						<div use:initProjectFetch class="mb-2 px-2">
							{#if isLoadingProjects && projects.length === 0}
								<!-- Loading state (only show if no projects cached) -->
								<div
									class="flex items-center gap-2 rounded-base border border-surface-300-700 px-3 py-2"
								>
									<span class="text-surface-600-300 text-sm font-medium">Loading projects...</span>
								</div>
							{:else if projects.length === 0}
								<!-- No projects -->
								<a
									href="/projects/new"
									onclick={closeMobileMenu}
									class="flex items-center gap-2 rounded-base border border-primary-500 bg-primary-500 px-3 py-2 transition-colors hover:bg-primary-600"
								>
									<span class="text-sm font-medium text-white">New Project</span>
								</a>
							{:else}
								<!-- Project Selector -->
								<div class="rounded-base border border-surface-300-700 p-2">
									<div class="mb-2 px-1 text-xs font-semibold text-surface-500 uppercase">
										Projects
									</div>
									<a
										href="/projects"
										onclick={closeMobileMenu}
										class="mb-1 block w-full rounded-base px-2 py-1.5 text-left text-sm font-medium text-primary-500 transition-colors hover:bg-surface-200-800"
									>
										📁 View All Projects
									</a>
									{#each projects as project}
										<button
											onclick={() => switchProject(project.id)}
											class="w-full rounded-base px-2 py-1.5 text-left transition-colors hover:bg-surface-200-800 {selectedProjectId ===
											project.id
												? 'bg-surface-200-800'
												: ''}"
										>
											<div class="flex flex-col">
												<span class="text-sm font-medium">{project.name}</span>
												<span class="text-surface-500-400 text-xs">{project.key}</span>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Main Navigation Links -->
						{#if selectedProjectId}
							<a
								href="/projects/{selectedProjectId}"
								onclick={closeMobileMenu}
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${selectedProjectId}`,
									'exact'
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Overview
							</a>
							<a
								href="/projects/{selectedProjectId}/runs"
								onclick={closeMobileMenu}
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
								onclick={closeMobileMenu}
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${selectedProjectId}/cases`,
									'exact'
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Cases
							</a>

							<!-- Divider -->
							<div class="my-2 h-px bg-surface-300-700"></div>
						{/if}

						<!-- Settings -->
						<a
							href="/settings"
							onclick={closeMobileMenu}
							class="rounded-base px-4 py-2 transition-colors {isActive('/settings')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Settings
						</a>
					</SignedIn>

					<!-- Divider -->
					<div class="my-2 h-px bg-surface-300-700"></div>

					<!-- API Docs -->
					<a
						href="/docs"
						onclick={closeMobileMenu}
						class="rounded-base px-4 py-2 transition-colors {isActive('/docs')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						API Docs
					</a>
				</nav>
			</div>
		{/if}
	</div>
</header>
