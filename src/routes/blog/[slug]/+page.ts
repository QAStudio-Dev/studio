import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';
import { SITE_URL } from '$lib/site';

export const load: PageLoad = async ({ data, url }) => {
	const post = data.post;
	const postUrl = new URL(url.pathname, SITE_URL).href;
	const coverUrl = post.cover ? new URL(post.cover, SITE_URL).href : undefined;

	const pageTags = definePageMetaTags({
		title: post.title,
		description: post.description,
		canonical: postUrl,
		openGraph: {
			type: 'article',
			title: post.title,
			description: post.description,
			url: postUrl,
			article: {
				publishedTime: post.date,
				authors: [post.author],
				tags: post.tags
			},
			...(coverUrl && {
				images: [
					{
						url: coverUrl,
						alt: post.title
					}
				]
			})
		},
		twitter: {
			cardType: 'summary_large_image',
			title: post.title,
			description: post.description,
			...(coverUrl && {
				image: coverUrl,
				imageAlt: post.title
			})
		},
		additionalMetaTags: [
			{
				name: 'author',
				content: post.author
			},
			{
				name: 'article:published_time',
				content: post.date
			},
			...(post.tags && post.tags.length > 0
				? [
						{
							name: 'keywords',
							content: post.tags.join(', ')
						}
					]
				: [])
		]
	});

	return {
		...data,
		...pageTags
	};
};
