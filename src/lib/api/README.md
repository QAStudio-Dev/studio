# API Documentation System

This directory contains the TypeScript-based API documentation system that keeps your API docs in sync with your actual endpoints.

## How It Works

1. **Define schemas** in `schemas.ts` with TypeScript types
2. **Use those types** in your API endpoints for type safety
3. **Documentation auto-generates** from the schemas

## Adding a New API Endpoint

### Step 1: Define Types & Schema

In `src/lib/api/schemas.ts`:

```typescript
// Define response types
export type MyResourceResponse = {
	id: string;
	name: string;
	createdAt: Date | string;
};

export type MyResourceCreateBody = {
	name: string;
};

// Define API schema
export const MyResourceApi = {
	list: {
		method: 'GET',
		path: '/api/my-resources',
		description: 'List all resources',
		tags: ['My Resources'],
		responses: {
			200: {
				description: 'Success',
				example: [
					{
						id: '123',
						name: 'Example',
						createdAt: '2024-01-01T00:00:00Z'
					}
				] as MyResourceResponse[]
			}
		}
	} satisfies ApiSchema,

	create: {
		method: 'POST',
		path: '/api/my-resources',
		description: 'Create a new resource',
		tags: ['My Resources'],
		body: {
			description: 'Resource data',
			example: {
				name: 'New Resource'
			} as MyResourceCreateBody
		},
		responses: {
			201: {
				description: 'Created',
				example: {
					id: '123',
					name: 'New Resource',
					createdAt: '2024-01-01T00:00:00Z'
				} as MyResourceResponse
			}
		}
	} satisfies ApiSchema
} as const;

// Add to ApiSchemas export
export const ApiSchemas = {
	projects: ProjectsApi,
	myResources: MyResourceApi // <-- Add here
} as const;
```

### Step 2: Use Types in Endpoint

In `src/routes/api/my-resources/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { MyResourceResponse, MyResourceCreateBody } from '$lib/api/schemas';

export const GET: RequestHandler = async () => {
	const resources = await db.myResource.findMany();

	const response: MyResourceResponse[] = resources;
	return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
	const body: MyResourceCreateBody = await request.json();

	const resource = await db.myResource.create({
		data: body
	});

	const response: MyResourceResponse = resource;
	return json(response, { status: 201 });
};
```

### Step 3: Documentation Auto-Updates!

Your `/docs` page will automatically include the new endpoint documentation. No manual updates needed!

## Benefits

✅ **Type Safety**: Your endpoints use the same types as your docs
✅ **Auto-Sync**: Docs stay in sync with code
✅ **Single Source of Truth**: Define once, use everywhere
✅ **Better DX**: TypeScript autocomplete in endpoints
✅ **No Manual Maintenance**: Update schema, docs update automatically

## Advanced: Adding Parameters

```typescript
export const MyResourceApi = {
	getById: {
		method: 'GET',
		path: '/api/my-resources/:id',
		description: 'Get resource by ID',
		tags: ['My Resources'],
		params: {
			id: {
				type: 'string',
				description: 'Resource ID',
				required: true,
				example: '123'
			}
		},
		query: {
			include: {
				type: 'string',
				description: 'Related data to include',
				required: false,
				example: 'relations'
			}
		},
		responses: {
			200: {
				description: 'Success',
				example: { id: '123', name: 'Example' } as MyResourceResponse
			},
			404: {
				description: 'Not found',
				example: { error: 'Resource not found' } as ErrorResponse
			}
		}
	} satisfies ApiSchema
};
```

## Migration Strategy

You can migrate endpoints gradually:

1. Auto-generated docs (from `schemas.ts`) appear first
2. Manual docs (old `api-docs.ts` entries) appear after
3. Migrate one API group at a time
4. Remove from manual docs once migrated to schemas

The two systems work side-by-side!
