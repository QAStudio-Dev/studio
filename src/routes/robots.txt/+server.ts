import type { RequestHandler } from './$types';

const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Disallow authenticated routes
Disallow: /dashboard
Disallow: /projects/
Disallow: /teams/
Disallow: /settings
Disallow: /user-profile
Disallow: /invitations/
Disallow: /api/

# Allow public pages
Allow: /docs
Allow: /blog

Sitemap: https://qastudio.dev/sitemap.xml
`;

export const GET: RequestHandler = async () => {
	return new Response(robotsTxt, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=86400, s-maxage=86400'
		}
	});
};
