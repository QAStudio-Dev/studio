import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import api from '$api';
import { dev } from '$app/environment';

// GET /api/openapi - Returns the OpenAPI specification
export const GET: RequestHandler = async (evt) => {
	try {
		const spec = await api.openapi(evt);
		return json(spec);
	} catch (error) {
		// Known issue: @asteasolutions/zod-to-openapi@8.x has registry issues with Vite in dev mode
		if (dev) {
			console.error('OpenAPI generation error (known dev mode issue):', error);
			return json(
				{
					error: 'OpenAPI documentation is unavailable in development mode',
					message:
						'Due to a compatibility issue between zod-to-openapi v8 and Vite dev mode, the OpenAPI endpoint only works in production builds. Run `npm run build && npm run preview` to view the API documentation.',
					details: error instanceof Error ? error.message : String(error),
					production_url: '/docs'
				},
				{ status: 503 }
			);
		}
		// In production, throw the error
		throw error;
	}
};
