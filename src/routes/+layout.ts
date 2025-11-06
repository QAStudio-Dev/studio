import { defineBaseMetaTags } from 'svelte-meta-tags';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	const baseTags = defineBaseMetaTags({
		title: 'QA Studio',
		titleTemplate: '%s | QA Studio',
		description:
			'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			type: 'website',
			url: new URL(url.pathname, url.origin).href,
			locale: 'en_US',
			title: 'QA Studio - Modern Test Management Platform',
			description:
				'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows.',
			siteName: 'QA Studio',
			images: [
				{
					url: 'https://qastudio.dev/og_image.png',
					alt: 'QA Studio - Modern Test Management',
					width: 1200,
					height: 630,
					secureUrl: 'https://qastudio.dev/og_image.png',
					type: 'image/png'
				}
			]
		},
		twitter: {
			cardType: 'summary_large_image',
			site: '@qastudio',
			title: 'QA Studio - Modern Test Management Platform',
			description:
				'Modern test management platform built by QA engineers. Open source and API-first.',
			image: 'https://qastudio.dev/og_image.png',
			imageAlt: 'QA Studio - Modern Test Management'
		},
		additionalMetaTags: [
			{
				name: 'keywords',
				content:
					'test management, QA, quality assurance, playwright, testing, test automation, test reporting, open source'
			},
			{
				name: 'author',
				content: 'QA Studio'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				httpEquiv: 'x-ua-compatible',
				content: 'IE=edge'
			}
		]
	});

	return {
		...data,
		...baseTags
	};
};
