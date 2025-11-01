import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { token } = event.params;

	try {
		const res = await fetch(`${event.url.origin}/api/invitations/${token}`, {
			headers: event.request.headers
		});

		if (!res.ok) {
			const data = await res.json();
			throw error(res.status, data.message || 'Failed to load invitation');
		}

		const data = await res.json();

		return {
			invitation: data.invitation
		};
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to load invitation');
	}
};
