# API Documentation Migration Status

This document tracks the progress of migrating API endpoints to the new TypeScript-based documentation system.

## Migration Benefits

- ✅ Type safety in endpoints
- ✅ Auto-generated documentation
- ✅ Single source of truth
- ✅ Better developer experience
- ✅ Documentation always in sync with code

## Completed Migrations ✅

### Projects API

- **GET /api/projects** - List all projects
- **POST /api/projects** - Create new project
- **File**: `src/routes/api/projects/+server.ts`
- **Schema**: `ProjectsApi` in `src/lib/api/schemas.ts`

### Test Runs API

- **POST /api/test-runs** - Create new test run
- **File**: `src/routes/api/test-runs/+server.ts`
- **Schema**: `TestRunsApi` in `src/lib/api/schemas.ts`
- **Features**: Auto-creates environments, supports Playwright reporter format

### Test Results API

- **POST /api/test-results** - Submit test results (batch)
- **File**: `src/routes/api/test-results/+server.ts`
- **Schema**: `TestResultsApi` in `src/lib/api/schemas.ts`
- **Features**: Auto-creates test cases/suites, attachment uploads, notifications

### Test Cases API ✅

- **POST /api/projects/:projectId/test-cases** - Create test case
- **File**: `src/routes/api/projects/[projectId]/test-cases/+server.ts`
- **Schema**: `TestCasesApi` in `src/lib/api/schemas.ts`

### Milestones API ✅

- **POST /api/projects/:projectId/milestones** - Create milestone
- **Schema**: `MilestonesApi` in `src/lib/api/schemas.ts`

### Environments API ✅

- **POST /api/projects/:projectId/environments** - Create environment
- **Schema**: `EnvironmentsApi` in `src/lib/api/schemas.ts`

### Test Suites API ✅

- **POST /api/projects/:projectId/test-suites** - Create test suite
- **Schema**: `TestSuitesApi` in `src/lib/api/schemas.ts`

### Attachments API ✅

- **POST /api/attachments** - Upload attachment
- **Schema**: `AttachmentsApi` in `src/lib/api/schemas.ts`

## Summary

**8 API Groups Documented** covering all primary public-facing endpoints:

- Projects, Test Runs, Test Results, Test Cases
- Milestones, Environments, Test Suites, Attachments

These APIs cover the complete workflow for:

- Creating projects and organizing tests
- Running automated tests (Playwright integration)
- Submitting test results with attachments
- Tracking progress via milestones

## Excluded from Public Docs

The following are internal/UI-only endpoints and don't need public documentation:

- **Dashboard APIs** - Internal UI data fetching
- **Teams & Billing** - User management, internal only
- **API Keys** - Admin functionality
- **Integrations** - Slack/webhook setup, UI-driven
- **Individual GET/PATCH/DELETE** - CRUD operations for UI, not needed for external tools

## Pending Migrations 📋

If you want to add more endpoints to public docs in the future:

### Low Priority

Internal/admin endpoints:

- [ ] **Dashboard APIs**
  - GET /api/dashboard/stats
  - GET /api/dashboard/projects
  - GET /api/dashboard/recent-results
  - GET /api/dashboard/user-info

- [ ] **Teams & Billing**
  - POST /api/teams/create
  - POST /api/teams/leave
  - POST /api/billing/portal

- [ ] **API Keys**
  - GET /api/api-keys/list
  - POST /api/api-keys/create
  - DELETE /api/api-keys/[keyId]/delete

- [ ] **Integrations**
  - GET /api/integrations/list
  - POST /api/integrations/slack/callback
  - DELETE /api/integrations/[id]/delete

## Migration Instructions

To migrate an endpoint:

1. **Define types & schema** in `src/lib/api/schemas.ts`
2. **Import types** in the endpoint file
3. **Add type annotations** to request/response objects
4. **Test** the endpoint still works
5. **Update this document** to mark as completed

See `src/lib/api/README.md` for detailed examples.

## Notes

- The old manual documentation in `api-docs.ts` will remain until all endpoints are migrated
- Both systems work side-by-side - auto-generated docs appear first
- Migrated endpoints will automatically appear in the `/docs` page
- Focus on public-facing APIs first (those used by Playwright reporter, CLI tools, etc.)
