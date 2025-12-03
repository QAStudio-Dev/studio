# QA Studio Pricing

## Overview

QA Studio offers two pricing tiers designed to meet different needs:

- **Free Plan**: For individuals getting started
- **Pro Plan**: For teams that need advanced features and collaboration

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

## Implementation

All pricing information is centralized in [`src/lib/constants/pricing.ts`](../src/lib/constants/pricing.ts) to ensure consistency across the application.

### Using Pricing Constants

```typescript
import { PRICING, calculatePlanCost, formatPrice } from '$lib/constants/pricing';

// Access pricing info
const proMonthly = PRICING.PRO.pricePerSeatMonthly; // 10
const proYearly = PRICING.PRO.pricePerSeatYearly; // 100

// Calculate total cost
const monthlyCost = calculatePlanCost('pro', 5, 'monthly'); // 50
const yearlyCost = calculatePlanCost('pro', 5, 'yearly'); // 500

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

## Billing Periods

Users can choose between:

- **Monthly billing**: Pay $10 per seat every month
- **Yearly billing**: Pay $100 per seat once per year (same total cost as monthly)

There is currently no discount for annual billing - both options cost the same per month.

## Upgrading

Free users can upgrade to Pro at any time:

1. Go to `/teams/new`
2. Select "Pro" plan
3. Choose monthly or yearly billing
4. Complete checkout via Stripe

## Managing Subscriptions

Pro users can manage their subscription:

- View current plan and billing details
- Add or remove seats
- Update payment method
- Cancel subscription (takes effect at end of billing period)

All subscription management is handled through the Stripe Customer Portal.
