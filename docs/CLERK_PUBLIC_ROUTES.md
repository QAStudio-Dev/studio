# Clerk Public Routes Configuration

## Overview

Some API endpoints need to be publicly accessible because they're called by external services (like Slack) or use API key authentication instead of user session authentication.

## Configuration

**File**: [src/hooks.server.ts](src/hooks.server.ts)

```typescript
// Exact matches
const publicApiRoutes = [
  '/api/integrations/slack/interactions',  // Slack button callbacks
  '/api/integrations/slack/webhook',       // Slack events
  '/api/test-results'                      // Playwright reporter (uses API key auth)
];

// Regex pattern matches
if (/^\/api\/test-runs\/[^/]+\/complete$/.test(pathname)) {
  // Test run completion (uses API key auth)
}
```

**Important**: Only **API routes** (starting with `/api/`) are made public. Page routes like `/test-runs` still require Clerk authentication.

## Public Routes

### Slack Integration Routes

**`/api/integrations/slack/interactions`**
- Called by Slack when users click buttons in notifications
- Authenticates via Slack signing secret verification
- Does not require user session

**`/api/integrations/slack/webhook`**
- Receives events from Slack (messages, reactions, etc.)
- Handles URL verification challenge
- Does not require user session

### Test Reporting Routes

**`/api/test-results`**
- Called by Playwright reporter to submit test results
- Authenticates via `QA_STUDIO_API_KEY` header
- Uses `requireApiAuth()` helper

**`/api/test-runs/(.*)/complete`**
- Called by Playwright reporter to mark test run as complete
- Authenticates via `QA_STUDIO_API_KEY` header
- Uses `requireApiAuth()` helper

## Security Notes

1. **Slack routes** verify requests using cryptographic signatures (HMAC-SHA256)
2. **Test reporting routes** require valid API key in `x-api-key` header
3. Public routes don't mean "no authentication" - they just use different auth methods
4. All routes still validate incoming requests, just not via user sessions

## Troubleshooting

**403 Forbidden on Slack interactions:**
- Verify route is in `publicRoutes` array
- Check Clerk middleware configuration
- Ensure `SLACK_SIGNING_SECRET` is set

**401 Unauthorized on test results:**
- Verify `QA_STUDIO_API_KEY` is set correctly
- Check API key is being sent in headers
- Ensure route is in `publicRoutes` array

## Adding New Public Routes

If you add new webhook or API key authenticated endpoints:

1. Add the route pattern to `publicRoutes` array in `hooks.server.ts`
2. Implement proper authentication in the endpoint handler
3. Use regex patterns for dynamic routes: `/api/foo/(.*)/bar`
4. Document the route in this file

## Related Files

- [src/lib/server/api-auth.ts](src/lib/server/api-auth.ts) - API key authentication
- [src/routes/api/integrations/slack/interactions/+server.ts](src/routes/api/integrations/slack/interactions/+server.ts) - Slack signature verification
