# API Keys Setup Guide

## Overview
API keys allow external tools (like Playwright reporters, CI/CD pipelines) to authenticate with QA Studio's API without requiring user sessions.

## Database Migration

Run the Prisma migration to add the ApiKey model:

```bash
npx prisma migrate dev --name add_api_keys
```

Or if you want to just push the schema changes:

```bash
npx prisma db push
```

## Features

### 1. API Key Management UI
- **Location**: `/settings/api-keys`
- Users can:
  - Create new API keys with custom names
  - Set expiration dates (optional)
  - View all their API keys (only prefix shown)
  - See last used date
  - Delete API keys

### 2. API Key Security
- Keys are hashed using SHA-256 before storage
- Full key is only shown once during creation
- Keys have format: `qas_<32-random-chars>`
- Only first 12 characters (prefix) stored for display
- Optional expiration dates

### 3. API Authentication
Two authentication methods supported:

#### Session Auth (Browser/Web)
```typescript
// Already handled by Clerk
```

#### API Key Auth (Programmatic)
```bash
curl https://your-domain.com/api/test-results \
  -H "Authorization: Bearer qas_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"data": "..."}'
```

## Using API Keys in Routes

### For routes that need authentication:

```typescript
import { requireApiAuth } from '$lib/server/api-auth';

export const POST: RequestHandler = async (event) => {
    // Works with both session and API key
    const userId = await requireApiAuth(event);

    // ... rest of your logic
};
```

### For routes with optional authentication:

```typescript
import { optionalApiAuth } from '$lib/server/api-auth';

export const GET: RequestHandler = async (event) => {
    const userId = await optionalApiAuth(event);

    if (userId) {
        // Authenticated request
    } else {
        // Anonymous request
    }
};
```

## Example: Playwright Reporter Integration

```typescript
// In your Playwright reporter
class QAStudioReporter {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl;
    }

    async sendResults(results) {
        const response = await fetch(`${this.apiUrl}/test-results`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(results)
        });

        return response.json();
    }
}
```

## API Endpoints

### List API Keys
```http
GET /api/api-keys/list
Authorization: Bearer <session-or-api-key>
```

### Create API Key
```http
POST /api/api-keys/create
Authorization: Bearer <session-or-api-key>
Content-Type: application/json

{
  "name": "CI/CD Pipeline",
  "expiresInDays": 90  // optional
}
```

Response includes the full key (only time it's returned):
```json
{
  "apiKey": {
    "id": "...",
    "name": "CI/CD Pipeline",
    "prefix": "qas_1234...",
    "expiresAt": "2024-06-01T00:00:00.000Z",
    "createdAt": "2024-03-01T00:00:00.000Z"
  },
  "key": "qas_full_key_here"  // Save this!
}
```

### Delete API Key
```http
DELETE /api/api-keys/{keyId}/delete
Authorization: Bearer <session-or-api-key>
```

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Add to `.gitignore`

2. **Set expiration dates**
   - Especially for temporary integrations
   - Rotate keys periodically

3. **Use descriptive names**
   - Helps identify where each key is used
   - Easier to revoke when needed

4. **Monitor usage**
   - Check "last used" dates
   - Remove unused keys

5. **Limit key access**
   - One key per integration
   - Revoke immediately if compromised

## Environment Variables Example

```bash
# .env
QA_STUDIO_API_KEY=qas_your_key_here
QA_STUDIO_API_URL=https://qastudio.com/api
QA_STUDIO_PROJECT_ID=abc123
```

## Accessing Settings Page

Users can access API key management at:
- Direct URL: `https://your-domain.com/settings/api-keys`
- Or add a link in your user menu/settings

## Implementation Files

- **Schema**: `prisma/schema.prisma` (ApiKey model)
- **API Utils**: `src/lib/server/api-keys.ts`
- **Auth Helper**: `src/lib/server/api-auth.ts`
- **API Routes**:
  - `src/routes/api/api-keys/list/+server.ts`
  - `src/routes/api/api-keys/create/+server.ts`
  - `src/routes/api/api-keys/[keyId]/delete/+server.ts`
- **Settings Page**:
  - `src/routes/settings/api-keys/+page.server.ts`
  - `src/routes/settings/api-keys/+page.svelte`
