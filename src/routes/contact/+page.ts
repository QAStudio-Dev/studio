import { definePageMetaTags } from 'svelte-meta-tags';

export const prerender = true;

export const load = () => {
	const pageTags = definePageMetaTags({
		title: 'Contact Us',
		description:
			'Get in touch with QA Studio. Report bugs on GitHub, join our Discord community, or reach out via email for support and business inquiries.',
		openGraph: {
			title: 'Contact QA Studio',
			description:
				'Report issues, join our community, or reach out for support. Multiple ways to connect with the QA Studio team.'
		}
	});

	return { ...pageTags };
};
