<script lang="ts">
	import { Calendar, User, Tag, ArrowLeft } from '@lucide/svelte';
	import { JsonLd } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import { SITE_URL } from '$lib/site';

	let { data } = $props();
	let { post } = $derived(data);

	const site = SITE_URL;
	let postUrl = $derived(new URL(page.url.pathname, site).href);

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<JsonLd
	schema={[
		{
			'@type': 'BlogPosting',
			headline: post.title,
			description: post.description,
			datePublished: post.date,
			...(post.author && { author: { '@type': 'Person', name: post.author } }),
			publisher: {
				'@type': 'Organization',
				name: 'QA Studio',
				logo: {
					'@type': 'ImageObject',
					url: `${site}/android-chrome-512x512.png`
				}
			},
			mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
			...(post.tags?.length && { keywords: post.tags.join(', ') }),
			...(post.cover && { image: new URL(post.cover, site).href })
		},
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: site },
				{ '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}/blog` },
				{ '@type': 'ListItem', position: 3, name: post.title, item: postUrl }
			]
		}
	]}
/>

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
			<img
				src={post.cover}
				alt={post.title}
				width="1200"
				height="675"
				fetchpriority="high"
				decoding="async"
				class="h-full w-full object-cover"
			/>
		</div>
	{/if}

	<!-- Header -->
	<header class="mb-8">
		<!-- Category Badge -->
		{#if post.category}
			<span
				class="mb-4 inline-block rounded-full bg-primary-500/10 px-3 py-1 text-sm font-medium text-primary-500"
			>
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
					<span
						class="flex items-center gap-1 rounded-full bg-surface-200-800 px-3 py-1 text-sm"
					>
						<Tag class="h-3.5 w-3.5" />
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</header>

	<!-- Divider -->
	<hr class="mb-8 border-surface-200-800" />

	<!-- Content -->
	<div class="prose prose-lg max-w-none prose-slate dark:prose-invert">
		{@html post.html}
	</div>

	<!-- Divider -->
	<hr class="my-12 border-surface-200-800" />

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
