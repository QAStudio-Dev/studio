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

## Team Support (Multi-Tenancy)

Access team information from the authenticated user:

```typescript
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user with team memberships
	const user = await db.user.findUnique({
		where: { id: userId },
		include: {
			teamMembers: {
				include: { team: true }
			}
		}
	});

	// Filter projects by user's teams
	const teamIds = user.teamMembers.map((tm) => tm.teamId);
	const projects = await db.project.findMany({
		where: { teamId: { in: teamIds } }
	});

	return json(projects);
};
```

## Role-Based Access Control (RBAC)

```typescript
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

export const DELETE: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	// Get user's role in the team
	const membership = await db.teamMember.findFirst({
		where: {
			userId,
			teamId: params.teamId
		}
	});

	if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
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

For testing, you can mock the session:

```typescript
// In your test file
event.locals.user = {
	id: 'test_user_123',
	email: 'test@example.com',
	role: 'ADMIN'
};
```
