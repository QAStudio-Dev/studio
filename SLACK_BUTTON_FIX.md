# Fix: Slack Button Warning Icon

## Problem

When clicking the "🔍 View Details" button in Slack notifications, you see this error:

> ⚠️ This app is not configured to handle interactive responses. Please configure Interactivity URL for your app under the app config page.

## Solution

This happens because Slack requires an **Interactivity URL** to be configured for all apps that use interactive components (buttons, menus, etc.), even if the buttons just navigate to URLs.

### Step 1: Deploy the Interactivity Endpoint

The endpoint has already been created at:
- **Local**: `http://localhost:5173/api/integrations/slack/interactions`
- **Production**: `https://qastudio.dev/api/integrations/slack/interactions`

File location: [src/routes/api/integrations/slack/interactions/+server.ts](src/routes/api/integrations/slack/interactions/+server.ts)

### Step 2: Configure Your Slack App

1. Go to https://api.slack.com/apps
2. Select your "QA Studio" app (or whatever you named it)
3. In the left sidebar, click **"Interactivity & Shortcuts"**
4. Toggle **"Interactivity"** to **On**
5. Set the **Request URL** to:
   ```
   https://qastudio.dev/api/integrations/slack/interactions
   ```
6. Click **"Save Changes"**

### Step 3: Verify the Setup

Slack will immediately verify the endpoint by sending a test request. If everything is set up correctly, you'll see a green checkmark next to the URL.

### Step 4: Test the Fix

1. Run a new Playwright test to trigger a notification:
   ```bash
   npx playwright test
   ```

2. Wait for the Slack notification to arrive
3. Click the "🔍 View Details" button
4. You should now be navigated to the test run details page **without** seeing the warning icon

**Note:** Old messages will still show the error. Only new notifications sent after configuring the Interactivity URL will work correctly.

## What This Endpoint Does

The `/api/integrations/slack/interactions` endpoint:

- Receives callbacks when users interact with buttons in Slack
- Logs the interaction for debugging purposes
- Acknowledges the interaction by returning `{ ok: true }`
- For URL buttons (like our "View Details" button), no additional processing is needed
- Returns HTTP 200 status to Slack to prevent retries

## Troubleshooting

**Slack shows "Your URL didn't respond with the value of the challenge parameter"**
- The endpoint is not accessible from the internet
- Make sure you're using your production URL, not localhost
- Verify your app is deployed and running

**Button still shows warning icon**
- Make sure you configured the Interactivity URL in the correct Slack app
- Try clicking a button in a **new** notification (old messages won't be updated)
- Clear Slack cache: Settings → Advanced → Reset Cache

**Interactivity URL verification fails**
- Check that the endpoint is deployed and accessible
- Use `curl` to test: `curl -X POST https://qastudio.dev/api/integrations/slack/interactions`
- Check server logs for any errors

## Additional Resources

- [Slack Interactivity Documentation](https://api.slack.com/interactivity/handling)
- [Block Kit Interactive Components](https://api.slack.com/reference/block-kit/interactive-components)
- [QA Studio Integrations Guide](INTEGRATIONS.md)
