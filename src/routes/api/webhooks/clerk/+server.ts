import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse webhook payload
		const payload = await request.json();
		const { type, data } = payload;

		// Handle the webhook
		console.log(`📨 Clerk webhook received: ${type}`);

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
