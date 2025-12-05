# QA Studio Pricing

## Overview

QA Studio offers three pricing tiers designed to meet different needs:

- **Free Plan**: For individuals getting started
- **Pro Plan**: For teams that need advanced features and collaboration
- **Enterprise Plan**: For organizations with advanced security and compliance needs

## Pricing Details

### Free Plan

- **Price**: $0/month
- **Team Size**: 1 user (you)
- **Projects**: 1 project
- **Features**:
    - 1 user (you)
    - 1 project
    - Basic test management
    - 7-day attachment retention
    - Community support

### Pro Plan

- **Monthly**: $10/seat/month (billed monthly)
- **Yearly**: $100/seat/year (billed annually)
- **Team Size**: Up to 10 members included
- **Projects**: Unlimited
- **Features**:
    - Up to 10 team members
    - Unlimited projects
    - Advanced test management
    - 30-day attachment retention
    - AI-powered failure analysis
    - Priority support
    - Custom integrations

### Enterprise Plan

- **Price**: Custom (Contact Sales)
- **Team Size**: Unlimited
- **Projects**: Unlimited
- **Features**:
    - Unlimited team members
    - Unlimited projects
    - Everything in Pro, plus:
    - **SSO/SAML authentication**
    - **Advanced user permissions**
    - **Audit logs**
    - **SLA guarantees**
    - **Dedicated support**
    - **Custom contract terms**
    - **On-premise deployment options**

## Implementation

All pricing information is centralized in [`src/lib/constants/pricing.ts`](../src/lib/constants/pricing.ts) to ensure consistency across the application.

### Using Pricing Constants

```typescript
import { PRICING, calculatePlanCost, formatPrice, getPlanLimits } from '$lib/constants/pricing';

// Access pricing info
const proMonthly = PRICING.PRO.pricePerSeatMonthly; // 10
const proYearly = PRICING.PRO.pricePerSeatYearly; // 100
const enterpriseDisplay = PRICING.ENTERPRISE.priceDisplay; // "Custom"

// Calculate total cost
const monthlyCost = calculatePlanCost('pro', 5, 'monthly'); // 50
const yearlyCost = calculatePlanCost('pro', 5, 'yearly'); // 500
const enterpriseCost = calculatePlanCost('enterprise', 100, 'monthly'); // 0 (custom pricing)

// Get plan limits and features
const proLimits = getPlanLimits('pro');
// { seats: 10, attachmentRetention: 30, aiAnalysis: true, sso: false, auditLogs: false, sla: false }

const enterpriseLimits = getPlanLimits('enterprise');
// { seats: -1, attachmentRetention: -1, aiAnalysis: true, sso: true, auditLogs: true, sla: true }

// Format for display
const formatted = formatPrice(10, 'month', true); // "$10/month/seat"
```

### Free Tier Limits

Server-side limits are enforced via [`src/lib/constants.ts`](../src/lib/constants.ts):

```typescript
export const FREE_TIER_LIMITS = {
	MEMBERS: 1, // 1 user only
	PROJECTS: 1 // 1 project only
} as const;
```

## Stripe Configuration

To set up Stripe products and prices:

1. Run the setup script: `npm run setup:stripe`
2. This creates:
    - Product: "QA Studio Pro"
    - Monthly price: $10/month per seat
    - Yearly price: $100/year per seat

For detailed Stripe setup instructions, see [STRIPE_SETUP.md](./STRIPE_SETUP.md).

**Note:** Enterprise plans use custom pricing and contracts, not Stripe self-service checkout.

## Billing Periods

Users can choose between:

- **Monthly billing**: Pay $10 per seat every month
- **Yearly billing**: Pay $100 per seat once per year (same total cost as monthly)

There is currently no discount for annual billing - both options cost the same per month.

## Upgrading

### Free to Pro

Free users can upgrade to Pro at any time:

1. Go to `/teams/new`
2. Select "Pro" plan
3. Choose monthly or yearly billing
4. Complete checkout via Stripe

### Pro to Enterprise

Pro users interested in Enterprise should:

1. Go to `/teams/new` or contact page
2. Select "Enterprise" plan
3. Sales team will reach out to discuss requirements
4. Custom contract and manual setup

## Managing Subscriptions

### Pro Users

Pro users can manage their subscription:

- View current plan and billing details
- Add or remove seats
- Update payment method
- Cancel subscription (takes effect at end of billing period)

All subscription management is handled through the Stripe Customer Portal.

### Enterprise Users

Enterprise users work directly with their account manager for:

- Adding/removing users
- Contract renewals
- Feature requests
- Support escalations

## Enterprise Features

### SSO/SAML Authentication

Enterprise plan includes single sign-on integration with:

- Okta
- Azure AD
- Google Workspace
- OneLogin
- Auth0
- Custom SAML providers

### Advanced Permissions

Fine-grained access control:

- Custom roles beyond Admin/Manager/Tester/Viewer
- Project-level permissions
- Feature-level access controls

### Audit Logs

Complete audit trail:

- User actions
- Data changes
- Login attempts
- API access
- Exportable for compliance

### SLA Guarantees

- 99.9% uptime SLA
- Priority incident response
- Dedicated support team
- Regular business reviews
