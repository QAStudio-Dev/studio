# Team Invitations Guide

## Overview

QA Studio's team invitation system allows team admins and managers to invite new members to join their teams with specific roles. The system includes:

- Email-based invitations with unique tokens
- Role assignment (Admin, Manager, Tester, Viewer)
- Automatic seat limit enforcement tied to billing
- 7-day expiration for security
- Accept/decline workflow
- Pending invitation management

## How It Works

### 1. Invitation Flow

```
Admin/Manager → Send Invitation → User Receives Link → User Accepts → Added to Team
                                                      ↓
                                                    Declines → Invitation Declined
```

### 2. Seat Management & Billing

Team invitations are tied to your subscription plan:

- **Free Tier**: 1 member maximum (team creator only)
- **Pro Tier**: Number of seats purchased (e.g., 5, 10, 25 seats)

When inviting members:

- System checks available seats before allowing invitation
- Invitation can only be accepted if seats are still available
- If seats are full, team admin must upgrade or add more seats

## For Team Admins/Managers

### Sending Invitations

1. Navigate to your team page (`/teams/[teamId]`)
2. Click **"Invite Members"** button
3. Enter the invitee's email address
4. Select their role:
   - **Viewer**: Read-only access to projects and results
   - **Tester**: Create and execute tests, view team projects
   - **Manager**: Manage projects and teams, invite members
   - **Admin**: Full system access (use sparingly)
5. Click **"Send Invitation"**

The invitation will:

- Be saved in the database with a unique token
- Expire in 7 days for security
- Return an invitation link (for development/testing)
- Soon: Send an email notification (coming soon)

### Managing Pending Invitations

On the invite page (`/teams/[teamId]/invite`), you can:

- View all pending invitations
- See when they were sent and when they expire
- Cancel invitations before they're accepted
- See how many seats are available

### Seat Limits

If you reach your seat limit:

1. **Free Tier**: Upgrade to Pro to add team members
2. **Pro Tier**:
   - Go to team page
   - Click "Manage Billing"
   - Update your subscription to add more seats
   - Stripe will prorate the charges

## For Invitees

### Receiving an Invitation

When invited to a team, you'll receive an invitation link (email notifications coming soon):

```
https://qastudio.dev/invitations/[unique-token]
```

### Accepting an Invitation

1. Click the invitation link
2. **Sign in** if you have an account, or **sign up** if you're new
3. Review the team details:
   - Team name and description
   - Your assigned role
   - Current team members
   - What permissions you'll have
4. Click **"Accept Invitation"**
5. You'll be redirected to the team page

**Important Notes:**

- You must sign in with the email address the invitation was sent to
- You cannot be a member of multiple teams (one team per user)
- If you're already in a team, you must leave it first
- Invitations expire after 7 days

### Declining an Invitation

If you don't want to join the team:

1. Open the invitation link
2. Click **"Decline"**
3. Confirm your decision
4. The invitation will be marked as declined

## API Reference

### Send Invitation

```typescript
POST /api/teams/[teamId]/members/invite

Headers:
  Content-Type: application/json

Body:
{
  "email": "colleague@company.com",
  "role": "TESTER" // ADMIN, MANAGER, TESTER, or VIEWER
}

Response (200):
{
  "success": true,
  "invitation": {
    "id": "clxxx...",
    "email": "colleague@company.com",
    "role": "TESTER",
    "inviteUrl": "https://qastudio.dev/invitations/abc123...",
    "expiresAt": "2025-11-08T10:00:00.000Z"
  }
}

Errors:
- 400: Invalid email, role, or user already invited
- 402: Team has reached seat limit
- 403: Not authorized (must be ADMIN or MANAGER)
```

### List Pending Invitations

```typescript
GET /api/teams/[teamId]/members/invite

Response (200):
{
  "invitations": [
    {
      "id": "clxxx...",
      "email": "colleague@company.com",
      "role": "TESTER",
      "createdAt": "2025-11-01T10:00:00.000Z",
      "expiresAt": "2025-11-08T10:00:00.000Z",
      "status": "PENDING"
    }
  ]
}
```

### Cancel Invitation

```typescript
DELETE /api/teams/[teamId]/members/invite

Body:
{
  "invitationId": "clxxx..."
}

Response (200):
{
  "success": true
}
```

### Get Invitation Details

```typescript
GET /api/invitations/[token]

Response (200):
{
  "invitation": {
    "id": "clxxx...",
    "email": "colleague@company.com",
    "role": "TESTER",
    "team": {
      "id": "clxxx...",
      "name": "Engineering Team",
      "description": "QA team for product testing",
      "members": [...]
    },
    "expiresAt": "2025-11-08T10:00:00.000Z"
  }
}

Errors:
- 404: Invitation not found
- 410: Invitation expired
- 400: Invitation already accepted/declined
```

### Accept Invitation

```typescript
POST /api/invitations/[token]/accept

Response (200):
{
  "success": true,
  "team": {
    "id": "clxxx...",
    "name": "Engineering Team"
  }
}

Errors:
- 403: Email mismatch (must sign in with invited email)
- 400: User already in a team, or seat limit reached
- 410: Invitation expired
```

### Decline Invitation

```typescript
PATCH /api/invitations/[token]/decline

Response (200):
{
  "success": true
}
```

## Database Schema

```prisma
model TeamInvitation {
  id          String           @id @default(cuid())
  teamId      String
  email       String           // Invited user's email
  role        UserRole         @default(TESTER)
  status      InvitationStatus @default(PENDING)
  invitedBy   String           // User ID who sent invitation
  token       String           @unique
  expiresAt   DateTime         // 7 days from creation
  acceptedAt  DateTime?
  declinedAt  DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  team        Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([teamId, email]) // One pending invitation per email per team
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  CANCELED
}
```

## Security Features

1. **Unique Tokens**: 32-byte random tokens prevent guessing
2. **Email Verification**: Must sign in with the invited email
3. **Expiration**: Invitations expire after 7 days
4. **One Per Email**: Can't spam the same email with invitations
5. **Team Ownership**: Only team admins/managers can invite
6. **Seat Limits**: Enforced at invitation creation and acceptance

## Billing Integration

### How Seats Work

When you subscribe to QA Studio Pro:

1. Select number of seats (members) you need
2. Price = `base_price × number_of_seats`
3. Example: $15/month per seat
   - 5 seats = $75/month
   - 10 seats = $150/month

### Adding More Seats

1. Go to team page → **Manage Billing**
2. In Stripe Customer Portal:
   - Update quantity for your subscription
   - Changes are prorated automatically
3. New seats available immediately

### What Happens When Seats Are Full

**When Inviting:**

- System checks `team.members.length < subscription.seats`
- If full, returns 400 error with message to upgrade
- Team admin must add seats before inviting

**When Accepting:**

- Re-checks seat availability (in case it changed)
- If full, shows error to invitee
- Invitee should contact team admin

### Free Tier Limitations

Free teams (no subscription):

- Maximum 1 member (the team creator)
- Cannot send invitations
- Must upgrade to Pro to add team members

## Email Notifications

QA Studio uses **Clerk's built-in invitation system** to send invitation emails automatically.

### How It Works

When you send an invitation:

1. Invitation is created in database with unique token
2. System calls Clerk API to send email
3. Clerk sends branded email to invitee
4. Email contains link to accept invitation
5. Invitee clicks link and signs in (or signs up)
6. System verifies email match and adds user to team

### Email Features

- ✅ **Professional branded emails** - Customize in Clerk dashboard
- ✅ **All auth methods supported** - OAuth (Google, Microsoft), email/password, SSO
- ✅ **Automatic tracking** - See invitation status in Clerk dashboard
- ✅ **No additional costs** - Included with Clerk (all plans)
- ✅ **Custom domain support** - Use your own domain for emails

### Setup Required

See [CLERK_INVITATIONS_SETUP.md](./CLERK_INVITATIONS_SETUP.md) for complete setup instructions:

1. Enable invitations in Clerk dashboard
2. Customize email template with your branding
3. (Optional) Set up custom email domain
4. Test invitation flow

**Quick Setup:**

1. Go to Clerk Dashboard → User & Authentication → Settings
2. Enable "Invitation mode"
3. Go to Customization → Emails → Edit "Invitation" template
4. Deploy and test!

## Troubleshooting

### "User is already a member of another team"

**Solution**: Users can only be in one team at a time. They must:

1. Leave their current team first
2. Then accept the new invitation

### "Team has reached seat limit"

**For Free Tier:**

- Upgrade to Pro plan
- Go to `/teams/new` to start subscription

**For Pro Tier:**

- Go to team page → Manage Billing
- Increase seat quantity in Stripe
- Try inviting again

### "Invitation has expired"

Invitations expire after 7 days for security. The team admin must:

1. Go to invite page
2. Send a new invitation
3. Invitee clicks new link within 7 days

### "Email mismatch"

Invitee must sign in with the exact email the invitation was sent to. If they use a different email:

1. Cancel the original invitation
2. Send new invitation to their actual email

### "This invitation has already been accepted"

The invitation was already used. If the user isn't in the team:

1. Check their account email matches invitation email
2. Team admin can check member list
3. Send a new invitation if needed

## Best Practices

### For Team Admins

1. **Assign Appropriate Roles**:
   - Most team members should be Testers
   - Only trusted users should be Managers
   - Limit Admin role to 1-2 people

2. **Monitor Seat Usage**:
   - Regularly review team members
   - Remove inactive members to free seats
   - Plan ahead for team growth

3. **Invitation Management**:
   - Cancel invitations if plans change
   - Re-send if someone loses the link
   - Set calendar reminder for seat reviews

### For Invitees

1. **Respond Promptly**: Invitations expire in 7 days
2. **Use Correct Email**: Sign in with the invited email
3. **Understand Your Role**: Review permissions before accepting
4. **Contact Admin**: If you have questions about the team

## Future Enhancements

Planned features:

- [ ] Email notifications via Resend
- [ ] Invitation templates
- [ ] Bulk invitations (CSV upload)
- [ ] Custom expiration periods
- [ ] Invitation reminders
- [ ] Team join requests (reverse flow)
- [ ] Public team directories
- [ ] SSO/SAML for enterprise teams

---

## Quick Reference

**Pages:**

- Team Invitations: `/teams/[teamId]/invite`
- Accept Invitation: `/invitations/[token]`
- Team Management: `/teams/[teamId]`

**Permissions:**

- Send Invitations: ADMIN, MANAGER
- Accept Invitations: Any authenticated user
- Manage Billing: ADMIN, MANAGER

**Limits:**

- Free Tier: 1 member
- Pro Tier: Based on subscription
- Invitation Expiry: 7 days
- Pending Invitations: Unlimited (within seat limit)

**Support:**

- Discord: https://discord.gg/rw3UfdB9pN
- Issues: https://github.com/QAStudio-Dev/studio/issues
- Documentation: https://qastudio.dev/docs
