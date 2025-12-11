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

### Best Practices

1. **Separation of Concerns**: Business logic in `src/api`, routing in `src/routes/api`
2. **Descriptive Schemas**: Use `.describe()` on all Zod fields for better documentation
3. **Proper Error Codes**: Define all possible errors with appropriate HTTP status codes
4. **Type Safety**: Export and reuse Zod schemas as TypeScript types if needed
5. **Validation**: Let Zod handle all input validation automatically
6. **Documentation**: Use `Modifier` to provide helpful context in OpenAPI docs

### Viewing Documentation

All public APIs are automatically documented at `/docs` with interactive examples, request/response schemas, and error codes.
