# Teams and Roles Setup Guide

## Overview

QA Studio now includes a comprehensive user management system with teams and role-based access control (RBAC).

## Database Schema

### User Model
```prisma
model User {
  id            String   @id // Clerk user ID
  email         String   @unique
  firstName     String?
  lastName      String?
  imageUrl      String?
  role          UserRole @default(TESTER)
  teamId        String?

  // Relations
  team          Team?
  createdProjects  Project[]
  createdTestCases TestCase[]
  createdTestRuns  TestRun[]
  executedResults  TestResult[]
}
```

### Team Model
```prisma
model Team {
  id          String   @id
  name        String
  description String?

  // Relations
  members     User[]
  projects    Project[]
}
```

### User Roles

| Role | Permissions | Use Case |
|------|------------|----------|
| **ADMIN** | Full system access, manage users, teams, all projects | System administrators |
| **MANAGER** | Manage projects and teams, assign roles | QA Managers, Team Leads |
| **TESTER** | Create and execute tests, view team projects | QA Engineers, Testers |
| **VIEWER** | Read-only access to projects and results | Stakeholders, Developers |

## Setup Steps

### 1. Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_users_and_teams

# Or push schema (for development)
npx prisma db push
```

### 2. Configure Clerk Webhook

The webhook automatically syncs users from Clerk to your database.

**In Clerk Dashboard:**

1. Go to **Webhooks** section
2. Click **Add Endpoint**
3. Set endpoint URL: `https://your-domain.com/api/webhooks/clerk`
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the **Signing Secret**

**In your `.env` file:**

```bash
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

### 3. Test Webhook Locally (Optional)

For local development, use a tunnel like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 5173

# Use the ngrok URL in Clerk webhook settings
https://your-ngrok-url.ngrok.io/api/webhooks/clerk
```

## Usage Examples

### Protecting Routes by Role

```typescript
// src/routes/admin/+page.server.ts
import { requireRole } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // Only admins can access
  const user = await requireRole(event, ['ADMIN']);

  return {
    user
  };
};
```

### Manager or Admin Access

```typescript
// src/routes/projects/[id]/settings/+page.server.ts
import { requireRole } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
  // Managers and Admins can access
  const user = await requireRole(event, ['ADMIN', 'MANAGER']);

  const project = await db.project.findUnique({
    where: { id: event.params.id },
    include: { team: true }
  });

  return { user, project };
};
```

### Get User Info in APIs

```typescript
// src/routes/api/projects/+server.ts
import { requireAuth } from '$lib/server/auth';
import { ensureUser } from '$lib/server/users';

export const POST: RequestHandler = async (event) => {
  const userId = await requireAuth(event);
  const user = await ensureUser(userId);

  // Create project with user info
  const project = await db.project.create({
    data: {
      name: 'My Project',
      createdBy: userId,
      teamId: user.teamId // Associate with user's team
    }
  });

  return json(project);
};
```

### Display User Info

```typescript
// src/routes/projects/+page.server.ts
import { getUsers } from '$lib/server/users';

export const load: PageServerLoad = async () => {
  const projects = await db.project.findMany({
    include: { creator: true, team: true }
  });

  return { projects };
};
```

In your Svelte component:

```svelte
<script lang="ts">
  let { data } = $props();
</script>

{#each data.projects as project}
  <div class="card">
    <h3>{project.name}</h3>
    <p>Created by: {project.creator.firstName} {project.creator.lastName}</p>
    <p>Team: {project.team?.name || 'No team'}</p>
  </div>
{/each}
```

## Managing Teams

### Create a Team

```typescript
// src/routes/api/teams/+server.ts
import { requireRole } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  // Only admins and managers can create teams
  await requireRole(event, ['ADMIN', 'MANAGER']);

  const { name, description } = await event.request.json();

  const team = await db.team.create({
    data: { name, description }
  });

  return json(team);
};
```

### Assign User to Team

```typescript
export const PATCH: RequestHandler = async (event) => {
  const { userId, teamId } = await event.request.json();

  // Only admins and managers
  await requireRole(event, ['ADMIN', 'MANAGER']);

  const user = await db.user.update({
    where: { id: userId },
    data: { teamId }
  });

  return json(user);
};
```

### Update User Role

```typescript
export const PATCH: RequestHandler = async (event) => {
  const { userId, role } = await event.request.json();

  // Only admins can change roles
  await requireRole(event, ['ADMIN']);

  const user = await db.user.update({
    where: { id: userId },
    data: { role }
  });

  return json(user);
};
```

## Team-Based Project Access

Filter projects by team:

```typescript
export const load: PageServerLoad = async (event) => {
  const userId = await requireAuth(event);
  const user = await ensureUser(userId);

  // Get projects for user's team
  const projects = await db.project.findMany({
    where: {
      OR: [
        { teamId: user.teamId }, // Team projects
        { createdBy: userId }     // User's own projects
      ]
    },
    include: { creator: true, team: true }
  });

  return { projects };
};
```

## User Sync Process

### Automatic Sync (via Webhook)

When a user signs up in Clerk:
1. Clerk fires `user.created` webhook
2. Your webhook handler creates user in database
3. User is assigned `TESTER` role by default
4. Admin can later change role via UI

### Manual Sync (First Request)

If webhook wasn't set up or user wasn't synced:
1. User makes first authenticated request
2. `requireAuth()` calls `ensureUser()`
3. `ensureUser()` syncs user from Clerk to database
4. User is created with default `TESTER` role

## Best Practices

1. **Set up webhooks in production** - Ensures immediate user sync
2. **Use role-based access** - Protect admin/manager routes
3. **Assign teams early** - Help organize projects from the start
4. **Audit role changes** - Log when roles are modified
5. **Default to least privilege** - New users get `TESTER` role

## Role Permission Matrix

| Action | ADMIN | MANAGER | TESTER | VIEWER |
|--------|-------|---------|--------|--------|
| View projects | ✅ | ✅ | ✅ (team) | ✅ (team) |
| Create projects | ✅ | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ✅ (own) | ❌ | ❌ |
| Manage teams | ✅ | ✅ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ | ❌ |
| Create test cases | ✅ | ✅ | ✅ | ❌ |
| Execute tests | ✅ | ✅ | ✅ | ❌ |
| View results | ✅ | ✅ | ✅ | ✅ |

## Troubleshooting

### User not in database
- Check webhook is set up correctly
- User will be auto-synced on first authenticated request

### Webhook not firing
- Verify webhook URL is correct
- Check Clerk webhook logs
- Ensure `CLERK_WEBHOOK_SECRET` is set correctly

### Permission denied errors
- Check user role in database
- Verify `requireRole()` is using correct roles
- Admin may need to update user role

---

**Next Steps:**
1. Run the migration: `npx prisma db push`
2. Set up Clerk webhook
3. Create your first admin user
4. Start organizing into teams!
