# QA Studio API - Quick Reference

## Authentication
```bash
Authorization: Bearer YOUR_API_KEY
```

## Base URL
```
https://qastudio.dev/api
```

---

## Core Workflow

### 1. Create a Run
```bash
POST /api/runs
```
```json
{
  "projectId": "proj_123",
  "name": "Nightly Regression",
  "environment": "Production",
  "milestoneId": "ms_456"
}
```

### 2. Submit Results
```bash
POST /api/results
```
```json
{
  "testRunId": "run_789",
  "results": [
    {
      "title": "should login",
      "fullTitle": "Auth > Login > should login",
      "status": "passed",
      "duration": 1500,
      "attachments": [...]
    }
  ]
}
```

### 3. Complete Run
```bash
POST /api/runs/{runId}/complete
```

---

## All Endpoints

### Runs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/runs` | Create run |
| GET | `/api/runs/list` | List runs |
| GET | `/api/runs/{runId}/results` | Get results |
| POST | `/api/runs/{runId}/complete` | Complete run |

### Results
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/results` | Submit results (batch) |
| GET | `/api/results/{resultId}/attachments` | Get attachments |
| POST | `/api/results/{resultId}/attachments` | Upload attachment |

### Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/{projectId}/cases` | Create case |
| PATCH | `/api/cases/{caseId}` | Update case |
| GET | `/api/cases/{caseId}/results` | Get case history |
| POST | `/api/cases/{caseId}/reorder` | Reorder case |

### Suites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/suites` | List suites |
| POST | `/api/projects/{projectId}/suites` | Create suite |
| GET | `/api/projects/{projectId}/suites/{id}` | Get suite |
| PATCH | `/api/projects/{projectId}/suites/{id}` | Update suite |
| DELETE | `/api/projects/{projectId}/suites/{id}` | Delete suite |
| POST | `/api/suites/{id}/reorder` | Reorder suite |
| POST | `/api/suites/{id}/move-to-parent` | Move suite |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project |
| PATCH | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

### Milestones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/milestones` | List milestones |
| POST | `/api/projects/{projectId}/milestones` | Create milestone |

### Environments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/environments` | List environments |
| POST | `/api/projects/{projectId}/environments` | Create environment |
| GET | `/api/projects/{projectId}/environments/{id}` | Get environment |
| PATCH | `/api/projects/{projectId}/environments/{id}` | Update environment |
| DELETE | `/api/projects/{projectId}/environments/{id}` | Delete environment |

---

## Status Values

### Test Result Status
- `PASSED` - Test passed
- `FAILED` - Test failed
- `SKIPPED` - Test skipped
- `BLOCKED` - Test blocked
- `RETEST` - Needs retest
- `UNTESTED` - Not yet executed

### Test Run Status
- `PLANNED` - Not started
- `IN_PROGRESS` - Running
- `COMPLETED` - Finished
- `ABORTED` - Cancelled

### Priority
- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

### Test Types
- `FUNCTIONAL`
- `REGRESSION`
- `SMOKE`
- `INTEGRATION`
- `PERFORMANCE`
- `SECURITY`
- `UI`
- `API`
- `UNIT`
- `E2E`

---

## Common Patterns

### Auto-create Environment
```json
{
  "projectId": "proj_123",
  "name": "My Test Run",
  "environment": "Production"  // Will be created if doesn't exist
}
```

### Nested Suites via fullTitle
```json
{
  "title": "should login",
  "fullTitle": "Auth > Login > Success > should login"
}
```
Creates: Auth → Login → Success → should login

### Attachment Formats
```json
{
  "name": "screenshot.png",
  "contentType": "image/png",
  "body": "base64-string-or-file-path"
}
```

---

## Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Server Error

---

## More Info
- **Full Guide**: [PLAYWRIGHT_API_GUIDE.md](./PLAYWRIGHT_API_GUIDE.md)
- **Migration**: [API_ENDPOINT_MIGRATION.md](./API_ENDPOINT_MIGRATION.md)
- **Interactive Docs**: https://qastudio.dev/docs
