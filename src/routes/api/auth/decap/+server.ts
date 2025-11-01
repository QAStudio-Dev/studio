import type { RequestHandler } from './$types';
import { AuthorizationCode } from 'simple-oauth2';

const randomString = () => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 8; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

const githubConfig = {
	client: {
		id: process.env.DECAP_GITHUB_CLIENT_ID || '',
		secret: process.env.DECAP_GITHUB_CLIENT_SECRET || ''
	},
	auth: {
		tokenHost: 'https://github.com',
		tokenPath: '/login/oauth/access_token',
		authorizePath: '/login/oauth/authorize'
	}
};

export const GET: RequestHandler = async ({ request }) => {
	const host = request.headers.get('host');
	const client = new AuthorizationCode(githubConfig);

	const authorizationUri = client.authorizeURL({
		redirect_uri: `https://${host}/api/auth/decap/callback`,
		scope: 'repo,user',
		state: randomString()
	});

	return Response.redirect(authorizationUri, 301);
};
