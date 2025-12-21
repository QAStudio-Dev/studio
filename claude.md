# QA Studio - Test Reporting Platform

## Project Overview

QA Studio is a comprehensive test management and reporting platform inspired by Allure TestOps and TestRail. It enables teams to organize, execute, and track testing activities across projects.

### Core Features (Phase 1)

- **Project Management**: Organize testing by projects with unique keys
- **Test Organization**: Create hierarchical test suites and test cases
- **Test Execution**: Plan and execute test runs across different environments
- **Results Tracking**: Record detailed test results with steps, attachments, and metrics
- **Milestone Planning**: Track testing progress against release milestones
- **Rich Reporting**: Capture screenshots, logs, and stack traces for failures

### Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Skeleton UI, Tailwind 4
- **Backend**: SvelteKit API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Self-hosted with bcrypt password hashing and secure sessions
- **Storage**: File attachments (screenshots, logs, videos)
- **Syntax Highlighting**: Shiki (for API documentation)

## TypeScript Best Practices

### Avoid `as any` Type Assertions

**IMPORTANT**: Avoid using `as any` type assertions in TypeScript code. Using `as any` defeats the purpose of TypeScript's type system by disabling all type checking.

**Why to avoid `as any`:**

- Loses all type safety benefits
- Hides type errors that could catch bugs
- Makes refactoring dangerous (no compiler errors when types change)
- Reduces code maintainability and IDE autocomplete support

**Better alternatives:**

1. **Use proper types from Prisma/Zod schemas:**

```typescript
// ❌ Bad - loses type safety
vi.mocked(db.project.findUnique).mockResolvedValue({
	id: 'proj_123',
	name: 'Test'
} as any);

// ✅ Good - use Prisma types
import type { Project } from '$prisma/client';
vi.mocked(db.project.findUnique).mockResolvedValue({
	id: 'proj_123',
	name: 'Test',
	key: 'TEST',
	createdBy: 'user_123',
	teamId: null,
	createdAt: new Date(),
	updatedAt: new Date()
} satisfies Project);
```

2. **Use `satisfies` operator for partial mocks:**

```typescript
// ✅ Good - type-safe partial mock
const mockUser = {
	id: 'user_123',
	email: 'test@example.com',
	teamId: 'team_123'
} satisfies Partial<User>;
```

3. **Create proper type definitions:**

```typescript
// ✅ Good - define the exact type you need
type MockProject = Pick<Project, 'id' | 'name' | 'key' | 'createdBy' | 'teamId'> & {
	createdAt: Date;
	updatedAt: Date;
};
```

4. **Use `unknown` for truly unknown types, then narrow:**

```typescript
// ✅ Good - safer than 'any'
const result = (await someFunction()) as unknown;
if (isValidType(result)) {
	// Now result is properly typed
}
```

**When `any` IS acceptable:**

There are legitimate cases where `any` is the correct choice:

1. **Third-party library API contracts** - When a library expects `any` as part of its designed API:

```typescript
// ✅ Good - sveltekit-api's Modifier expects 'any' to mutate OpenAPI config
export const Modifier = (r: any) => {
	r.tags = ['Projects'];
	r.summary = 'Update resource';
	return r;
};
```

2. **Dynamic Prisma updates** - When building update objects conditionally:

```typescript
// ✅ Good - Record<string, any> for dynamic Prisma updates
const data: Record<string, any> = {};
if (updateData.name !== undefined) {
	data.name = updateData.name;
}
if (updateData.status !== undefined) {
	data.status = updateData.status;
}
await db.resource.update({ where: { id }, data });
```

Note: `Record<string, any>` is better than plain `any` because it communicates "object with string keys" and is validated by Prisma at runtime.

3. **Complex mutation patterns** - When mutating objects where the full type would be impractical:

```typescript
// ✅ Good - when working with complex OpenAPI/config objects
function enhanceConfig(config: any): any {
	config.metadata = { ...config.metadata, enhanced: true };
	return config;
}
```

**When `as any` is NOT acceptable:**

- Your application's business logic
- Data models and entities
- Function return types (let TypeScript infer or use proper types)
- Test mocks (use `satisfies` instead)

**In tests specifically:**

- Use Vitest's type utilities: `vi.mocked()` handles most typing needs
- Mock with full object shapes that match the actual types
- Use `satisfies` to ensure partial mocks are type-safe
- Never use `as any` in test data - it hides type errors

## Database Schema

The database is organized into logical sections:

### Projects & Organization

- **Project**: Top-level container with unique key (e.g., "PROJ")
- **Milestone**: Release milestones for tracking progress
- **Environment**: Testing environments (Production, Staging, QA, etc.)

### Test Suites & Cases

- **TestSuite**: Hierarchical organization of tests (supports nesting)
- **TestCase**: Individual test cases with steps, priorities, types, and automation status
    - Supports multiple test types: Functional, Regression, Smoke, Integration, Performance, Security, UI, API, Unit, E2E
    - Priorities: Critical, High, Medium, Low
    - Automation tracking: Automated, Not Automated, Candidate

### Test Runs & Results

- **TestRun**: Test execution session linked to project, milestone, and environment
- **TestResult**: Individual test case execution results with status, duration, errors
- **TestStepResult**: Granular step-by-step execution tracking
- **TestStatus**: Passed, Failed, Blocked, Skipped, Retest, Untested

### Attachments

- **Attachment**: Store screenshots, logs, videos linked to test cases or results

### Database Access Patterns

This project uses custom path aliases for Prisma imports:

**Database Instance** (most common):

```typescript
import { db } from '$lib/server/db';
```

Use this to access the singleton Prisma client instance for database queries.

**Prisma Client Class**:

```typescript
import { PrismaClient } from '$prisma/client';
```

Use this when you need to instantiate a new Prisma client (rare - usually only in setup/migration scripts).

**Prisma Types**:

```typescript
import { Prisma } from '$prisma/client';
```

Use this to access Prisma-generated TypeScript types like `Prisma.SmsMessageWhereInput` for type-safe queries.

**Important**: Do NOT use the standard `@prisma/client` import path - this project uses the `$prisma/client` alias.

**Standalone Scripts** (outside SvelteKit):

For standalone scripts (like migration scripts) that run with `tsx` or `node`, you cannot use SvelteKit path aliases. Instead, use direct imports and initialize Prisma with the PostgreSQL adapter:

```typescript
import 'dotenv/config';
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ... your script code ...

// Always disconnect when done
await db.$disconnect();
await pool.end();
```

**Examples**:

```typescript
// ✅ Correct - Query with singleton instance (SvelteKit routes/endpoints)
import { db } from '$lib/server/db';
const users = await db.user.findMany();

// ✅ Correct - Type-safe where clause (SvelteKit routes/endpoints)
import { db } from '$lib/server/db';
import { Prisma } from '$prisma/client';

const where: Prisma.UserWhereInput = {
	email: { contains: '@example.com' }
};
const users = await db.user.findMany({ where });

// ✅ Correct - Standalone script (scripts/*)
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ❌ Wrong - Don't use @prisma/client in SvelteKit code
import { PrismaClient } from '@prisma/client'; // Wrong path for SvelteKit!
```

## Writing Standalone Scripts

When writing scripts in the `scripts/` directory that run outside of SvelteKit (using `tsx`, `ts-node`, or `node`), you **cannot** use SvelteKit path aliases or environment imports.

### Why Scripts Fail with SvelteKit Imports

SvelteKit path aliases like `$lib`, `$app`, `$env`, and `$prisma` are resolved by Vite during the build process. Standalone scripts run directly with Node.js/tsx and don't go through Vite, so these aliases are not available.

**Common Errors:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '$app'
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '$lib'
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '$prisma/client'
```

### Script Structure Template

Here's the correct pattern for standalone scripts:

```typescript
/**
 * Script description here
 *
 * Usage:
 *   npx tsx scripts/my-script.ts
 *   npx tsx scripts/my-script.ts --dry-run
 */

import 'dotenv/config'; // Load environment variables
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ✅ Environment variables from dotenv
const DATABASE_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is not set');
	process.exit(1);
}

// ✅ Initialize Prisma with PostgreSQL adapter (required for Prisma 7)
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ✅ Parse command-line arguments
const isDryRun = process.argv.includes('--dry-run');

async function main() {
	if (isDryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made\n');
	}

	// Your script logic here
	const users = await db.user.findMany();
	console.log(`Found ${users.length} users`);

	// Example: Copy utility functions inline if needed
	// Don't import from $lib - copy the function code instead
}

// ✅ Always cleanup database connections
main()
	.then(async () => {
		console.log('\nScript finished successfully');
		await db.$disconnect();
		await pool.end();
		process.exit(0);
	})
	.catch(async (error) => {
		console.error('\nScript failed:', error);
		await db.$disconnect();
		await pool.end();
		process.exit(1);
	});
```

### Key Patterns for Scripts

**1. Database Access:**

```typescript
// ❌ WRONG - Cannot use $lib in scripts
import { db } from '$lib/server/db';

// ✅ CORRECT - Use direct import with adapter
import { PrismaClient } from '../src/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });
```

**2. Environment Variables:**

```typescript
// ❌ WRONG - Cannot use $env in scripts
import { DATABASE_URL } from '$env/static/private';

// ✅ CORRECT - Use dotenv and process.env
import 'dotenv/config';
const DATABASE_URL = process.env.DATABASE_URL;
```

**3. Utility Functions:**

```typescript
// ❌ WRONG - Cannot import from $lib
import { encrypt, decrypt } from '$lib/server/encryption';

// ✅ CORRECT - Copy the function inline or use relative path
import { encrypt, decrypt } from '../src/lib/server/encryption.js';

// OR copy the function code directly into the script
function decrypt(encryptedText: string): string {
	// Implementation copied from src/lib/server/encryption.ts
	const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
	// ... rest of implementation
}
```

**4. Prisma Types:**

```typescript
// ❌ WRONG - Cannot use $prisma alias
import { Prisma } from '$prisma/client';

// ✅ CORRECT - Import from generated client
import { Prisma } from '../src/generated/client/index.js';
```

**5. Running the Script:**

```bash
# Development/testing
npx tsx scripts/my-script.ts --dry-run

# Production
npx tsx scripts/my-script.ts
```

### Common Pitfalls

1. **Forgetting to load dotenv**: Always import `'dotenv/config'` at the top
2. **Not initializing Prisma adapter**: Prisma 7 requires the PG adapter for PostgreSQL
3. **Not cleaning up connections**: Always call `db.$disconnect()` and `pool.end()`
4. **Using SvelteKit imports**: Never use `$lib`, `$app`, `$env`, or `$prisma` in scripts
5. **Wrong Prisma import path**: Use `../src/generated/client/client.js`, not `@prisma/client`

### Real-World Example

See [scripts/decrypt-sms-account-sids.ts](scripts/decrypt-sms-account-sids.ts) for a complete working example of a migration script that:

- Loads environment variables with dotenv
- Initializes Prisma with PostgreSQL adapter
- Copies encryption utilities inline (avoiding `$lib` imports)
- Supports `--dry-run` flag
- Properly cleans up database connections

## API Documentation

The platform includes a comprehensive, public-facing API documentation page at `/docs`.

### Features

- **Interactive Examples**: All code examples use Shiki syntax highlighting with light/dark theme support
- **Copy-to-Clipboard**: One-click copying for all code snippets
- **Organized by Resource**: Projects, Milestones, Environments, Test Suites, Test Cases, Test Runs, Test Results, Attachments
- **Collapsible Responses**: Accordion-based response examples with status codes
- **Parameter Tables**: Clear documentation of path, query, and body parameters
- **Getting Started Guide**: Quick examples for common use cases

### Maintaining API Docs

The API documentation uses a TypeScript-based schema system for type safety and automatic sync with endpoints. See the [API Documentation System](#api-documentation-system) section below for details on adding new endpoints.

## Skeleton + Svelte Styling Guide

This project uses Skeleton UI library with Svelte 5 and Tailwind 4.

## Installation & Setup

Global stylesheet ([app.css](src/app.css)) should include:

```css
@import '@skeletonlabs/skeleton-svelte';
```

## Component Architecture

Skeleton uses a **composed pattern** with granular components:

```svelte
<Avatar>
	<Avatar.Image src="..." />
	<Avatar.Fallback>SK</Avatar.Fallback>
</Avatar>
```

### Key Patterns

**Style Props Convention**: All components accept CSS utilities via the `class` attribute. Styles automatically gain precedence over internal defaults through Tailwind's `@base` layer.

**Extensible Markup**: Use the `element` snippet to override internal HTML:

```svelte
<Accordion.ItemTrigger>
	{#snippet element({ attributes })}
		<button {...attributes}>Custom Button</button>
	{/snippet}
</Accordion.ItemTrigger>
```

**Provider Pattern**: Components support providers that expose Zag.js APIs:

```svelte
const tooltip = useTooltip({id});
<Tooltip.Provider value={tooltip}>
	<!-- Access state via tooltip().open and tooltip().setOpen() -->
</Tooltip.Provider>
```

## Buttons & Interactive Elements

Skeleton UI provides preset button styles that work seamlessly with Tailwind CSS.

### Basic Button Usage

All buttons use the base `btn` class combined with preset modifiers:

```svelte
<!-- Filled button (solid background) -->
<button class="btn preset-filled-primary-500">Primary Action</button>
<button class="btn preset-filled-secondary-500">Secondary Action</button>
<button class="btn preset-filled-success-500">Success</button>
<button class="btn preset-filled-warning-500">Warning</button>
<button class="btn preset-filled-error-500">Delete</button>

<!-- Outlined button (border only) -->
<button class="btn preset-outlined-primary-500">Primary Outline</button>
<button class="btn preset-outlined-error-500">Delete Outline</button>
<button class="btn preset-outlined-surface-500">Cancel</button>

<!-- Tonal button (subtle background) -->
<button class="preset-tonal-primary-500 btn">Primary Tonal</button>
<button class="preset-tonal-error-500 btn">Delete Tonal</button>

<!-- Ghost button (transparent, shows on hover) -->
<button class="preset-ghost btn">Ghost Button</button>
```

### Button Sizes

Combine with size utilities:

```svelte
<button class="btn preset-filled-primary-500 btn-sm">Small</button>
<button class="btn preset-filled-primary-500">Default</button>
<button class="btn preset-filled-primary-500 btn-lg">Large</button>
```

### Button States

```svelte
<!-- Disabled state -->
<button class="btn preset-filled-primary-500" disabled>Disabled</button>

<!-- Loading state (add your own spinner) -->
<button class="btn preset-filled-primary-500" disabled>
	<Spinner class="mr-2" />
	Loading...
</button>

<!-- With icons -->
<button class="btn preset-filled-primary-500">
	<Plus class="mr-2 h-4 w-4" />
	Add Item
</button>
```

### Common Button Patterns

**Primary Actions:**

```svelte
<button class="btn preset-filled-primary-500">Save</button>
<button class="btn preset-filled-primary-500">Submit</button>
<button class="btn preset-filled-primary-500">Create</button>
```

**Destructive Actions:**

```svelte
<button class="btn preset-filled-error-500">Delete</button>
<button class="btn preset-outlined-error-500">Remove</button>
```

**Cancel/Secondary Actions:**

```svelte
<button class="btn preset-outlined-surface-500">Cancel</button>
<button class="preset-ghost btn">Dismiss</button>
```

**Link Buttons:**

```svelte
<a href="/settings" class="btn preset-filled-primary-500"> Go to Settings </a>
```

### Button Groups

```svelte
<div class="flex gap-3">
	<button class="btn preset-filled-primary-500">Save</button>
	<button class="btn preset-outlined-surface-500">Cancel</button>
</div>
```

### Responsive Buttons

```svelte
<!-- Full width on mobile, auto on desktop -->
<button class="btn w-full preset-filled-primary-500 md:w-auto"> Responsive Button </button>
```

### Custom Styling

You can combine presets with Tailwind utilities:

```svelte
<!-- Add custom width -->
<button class="btn w-48 preset-filled-primary-500">Fixed Width</button>

<!-- Add custom padding -->
<button class="btn preset-filled-primary-500 px-8 py-4">Large Padding</button>

<!-- Add hover effects -->
<button class="btn preset-filled-primary-500 transition-shadow hover:shadow-lg">
	Hover Shadow
</button>
```

### Important Notes

- Always use the **full preset name** including the color suffix (e.g., `preset-filled-primary-500`, not `preset-filled-primary`)
- The `btn` class must always come first, followed by the preset
- Presets handle all color, padding, border-radius, and hover states automatically
- Use Tailwind utilities for spacing, sizing, and layout adjustments

## Tailwind Integration

### Core Utilities

- **Color Classes**: `[property]-[color]-[shade]` maps to `--color-[color]-[shade]` CSS variables
- **Color Pairings**: Light/dark mode balancing via `light-dark()` CSS function
- **Typography Scale**: Dynamic font sizing with `--text-scaling` variable
- **Radius**: `rounded-base` and `rounded-container` for consistent border radius
- **Spacing**: Dynamic scaling via `--spacing` CSS variable

### Dark Mode

Skeleton supports three strategies:

1. **Media** (default): Uses `prefers-color-scheme` to match OS settings
2. **Selector**: Add `.dark` class to `<html>` element
3. **Data Attribute**: Use `data-mode="dark"` on `<html>`

Apply variants in markup:

```html
<div class="bg-white dark:bg-black">Content</div>
```

### Color Scheme Feature

Toggle light or dark rendering at any scope:

```svelte
<div class="scheme-light">
	<div class="bg-primary-50-950">Always light</div>
</div>
```

## Custom Animations

Override component animations using the `element` snippet with Svelte transitions:

```svelte
<Accordion.ItemContent>
	{#snippet element(attributes)}
		{#if !attributes.hidden}
			<div {...attributes} hidden={false} transition:slide>Content</div>
		{/if}
	{/snippet}
</Accordion.ItemContent>
```

Key steps: spread attributes, override the `hidden` attribute, apply transition directive.

## Form Elements

Skeleton requires the **Tailwind Forms Plugin** for semantic form styling. All form inputs automatically inherit theme colors and styles.

## Layout Best Practices

### Semantic HTML Structure

Use `<header>`, `<main>`, `<footer>`, `<aside>`, and `<article>` elements to properly denote page regions.

### Sticky Positioning

Combine utilities for persistent headers/sidebars:

- `sticky` + `top-0` + `z-10` for sticky headers
- Add `backdrop-blur` for glass-morphism effects
- Use `h-[calc(100vh-{offset}px)]` to account for other sticky elements

### Responsive Design

Leverage Tailwind's breakpoints:

```html
<div class="grid grid-cols-1 md:grid-cols-[auto_1fr]">
	<aside class="hidden md:block">Sidebar</aside>
	<main>Content</main>
</div>
```

Ensure `<html>` and `<body>` extend to full viewport height via `h-full`.

## Component Migration Notes

**Svelte 5 Adoption**: Components use modern Svelte features including runes and snippets rather than v4 patterns (no `bind:` or slot syntax from v4).

**Zag.js Foundation**: All components leverage Zag.js for accessible, framework-agnostic state management.

## Presets & Design System

Skeleton includes optional **preset classes** for buttons, badges, cards, and other UI elements (e.g., `preset-filled`, `preset-tonal`). These combine semantic styling with customization flexibility through standard Tailwind classes.

## Key Conventions

- Always spread component attributes from snippets to maintain functionality
- Prefer CSS variables over `@apply` for better maintainability
- Use Tailwind's arbitrary value syntax for custom values: `w-[200px]`
- Implement ARIA patterns from W3C when building accessible popovers/modals
- Import components and types from `@skeletonlabs/skeleton-svelte`

## Example Component Usage

```svelte
<script lang="ts">
	import { Avatar, Button } from '@skeletonlabs/skeleton-svelte';
</script>

<div class="card rounded-container p-4">
	<Avatar class="mb-4">
		<Avatar.Image src="/avatar.jpg" alt="User" />
		<Avatar.Fallback>US</Avatar.Fallback>
	</Avatar>

	<Button class="preset-filled">Click Me</Button>
</div>
```

## Modal Dialogs with Skeleton + Tailwind

When creating modal dialogs, the `card` class alone is **not sufficient** as it doesn't provide a background color. You must explicitly add background and styling classes.

### ❌ WRONG - Missing Background

```svelte
<!-- This will appear transparent/invisible -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
	<div class="card p-6">
		<h2>Modal Title</h2>
		<!-- Content -->
	</div>
</div>
```

### ✅ CORRECT - Proper Modal Styling with Accessibility

```svelte
<!-- Modal overlay with semi-transparent backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			showModal = false;
		}
	}}
>
	<!-- Modal content with proper background -->
	<div class="rounded-container-token w-full max-w-2xl bg-surface-50-950 p-6 shadow-xl">
		<h2 id="modal-title" class="mb-4 text-2xl font-bold">Modal Title</h2>
		<!-- Content -->
	</div>
</div>
```

### Key Classes for Modals

- **Overlay**: `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4`
    - `fixed inset-0` - Cover entire viewport
    - `z-50` - High z-index to appear above other content
    - `bg-black/50` - Semi-transparent dark backdrop
    - `flex items-center justify-center` - Center the modal
    - `p-4` - Padding around modal on small screens

- **Modal Container**: `rounded-container-token bg-surface-50-950 p-6 shadow-xl`
    - `rounded-container-token` - Skeleton's responsive border radius
    - `bg-surface-50-950` - Adaptive background (light mode: 50, dark mode: 950)
    - `p-6` - Internal padding
    - `shadow-xl` - Drop shadow for depth
    - Add size classes: `w-full max-w-2xl` or `max-w-md`
    - For scrollable content: `max-h-[90vh] overflow-y-auto`

### Complete Accessible Modal Example

```svelte
<script lang="ts">
	let showModal = $state(false);
</script>

{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-modal-title"
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				showModal = false;
			}
		}}
	>
		<div
			class="rounded-container-token max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-surface-50-950 p-6 shadow-xl"
		>
			<h2 id="edit-modal-title" class="mb-4 text-2xl font-bold">Edit Item</h2>

			<form class="space-y-4">
				<div>
					<label for="name" class="mb-2 block text-sm font-medium">Name</label>
					<input id="name" type="text" class="input w-full" />
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						class="btn preset-outlined-surface-500"
						onclick={() => (showModal = false)}
					>
						Cancel
					</button>
					<button type="submit" class="btn preset-filled-primary-500"> Save </button>
				</div>
			</form>
		</div>
	</div>
{/if}
```

### Accessibility Requirements

Always include these accessibility features for modals:

- **`role="dialog"`** - Identifies the element as a dialog
- **`aria-modal="true"`** - Indicates modal behavior (background inert)
- **`aria-labelledby="modal-title"`** - Links to modal heading for screen readers
- **Escape key handler** - Close modal on Escape key press
- **Unique ID on heading** - Match with `aria-labelledby` attribute

### Important Notes

- **Always use `bg-surface-50-950`** for modal backgrounds - this ensures proper light/dark mode support
- **Never use `card` class alone** for modals - it lacks the background color
- **Use `rounded-container-token`** instead of `rounded-container` for Skeleton modals
- **Add `shadow-xl`** for visual depth and separation from backdrop
- **Include accessibility attributes** - `role`, `aria-modal`, `aria-labelledby`, and escape key handler
- Consider **click-outside-to-close** for better UX (add `onclick` to overlay div)
- **Disable escape during submission** - Prevent closing modal while saving/deleting

## Authentication

QA Studio uses a **self-hosted authentication system** with industry-standard security practices. All authentication data stays within your infrastructure, providing complete privacy and control.

### Security Features

- **Password Hashing**: Bcrypt with 12 rounds (OWASP 2025 recommended)
- **Session Management**: HTTP-only secure cookies with 30-day expiry
- **CSRF Protection**: Separate CSRF tokens for state-changing operations
- **Rate Limiting**: Login endpoints limited to prevent brute force attacks
- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, and number
- **Token Security**: Cryptographically secure tokens using nanoid with bcrypt hashing

### Database Schema

The authentication system uses three main models:

- **User**: Stores user accounts with bcrypt-hashed passwords
    - `id`: Internal CUID (not external provider ID)
    - `email`: Unique user email
    - `passwordHash`: Bcrypt-hashed password
    - `emailVerified`: Email verification status
    - `role`: User role (OWNER, ADMIN, MANAGER, TESTER, VIEWER)

- **Session**: Manages user sessions
    - `token`: Bcrypt-hashed session token
    - `expiresAt`: Session expiration timestamp
    - `userId`: Foreign key to User

- **PasswordResetToken**: Handles password recovery
    - `token`: Bcrypt-hashed reset token
    - `expiresAt`: 1-hour expiration
    - `used`: Tracks if token was used

### Architecture

**Server-Side Components**:

- [src/lib/server/crypto.ts](src/lib/server/crypto.ts): Password hashing and token generation
- [src/lib/server/sessions.ts](src/lib/server/sessions.ts): Session management and cookies
- [src/lib/server/password-reset.ts](src/lib/server/password-reset.ts): Password reset flow
- [src/hooks.server.ts](src/hooks.server.ts): Session middleware integrated with SvelteKit
- [src/lib/server/auth.ts](src/lib/server/auth.ts): Helper functions for protecting API routes

**Authentication API Endpoints**:

- `POST /api/auth/signup`: Create new user account
- `POST /api/auth/login`: Authenticate user (with rate limiting, auto-detects Clerk migration)
- `POST /api/auth/logout`: End user session
- `POST /api/auth/setup-password`: One-time password setup for migrated Clerk users
- `POST /api/auth/request-reset`: Request password reset token
- `POST /api/auth/reset-password`: Reset password with token

**Client-Side Pages**:

- [/login](src/routes/login/+page.svelte): Login form (with Clerk migration detection)
- [/signup](src/routes/signup/+page.svelte): Registration form
- [/setup-password](src/routes/setup-password/+page.svelte): One-time password setup for existing users
- [/forgot-password](src/routes/forgot-password/+page.svelte): Password reset request
- [/reset-password](src/routes/reset-password/+page.svelte): Password reset form
- [/settings](src/routes/settings/+page.svelte): Settings page with Profile, API Keys, Team, and Integrations tabs
- [/change-password](src/routes/change-password/+page.svelte): Change password form

### Protecting API Routes

Use the `requireAuth` helper to protect API endpoints:

```typescript
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	// Throws 401 if not authenticated
	const userId = await requireAuth(event);

	// Create resource with userId
	const project = await db.project.create({
		data: {
			name: 'Project',
			createdBy: userId
		}
	});

	return json(project);
};
```

### Authentication Patterns in Page Server Files

**IMPORTANT**: Always use `locals.userId` for authentication in page server load functions.

The authentication middleware ([src/hooks.server.ts](src/hooks.server.ts)) sets both `locals.userId` and `locals.auth()` for backward compatibility, but **`locals.userId` is the preferred pattern**.

**✅ Correct Pattern:**

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.userId;

	if (!userId) {
		throw redirect(302, '/login');
	}

	// Use userId for queries
	const user = await db.user.findUnique({
		where: { id: userId }
	});

	return { user };
};
```

**❌ Deprecated Pattern (backward compatibility only):**

```typescript
// Don't use this - kept only for backward compatibility with old Clerk code
const { userId } = locals.auth() || {};
```

**Why `locals.userId` is preferred:**

1. **Simpler and more direct** - No function call needed
2. **Canonical pattern** - Used in root layout ([src/routes/+layout.server.ts](src/routes/+layout.server.ts))
3. **Better performance** - Direct property access vs function call
4. **Clearer intent** - Explicitly shows you're accessing the authenticated user ID

**Consistency across the codebase:**

All page server files should use this pattern:

- [src/routes/+layout.server.ts](src/routes/+layout.server.ts)
- [src/routes/projects/[projectId]/+page.server.ts](src/routes/projects/[projectId]/+page.server.ts)
- [src/routes/projects/[projectId]/cases/+page.server.ts](src/routes/projects/[projectId]/cases/+page.server.ts)
- [src/routes/projects/[projectId]/runs/+page.server.ts](src/routes/projects/[projectId]/runs/+page.server.ts)
- And all other protected pages

**Note:** The `locals.auth()` function exists only to maintain backward compatibility with code that previously used Clerk. New code and refactored code should always use `locals.userId`.

### User Tracking

The Prisma schema tracks user actions:

- `Project.createdBy`: User who created the project
- `TestCase.createdBy`: User who created the test case
- `TestRun.createdBy`: User who created the test run
- `TestResult.executedBy`: User who executed the test

All user fields store internal user IDs (CUIDs) and are indexed for performance.

### Migrating from Clerk

Existing Clerk users have a seamless one-time password setup flow:

**Automatic Flow:**

1. User visits `/login` and enters their email (any password)
2. System detects they have the temporary password from migration
3. User is automatically redirected to `/setup-password` with email pre-filled
4. User sets their new password and is logged in immediately
5. Done! They can use their new password going forward

**Manual Setup:**

- Users can also directly visit `/setup-password` to set their password
- The setup page verifies they have the temporary password before allowing setup
- Once password is set, they must use the normal login flow

**Note:** The temporary password from migration (`CHANGE_ME_123!`) cannot be used to login - it only serves as a database placeholder.

### Future Enhancements

The self-hosted system can be extended with:

- **Email Verification**: Implement email verification on signup
- **SSO Integration**: Add support for Authentik, Authelia, or other SAML/OAuth providers
- **2FA**: Add two-factor authentication support
- **Session Management**: Add ability to view and revoke active sessions
- **Audit Logs**: Track authentication events for security compliance

## API Documentation System

QA Studio uses a TypeScript-based API documentation system that keeps docs in sync with actual endpoints.

### Architecture

The system consists of three parts:

1. **Type Definitions** (`src/lib/api/schemas.ts`): Define API request/response types and schemas
2. **Doc Generator** (`src/lib/api/generate-docs.ts`): Converts schemas to documentation format
3. **Docs Page** (`src/routes/docs/+page.svelte`): Displays auto-generated + manual docs

### Adding a New API Endpoint

**Step 1: Define Schema** in `src/lib/api/schemas.ts`:

```typescript
// Define types
export type MyResourceResponse = {
  id: string;
  name: string;
  createdAt: Date | string;
};

export type MyResourceCreateBody = {
  name: string;
};

// Define schema
export const MyResourceApi = {
  list: {
    method: 'GET',
    path: '/api/my-resources',
    description: 'List all resources',
    tags: ['My Resources'],
    responses: {
      200: {
        description: 'Success',
        example: [...] as MyResourceResponse[]
      }
    }
  } satisfies ApiSchema
} as const;

// Add to exports
export const ApiSchemas = {
  projects: ProjectsApi,
  myResources: MyResourceApi, // <-- Add here
} as const;
```

**Step 2: Use Types in Endpoint**:

```typescript
import type { MyResourceResponse } from '$lib/api/schemas';

export const GET: RequestHandler = async () => {
	const resources = await db.myResource.findMany();
	const response: MyResourceResponse[] = resources;
	return json(response);
};
```

**Step 3: Docs Auto-Update!** Visit `/docs` to see the new endpoint.

### Schema Options

```typescript
{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: '/api/path/:param',
  description: 'Endpoint description',
  tags: ['Category'], // For grouping
  params: {
    id: { type: 'string', description: '...', required: true, example: '123' }
  },
  query: {
    filter: { type: 'string', description: '...', required: false }
  },
  body: {
    description: 'Request body',
    example: {...} as MyRequestType
  },
  responses: {
    200: { description: 'Success', example: {...} as MyResponseType },
    400: { description: 'Error', example: {...} as ErrorResponse }
  }
}
```

### Benefits

- **Type Safety**: Endpoints use same types as docs
- **Auto-Sync**: Docs automatically update when schemas change
- **Single Source of Truth**: Define once, use everywhere
- **TypeScript Autocomplete**: Full IDE support in endpoints
- **Gradual Migration**: Old manual docs work alongside new system

### Migration Strategy

The system supports both auto-generated and manual docs simultaneously:

1. Auto-generated docs (from `schemas.ts`) appear first in `/docs`
2. Manual docs (from `api-docs.ts`) appear after
3. Migrate one API group at a time to schemas
4. Remove from manual docs once migrated

See `src/lib/api/README.md` for detailed examples and best practices.

## Public API Development with sveltekit-api

QA Studio uses **sveltekit-api** for building type-safe, auto-documented public APIs. This system uses Zod schemas for validation and automatically generates OpenAPI documentation.

### Directory Structure

```
src/
├── api/                          # Business logic with Zod schemas (auto-documented)
│   └── integrations/
│       └── twilio/
│           ├── GET.ts           # Get configuration
│           ├── POST.ts          # Configure integration
│           ├── DELETE.ts        # Remove configuration
│           └── sms/
│               └── send/
│                   └── POST.ts  # Send SMS
└── routes/
    └── api/                      # Route handlers (simple delegation)
        └── integrations/
            └── twilio/
                ├── +server.ts   # Delegates to src/api
                └── sms/
                    └── send/
                        └── +server.ts
```

### Creating a New Public API Endpoint

**Step 1: Create Business Logic in `src/api`**

Example: `src/api/integrations/twilio/POST.ts`

```typescript
import { Endpoint, z, error } from 'sveltekit-api';
import { db } from '$lib/server/db';
import { requireApiAuth } from '$lib/server/api-auth';
import { encrypt } from '$lib/server/encryption';

// Define input schema with Zod
export const Input = z.object({
	accountSid: z.string().min(1).describe('Twilio Account SID'),
	authToken: z.string().min(1).describe('Twilio Auth Token (will be encrypted)'),
	phoneNumber: z
		.string()
		.regex(/^\+[1-9]\d{1,14}$/)
		.describe('Phone number in E.164 format (e.g., +15551234567)')
});

// Define output schema
export const Output = z.object({
	message: z.string(),
	twilioEnabled: z.boolean(),
	twilioPhoneNumber: z.string(),
	twilioConfiguredAt: z.coerce.string()
});

// Define possible errors
export const Error = {
	400: error(400, 'Invalid request - check required fields'),
	403: error(403, 'Insufficient permissions'),
	404: error(404, 'Team not found')
};

// Add OpenAPI metadata
export const Modifier = (r: any) => {
	r.tags = ['Twilio Integration'];
	r.summary = 'Configure Twilio integration';
	r.description = 'Configure or update Twilio integration. Requires OWNER/ADMIN role.';
	return r;
};

// Implement handler
export default new Endpoint({ Input, Output, Error, Modifier }).handle(
	async (input, evt): Promise<any> => {
		const userId = await requireApiAuth(evt);

		// Business logic here
		const encryptedSid = encrypt(input.accountSid);
		const encryptedToken = encrypt(input.authToken);

		const team = await db.team.update({
			where: { id: userTeamId },
			data: {
				twilioAccountSid: encryptedSid,
				twilioAuthToken: encryptedToken,
				twilioPhoneNumber: input.phoneNumber
			}
		});

		return {
			message: 'Configuration saved',
			twilioEnabled: true,
			twilioPhoneNumber: input.phoneNumber,
			twilioConfiguredAt: new Date().toISOString()
		};
	}
);
```

**Step 2: Create Route Handler in `src/routes/api`**

Example: `src/routes/api/integrations/twilio/+server.ts`

```typescript
import api from '$api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (evt) => api.handle(evt);
export const POST: RequestHandler = async (evt) => api.handle(evt);
export const DELETE: RequestHandler = async (evt) => api.handle(evt);
export const OPTIONS: RequestHandler = async (evt) => api.handle(evt);
```

**That's it!** The endpoint is now:

- ✅ Type-safe with Zod validation
- ✅ Auto-documented in OpenAPI/Swagger
- ✅ Accessible at `/api/integrations/twilio`

### Key Components

**Input Schema (`Input`)**: Zod schema for request body/query parameters

- Use `.describe()` for field descriptions in OpenAPI docs
- Use `.regex()`, `.min()`, `.max()` for validation
- All fields are required by default, use `.optional()` for optional fields

**Output Schema (`Output`)**: Zod schema for response

- Define the exact shape of successful responses
- Use `z.coerce.string()` for dates to ensure ISO string format

**Error Definitions (`Error`)**: HTTP error responses

- Define all possible error codes and messages
- Use `error(statusCode, message)` helper

**Modifier (`Modifier`)**: OpenAPI metadata

- `tags`: Group endpoints in docs (e.g., ['Twilio Integration'])
- `summary`: Short description (appears in endpoint list)
- `description`: Detailed description with usage notes

**Query Parameters**: Use `Query` export instead of `Input`

```typescript
export const Query = z.object({
	limit: z.coerce.number().min(1).max(100).optional(),
	direction: z.enum(['inbound', 'outbound']).optional()
});
```

**Path Parameters**: Use `Param` export

```typescript
export const Param = z.object({
	projectId: z.string(),
	id: z.string()
});
```

### Authentication

Use `requireApiAuth` for API key authentication:

```typescript
import { requireApiAuth } from '$lib/server/api-auth';

export default new Endpoint({ Input, Output }).handle(async (input, evt) => {
	const userId = await requireApiAuth(evt); // Throws 401 if not authenticated
	// ... business logic
});
```

### CRITICAL: Route Parameter Naming Convention

**IMPORTANT:** The route directory structure in `src/routes/api` **MUST exactly match** the API directory structure in `src/api` for sveltekit-api to correctly resolve endpoints.

**The Issue:**
sveltekit-api uses the SvelteKit route ID to dynamically find the corresponding API implementation file. If the parameter names don't match exactly, the route lookup will fail with "Route not found" errors even though the route handler exists.

**Correct Pattern:**

```
src/
├── api/
│   └── projects/
│       └── [...projectId]/          # ✅ Use [...projectId] (rest parameter)
│           └── cases/
│               ├── GET.ts
│               └── POST.ts
└── routes/
    └── api/
        └── projects/
            └── [...projectId]/      # ✅ MUST match API directory name exactly
                └── cases/
                    └── +server.ts
```

**Incorrect Pattern (causes 404 errors):**

```
src/
├── api/
│   └── projects/
│       └── [...projectId]/          # Uses rest parameter
│           └── cases/
│               └── POST.ts
└── routes/
    └── api/
        └── projects/
            └── [projectId]/         # ❌ MISMATCH! Uses single parameter
                └── cases/
                    └── +server.ts
```

**Why This Matters:**

- `[projectId]` matches a single path segment (e.g., `/projects/ABC123`)
- `[...projectId]` matches one or more segments (rest/catch-all parameter)
- sveltekit-api constructs the lookup key using the exact route parameter names
- Mismatched names = route lookup fails = 404 errors in production

**When Creating New Endpoints:**

1. Choose parameter naming convention (`[id]` vs `[...id]`) in `src/api` first
2. Use the **exact same naming** in `src/routes/api`
3. Export all HTTP methods the API implements (GET, POST, PATCH, DELETE, etc.)

**Example Route Handler:**

```typescript
// src/routes/api/projects/[...projectId]/cases/+server.ts
import api from '$api';
import type { RequestHandler } from './$types';

// Export ALL methods that exist in src/api/projects/[...projectId]/cases/
export const GET: RequestHandler = async (evt) => api.handle(evt);
export const POST: RequestHandler = async (evt) => api.handle(evt);
export const OPTIONS: RequestHandler = async (evt) => api.handle(evt);
```

### Handling Null Values in Schemas

When a field can be `null`, `undefined`, or a value, use `.nullish()` instead of just `.optional()`:

```typescript
// ❌ Wrong - only accepts undefined or string, rejects null
suiteId: z.string().optional();

// ✅ Correct - accepts undefined, null, or string
suiteId: z.string().nullish();

// Alternative - more explicit
suiteId: z.string().nullable().optional();
```

This is important for optional foreign keys where the frontend may send `null` to indicate "no relation".

### Best Practices

1. **Separation of Concerns**: Business logic in `src/api`, routing in `src/routes/api`
2. **Exact Directory Matching**: Route directories MUST match API directories exactly (including parameter naming)
3. **Export All Methods**: Route handlers must export all HTTP methods that the API implements
4. **Descriptive Schemas**: Use `.describe()` on all Zod fields for better documentation
5. **Proper Error Codes**: Define all possible errors with appropriate HTTP status codes
6. **Type Safety**: Export and reuse Zod schemas as TypeScript types if needed
7. **Validation**: Let Zod handle all input validation automatically
8. **Null Handling**: Use `.nullish()` for fields that can be null, undefined, or a value
9. **Documentation**: Use `Modifier` to provide helpful context in OpenAPI docs

### Viewing Documentation

All public APIs are automatically documented at `/docs` with interactive examples, request/response schemas, and error codes.
