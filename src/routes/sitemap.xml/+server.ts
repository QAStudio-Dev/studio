import type { RequestHandler } from './$types';

const site = 'https://qastudio.dev';

// Static pages that should be in the sitemap
const staticPages = [
	'', // homepage
	'/docs',
	'/blog',
	'/sign-in',
	'/sign-up'
];

// Blog posts - update this when new posts are added
const blogPosts = [
	{
		slug: 'welcome-to-qa-studio',
		lastmod: '2025-11-01'
	},
	{
		slug: 'playwright-integration-guide',
		lastmod: '2025-11-04'
	}
];

export const GET: RequestHandler = async () => {
	const pages = staticPages.map((page) => ({
		loc: `${site}${page}`,
		lastmod: new Date().toISOString().split('T')[0],
		changefreq: page === '' ? 'daily' : 'weekly',
		priority: page === '' ? '1.0' : '0.8'
	}));

	const posts = blogPosts.map((post) => ({
		loc: `${site}/blog/${post.slug}`,
		lastmod: post.lastmod,
		changefreq: 'monthly',
		priority: '0.7'
	}));

	const allUrls = [...pages, ...posts];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
	.map(
		(url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600, s-maxage=3600'
		}
	});
};
