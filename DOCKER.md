# QA Studio - Docker Setup Guide

QA Studio can run as a fully self-contained Docker environment with no external cloud dependencies. All services (database, cache, storage, email) run locally.

## Quick Start

```bash
# 1. Start all services (uses default passwords)
npm run docker:dev

# 2. Access the application
open http://localhost:3000

# 3. Access service UIs
open http://localhost:9001  # MinIO Console (Storage)
open http://localhost:8025  # MailHog (Email Testing)
```

**Note:** The first run uses secure default passwords. To customize them, see [Configuration](#configuration) below.

That's it! QA Studio is now running with:

- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ MinIO object storage (S3-compatible)
- ✅ MailHog email capture
- ✅ Hot-reload development server

## Services Overview

| Service        | Port      | Purpose                      | UI                    |
| -------------- | --------- | ---------------------------- | --------------------- |
| **Web App**    | 3000      | QA Studio application        | http://localhost:3000 |
| **PostgreSQL** | 5432      | Database                     | N/A                   |
| **Redis**      | 6379      | Cache & sessions             | N/A                   |
| **MinIO**      | 9000/9001 | Object storage (attachments) | http://localhost:9001 |
| **MailHog**    | 1025/8025 | Email testing                | http://localhost:8025 |

## Available Commands

```bash
# Development
npm run docker:dev           # Start all services (foreground)
npm run docker:dev:build     # Rebuild and start
npm run docker:dev:down      # Stop all services
npm run docker:dev:clean     # Stop and remove all data volumes

# Production
npm run docker:prod          # Start production build
npm run docker:prod:build    # Rebuild production and start

# Utilities
npm run docker:logs          # Follow web app logs
npm run docker:shell         # Open shell in web container

# Manual commands
docker-compose ps            # List running services
docker-compose logs -f       # Follow all logs
docker-compose exec web sh   # Shell into web container
docker-compose restart web   # Restart web service
```

## Configuration

### Environment Variables

**Default Behavior:**
Docker Compose uses secure default passwords defined in [docker-compose.yml](docker-compose.yml). For local development, these work fine out of the box:

- Database: `qastudio_dev_password`
- Redis: `qastudio_redis_pass`
- MinIO: `qastudio` / `qastudio_minio_pass`
- Session: `dev_secret_change_me_in_production`

**To Customize (Optional):**

Create a `.env` file in the project root:

```bash
# Option 1: Copy from template
cp .env.docker .env

# Option 2: Create manually
cat > .env << 'EOF'
# Database
DB_PASSWORD=your_custom_password

# Redis
REDIS_PASSWORD=your_redis_password

# MinIO
MINIO_USER=qastudio
MINIO_PASSWORD=your_minio_password

# Session (CHANGE IN PRODUCTION!)
SESSION_SECRET=dev_secret_change_me_in_production
EOF
```

**Important:**

- `.env` is already in `.gitignore` - safe to use
- `.env.docker` is just a template - Docker doesn't use it directly
- For production, **always** create `.env` with secure random passwords

### MinIO Setup (Object Storage)

MinIO provides S3-compatible storage for test attachments (screenshots, videos, logs).

**Access the Console:**

1. Visit http://localhost:9001
2. Login with credentials from `.env.docker`:
    - Username: `qastudio`
    - Password: `qastudio_minio_pass`

**Bucket:** `qastudio` (auto-created on first run)

### MailHog Setup (Email Testing)

MailHog captures all outbound emails from QA Studio.

**Access the UI:**

1. Visit http://localhost:8025
2. View all emails sent by the application
3. Perfect for testing password reset, notifications, etc.

**SMTP Server:** All emails sent to `mailhog:1025` are captured automatically.

## Development Workflow

### First Time Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd qa-studio

# 2. Start Docker services
npm run docker:dev:build

# 3. Access the app
open http://localhost:3000
```

The database will be automatically migrated on first run.

### Daily Development

```bash
# Start services (uses cached images)
npm run docker:dev

# Make code changes - hot reload is enabled!
# Edit files in src/ and see changes instantly

# Stop services when done
# Press Ctrl+C or in another terminal:
npm run docker:dev:down
```

### Working with the Database

```bash
# Shell into web container
npm run docker:shell

# Run Prisma commands
npx prisma studio           # Open Prisma Studio
npx prisma migrate dev      # Create new migration
npx prisma db seed          # Seed database
npx prisma db push          # Push schema changes
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 web
```

## Troubleshooting

### Port Conflicts

If ports are already in use, modify [docker-compose.yml](docker-compose.yml):

```yaml
services:
    web:
        ports:
            - '3001:3000' # Change 3000 -> 3001
```

### Reset Everything

```bash
# Stop and remove all data
npm run docker:dev:clean

# Rebuild from scratch
npm run docker:dev:build
```

### Database Issues

```bash
# Reset database and migrations
npm run docker:dev:clean
npm run docker:dev:build

# Or manually reset
docker-compose down -v
docker volume rm qastudio_postgres-data
npm run docker:dev:build
```

### Permission Issues (Linux)

If you encounter permission errors on Linux:

```bash
# Fix ownership of node_modules
docker-compose exec web chown -R node:node /app/node_modules

# Or run as root (not recommended for production)
# Edit Dockerfile and remove "USER nodejs" line
```

### Container Won't Start

```bash
# Check service health
docker-compose ps

# View specific service logs
docker-compose logs postgres
docker-compose logs redis

# Restart a specific service
docker-compose restart postgres
```

## Production Deployment

For production, use the production compose file:

```bash
# Build and start production
npm run docker:prod:build

# Production uses:
# - Optimized production build
# - No source code mounting
# - Compiled assets only
```

**Important for Production:**

1. Change all passwords in `.env`
2. Generate secure `SESSION_SECRET`: `openssl rand -base64 32`
3. Use HTTPS reverse proxy (nginx, Traefik, Caddy)
4. Set up backups for volumes
5. Consider managed services for database/redis

## Architecture

### Development Mode

```
┌─────────────────────────────────────────────┐
│  Docker Compose                             │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │ │
│  │  :5432   │  │  :6379   │  │ :9000/01 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │             │        │
│  ┌────┴─────────────┴─────────────┴─────┐ │
│  │  SvelteKit Dev Server                │ │
│  │  :3000 (hot reload)                  │ │
│  │  Source mounted from ./              │ │
│  └──────────────────────────────────────┘ │
│                                             │
│  ┌──────────────────────────────────────┐ │
│  │  MailHog :1025/:8025                 │ │
│  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Production Mode

```
┌─────────────────────────────────────────────┐
│  Docker Compose                             │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │             │        │
│  ┌────┴─────────────┴─────────────┴─────┐ │
│  │  SvelteKit Production                │ │
│  │  Pre-built, optimized                │ │
│  │  No source mounting                  │ │
│  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Data Persistence

All data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep qastudio

# Backup a volume
docker run --rm -v qastudio_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore a volume
docker run --rm -v qastudio_postgres-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

## Migrating from Vercel

If you're currently running on Vercel and want to self-host:

1. **Export your database:**

    ```bash
    # From your Vercel Postgres
    pg_dump $DATABASE_URL > backup.sql
    ```

2. **Start Docker environment:**

    ```bash
    npm run docker:dev:build
    ```

3. **Import data:**

    ```bash
    # Copy backup into container
    docker cp backup.sql qastudio-postgres:/tmp/

    # Import
    docker-compose exec postgres psql -U qastudio -d qastudio -f /tmp/backup.sql
    ```

4. **Done!** Your data is now in the local Docker environment.

## Hybrid Deployment

You can mix and match! Use Docker for some services and cloud for others:

```yaml
# docker-compose.yml - only run database locally
services:
    postgres:
        # ... keep this

    # Comment out web service, run locally instead
    # web:
    #   ...
```

Then update `.env`:

```bash
# Local database
DATABASE_URL=postgresql://qastudio:pass@localhost:5432/qastudio

# Cloud services (optional)
REDIS_URL=rediss://...upstash.io
S3_ENDPOINT=https://...r2.cloudflarestorage.com
```

## Next Steps

- [ ] Set up CI/CD for Docker builds
- [ ] Add mail-service for email testing API
- [ ] Add sms-service for SMS testing API
- [ ] Set up Kubernetes configs for cloud deployment
- [ ] Add monitoring (Prometheus + Grafana)
- [ ] Add backup automation

## Support

For issues or questions:

- Check logs: `npm run docker:logs`
- Reset everything: `npm run docker:dev:clean && npm run docker:dev:build`
- Open an issue on GitHub
