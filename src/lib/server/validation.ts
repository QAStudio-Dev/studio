/**
 * Validation utilities for API requests
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';

/**
 * Handle Zod validation errors with user-friendly messages
 * Returns a JSON response with 400 status
 */
export function handleValidationError(error: unknown) {
	if (error instanceof z.ZodError) {
		const firstError = error.issues[0];
		return json(
			{ error: firstError.message || `Invalid ${firstError.path.join('.')}` },
			{ status: 400 }
		);
	}
	return json({ error: 'Invalid request body' }, { status: 400 });
}

/**
 * Parse and validate request body with a Zod schema
 * Throws validation errors that can be caught and handled
 */
export async function validateRequestBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
	const rawBody = await request.json();
	return schema.parse(rawBody);
}
