/**
 * Generate API documentation from TypeScript schemas
 */

import type { ApiSchema } from './schemas';
import type { ApiSection, ApiEndpoint } from '$lib/api-docs';

/**
 * Convert API schemas to documentation format
 */
export function generateApiDocs(schemas: Record<string, Record<string, ApiSchema>>): ApiSection[] {
	const sections: ApiSection[] = [];

	for (const [sectionKey, sectionSchemas] of Object.entries(schemas)) {
		const endpoints: ApiEndpoint[] = [];

		for (const [, schema] of Object.entries(sectionSchemas)) {
			const endpoint: ApiEndpoint = {
				method: schema.method,
				path: schema.path,
				description: schema.description,
				responses: Object.entries(schema.responses).map(([status, response]) => ({
					status: parseInt(status),
					description: response.description,
					example: JSON.stringify(response.example, null, 2)
				}))
			};

			// Add request body if present
			if (schema.body) {
				endpoint.requestBody = {
					contentType: 'application/json',
					example: JSON.stringify(schema.body.example, null, 2)
				};
			}

			// Add parameters if present
			const parameters: ApiEndpoint['parameters'] = [];

			if (schema.params) {
				for (const [name, param] of Object.entries(schema.params)) {
					parameters.push({
						name,
						type: 'path',
						required: param.required,
						description: param.description,
						example: param.example
					});
				}
			}

			if (schema.query) {
				for (const [name, param] of Object.entries(schema.query)) {
					parameters.push({
						name,
						type: 'query',
						required: param.required,
						description: param.description,
						example: param.example
					});
				}
			}

			if (parameters.length > 0) {
				endpoint.parameters = parameters;
			}

			endpoints.push(endpoint);
		}

		sections.push({
			title: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
			description: `Manage ${sectionKey}`,
			endpoints
		});
	}

	return sections;
}
