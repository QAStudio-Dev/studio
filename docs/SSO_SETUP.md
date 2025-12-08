# SSO Setup Guide

QA Studio supports enterprise SSO via **Okta** and **Google Workspace** using a self-hosted OIDC implementation with zero external auth dependencies.

## Features

✅ **Zero Auth Dependencies** - Built with Node.js crypto only (no Auth.js, no Passport)
✅ **Okta Support** - Enterprise SSO for organizations
✅ **Google Workspace** - Quick setup for Google users
✅ **Auto-Provisioning** - Users created automatically on first login
✅ **Password Linking** - Existing password users can link to SSO
✅ **Data Sovereignty** - All auth logic runs on your infrastructure

## Architecture

- **OIDC Authorization Code Flow** - Industry-standard OAuth 2.0 / OpenID Connect
- **JWT Verification** - RSA-SHA256 signature validation using JWKS
- **Session Management** - Reuses existing secure session infrastructure
- **CSRF Protection** - State parameter validation
- **Replay Protection** - Nonce validation

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Base URL for OAuth callbacks
PUBLIC_BASE_URL=https://yourdomain.com

# Okta SSO (Optional)
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
OKTA_ISSUER=https://your-domain.okta.com/oauth2/default

# Google SSO (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

At least one provider must be configured for SSO to work.

## Okta Setup

### 1. Create Okta Application

1. Log into your Okta admin panel
2. Go to **Applications** → **Create App Integration**
3. Select:
    - **Sign-in method**: OIDC - OpenID Connect
    - **Application type**: Web Application

### 2. Configure Application

**General Settings:**

- **App integration name**: QA Studio
- **Grant type**: Authorization Code
- **Sign-in redirect URIs**: `https://yourdomain.com/api/auth/sso/okta/callback`
- **Sign-out redirect URIs**: `https://yourdomain.com/login`

**Assignments:**

- Assign users or groups who can access QA Studio

### 3. Get Credentials

From the application page:

- Copy **Client ID** → `OKTA_CLIENT_ID`
- Copy **Client Secret** → `OKTA_CLIENT_SECRET`
- Copy **Issuer URL** (from Security → API → Authorization Servers) → `OKTA_ISSUER`

Example issuer: `https://dev-12345.okta.com/oauth2/default`

## Google Workspace Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API** (for user info)

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (for Workspace) or **External**
3. Fill in:
    - **App name**: QA Studio
    - **User support email**: your email
    - **Authorized domains**: yourdomain.com
    - **Developer contact**: your email
4. Add scopes:
    - `openid`
    - `email`
    - `profile`

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `https://yourdomain.com/api/auth/sso/google/callback`
5. Copy:
    - **Client ID** → `GOOGLE_CLIENT_ID`
    - **Client Secret** → `GOOGLE_CLIENT_SECRET`

## Testing Locally

For local development, use `http://localhost:5173` as the base URL:

```env
PUBLIC_BASE_URL=http://localhost:5173
```

Configure OAuth providers with callback:

- Okta: `http://localhost:5173/api/auth/sso/okta/callback`
- Google: `http://localhost:5173/api/auth/sso/google/callback`

**Note**: Some providers may require verified domains. For testing, use `localhost` or ngrok.

## User Flow

### First-Time SSO Login

1. User clicks "Sign in with Okta" or "Sign in with Google"
2. Redirected to SSO provider
3. User authenticates with provider
4. Provider redirects back to QA Studio callback
5. New user auto-provisioned with:
    - Email from SSO
    - Name from SSO
    - Default role: TESTER
    - `ssoProvider`: 'okta' or 'google'
    - `passwordHash`: NULL
6. Session created, user logged in

### Existing Password User Linking

1. User with existing password account uses SSO for first time
2. System detects matching email
3. Account linked to SSO:
    - `ssoProvider` updated
    - `ssoProviderId` set
    - `emailVerified` set to true
4. User can now login via SSO **or** password

### Returning SSO User

1. User clicks SSO button
2. Provider authenticates
3. System finds user by `ssoProvider` + `ssoProviderId`
4. Session created, user logged in

## Security Features

### CSRF Protection

- State parameter generated with 256 bits of entropy
- Stored in HTTP-only cookie
- Validated on callback

### Replay Attack Prevention

- Nonce parameter generated per request
- Validated in ID token
- Prevents token reuse

### JWT Signature Verification

- Fetches JWKS from provider
- Verifies RSA-SHA256 signature
- Validates issuer, audience, expiration

### Secure Sessions

- Reuses existing session management
- HTTP-only cookies
- HMAC token hashing
- 30-day expiry

## Troubleshooting

### "Provider not configured" Error

**Problem**: Missing environment variables

**Solution**: Verify all required env vars are set:

```bash
# Check if vars are loaded
echo $OKTA_CLIENT_ID
echo $GOOGLE_CLIENT_ID
```

### "Invalid state parameter" Error

**Problem**: CSRF validation failed

**Possible causes**:

1. Cookie not set (check browser allows cookies)
2. State cookie expired (10 minute timeout)
3. Multiple tabs/requests interfering

**Solution**: Clear cookies and try again

### "Invalid nonce" Error

**Problem**: Nonce mismatch (replay attack protection)

**Possible causes**:

1. Nonce cookie not found
2. Token replay attempt
3. Clock skew between systems

**Solution**: Check system time synchronization

### "No matching key found for kid" Error

**Problem**: JWT key ID not in JWKS

**Possible causes**:

1. Provider rotated keys
2. Wrong issuer URL
3. JWKS cache stale

**Solution**: Wait 1 hour for cache to expire or restart server

### "User email already linked to different provider" Error

**Problem**: User trying to login with different SSO provider

**Example**: User signed up with Okta, now trying Google with same email

**Solution**: Use original login method or contact admin to unlink account

## Adding More Providers

To add Azure AD, Auth0, or other OIDC providers:

1. Add env vars to [src/lib/server/oidc/registry.ts](src/lib/server/oidc/registry.ts):

```typescript
azuread: () => {
	const clientId = env.AZURE_CLIENT_ID;
	const clientSecret = env.AZURE_CLIENT_SECRET;
	const tenantId = env.AZURE_TENANT_ID;

	if (!clientId || !clientSecret || !tenantId) return null;

	return {
		clientId,
		clientSecret,
		issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
		redirectUri: `${getBaseUrl()}/api/auth/sso/azuread/callback`
	};
};
```

2. Update `ProviderName` type:

```typescript
export type ProviderName = 'okta' | 'google' | 'azuread';
```

3. Add button to [src/routes/login/+page.svelte](src/routes/login/+page.svelte)

4. API routes automatically support new provider via dynamic routing

## Enterprise Features (Future)

Potential enhancements for enterprise customers:

- **Domain-based auto-provisioning**: Auto-assign users to teams by email domain
- **Role mapping**: Map Okta groups to QA Studio roles
- **SCIM**: Automated user provisioning/deprovisioning
- **SAML support**: For legacy enterprise IdPs
- **Multi-tenant**: Per-organization SSO configuration
- **Just-in-Time provisioning**: Custom attribute mapping

## Files Created

### Core OIDC Implementation

- `src/lib/server/oidc/jwt.ts` - JWT decoder & verifier (zero dependencies)
- `src/lib/server/oidc/provider.ts` - OIDC provider client
- `src/lib/server/oidc/registry.ts` - Provider configuration

### API Routes

- `src/routes/api/auth/sso/[provider]/+server.ts` - SSO initiation
- `src/routes/api/auth/sso/[provider]/callback/+server.ts` - SSO callback

### Database

- Migration `20251208_add_sso_fields` adds:
    - `User.ssoProvider` (TEXT)
    - `User.ssoProviderId` (TEXT)
    - Index on `(ssoProvider, ssoProviderId)`

### UI

- Updated `src/routes/login/+page.svelte` with SSO buttons

## Migration Notes

If upgrading from Clerk or another auth provider:

1. Existing users with passwords continue to work
2. SSO can be linked to existing accounts by matching email
3. New users can be created via SSO
4. No data migration required - SSO fields default to NULL

## Support

For issues or questions:

- Check application logs for detailed error messages
- Verify OAuth callback URLs match exactly
- Test with provider's debug console
- Ensure system clocks are synchronized (NTP)

## Dependencies

**None** for auth logic! Only standard Node.js:

- `crypto` - JWT verification, HMAC hashing
- `fetch` - OIDC discovery, token exchange

All auth code is self-contained and auditable.
