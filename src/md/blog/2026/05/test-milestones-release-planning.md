---
title: 'Test Milestones: How to Plan QA for Software Releases'
date: 2026-05-30T10:00:00.000Z
description: Learn how test milestones improve release planning, track QA progress against deadlines, and give stakeholders clear go/no-go signals—plus how to set them up in QA Studio.
cover: ''
category: Best Practices
tags:
    - test-milestones
    - release-planning
    - qa-management
    - test-runs
    - software-release
author: QA Studio Team
slug: test-milestones-release-planning
published: true
---

Every release week, the same questions surface in standup: *Are we done testing? What's still open? Can we ship Friday?* Without a shared view of testing against the release calendar, answers depend on spreadsheets, Slack threads, and whoever checked the CI dashboard last.

**Test milestones** solve that. They tie your test execution to a named release goal—a version, sprint, or launch date—so everyone sees progress in one place instead of guessing.

This guide explains what test milestones are, how to use them in a release workflow, and how QA Studio makes milestone planning practical for growing teams.

## What Are Test Milestones in QA?

A **test milestone** is a time-bound testing goal tied to a product release or delivery checkpoint. Think of milestones as containers for the work that must finish before you ship:

- **Release 2.4 – Regression complete**
- **Sprint 18 – Smoke tests on staging**
- **Hotfix 2026-05-28 – Production verification**

Each milestone usually has:

| Attribute | Purpose |
| --------- | ------- |
| **Name** | Identifies the release or sprint (e.g., "v2.4.0") |
| **Due date** | Sets the deadline QA and engineering align on |
| **Status** | Tracks whether work is active, done, or archived |
| **Linked test runs** | Groups manual and automated execution under one goal |

Milestones are not a replacement for project management tools like Jira or Linear. They answer a narrower question: **for this release, how much testing is done, and what failed?**

## Why Release Planning Breaks Without Milestones

Teams that skip milestone tracking often rely on:

- **Flat test run lists** — Hard to tell which runs belong to "this release" vs. last week's experiment
- **CI-only visibility** — Green pipelines do not show manual exploratory work or blocked cases
- **Spreadsheet trackers** — Drift out of date the moment someone forgets to update a row

The result is predictable: engineering thinks QA signed off, QA thinks staging was never fully tested, and product learns about gaps on launch day.

Milestones fix the coordination layer by giving every test run a **release context**. When someone asks "status on 2.4?", you filter by milestone—not by memory.

## A Practical Release Testing Workflow

Here is a workflow that works for two-week sprints and fixed-date releases alike.

### 1. Define the milestone early

Create the milestone when scope is roughly locked—not the night before deploy. Name it after the release (`v2.4.0`, `2026-Q2 Launch`) and set a due date that leaves buffer for fixes and re-runs.

**Tip:** If your team uses feature flags, align the milestone due date with the flag flip or production deploy window, not the code freeze alone.

### 2. Plan test runs under the milestone

Break testing into logical runs instead of one giant "release test":

| Test run | Typical scope |
| -------- | ------------- |
| Smoke – Staging | Critical paths after deploy to staging |
| Regression – Staging | Full suite or priority-based subset |
| Exploratory – Staging | Time-boxed session for new features |
| Production verification | Post-deploy checks in production |

Link each run to the same milestone so pass rates roll up to one release view.

### 3. Combine manual and automated results

Modern releases rarely pass with automation alone. Manual cases, exploratory sessions, and Playwright suites should all report into runs attached to the milestone.

If you use [Playwright with QA Studio](/blog/playwright-integration-guide), CI jobs can create or update test runs automatically while testers execute remaining cases manually in the same milestone.

### 4. Use environments consistently

Pair milestones with **test environments** (Staging, QA, Production) so failures are interpreted correctly. A failure on staging before code freeze means something different than a failure on production after deploy.

Filter runs by environment when reviewing milestone progress—you do not want staging regressions mixed with post-release smoke checks.

### 5. Close the loop before ship

Before marking a milestone complete:

- [ ] All planned test runs are **Completed** (not left In Progress)
- [ ] Critical and high-priority failures are resolved or explicitly waived
- [ ] Open defects are tracked (e.g., via [Jira integration](/blog/jira-integration-streamline-bug-tracking) if your team uses it)
- [ ] Stakeholders have seen the milestone summary or dashboard

Archive or complete the milestone after release so historical data stays clean for the next cycle.

## Go / No-Go Signals Stakeholders Actually Understand

Executives and product managers rarely want raw test case counts. They want decision-ready signals:

- **Pass rate by milestone** — "We're at 94% for v2.4 regression"
- **Open critical failures** — "Two checkout tests still failing on staging"
- **Runs still in progress** — "Exploratory block starts tomorrow"
- **Due date risk** — "Milestone due in 3 days with 40% of runs incomplete"

Milestones make these answers queryable instead of improvised in a meeting.

## Setting Up Test Milestones in QA Studio

QA Studio treats milestones as first-class objects per project. Create them via the REST API (ideal for CI/CD) or through your team's existing project workflows, then attach test runs so results roll up to a single release.

### Create a milestone

Use the Milestones API for your project:

```bash
curl -X POST "https://your-domain.com/api/projects/{projectId}/milestones" \
  -H "Authorization: Bearer qas_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "v2.4.0 Release",
    "description": "Regression and smoke for May release",
    "dueDate": "2026-06-06T23:59:59.000Z",
    "status": "ACTIVE"
  }'
```

Set status to **ACTIVE** while the release is in flight, **COMPLETED** after ship, and **ARCHIVED** when you no longer need the milestone in active views.

### Link test runs to a milestone

When creating a test run, pass the milestone (and environment) in the request body:

```bash
curl -X POST "https://your-domain.com/api/projects/{projectId}/test-runs" \
  -H "Authorization: Bearer qas_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regression – Staging",
    "milestoneId": "abc",
    "environmentId": "xyz",
    "status": "IN_PROGRESS"
  }'
```

Playwright and other reporters can supply `milestoneId` when starting runs from CI so automated results land under the correct release.

### Review progress in the app

Open **Test Runs** for your project to see milestone names on each run. The project dashboard highlights recent runs with their linked milestone. Use milestone and environment metadata when reporting pass rates to stakeholders—everyone sees which release and environment a result belongs to.

### Get notified before deadlines

If your team uses [Slack notifications](/blog/slack-notifications-test-results), enable **Milestone Due** alerts. QA Studio sends a reminder when a milestone due date is approaching—helpful when multiple releases overlap.

## Listing and Updating Milestones via API

**List milestones for a project:**

```bash
curl "https://your-domain.com/api/projects/{projectId}/milestones" \
  -H "Authorization: Bearer qas_your_api_key"
```

When starting a test run from CI, pass `milestoneId` and `environmentId` so automated results land in the correct release bucket. See the [Reporter API documentation](/docs) for test run creation from Playwright or custom reporters.

## Milestone Planning Patterns That Scale

### Pattern: One milestone per release, many test runs

Best for most teams. One milestone (`v2.4.0`) holds smoke, regression, and verification runs. Simple to report and easy for stakeholders to follow.

### Pattern: Phase milestones within a release

Use separate milestones for **Code freeze QA**, **Staging sign-off**, and **Production verification** when releases span weeks or involve multiple deploy stages.

### Pattern: Sprint milestones for continuous delivery

Name milestones after sprints (`Sprint 42`) and link only the runs executed that sprint. Archive when the sprint ends; compare pass rates sprint-over-sprint for quality trends.

### Pattern: Hotfix milestones

Create a short-lived milestone with a tight due date for emergency fixes. Keeps hotfix testing out of your main release milestone and preserves audit history.

## Common Mistakes to Avoid

**Creating milestones too late.** If the milestone appears the day before deploy, runs from the prior week float without context. Add the milestone when planning starts.

**Never closing milestones.** Leaving everything `ACTIVE` makes dashboards noisy. Mark milestones `COMPLETED` after ship and `ARCHIVED` once you no longer reference them.

**One run for the entire release.** A single "Release testing" run hides which area failed and who owns the fix. Split by suite, environment, or day.

**Ignoring manual work.** Automated pass rates look great until someone realizes exploratory testing never happened. Plan explicit manual runs under the milestone.

**Mismatched due dates.** Align milestone due dates with the actual go/no-go meeting, not an optimistic engineer estimate.

## How Milestones Fit Your Broader QA Stack

Milestones work best alongside tools you already use:

- **Issue tracking** — File defects from failed tests with [Jira](/blog/jira-integration-streamline-bug-tracking)
- **CI/CD** — Push Playwright results into milestone-linked runs
- **Chat** — Alert the team in Slack when runs fail or milestones are due
- **2FA testing** — Use [shared authenticator tokens](/blog/totp-authenticator-tokens) for login flows in release regression

QA Studio keeps the **test execution record** authoritative; integrations carry outcomes to where your team already works.

## Start Planning Your Next Release

Test milestones turn "are we ready to ship?" from a subjective debate into a shared, filterable view of testing progress. Define the milestone early, attach every meaningful test run, pair environments consistently, and close the loop before production.

If you have not tried milestone-based release planning yet, [create a free QA Studio project](/signup) and set up your first milestone for the next release. Your future self—and everyone waiting on a go/no-go answer—will thank you.

Questions or feedback? Join our [Discord community](https://discord.gg/rw3UfdB9pN) or explore the [API docs](/docs) to automate milestones in your pipeline.
