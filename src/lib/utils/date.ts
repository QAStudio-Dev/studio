/**
 * Recursively converts all Date objects in an object to ISO strings
 */
export function serializeDates<T>(obj: T): T {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (obj instanceof Date) {
		return obj.toISOString() as any;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => serializeDates(item)) as any;
	}

	if (typeof obj === 'object') {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = serializeDates(value);
		}
		return result;
	}

	return obj;
}
