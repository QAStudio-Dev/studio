# Playwright Reporter API Changes

## Summary

The `/api/attachments` endpoint has been updated to be a fully-featured, production-ready public API endpoint. The Playwright reporter should be updated to use this endpoint instead of the internal `/test-runs/{testRunId}/results/{testResultId}/attachments` endpoint.

## What Changed

### `/api/attachments` Endpoint (Updated)

The endpoint now includes:

✅ **Authentication** - Requires API key via `Authorization: Bearer {apiKey}` header
✅ **Access Control** - Verifies user has access to the test case/result
✅ **Blob Storage** - Stores files in cloud storage (not local filesystem)
✅ **Dual Format Support** - Accepts both JSON with base64 AND multipart form data
✅ **Proper Error Handling** - Returns 400/403/404 with descriptive messages

### API Endpoint Comparison

| Endpoint | Status | Recommended For |
|----------|--------|-----------------|
| `/api/attachments` | ✅ **Public API** | All external integrations |
| `/api/test-results/[resultId]/attachments` | ⚠️ Internal | Can be deprecated |

## Required Reporter Changes

### File: `qastudio-playwright/src/api-client.ts`

**Current Code:**
```typescript
async uploadAttachment(testRunId: string, testResultId: string, name: string, contentType: string, data: Buffer) {
    this.log(`Uploading attachment: ${name} (${contentType})`);
    return this.request(`/test-runs/${testRunId}/results/${testResultId}/attachments`, {
        method: 'POST',
        body: {
            name,
            contentType,
            data: data.toString('base64')
        }
    });
}
```

**Updated Code:**
```typescript
async uploadAttachment(testResultId: string, name: string, contentType: string, data: Buffer, type?: string) {
    this.log(`Uploading attachment: ${name} (${contentType})`);
    return this.request(`/attachments`, {
        method: 'POST',
        body: {
            name,
            contentType,
            data: data.toString('base64'),
            testResultId,
            ...(type && { type })
        }
    });
}
```

### Changes Made

1. **Endpoint Path**: Changed from `/test-runs/{testRunId}/results/{testResultId}/attachments` to `/attachments`
2. **Parameters**: Removed `testRunId` parameter (no longer needed)
3. **Request Body**: Added `testResultId` field to the POST body
4. **Optional Type**: Added optional `type` parameter for categorizing attachments

## Request Format

The endpoint accepts **two formats**:

### 1. JSON with Base64 (Current Reporter Format)

```json
{
  "name": "screenshot.png",
  "contentType": "image/png",
  "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "testResultId": "result_clx123abc",
  "type": "screenshot"
}
```

### 2. Multipart Form Data (Alternative)

```
Content-Type: multipart/form-data

file: [binary file data]
testResultId: result_clx123abc
type: screenshot
```

**Note:** The reporter currently uses JSON format, which is fully supported. No need to change to multipart unless you want to optimize large file uploads.

## Response Format

**Success (201 Created):**
```json
{
  "attachment": {
    "id": "att_clx456def",
    "filename": "attachments/result_123/1705315800000-screenshot.png",
    "url": "https://storage.example.com/attachments/...",
    "size": 125440,
    "mimeType": "image/png"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "message": "Either testCaseId or testResultId is required"
}
```

**Error (403 Forbidden):**
```json
{
  "message": "You do not have access to this test result"
}
```

**Error (404 Not Found):**
```json
{
  "message": "Test result not found"
}
```

## Migration Checklist

- [ ] Update `uploadAttachment()` method signature in `api-client.ts`
- [ ] Change endpoint path from `/test-runs/{testRunId}/results/{testResultId}/attachments` to `/attachments`
- [ ] Add `testResultId` to request body
- [ ] Remove unused `testRunId` parameter
- [ ] Add optional `type` parameter support
- [ ] Update tests to use new endpoint
- [ ] Test with valid API key
- [ ] Verify access control works correctly
- [ ] Publish new reporter version

## Testing

### Test with cURL:

```bash
curl -X POST https://qastudio.dev/api/attachments \
  -H "Authorization: Bearer qas_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "screenshot.png",
    "contentType": "image/png",
    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "testResultId": "your_test_result_id",
    "type": "screenshot"
  }'
```

## Benefits

1. **Consistent API** - Uses the same public-facing endpoint documented at `/docs`
2. **Better Security** - Proper authentication and access control
3. **Cloud Storage** - Files stored in blob storage instead of local filesystem
4. **Future-Proof** - Built on the same architecture as other public APIs
5. **Simpler URL** - Shorter, cleaner endpoint path
6. **Better Documentation** - Automatically appears in API docs

## Questions?

Contact: ben@qastudio.dev
