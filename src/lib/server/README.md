# Server-Side Authentication Helpers

## Quick Reference

### Protecting API Routes

```typescript
import { requireAuth } from '$lib/server/auth';

// Require authentication (throws 401 if not authenticated)
export const GET: RequestHandler = async (event) => {
	const userId = requireAuth(event);
	// userId is guaranteed to be a string here
};
```

### Optional Authentication

```typescript
import { getCurrentUserId } from '$lib/server/auth';

// Get userId if authenticated, null otherwise
export const GET: RequestHandler = async (event) => {
	const userId = getCurrentUserId(event);

	if (userId) {
		// Show user-specific data
	} else {
		// Show public data
	}
};
```

### Access Full Session

```typescript
import { getCurrentSession } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const session = getCurrentSession(event);

	if (session) {
		const { userId, orgId, orgRole } = session;
		// Use organization info, roles, etc.
	}
};
```

## Common Patterns

### Filter by User

```typescript
// Get only current user's projects
const userId = requireAuth(event);

const projects = await db.project.findMany({
	where: { createdBy: userId },
	orderBy: { createdAt: 'desc' }
});
```

### Track Created By

```typescript
// Set createdBy on creation
const userId = requireAuth(event);
const data = await event.request.json();

const project = await db.project.create({
	data: {
		...data,
		createdBy: userId
	}
});
```

### Verify Ownership

```typescript
// Check if user owns resource before updating
const userId = requireAuth(event);
const { id } = event.params;

const project = await db.project.findUnique({
	where: { id }
});

if (!project || project.createdBy !== userId) {
	throw error(403, 'Forbidden - You do not own this resource');
}

// Now update...
```

### Public vs Private Endpoints

```typescript
// Public endpoint (no auth required)
export const GET: RequestHandler = async () => {
	return json({ status: 'ok' });
};

// Private endpoint (auth required)
export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	// Handle authenticated request
};
```

## Organization Support (Multi-Tenancy)

When you enable Organizations in Clerk:

```typescript
import { requireAuth, getCurrentSession } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const session = getCurrentSession(event);

	// Get organization ID
	const orgId = session?.orgId;

	if (!orgId) {
		throw error(400, 'No organization selected');
	}

	// Filter by organization
	const projects = await db.project.findMany({
		where: { organizationId: orgId }
	});

	return json(projects);
};
```

## Role-Based Access Control (RBAC)

```typescript
import { requireAuth, getCurrentSession } from '$lib/server/auth';

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const session = getCurrentSession(event);

	// Check organization role
	if (session?.orgRole !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// Perform admin action...
};
```

## Error Handling

The `requireAuth()` function automatically throws proper errors:

```typescript
// Automatically handled by SvelteKit
requireAuth(event);
// → Throws 401 if not authenticated
// → User sees proper error response
```

Custom error handling:

```typescript
try {
	const userId = requireAuth(event);
	// ... your code
} catch (err) {
	if (err.status === 401) {
		// Custom 401 handling
	}
	throw err;
}
```

## Testing with Auth

For testing, you can mock the auth:

```typescript
// In your test file
event.locals.clerk = {
	session: {
		userId: 'test_user_123',
		orgId: 'test_org_456'
	}
};
```
