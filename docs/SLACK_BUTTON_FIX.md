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

### Step 2: Add Signing Secret to Environment Variables

1. Go to https://api.slack.com/apps
2. Select your "QA Studio" app
3. Click **"Basic Information"** in the left sidebar
4. Scroll to **"App Credentials"**
5. Copy the **"Signing Secret"** (click "Show" to reveal it)
6. Add it to your `.env` file:
    ```bash
    SLACK_SIGNING_SECRET=your_signing_secret_here
    ```
7. Also add it to **Vercel** environment variables:
    - Go to your Vercel project settings
    - Navigate to "Environment Variables"
    - Add `SLACK_SIGNING_SECRET` with the value
    - Redeploy your app

### Step 3: Configure Interactivity URL

1. Still in your Slack app settings, click **"Interactivity & Shortcuts"** in the left sidebar
2. Toggle **"Interactivity"** to **On**
3. Set the **Request URL** to:
    ```
    https://qastudio.dev/api/integrations/slack/interactions
    ```
4. Click **"Save Changes"**

### Step 4: Verify the Setup

Slack will immediately verify the endpoint by sending a test request. If everything is set up correctly, you'll see a green checkmark next to the URL.

### Step 5: Test the Fix

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
- Verify `SLACK_SIGNING_SECRET` is set in your environment variables
- Use `curl` to test: `curl -X POST https://qastudio.dev/api/integrations/slack/interactions`
- Check server logs for any errors

**403 Status Code Error**

- This means the `SLACK_SIGNING_SECRET` is not configured
- Make sure you've added it to both `.env` and Vercel environment variables
- Redeploy your app after adding the variable

## Additional Resources

- [Slack Interactivity Documentation](https://api.slack.com/interactivity/handling)
- [Block Kit Interactive Components](https://api.slack.com/reference/block-kit/interactive-components)
- [QA Studio Integrations Guide](INTEGRATIONS.md)
