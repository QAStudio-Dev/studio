# Multi-Tenant SSO Implementation

## Overview

QA Studio now supports **multi-tenant SSO configuration**, allowing each enterprise customer to configure their own SSO provider (Okta, Google Workspace, Azure AD, etc.) without sharing credentials with the platform owner.

This implementation provides:

- **Data Sovereignty**: Each team manages their own SSO credentials
- **Zero External Dependencies**: DIY OIDC implementation using only Node.js built-ins
- **Domain-Based Auto-Detection**: Users automatically routed to their team's SSO based on email domain
- **Secure Storage**: SSO credentials encrypted at rest using AES-256-GCM

## Architecture

### Database Schema

Team SSO configuration is stored in the `Team` model:

```prisma
model Team {
  // ... existing fields

  // SSO Configuration
  ssoEnabled      Boolean @default(false)
  ssoProvider     String?  // 'okta', 'google', 'azure', etc.
  ssoClientId     String?  // OAuth Client ID
  ssoClientSecret String?  // OAuth Client Secret (encrypted)
  ssoIssuer       String?  // OIDC Issuer URL
  ssoDomains      String[] // Email domains that trigger SSO

  @@index([ssoEnabled])
  @@index([ssoProvider])
}
```

### Key Components

#### 1. OIDC Registry ([src/lib/server/oidc/registry.ts](../src/lib/server/oidc/registry.ts))

The registry supports both environment variable configuration (global) and database configuration (per-team):

```typescript
// Get provider with optional team-specific config
const provider = await getProvider('okta', teamId);

// Auto-detect SSO by email domain
const teamSso = await getTeamByEmailDomain('user@acme.com');
// Returns: { teamId: 'xxx', provider: 'okta' }
```

#### 2. SSO Configuration API ([src/routes/api/teams/[teamId]/sso/+server.ts](../src/routes/api/teams/[teamId]/sso/+server.ts))

Team admins can configure SSO via REST API:

- `GET /api/teams/:teamId/sso` - Get current configuration
- `POST /api/teams/:teamId/sso` - Create/update configuration
- `DELETE /api/teams/:teamId/sso` - Disable SSO

#### 3. SSO Settings UI ([src/routes/teams/[teamId]/settings/sso/+page.svelte](../src/routes/teams/[teamId]/settings/sso/+page.svelte))

User-friendly interface for team admins to:

- Enable/disable SSO
- Select provider (Okta, Google)
- Configure OAuth credentials
- Manage email domains
- View setup instructions

#### 4. Domain-Based Detection ([src/routes/api/auth/detect-sso/+server.ts](../src/routes/api/auth/detect-sso/+server.ts))

Login page can detect SSO requirements:

```typescript
POST /api/auth/detect-sso
Body: { email: 'user@acme.com' }
Response: { hasSso: true, provider: 'okta', teamId: 'xxx' }
```

## User Flow

### Team Admin: Configure SSO

1. Navigate to `/teams/:teamId/settings/sso`
2. Enable SSO toggle
3. Select provider (Okta or Google)
4. Enter OAuth credentials:
    - Client ID
    - Client Secret (encrypted before storage)
    - Issuer URL
5. Add email domains (e.g., `acme.com`)
6. Save configuration

### End User: Login with SSO

**Option 1: Direct SSO Link**

```
/api/auth/sso/okta?teamId=xxx
```

**Option 2: Auto-Detection** (recommended)

1. User enters email on login page
2. Frontend calls `/api/auth/detect-sso`
3. If SSO configured for domain, redirect to SSO provider
4. Otherwise, show password field

**OAuth Flow:**

1. User redirected to SSO provider
2. User authenticates with provider
3. Provider redirects back to `/api/auth/sso/okta/callback`
4. Backend verifies ID token and creates session
5. User logged in to QA Studio

## Security Features

### 1. Encrypted Storage

SSO client secrets are encrypted using AES-256-GCM before storage:

```typescript
import { encrypt, decrypt } from '$lib/server/encryption';

// Store
const encryptedSecret = encrypt(clientSecret);
await db.team.update({
  data: { ssoClientSecret: encryptedSecret }
});

// Retrieve
const team = await db.team.findUnique(...);
const clientSecret = decrypt(team.ssoClientSecret);
```

Requires `ENCRYPTION_KEY` environment variable (32 bytes, hex-encoded).

### 2. CSRF Protection

State parameter validation prevents CSRF attacks:

```typescript
// Initiation: store random state
cookies.set(`oauth_state_${provider}`, state);

// Callback: verify state matches
if (state !== storedState) {
	throw error(400, 'Invalid state - possible CSRF');
}
```

### 3. Replay Attack Prevention

Nonce validation prevents token replay:

```typescript
// ID token must include matching nonce
await verifyJWT(idToken, jwks, {
	issuer: config.issuer,
	audience: config.clientId,
	nonce: storedNonce // Must match
});
```

### 4. JWT Signature Verification

ID tokens are cryptographically verified using provider's JWKS:

```typescript
// Fetch public keys from provider
const jwks = await fetchJWKS(discovery.jwks_uri);

// Verify signature, expiration, issuer, audience
const payload = await verifyJWT(idToken, jwks, {
	issuer: 'https://company.okta.com/oauth2/default',
	audience: 'client-id'
});
```

### 5. Role-Based Access Control

Only team admins/owners can configure SSO:

```typescript
const user = await db.user.findUnique({ where: { id: userId } });
if (user?.teamId !== teamId || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
	throw error(403, 'Only team admins can configure SSO');
}
```

## Configuration Examples

### Okta Setup

1. **Create Okta Application**
    - Log in to Okta Admin Console
    - Applications → Create App Integration
    - Select "OIDC - OpenID Connect" and "Web Application"

2. **Configure Redirect URI**

    ```
    https://your-domain.com/api/auth/sso/okta/callback
    ```

3. **Copy Credentials**
    - Client ID: `0oa...xyz`
    - Client Secret: `secret...`
    - Issuer: `https://company.okta.com/oauth2/default`

4. **Add to QA Studio**
    - Go to team settings → SSO
    - Enable SSO
    - Provider: Okta
    - Enter credentials
    - Add email domains: `company.com`

### Google Workspace Setup

1. **Create Google Cloud Project**
    - Go to Google Cloud Console
    - Create or select project
    - Enable Google+ API

2. **Create OAuth Client**
    - Credentials → Create OAuth 2.0 Client ID
    - Application type: Web application

3. **Configure Redirect URI**

    ```
    https://your-domain.com/api/auth/sso/google/callback
    ```

4. **Copy Credentials**
    - Client ID: `123...apps.googleusercontent.com`
    - Client Secret: `GOCSPX-...`
    - Issuer: `https://accounts.google.com` (always)

5. **Add to QA Studio**
    - Go to team settings → SSO
    - Enable SSO
    - Provider: Google
    - Enter credentials
    - Add email domains: `company.com`

## Environment Variables

### Required (Platform-Wide)

```bash
# Encryption key for SSO secrets (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=64_character_hex_string

# Base URL for OAuth callbacks
PUBLIC_BASE_URL=https://your-domain.com
```

### Optional (Global Fallback)

For single-tenant deployments, you can still use environment variables:

```bash
# Okta
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default

# Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

If environment variables are set, they serve as a fallback when team-specific SSO is not configured.

## API Reference

### Get SSO Configuration

```http
GET /api/teams/:teamId/sso
Authorization: Required (team member)

Response:
{
  "teamId": "xxx",
  "teamName": "Acme Corp",
  "ssoEnabled": true,
  "ssoProvider": "okta",
  "ssoClientId": "0oa...xyz",
  "ssoIssuer": "https://acme.okta.com/oauth2/default",
  "ssoDomains": ["acme.com", "acme.co"]
}
```

### Configure SSO

```http
POST /api/teams/:teamId/sso
Authorization: Required (team admin/owner)
Content-Type: application/json

Body:
{
  "ssoEnabled": true,
  "ssoProvider": "okta",
  "ssoClientId": "0oa...xyz",
  "ssoClientSecret": "secret...",
  "ssoIssuer": "https://acme.okta.com/oauth2/default",
  "ssoDomains": ["acme.com"]
}

Response:
{
  "success": true,
  "teamId": "xxx",
  "ssoEnabled": true,
  ...
}
```

### Disable SSO

```http
DELETE /api/teams/:teamId/sso
Authorization: Required (team admin/owner)

Response:
{
  "success": true,
  "message": "SSO disabled for team"
}
```

### Detect SSO by Email

```http
POST /api/auth/detect-sso
Content-Type: application/json

Body:
{
  "email": "user@acme.com"
}

Response:
{
  "hasSso": true,
  "provider": "okta",
  "teamId": "xxx"
}
```

### Initiate SSO Login

```http
GET /api/auth/sso/:provider?teamId=xxx
Response: 302 Redirect to SSO provider
```

### SSO Callback

```http
GET /api/auth/sso/:provider/callback?code=xxx&state=xxx
Response: 302 Redirect to / (logged in)
```

## Migration from Environment Variables

If you're currently using environment variables for SSO, you can:

1. **Continue using environment variables** - They work as a global fallback
2. **Migrate to database** - Configure SSO per team for multi-tenancy

To migrate:

1. Team admin goes to `/teams/:teamId/settings/sso`
2. Enters same credentials from environment variables
3. Team-specific config takes precedence over env vars

## Testing

### Unit Tests

```bash
npm test src/lib/server/oidc/
```

Tests cover:

- JWT decoding and verification
- OIDC provider discovery and token exchange
- Provider name validation

### Manual Testing

1. **Setup Test Team**

    ```sql
    UPDATE "Team" SET
      "ssoEnabled" = true,
      "ssoProvider" = 'okta',
      "ssoClientId" = 'test-client-id',
      "ssoClientSecret" = '<encrypted>',
      "ssoIssuer" = 'https://test.okta.com',
      "ssoDomains" = ARRAY['test.com']
    WHERE id = 'team-id';
    ```

2. **Test Auto-Detection**

    ```bash
    curl -X POST http://localhost:5173/api/auth/detect-sso \
      -H "Content-Type: application/json" \
      -d '{"email":"user@test.com"}'
    ```

3. **Test SSO Flow**
    - Visit `/api/auth/sso/okta?teamId=xxx`
    - Should redirect to Okta
    - Complete auth
    - Should redirect back and create session

## Troubleshooting

### Issue: "SSO is not configured"

**Cause**: No SSO configuration found for team or provider

**Fix**: Check database:

```sql
SELECT "ssoEnabled", "ssoProvider", "ssoClientId", "ssoIssuer"
FROM "Team" WHERE id = 'team-id';
```

### Issue: "Invalid state parameter"

**Cause**: CSRF token mismatch (cookies cleared or browser issue)

**Fix**: Start SSO flow again

### Issue: "Token expired"

**Cause**: ID token expiration timestamp is in the past

**Fix**: Check server time synchronization (NTP)

### Issue: "Invalid JWT signature"

**Cause**: Wrong JWKS or provider configuration

**Fix**: Verify issuer URL matches provider's discovery document

### Issue: "ENCRYPTION_KEY environment variable is not set"

**Cause**: Missing encryption key

**Fix**: Generate and set:

```bash
openssl rand -hex 32
export ENCRYPTION_KEY=<generated_key>
```

## Future Enhancements

Potential improvements:

- **Azure AD Support**: Add Azure AD as a provider option
- **SAML Support**: Implement SAML 2.0 in addition to OIDC
- **Just-in-Time Provisioning**: Auto-create teams from SSO attributes
- **Group Mapping**: Map SSO groups to QA Studio roles
- **Session Management**: Show active SSO sessions in UI
- **Audit Logs**: Track SSO configuration changes

## References

- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [Okta OIDC Documentation](https://developer.okta.com/docs/guides/sign-into-web-app/)
- [Google OIDC Documentation](https://developers.google.com/identity/protocols/oauth2/openid-connect)
