import { definePageMetaTags } from 'svelte-meta-tags';

export const prerender = true;

export const load = () => {
	const pageTags = definePageMetaTags({
		title: 'Privacy Policy',
		description:
			'QA Studio Privacy Policy - How we collect, use, and protect your data. GDPR and CCPA compliant. Transparent about third-party services and AI features.',
		openGraph: {
			title: 'QA Studio Privacy Policy',
			description:
				'Learn how QA Studio handles your data, complies with privacy regulations, and protects your information.'
		}
	});

	return { ...pageTags };
};
