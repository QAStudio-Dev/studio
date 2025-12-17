# Self-Hosted Mode

QA Studio is open source (AGPL-3.0) and can be self-hosted on your own infrastructure with all features unlocked - no payment required.

## ⚠️ Security Warning

**IMPORTANT**: Self-hosted mode bypasses all payment and subscription checks. Only enable this on deployments you fully control.

- ✅ **Safe**: Single-organization deployments, internal tools, private infrastructure
- ❌ **NEVER**: Multi-tenant SaaS deployments, shared hosting, customer-facing services

When `SELF_HOSTED=true` is set, the application will:

- Skip all subscription and payment validations
- Grant unlimited access to all premium features
- Allow unlimited users and projects without any checks

This is intended for organizations running their own private instance, not for hosting a service for multiple customers.

## Enabling Self-Hosted Mode

To run QA Studio in self-hosted mode with all features unlocked, set the `SELF_HOSTED` environment variable:

```bash
SELF_HOSTED=true
```

Or in your `.env` file:

```env
SELF_HOSTED=true
```

## What Self-Hosted Mode Does

When `SELF_HOSTED=true` is set, the following changes take effect:

### ✅ All Features Unlocked

- **AI-powered failure analysis** - Full access without subscription
- **Advanced reporting** - All report types available
- **Custom integrations** - Twilio, Slack, JIRA, etc.
- **All future premium features** - Automatically included

### ✅ No User/Seat Limits

- **Unlimited team members** - Add as many users as you need
- **Unlimited projects** - No project limits
- **Unlimited test cases & runs** - No artificial restrictions

### ✅ No Stripe Required

- **No payment processing** - Stripe configuration is optional
- **No subscription checks** - All API endpoints work without subscriptions
- **No billing pages** - Payment-related UI is hidden/disabled

## Deployment Options

### Docker (Recommended)

```bash
git clone https://github.com/QAStudio-Dev/studio.git
cd studio
cp .env.example .env

# Edit .env and add:
echo "SELF_HOSTED=true" >> .env

docker-compose up -d
```

### Manual Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your `.env` file with required variables
4. Add `SELF_HOSTED=true` to your `.env`
5. Run database migrations: `npx prisma migrate deploy`
6. Build: `npm run build`
7. Start: `node build`

## Required Environment Variables (Self-Hosted)

Even in self-hosted mode, you still need these security-critical variables:

```env
# Required for all deployments
DATABASE_URL=postgresql://user:pass@localhost:5432/qastudio
SESSION_SECRET=your-random-secret-here
TOTP_ENCRYPTION_KEY=your-64-character-hex-key-here

# Self-hosted mode
SELF_HOSTED=true

# Optional (not required for self-hosted)
# STRIPE_SECRET_KEY=sk_...  # Only needed for SaaS hosting
# SMTP_HOST=smtp.gmail.com  # Only if you want email features
```

## NOT Required for Self-Hosted

These environment variables are only needed if you're running the hosted SaaS version:

- `STRIPE_SECRET_KEY` - Payment processing (not needed)
- `STRIPE_WEBHOOK_SECRET` - Payment webhooks (not needed)
- `PUBLIC_STRIPE_KEY` - Client-side Stripe (not needed)

Email configuration (`SMTP_*`) is optional but recommended for:

- Password reset emails
- Team invitation emails
- Notification emails

## Costs

The only costs for self-hosted QA Studio are:

1. **Server hosting** - Typically $10-30/month on most cloud providers
2. **Database** - PostgreSQL (often included in hosting or ~$5-15/month)
3. **Storage** - For test attachments (screenshots, logs, videos)

**No per-user fees. No subscription costs. No vendor lock-in.**

## Support

Self-hosted deployments are supported through:

- **GitHub Issues**: https://github.com/QAStudio-Dev/studio/issues
- **GitHub Discussions**: https://github.com/QAStudio-Dev/studio/discussions
- **Documentation**: https://qastudio.dev/docs

### Paid Support (Optional)

If you need priority support for your self-hosted deployment:

- **Pro Support**: $99/month - Priority email support, setup assistance
- **Enterprise**: Custom pricing - SLA guarantees, dedicated support, custom features

Contact: ben@qastudio.dev

## Comparison: Self-Hosted vs Hosted SaaS

| Feature            | Self-Hosted (Free) | Hosted SaaS Free | Hosted SaaS Pro |
| ------------------ | ------------------ | ---------------- | --------------- |
| **Price**          | $0 (+ hosting)     | $0               | $10/user/month  |
| **Users**          | Unlimited          | 1 user           | Unlimited       |
| **Projects**       | Unlimited          | 1 project        | Unlimited       |
| **All Features**   | ✅ Yes             | ❌ Limited       | ✅ Yes          |
| **AI Analysis**    | ✅ Yes             | ❌ No            | ✅ Yes          |
| **Integrations**   | ✅ Yes             | ❌ No            | ✅ Yes          |
| **Data Control**   | ✅ Your servers    | ❌ Our servers   | ❌ Our servers  |
| **Setup Required** | ✅ Yes             | ❌ No            | ❌ No           |
| **Maintenance**    | ✅ You             | ❌ Us            | ❌ Us           |

## License

QA Studio is licensed under **AGPL-3.0**:

- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute
- ✅ Private use
- ⚠️ Must open source any modifications if you distribute
- ⚠️ Must use AGPL-3.0 license for derivatives
- ⚠️ Network use counts as distribution

Full license: https://github.com/QAStudio-Dev/studio/blob/main/LICENSE

## Contributing

Self-hosted users are encouraged to contribute back to the project:

- Report bugs and issues
- Submit feature requests
- Contribute code improvements
- Help other self-hosters in discussions

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
