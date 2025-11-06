<script lang="ts">
	import { onMount } from 'svelte';

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});
</script>

<!-- Hero Section with Animated Background -->
<div
	class="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600"
>
	<!-- Animated Background Grid -->
	<div class="absolute inset-0 opacity-20">
		<div
			class="absolute inset-0"
			style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 50px 50px;"
		></div>
	</div>

	<!-- Floating Shapes -->
	<div class="absolute inset-0 overflow-hidden">
		<div
			class="animate-float absolute top-20 left-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl"
		></div>
		<div
			class="animate-float-delayed absolute right-1/4 bottom-20 h-96 w-96 rounded-full bg-white/5 blur-3xl"
		></div>
		<div
			class="animate-float-slow absolute top-1/2 left-1/2 h-80 w-80 rounded-full bg-white/5 blur-3xl"
		></div>
	</div>

	<!-- Hero Content -->
	<div class="relative z-10 container mx-auto px-4 py-20 lg:py-32">
		<div class="mx-auto max-w-5xl text-center">
			<!-- Badge with Animation -->
			<div
				class="mb-8 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 backdrop-blur-sm transition-all hover:bg-white/20 {mounted
					? 'animate-fade-in-down'
					: 'opacity-0'}"
			>
				<svg class="h-4 w-4 animate-pulse text-white" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="text-sm font-medium text-white">Built by QA Engineers, for QA Engineers</span>
			</div>

			<!-- Main Headline with Gradient -->
			<h1
				class="mb-6 text-6xl leading-tight font-black text-white lg:text-7xl xl:text-8xl {mounted
					? 'animate-fade-in-up'
					: 'opacity-0'}"
			>
				Test Management
				<br />
				<span class="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
					>Without the BS</span
				>
			</h1>

			<!-- Subheading -->
			<p
				class="mb-12 text-xl leading-relaxed text-white/90 lg:text-2xl {mounted
					? 'animate-fade-in-up animation-delay-100'
					: 'opacity-0'}"
			>
				<strong class="text-white">Open source test management platform.</strong>
				<br />
				Built for modern QA teams. No vendor lock-in.
			</p>

			<!-- CTA Buttons -->
			<div
				class="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row {mounted
					? 'animate-fade-in-up animation-delay-200'
					: 'opacity-0'}"
			>
				<a
					href="/projects/new"
					class="group relative overflow-hidden rounded-base bg-white px-8 py-4 font-bold text-primary-600 shadow-2xl transition-all hover:scale-105 hover:shadow-white/20"
				>
					<span class="relative z-10">Start Building Now</span>
					<div
						class="absolute inset-0 -z-0 bg-gradient-to-r from-white/90 to-white opacity-0 transition-opacity group-hover:opacity-100"
					></div>
				</a>
				<a
					href="/docs"
					class="group rounded-base border-2 border-white/30 px-8 py-4 font-bold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
				>
					<span class="flex items-center gap-2">
						Explore API
						<svg
							class="h-5 w-5 transition-transform group-hover:translate-x-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</span>
				</a>
			</div>

			<!-- Feature Pills -->
			<div
				class="flex flex-wrap justify-center gap-3 {mounted
					? 'animate-fade-in animation-delay-300'
					: 'opacity-0'}"
			>
				{#each ['Free to Start', 'Self-Host Option', 'Open Source', 'AI-Powered'] as feature}
					<span
						class="rounded-full border border-white/30 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10"
					>
						✓ {feature}
					</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- Wave Divider -->
	<div class="absolute right-0 bottom-0 left-0">
		<svg class="w-full" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
				fill="rgb(var(--color-surface-50))"
				class="dark:fill-[rgb(var(--color-surface-950))]"
			/>
		</svg>
	</div>
</div>

<!-- Stats Section -->
<div class="bg-surface-50 py-16 dark:bg-surface-950">
	<div class="container mx-auto px-4">
		<div class="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
			{#each [{ value: '<5min', label: 'Setup Time' }, { value: '1 Free', label: 'Project' }, { value: '100%', label: 'Open Source' }, { value: 'AI', label: 'Diagnostics' }] as stat}
				<div class="text-center">
					<div class="mb-2 text-4xl font-black text-primary-600 dark:text-primary-400">
						{stat.value}
					</div>
					<div class="text-sm font-medium text-surface-600 dark:text-surface-400">{stat.label}</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Features Section with Bento Grid -->
<div class="container mx-auto px-4 py-20">
	<div class="mb-16 text-center">
		<h2 class="mb-4 text-4xl font-black lg:text-5xl">
			Everything You Need.<br /><span class="text-primary-600 dark:text-primary-400"
				>Nothing You Don't.</span
			>
		</h2>
		<p class="mx-auto max-w-2xl text-lg text-surface-600 dark:text-surface-400">
			We stripped away the bloat and built exactly what QA teams need. No training required.
		</p>
	</div>

	<!-- Bento Grid -->
	<div class="mx-auto grid max-w-6xl auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Large Feature 1 - Open Source -->
		<div
			class="group relative overflow-hidden card p-8 transition-all hover:-translate-y-1 hover:shadow-2xl md:col-span-2 lg:row-span-2"
		>
			<div
				class="absolute top-0 right-0 h-32 w-32 rounded-full bg-success-500/10 blur-3xl transition-all group-hover:scale-150"
			></div>
			<div class="relative">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-500/10">
					<svg
						class="h-8 w-8 text-success-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-2xl font-bold">Fully Open Source</h3>
				<p class="mb-6 text-surface-600 dark:text-surface-400">
					<strong class="text-surface-900 dark:text-surface-100"
						>No vendor lock-in. No proprietary formats. No artificial limits.</strong
					>
					<br /><br />
					QA Studio is completely open source and free to use. Fork it, customize it, self-host it.
					The code belongs to the community, and you have full control over your testing data and
					infrastructure.
				</p>
				<div class="flex flex-wrap gap-2">
					<span
						class="rounded-full bg-success-500/10 px-3 py-1 text-xs font-medium text-success-600 dark:text-success-400"
						>Elastic 2.0 License</span
					>
					<span
						class="rounded-full bg-success-500/10 px-3 py-1 text-xs font-medium text-success-600 dark:text-success-400"
						>Self-Hostable</span
					>
					<span
						class="rounded-full bg-success-500/10 px-3 py-1 text-xs font-medium text-success-600 dark:text-success-400"
						>Community Driven</span
					>
				</div>
			</div>
		</div>

		<!-- Feature 2 - Performance -->
		<div
			class="group relative overflow-hidden card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl"></div>
			<div class="relative">
				<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10">
					<svg
						class="h-6 w-6 text-primary-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-bold">Lightning Fast</h3>
				<p class="text-sm text-surface-600 dark:text-surface-400">
					No sluggish UI. Instant page loads. Built on modern tech that actually performs.
				</p>
			</div>
		</div>

		<!-- Feature 3 - API First -->
		<div
			class="group relative overflow-hidden card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-secondary-500/10 blur-2xl"></div>
			<div class="relative">
				<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-500/10">
					<svg
						class="h-6 w-6 text-secondary-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-bold">API First</h3>
				<p class="text-sm text-surface-600 dark:text-surface-400">
					Every feature available via REST API. Build custom integrations in minutes.
				</p>
			</div>
		</div>

		<!-- Feature 4 -->
		<div
			class="group relative overflow-hidden card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-warning-500/10 blur-2xl"></div>
			<div class="relative">
				<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10">
					<svg
						class="h-6 w-6 text-warning-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-bold">Rich Media</h3>
				<p class="text-sm text-surface-600 dark:text-surface-400">
					Screenshots, videos, logs - attach everything. Debug faster.
				</p>
			</div>
		</div>

		<!-- Feature 5 -->
		<div
			class="group relative overflow-hidden card p-6 transition-all hover:-translate-y-1 hover:shadow-xl md:col-span-2"
		>
			<div class="absolute top-0 right-0 h-32 w-32 rounded-full bg-tertiary-500/10 blur-3xl"></div>
			<div class="relative">
				<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary-500/10">
					<svg
						class="h-6 w-6 text-tertiary-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-bold">Real-Time Analytics</h3>
				<p class="text-surface-600 dark:text-surface-400">
					Track pass rates, trends, and bottlenecks. Make data-driven decisions about quality.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Social Proof / Why Choose -->
<div
	class="bg-gradient-to-br from-primary-50 to-secondary-50 py-20 dark:from-surface-900 dark:to-surface-950"
>
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-4xl text-center">
			<h2 class="mb-6 text-3xl font-black lg:text-4xl">Flexible for Every Team</h2>
			<p class="mb-12 text-lg text-surface-600 dark:text-surface-400">
				Start free, self-host for full control, or upgrade for enterprise features.
			</p>

			<div class="grid gap-6 md:grid-cols-3">
				{#each [{ title: 'Free Tier', desc: 'Start with one project, unlimited test cases. Perfect for trying us out.' }, { title: 'Self-Hosted', desc: 'Deploy on your infrastructure. Unlimited everything. Your data, your rules.' }, { title: 'Pro Plan', desc: 'Unlimited projects, team collaboration, AI diagnostics, and priority support.' }] as reason}
					<div class="card p-6 text-left">
						<h3 class="mb-2 text-xl font-bold text-primary-600 dark:text-primary-400">
							{reason.title}
						</h3>
						<p class="text-surface-600 dark:text-surface-400">{reason.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- Final CTA -->
<div class="container mx-auto px-4 py-20">
	<div class="mx-auto max-w-4xl overflow-hidden card border-2 border-primary-500/20">
		<div
			class="relative bg-gradient-to-br from-primary-500 to-secondary-600 p-12 text-center text-white"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 30px 30px;"
			></div>
			<div class="relative">
				<h2 class="mb-4 text-4xl font-black">Ready to Ship Quality Software?</h2>
				<p class="mb-8 text-xl text-white/90">
					Join QA teams who stopped wasting time on complex tools and started shipping.
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a
						href="/projects/new"
						class="rounded-base bg-white px-8 py-4 font-bold text-primary-600 shadow-xl transition-all hover:scale-105 hover:shadow-white/20"
					>
						Start Your First Project
					</a>
					<a
						href="/docs"
						class="rounded-base border-2 border-white/30 px-8 py-4 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
					>
						Read the Docs
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-20px);
		}
	}

	@keyframes float-delayed {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-30px);
		}
	}

	@keyframes float-slow {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-15px);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fade-in-down {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	.animate-float-delayed {
		animation: float-delayed 8s ease-in-out infinite;
	}

	.animate-float-slow {
		animation: float-slow 10s ease-in-out infinite;
	}

	.animate-fade-in {
		animation: fade-in 0.8s ease-out forwards;
	}

	.animate-fade-in-up {
		animation: fade-in-up 0.8s ease-out forwards;
	}

	.animate-fade-in-down {
		animation: fade-in-down 0.8s ease-out forwards;
	}

	.animation-delay-100 {
		animation-delay: 0.1s;
	}

	.animation-delay-150 {
		animation-delay: 0.15s;
	}

	.animation-delay-200 {
		animation-delay: 0.2s;
	}

	.animation-delay-300 {
		animation-delay: 0.3s;
	}
</style>
