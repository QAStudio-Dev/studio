<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { Popover, usePopover, Avatar } from '@skeletonlabs/skeleton-svelte';
	import { X, Menu, User, LogOut } from 'lucide-svelte';
	import {
		projectsRefreshTrigger,
		selectedProject,
		setSelectedProject,
		clearSelectedProject,
		type SelectedProject
	} from '$lib/stores/projectStore';

	let selectedProjectId = $state<string | null>(null);
	let mobileMenuOpen = $state(false);

	// Get user and projects from page data
	const user = $derived(page.data.user);
	const isAuthenticated = $derived(!!page.data.userId);
	const projects = $derived<SelectedProject[]>(page.data.projects || []);

	// Create popover instance
	const popover = usePopover({ id: 'project-selector' });
	const userMenuPopover = usePopover({ id: 'user-menu' });

	// Handle logout
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		// Invalidate all data to clear user state
		await invalidateAll();
		goto('/login');
	}

	// Validate and sync project selection
	// Handles URL priority, localStorage fallback, and project validation
	$effect(() => {
		const projectList = projects; // Track dependency
		const pathname = page.url.pathname;
		const match = pathname.match(/^\/projects\/([^/]+)/);

		// Wait until projects are loaded
		if (projectList.length === 0) return;

		if (match) {
			// URL takes priority - sync to store if different
			const urlProjectId = match[1];
			const project = projectList.find((p) => p.id === urlProjectId);

			if (project && urlProjectId !== selectedProjectId) {
				selectedProjectId = urlProjectId;
				setSelectedProject(project);
			}
		} else if (!selectedProjectId) {
			// Not on a project page and no project selected - use stored or default
			const stored = $selectedProject;

			// Validate stored project exists in current projects list
			const storedProjectExists = stored && projectList.some((p) => p.id === stored.id);

			if (storedProjectExists && stored) {
				// Only update if different to prevent infinite loop
				if (selectedProjectId !== stored.id) {
					selectedProjectId = stored.id;
				}
			} else {
				// Stored project was deleted or doesn't exist, default to first project
				if (stored) {
					clearSelectedProject();
				}
				const firstProject = projectList[0];
				// Only update if different to prevent infinite loop
				if (selectedProjectId !== firstProject.id) {
					selectedProjectId = firstProject.id;
					setSelectedProject(firstProject);
				}
			}
		}
	});

	// Watch for project refresh trigger (when projects are created/deleted)
	// This will invalidate all data and cause the layout to re-run
	$effect(() => {
		const trigger = $projectsRefreshTrigger;
		// Only refetch if trigger increments (skip initial value of 0)
		if (trigger > 0) {
			invalidateAll();
		}
	});

	function switchProject(projectId: string) {
		const project = projects.find((p) => p.id === projectId);
		if (project) {
			setSelectedProject(project);
		}
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
				{#if isAuthenticated}
					<div class="hidden lg:block">
						{#if projects.length === 0}
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
											{projects.find((p) => p.id === selectedProjectId)
												?.name || 'Select Project'}
										{:else}
											Select Project
										{/if}
									</span>
									<svg
										class="h-3.5 w-3.5 transition-transform {popover().open
											? 'rotate-180'
											: ''}"
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
													<span class="text-surface-500-400 text-xs"
														>{project.key}</span
													>
												</div>
											</button>
										{/each}
									</Popover.Content>
								</Popover.Positioner>
							</Popover.Provider>
						{/if}
					</div>
				{/if}

				<!-- Main Navigation -->
				<nav class="hidden items-center gap-2 lg:flex">
					<!-- Only show these navigation items when signed in -->
					{#if isAuthenticated}
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

						<!-- Authenticators -->
						<a
							href="/authenticators"
							class="rounded-base px-4 py-2 transition-colors {isActive(
								'/authenticators'
							)
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Authenticators
						</a>

						<!-- SMS Messages -->
						<a
							href="/sms"
							class="rounded-base px-4 py-2 transition-colors {isActive('/sms')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							SMS
						</a>

						<!-- Reports -->
						<a
							href="/reports"
							class="rounded-base px-4 py-2 transition-colors {isActive('/reports')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Reports
						</a>
					{/if}

					<!-- API Docs -->
					<a
						href="/docs"
						class="rounded-base px-4 py-2 transition-colors {isActive('/docs')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						API Docs
					</a>
				</nav>
			</div>

			<!-- Right Side Actions -->
			<div class="flex items-center gap-4">
				<!-- Theme Toggle -->
				<ThemeToggle />

				<!-- Auth Section -->
				{#if !isAuthenticated}
					<a
						href="/login"
						class="rounded-base bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600"
					>
						Sign In
					</a>
				{:else if user}
					<!-- User Menu -->
					<Popover.Provider value={userMenuPopover}>
						<Popover.Trigger
							class="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
						>
							<Avatar class="h-8 w-8">
								{#if user.imageUrl}
									<Avatar.Image src={user.imageUrl} alt={user.email} />
								{:else}
									<Avatar.Fallback class="bg-primary-500 text-white">
										{user.firstName?.[0] || user.email[0].toUpperCase()}
									</Avatar.Fallback>
								{/if}
							</Avatar>
						</Popover.Trigger>
						<Popover.Positioner>
							<Popover.Content
								class="mt-2 w-48 rounded-container border border-surface-300-700 bg-surface-100-900 p-2 shadow-xl"
							>
								<div class="mb-2 border-b border-surface-300-700 px-3 py-2">
									<p class="text-sm font-medium">
										{user.firstName}
										{user.lastName}
									</p>
									<p class="text-surface-500-400 text-xs">{user.email}</p>
								</div>
								<a
									href="/profile"
									onclick={() => userMenuPopover().setOpen(false)}
									class="flex items-center gap-2 rounded-base px-3 py-2 transition-colors hover:bg-surface-200-800"
								>
									<User class="h-4 w-4" />
									<span>Profile</span>
								</a>
								<button
									onclick={() => {
										userMenuPopover().setOpen(false);
										handleLogout();
									}}
									class="flex w-full items-center gap-2 rounded-base px-3 py-2 text-left transition-colors hover:bg-surface-200-800"
								>
									<LogOut class="h-4 w-4" />
									<span>Sign Out</span>
								</button>
							</Popover.Content>
						</Popover.Positioner>
					</Popover.Provider>
				{/if}

				<!-- Mobile Menu Button -->
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="rounded-base px-3 py-2 transition-colors hover:bg-surface-200-800 lg:hidden"
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
			<div class="border-t border-surface-300-700 py-4 lg:hidden">
				<nav class="flex flex-col gap-1">
					<!-- Project Selector in Mobile Menu -->
					{#if isAuthenticated}
						<div class="mb-2 px-2">
							{#if projects.length === 0}
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
									<div
										class="mb-2 px-1 text-xs font-semibold text-surface-500 uppercase"
									>
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
												<span class="text-sm font-medium"
													>{project.name}</span
												>
												<span class="text-surface-500-400 text-xs"
													>{project.key}</span
												>
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

						<!-- Authenticators -->
						<a
							href="/authenticators"
							onclick={closeMobileMenu}
							class="rounded-base px-4 py-2 transition-colors {isActive(
								'/authenticators'
							)
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Authenticators
						</a>

						<!-- SMS Messages -->
						<a
							href="/sms"
							onclick={closeMobileMenu}
							class="rounded-base px-4 py-2 transition-colors {isActive('/sms')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							SMS
						</a>

						<!-- Reports -->
						<a
							href="/reports"
							onclick={closeMobileMenu}
							class="rounded-base px-4 py-2 transition-colors {isActive('/reports')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Reports
						</a>
					{/if}

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
