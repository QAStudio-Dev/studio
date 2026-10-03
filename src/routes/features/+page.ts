import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return definePageMetaTags({
		title: 'Features - Test Case Management, Test Runs & Reporting',
		description:
			'Explore QA Studio features: hierarchical test case management, test run tracking, milestones, reporting and analytics, REST API, Playwright reporters, CI/CD integrations, and AI failure analysis.',
		openGraph: {
			title: 'QA Studio Features - Everything You Need for Test Management',
			description:
				'Test cases, test runs, milestones, analytics, a full REST API, Playwright integration, and AI-powered failure analysis. Open source and self-hostable.'
		}
	});
};
