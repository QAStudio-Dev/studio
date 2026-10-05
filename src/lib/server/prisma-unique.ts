type PrismaUniqueError = {
	code?: string;
	meta?: { target?: string | string[] };
	message?: string;
};

/**
 * Fields named by a Prisma P2002 unique-constraint error.
 * Postgres sometimes reports only the constraint name (`*_pkey`) in the message.
 */
export function prismaUniqueTargets(error: unknown): string[] {
	const err = error as PrismaUniqueError;
	if (err?.code !== 'P2002') {
		return [];
	}

	const target = err.meta?.target;
	const fromMeta = Array.isArray(target) ? target : target ? [target] : [];
	const fields = fromMeta.filter((field): field is string => typeof field === 'string');
	if (fields.length > 0) {
		return fields;
	}

	if (typeof err.message === 'string' && /_pkey\b/i.test(err.message)) {
		return ['id'];
	}

	return [];
}

export function isIdUniqueConflict(error: unknown): boolean {
	return prismaUniqueTargets(error).some((field) => {
		const normalized = field.toLowerCase();
		return normalized === 'id' || normalized.endsWith('_pkey');
	});
}
