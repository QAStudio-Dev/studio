import api from '$api';
import type { RequestHandler} from './$types';

export const POST: RequestHandler = async (evt) => api.handle(evt);
export const OPTIONS: RequestHandler = async (evt) => api.handle(evt);
