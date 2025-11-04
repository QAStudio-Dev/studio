# E2E Testing with Playwright

This directory contains end-to-end tests for QA Studio using Playwright with the Page Object Model pattern.

## Structure

```
e2e/
├── pages/          # Page Object Models
│   ├── base.ts    # Base page class with common methods
│   ├── home.ts    # Home page model
│   ├── blog.ts    # Blog page model (to be implemented)
│   └── api.ts     # API docs page model (to be implemented)
├── tests/          # Test files
│   └── home.test.ts
└── README.md
```

## Page Object Model (POM)

### BasePage (`pages/base.ts`)

The `BasePage` class provides common functionality for all page objects:

**Navigation:**

- `goto(url)` - Navigate to URL
- `getCurrentUrl()` - Get current URL
- `waitForPageLoad()` - Wait for page to fully load
- `waitForNavigation(action)` - Wait for navigation after action

**Element Interactions:**

- `click(locator)` - Click element
- `fill(locator, text)` - Fill input field
- `hover(locator)` - Hover over element
- `check(locator)` - Check checkbox
- `uncheck(locator)` - Uncheck checkbox
- `selectOption(locator, value)` - Select dropdown option
- `pressKey(key)` - Press keyboard key

**Element Queries:**

- `getText(locator)` - Get text content
- `getAttribute(locator, attr)` - Get attribute value
- `isVisible(locator)` - Check if visible
- `isEnabled(locator)` - Check if enabled
- `getElementCount(locator)` - Count elements

**Assertions:**

- `assertVisible(locator)` - Assert element is visible
- `assertHasText(locator, text)` - Assert element has text
- `assertContainsText(locator, text)` - Assert element contains text
- `assertUrl(url)` - Assert current URL
- `assertTitle(title)` - Assert page title

**Utilities:**

- `scrollToElement(locator)` - Scroll to element
- `takeScreenshot(name)` - Take screenshot
- `wait(ms)` - Wait for specific time

### HomePage (`pages/home.ts`)

Page object for the QA Studio homepage.

**Key Elements:**

- `logo` - QA Studio logo
- `signInButton` - Sign In button
- `signUpButton` - Sign Up button
- `heroTitle` - Main hero title
- `heroDescription` - Hero description text
- `discordLink` - Discord community link
- `githubLink` - GitHub repository link
- `footer` - Footer section

**Actions:**

- `navigate()` - Go to homepage
- `clickSignIn()` - Click Sign In
- `clickSignUp()` - Click Sign Up
- `navigateToDocs()` - Go to docs page
- `navigateToBlog()` - Go to blog page
- `scrollToFooter()` - Scroll to bottom

**Checks:**

- `isLogoVisible()` - Check logo visibility
- `isHeroSectionVisible()` - Check hero section
- `areNavigationLinksVisible()` - Check nav links
- `areMainCTAsPresent()` - Check CTA buttons

## Writing Tests

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/home';

test.describe('Home Page', () => {
	let homePage: HomePage;

	test.beforeEach(async ({ page }) => {
		homePage = new HomePage(page);
		await homePage.navigate();
	});

	test('should display hero section', async () => {
		await homePage.assertVisible(homePage.heroTitle);
		await homePage.assertVisible(homePage.heroDescription);
	});
});
```

### Best Practices

1. **Use Page Objects**: Always use page objects instead of direct selectors in tests
2. **Descriptive Test Names**: Use clear, descriptive test names
3. **BeforeEach Setup**: Initialize page objects in `beforeEach`
4. **Assertions**: Use built-in assertion methods from BasePage
5. **Wait Strategies**: Use `waitForElement()` instead of fixed waits
6. **Single Responsibility**: Each test should verify one behavior
7. **Clean Tests**: Keep tests readable and maintainable

### Locator Strategies

Prefer locators in this order:

1. **Role-based**: `page.getByRole('button', { name: 'Submit' })`
2. **Text-based**: `page.getByText('Welcome')`
3. **Test IDs**: `page.getByTestId('submit-button')`
4. **CSS/XPath**: Only as last resort

## Running Tests

### Run all tests

```bash
npx playwright test
```

### Run specific test file

```bash
npx playwright test e2e/tests/home.test.ts
```

### Run in headed mode (see browser)

```bash
npx playwright test --headed
```

### Run in debug mode

```bash
npx playwright test --debug
```

### Run with specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests matching pattern

```bash
npx playwright test -g "should display"
```

### Generate test report

```bash
npx playwright show-report
```

## Environment Variables

Tests require these environment variables:

```bash
# .env file
QA_STUDIO_API_KEY=your_api_key_here
QA_STUDIO_PROJECT_ID=your_project_id_here
BASE_URL=http://localhost:5173  # Optional, defaults to localhost:5173
```

## Test Coverage

### Current Tests (home.test.ts)

- ✅ Page loads successfully
- ✅ Logo displays
- ✅ Hero section visible
- ✅ Navigation buttons work
- ✅ Sign In navigation
- ✅ Sign Up navigation
- ✅ Footer displays
- ✅ Social links work
- ✅ Docs navigation
- ✅ Blog navigation
- ✅ Responsive design (mobile/tablet)
- ✅ No console errors
- ✅ Valid external links
- ✅ Copyright year in footer

### To Be Implemented

- [ ] Blog page tests
- [ ] API docs page tests
- [ ] Authentication flows
- [ ] Project management tests
- [ ] Test case management tests
- [ ] Test run execution tests

## Debugging

### Visual debugging with UI

```bash
npx playwright test --ui
```

### Generate trace

```bash
npx playwright test --trace on
```

### View trace

```bash
npx playwright show-trace trace.zip
```

### Screenshots

Screenshots are automatically captured on test failure in:

- `test-results/` directory

## CI/CD Integration

Tests are configured to work in CI environments. The reporter automatically detects CI and adjusts settings.

### GitHub Actions Example

```yaml
- name: Run Playwright tests
  env:
    QA_STUDIO_API_KEY: ${{ secrets.QA_STUDIO_API_KEY }}
    QA_STUDIO_PROJECT_ID: ${{ secrets.QA_STUDIO_PROJECT_ID }}
  run: npx playwright test
```

## QA Studio Reporter

All test results are automatically sent to QA Studio via the `@qastudio-dev/playwright` reporter configured in `playwright.config.ts`.

Results include:

- Test status (pass/fail/skip)
- Execution duration
- Screenshots on failure
- Videos on failure
- Error messages and stack traces

View results at: https://qastudio.dev/projects/[your-project-id]/runs

## Troubleshooting

### Tests timing out

- Increase timeout in test: `test.setTimeout(60000)`
- Check network issues
- Verify selectors are correct

### Elements not found

- Check if page fully loaded
- Verify selector is correct
- Use `page.pause()` to debug interactively

### Flaky tests

- Add proper waits using `waitForElement()`
- Avoid fixed timeouts (`wait()`)
- Use `waitForLoadState()` for page loads

## Contributing

When adding new tests:

1. Create/update page object in `pages/`
2. Add tests in `tests/`
3. Follow existing patterns
4. Ensure tests are reliable
5. Update this README if needed
