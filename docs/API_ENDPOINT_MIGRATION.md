# API Endpoint Migration Summary

## Overview
Successfully renamed all API endpoints to remove the "test-" prefix for cleaner, more concise URLs.

## Endpoint Changes

### Routes Renamed

| Old Route | New Route |
|-----------|-----------|
| `/api/test-runs` | `/api/runs` |
| `/api/test-results` | `/api/results` |
| `/api/test-cases` | `/api/cases` |
| `/api/test-suites` | `/api/suites` |

### All Affected Endpoints

#### Runs (formerly Test Runs)
- `POST /api/runs` - Create a test run
- `GET /api/runs/list` - List test runs
- `GET /api/runs/{runId}/results` - Get test run results
- `POST /api/runs/{runId}/complete` - Complete a test run

#### Results (formerly Test Results)
- `POST /api/results` - Submit test results (batch)
- `GET /api/results/{resultId}/attachments` - Get result attachments
- `POST /api/results/{resultId}/attachments` - Upload attachments

#### Cases (formerly Test Cases)
- `POST /api/projects/{projectId}/cases` - Create a test case
- `PATCH /api/cases/{testCaseId}` - Update a test case
- `GET /api/cases/{testCaseId}/results` - Get test case results
- `POST /api/cases/{testCaseId}/reorder` - Reorder test case

#### Suites (formerly Test Suites)
- `GET /api/projects/{projectId}/suites` - List test suites
- `POST /api/projects/{projectId}/suites` - Create a test suite
- `GET /api/projects/{projectId}/suites/{id}` - Get a test suite
- `PATCH /api/projects/{projectId}/suites/{id}` - Update a test suite
- `DELETE /api/projects/{projectId}/suites/{id}` - Delete a test suite
- `POST /api/suites/{suiteId}/reorder` - Reorder suite
- `POST /api/suites/{suiteId}/move-to-parent` - Move suite

## Files Modified

### Frontend Files Updated
- `/src/routes/settings/api-keys/+page.svelte` - Updated example API URL
- `/src/routes/projects/[projectId]/cases/+page.svelte` - Updated all API calls
- `/src/routes/projects/[projectId]/cases/[testCaseId]/+page.svelte` - Updated API calls
- `/src/routes/projects/[projectId]/runs/+page.svelte` - Updated API calls
- `/src/routes/projects/[projectId]/runs/[runId]/+page.svelte` - Updated API calls

### API Files Updated
- All `/src/routes/api/**/*.ts` files - Updated comments and documentation
- `/src/lib/api/schemas.ts` - Updated endpoint paths in schemas

### Directories Renamed
```
src/routes/api/test-runs → src/routes/api/runs
src/routes/api/test-results → src/routes/api/results
src/routes/api/test-cases → src/routes/api/cases
src/routes/api/test-suites → src/routes/api/suites

src/routes/api/projects/[projectId]/test-runs → .../runs
src/routes/api/projects/[projectId]/test-results → .../results
src/routes/api/projects/[projectId]/test-cases → .../cases
src/routes/api/projects/[projectId]/test-suites → .../suites
```

## OpenAPI Documentation Tags

Updated all OpenAPI tags to use simplified names:
- "Test Runs" → "Runs"
- "Test Results" → "Results"
- "Test Cases" → "Cases"
- "Test Suites" → "Suites"

These changes are reflected in the Swagger UI at `/docs`.

## Breaking Changes

⚠️ **IMPORTANT**: This is a breaking change for any existing API consumers.

### For Playwright Reporters
If you have existing Playwright reporters using the old endpoints, update them to use the new endpoints. See [PLAYWRIGHT_API_GUIDE.md](./PLAYWRIGHT_API_GUIDE.md) for the complete updated API reference.

### Migration Checklist for API Consumers

- [ ] Update all API calls from `/api/test-runs` to `/api/runs`
- [ ] Update all API calls from `/api/test-results` to `/api/results`
- [ ] Update all API calls from `/api/test-cases` to `/api/cases`
- [ ] Update all API calls from `/api/test-suites` to `/api/suites`
- [ ] Update any hardcoded URLs in CI/CD scripts
- [ ] Update environment variables if they contain endpoint URLs
- [ ] Test all integrations thoroughly

## Backward Compatibility

❌ **No backward compatibility** - the old endpoints have been completely removed. All API consumers must update to the new endpoints.

## Testing

After deployment:
1. Test the Swagger UI at `/docs` to ensure all endpoints are documented
2. Verify frontend pages still work correctly
3. Test creating a test run via the new `/api/runs` endpoint
4. Test submitting results via the new `/api/results` endpoint
5. Verify Playwright reporter integration still works

## Documentation

- **API Guide for Playwright**: [PLAYWRIGHT_API_GUIDE.md](./PLAYWRIGHT_API_GUIDE.md)
- **Interactive API Docs**: Available at `/docs` (Swagger UI)

## Next Steps

1. Update any external documentation referencing the old endpoints
2. Notify users of the breaking changes
3. Update Playwright reporter packages/examples
4. Consider creating redirect aliases for a grace period (optional)
