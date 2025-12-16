# Contributing to QA Studio

Thank you for your interest in contributing to QA Studio! We're excited to have you join our community of QA engineers building better testing tools.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment. We welcome contributors of all skill levels and backgrounds.

**Our values:**

- Be respectful and considerate
- Focus on constructive feedback
- Welcome newcomers and help them learn
- Prioritize the community's needs over individual preferences

## Getting Started

### Ways to Contribute

You don't need to be a coding expert to contribute! Here are various ways to help:

- 🐛 **Report bugs** - Found a bug? [Open an issue](https://github.com/QAStudio-Dev/studio/issues/new)
- 💡 **Suggest features** - Have an idea? [Start a discussion](https://github.com/QAStudio-Dev/studio/discussions)
- 📝 **Improve documentation** - Help make our docs clearer
- 🧪 **Write tests** - Add test coverage for existing features
- 🔧 **Fix bugs** - Pick up a [good first issue](https://github.com/QAStudio-Dev/studio/labels/good%20first%20issue)
- ✨ **Add features** - Implement new functionality
- 🎨 **Improve UI/UX** - Make the interface better
- 💬 **Help others** - Answer questions on Discord or GitHub Discussions

### Good First Issues

New to the project? Look for issues labeled [`good first issue`](https://github.com/QAStudio-Dev/studio/labels/good%20first%20issue). These are specifically chosen to be beginner-friendly.

## How to Contribute

### Reporting Bugs

Before reporting a bug:

1. Check if it's already been reported in [Issues](https://github.com/QAStudio-Dev/studio/issues)
2. Try to reproduce it with the latest version
3. Gather relevant information (browser, OS, error messages, screenshots)

**Create a bug report with:**

- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Environment details (OS, browser, QA Studio version)
- Screenshots or error logs if applicable

### Suggesting Features

Feature requests are welcome! Before suggesting:

1. Check [existing discussions](https://github.com/QAStudio-Dev/studio/discussions)
2. Consider if it aligns with QA Studio's core mission
3. Think about how it benefits the broader community

**Create a feature request with:**

- Problem statement (what problem does this solve?)
- Proposed solution
- Alternative solutions you've considered
- How this helps other users

### Asking Questions

- For general questions, use [GitHub Discussions](https://github.com/QAStudio-Dev/studio/discussions)
- For real-time chat, join our [Discord server](https://discord.gg/rw3UfdB9pN)
- For bugs, use [GitHub Issues](https://github.com/QAStudio-Dev/studio/issues)

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ or Docker
- Git

### Local Development

1. **Fork and clone the repository**

    ```bash
    git clone https://github.com/YOUR_USERNAME/studio.git
    cd studio
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Set up environment variables**

    ```bash
    cp .env.example .env.local
    ```

    Edit `.env.local` with your configuration:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/qa_studio"
    BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
    ENCRYPTION_KEY="your-32-byte-hex-key"
    CRON_SECRET="your-64-character-hex-string"
    ```

4. **Set up the database**

    ```bash
    npx prisma generate
    npx prisma db push
    ```

5. **Start the development server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:5173](http://localhost:5173)

### Using Docker (Alternative)

```bash
# Start PostgreSQL via Docker Compose
npm run docker:dev

# In another terminal, run the app
npm run dev
```

## Pull Request Process

### Before You Start

1. **Check for existing work** - Search issues and PRs to avoid duplicates
2. **Discuss large changes** - For significant features, open a discussion first
3. **Create an issue** - For bugs or features, create an issue before coding

### Creating a Pull Request

1. **Create a feature branch**

    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/bug-description
    ```

2. **Make your changes**
    - Follow our [coding guidelines](#coding-guidelines)
    - Write tests for new functionality
    - Update documentation as needed
    - Keep commits focused and atomic

3. **Test your changes**

    ```bash
    npm run test        # Run all tests
    npm run check       # Type check
    npm run lint        # Lint code
    npm run format      # Format code
    ```

4. **Commit your changes**

    Use clear, descriptive commit messages:

    ```bash
    git commit -m "feat: add test case bulk import feature"
    git commit -m "fix: resolve authentication redirect loop"
    git commit -m "docs: update API documentation for test runs"
    ```

    **Commit message format:**
    - `feat:` New feature
    - `fix:` Bug fix
    - `docs:` Documentation changes
    - `style:` Code style changes (formatting, etc.)
    - `refactor:` Code refactoring
    - `test:` Adding or updating tests
    - `chore:` Maintenance tasks

5. **Push to your fork**

    ```bash
    git push origin feature/your-feature-name
    ```

6. **Open a Pull Request**
    - Use a clear, descriptive title
    - Reference related issues (e.g., "Fixes #123")
    - Describe what changed and why
    - Include screenshots for UI changes
    - Mark as draft if work is in progress

### PR Review Process

1. **Automated checks** - CI/CD will run tests, linting, and type checking
2. **Code review** - A maintainer will review your code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, a maintainer will merge

**Tips for faster reviews:**

- Keep PRs focused and small (easier to review)
- Write clear descriptions
- Respond promptly to feedback
- Be patient - reviews may take a few days

## Coding Guidelines

### TypeScript

- Use TypeScript for all code
- Avoid `any` types - use proper typing
- Export types from `$lib/types.ts`

### Code Style

We use Prettier and ESLint for consistent formatting:

```bash
npm run format  # Format code
npm run lint    # Lint code
```

**Key conventions:**

- Use tabs for indentation (project standard)
- Use single quotes for strings
- No semicolons (Prettier removes them)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names

### Svelte Components

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Keep components focused and reusable
- Use Skeleton UI components when possible
- Follow existing component patterns

**Example:**

```svelte
<script lang="ts">
	import { Button } from '@skeletonlabs/skeleton-svelte';

	let count = $state(0);
	let doubled = $derived(count * 2);
</script>

<Button onclick={() => count++}>
	Count: {count} (doubled: {doubled})
</Button>
```

### Database

- Use Prisma for all database operations
- Write migrations for schema changes
- Use transactions for multi-step operations
- Follow import conventions (see `CLAUDE.md`)

**Example:**

```typescript
import { db } from '$lib/server/db';
import { Prisma } from '$prisma/client';

const project = await db.project.create({
	data: {
		name: 'New Project',
		key: 'PROJ',
		createdBy: userId
	}
});
```

### API Routes

- Use `requireAuth` for protected endpoints
- Validate inputs with Zod schemas (when using `sveltekit-api`)
- Return proper HTTP status codes
- Handle errors gracefully

**Example:**

```typescript
import { requireAuth } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const userId = await requireAuth(event);

	const body = await event.request.json();

	// Validate, process, return
	return json({ success: true });
};
```

## Testing

### Running Tests

```bash
npm run test:unit      # Unit tests
npm run test:e2e       # End-to-end tests with Playwright
npm run test           # All tests
```

### Writing Tests

**Unit tests** (Vitest):

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from '$lib/server/ids';

describe('generateId', () => {
	it('should generate unique IDs', () => {
		const id1 = generateId();
		const id2 = generateId();
		expect(id1).not.toBe(id2);
	});
});
```

**E2E tests** (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test('user can create a project', async ({ page }) => {
	await page.goto('/projects/new');
	await page.fill('[name="name"]', 'Test Project');
	await page.fill('[name="key"]', 'TEST');
	await page.click('button[type="submit"]');

	await expect(page).toHaveURL(/\/projects\/TEST/);
});
```

## Documentation

### Types of Documentation

- **Code comments** - Explain complex logic
- **README.md** - Project overview and quick start
- **CLAUDE.md** - Detailed architecture and conventions
- **API docs** - Auto-generated from schemas
- **Blog posts** - Feature announcements

### Writing Good Documentation

- Be clear and concise
- Include code examples
- Keep it up to date
- Add screenshots for UI features
- Link to related documentation

### Updating Documentation

When you add or change features:

- Update relevant documentation files
- Add JSDoc comments for functions
- Update API schemas in `src/lib/api/schemas.ts`
- Consider writing a blog post for major features

## Community

### Communication Channels

- **GitHub Discussions** - Feature requests, questions, ideas
- **GitHub Issues** - Bug reports, concrete tasks
- **Discord** - Real-time chat, community support
- **Blog** - Feature announcements, tutorials

### Getting Help

Stuck? Here's how to get help:

1. **Check documentation** - README, CLAUDE.md, API docs
2. **Search existing issues** - Someone may have had the same problem
3. **Ask on Discord** - Community members can help
4. **Open a discussion** - For open-ended questions

### Recognition

Contributors are recognized in:

- GitHub contributor graph
- Release notes (for significant contributions)
- Community shoutouts on Discord

## License

By contributing to QA Studio, you agree that your contributions will be licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means:

- Your code will be open source
- Anyone using it as a network service must share their modifications
- Derivative works must use the same license

See the [LICENSE](LICENSE) file for full details.

## Questions?

Have questions about contributing?

- Join our [Discord server](https://discord.gg/rw3UfdB9pN)
- Start a [GitHub Discussion](https://github.com/QAStudio-Dev/studio/discussions)
- Email: ben@qastudio.dev

Thank you for contributing to QA Studio! 🎉
