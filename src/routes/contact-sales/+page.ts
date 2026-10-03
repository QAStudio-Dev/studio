import { definePageMetaTags } from 'svelte-meta-tags';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { csrfToken } = await parent();
	return {
		csrfToken,
		...definePageMetaTags({
			title: 'Enterprise Test Management - Contact Sales',
			description:
				'Get a custom QA Studio quote for your organization: SSO/SAML, audit logs, SLA guarantees, dedicated support, and on-premise deployment options for enterprise QA teams.',
			openGraph: {
				title: 'QA Studio Enterprise - Request a Quote',
				description:
					'SSO, audit logs, SLAs, dedicated support, and on-premise deployment for enterprise QA teams.'
			}
		})
	};
};
