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
	404: error(404, 'Test suite not found'),
	500: error(500, 'Failed to delete test suite')
};

export const Modifier = (r: any) => {
	r.tags = ['Suites'];
	r.summary = 'Delete a test suite';
	r.description = 'Permanently delete a test suite and its children.';
	return r;
};

export default new Endpoint({ Param, Output, Error, Modifier }).handle(
	async (input): Promise<any> => {
		try {
			await db.testSuite.delete({
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
