import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

export const load: PageLoad = async ({ data }) => {
	const pageTags = definePageMetaTags({
		title: 'Open Source Test Management & Automated Test Reporting Platform',
		description:
			'QA Studio: Open-source test management platform with automated test reporting, test case management, and Playwright integration. Zero code changes - automatically discovers your tests. Built by QA engineers for modern CI/CD pipelines.',
		openGraph: {
			title: 'QA Studio - Open Source Test Management & Automated Reporting',
			description:
				'Modern test management with automated reporting, test case tracking, and seamless Playwright integration. No code changes required. Free and open source.'
		}
	});

	return {
		...data,
		...pageTags
	};
};
