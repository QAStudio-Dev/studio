# Signed URLs for Trace Viewing

This module implements secure, time-limited signed URLs for serving Playwright trace files to external services like `trace.playwright.dev`.

## Problem

Playwright's hosted trace viewer (`trace.playwright.dev`) needs to load trace files from your server, but your `/api/attachments` endpoint requires authentication. We can't expose authentication tokens in URLs that are sent to external services.

## Solution

**Signed URLs with HMAC signatures** - Time-limited, cryptographically signed URLs that:

- Don't require authentication headers
- Expire automatically (default: 1 hour)
- Can only access specific trace files
- Are tamper-proof (any modification invalidates the signature)

## How It Works

### 1. Frontend requests a signed URL

```typescript
const response = await fetch(`/api/attachments/${attachmentId}/signed-url`);
const { signedUrl } = await response.json();
// signedUrl: https://qastudio.dev/api/traces/{id}?signature=abc123&expires=1234567890
```

### 2. Pass signed URL to trace viewer

```html
<iframe src="https://trace.playwright.dev/?trace={encodeURIComponent(signedUrl)}" />
```

### 3. Trace viewer loads the file

- `trace.playwright.dev` fetches the signed URL
- Server verifies signature and expiration
- If valid, serves the trace file with CORS headers
- If invalid/expired, returns 403 Forbidden

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Request signed URL
       ▼
┌─────────────────────────────┐
│ /api/attachments/{id}/      │
│ signed-url (authenticated)  │
└──────┬──────────────────────┘
       │ 2. Generate signature
       │    signature = HMAC(attachmentId + expires, SECRET)
       ▼
┌─────────────────┐
│ Returns signed  │
│ URL to browser  │
└──────┬──────────┘
       │ 3. Browser embeds in iframe
       ▼
┌──────────────────────┐
│ trace.playwright.dev │
└──────┬───────────────┘
       │ 4. Fetch trace file
       ▼
┌─────────────────────┐
│ /api/traces/{id}    │
│ ?signature=...      │
│ &expires=...        │
│ (public endpoint)   │
└──────┬──────────────┘
       │ 5. Verify signature
       │    - Check expiration
       │    - Verify HMAC
       │    - Check file type (trace only)
       ▼
┌─────────────────┐
│ Serve file with │
│ CORS headers    │
└─────────────────┘
```

## API Endpoints

### GET `/api/attachments/{id}/signed-url`

**Auth required**: Yes (via Clerk)
**Purpose**: Generate a signed URL for a trace file

**Query Parameters:**

- `expiresIn` (optional): Expiration time in minutes (default: 60, max: 1440)

**Response:**

```json
{
	"signedUrl": "https://qastudio.dev/api/traces/{id}?signature=abc&expires=123",
	"expires": "2025-11-12T18:00:00.000Z",
	"expiresIn": 3600000,
	"attachmentId": "...",
	"fileName": "trace.zip"
}
```

### GET `/api/traces/{id}?signature={sig}&expires={exp}`

**Auth required**: No (signature-based)
**Purpose**: Serve trace files to external services

**CORS**: Enabled (`Access-Control-Allow-Origin: *`)
**File types**: Only `.zip` files (Playwright traces)

## Security Features

1. **HMAC-SHA256 Signatures**: Cryptographically secure signing
2. **Time-Limited**: URLs expire automatically
3. **Timing-Safe Comparison**: Prevents timing attacks
4. **File Type Restriction**: Only serves trace files (`.zip`)
5. **No Reuse After Expiration**: Signatures become invalid after expiration
6. **Secret Key**: Uses `URL_SIGNING_SECRET` or falls back to `CLERK_SECRET_KEY`

## Configuration

### Environment Variables

```bash
# Recommended: Use a dedicated signing secret
URL_SIGNING_SECRET="your-secret-key-here"

# Fallback: Uses Clerk secret if URL_SIGNING_SECRET not set
CLERK_SECRET_KEY="sk_..."

# Optional: Set base URL for signed URLs
PUBLIC_BASE_URL="https://qastudio.dev"
```

### Generate a signing secret

```bash
# Generate a secure random secret
openssl rand -hex 32
```

Add to `.env`:

```bash
URL_SIGNING_SECRET="your-generated-secret-here"
```

## Usage Examples

### In Svelte Components

```svelte
<script>
	let traceUrl = $state('');

	async function loadTrace(attachmentId) {
		const response = await fetch(`/api/attachments/${attachmentId}/signed-url`);
		const data = await response.json();
		traceUrl = data.signedUrl;
	}
</script>

<iframe
	src="https://trace.playwright.dev/?trace={encodeURIComponent(traceUrl)}"
	class="h-full w-full"
/>
```

### Custom Expiration

```typescript
// Create URL that expires in 30 minutes
const response = await fetch(`/api/attachments/${attachmentId}/signed-url?expiresIn=30`);
```

### In API Routes

```typescript
import { generateFullSignedUrl } from '$lib/server/signed-urls';

// Generate signed URL programmatically
const signedUrl = generateFullSignedUrl(
	attachmentId,
	'https://qastudio.dev',
	30 * 60 * 1000 // 30 minutes
);
```

## Testing

### Local Development

```bash
# Start dev server
npm run dev

# Upload a trace file through Playwright reporter
# Then visit the test result and click "View Attachments"
# Click "View" on a trace.zip file
```

### Verify Signature

```bash
# Test signed URL
curl "http://localhost:5173/api/traces/{id}?signature={sig}&expires={exp}"

# Should return trace file with CORS headers

# Test expired URL (set expires to past timestamp)
curl "http://localhost:5173/api/traces/{id}?signature={sig}&expires=1000000000"
# Should return 403 Forbidden
```

## Troubleshoads

### "Invalid signature" error

- Check that `URL_SIGNING_SECRET` is consistent across restarts
- Verify the signature wasn't modified or URL-encoded incorrectly

### "URL has expired" error

- URL has passed its expiration time
- Generate a new signed URL

### CORS errors in trace viewer

- Verify `/api/traces` endpoint includes CORS headers
- Check that `Access-Control-Allow-Origin: *` is set

### "File not found" error

- Check attachment exists in database
- Verify blob storage URL is accessible
- For local files, check `uploads/attachments/` directory exists

## Performance Considerations

- **Caching**: Signed URLs include `Cache-Control: public, max-age=3600`
- **CDN-Friendly**: Can be cached by CDNs while remaining secure
- **Signature Generation**: Very fast (~1ms) using HMAC-SHA256
- **No Database Lookups**: Signature verification doesn't require database access

## Future Enhancements

- [ ] Rate limiting per attachment ID
- [ ] Revocation list for compromised URLs
- [ ] Per-user signature tracking for audit logs
- [ ] Support for byte-range requests (large trace files)
- [ ] Automatic cleanup of expired signature records
