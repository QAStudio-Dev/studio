import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GitHub OAuth App credentials (set these in .env)
const CLIENT_ID = process.env.DECAP_GITHUB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DECAP_GITHUB_CLIENT_SECRET || '';

/**
 * GET /api/auth/decap
 * Initiates GitHub OAuth flow or handles callback
 */
export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');

	// If no code, redirect to GitHub OAuth
	if (!code) {
		const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
		githubAuthUrl.searchParams.set('client_id', CLIENT_ID);
		githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/decap`);
		githubAuthUrl.searchParams.set('scope', 'repo,user');

		throw redirect(302, githubAuthUrl.toString());
	}

	// Exchange code for access token
	try {
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				code
			})
		});

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			console.error('GitHub OAuth error:', tokenData);
			return json({ error: tokenData.error_description || 'Authentication failed' }, { status: 400 });
		}

		// Return token in format Decap CMS expects
		return json({
			token: tokenData.access_token,
			provider: 'github'
		});
	} catch (error) {
		console.error('Error exchanging code for token:', error);
		return json({ error: 'Failed to authenticate with GitHub' }, { status: 500 });
	}
};
