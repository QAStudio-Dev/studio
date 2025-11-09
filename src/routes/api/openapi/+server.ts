import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import api from '$api';

// GET /api/openapi - Returns the OpenAPI specification
export const GET: RequestHandler = async (evt) => json(await api.openapi(evt));
