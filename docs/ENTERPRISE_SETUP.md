# Enterprise Plan Setup Guide

## Overview

QA Studio's Enterprise plan uses a manual admin panel approach rather than self-service Stripe checkout. This provides maximum flexibility for custom pricing, contract terms, and enterprise features.

## How It Works

1. **Customer visits Contact Sales page** (`/contact-sales`)
2. **Inquiry submitted** to database
3. **Sales team receives notification** (optional email integration)
4. **Sales team manually upgrades** team via admin panel
5. **Custom contract & invoicing** happens outside the app

## Features

### Contact Sales Page

Located at `/contact-sales`, this page collects:

- Company name (required)
- Contact name
- Email (required)
- Phone number
- Estimated team size
- Additional requirements

### Admin Panel

Located at `/admin/teams` (OWNER role only), admins can:

**Team Management:**

- View all teams with plan, member count, project count
- Upgrade/downgrade any team's plan
- Set custom seat limits for Enterprise
- Set contract start/end dates
- Assign account managers
- Set invoice email addresses

**Inquiry Management:**

- View all enterprise inquiries
- Update inquiry status (pending → contacted → qualified → converted/rejected)
- Assign inquiries to sales reps
- Add internal notes

## Database Schema

### Team Model Updates

```prisma
model Team {
  // ... existing fields ...

  plan          String   @default("free") // 'free' | 'pro' | 'enterprise'

  // Enterprise-specific
  customSeats        Int?      // Override seat limit
  contractStart      DateTime? // Contract start
  contractEnd        DateTime? // Contract end
  accountManager     String?   // Sales rep email
  invoiceEmail       String?   // Billing contact
}
```

### EnterpriseInquiry Model

```prisma
model EnterpriseInquiry {
  id             String   @id
  teamId         String?
  companyName    String
  contactName    String?
  email          String
  phone          String?
  estimatedSeats Int?
  requirements   String?
  status         String   @default("pending")
  assignedTo     String?  // Sales rep
  notes          String?  // Internal notes
  createdAt      DateTime
  updatedAt      DateTime
}
```

## Usage

### For Customers

1. **Select Enterprise plan** during onboarding or team creation
2. **Redirected to** `/contact-sales`
3. **Fill out inquiry form**
4. **Receive confirmation** "We'll contact you within 1 business day"
5. **Sales team reaches out** to discuss requirements
6. **Custom contract signed**
7. **Account manually upgraded** by admin

### For Admins

**Upgrading a Team to Enterprise:**

1. Go to `/admin/teams`
2. Click "Manage" on the team
3. Select "Enterprise" plan
4. Enter custom seat limit (e.g., 500)
5. Set contract end date
6. Add account manager email
7. Add invoice email
8. Click "Save Changes"

**Managing Inquiries:**

1. Go to `/admin/teams`
2. View enterprise inquiries section
3. Click "Manage Inquiry"
4. Update status: pending → contacted → qualified → converted
5. Assign to sales rep
6. Add notes
7. Click "Save"

## API Endpoints

### POST /api/enterprise-inquiries

Submit an enterprise inquiry.

**Request:**

```json
{
	"companyName": "Acme Corp",
	"contactName": "John Doe",
	"email": "john@acme.com",
	"phone": "+1 555-123-4567",
	"estimatedSeats": 500,
	"requirements": "Need SSO with Okta",
	"csrfToken": "..."
}
```

**Response:**

```json
{
	"success": true,
	"inquiry": {
		"id": "clx...",
		"companyName": "Acme Corp",
		"email": "john@acme.com"
	}
}
```

## Integration Points

### Email Notifications (Optional)

You can integrate email notifications in `/api/enterprise-inquiries/+server.ts`:

```typescript
import { sendEmail } from '$lib/server/email';

// After creating inquiry
await sendEmail({
	to: 'sales@yourdomain.com',
	subject: `New Enterprise Inquiry: ${companyName}`,
	html: `
    <h2>New Enterprise Lead</h2>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Contact:</strong> ${email}</p>
    <p><strong>Seats:</strong> ${estimatedSeats}</p>
    <p><strong>Requirements:</strong> ${requirements}</p>
    <a href="https://yourdomain.com/admin/teams">View in Admin Panel</a>
  `
});
```

### CRM Integration (Optional)

Push inquiries to your CRM:

```typescript
// After creating inquiry
await fetch('https://api.hubspot.com/contacts/v1/contact', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${HUBSPOT_API_KEY}`,
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		properties: [
			{
				property: 'email',
				value: email
			},
			{
				property: 'company',
				value: companyName
			}
		]
	})
});
```

## Security

### Admin Access Control

The admin panel is protected by role-based access:

```typescript
// Only OWNER role can access
if (user?.role !== 'OWNER') {
	throw error(403, { message: 'Access denied' });
}
```

To grant admin access, update a user's role in the database:

```sql
UPDATE "User" SET role = 'OWNER' WHERE email = 'admin@yourdomain.com';
```

### CSRF Protection

All forms use CSRF tokens to prevent cross-site request forgery.

## Pricing Configuration

All enterprise pricing is managed in `/src/lib/constants/pricing.ts`:

```typescript
export const PRICING = {
	// ... Free, Pro ...
	ENTERPRISE: {
		name: 'Enterprise',
		priceDisplay: 'Custom',
		description: 'For organizations with advanced needs',
		tagline: 'Contact sales',
		contactSales: true,
		features: [
			'Unlimited team members',
			'Unlimited projects',
			'Everything in Pro, plus:',
			'SSO/SAML authentication',
			'Advanced user permissions',
			'Audit logs',
			'SLA guarantees',
			'Dedicated support',
			'Custom contract terms',
			'On-premise deployment options'
		]
	}
};
```

## Future Enhancements

Consider adding:

1. **Automated Email Workflows**
    - Welcome email on inquiry submission
    - Follow-up emails
    - Contract renewal reminders

2. **Sales Dashboard**
    - Pipeline visualization
    - Conversion metrics
    - Revenue forecasting

3. **Contract Management**
    - Upload signed contracts
    - Track renewal dates
    - Auto-notify expiring contracts

4. **Usage Analytics**
    - Track enterprise customer usage
    - Feature adoption metrics
    - Upsell opportunities

5. **Self-Service Portal**
    - Enterprise customers can manage users
    - View usage stats
    - Download invoices

## Troubleshooting

**Admin panel not accessible:**

- Ensure user has OWNER role
- Check authentication is working
- Verify role in database

**Inquiries not showing:**

- Check database connection
- Verify migration ran successfully
- Check browser console for errors

**Team upgrades not saving:**

- Check validation errors
- Verify form data is correct
- Check server logs for errors

## Related Documentation

- [PRICING.md](./PRICING.md) - Pricing tiers and implementation
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe setup for Pro plan
- [TEAMS_AND_ROLES.md](./TEAMS_AND_ROLES.md) - Team structure and roles
