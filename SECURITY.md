# Security Guide

This document outlines the security measures implemented in QA Studio and provides guidance for maintaining a secure deployment.

## Table of Contents

- [Authentication Security](#authentication-security)
- [CSRF Protection](#csrf-protection)
- [Rate Limiting](#rate-limiting)
- [Environment Variables](#environment-variables)
- [Session Management](#session-management)
- [Password Reset Security](#password-reset-security)
- [Production Deployment Checklist](#production-deployment-checklist)
- [Future Improvements](#future-improvements)

## Authentication Security

### Password Hashing

- **Algorithm**: bcrypt with 12 rounds (OWASP 2025 recommended)
- **Implementation**: [src/lib/server/crypto.ts](src/lib/server/crypto.ts)
- **Note**: Bcrypt automatically handles salting and is resistant to timing attacks

### Password Requirements

Enforced on signup, password reset, and password setup:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Session Tokens

- **Generation**: Cryptographically secure random tokens (32 bytes)
- **Storage**: HMAC-SHA256 hashed in database
- **Transmission**: HTTP-only cookies (prevents XSS theft)
- **Validation**: Constant-time comparison (prevents timing attacks)
- **Expiry**: 30 days, automatically cleaned up every 6 hours

## CSRF Protection

### Implementation

All state-changing authentication endpoints validate CSRF tokens:

- Login: [src/routes/api/auth/login/+server.ts](src/routes/api/auth/login/+server.ts)
- Signup: [src/routes/api/auth/signup/+server.ts](src/routes/api/auth/signup/+server.ts)
- Setup Password: [src/routes/api/auth/setup-password/+server.ts](src/routes/api/auth/setup-password/+server.ts)
- Request Reset: [src/routes/api/auth/request-reset/+server.ts](src/routes/api/auth/request-reset/+server.ts)
- Reset Password: [src/routes/api/auth/reset-password/+server.ts](src/routes/api/auth/reset-password/+server.ts)

### How It Works

1. Server generates CSRF token on session creation
2. Token stored in non-httpOnly cookie (client can read)
3. Client includes token in request body for state-changing operations
4. Server validates cookie token matches submitted token
5. Request rejected if tokens don't match (403 Forbidden)

### Frontend Integration

When making authentication API calls, include the CSRF token:

```typescript
// Read CSRF token from cookie
const csrfToken = document.cookie
	.split('; ')
	.find((row) => row.startsWith('qa_studio_csrf='))
	?.split('=')[1];

// Include in request
await fetch('/api/auth/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		email: 'user@example.com',
		password: 'password123',
		csrfToken // <-- Include this
	})
});
```

## Rate Limiting

### Current Implementation

**Location**: [src/routes/api/auth/login/+server.ts](src/routes/api/auth/login/+server.ts)

**Limitations**:

- In-memory storage (resets on server restart)
- Not suitable for multi-instance deployments
- No automatic cleanup (Map grows indefinitely)

**Rules**:

- 5 login attempts per email address
- 15-minute cooldown period
- Counter reset on successful login

### Production Recommendations

For production deployments, especially with multiple server instances, migrate to **Redis-based rate limiting**:

#### Option 1: Upstash Redis (Recommended for Vercel)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
	redis: Redis.fromEnv(),
	limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
	analytics: true
});

// In login endpoint
const { success } = await ratelimit.limit(email);
if (!success) {
	throw error(429, {
		message: 'Too many login attempts. Please try again in 15 minutes.'
	});
}
```

**Setup**:

1. Add dependency: `npm install @upstash/ratelimit @upstash/redis`
2. Create Redis instance in Vercel Dashboard → Storage → Redis
3. Environment variables automatically configured

#### Option 2: Generic Redis

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redisClient = new Redis({
	host: process.env.REDIS_HOST,
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD
});

const rateLimiter = new RateLimiterRedis({
	storeClient: redisClient,
	keyPrefix: 'login',
	points: 5, // 5 attempts
	duration: 900 // 15 minutes in seconds
});

// In login endpoint
try {
	await rateLimiter.consume(email);
} catch (err) {
	throw error(429, {
		message: 'Too many login attempts. Please try again in 15 minutes.'
	});
}
```

**Setup**:

1. Add dependencies: `npm install rate-limiter-flexible ioredis`
2. Configure Redis connection in environment variables
3. Update login endpoint to use rate limiter

### Rate Limiting Best Practices

- **Different limits for different endpoints**: Login (5/15m), Signup (3/hour), Password Reset (3/hour)
- **IP-based limiting**: Add IP-based rate limiting for additional protection
- **Gradual backoff**: Increase cooldown period for repeated violations
- **Monitoring**: Log rate limit hits for security monitoring
- **User feedback**: Provide clear error messages with retry timing

## Environment Variables

### Required Secrets

All security-critical environment variables are validated at server startup (see [src/lib/server/env.ts](src/lib/server/env.ts)).

#### SESSION_SECRET

- **Purpose**: HMAC signing of session tokens
- **Required**: Yes (production will not start without it)
- **Generate**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **Security**: Must be cryptographically random, never commit to version control

#### RESET_SECRET

- **Purpose**: HMAC signing of password reset tokens
- **Required**: No (falls back to SESSION_SECRET)
- **Recommended**: Use separate value in production
- **Generate**: Same as SESSION_SECRET

#### CRON_SECRET

- **Purpose**: Protect cron job endpoints from unauthorized access
- **Required**: Yes (for cleanup jobs to run)
- **Generate**: Same as SESSION_SECRET
- **Used by**: [src/routes/api/cron/cleanup-sessions/+server.ts](src/routes/api/cron/cleanup-sessions/+server.ts)

### Environment Validation

The server validates environment variables at startup:

```typescript
// src/hooks.server.ts
import { validateEnvironment } from '$lib/server/env';

// Validates all security-critical environment variables
validateEnvironment();
```

**Behavior**:

- **Development**: Allows defaults with warnings
- **Production**: Requires actual values, rejects defaults, fails fast

## Session Management

### Session Lifecycle

1. **Creation**: User logs in → session token generated → stored in database + cookie
2. **Validation**: Each request → validate session ID + token → retrieve user ID
3. **Expiration**: Sessions expire after 30 days
4. **Cleanup**: Automated cron job removes expired sessions every 6 hours

### Session Storage

- **Database**: PostgreSQL via Prisma ORM
- **Table**: `Session` model
- **Indexes**: `id` (primary key), `userId` (foreign key), `expiresAt` (for cleanup)
- **Token Security**: Only HMAC hash stored, not the actual token

### Session Cookies

```typescript
{
  path: '/',
  httpOnly: true,           // Prevents JavaScript access (XSS protection)
  sameSite: 'lax',         // CSRF protection
  secure: true,            // HTTPS only (production)
  maxAge: 2592000          // 30 days in seconds
}
```

### Session Operations

- **Create**: [src/lib/server/sessions.ts](src/lib/server/sessions.ts) → `createSession()`
- **Validate**: [src/lib/server/sessions.ts](src/lib/server/sessions.ts) → `validateSession()`
- **Delete**: [src/lib/server/sessions.ts](src/lib/server/sessions.ts) → `deleteSession()`
- **Cleanup**: [src/lib/server/sessions.ts](src/lib/server/sessions.ts) → `cleanupExpiredSessions()`

## Password Reset Security

### Token Generation

- **Token**: 32-byte cryptographically secure random
- **Storage**: HMAC-SHA256 hashed in database
- **Expiry**: 1 hour
- **Single Use**: Marked as used after successful reset

### Reset Flow

1. User requests reset → token generated → email sent (TODO: implement)
2. User clicks link → validates token → sets new password
3. Token marked as used → all sessions invalidated → user must re-login

### Security Measures

- **Timing-safe validation**: Constant-time comparison prevents timing attacks
- **User enumeration prevention**: Always return success (don't reveal if user exists)
- **Token format**: `tokenId:token` prevents database enumeration
- **Session invalidation**: Force re-login after password reset
- **Cleanup**: Expired/used tokens removed every 6 hours

## Production Deployment Checklist

Before deploying to production, ensure:

### Required Environment Variables

- [ ] `SESSION_SECRET` set to cryptographically random value
- [ ] `RESET_SECRET` set (or confirmed SESSION_SECRET fallback is acceptable)
- [ ] `CRON_SECRET` set for cleanup job authentication
- [ ] All default values removed from environment

### Security Configuration

- [ ] HTTPS enabled (required for secure cookies)
- [ ] CSRF protection tested and working
- [ ] Rate limiting tested (consider Redis migration for scaling)
- [ ] Session cleanup cron job verified in Vercel dashboard
- [ ] Password requirements enforced on all endpoints

### Monitoring & Logging

- [ ] Rate limit violations logged
- [ ] Failed authentication attempts logged
- [ ] Cron job execution logged
- [ ] Environment validation warnings reviewed

### Email Configuration (TODO)

- [ ] Configure email service for password reset
- [ ] Remove console.log of reset links
- [ ] Test email delivery in production

## Future Improvements

### Priority 1: Production Scaling

1. **Redis-Based Rate Limiting**
    - Migrate from in-memory to Redis/Upstash
    - Add IP-based rate limiting
    - Implement gradual backoff

2. **Email Integration**
    - Set up transactional email service (Resend, SendGrid, etc.)
    - Design password reset email template
    - Remove console.log of reset links

### Priority 2: Enhanced Security

3. **Email Verification**
    - Require email verification on signup
    - Send verification link with time-limited token
    - Mark accounts as verified in database

4. **Two-Factor Authentication (2FA)**
    - TOTP-based 2FA support
    - Backup codes for account recovery
    - Remember device option

5. **Session Management UI**
    - View active sessions
    - Revoke individual sessions
    - "Logout from all devices" functionality

### Priority 3: Monitoring & Compliance

6. **Audit Logs**
    - Track all authentication events
    - Log IP addresses and user agents
    - Retention policy for compliance

7. **Security Headers**
    - Content-Security-Policy
    - X-Frame-Options
    - X-Content-Type-Options
    - Referrer-Policy

8. **SSO Integration**
    - Support for Authentik, Authelia
    - SAML/OAuth provider support
    - Enterprise directory integration

## Reporting Security Issues

If you discover a security vulnerability, please email [security@qastudio.dev](mailto:security@qastudio.dev) instead of creating a public issue.

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
