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
- [/profile](src/routes/profile/+page.svelte): User profile page
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
