# QA Studio

<div align="center">
  <img src="static/full.svg" alt="QA Studio Logo" width="300">

  <p><strong>Modern Test Management Without the BS</strong></p>

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/DISCORD_ID?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.gg/rw3UfdB9pN)

[Website](https://qastudio.dev) • [Documentation](https://qastudio.dev/docs) • [Discord](https://discord.gg/rw3UfdB9pN) • [Blog](https://qastudio.dev/blog)

</div>

---

## Overview

QA Studio is a modern, open-source test management platform built by QA engineers, for QA engineers. No bloat, no slowness, no BS—just powerful testing tools that actually work the way you need them to.

### Key Features

- 🚀 **Lightning Fast** - Built with SvelteKit 5, Tailwind 4, and optimized for speed
- 🔌 **API First** - Every feature available via comprehensive REST API
- 📊 **Rich Reporting** - Track test results, trends, and metrics with beautiful dashboards
- 🧪 **Test Organization** - Hierarchical test suites and cases with full traceability
- 🎯 **Test Execution** - Plan and execute test runs across multiple environments
- 📸 **Rich Media** - Attach screenshots, videos, logs, and stack traces
- 🔐 **Enterprise Auth** - Clerk authentication with SSO/SAML support
- 🌐 **Self-Hostable** - Deploy on your own infrastructure with full control

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account (for authentication)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/QAStudio-Dev/studio.git
   cd studio
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/qa_studio"

   # Clerk Authentication
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Decap CMS (optional, for blog)
   DECAP_GITHUB_CLIENT_ID=...
   DECAP_GITHUB_CLIENT_SECRET=...
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Skeleton UI, Tailwind 4
- **Backend**: SvelteKit API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk (with SSO support)
- **Deployment**: Vercel (or any Node.js host)
- **CMS**: Decap CMS for blog management

## Documentation

- 📚 **[API Documentation](https://qastudio.dev/docs)** - Complete REST API reference
- 🔧 **[Setup Guides](docs/)** - Detailed setup instructions
  - [Authentication Setup](docs/SETUP_AUTH.md)
  - [Decap CMS Setup](docs/DECAP_CMS_SETUP.md)
  - [Stripe Integration](docs/STRIPE_SETUP.md)
  - [Slack Notifications](docs/INTEGRATIONS.md)
- 🎨 **[Project Structure](CLAUDE.md)** - Codebase organization and conventions

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/QAStudio-Dev/studio)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

### Self-Hosting

QA Studio can be deployed to any platform that supports Node.js:

- **Docker**: Build and run with Docker (Dockerfile included)
- **AWS/GCP/Azure**: Deploy to any cloud provider
- **VPS**: Run on your own server with PM2 or similar

See our [deployment guide](docs/DEPLOYMENT.md) for detailed instructions.

## Pricing & Licensing

QA Studio uses the **Elastic License 2.0** - you're free to:

- ✅ Use QA Studio for free
- ✅ Self-host on your own infrastructure
- ✅ Modify and fork the code
- ✅ Use it commercially (internally)

You **cannot**:

- ❌ Offer QA Studio as a hosted/managed service to others
- ❌ Remove license notices or circumvent license checks

### Pricing Plans

- **Free Tier**: 1 project, unlimited test cases
- **Self-Hosted**: Unlimited everything on your infrastructure
- **Pro Plan**: Unlimited projects, teams, AI diagnostics - [Learn more](https://qastudio.dev)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Community

- 💬 [Discord Server](https://discord.gg/rw3UfdB9pN) - Chat with the community
- 📝 [Blog](https://qastudio.dev/blog) - Latest updates and tutorials
- 🐛 [Issue Tracker](https://github.com/QAStudio-Dev/studio/issues) - Report bugs or request features
- 🗣️ [Discussions](https://github.com/QAStudio-Dev/studio/discussions) - Ask questions and share ideas

## License

QA Studio is licensed under the [Elastic License 2.0](LICENSE).

Copyright © 2025 QA Studio

---

<div align="center">
  Built with ❤️ by QA Engineers, for QA Engineers

[Website](https://qastudio.dev) • [Documentation](https://qastudio.dev/docs) • [Discord](https://discord.gg/rw3UfdB9pN)

</div>
