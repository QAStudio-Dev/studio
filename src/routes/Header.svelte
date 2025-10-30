<script lang="ts">
	import { page } from '$app/state';
	import { Popover } from '@skeletonlabs/skeleton-svelte';
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ProjectSelector from '$lib/components/ProjectSelector.svelte';
	import { selectedProject } from '$lib/stores/projectStore';

	let currentProject = $state($selectedProject);
	let projects = $state<Array<{ id: string; name: string; key: string }>>([]);

	// Subscribe to store changes
	$effect(() => {
		currentProject = $selectedProject;
	});

	// Fetch user's projects for the selector
	$effect(() => {
		if (page.data?.user) {
			fetchProjects();
		}
	});

	async function fetchProjects() {
		try {
			const res = await fetch('/api/projects/list');
			if (res.ok) {
				const data = await res.json();
				projects = data.projects;
			}
		} catch (err) {
			console.error('Failed to fetch projects:', err);
		}
	}

	let isActive = $derived.by(() => {
		return (path: string) => {
			if (path === '/') {
				return page.url.pathname === '/';
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

				<!-- Main Navigation -->
				<nav class="hidden items-center gap-2 md:flex">
					<!-- Only show these navigation items when signed in -->
					<SignedIn>
						<!-- Divider -->
						<div class="mx-1 h-6 w-px bg-surface-300-700"></div>
						<!-- Project Selector First -->
						<div class="mr-2">
							<ProjectSelector {projects} />
						</div>

						<!-- Divider -->
						<div class="mx-1 h-6 w-px bg-surface-300-700"></div>

						<!-- Main Navigation Links -->
						<a
							href="/dashboard"
							class="rounded-base px-4 py-2 transition-colors {isActive('/dashboard')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Dashboard
						</a>
						<a
							href="/test-runs"
							class="rounded-base px-4 py-2 transition-colors {isActive('/test-runs')
								? 'bg-primary-500 text-white'
								: 'hover:bg-surface-200-800'}"
						>
							Test Runs
						</a>

						<!-- Test Cases (only when project selected) -->
						{#if currentProject}
							<a
								href="/projects/{currentProject.id}"
								class="rounded-base px-4 py-2 transition-colors {isActive(
									`/projects/${currentProject.id}`
								)
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								Test Cases
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
