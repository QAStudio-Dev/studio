import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

/**
 * GET /api/integrations/slack/callback
 * OAuth callback for Slack integration
 *
 * Slack will redirect here with a code parameter after user authorizes the app
 */
export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);
	const { url } = event;

	// Get OAuth code and state from query params
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle OAuth errors
	if (error) {
		console.error('Slack OAuth error:', error);
		throw redirect(302, `/settings?tab=integrations&error=${encodeURIComponent(error)}`);
	}

	if (!code) {
		throw redirect(302, '/settings?tab=integrations&error=no_code');
	}

	// Verify state to prevent CSRF (you should store this in session/cookie)
	// For now, we'll skip this check but in production you should validate it

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: process.env.SLACK_CLIENT_ID!,
				client_secret: process.env.SLACK_CLIENT_SECRET!,
				code,
				redirect_uri: `${url.origin}/api/integrations/slack/callback`
			})
		});

		const tokenData = await tokenResponse.json();

		if (!tokenData.ok) {
			console.error('Slack token exchange failed:', tokenData);
			throw redirect(
				302,
				`/settings?tab=integrations&error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`
			);
		}

		// Get user's team
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { teamId: true }
		});

		if (!user?.teamId) {
			throw redirect(302, '/settings?tab=integrations&error=no_team');
		}

		// Store integration in database
		await db.integration.create({
			data: {
				teamId: user.teamId,
				type: 'SLACK',
				name: tokenData.team.name || 'Slack Workspace',
				status: 'ACTIVE',
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				config: {
					teamId: tokenData.team.id,
					teamName: tokenData.team.name,
					scope: tokenData.scope,
					botUserId: tokenData.bot_user_id,
					appId: tokenData.app_id,
					incomingWebhook: tokenData.incoming_webhook
				},
				installedBy: userId
			}
		});

		// Redirect back to settings with success message
		throw redirect(302, '/settings?tab=integrations&success=slack_connected');
	} catch (error: any) {
		if (error.status === 302) {
			throw error; // Re-throw redirects
		}

		console.error('Error setting up Slack integration:', error);
		throw redirect(
			302,
			`/settings?tab=integrations&error=${encodeURIComponent(error.message || 'unknown_error')}`
		);
	}
};
