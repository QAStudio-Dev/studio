<script lang="ts">
	import { Calendar, User, Tag } from 'lucide-svelte';

	let { data } = $props();
	let { posts } = $derived(data);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Blog - QA Studio</title>
	<meta name="description" content="Articles about testing, QA engineering, automation, and best practices from the QA Studio team." />
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-12">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-5xl font-black">QA Studio Blog</h1>
		<p class="mx-auto max-w-2xl text-lg text-surface-600-400">
			Insights, updates, and best practices from QA engineers who actually do the work.
		</p>
	</div>

	<!-- Blog Posts Grid -->
	{#if posts.length === 0}
		<div class="py-16 text-center">
			<p class="text-lg text-surface-600-400">No blog posts yet. Check back soon!</p>
		</div>
	{:else}
		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each posts as post}
				<a
					href="/blog/{post.slug}"
					class="card group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
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
						<div class="aspect-video bg-gradient-to-br from-primary-500 to-secondary-500"></div>
					{/if}

					<!-- Content -->
					<div class="p-6">
						<!-- Category Badge -->
						{#if post.category}
							<span class="mb-3 inline-block rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500">
								{post.category}
							</span>
						{/if}

						<!-- Title -->
						<h2 class="mb-3 text-xl font-bold group-hover:text-primary-500 transition-colors">
							{post.title}
						</h2>

						<!-- Description -->
						{#if post.description}
							<p class="mb-4 text-sm text-surface-600-400 line-clamp-2">
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
									<span class="flex items-center gap-1 rounded-full bg-surface-200-800 px-2 py-1 text-xs">
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
