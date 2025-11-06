import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, url }) => {
	const post = data.post;

	const pageTags = definePageMetaTags({
		title: post.title,
		description: post.description,
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			type: 'article',
			title: post.title,
			description: post.description,
			url: new URL(url.pathname, url.origin).href,
			article: {
				publishedTime: post.date,
				authors: [post.author],
				tags: post.tags
			},
			...(post.cover && {
				images: [
					{
						url: post.cover,
						alt: post.title
					}
				]
			})
		},
		twitter: {
			cardType: 'summary_large_image',
			title: post.title,
			description: post.description,
			...(post.cover && {
				image: post.cover,
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
