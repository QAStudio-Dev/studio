# Slack Notification Improvements

## Changes Made

### 1. Enhanced Slack Block Kit Formatting

Updated `sendSlackNotification()` in [src/lib/server/integrations.ts](src/lib/server/integrations.ts) to use better Slack Block Kit components:

**Improvements:**

- Rich field formatting with markdown support (`*bold*` labels)
- Visual dividers between content and buttons
- Color-coded attachments for visual status indicators
- Emoji support in headers and button text
- Button styling (primary/danger based on status)
- Better button text with emoji: "🔍 View Details"

**Before:**

```javascript
{
  type: 'section',
  text: { type: 'mrkdwn', text: payload.message }
}
// Fields in attachments (legacy format)
```

**After:**

```javascript
{
  type: 'section',
  fields: [
    { type: 'mrkdwn', text: '*Field Name*\nValue' }
  ]
}
// Clean blocks with dividers and styled buttons
```

### 2. Fixed Button URLs

**Issue:** Buttons showed error message in Slack because URLs pointed to `localhost` instead of production domain.

**Fix:** Updated all notification functions to use proper base URL:

```typescript
const baseUrl = process.env.PUBLIC_BASE_URL || 'https://qastudio.dev';
```

**Files Updated:**

- [src/lib/server/integrations.ts](src/lib/server/integrations.ts) - All helper functions
- [src/routes/api/test-results/+server.ts](src/routes/api/test-results/+server.ts) - Test failure notifications

### 3. Improved Notification Content

#### Test Run Completed

**Before:**

```
Title: Test Run Completed: E2E Tests
Message: My Project\nTest run "E2E Tests" has completed.
```

**After:**

```
Title: ✅ Test Run Completed: E2E Tests (or ⚠️/❌ based on pass rate)
Message:
*Project:* My Project
*Status:* All tests passed (or X test(s) failed)

Fields:
📊 Pass Rate: 100%
📝 Total Tests: 50
✅ Passed: 50
❌ Failed: 0
```

#### Test Run Failed

**Before:**

```
Title: ⚠️ Test Run Failed: E2E Tests
Message: My Project\nTest run "E2E Tests" has failed with 5 failures.
```

**After:**

```
Title: ❌ Test Run Failed: E2E Tests
Message:
*Project:* My Project
*Failures:* 5 test(s) failed

⚠️ Immediate attention required

Fields:
🔴 Failed Tests: 5
```

#### Test Case Failed (Individual)

**Before:**

```
Title: ❌ Test Case Failed: Login should work
Message: Failed in test run "E2E Tests" (My Project)
```

**After:**

```
Title: ❌ Test Case Failed: Login should work
Message:
*Project:* My Project
*Test Run:* E2E Tests

⚠️ This test needs attention

Fields:
🧪 Test Case: Login should work
```

### 4. Visual Enhancements

- **Color-coded status**:
  - 🟢 Green (`#36a64f`) for 100% pass rate
  - 🟠 Orange (`#ffa500`) for 80-99% pass rate
  - 🔴 Red (`#ff0000`) for <80% pass rate or failures

- **Context-aware emojis**:
  - ✅ Success
  - ⚠️ Warning
  - ❌ Failure
  - 📊 Statistics
  - 📝 Count
  - 🧪 Test
  - 🔍 View/Inspect
  - 🔴 Critical
  - ⏰ Time-based

- **Button styling**:
  - Primary (blue) for successful test runs
  - Danger (red) for failed test runs

### 5. Environment Configuration

All notifications now properly respect the `PUBLIC_BASE_URL` environment variable:

**.env Configuration:**

```bash
PUBLIC_BASE_URL="https://qastudio.dev"
```

**Fallback Behavior:**
If `PUBLIC_BASE_URL` is not set, falls back to `https://qastudio.dev` (instead of localhost).

## Testing

To test the improved notifications:

1. Run Playwright tests with the QA Studio reporter:

```bash
npx playwright test
```

2. Check your Slack channel for notifications with:
   - Better formatting and visual hierarchy
   - Working "🔍 View Details" buttons that open the correct URL
   - Color-coded left border (green/orange/red)
   - Emoji-enhanced content
   - Clear, scannable information

## Interactive Button Fix

**Previous Error:**

> "This app is not configured to handle interactive responses. Please configure interactivity URL for your app under the app config page."

**Resolution:**
This error was caused by incorrect URLs (pointing to localhost). The buttons now use the production URL and will properly navigate to the test run details page.

**Note:** If you want to add interactive button responses (not just navigation), you would need to configure the Interactivity URL in your Slack app settings to point to an endpoint like `https://qastudio.dev/api/integrations/slack/interactions`.

## Future Enhancements

- [ ] Add notification preview in settings UI (let users test before enabling)
- [ ] Support for threaded messages (group related test failures)
- [ ] Add screenshots/attachments directly to Slack messages
- [ ] Customizable notification templates per team
- [ ] Summary notifications (daily/weekly digest)
- [ ] @mention specific team members for critical failures
