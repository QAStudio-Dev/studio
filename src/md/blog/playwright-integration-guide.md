---
title: Integrating Playwright with QA Studio
date: 2025-11-04T10:00:00.000Z
description: Learn how to seamlessly integrate your Playwright tests with QA Studio using our official reporters for JavaScript and Python.
cover: ''
category: Integrations
tags:
  - playwright
  - automation
  - ci-cd
  - integration
author: QA Studio Team
slug: playwright-integration-guide
published: true
---

Playwright is one of the most powerful browser automation frameworks available today. With QA Studio's official reporters, you can automatically send your Playwright test results to your QA Studio dashboard for comprehensive tracking, analysis, and reporting.

## Why Integrate Playwright with QA Studio?

- **Centralized Results**: View all test results in one place, whether they're automated or manual
- **Historical Tracking**: Track test execution trends over time
- **Team Collaboration**: Share test results with your team instantly
- **Rich Reporting**: Capture screenshots, videos, and error traces automatically
- **CI/CD Integration**: Seamlessly integrate with your existing pipelines

## Prerequisites

Before you begin, make sure you have:

1. A QA Studio account and project created
2. An API key from your QA Studio settings page
3. Playwright installed in your project

## Installation

### JavaScript/TypeScript (npm)

```bash
npm install --save-dev @qastudio/playwright-reporter
```

### Python (PyPI)

```bash
pip install qastudio-playwright
```

## Configuration

### JavaScript/TypeScript Setup

Update your `playwright.config.ts` to include the QA Studio reporter:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
	reporter: [
		[
			'@qastudio/playwright-reporter',
			{
				apiUrl: 'https://app.qastudio.dev/api',
				apiKey: process.env.QA_STUDIO_API_KEY,
				projectId: 'your-project-id',
				testRunName: 'Playwright Tests',
				environment: 'staging', // optional
				milestoneId: 'milestone-id' // optional
			}
		],
		['html'] // Keep your existing reporters
	]
	// ... rest of your config
});
```

### Python Setup

Create or update your `pytest.ini` or `pyproject.toml`:

```ini
[pytest]
markers =
    qastudio: QA Studio integration

[tool.pytest.ini_options]
qastudio_api_url = "https://app.qastudio.dev/api"
qastudio_api_key = "${QA_STUDIO_API_KEY}"
qastudio_project_id = "your-project-id"
qastudio_test_run_name = "Playwright Python Tests"
qastudio_environment = "staging"
```

Or configure programmatically in your `conftest.py`:

```python
import pytest
from qastudio_playwright import QAStudioReporter

def pytest_configure(config):
    reporter = QAStudioReporter(
        api_url='https://app.qastudio.dev/api',
        api_key=os.environ.get('QA_STUDIO_API_KEY'),
        project_id='your-project-id',
        test_run_name='Playwright Python Tests',
        environment='staging'
    )
    config.pluginmanager.register(reporter)
```

## Getting Your API Key

1. Navigate to **Settings** in your QA Studio dashboard
2. Scroll to the **API Keys** section
3. Click **Generate New API Key**
4. Give it a descriptive name like "CI/CD Pipeline"
5. Copy the generated key and store it securely

**Important**: Never commit your API key to version control. Always use environment variables.

## Environment Variables

Set your API key as an environment variable:

### Local Development

```bash
# .env (add to .gitignore!)
QA_STUDIO_API_KEY=qas_your_api_key_here
```

### CI/CD (GitHub Actions)

```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        env:
          QA_STUDIO_API_KEY: ${{ secrets.QA_STUDIO_API_KEY }}
        run: npx playwright test
```

Add `QA_STUDIO_API_KEY` to your GitHub repository secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add your API key

### CI/CD (GitLab CI)

```yaml
stages:
  - test

playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm ci
    - npx playwright test
  variables:
    QA_STUDIO_API_KEY: $QA_STUDIO_API_KEY
```

Add `QA_STUDIO_API_KEY` to your GitLab CI/CD variables:

1. Go to **Settings** → **CI/CD** → **Variables**
2. Add your API key as a protected variable

## Advanced Configuration

### Uploading Screenshots and Videos

The reporter automatically uploads screenshots for failed tests. To enable video uploads:

```typescript
export default defineConfig({
	use: {
		video: 'retain-on-failure', // or 'on' for all tests
		screenshot: 'only-on-failure' // or 'on' for all tests
	},
	reporter: [
		[
			'@qastudio/playwright-reporter',
			{
				apiUrl: 'https://app.qastudio.dev/api',
				apiKey: process.env.QA_STUDIO_API_KEY,
				projectId: 'your-project-id',
				uploadAttachments: true, // Enable attachment uploads
				maxAttachmentSize: 10 * 1024 * 1024 // 10MB limit
			}
		]
	]
});
```

### Mapping Tests to Test Cases

Link your automated tests to existing QA Studio test cases using test IDs:

```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
	// Add test case ID in test name or metadata
	test.info().annotations.push({ type: 'qastudio-id', description: 'TC-123' });

	await page.goto('https://example.com/login');
	await page.fill('[name="email"]', 'user@example.com');
	await page.fill('[name="password"]', 'password123');
	await page.click('button[type="submit"]');

	await expect(page).toHaveURL('/dashboard');
});
```

### Custom Test Run Names

Use dynamic test run names based on your environment:

```typescript
const timestamp = new Date().toISOString().split('T')[0];
const branch = process.env.GITHUB_REF_NAME || 'local';

export default defineConfig({
	reporter: [
		[
			'@qastudio/playwright-reporter',
			{
				apiUrl: 'https://app.qastudio.dev/api',
				apiKey: process.env.QA_STUDIO_API_KEY,
				projectId: 'your-project-id',
				testRunName: `Playwright - ${branch} - ${timestamp}`,
				metadata: {
					branch,
					commit: process.env.GITHUB_SHA,
					workflow: process.env.GITHUB_WORKFLOW
				}
			}
		]
	]
});
```

## Viewing Results

After running your tests, results will automatically appear in your QA Studio dashboard:

1. Navigate to your project
2. Click on **Test Runs**
3. Find your latest run by name or timestamp
4. Click to view detailed results including:
   - Pass/fail status for each test
   - Execution duration
   - Error messages and stack traces
   - Screenshots and videos
   - Browser and environment information

## Troubleshooting

### Reporter Not Sending Results

**Check your API key:**

```bash
echo $QA_STUDIO_API_KEY
```

**Verify network connectivity:**

```bash
curl -H "Authorization: Bearer $QA_STUDIO_API_KEY" \
  https://app.qastudio.dev/api/projects
```

**Enable debug logging:**

```typescript
reporter: [
	[
		'@qastudio/playwright-reporter',
		{
			// ... your config
			debug: true
		}
	]
];
```

### Rate Limiting

If you're running a large test suite, you may hit rate limits. Configure batch uploads:

```typescript
reporter: [
	[
		'@qastudio/playwright-reporter',
		{
			// ... your config
			batchSize: 50, // Send results in batches of 50
			batchDelay: 1000 // Wait 1 second between batches
		}
	]
];
```

### Attachment Upload Failures

Large attachments may fail to upload. Configure size limits:

```typescript
reporter: [
	[
		'@qastudio/playwright-reporter',
		{
			// ... your config
			maxAttachmentSize: 5 * 1024 * 1024, // 5MB
			compressAttachments: true // Enable compression
		}
	]
];
```

## Best Practices

1. **Use Descriptive Test Names**: Help your team understand what each test does
2. **Tag Your Tests**: Use Playwright's test tags to organize tests by feature or priority
3. **Set Up Retries**: Configure automatic retries for flaky tests
4. **Capture Context**: Include relevant metadata like browser version, viewport size
5. **Clean Up Old Test Runs**: Archive or delete old test runs to keep your dashboard clean

## Example: Complete CI/CD Integration

Here's a complete example integrating Playwright with QA Studio in GitHub Actions:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily at midnight

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run tests
        env:
          QA_STUDIO_API_KEY: ${{ secrets.QA_STUDIO_API_KEY }}
          BROWSER: ${{ matrix.browser }}
        run: npx playwright test --project=${{ matrix.browser }}

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
```

## Next Steps

Now that you've integrated Playwright with QA Studio, explore these features:

- **[API Documentation](/docs)**: Learn about advanced API features and test the endpoints interactively
- **Milestones**: Track testing progress against releases in your project settings
- **Environments**: Test across multiple environments (Production, Staging, QA, etc.)
- **Team Collaboration**: Invite team members to view and analyze test results

## Package Links

- **npm**: [@qastudio/playwright-reporter](https://www.npmjs.com/package/@qastudio/playwright-reporter)
- **PyPI**: [qastudio-playwright](https://pypi.org/project/qastudio-playwright/)

## Get Help

Having trouble with the integration? We're here to help:

- **Discord**: [Join our community](https://discord.gg/rw3UfdB9pN)
- **GitHub Issues**: [Report bugs or request features](https://github.com/QAStudio-Dev/studio/issues)
- **Email**: ben@qastudio.dev

Happy testing! 🎭✨
