# QA Studio Integrations

This document explains how to set up and use integrations with QA Studio.

## Overview

QA Studio supports integrations with popular tools to send notifications about test runs, failures, and milestones. Currently supported:

- **Slack** - Send notifications to Slack channels
- **Discord** (Coming soon)
- **Microsoft Teams** (Coming soon)
- **GitHub** (Coming soon)
- **Jira** (Coming soon)
- **Generic Webhooks** (Coming soon)

## Slack Integration

### Prerequisites

1. A Slack workspace where you have permission to install apps
2. A QA Studio team (integrations require team membership)

### Setup Instructions

#### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app "QA Studio" (or your preferred name)
4. Select your workspace
5. Click "Create App"

#### 2. Configure OAuth & Permissions

1. In your app settings, go to "OAuth & Permissions"
2. Under "Scopes" → "Bot Token Scopes", add:
   - `incoming-webhook` - Post messages to channels
   - `chat:write` - Send messages as the app
   - `channels:read` - View basic channel info
   - `groups:read` - View private channel info
   - `im:read` - View direct message info
   - `mpim:read` - View group direct message info

3. Under "Redirect URLs", add:
   - Development: `http://localhost:5173/api/integrations/slack/callback`
   - Production: `https://yourdomain.com/api/integrations/slack/callback`

#### 3. Enable Incoming Webhooks

1. Go to "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to **On**

#### 4. Configure Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Slack Integration
PUBLIC_SLACK_CLIENT_ID=your_client_id_here  # PUBLIC_ prefix required for browser access
SLACK_CLIENT_SECRET=your_client_secret_here  # No prefix - server-only
PUBLIC_BASE_URL=https://yourdomain.com       # Used for notification links
```

**Important for Vercel/Production:**
- `PUBLIC_SLACK_CLIENT_ID` - Must have `PUBLIC_` prefix to be accessible in the browser
- `SLACK_CLIENT_SECRET` - Should NOT have `PUBLIC_` prefix (server-only, keep secret!)
- In Vercel, add these as environment variables in your project settings

You can find these values in your Slack app settings:
- **Client ID**: Under "Basic Information" → "App Credentials"
- **Client Secret**: Under "Basic Information" → "App Credentials"

#### 5. Install the Integration

1. Log in to QA Studio
2. Go to Settings → Integrations
3. Click "Connect Slack"
4. Select the channel where you want notifications
5. Click "Allow"

You'll be redirected back to QA Studio, and the integration will be active.

### Using the Slack Integration

Once connected, QA Studio will automatically send notifications for:

- ✅ **Test Run Completed** - When a test run finishes
- ❌ **Test Run Failed** - When a test run has failures
- 📅 **Milestone Due** - When a milestone is approaching its due date
- 🆕 **Project Created** - When a new project is created (optional)

### Customizing Notifications

You can configure which notifications to receive by editing the integration settings (coming soon in UI).

### Troubleshooting

**OAuth Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in your Slack app matches exactly: `https://yourdomain.com/api/integrations/slack/callback`
- Check that you're using HTTPS in production

**Integration shows "ERROR" status**
- The access token may have expired or been revoked
- Try removing and reconnecting the integration

**Not receiving notifications**
- Check that the integration status is "ACTIVE" in Settings → Integrations
- Verify that notifications are enabled for your team
- Check the Slack app has permission to post in the selected channel

## API Usage

You can trigger notifications programmatically using the integration service:

```typescript
import { sendNotification, notifyTestRunCompleted } from '$lib/server/integrations';

// Send a custom notification
await sendNotification(teamId, {
  event: 'TEST_RUN_COMPLETED',
  title: 'Test Run Complete',
  message: 'Your test run has finished!',
  url: 'https://yourdomain.com/test-runs/123',
  color: '#36a64f',
  fields: [
    { name: 'Pass Rate', value: '95%', inline: true },
    { name: 'Total Tests', value: '100', inline: true }
  ]
});

// Use helper functions
await notifyTestRunCompleted(teamId, {
  id: 'run_123',
  name: 'Smoke Tests',
  projectName: 'My Project',
  passRate: 95,
  total: 100,
  passed: 95,
  failed: 5
});
```

## Webhook Events (For Slack App)

If you want to receive events FROM Slack (like slash commands), configure:

1. Go to "Event Subscriptions" in your Slack app
2. Enable Events
3. Set Request URL: `https://yourdomain.com/api/integrations/slack/webhook`
4. Subscribe to bot events (if needed)

## Database Schema

Integrations are stored in the database:

```prisma
model Integration {
  id              String            @id @default(cuid())
  teamId          String
  type            IntegrationType   // SLACK, DISCORD, etc.
  name            String
  status          IntegrationStatus // ACTIVE, INACTIVE, ERROR, EXPIRED
  accessToken     String?
  refreshToken    String?
  config          Json?
  installedBy     String
  lastSyncedAt    DateTime?
  createdAt       DateTime
  updatedAt       DateTime
}

model IntegrationNotification {
  id            String              @id
  integrationId String
  eventType     NotificationEvent
  status        NotificationStatus
  payload       Json
  response      Json?
  error         String?
  attempts      Int
  sentAt        DateTime?
  createdAt     DateTime
}
```

## Security Notes

- Access tokens are stored in the database (consider encrypting in production)
- Webhook signatures should be verified (implement in webhook endpoint)
- Use HTTPS in production for OAuth callbacks
- Rotate Slack app credentials regularly
- Review and minimize OAuth scopes

## Future Enhancements

- [ ] Notification preferences UI
- [ ] Channel selection per event type
- [ ] Retry failed notifications
- [ ] Notification templates
- [ ] Rate limiting
- [ ] Analytics dashboard
- [ ] Multiple Slack workspaces per team
