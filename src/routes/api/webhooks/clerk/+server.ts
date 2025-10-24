import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CLERK_WEBHOOK_SECRET } from '$env/static/private';
import { Webhook } from 'svelte-clerk/server';
import { db } from '$lib/server/db';
import type { WebhookEvent } from '@clerk/backend';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get the headers
		const svix_id = request.headers.get('svix-id');
		const svix_timestamp = request.headers.get('svix-timestamp');
		const svix_signature = request.headers.get('svix-signature');

		if (!svix_id || !svix_timestamp || !svix_signature) {
			return json({ error: 'Missing svix headers' }, { status: 400 });
		}

		// Get the body
		const payload = await request.text();

		// Verify webhook signature
		const wh = new Webhook(CLERK_WEBHOOK_SECRET);
		let evt: WebhookEvent;

		try {
			evt = wh.verify(payload, {
				'svix-id': svix_id,
				'svix-timestamp': svix_timestamp,
				'svix-signature': svix_signature
			}) as WebhookEvent;
		} catch (err) {
			console.error('Webhook verification failed:', err);
			return json({ error: 'Invalid signature' }, { status: 401 });
		}

		// Handle the webhook
		const { type, data } = evt;

		switch (type) {
			case 'user.created':
				await db.user.create({
					data: {
						id: data.id,
						email: data.email_addresses[0]?.email_address || '',
						firstName: data.first_name,
						lastName: data.last_name,
						imageUrl: data.image_url,
						role: 'TESTER' // Default role
					}
				});
				console.log(`✅ User created: ${data.id}`);
				break;

			case 'user.updated':
				await db.user.update({
					where: { id: data.id },
					data: {
						email: data.email_addresses[0]?.email_address || '',
						firstName: data.first_name,
						lastName: data.last_name,
						imageUrl: data.image_url
					}
				});
				console.log(`✅ User updated: ${data.id}`);
				break;

			case 'user.deleted':
				if (data.id) {
					await db.user.delete({
						where: { id: data.id }
					});
					console.log(`✅ User deleted: ${data.id}`);
				}
				break;

			default:
				console.log(`Unhandled webhook type: ${type}`);
		}

		return json({ success: true });
	} catch (error: any) {
		console.error('Webhook error:', error);
		return json({ error: error.message }, { status: 500 });
	}
};
