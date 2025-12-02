import api from '$api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (evt) => api.handle(evt);
export const PATCH: RequestHandler = async (evt) => api.handle(evt);
export const DELETE: RequestHandler = async (evt) => api.handle(evt);
export const OPTIONS: RequestHandler = async (evt) => api.handle(evt);
