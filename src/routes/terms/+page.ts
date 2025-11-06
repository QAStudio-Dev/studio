import { definePageMetaTags } from 'svelte-meta-tags';

export const prerender = true;

export const load = () => {
	const pageTags = definePageMetaTags({
		title: 'Terms of Service',
		description:
			'QA Studio Terms of Service - Legal agreement for using our test management platform. Covers subscriptions, acceptable use, liability, and open source licensing.',
		openGraph: {
			title: 'QA Studio Terms of Service',
			description:
				'Terms and conditions for using QA Studio hosted service. Separate terms apply for self-hosted deployments.'
		}
	});

	return { ...pageTags };
};
