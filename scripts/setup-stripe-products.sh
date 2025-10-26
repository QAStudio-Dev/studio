#!/bin/bash

# QA Studio - Stripe Product Setup Script
# This script creates the Pro plan products and prices in Stripe

echo "🚀 Setting up QA Studio Pro products in Stripe..."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed."
    echo "Please install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo "✅ Stripe CLI found"
echo ""

# Login check
echo "Checking Stripe CLI login status..."
if ! stripe config --list &> /dev/null; then
    echo "❌ Not logged in to Stripe CLI"
    echo "Please run: stripe login"
    exit 1
fi

echo "✅ Logged in to Stripe"
echo ""

# Create the product
echo "📦 Creating 'QA Studio Pro' product..."
PRODUCT_ID=$(stripe products create \
  --name="QA Studio Pro" \
  --description="Team collaboration with AI-powered test management. Includes unlimited projects, advanced reporting, AI failure analysis, and priority support." \
  --format=json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | tail -1)

if [ -z "$PRODUCT_ID" ]; then
    echo "❌ Failed to create product"
    exit 1
fi

echo "✅ Product created: $PRODUCT_ID"
echo ""

# Create monthly price
echo "💰 Creating monthly price ($10/user/month)..."
PRICE_MONTHLY=$(stripe prices create \
  --product="$PRODUCT_ID" \
  --unit-amount=1000 \
  --currency=usd \
  --recurring='{"interval":"month"}' \
  --billing-scheme=per_unit \
  --format=json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | tail -1)

if [ -z "$PRICE_MONTHLY" ]; then
    echo "❌ Failed to create monthly price"
    exit 1
fi

echo "✅ Monthly price created: $PRICE_MONTHLY"
echo ""

# Create yearly price
echo "💰 Creating yearly price ($100/user/year)..."
PRICE_YEARLY=$(stripe prices create \
  --product="$PRODUCT_ID" \
  --unit-amount=10000 \
  --currency=usd \
  --recurring='{"interval":"year"}' \
  --billing-scheme=per_unit \
  --format=json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | tail -1)

if [ -z "$PRICE_YEARLY" ]; then
    echo "❌ Failed to create yearly price"
    exit 1
fi

echo "✅ Yearly price created: $PRICE_YEARLY"
echo ""

# Output environment variables
echo "🎉 Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Add these to your .env file:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=$PRICE_MONTHLY"
echo "PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=$PRICE_YEARLY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Copy the above lines to your .env file"
echo "2. Restart your dev server"
echo "3. Test creating a team with Pro plan"
echo ""
echo "For production, create separate products in live mode and update"
echo "your production environment variables."
echo ""
