# QA Studio Reporter API Reference

API endpoints for integrating test reporters (Playwright, Jest, etc.) with QA Studio.

## Authentication

All endpoints support both session cookies (browser) and API keys (programmatic):

```http
Authorization: Bearer qas_your_api_key_here
```

## Base URL

```
https://your-domain.com/api
```

---

## Create Test Run

Start a new test run.

**Endpoint:** `POST /api/test-runs`

**Request Body:**

```json
{
	"projectId": "clx123...",
	"name": "Playwright Tests - Build #123",
	"description": "Automated test run from CI/CD",
	"environmentId": "clx456..." // optional
}
```

**Response:**

```json
{
	"testRun": {
		"id": "clx789...",
		"name": "Playwright Tests - Build #123",
		"status": "IN_PROGRESS",
		"startedAt": "2024-01-01T10:00:00.000Z",
		"project": {
			"id": "clx123...",
			"name": "My Project",
			"key": "PROJ"
		}
	}
}
```

---

## Submit Test Results (Batch)

Submit results for multiple test cases in a single request. This is the format used by the `@qastudio-dev/playwright` reporter.

**Endpoint:** `POST /api/test-results`

**Request Body:**

```json
{
	"testRunId": "clx789...",
	"results": [
		{
			"title": "should login successfully",
			"fullTitle": "Authentication > Login > Valid Credentials > should login successfully",
			"status": "passed",
			"duration": 1523,
			"errorMessage": "Expected 200 but got 404", // optional, for failures
			"stackTrace": "at line 42...", // optional
			"attachments": [
				// optional - screenshots, videos, traces
				{
					"name": "screenshot.png",
					"contentType": "image/png",
					"body": "base64EncodedData...",
					"type": "screenshot"
				}
			]
		}
	]
}
```

**Auto-Creation Features:**

- If a test case doesn't exist, it will be **automatically created**
- If `fullTitle` is provided (e.g., `"Suite A > Suite B > Test"`), the system will:
    - Parse the suite hierarchy from the path
    - **Automatically create nested test suites** if they don't exist
    - Create the test case in the appropriate suite
- Test cases are marked as `AUTOMATED` automatically
- Suites are reused if they already exist (no duplicates)
- **Attachments are automatically uploaded** to Vercel Blob storage
    - Supports screenshots (PNG, JPG)
    - Supports videos (WebM, MP4)
    - Supports trace files (ZIP)
    - Files are stored with unique paths and linked to test results

**Status Values:**

- `PASSED` - Test passed
- `FAILED` - Test failed
- `SKIPPED` - Test was skipped
- `BLOCKED` - Test blocked by another issue

**Response:**

```json
{
	"processedCount": 1,
	"results": [
		{
			"testCaseId": "clxabc...",
			"testResultId": "clxdef...",
			"title": "should login successfully",
			"status": "PASSED",
			"created": true, // true if test case was auto-created, false if existed
			"attachmentCount": 2 // number of attachments uploaded
		}
	],
	"errors": [] // Array of any errors that occurred during processing
}
```

---

## Complete Test Run

Mark a test run as completed.

**Endpoint:** `POST /api/test-runs/{runId}/complete`

**Response:**

```json
{
	"testRun": {
		"id": "clx789...",
		"status": "COMPLETED",
		"startedAt": "2024-01-01T10:00:00.000Z",
		"completedAt": "2024-01-01T10:05:00.000Z",
		"_count": {
			"results": 42
		}
	}
}
```

---

## Example: Playwright Reporter Flow

```typescript
class QAStudioReporter implements Reporter {
	private apiKey: string;
	private apiUrl: string;
	private projectId: string;
	private testRunId?: string;

	async onBegin() {
		// 1. Create test run
		const response = await fetch(`${this.apiUrl}/test-runs`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				projectId: this.projectId,
				name: `Playwright Run - ${new Date().toISOString()}`,
				description: `Automated test run`
			})
		});

		const { testRun } = await response.json();
		this.testRunId = testRun.id;
	}

	async onTestEnd(test: TestCase, result: TestResult) {
		// 2. Submit test result
		const status =
			result.status === 'passed'
				? 'PASSED'
				: result.status === 'failed'
					? 'FAILED'
					: 'SKIPPED';

		await fetch(`${this.apiUrl}/test-results`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				testRunId: this.testRunId,
				testCaseId: test.id, // You need to map test to existing test case
				status,
				duration: result.duration,
				errorMessage: result.error?.message,
				stackTrace: result.error?.stack
			})
		});
	}

	async onEnd() {
		// 3. Complete test run
		await fetch(`${this.apiUrl}/test-runs/${this.testRunId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			}
		});
	}
}
```

---

## Configuration Example

```typescript
// playwright.config.ts
export default defineConfig({
	reporter: [
		[
			'./reporters/qa-studio-reporter.ts',
			{
				apiUrl: 'http://localhost:5173/api',
				apiKey: process.env.QA_STUDIO_API_KEY,
				projectId: 'clx123...'
			}
		]
	]
});
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
	"message": "Error description"
}
```

**Common Status Codes:**

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid API key)
- `403` - Forbidden (no access to resource)
- `404` - Not Found (resource doesn't exist)

---

## Notes

1. **Auto-Creation**: Test cases and suites are automatically created from test results - no need to pre-create them!
2. **Suite Hierarchy**: Use `fullTitle` with `>` separator to create nested suites (e.g., `"Parent > Child > Test"`)
3. **Rate Limiting**: No rate limits currently, but batch requests when possible
4. **Idempotency**: Re-submitting the same result will create duplicates (not idempotent yet)
5. **Attachments**: Not yet supported in this version (coming soon)

---

## Need Help?

- API Keys: `/settings/api-keys`
- Projects: `/projects`
- Test Cases: `/projects/{id}`
