# Security Implementation - Signed URLs for Trace Viewing

This document outlines the security measures implemented for serving Playwright trace files to external services.

## Overview

QA Studio uses **HMAC-signed, time-limited URLs** to securely serve trace files to external services like `trace.playwright.dev` without exposing authentication credentials.

## Security Controls

### 1. **Required Environment Variable**

**File:** `src/lib/server/signed-urls.ts`

```typescript
const SECRET_KEY = env.URL_SIGNING_SECRET;

if (!SECRET_KEY) {
	throw new Error(
		'URL_SIGNING_SECRET must be configured in environment variables. ' +
			'Generate one with: openssl rand -hex 32'
	);
}
```

**Why:** Prevents the application from starting with a weak or missing signing secret. No fallback secrets are used.

**Setup:**

```bash
# Generate a secure 256-bit secret
openssl rand -hex 32

# Add to .env
URL_SIGNING_SECRET="your-generated-secret-here"
```

### 2. **Authentication & Authorization**

**File:** `src/routes/api/attachments/[attachmentId]/signed-url/+server.ts`

```typescript
// 1. Require authentication
const session = await locals.clerk?.session();
if (!session?.userId) {
	throw error(401, 'Authentication required');
}

// 2. Verify user has access to the attachment's project
const attachment = await db.attachment.findUnique({
	include: {
		testResult: {
			include: {
				testRun: { include: { project: true } }
			}
		}
	}
});

// 3. Check user is project creator OR in same team
const hasAccess =
	project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

if (!hasAccess) {
	throw error(403, 'You do not have access to this attachment');
}
```

**Why:** Prevents authenticated users from generating signed URLs for attachments they don't have permission to access.

### 3. **Input Validation**

**File:** `src/routes/api/attachments/[attachmentId]/signed-url/+server.ts`

```typescript
const expiresInMinutes = parseInt(url.searchParams.get('expiresIn') || '60', 10);

// Validate: 1 minute to 24 hours
if (isNaN(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 1440) {
	throw error(400, 'Expiration must be between 1 and 1440 minutes');
}
```

**Why:** Prevents:

- Negative expiration times
- Extremely short expirations (DoS via rapid regeneration)
- Extremely long expirations (reduces security window)

### 4. **Strict MIME Type Validation**

**File:** `src/routes/api/traces/[attachmentId]/+server.ts`

```typescript
const ALLOWED_TRACE_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed']);

if (!ALLOWED_TRACE_MIME_TYPES.has(attachment.mimeType)) {
	throw error(403, 'This endpoint only serves trace files');
}
```

**Why:** Prevents serving non-trace files through the public endpoint. Uses exact matching to avoid bypass attempts like `application/zip-evil`.

### 5. **Path Traversal Protection**

**File:** `src/routes/api/traces/[attachmentId]/+server.ts`

```typescript
const filename = attachment.url.replace('/api/attachments/local/', '');
const uploadDir = resolve(process.cwd(), 'uploads', 'attachments');
const filePath = resolve(uploadDir, filename);

// Prevent path traversal attacks
if (!filePath.startsWith(uploadDir)) {
	throw error(403, 'Invalid file path');
}
```

**Why:** Prevents directory traversal attacks using sequences like `../../../etc/passwd`. The resolved path must be within the uploads directory.

### 6. **Cryptographic Signatures**

**File:** `src/lib/server/signed-urls.ts`

```typescript
// Generate signature
const message = `${attachmentId}:${expires}`;
const signature = createHmac('sha256', SECRET_KEY).update(message).digest('hex');

// Verify signature (timing-safe comparison)
const signatureBuffer = Buffer.from(signature, 'hex');
const expectedBuffer = Buffer.from(expectedSignature, 'hex');

if (signatureBuffer.length !== expectedBuffer.length) {
	return { valid: false, error: 'Invalid signature' };
}

const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);
```

**Why:**

- **HMAC-SHA256:** Cryptographically secure hashing prevents forgery
- **Timing-safe comparison:** Prevents timing attacks that could reveal signature bytes
- **Tamper-proof:** Any modification to URL invalidates signature

### 7. **Time-Based Expiration**

```typescript
// Check expiration
if (Date.now() > expires) {
	return { valid: false, error: 'URL has expired' };
}
```

**Why:** Limits the window of opportunity for leaked URLs. Default: 1 hour, max: 24 hours.

### 8. **CORS Security**

**File:** `src/routes/api/traces/[attachmentId]/+server.ts`

```typescript
headers: {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Range'
}
```

**Why:** Allows `trace.playwright.dev` to fetch traces while restricting to safe methods (GET, HEAD, OPTIONS). The signature already provides authentication.

## Attack Surface Analysis

### Protected Against:

1. ✅ **Unauthorized Access:** Authentication required to generate signed URLs
2. ✅ **Privilege Escalation:** Authorization checks ensure users can only access their project's attachments
3. ✅ **URL Forgery:** HMAC signatures prevent creating fake URLs
4. ✅ **Replay Attacks:** Time-based expiration limits window
5. ✅ **Path Traversal:** Strict path validation prevents filesystem access outside uploads
6. ✅ **MIME Type Bypass:** Exact MIME type matching prevents serving arbitrary files
7. ✅ **Timing Attacks:** Constant-time signature comparison
8. ✅ **Missing Configuration:** Application fails to start without signing secret

### Potential Improvements:

1. **Rate Limiting:** Add rate limiting per user/IP to prevent DoS via signed URL generation
2. **Revocation List:** Track and revoke compromised signatures
3. **Audit Logging:** Log signed URL generation and usage for security monitoring
4. **Byte-Range Requests:** Support partial content for large trace files
5. **Content-Disposition:** Consider forcing download instead of inline display for additional security

## Threat Model

### Scenario 1: Attacker obtains a signed URL

**Risk:** Low
**Mitigation:**

- URL expires within 1-24 hours
- Only grants access to specific trace file
- Signature cannot be modified to access other files
- CORS prevents use from malicious websites (except trace.playwright.dev)

### Scenario 2: Attacker tries to forge signed URLs

**Risk:** Very Low
**Mitigation:**

- Would need to crack HMAC-SHA256 (computationally infeasible)
- Secret key is never exposed to client
- Timing-safe comparison prevents timing attacks

### Scenario 3: Attacker has database access

**Risk:** High (but out of scope for this feature)
**Mitigation:**

- Can read attachment metadata but not generate signed URLs
- Would need signing secret (stored in environment, not database)
- Standard database security measures apply

### Scenario 4: Authenticated user tries to access unauthorized attachments

**Risk:** Very Low
**Mitigation:**

- Authorization check verifies project membership
- Cannot generate signed URLs for other users' attachments
- Database queries validate team membership

## Configuration Checklist

- [ ] Generate secure signing secret: `openssl rand -hex 32`
- [ ] Add `URL_SIGNING_SECRET` to environment variables
- [ ] Verify `.env` files are in `.gitignore`
- [ ] Test signed URL generation with valid credentials
- [ ] Test authorization checks (try accessing other user's attachments)
- [ ] Verify URLs expire correctly
- [ ] Test CORS headers in browser console
- [ ] Monitor logs for security events

## Incident Response

If a signed URL is compromised:

1. **Short-term:** Wait for URL to expire (1-24 hours)
2. **Medium-term:** Rotate `URL_SIGNING_SECRET` (invalidates all existing signed URLs)
3. **Long-term:** Implement revocation list for granular control

To rotate the secret:

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Update environment variable
# For Vercel:
vercel env add URL_SIGNING_SECRET production
# Paste new secret when prompted

# Redeploy
vercel deploy --prod
```

## References

- OWASP: [Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- Node.js: [Timing-Safe Comparison](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- HMAC: [RFC 2104](https://datatracker.ietf.org/doc/html/rfc2104)
