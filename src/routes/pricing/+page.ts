import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return definePageMetaTags({
		title: 'Pricing - Free, Self-Hosted & Pro Plans',
		description:
			'QA Studio pricing: self-host the open source edition free forever with unlimited users, or use the hosted platform free for 1 user and project. Pro is $10/user/month for teams.',
		openGraph: {
			title: 'QA Studio Pricing - Simple, Transparent, Open Source',
			description:
				'Free forever self-hosted edition, a free hosted tier, and Pro at $10/user/month. Compare QA Studio against TestRail and Qase.'
		}
	});
};
