import api from '$api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (evt) => {
	const response = await api.handle(evt);

	// Add cache headers for static configuration
	response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

	// Add rate limit info headers (if available from rate limit check)
	// Note: Rate limit headers are set in the endpoint handler via checkRateLimitWithInfo

	return response;
};

export const OPTIONS: RequestHandler = async (evt) => api.handle(evt);
