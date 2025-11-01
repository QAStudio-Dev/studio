# Clerk Invitations Setup Guide

## Overview

QA Studio uses Clerk's built-in invitation system to send team invitation emails. This guide will help you configure Clerk to send branded invitation emails.

## Why Clerk Invitations?

- ✅ **No additional email service needed** - Included with Clerk
- ✅ **Works with all auth methods** - OAuth (Google, Microsoft), email/password, SSO
- ✅ **Customizable templates** - Brand the emails in Clerk dashboard
- ✅ **Automatic tracking** - Clerk tracks invitation status
- ✅ **Free on all plans** - No extra costs

## Setup Steps

### 1. Enable Invitations in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **User & Authentication** → **Email, Phone, Username**
4. Scroll to **Invitation mode**
5. Toggle **Enable invitations** to ON

### 2. Configure Email Settings

1. In Clerk Dashboard, go to **Customization** → **Emails**
2. Find the **Invitation** email template
3. Click **Edit** to customize:

   **Subject Line:**
   ```
   You've been invited to join {{application.name}}
   ```

   **Email Body** (example):
   ```html
   Hi there,

   You've been invited to join {{invitation.team_name}} on QA Studio!

   Role: {{invitation.role}}

   Click the button below to accept your invitation:

   {{invitation.url}}

   This invitation will expire in 7 days.

   Best regards,
   The QA Studio Team
   ```

4. You can use these variables:
   - `{{application.name}}` - Your app name (QA Studio)
   - `{{invitation.email_address}}` - Invitee's email
   - `{{invitation.url}}` - The invitation acceptance URL
   - Custom metadata (accessed via publicMetadata):
     - `{{invitation.team_name}}`
     - `{{invitation.role}}`

### 3. Customize Email Branding

1. Go to **Customization** → **Email**
2. Upload your logo
3. Set brand colors
4. Customize the email header/footer

**Recommended Settings:**
- **From Name**: QA Studio
- **Logo**: Upload `/static/full.svg`
- **Primary Color**: `#667eea` (matches your brand)
- **Font**: System default or custom

### 4. Set Up Custom Email Domain (Optional)

For better deliverability and branding, use a custom email domain:

1. Go to **Email & SMS** → **Email Settings**
2. Click **Add custom email domain**
3. Add your domain (e.g., `qastudio.dev`)
4. Follow DNS verification steps:
   ```
   Add these DNS records to your domain:

   TXT record:
   Name: @
   Value: [Clerk verification code]

   MX records:
   Priority 10: mx1.clerk.com
   Priority 20: mx2.clerk.com

   SPF record (add to existing TXT):
   v=spf1 include:_spf.clerk.com ~all
   ```

5. Wait for verification (can take up to 48 hours)
6. Once verified, invitations will come from `invitations@qastudio.dev`

### 5. Test Invitations

**Development Testing:**

1. Go to your team page: `http://localhost:5173/teams/[teamId]/invite`
2. Enter a test email address
3. Check the email inbox
4. Click the invitation link
5. Verify acceptance flow works

**Production Testing:**

1. Deploy to production
2. Send a real invitation
3. Verify email delivery
4. Test acceptance with both:
   - New user (sign up flow)
   - Existing user (sign in flow)
   - OAuth (Google/Microsoft)

### 6. Monitor Invitation Status

In Clerk Dashboard:

1. Go to **Users** → **Invitations**
2. View all sent invitations
3. Check status: Pending, Accepted, Expired
4. Resend invitations if needed

## How It Works

### Invitation Flow

```
1. Admin sends invitation via UI
   ↓
2. Backend creates TeamInvitation in DB
   ↓
3. Backend calls Clerk API to send email
   ↓
4. Clerk sends branded email to invitee
   ↓
5. Invitee clicks link → redirected to /invitations/[token]
   ↓
6. Invitee signs in (or signs up) via Clerk
   ↓
7. Backend verifies email matches invitation
   ↓
8. User added to team with assigned role
```

### Email Variables Available

When you create an invitation, we pass this metadata to Clerk:

```typescript
await clerkClient.invitations.createInvitation({
  emailAddress: 'user@example.com',
  redirectUrl: 'https://qastudio.dev/invitations/[token]',
  publicMetadata: {
    teamId: 'clxxx...',
    teamName: 'Engineering Team',
    role: 'TESTER',
    invitationId: 'clxxx...'
  }
});
```

You can access these in email templates as:
- `{{invitation.team_name}}`
- `{{invitation.role}}`

### Authentication Methods Supported

Invitees can sign in with any method enabled in Clerk:

- **Email/Password**: Traditional signup
- **Google OAuth**: "Sign in with Google"
- **Microsoft OAuth**: "Sign in with Microsoft"
- **GitHub OAuth**: "Sign in with GitHub"
- **SSO/SAML**: Enterprise single sign-on

**Important**: Email address must match across all methods. Clerk handles this automatically.

## Email Template Best Practices

### Subject Lines

Good:
- ✅ "Join [Team Name] on QA Studio"
- ✅ "You've been invited to [Team Name]"
- ✅ "[Inviter Name] invited you to QA Studio"

Avoid:
- ❌ Generic: "Invitation"
- ❌ Too long: "You have received an invitation to join the QA Studio test management platform..."

### Body Content

Include:
- ✅ Who invited them (if available)
- ✅ Team name prominently
- ✅ What role they'll have
- ✅ Clear call-to-action button
- ✅ Expiration notice (7 days)
- ✅ What QA Studio is (brief)

Example template:
```html
<p>Hi there,</p>

<p><strong>{{inviter_name}}</strong> has invited you to join <strong>{{team_name}}</strong> on QA Studio.</p>

<div class="role-badge">
  Your Role: {{role}}
</div>

<p>QA Studio is a modern test management platform that helps teams organize, execute, and track testing activities.</p>

<a href="{{invitation_url}}" class="cta-button">Accept Invitation</a>

<p class="fine-print">
  This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
</p>
```

## Environment Variables

Make sure these are set:

```bash
# .env or .env.local
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx...
CLERK_SECRET_KEY=sk_test_xxx...
PUBLIC_BASE_URL=https://qastudio.dev  # Used for invitation URLs
```

## Troubleshooting

### Emails Not Sending

**Check:**
1. Invitations enabled in Clerk dashboard?
2. `CLERK_SECRET_KEY` set correctly?
3. Email address valid?
4. Check Clerk dashboard logs: **Logs** → **API Requests**

**Common Errors:**
```
"Invitations are not enabled"
→ Enable in Clerk dashboard settings

"Invalid email address"
→ Check email format validation

"Rate limit exceeded"
→ Clerk has rate limits; wait and retry
```

### Emails Going to Spam

**Solutions:**
1. Set up custom email domain (best solution)
2. Add SPF/DKIM records for your domain
3. Ensure email content isn't spammy:
   - Don't use all caps in subject
   - Include unsubscribe link
   - Use proper HTML structure

### User Can't Accept Invitation

**Check:**
1. Did they sign in with the correct email?
2. Is invitation expired (7 days)?
3. Is invitation already accepted?
4. Check browser console for errors

**Debug:**
- Open `/invitations/[token]` page
- Check server logs for error messages
- Verify invitation status in database

### Email Customization Not Showing

**Solutions:**
1. Clear Clerk cache: Wait 5 minutes after changes
2. Test in incognito mode
3. Check correct email template selected
4. Verify variables syntax: `{{variable_name}}`

## Rate Limits

Clerk imposes rate limits on API calls:

- **Development**: 20 requests per 10 seconds
- **Production (Free)**: 50 requests per 10 seconds
- **Production (Pro)**: 500 requests per 10 seconds

For bulk invitations, implement rate limiting:

```typescript
// Example: Send invitations with delay
for (const email of emails) {
  await sendInvitation(email);
  await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
}
```

## Security Considerations

### Invitation Token Security

- Tokens are 32-byte random strings (cryptographically secure)
- Stored hashed in database
- Expire after 7 days automatically
- One-time use only

### Email Verification

- Clerk verifies all email addresses
- OAuth providers (Google, Microsoft) pre-verify emails
- Email/password signup requires verification
- User must sign in with exact email that received invitation

### Preventing Abuse

Built-in protections:
- Only admins/managers can send invitations
- Seat limits enforced before invitation
- Can't invite same email twice (pending check)
- Rate limiting on API calls

## Costs

Clerk invitations are **free on all plans**:
- ✅ Free Plan: Included
- ✅ Pro Plan: Included
- ✅ Enterprise: Included

No per-email charges, unlike:
- SendGrid: $0.0001/email (after free tier)
- Resend: Free for 3,000/month
- AWS SES: $0.10 per 1,000 emails

## Alternative: Manual Invite Links

If you don't want to use Clerk emails (e.g., testing), the system still works:

1. Admin sends invitation
2. Backend returns `inviteUrl` in response
3. Admin copies link and shares manually (Slack, etc.)
4. Invitee clicks link and accepts

The invitation link works independently of email delivery.

## Next Steps

1. ✅ Enable invitations in Clerk dashboard
2. ✅ Customize email template with your branding
3. ✅ Test invitation flow in development
4. ✅ (Optional) Set up custom email domain
5. ✅ Deploy to production and test real invitations

---

## Quick Reference

**Clerk Dashboard Sections:**
- Enable Invitations: User & Authentication → Settings
- Email Templates: Customization → Emails
- Custom Domain: Email & SMS → Email Settings
- Monitor Status: Users → Invitations
- API Logs: Logs → API Requests

**Documentation:**
- [Clerk Invitations Docs](https://clerk.com/docs/authentication/invitations)
- [Email Customization](https://clerk.com/docs/customization/email)
- [Custom Domains](https://clerk.com/docs/email-sms/custom-domains)

**Support:**
- Clerk Support: [support@clerk.com](mailto:support@clerk.com)
- QA Studio Discord: https://discord.gg/rw3UfdB9pN
