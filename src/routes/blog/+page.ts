import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	const pageTags = definePageMetaTags({
		title: 'Blog - QA Engineering Insights & Test Management Tips',
		description:
			'QA Studio blog: Test automation guides, Playwright tutorials, CI/CD integration tips, and QA engineering best practices. Learn modern test management techniques.',
		openGraph: {
			title: 'QA Studio Blog - Test Automation & QA Engineering',
			description:
				'Guides, tutorials, and insights on test automation, Playwright, CI/CD, and modern QA engineering practices.'
		}
	});

	return {
		...data,
		...pageTags
	};
};
