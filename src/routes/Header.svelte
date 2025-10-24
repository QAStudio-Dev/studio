<script lang="ts">
	import { page } from '$app/state';
	import { Popover } from '@skeletonlabs/skeleton-svelte';
	import { SignedIn, SignedOut, SignInButton, UserButton } from 'svelte-clerk/client';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

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
			<div class="flex items-center gap-8">
				<a href="/" class="flex items-center gap-2 transition-opacity hover:opacity-80">
					<div class="flex h-8 w-8 items-center justify-center rounded-base bg-primary-500">
						<span class="text-lg font-bold text-white">QA</span>
					</div>
					<span class="text-xl font-bold">QA Studio</span>
				</a>

				<!-- Main Navigation -->
				<nav class="hidden items-center gap-1 md:flex">
					<a
						href="/"
						class="rounded-base px-4 py-2 transition-colors {isActive('/')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						Dashboard
					</a>
					<a
						href="/projects"
						class="rounded-base px-4 py-2 transition-colors {isActive('/projects')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						Projects
					</a>
					<a
						href="/test-cases"
						class="rounded-base px-4 py-2 transition-colors {isActive('/test-cases')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						Test Cases
					</a>
					<a
						href="/test-runs"
						class="rounded-base px-4 py-2 transition-colors {isActive('/test-runs')
							? 'bg-primary-500 text-white'
							: 'hover:bg-surface-200-800'}"
					>
						Test Runs
					</a>
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
