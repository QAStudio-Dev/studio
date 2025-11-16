# QA Studio Documentation

Welcome to the QA Studio documentation! This directory contains comprehensive guides for setup, development, and security.

## 📚 Table of Contents

### Getting Started

- [SETUP_AUTH.md](SETUP_AUTH.md) - Initial authentication setup with Clerk
- [CLERK_PUBLIC_ROUTES.md](CLERK_PUBLIC_ROUTES.md) - Configuring public routes

### Features & Setup

- [STRIPE_SETUP.md](STRIPE_SETUP.md) - Payment and subscription configuration
- [DECAP_CMS_SETUP.md](DECAP_CMS_SETUP.md) - Content management system setup
- [TEAMS_AND_ROLES.md](TEAMS_AND_ROLES.md) - Team structure and permissions
- [TEAM_INVITATIONS.md](TEAM_INVITATIONS.md) - Inviting users to teams
- [CLERK_INVITATIONS_SETUP.md](CLERK_INVITATIONS_SETUP.md) - Clerk invitation flows

### Integrations

- [INTEGRATIONS.md](INTEGRATIONS.md) - Overview of third-party integrations
- [INTEGRATION_USAGE.md](INTEGRATION_USAGE.md) - How to use integrations
- [SLACK_NOTIFICATIONS_STATUS.md](SLACK_NOTIFICATIONS_STATUS.md) - Slack integration status
- [SLACK_NOTIFICATION_IMPROVEMENTS.md](SLACK_NOTIFICATION_IMPROVEMENTS.md) - Slack feature improvements
- [SLACK_BUTTON_FIX.md](SLACK_BUTTON_FIX.md) - Troubleshooting Slack buttons

### API & Development

- [API_KEYS_SETUP.md](API_KEYS_SETUP.md) - Setting up API keys for programmatic access
- [REPORTER_API.md](REPORTER_API.md) - Using the test reporter API
- [REPORTER_API_CHANGES.md](REPORTER_API_CHANGES.md) - Recent API changes
- [PLAYWRIGHT_API_GUIDE.md](PLAYWRIGHT_API_GUIDE.md) - Playwright integration guide
- [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) - Quick API reference
- [API_ENDPOINT_MIGRATION.md](API_ENDPOINT_MIGRATION.md) - API migration guide
- [API_MIGRATION_STATUS.md](API_MIGRATION_STATUS.md) - Migration progress tracking

### Security

- [SECURITY.md](SECURITY.md) - **Security implementation and best practices**
- [SECURITY_FIXES.md](SECURITY_FIXES.md) - **Recent security improvements**
- [SIGNED_URLS.md](SIGNED_URLS.md) - **Secure trace file serving**

### Performance

- [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md) - Performance tuning and optimizations

---

## 🔒 Security Documentation

### Overview

QA Studio uses cryptographically signed, time-limited URLs to serve Playwright trace files securely to external services like `trace.playwright.dev`.

### Quick Start

1. Generate signing secret:

    ```bash
    openssl rand -hex 32
    ```

2. Add to `.env`:

    ```bash
    URL_SIGNING_SECRET=your_generated_secret_here
    ```

3. For production (Vercel):
    ```bash
    vercel env add URL_SIGNING_SECRET production
    ```

### Security Features

- ✅ HMAC-SHA256 signatures (tamper-proof)
- ✅ Time-based expiration (1-24 hours)
- ✅ Authentication & authorization checks
- ✅ Path traversal protection
- ✅ Strict MIME type validation
- ✅ Timing-safe comparisons
- ✅ No hardcoded secrets

**Read more:** [SECURITY.md](SECURITY.md)

---

## 🚀 Common Tasks

### Setting Up a New Development Environment

1. Follow [SETUP_AUTH.md](SETUP_AUTH.md) for Clerk authentication
2. Configure Stripe using [STRIPE_SETUP.md](STRIPE_SETUP.md)
3. Set up API keys via [API_KEYS_SETUP.md](API_KEYS_SETUP.md)
4. Generate security secrets per [SECURITY.md](SECURITY.md)

### Integrating Playwright Tests

1. Read [PLAYWRIGHT_API_GUIDE.md](PLAYWRIGHT_API_GUIDE.md)
2. Check [REPORTER_API.md](REPORTER_API.md) for reporter setup
3. Review [REPORTER_API_CHANGES.md](REPORTER_API_CHANGES.md) for latest updates

### Working with Teams

1. Understand structure in [TEAMS_AND_ROLES.md](TEAMS_AND_ROLES.md)
2. Set up invitations via [TEAM_INVITATIONS.md](TEAM_INVITATIONS.md)
3. Configure Clerk flows in [CLERK_INVITATIONS_SETUP.md](CLERK_INVITATIONS_SETUP.md)

### Adding Integrations

1. Overview: [INTEGRATIONS.md](INTEGRATIONS.md)
2. Usage guide: [INTEGRATION_USAGE.md](INTEGRATION_USAGE.md)
3. Slack-specific: [SLACK_NOTIFICATIONS_STATUS.md](SLACK_NOTIFICATIONS_STATUS.md)

---

## 🐛 Troubleshooting

### Security Issues

- **Missing signing secret error**: See [SECURITY.md](SECURITY.md#configuration-checklist)
- **Unauthorized access**: Check [SECURITY_FIXES.md](SECURITY_FIXES.md#2--missing-authentication-check)
- **Trace viewer not loading**: Review [SIGNED_URLS.md](SIGNED_URLS.md#troubleshooting)

### Integration Issues

- **Slack buttons not working**: [SLACK_BUTTON_FIX.md](SLACK_BUTTON_FIX.md)
- **Notifications not sending**: [SLACK_NOTIFICATIONS_STATUS.md](SLACK_NOTIFICATIONS_STATUS.md)

### API Issues

- **API key problems**: [API_KEYS_SETUP.md](API_KEYS_SETUP.md)
- **Reporter errors**: [REPORTER_API_CHANGES.md](REPORTER_API_CHANGES.md)
- **Endpoint migration**: [API_ENDPOINT_MIGRATION.md](API_ENDPOINT_MIGRATION.md)

---

## 📝 Contributing Documentation

When adding new documentation:

1. **Place in `/docs` directory** - All markdown docs should live here
2. **Update this README** - Add your doc to the appropriate section
3. **Use clear headings** - Make docs easy to navigate
4. **Include code examples** - Show, don't just tell
5. **Link related docs** - Help users find related information

### Documentation Standards

- Use relative links between docs
- Include a "Table of Contents" for long docs
- Add troubleshooting sections where applicable
- Keep security docs up to date with code changes

---

## 🔗 External Resources

- [Main Project README](../README.md)
- [Environment Variables](.env.example)
- [Prisma Schema](../prisma/schema.prisma)
- [API Routes](../src/routes/api/)

---

**Need help?** Open an issue or contact the team.
