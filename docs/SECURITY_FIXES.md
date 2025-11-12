# Security Fixes - Signed URL Implementation

This document summarizes the security improvements made to the signed URL feature for serving Playwright traces.

## Issues Addressed

### 1. ✅ Weak Fallback Secret

**File:** `src/lib/server/signed-urls.ts`
**Issue:** Hardcoded fallback secret `'fallback-secret-key'` made URLs trivially forgeable
**Fix:** Application now fails to start if `URL_SIGNING_SECRET` is not configured

```typescript
// Before
const SECRET_KEY = env.URL_SIGNING_SECRET || env.CLERK_SECRET_KEY || 'fallback-secret-key';

// After
const SECRET_KEY = env.URL_SIGNING_SECRET;
if (!SECRET_KEY) {
	throw new Error('URL_SIGNING_SECRET must be configured...');
}
```

### 2. ✅ Missing Authentication Check

**File:** `src/routes/api/attachments/[attachmentId]/signed-url/+server.ts`
**Issue:** Any authenticated user could generate signed URLs for any attachment
**Fix:** Added project-based authorization

```typescript
// Verify user is authenticated
const session = await locals.clerk?.session();
if (!session?.userId) throw error(401);

// Verify user has access to attachment's project
const project = attachment.testResult?.testRun?.project;
const hasAccess =
	project.createdBy === userId || (project.teamId && user?.teamId === project.teamId);

if (!hasAccess) throw error(403);
```

### 3. ✅ File Type Validation Insufficient

**File:** `src/routes/api/traces/[attachmentId]/+server.ts`
**Issue:** String-based MIME check (`includes('zip')`) could be bypassed
**Fix:** Strict Set-based matching

```typescript
// Before
if (!attachment.mimeType.includes('zip') &&
    !attachment.mimeType.includes('application/zip')) {

// After
const ALLOWED_TRACE_MIME_TYPES = new Set([
	'application/zip',
	'application/x-zip-compressed'
]);
if (!ALLOWED_TRACE_MIME_TYPES.has(attachment.mimeType)) {
```

### 4. ✅ Path Traversal Risk

**File:** `src/routes/api/traces/[attachmentId]/+server.ts`
**Issue:** Path traversal sequences (`../`) could access files outside uploads directory
**Fix:** Path validation using resolved paths

```typescript
// Before
const filename = attachment.url.replace('/api/attachments/local/', '');
const filePath = join(process.cwd(), 'uploads', 'attachments', filename);

// After
const filename = attachment.url.replace('/api/attachments/local/', '');
const uploadDir = resolve(process.cwd(), 'uploads', 'attachments');
const filePath = resolve(uploadDir, filename);

// Prevent path traversal
if (!filePath.startsWith(uploadDir)) {
	throw error(403, 'Invalid file path');
}
```

### 5. ✅ Missing Input Validation

**File:** `src/routes/api/attachments/[attachmentId]/signed-url/+server.ts`
**Issue:** No validation for expiration parameter (negative/extreme values)
**Fix:** Range validation (1-1440 minutes)

```typescript
// Before
const expiresInMinutes = parseInt(url.searchParams.get('expiresIn') || '60', 10);
if (expiresInMs > 24 * 60 * 60 * 1000) throw error(400);

// After
const expiresInMinutes = parseInt(url.searchParams.get('expiresIn') || '60', 10);
if (isNaN(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 1440) {
	throw error(400, 'Expiration must be between 1 and 1440 minutes');
}
```

## Testing

Run the following tests to verify security:

### 1. Test Missing Secret

```bash
# Remove URL_SIGNING_SECRET from .env
# Start server - should fail with clear error message
npm run dev
# Expected: Error "URL_SIGNING_SECRET must be configured..."
```

### 2. Test Unauthorized Access

```bash
# Login as User A
# Try to get signed URL for User B's attachment
curl -H "Cookie: __clerk_db_jwt=..." \
  http://localhost:5173/api/attachments/{userB_attachment}/signed-url
# Expected: 403 Forbidden
```

### 3. Test MIME Type Validation

```bash
# Try to access non-trace file through trace endpoint
# (Would need to manually create DB record with wrong MIME type)
# Expected: 403 "This endpoint only serves trace files"
```

### 4. Test Path Traversal

```bash
# Try to create attachment URL with path traversal
# Create attachment with url: "/api/attachments/local/../../../etc/passwd"
# Expected: 403 "Invalid file path"
```

### 5. Test Expiration Validation

```bash
# Test negative expiration
curl http://localhost:5173/api/attachments/{id}/signed-url?expiresIn=-1
# Expected: 400 "Expiration must be between 1 and 1440 minutes"

# Test too large expiration
curl http://localhost:5173/api/attachments/{id}/signed-url?expiresIn=99999
# Expected: 400 "Expiration must be between 1 and 1440 minutes"
```

## Configuration Required

Add to `.env`:

```bash
# Generate with: openssl rand -hex 32
URL_SIGNING_SECRET=your_generated_secret_here
```

For Vercel deployment:

```bash
vercel env add URL_SIGNING_SECRET production
# Paste generated secret when prompted
```

## Files Modified

1. `src/lib/server/signed-urls.ts` - Removed fallback secret
2. `src/routes/api/attachments/[attachmentId]/signed-url/+server.ts` - Added auth + validation
3. `src/routes/api/traces/[attachmentId]/+server.ts` - Fixed MIME validation + path traversal
4. `.env.example` - Added URL_SIGNING_SECRET
5. `docs/SECURITY.md` - Comprehensive security documentation

## Deployment Checklist

Before deploying to production:

- [ ] Generate secure signing secret: `openssl rand -hex 32`
- [ ] Add `URL_SIGNING_SECRET` to production environment variables
- [ ] Verify `.env` files are in `.gitignore`
- [ ] Test signed URL generation works
- [ ] Test authorization (users can't access others' attachments)
- [ ] Test URL expiration
- [ ] Verify build succeeds: `npm run build`
- [ ] Check logs for any errors on startup

## References

- [SECURITY.md](SECURITY.md) - Full security documentation
- [SIGNED_URLS.md](SIGNED_URLS.md) - Technical implementation details
