import { definePageMetaTags } from 'svelte-meta-tags';

export const prerender = true;

export const load = () => {
	const pageTags = definePageMetaTags({
		title: 'API Documentation',
		description:
			'Complete REST API documentation for QA Studio. Integrate test management into your CI/CD pipeline with our comprehensive API. Projects, test cases, runs, and results.',
		openGraph: {
			title: 'QA Studio API Documentation',
			description:
				'REST API documentation for programmatic test management. Full API access for automation and custom integrations.'
		}
	});

	return { ...pageTags };
};
