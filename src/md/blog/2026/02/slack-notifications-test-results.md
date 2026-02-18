---
title: Slack Notifications - Keep Your Team Informed About Test Results
date: 2026-02-18T10:00:00.000Z
description: Set up Slack notifications in QA Studio to receive instant alerts when test runs complete, fail, or when milestones are due. A practical guide for teams who want testing visibility where they collaborate.
cover: ''
category: Integrations
tags:
    - slack
    - notifications
    - integrations
    - team-collaboration
    - ci-cd
author: QA Studio Team
slug: slack-notifications-test-results
published: true
---

Your team lives in Slack. Standups happen there. Bug discussions happen there. Deployment announcements happen there. So why should test results live somewhere else?

QA Studio's Slack integration brings your test results directly into the channels where your team already works. No more context switching. No more "did anyone check if the tests passed?" No more digging through dashboards to find the latest run.

## Why Slack Notifications Matter for QA Teams

Testing teams face a visibility problem. You run hundreds of tests across multiple environments, but the results often end up buried in:

- CI/CD logs that nobody scrolls through
- Separate dashboards that require another login
- Email reports that get lost in inboxes

**Slack notifications solve this:**

- **Instant visibility**: Team members see pass/fail status the moment it happens
- **Contextual awareness**: Notifications appear in the right channels (e.g., `#qa-team`, `#releases`)
- **One-click access**: "View Details" buttons take you straight to the failing test
- **Reduced friction**: No need to hunt for information—it comes to you

## What You'll Get Notified About

Once connected, QA Studio automatically sends notifications for:

| Event                  | When It Fires                                | What You See                                        |
| ---------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Test Run Completed** | When any test run finishes                   | Project name, pass rate, total/passed/failed counts |
| **Test Run Failed**    | When a run has one or more failures          | Project name, run name, failure count               |
| **Milestone Due**      | When a milestone is approaching its due date | Milestone name, due date                            |
| **Project Created**    | When a new project is added (optional)       | Project name and key                                |

Each notification includes a "View Details" button that links directly to the relevant page in QA Studio.

## Setting Up Slack in 5 Minutes

### Prerequisites

- A Slack workspace where you have permission to install apps
- A QA Studio team (integrations require team membership—Pro plan)
- Admin access to QA Studio settings

### Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name your app (e.g., "QA Studio" or "QA Studio - Your Team")
4. Select your workspace
5. Click **Create App**

### Step 2: Configure OAuth Scopes

In your app settings, go to **OAuth & Permissions** and add these Bot Token Scopes:

- `incoming-webhook` - Post messages to channels
- `channels:read` - View basic channel info
- `groups:read` - View private channel info

### Step 3: Add Redirect URLs

Under **Redirect URLs** in OAuth & Permissions, add:

- **Production**: `https://qastudio.dev/api/integrations/slack/callback`
- **Development**: `http://localhost:5173/api/integrations/slack/callback` (if self-hosting)

### Step 4: Enable Incoming Webhooks

1. Go to **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to **On**

### Step 5: Configure Interactivity (Important!)

This prevents the warning icon when users click "View Details" in notifications:

1. Go to **Interactivity & Shortcuts**
2. Toggle **Interactivity** to **On**
3. Set the **Request URL** to: `https://qastudio.dev/api/integrations/slack/interactions`
4. Click **Save Changes**

### Step 6: Connect in QA Studio

1. Log in to QA Studio
2. Go to **Settings** → **Integrations**
3. Click **Connect Slack**
4. Authorize the app and select the channel for notifications
5. You're done!

## Choosing the Right Channel

Where should notifications go? It depends on your team structure:

**Option A: Dedicated QA channel** (`#qa-team`, `#testing`)

- Best for: QA-focused teams who want all test-related updates in one place
- Pros: Clean separation, easy to find
- Cons: Developers might miss failures if they don't watch the channel

**Option B: Release/Deploy channel** (`#releases`, `#deployments`)

- Best for: Teams that tie test results to deployment decisions
- Pros: Right context for "can we ship?" discussions
- Cons: Can get noisy if you run many test suites

**Option C: Project-specific channels** (`#project-alpha`, `#mobile-app`)

- Best for: Large orgs with separate teams per product
- Requires: Multiple Slack integrations (one per channel) or routing logic

**Recommendation**: Start with a dedicated QA channel. You can always add more integrations or adjust later.

## What a Notification Looks Like

When a test run completes, your Slack channel will show something like:

```text
✅ Test Run Completed
Project: E-Commerce Platform
Run: Sprint 45 Regression
Pass Rate: 94% (47/50 passed, 3 failed)
Duration: 12m 34s
[View Details]
```

When tests fail:

```text
❌ Test Run Failed
Project: E-Commerce Platform
Run: Sprint 45 Regression
3 test(s) failed
[View Details]
```

The **View Details** button takes you directly to the test run in QA Studio, where you can see which tests failed, error messages, screenshots, and stack traces.

## Self-Hosted QA Studio?

If you're running QA Studio on your own infrastructure, you'll need to configure Slack app credentials as environment variables:

```bash
PUBLIC_SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
PUBLIC_BASE_URL=https://your-qa-studio-domain.com
```

Update the redirect URLs and interactivity URL in your Slack app to point to your domain instead of `qastudio.dev`.

See the [Integrations documentation](https://github.com/QAStudio-Dev/studio/blob/main/docs/INTEGRATIONS.md) for the full self-hosted setup guide.

## Troubleshooting

### "redirect_uri_mismatch" during OAuth

The redirect URI in your Slack app must match **exactly**—including protocol (https), domain, and path. No trailing slashes.

### Not receiving notifications

1. Check that the integration shows **ACTIVE** in Settings → Integrations
2. Verify the Slack app has permission to post in the selected channel (you may need to invite the app using `/invite` and selecting your QA Studio app from the autocomplete picker)
3. Ensure test runs are associated with a team project (personal projects don't trigger team notifications)

### Warning icon when clicking "View Details"

The Interactivity URL isn't configured. Go to your Slack app → **Interactivity & Shortcuts** → set Request URL to `https://qastudio.dev/api/integrations/slack/interactions`.

### Integration shows "ERROR" status

The access token may have expired. Remove the integration and reconnect—it only takes a minute.

## Combine with Other Integrations

Slack works alongside QA Studio's other integrations:

- **Playwright Reporter**: Tests run in CI, results flow to QA Studio, Slack notifies the team
- **MCP Server**: Manage test runs from Claude, get Slack alerts when they complete
- **Jira Integration**: Create bugs from failed tests, discuss them in Slack

The full workflow: **CI runs tests → QA Studio captures results → Slack alerts team → Jira tracks bugs**. All connected.

## Get Started

1. **Create your Slack app** at [api.slack.com/apps](https://api.slack.com/apps)
2. **Connect in QA Studio** at Settings → Integrations
3. **Run a test** and watch the notification appear

Your team will never wonder "did the tests pass?" again—they'll know, instantly, in the channel where they're already working.

Questions? Join our [Discord community](https://discord.gg/rw3UfdB9pN) or check out the [QA Studio documentation](/docs).

Happy testing! 🚀
