<script lang="ts">
	// No imports needed - using Tailwind classes
</script>

<svelte:head>
	<title>QA Studio - Built by QA Engineers, for QA Engineers</title>
	<meta
		name="description"
		content="Modern test management platform designed by quality engineers who understand your workflow"
	/>
</svelte:head>

<!-- Hero Section -->
<div
	class="border-primary-200-900 relative overflow-hidden border-b bg-gradient-to-br from-primary-50 to-primary-100"
>
	<div class="container mx-auto px-4 py-20 lg:py-32">
		<div class="mx-auto max-w-4xl text-center">
			<!-- Badge -->
			<div
				class="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-2"
			>
				<svg class="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-sm font-medium text-primary-700-300">Built by QA Engineers</span>
			</div>

			<!-- Headline -->
			<h1 class="mb-6 text-5xl leading-tight font-bold lg:text-6xl">
				Test Management,
				<br />
				<span class="text-primary-600-400">Built for QA Teams</span>
			</h1>

			<!-- Tagline -->
			<p class="mb-12 text-xl leading-relaxed text-surface-600-400 lg:text-2xl">
				Made by QA engineers who know your pain points. No complexity overload,
				<br class="hidden lg:block" />
				just the features you actually need to ship quality software.
			</p>

			<!-- CTA Buttons -->
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="/projects/new"
					class="rounded-base bg-primary-500 px-8 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-primary-600 hover:shadow-xl"
				>
					Start Your First Project
				</a>
				<a
					href="/docs"
					class="border-surface-300-600 bg-surface-50-800 hover:bg-surface-100-700 rounded-base border px-8 py-4 font-semibold transition-colors"
				>
					View API Docs
				</a>
			</div>

			<!-- Quick Feature Pills -->
			<div class="mt-12 flex flex-wrap justify-center gap-3">
				<span class="bg-surface-50-800/50 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
					✓ No Learning Curve
				</span>
				<span class="bg-surface-50-800/50 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
					✓ REST API First
				</span>
				<span class="bg-surface-50-800/50 rounded-full px-4 py-2 text-sm font-medium backdrop-blur">
					✓ Open Source
				</span>
			</div>
		</div>
	</div>

	<!-- Decorative Elements -->
	<div class="bg-primary-300-500/20 absolute top-20 right-10 h-72 w-72 rounded-full blur-3xl"></div>
	<div class="bg-blue-300-500/20 absolute bottom-10 left-10 h-96 w-96 rounded-full blur-3xl"></div>
</div>

<!-- Main Content -->
<div class="container mx-auto px-4 py-16">
	<!-- Why QA Studio Section -->
	<div class="mx-auto mb-20 max-w-3xl text-center">
		<h2 class="mb-6 text-3xl font-bold lg:text-4xl">Built Different</h2>
		<p class="mb-12 text-lg text-surface-600-400">
			We've been in your shoes. Frustrated with bloated tools that require weeks of training and
			cost a fortune. QA Studio is our answer: powerful, simple, and free.
		</p>
	</div>

	<!-- Feature Grid -->
	<div class="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
		<!-- Feature 1 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-primary-500/10"
			>
				<svg class="h-8 w-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">Lightning Fast</h3>
			<p class="text-surface-600-400">
				No bloat. No unnecessary features. Just fast, efficient test management that keeps up with
				your sprint.
			</p>
		</div>

		<!-- Feature 2 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-success-500/10"
			>
				<svg class="h-8 w-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">API First Design</h3>
			<p class="text-surface-600-400">
				Every feature is available via REST API. Integrate with CI/CD, automation frameworks, or
				build custom dashboards.
			</p>
		</div>

		<!-- Feature 3 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-secondary-500/10"
			>
				<svg
					class="h-8 w-8 text-secondary-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">Test Type Flexibility</h3>
			<p class="text-surface-600-400">
				Support for all test types: functional, regression, smoke, integration, E2E, API,
				performance, and security.
			</p>
		</div>

		<!-- Feature 4 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-warning-500/10"
			>
				<svg class="h-8 w-8 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">Rich Attachments</h3>
			<p class="text-surface-600-400">
				Screenshots, videos, logs - attach everything you need to debug failures. Never lose context
				again.
			</p>
		</div>

		<!-- Feature 5 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-tertiary-500/10"
			>
				<svg
					class="h-8 w-8 text-tertiary-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">Smart Organization</h3>
			<p class="text-surface-600-400">
				Hierarchical test suites, tags, priorities, and milestones. Organize tests the way your team
				actually works.
			</p>
		</div>

		<!-- Feature 6 -->
		<div class="card p-8 transition-shadow hover:shadow-xl">
			<div
				class="mb-6 flex h-14 w-14 items-center justify-center rounded-container bg-primary-500/10"
			>
				<svg class="h-8 w-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
					/>
				</svg>
			</div>
			<h3 class="mb-3 text-xl font-bold">Real-Time Metrics</h3>
			<p class="text-surface-600-400">
				Track pass rates, execution times, and trends. Get insights that help you ship faster with
				confidence.
			</p>
		</div>
	</div>

	<!-- Getting Started CTA -->
	<div class="mx-auto max-w-4xl">
		<div
			class="card border-2 border-primary-200-800 bg-gradient-to-br from-primary-50 to-secondary-50 p-12"
		>
			<div class="text-center">
				<h2 class="mb-4 text-3xl font-bold">Ready to Level Up Your QA Process?</h2>
				<p class="mb-8 text-lg text-surface-600-400">
					Join QA teams who are tired of over-engineered tools and ready for something that just
					works.
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a
						href="/projects/new"
						class="rounded-base bg-primary-500 px-8 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-primary-600"
					>
						Create Your First Project
					</a>
					<a
						href="/docs"
						class="border-surface-300-600 bg-surface-50-700 hover:bg-surface-100-600 rounded-base border px-8 py-4 font-semibold transition-colors"
					>
						Explore the API
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
