<script lang="ts">
	import { Calendar, User, Tag, ArrowLeft } from 'lucide-svelte';

	let { data } = $props();
	let { post } = $derived(data);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{post.title} - QA Studio Blog</title>
	<meta name="description" content={post.description || post.title} />
</svelte:head>

<article class="container mx-auto max-w-4xl px-4 py-12">
	<!-- Back Link -->
	<a
		href="/blog"
		class="mb-8 inline-flex items-center gap-2 text-sm text-surface-600-400 transition-colors hover:text-primary-500"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to Blog
	</a>

	<!-- Cover Image -->
	{#if post.cover}
		<div class="mb-8 aspect-video overflow-hidden rounded-container">
			<img src={post.cover} alt={post.title} class="h-full w-full object-cover" />
		</div>
	{/if}

	<!-- Header -->
	<header class="mb-8">
		<!-- Category Badge -->
		{#if post.category}
			<span class="mb-4 inline-block rounded-full bg-primary-500/10 px-3 py-1 text-sm font-medium text-primary-500">
				{post.category}
			</span>
		{/if}

		<!-- Title -->
		<h1 class="mb-4 text-5xl font-black">{post.title}</h1>

		<!-- Description -->
		{#if post.description}
			<p class="mb-6 text-xl text-surface-600-400">{post.description}</p>
		{/if}

		<!-- Meta Information -->
		<div class="flex flex-wrap items-center gap-6 text-sm text-surface-600-400">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4" />
				<span>{formatDate(post.date)}</span>
			</div>
			{#if post.author}
				<div class="flex items-center gap-2">
					<User class="h-4 w-4" />
					<span>{post.author}</span>
				</div>
			{/if}
		</div>

		<!-- Tags -->
		{#if post.tags && post.tags.length > 0}
			<div class="mt-6 flex flex-wrap gap-2">
				{#each post.tags as tag}
					<span class="flex items-center gap-1 rounded-full bg-surface-200-800 px-3 py-1 text-sm">
						<Tag class="h-3.5 w-3.5" />
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</header>

	<!-- Divider -->
	<hr class="mb-8 border-surface-300-700" />

	<!-- Content -->
	<div class="prose prose-lg dark:prose-invert max-w-none">
		{@html post.html}
	</div>

	<!-- Divider -->
	<hr class="my-12 border-surface-300-700" />

	<!-- Footer -->
	<footer class="text-center">
		<a
			href="/blog"
			class="inline-flex items-center gap-2 rounded-base bg-primary-500 px-6 py-3 font-bold text-white transition-all hover:bg-primary-600"
		>
			<ArrowLeft class="h-4 w-4" />
			View All Posts
		</a>
	</footer>
</article>

<style>
	:global(.prose h1) {
		@apply text-4xl font-black mb-4;
	}

	:global(.prose h2) {
		@apply text-3xl font-bold mb-3 mt-8;
	}

	:global(.prose h3) {
		@apply text-2xl font-bold mb-2 mt-6;
	}

	:global(.prose p) {
		@apply mb-4 leading-relaxed;
	}

	:global(.prose a) {
		@apply text-primary-500 hover:underline;
	}

	:global(.prose ul, .prose ol) {
		@apply my-4 ml-6;
	}

	:global(.prose li) {
		@apply mb-2;
	}

	:global(.prose code) {
		@apply rounded bg-surface-200-800 px-1.5 py-0.5 text-sm;
	}

	:global(.prose pre) {
		@apply my-4 overflow-x-auto rounded-container bg-surface-200-800 p-4;
	}

	:global(.prose pre code) {
		@apply bg-transparent p-0;
	}

	:global(.prose blockquote) {
		@apply border-l-4 border-primary-500 pl-4 italic my-4;
	}

	:global(.prose img) {
		@apply rounded-container my-6;
	}
</style>
