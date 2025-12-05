# Email Setup Guide

QA Studio uses **Nodemailer** with SMTP to send transactional emails.

## Quick Setup with Google Workspace

Since you have a Google Workspace account (`ben@qastudio.dev`), follow these steps:

### 1. Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already enabled

### 2. Generate an App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "QA Studio" as the name
5. Click **Generate**
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
# Required: Your email credentials
EMAIL_USER=ben@qastudio.dev
EMAIL_PASSWORD=your_16_char_app_password_here  # From step 2

# Optional: Email recipients
SALES_EMAIL=ben@qastudio.dev

# Optional: Public URL (for email links, defaults to https://qastudio.dev)
PUBLIC_APP_URL=https://qastudio.dev

# Optional: SMTP settings (defaults to Gmail if not set)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Optional: Custom display name for emails
# If not set, uses EMAIL_USER as the from address
# EMAIL_FROM=QA Studio <ben@qastudio.dev>
```

**Note**: The only required variables are `EMAIL_USER` and `EMAIL_PASSWORD`. Everything else has sensible defaults!

### 4. Test Your Configuration

Run the test script to verify everything works:

```bash
npx tsx scripts/test-email.ts ben@qastudio.dev
```

You should see:
```
✓ Email sent successfully!
Message ID: <some-id>

Check your inbox at: ben@qastudio.dev
```

## Email Functions Available

The email service includes these functions:

### 1. Send Team Invitation
```typescript
import { sendInvitationEmail } from '$lib/server/email';

await sendInvitationEmail({
  to: 'user@example.com',
  teamName: 'Acme QA',
  inviterName: 'Ben',
  role: 'TESTER',
  inviteUrl: 'https://qastudio.dev/invite/abc123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

### 2. Send Invitation Accepted Notification
```typescript
import { sendInvitationAcceptedEmail } from '$lib/server/email';

await sendInvitationAcceptedEmail(
  'admin@example.com',
  'Acme QA',
  'John Doe',
  'john@example.com'
);
```

### 3. Send Enterprise Inquiry Notification
```typescript
import { sendEnterpriseInquiryEmail } from '$lib/server/email';

await sendEnterpriseInquiryEmail({
  companyName: 'Acme Corp',
  contactName: 'Jane Smith',
  email: 'jane@acme.com',
  phone: '+1-555-0123',
  estimatedSeats: 50,
  requirements: 'Need SSO and custom SLA',
  inquiryId: 'inquiry_123'
});
```

This email is automatically sent to `SALES_EMAIL` (defaults to `ben@qastudio.dev`) when someone fills out the enterprise contact form.

### 4. Send Welcome Email
```typescript
import { sendWelcomeEmail } from '$lib/server/email';

await sendWelcomeEmail({
  to: 'user@example.com',
  name: 'Jane Smith',  // optional
  teamName: 'Acme QA'   // optional
});
```

This email is automatically sent when a new user signs up.

### 5. Send Password Reset Email
```typescript
import { sendPasswordResetEmail } from '$lib/server/email';

await sendPasswordResetEmail({
  to: 'user@example.com',
  resetUrl: 'https://qastudio.dev/reset-password?token=abc123',
  expiresInMinutes: 60  // optional, defaults to 60
});
```

This email is automatically sent when a user requests a password reset.

### 6. Send Custom Email
```typescript
// Import the internal sendEmail function (not exported by default)
import { sendEmail } from '$lib/server/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your Subject',
  text: 'Plain text version',
  html: '<h1>HTML version</h1>'
});
```

## Configuration Details

### EMAIL_FROM vs EMAIL_USER

- **EMAIL_USER**: Your actual email account for SMTP authentication (required)
- **EMAIL_FROM**: The "from" address shown to recipients (optional)

By default, `EMAIL_FROM` uses the same value as `EMAIL_USER`. You only need to set `EMAIL_FROM` if you want:
1. A custom display name: `EMAIL_FROM=QA Studio <ben@qastudio.dev>`
2. A different sending address (must be an alias in Google Workspace)

### Minimal Configuration

You only need two environment variables to get started:

```bash
EMAIL_USER=ben@qastudio.dev
EMAIL_PASSWORD=your_app_password
```

Everything else has defaults:
- `EMAIL_HOST` → `smtp.gmail.com`
- `EMAIL_PORT` → `587`
- `EMAIL_SECURE` → `false`
- `EMAIL_FROM` → Uses `EMAIL_USER`
- `SALES_EMAIL` → `ben@qastudio.dev` (for enterprise inquiries)
- `PUBLIC_APP_URL` → `https://qastudio.dev` (for email links)

## Troubleshooting

### "Invalid login" error
- Make sure you're using the **App Password**, not your regular Google password
- Verify 2FA is enabled on your account
- Double-check the EMAIL_USER matches your email address

### "Connection timeout" error
- Check your firewall isn't blocking port 587
- Try using port 465 with `EMAIL_SECURE=true` instead

### Emails not being sent in production
- Make sure EMAIL_USER and EMAIL_PASSWORD are set in your production environment
- Check the logs for any error messages
- Verify the PUBLIC_APP_URL is set to your production domain

### Gmail daily sending limits
- Google Workspace accounts have a daily limit of 2,000 emails
- If you need more, consider using a transactional email service like:
  - Resend (easiest)
  - SendGrid
  - Postmark
  - AWS SES

## Security Notes

- ✅ **Do**: Keep your App Password secret
- ✅ **Do**: Use environment variables (never commit passwords)
- ✅ **Do**: Rotate App Passwords periodically
- ❌ **Don't**: Share your App Password
- ❌ **Don't**: Use your regular Google password
- ❌ **Don't**: Commit .env files to version control

## Production Considerations

For production, consider:

1. **Rate Limiting**: Implement rate limiting for email-sending endpoints
2. **Retry Logic**: Add retry logic for failed email sends
3. **Email Queue**: Use a queue (e.g., BullMQ) for high-volume sending
4. **Monitoring**: Log all email sends and track delivery rates
5. **Alternative Service**: Consider Resend or SendGrid for better deliverability

## Alternative: Using Resend

If you want to switch to Resend later:

1. Sign up at https://resend.com
2. Verify your domain (qastudio.dev)
3. Install: `npm install resend`
4. Replace the SMTP configuration with:
```bash
RESEND_API_KEY=re_your_api_key_here
```

5. Update `src/lib/server/email.ts` to use the Resend SDK instead of nodemailer

---

Need help? Contact ben@qastudio.dev
