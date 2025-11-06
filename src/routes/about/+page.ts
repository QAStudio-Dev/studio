import { definePageMetaTags } from 'svelte-meta-tags';

export const prerender = true;

export const load = () => {
	const pageTags = definePageMetaTags({
		title: 'About Us',
		description:
			'Learn about QA Studio - built by a QA engineer tired of rebuilding test management platforms. Open source, community-driven, and built for real QA teams.',
		openGraph: {
			title: 'About QA Studio - Our Story',
			description:
				'After building countless test management platforms, we decided to create one for the entire QA community. Open source, modern, and built by QA engineers.'
		}
	});

	return { ...pageTags };
};
