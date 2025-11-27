# Authentication Test Suite

This directory contains comprehensive tests for the QA Studio authentication system.

## Test Coverage

### Unit Tests

Located in `src/lib/server/*.test.ts`:

#### Crypto Tests ([crypto.test.ts](../src/lib/server/crypto.test.ts))

- Password hashing with bcrypt
- Password verification
- Salting (different hashes for same password)
- Case sensitivity
- Token generation (cryptographically secure, URL-safe)

#### Session Tests ([sessions.test.ts](../src/lib/server/sessions.test.ts))

- Session creation with HMAC-hashed tokens
- Session validation with constant-time comparison
- Session deletion
- CSRF token verification
- Expired session handling
- Invalid token rejection

#### Environment Tests ([env.test.ts](../src/lib/server/env.test.ts))

- Environment variable validation
- Production vs development behavior
- Required secrets enforcement
- Default value rejection in production
- Secret generation

### E2E Tests

Located in `e2e/tests/auth.test.ts`:

#### Login Flow

- Form display and validation
- Empty/invalid email handling
- Incorrect credentials
- Navigation to forgot password
- Navigation to signup
- CSRF protection

#### Signup Flow

- Form display
- Weak password validation
- Duplicate email handling
- Navigation to login

#### Password Reset Flow

- Forgot password form
- Success message (no user enumeration)
- Link back to login

#### Password Setup Flow (Clerk Migration)

- Setup password form
- Non-existent user handling
- Password requirements enforcement

#### Security Tests

- CSRF token inclusion in requests
- CSRF token rejection when missing
- Rate limiting (5 attempts, 15-minute cooldown)

#### Session Management

- Unauthenticated user redirect
- Session persistence across reloads
- Session clearing on logout

#### Accessibility

- Keyboard navigation
- Form labels and ARIA attributes

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit -- --watch

# Run specific test file
npm run test:unit -- src/lib/server/crypto.test.ts

# Run with coverage
npm run test:unit -- --coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- auth.test.ts

# Run in debug mode
npm run test:e2e -- --debug
```

### Run All Tests

```bash
npm test
```

## Test Organization

```
qa-studio/
├── src/lib/server/
│   ├── crypto.ts           # Password hashing, token generation
│   ├── crypto.test.ts      # Unit tests for crypto
│   ├── sessions.ts         # Session management
│   ├── sessions.test.ts    # Unit tests for sessions
│   ├── env.ts              # Environment validation
│   └── env.test.ts         # Unit tests for env
├── e2e/
│   ├── pages/
│   │   ├── base.ts         # Base page object
│   │   └── auth.ts         # Auth page objects
│   └── tests/
│       └── auth.test.ts    # E2E authentication tests
└── tests/
    └── README.md           # This file
```

## Writing New Tests

### Unit Tests

Use Vitest for unit tests:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
	it('should do something', () => {
		const result = myFunction('input');
		expect(result).toBe('expected output');
	});
});
```

### E2E Tests

Use Playwright with page objects:

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth';

test.describe('My Feature', () => {
	let authPage: AuthPage;

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
		await authPage.navigateToLogin();
	});

	test('should do something', async () => {
		await authPage.login('user@example.com', 'Password123');
		// Add assertions
	});
});
```

## Mocking in Unit Tests

For database operations, use Vitest mocks:

```typescript
import { vi } from 'vitest';

vi.mock('./db', () => ({
	db: {
		user: {
			create: vi.fn(),
			findUnique: vi.fn()
		}
	}
}));
```

## Test Data

### Valid Test Credentials

For E2E tests that require actual authentication, you may need to set up test users. Use environment variables:

```env
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123
```

### Password Requirements

Tests should enforce:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Merges to main
- Before deployments

### GitHub Actions

```yaml
- name: Run unit tests
  run: npm run test:unit

- name: Run E2E tests
  run: npm run test:e2e
```

## Debugging Tests

### Unit Tests

```bash
# Run with verbose output
npm run test:unit -- --reporter=verbose

# Run specific test
npm run test:unit -- --grep "should hash a password"
```

### E2E Tests

```bash
# Run in headed mode with debugging
npm run test:e2e -- --headed --debug

# Generate trace
npm run test:e2e -- --trace on

# View trace
npx playwright show-trace trace.zip
```

## Test Maintenance

### When to Update Tests

- After changing authentication logic
- After adding new security features
- After modifying password requirements
- After changing session behavior
- When bugs are found (add regression tests)

### Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **E2E Tests**: Cover all critical user flows
- **Security Tests**: 100% coverage of security features

## Known Limitations

### Current Test Gaps

1. **Email Integration**: Password reset emails not tested (requires email service mock)
2. **2FA**: Not yet implemented
3. **SSO**: Not yet implemented
4. **Session Management UI**: View/revoke sessions not implemented

### Test Environment

- Tests use development database (not production)
- Rate limiting uses in-memory storage (resets between test runs)
- Email sending is mocked/logged to console

## Contributing

When adding new authentication features:

1. Write unit tests first (TDD)
2. Implement the feature
3. Add E2E tests for user flows
4. Update this README
5. Ensure all tests pass before merging

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
