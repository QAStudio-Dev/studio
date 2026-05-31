---
title: 'How to Debug Flaky Playwright Tests: A Systematic Guide'
date: 2026-05-31T10:00:00.000Z
description: Flaky Playwright tests waste CI time and erode trust. Learn how to classify failures, reproduce intermittents, fix root causes, and keep artifacts organized so your team stops rerolling the dice.
cover: ''
category: Best Practices
tags:
    - playwright
    - flaky-tests
    - test-automation
    - debugging
    - ci-cd
    - test-stability
author: QA Studio Team
slug: how-to-debug-flaky-playwright-tests
published: true
---

A test that passes locally, fails in CI, passes on retry, and fails again tomorrow is not "probably fine." It is **flaky**—and flaky Playwright tests are one of the fastest ways to lose confidence in your entire automation suite.

Teams often respond by adding `test.retry(2)` and moving on. That hides the problem until failures cluster on release day, when every minute of CI delay matters. This guide walks through a repeatable process to **find**, **reproduce**, and **fix** flaky Playwright tests, and how to store the evidence your team needs so the same failure does not become a mystery twice.

## What Makes a Playwright Test Flaky?

A flaky test is one that can pass or fail **without a deterministic change to application code or test logic**. Common causes in Playwright projects:

| Cause                        | Typical symptom                         | Why it is intermittent                           |
| ---------------------------- | --------------------------------------- | ------------------------------------------------ |
| **Timing / race conditions** | Element not found, timeout on `click()` | Load order or animation timing varies            |
| **Shared state**             | Passes alone, fails in full suite       | Order-dependent data or cookies                  |
| **Environment drift**        | CI-only failures                        | Different viewport, timezone, locale, or network |
| **Unstable selectors**       | Wrong element clicked sometimes         | DOM order or dynamic IDs change                  |
| **External dependencies**    | Random 5xx or rate limits               | Third-party APIs, email, SMS, payments           |
| **Parallelism**              | Failures only under `--workers > 1`     | Resource contention or shared fixtures           |

Flakiness is not randomness in the universe—it is **uncontrolled variance**. Your job is to narrow which variable moved.

## Step 1: Confirm It Is Actually Flaky

Before you refactor production code, prove the test is inconsistent.

### Run the same test many times

```bash
# Run one test 50 times locally
npx playwright test tests/checkout.spec.ts -g "completes order" --repeat-each=50

# Same test in headed mode to watch behavior
npx playwright test tests/checkout.spec.ts -g "completes order" --repeat-each=20 --headed
```

If it never fails locally but fails in CI, you likely have an **environment** or **parallelism** issue—not a "ghost in the machine."

### Check CI retry patterns

If your pipeline only fails on the third attempt, the first two failures still matter. Log them. Flakiness that "always passes eventually" still costs queue time and teaches the team to ignore red builds.

### Separate infrastructure failures from test failures

Browser install errors, out-of-memory kills, and artifact upload timeouts are not flaky tests—they are pipeline problems. Tag them differently in your test management tool so you do not chase the wrong root cause.

## Step 2: Capture Evidence on Every Failure

You cannot debug what you did not record. Playwright's built-in artifacts are the foundation:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		trace: 'on-first-retry', // or 'retain-on-failure' for always-on traces
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	reporter: [['list'], ['html', { open: 'never' }]]
});
```

| Artifact            | Best for                                      |
| ------------------- | --------------------------------------------- |
| **Trace**           | Step-by-step timeline, network, DOM snapshots |
| **Screenshot**      | Quick visual state at failure                 |
| **Video**           | Understanding animations and multi-step flows |
| **stdout / stderr** | Console errors and custom logging             |

When results live only on the CI runner disk, they disappear when the job ends. Pushing failures—including traces and screenshots—to a central test management platform means QA, developers, and release managers can open the same failure without SSH access to GitHub Actions.

If you use [QA Studio's Playwright reporter](/blog/playwright-integration-guide), attachments upload automatically with each failed result, and signed trace URLs let anyone on the team open the Playwright trace viewer without digging through build logs.

## Step 3: Reproduce with the Trace Viewer

The Playwright trace is the fastest path from "it failed" to "here is the exact moment."

1. Open the trace (`npx playwright show-trace path/to/trace.zip`) or follow a signed link from your test dashboard.
2. Scrub the timeline to the failing step.
3. Inspect **network** requests—did an API return 200 with an empty body?
4. Compare **DOM snapshots** before and after the action—did a loading overlay block the click?
5. Read **console** and **source** tabs for JavaScript errors that do not surface in the assertion message.

Look for these red flags in traces:

- **Action before navigation finished** — `click()` fired while `networkidle` had not settled
- **Detached or hidden elements** — locator resolved to a stale node
- **Overlapping UI** — cookie banners, modals, or toast notifications intercepting input
- **Slow API responses** — assertion ran before data rendered

## Step 4: Fix the Root Cause (Not the Symptom)

### Prefer auto-waiting locators over arbitrary sleeps

```typescript
// ❌ Hides timing bugs
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Submit' }).click();

// ✅ Playwright waits until actionable
await page.getByRole('button', { name: 'Submit' }).click();
```

Use `waitForTimeout` only when you have documented proof nothing else works (rare).

### Use resilient locators

Priority order that scales:

1. `getByRole`, `getByLabel`, `getByPlaceholder` (accessible, stable)
2. `getByTestId` (explicit contract with engineering)
3. CSS/XPath only when necessary—and scoped tightly

Avoid selectors tied to layout (`nth-child(3)`) or generated class names (`css-1a2b3c`).

### Isolate test data

Each test should create and clean up its own user, cart, or record. Shared accounts cause collisions when workers run in parallel:

```typescript
test.beforeEach(async ({ page }) => {
	const email = `user-${Date.now()}@example.com`;
	await createUserViaApi(email);
	await login(page, email);
});
```

### Control external services

For SMS, email, or webhooks, stub or use dedicated test infrastructure—[Twilio integration in QA Studio](/blog/twilio-sms-integration) is one example of capturing real messages in a controlled environment instead of hitting production paths.

### Stabilize CI environment

Align CI with local defaults where it matters:

```typescript
// playwright.config.ts
export default defineConfig({
	use: {
		locale: 'en-US',
		timezoneId: 'America/New_York',
		viewport: { width: 1280, height: 720 }
	}
});
```

Pin browser versions in CI and avoid mixing headed/headless assumptions in assertions.

## Step 5: Quarantine and Track Flaky Tests

Fixing takes time. Running a known-flaky test on every PR blocks the team. A practical middle ground:

1. **Mark or tag** the test as flaky in your test management system.
2. **Move it** to a quarantine job that runs nightly—not on every push.
3. **Set an owner** and a deadline; quarantine is not a graveyard.
4. **Re-enable** only after `repeat-each` runs clean in CI.

Link quarantined tests to a **milestone** or release so stakeholders know flakiness is acknowledged before ship. [Test milestones](/blog/test-milestones-release-planning) give you a filter: "show me all failed or unstable tests tied to v2.5."

## Step 6: Prevent Regression of the Fix

### Add a stress run to CI (selectively)

For previously flaky specs, run a small matrix on merge to main:

```yaml
# Example GitHub Actions job
- name: Stress flaky-prone tests
  run: npx playwright test tests/checkout.spec.ts --repeat-each=10
```

Ten clean repeats are not mathematical proof, but they catch obvious regressions cheaply.

### Assert on outcomes, not implementation timing

```typescript
// ❌ Brittle
await expect(page.locator('.spinner')).toBeHidden();

// ✅ User-visible outcome
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
```

### Review parallel worker count

Start with `workers: 1` when debugging. Once stable, increase workers and watch for new failures—that often exposes shared-state bugs.

## How QA Teams Should Work With Developers

Flaky tests are a **team** problem, not a QA-only ticket.

| Role                  | Contribution                                                      |
| --------------------- | ----------------------------------------------------------------- |
| **QA**                | Reproduce steps, classify failure type, attach traces/screenshots |
| **Developer**         | Fix race conditions, add `data-testid`, improve API contracts     |
| **Platform / DevOps** | Stable CI images, artifact retention, reasonable timeouts         |
| **Product**           | Prioritize stability work when flakiness blocks releases          |

When failure artifacts live in one place—linked to the test run, environment, and [milestone](/blog/test-milestones-release-planning)—the Slack thread stops at "can someone send the trace?" and starts at "here is the fix."

## FAQ

### Should I use `test.retry()` in Playwright?

Retries are acceptable **temporarily** while you investigate, or for known infrastructure blips with monitoring. Permanent retries on product tests mask flakiness and inflate pass rates. Pair retries with logging and a ticket to fix the root cause.

### What is the difference between `trace: 'on-first-retry'` and `'retain-on-failure'`?

`on-first-retry` keeps traces smaller—good for high-volume CI. `retain-on-failure` captures every failed run, which is better when you are actively debugging a small set of unstable tests.

### How many times should I run a test to prove it is fixed?

There is no magic number. Many teams use 20–50 local repeats plus a week of clean CI history. Critical paths (checkout, login, billing) deserve more scrutiny than low-risk admin pages.

### Can AI help debug flaky tests?

AI analysis works best when it has **structured context**: error message, stack trace, and trace timeline. Tools that summarize failures against historical runs help you spot "this selector broke after the redesign" faster than reading fifty logs by hand— but they complement, not replace, solid locator and isolation practices.

## Stop Treating Flakiness as Normal

Flaky Playwright tests are solvable. Confirm the inconsistency, capture traces and screenshots on every failure, reproduce in the trace viewer, fix timing and data isolation, quarantine with accountability, and wire results into the same system your team uses for release sign-off.

If your failures are scattered across CI logs today, [integrate Playwright with QA Studio](/blog/playwright-integration-guide) so the next intermittent failure leaves a trail your whole team can follow.

Questions or war stories about flaky suites? Join our [Discord community](https://discord.gg/rw3UfdB9pN) or explore the [Reporter API docs](/docs) to automate how failures are recorded.
