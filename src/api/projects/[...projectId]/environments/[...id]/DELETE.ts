import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';

export const Param = z.object({
	projectId: z.string(),
	id: z.string()
});

export const Output = z.object({
	success: z.boolean()
});

export const Error = {
	404: error(404, 'Environment not found'),
	500: error(500, 'Failed to delete environment')
};

export const Modifier = (r: any) => {
	r.tags = ['Environments'];
	r.summary = 'Delete an environment';
	r.description = 'Permanently delete a testing environment.';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			await db.environment.delete({
				where: { id: input.id }
			});

			return { success: true };
		} catch (err: any) {
			if (err.code === 'P2025') {
				throw Error[404];
			}
			throw Error[500];
		}
	}
);
