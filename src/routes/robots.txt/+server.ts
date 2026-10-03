import type { RequestHandler } from './$types';
import { SITE_URL } from '$lib/site';

const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Disallow authenticated routes
Disallow: /dashboard
Disallow: /projects/
Disallow: /projects$
Disallow: /teams/
Disallow: /settings
Disallow: /reports
Disallow: /sms
Disallow: /authenticators
Disallow: /onboarding
Disallow: /admin
Disallow: /change-password
Disallow: /reset-password
Disallow: /setup-password
Disallow: /user-profile
Disallow: /invitations/
Allow: /api/openapi
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const GET: RequestHandler = async () => {
	return new Response(robotsTxt, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=86400, s-maxage=86400'
		}
	});
};
