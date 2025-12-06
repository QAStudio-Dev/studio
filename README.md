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
- 🔐 **Self-Hosted Auth** - Secure authentication with bcrypt and session management
- 🌐 **Self-Hostable** - Deploy on your own infrastructure with full control

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

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

    # Vercel Blob Storage (REQUIRED for attachments)
    # Get from: Vercel Dashboard -> Storage -> Blob -> Connect -> Read/Write Token
    # All attachments (screenshots, videos, traces) are stored in Vercel Blob
    BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

    # Cron Secret (for scheduled jobs like attachment cleanup)
    # Generate with: openssl rand -hex 32
    CRON_SECRET=your_64_character_hex_string_here

    # Decap CMS (optional, for blog)
    DECAP_GITHUB_CLIENT_ID=...
    DECAP_GITHUB_CLIENT_SECRET=...
    ```

    > **Note**: `BLOB_READ_WRITE_TOKEN` is required even in development. QA Studio uses Vercel Blob storage for all attachments. See [Vercel Blob Setup](#vercel-blob-setup) below for details.

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

### Vercel Blob Setup

QA Studio requires Vercel Blob storage for test attachments (screenshots, videos, traces). This is required in both development and production.

**Setup Steps:**

1. **Create a Vercel Blob Store**
    - Go to [Vercel Dashboard](https://vercel.com/dashboard)
    - Navigate to Storage → Blob
    - Click "Create Database"
    - Name it (e.g., "qa-studio-attachments")

2. **Get Your Token**
    - In the Blob store settings, go to "Connect"
    - Copy the "Read/Write Token"
    - Add it to `.env.local`:
        ```env
        BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
        ```

3. **Attachment Retention**
    - Free users: 7-day retention (attachments deleted automatically)
    - Pro users: 30-day retention
    - Cleanup runs daily via cron job at 2 AM UTC

**Why Vercel Blob?**

- Fast global CDN delivery
- No file size limits
- Automatic optimization
- Free tier: 500MB storage, 5GB bandwidth/month
- Paid: $0.15/GB storage, $0.15/GB bandwidth

**Alternative for Self-Hosting:**
If you're self-hosting and don't want to use Vercel Blob, you can:

- Implement your own blob storage adapter (S3, MinIO, local filesystem)
- Modify `src/lib/server/blob-storage.ts` to use your storage solution
- Keep the same interface for compatibility

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Skeleton UI, Tailwind 4
- **Backend**: SvelteKit API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Self-hosted with bcrypt and secure sessions
- **Deployment**: Vercel (or any Node.js host)
- **CMS**: Decap CMS for blog management

## Documentation

- 📚 **[API Documentation](https://qastudio.dev/docs)** - Complete REST API reference
- 🔧 **[Setup Guides](docs/)** - Detailed setup instructions
    - [Team Invitations](docs/TEAM_INVITATIONS.md) - Invite members with role-based access
    - [Stripe Integration](docs/STRIPE_SETUP.md) - Team billing and subscriptions
    - [Decap CMS Setup](docs/DECAP_CMS_SETUP.md) - Blog management
    - [Slack Notifications](docs/INTEGRATIONS.md) - Team notifications
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

## Privacy & Compliance

QA Studio is designed with privacy best practices and we are actively working toward full GDPR/CCPA compliance.

### 🔒 Security Features

- **Password Security**: Bcrypt hashing (OWASP 2025 recommended)
- **Session Security**: HTTP-only secure cookies
- **Data Encryption**: AES-256 encryption at rest
- **Audit Logging**: Comprehensive audit trail for all actions
- **Self-Hosted**: Complete data sovereignty

### 📚 Compliance Documentation

For detailed compliance information, see:

- [Database Backup System](src/routes/api/cron/BACKUPS.md) - Backup retention and GDPR/CCPA compliance procedures
- [Audit Logging](src/lib/server/audit.ts) - Complete audit trail system
- [Authentication Security](CLAUDE.md#authentication) - Password and session security

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
