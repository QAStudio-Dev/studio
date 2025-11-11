<script lang="ts">
	import { Calendar, User, Tag, Rss, Search } from 'lucide-svelte';

	let { data } = $props();
	let { posts } = $derived(data);

	let searchQuery = $state('');

	// Filter posts based on search query
	let filteredPosts = $derived(
		posts.filter((post) => {
			if (!searchQuery.trim()) return true;

			const query = searchQuery.toLowerCase();
			const matchesTitle = post.title?.toLowerCase().includes(query);
			const matchesDescription = post.description?.toLowerCase().includes(query);
			const matchesCategory = post.category?.toLowerCase().includes(query);
			const matchesTags = post.tags?.some((tag: string) => tag.toLowerCase().includes(query));

			return matchesTitle || matchesDescription || matchesCategory || matchesTags;
		})
	);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Generate a consistent gradient based on a string (date or slug)
	function getGradientForPost(seed: string): string {
		// Better hash function with more distribution
		let hash1 = 0;
		let hash2 = 0;
		for (let i = 0; i < seed.length; i++) {
			hash1 = seed.charCodeAt(i) + ((hash1 << 5) - hash1);
			hash2 = seed.charCodeAt(i) + ((hash2 << 3) + hash2);
		}

		// Gradient directions
		const directions = [
			'bg-gradient-to-br', // bottom-right
			'bg-gradient-to-tr', // top-right
			'bg-gradient-to-bl', // bottom-left
			'bg-gradient-to-tl', // top-left
			'bg-gradient-to-r', // right
			'bg-gradient-to-l', // left
			'bg-gradient-to-b', // bottom
			'bg-gradient-to-t' // top
		];

		// Expanded gradient color combinations with more variety
		const colorCombos = [
			// Blues & Purples
			'from-primary-500 to-secondary-500',
			'from-primary-600 to-secondary-600',
			'from-primary-500 via-secondary-500 to-tertiary-500',
			'from-secondary-600 to-primary-500',

			// Teals & Greens
			'from-tertiary-500 to-success-500',
			'from-success-500 to-tertiary-600',
			'from-tertiary-600 to-primary-500',
			'from-success-600 to-primary-400',

			// Warm colors
			'from-warning-500 to-error-500',
			'from-error-500 to-warning-600',
			'from-warning-600 to-primary-500',
			'from-primary-500 to-warning-500',

			// Purple variations
			'from-secondary-500 to-tertiary-500',
			'from-secondary-600 to-tertiary-600',
			'from-tertiary-500 to-secondary-600',

			// Mixed palettes
			'from-primary-500 to-tertiary-500',
			'from-success-500 to-secondary-500',
			'from-tertiary-600 to-warning-500',
			'from-primary-400 to-success-500',
			'from-secondary-500 via-primary-500 to-success-500'
		];

		// Use different hash values for direction and colors to increase variation
		const directionIndex = Math.abs(hash1) % directions.length;
		const colorIndex = Math.abs(hash2) % colorCombos.length;

		return `${directions[directionIndex]} ${colorCombos[colorIndex]}`;
	}
</script>

<svelte:head>
	<title>Blog - QA Studio</title>
	<meta
		name="description"
		content="Articles about testing, QA engineering, automation, and best practices from the QA Studio team."
	/>
	<link
		rel="alternate"
		type="application/rss+xml"
		title="QA Studio Blog RSS Feed"
		href="/rss.xml"
	/>
	<link
		rel="alternate"
		type="application/atom+xml"
		title="QA Studio Blog Atom Feed"
		href="/atom.xml"
	/>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-12">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-5xl font-black">QA Studio Blog</h1>
		<p class="mx-auto max-w-2xl text-lg text-surface-600-400">
			Insights, updates, and best practices from QA engineers who actually do the work.
		</p>

		<!-- RSS Feed Links -->
		<div class="mt-6 flex items-center justify-center gap-4">
			<a
				href="/rss.xml"
				class="inline-flex items-center gap-2 rounded-lg bg-surface-200-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-300-700"
				target="_blank"
				rel="noopener noreferrer"
			>
				<Rss class="h-4 w-4" />
				RSS Feed
			</a>
			<a
				href="/atom.xml"
				class="inline-flex items-center gap-2 rounded-lg bg-surface-200-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-300-700"
				target="_blank"
				rel="noopener noreferrer"
			>
				<Rss class="h-4 w-4" />
				Atom Feed
			</a>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="mx-auto mb-8 max-w-2xl">
		<div class="relative">
			<Search class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-surface-600-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search posts by title, description, category, or tags..."
				class="w-full rounded-lg border border-surface-300-700 bg-surface-100-900 py-3 pr-4 pl-12 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
			/>
		</div>
		{#if searchQuery.trim()}
			<p class="mt-2 text-center text-sm text-surface-600-400">
				Found {filteredPosts.length}
				{filteredPosts.length === 1 ? 'post' : 'posts'}
			</p>
		{/if}
	</div>

	<!-- Blog Posts Grid -->
	{#if posts.length === 0}
		<div class="py-16 text-center">
			<p class="text-lg text-surface-600-400">No blog posts yet. Check back soon!</p>
		</div>
	{:else if filteredPosts.length === 0}
		<div class="py-16 text-center">
			<p class="text-lg text-surface-600-400">No posts found matching "{searchQuery}"</p>
			<button
				onclick={() => (searchQuery = '')}
				class="mt-4 text-sm text-primary-500 hover:underline"
			>
				Clear search
			</button>
		</div>
	{:else}
		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredPosts as post}
				<a
					href="/blog/{post.slug}"
					class="group overflow-hidden card transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<!-- Cover Image -->
					{#if post.cover}
						<div class="aspect-video overflow-hidden bg-surface-200-800">
							<img
								src={post.cover}
								alt={post.title}
								class="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
						</div>
					{:else}
						<div class="aspect-video {getGradientForPost(post.slug || post.date)}"></div>
					{/if}

					<!-- Content -->
					<div class="p-6">
						<!-- Category Badge -->
						{#if post.category}
							<span
								class="mb-3 inline-block rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500"
							>
								{post.category}
							</span>
						{/if}

						<!-- Title -->
						<h2 class="mb-3 text-xl font-bold transition-colors group-hover:text-primary-500">
							{post.title}
						</h2>

						<!-- Description -->
						{#if post.description}
							<p class="mb-4 line-clamp-2 text-sm text-surface-600-400">
								{post.description}
							</p>
						{/if}

						<!-- Meta Information -->
						<div class="flex flex-wrap items-center gap-4 text-xs text-surface-600-400">
							<div class="flex items-center gap-1">
								<Calendar class="h-3.5 w-3.5" />
								<span>{formatDate(post.date)}</span>
							</div>
							{#if post.author}
								<div class="flex items-center gap-1">
									<User class="h-3.5 w-3.5" />
									<span>{post.author}</span>
								</div>
							{/if}
						</div>

						<!-- Tags -->
						{#if post.tags && post.tags.length > 0}
							<div class="mt-4 flex flex-wrap gap-2">
								{#each post.tags.slice(0, 3) as tag}
									<span
										class="flex items-center gap-1 rounded-full bg-surface-200-800 px-2 py-1 text-xs"
									>
										<Tag class="h-3 w-3" />
										{tag}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
