# Stripe Integration Setup Guide

This guide will help you set up Stripe subscriptions for QA Studio's team functionality.

## Overview

QA Studio uses Stripe for:

- Team subscription management (Pro plan)
- Per-seat billing
- Self-service billing portal
- Automatic seat limit enforcement

## Architecture

### Subscription Flow

1. **Free Individual Users**: Anyone can sign up and use QA Studio for free (1 user only)
2. **Team Creation**: Users can create teams
3. **Team Subscription**: To add members to a team, the team must have a Pro subscription
4. **Seat Management**: Subscriptions include a certain number of seats. Adding more members requires more seats.

### Database Models

```prisma
model Team {
  subscription Subscription?
  members      User[]
}

model Subscription {
  teamId               String
  stripeCustomerId     String
  stripeSubscriptionId String
  stripePriceId        String
  status               SubscriptionStatus
  seats                Int
  currentPeriodEnd     DateTime
}
```

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Activate your account (for production)
3. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

## Step 2: Create Products and Prices

### In Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. Create the Pro plan:
   - **Name**: QA Studio Pro
   - **Description**: Team collaboration with AI-powered features
   - **Pricing Model**: Recurring

3. Add pricing options:

   **Monthly Price:**
   - **Price**: $15/month
   - **Billing period**: Monthly
   - **Usage type**: Licensed (per seat)
   - Copy the **Price ID** (starts with `price_`)

   **Yearly Price:**
   - **Price**: $144/year ($12/month)
   - **Billing period**: Yearly
   - **Usage type**: Licensed (per seat)
   - Copy the **Price ID** (starts with `price_`)

## Step 3: Configure Environment Variables

Update your `.env` file with the following:

```bash
# Stripe Secret Key (from Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook Secret (we'll get this in Step 4)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Public variables
PUBLIC_BASE_URL=http://localhost:5173
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Set Up Webhooks

Webhooks keep your database in sync with Stripe subscription events.

### Local Development (using Stripe CLI)

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli

2. **Login to Stripe**:

   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:

   ```bash
   stripe listen --forward-to localhost:5173/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) and add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Production (Vercel/hosting)

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**

2. Click **Add Endpoint**

3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`

4. **Events to listen for**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing Secret** and add to your production environment variables

## Step 5: Enable Stripe Customer Portal

The Customer Portal allows users to manage their subscriptions, update payment methods, and view invoices.

1. Go to **Settings** → **Billing** → **Customer Portal**

2. Enable the portal

3. Configure settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing information
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update subscription quantities (seats)

## Step 6: Test the Integration

### Create a Test Team

1. Start your dev server:

   ```bash
   npm run dev
   ```

2. Start Stripe CLI webhook forwarding:

   ```bash
   stripe listen --forward-to localhost:5173/api/webhooks/stripe
   ```

3. Sign in to your app

4. Navigate to `/teams/new`

5. Create a team with the Pro plan

6. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Verify Webhooks

Check your terminal running `stripe listen` to see webhook events:

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `invoice.payment_succeeded`

Check your database:

```bash
npx prisma studio
```

Verify:

- `Team` record created
- `Subscription` record created with `status = 'ACTIVE'`
- `User` record has `teamId` populated

### Test the Customer Portal

1. Go to your team page: `/teams/[teamId]`

2. Click **Manage Billing**

3. Verify you can:
   - Update payment method
   - Change subscription quantity (seats)
   - View invoices
   - Cancel subscription

## Usage Examples

### Checking Subscription Status

```typescript
import { requireActiveSubscription, requireFeature } from '$lib/server/subscriptions';

export const POST: RequestHandler = async ({ locals, params }) => {
	const userId = await requireAuth(locals);

	// Require active subscription
	await requireActiveSubscription(params.teamId);

	// Require specific feature
	await requireFeature(params.teamId, 'ai_analysis');

	// Your logic here...
};
```

### Enforcing Seat Limits

```typescript
import { requireAvailableSeats } from '$lib/server/subscriptions';

export const POST: RequestHandler = async ({ request, params }) => {
	// Check if team has available seats before adding member
	await requireAvailableSeats(params.teamId);

	// Add member...
};
```

### Getting Team Limits

```typescript
import { getTeamLimits } from '$lib/server/subscriptions';

const limits = await getTeamLimits(teamId);

console.log(limits);
// {
//   plan: 'pro',
//   seats: { max: 5, used: 3, available: 2 },
//   features: { ai_analysis: true, advanced_reports: true },
//   subscription: { status: 'ACTIVE', currentPeriodEnd: Date }
// }
```

## Feature Gating

### Free Plan

- 1 user only (individual account)
- Unlimited projects
- Basic test management
- Community support

### Pro Plan (Paid)

- Up to 10+ team members (per seat)
- Unlimited projects
- Advanced test management
- ✨ AI-powered failure analysis
- ✨ Advanced reporting
- ✨ Custom integrations
- Priority support

### Implementation

Gate premium features in your code:

```typescript
import { isFeatureAvailable } from '$lib/server/subscriptions';

export const load: PageServerLoad = async ({ params }) => {
	const team = await getTeam(params.teamId);

	const hasAI = await isFeatureAvailable(team.id, 'ai_analysis');

	return {
		team,
		features: {
			aiAnalysis: hasAI
		}
	};
};
```

In your UI:

```svelte
{#if features.aiAnalysis}
	<AIAnalysisPanel />
{:else}
	<UpgradePrompt feature="AI-powered failure analysis" />
{/if}
```

## Troubleshooting

### Webhook Not Receiving Events

- Verify webhook endpoint URL is correct
- Check webhook signing secret matches `.env`
- Ensure endpoint is publicly accessible (for production)
- Check Stripe Dashboard → Webhooks → Recent Deliveries for errors

### Subscription Status Not Updating

- Check webhook is receiving events
- Verify `teamId` is in subscription metadata
- Check database for subscription record
- Look for errors in webhook logs

### Checkout Session Fails

- Verify price IDs are correct
- Check Stripe publishable key is correct
- Ensure customer email is valid
- Check success/cancel URLs are accessible

## Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures (already implemented)

2. **Environment Variables**: Never commit `.env` files to git

3. **Role-Based Access**: Only ADMIN and MANAGER roles can manage billing

4. **Seat Enforcement**: Automatically enforced before adding members

5. **Test vs Production Keys**: Use test keys in development, production keys in production

## Going Live

Before launching to production:

1. ✅ Activate your Stripe account
2. ✅ Switch to production API keys
3. ✅ Create production webhook endpoint
4. ✅ Update production environment variables
5. ✅ Test with real payment method (then refund)
6. ✅ Set up tax collection (if required)
7. ✅ Configure email receipts in Stripe

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
