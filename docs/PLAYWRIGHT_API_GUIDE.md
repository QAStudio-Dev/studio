# QA Studio API Guide for Playwright Reporters

## Base URLs

- **Production**: `https://qastudio.dev/api`
- **Development**: `http://localhost:5173/api`

## Authentication

All API requests require authentication. Include your API key in the `Authorization` header:

```bash
Authorization: Bearer <your-api-key>
```

You can create API keys in the QA Studio UI at Settings → API Keys.

---

## Quick Start Example

```typescript
// 1. Create a test run
const runResponse = await fetch('https://qastudio.dev/api/runs', {
	method: 'POST',
	headers: {
		Authorization: 'Bearer YOUR_API_KEY',
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		projectId: 'your-project-id',
		name: 'Nightly Regression - ' + new Date().toISOString(),
		environment: 'Production', // Will be created if doesn't exist
		milestoneId: 'optional-milestone-id'
	})
});

const testRun = await runResponse.json();

// 2. Submit test results
await fetch('https://qastudio.dev/api/results', {
	method: 'POST',
	headers: {
		Authorization: 'Bearer YOUR_API_KEY',
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		testRunId: testRun.id,
		results: [
			{
				title: 'should login with valid credentials',
				fullTitle: 'Auth > Login > Success > should login with valid credentials',
				status: 'passed',
				duration: 1500
			},
			{
				title: 'should show error for invalid password',
				fullTitle: 'Auth > Login > Failure > should show error for invalid password',
				status: 'failed',
				duration: 800,
				errorMessage: 'Expected error message to be visible',
				stackTrace: 'Error: ...',
				attachments: [
					{
						name: 'screenshot',
						contentType: 'image/png',
						body: 'base64-encoded-image-data...'
					}
				]
			}
		]
	})
});
```

---

## Core Endpoints

### 1. Create a Test Run

**POST** `/api/runs`

Start a new test run before executing your tests.

**Request Body:**

```json
{
	"projectId": "string (required)",
	"name": "string (required)",
	"description": "string (optional)",
	"environmentId": "string (optional)",
	"environment": "string (optional)",
	"milestoneId": "string (optional)"
}
```

**Notes:**

- You can provide either `environmentId` (for existing environments) or `environment` (name - will be auto-created)
- The test run status is automatically set to `IN_PROGRESS`

**Response:**

```json
{
	"id": "run_123",
	"name": "Nightly Regression - v2.1.0",
	"status": "IN_PROGRESS",
	"projectId": "proj_456",
	"environmentId": "env_789",
	"milestoneId": "ms_012",
	"createdBy": "user_123",
	"startedAt": "2024-01-15T10:30:00Z",
	"completedAt": null,
	"description": "...",
	"createdAt": "2024-01-15T10:30:00Z",
	"updatedAt": "2024-01-15T10:30:00Z",
	"project": {
		"id": "proj_456",
		"name": "E-Commerce Platform",
		"key": "ECOM"
	},
	"environment": {
		"id": "env_789",
		"name": "Production"
	},
	"milestone": {
		"id": "ms_012",
		"name": "v2.1.0"
	}
}
```

---

### 2. Submit Test Results (Batch)

**POST** `/api/results`

Submit test results in batch from your test runner. This is the main endpoint for Playwright reporters.

**Request Body:**

```json
{
	"testRunId": "string (required)",
	"results": [
		{
			"title": "string (required)",
			"fullTitle": "string (optional)",
			"status": "passed | failed | skipped | timedout | interrupted (required)",
			"duration": "number (optional, milliseconds)",
			"errorMessage": "string (optional)",
			"error": "string (optional, alternative to errorMessage)",
			"stackTrace": "string (optional)",
			"attachments": [
				{
					"name": "string",
					"contentType": "string (e.g., 'image/png')",
					"body": "string | Buffer (base64 or file path)",
					"type": "string (optional)"
				}
			]
		}
	]
}
```

**Important Features:**

- **Auto-creates test cases**: If a test case doesn't exist, it will be created automatically
- **Auto-creates test suites**: Uses `fullTitle` to create nested suite hierarchy (e.g., "Auth > Login > Success")
- **Attachment support**: Screenshots, videos, logs, and other files
- **Notifications**: Automatically sends notifications for failed tests (if integrations configured)
- **Status mapping**: Playwright statuses are automatically mapped to QA Studio statuses

**Status Mapping:**

- `passed` → `PASSED`
- `failed`, `timedout` → `FAILED`
- `skipped`, `interrupted` → `SKIPPED`

**Full Title Format:**
The `fullTitle` field should use `>` as a separator for nested suites:

```
"Suite Name > Nested Suite > Test Name"
```

Example: `"Auth > Login > Success > should login with valid credentials"`

This will create:

- Suite: "Auth"
    - Suite: "Login"
        - Suite: "Success"
            - Test Case: "should login with valid credentials"

**Attachment Body Formats:**
The `body` field in attachments supports the following formats:

1. **Base64 string**: `"iVBORw0KGgoAAAANSUhEUgAAAA..."` (recommended)
2. **Buffer object**: `Buffer.from(...)`
3. **Serialized Buffer**: `{ type: 'Buffer', data: [bytes...] }`

**Security Note:** File paths are NOT supported. All attachment data must be provided as base64-encoded strings or Buffer objects to prevent unauthorized file system access.

**Response:**

```json
{
	"processedCount": 2,
	"results": [
		{
			"testCaseId": "tc_123",
			"testResultId": "result_456",
			"title": "should login with valid credentials",
			"status": "PASSED",
			"created": false,
			"attachmentCount": 0
		},
		{
			"testCaseId": "tc_124",
			"testResultId": "result_457",
			"title": "should show error for invalid password",
			"status": "FAILED",
			"created": true,
			"attachmentCount": 1
		}
	],
	"errors": []
}
```

**Response Fields:**

- `processedCount`: Number of results successfully processed
- `results`: Array of processed test results
    - `created`: `true` if the test case was newly created, `false` if it already existed
    - `attachmentCount`: Number of attachments successfully uploaded
- `errors`: Array of any errors encountered during processing (optional)

---

### 3. Complete a Test Run

**POST** `/api/runs/{runId}/complete`

Mark a test run as completed when all tests have been submitted.

**No request body required**

**Response:**

```json
{
  "id": "run_123",
  "status": "COMPLETED",
  "completedAt": "2024-01-15T11:30:00Z",
  ...
}
```

---

## Additional Endpoints

### Get Test Run Results

**GET** `/api/runs/{runId}/results`

Retrieve all test results for a specific run.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)
- `status` (optional): Filter by status (PASSED, FAILED, SKIPPED, etc.)

---

### List Test Runs

**GET** `/api/runs/list`

Get a list of test runs for a project.

**Query Parameters:**

- `projectId` (required): Project ID
- `page` (optional): Page number
- `limit` (optional): Results per page
- `status` (optional): Filter by status
- `environmentId` (optional): Filter by environment
- `milestoneId` (optional): Filter by milestone

---

### Get Test Case Results

**GET** `/api/cases/{testCaseId}/results`

Get execution history for a specific test case.

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Results per page

---

## Error Responses

All endpoints return standard error responses:

```json
{
	"error": "Error message description"
}
```

**Common HTTP Status Codes:**

- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (no access to this resource)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Best Practices for Playwright Reporters

### 1. Create Test Run at Start

Create the test run before any tests execute:

```typescript
// In onBegin() hook
const testRun = await createTestRun({
	projectId: config.projectId,
	name: `${config.name} - ${new Date().toISOString()}`,
	environment: process.env.ENV || 'Development'
});
```

### 2. Batch Results Submission

Submit results in batches (e.g., after each test file or every N tests) to reduce API calls:

```typescript
// In onTestEnd() hook
resultsBatch.push(testResult);

if (resultsBatch.length >= 10) {
	await submitResults(resultsBatch);
	resultsBatch = [];
}
```

### 3. Handle Attachments Efficiently

- Use base64 encoding for small files (< 1MB)
- Use file paths for large files (the API will read and upload them)
- Compress screenshots when possible

### 4. Complete Test Run

Always mark the run as complete in the `onEnd()` hook:

```typescript
// In onEnd() hook
await completeTestRun(testRunId);
```

### 5. Error Handling

Handle API errors gracefully to avoid failing tests due to reporting issues:

```typescript
try {
	await submitResults(results);
} catch (error) {
	console.error('Failed to submit results:', error);
	// Don't throw - let tests continue
}
```

---

## Environment Variables

Recommended environment variables for your reporter:

```bash
# Required
QA_STUDIO_API_KEY=your-api-key-here
QA_STUDIO_PROJECT_ID=your-project-id

# Optional
QA_STUDIO_API_URL=https://qastudio.dev/api  # Default
QA_STUDIO_ENVIRONMENT=Production            # Default: 'Development'
QA_STUDIO_MILESTONE_ID=milestone-id         # Optional
```

---

## Example Playwright Reporter Implementation

```typescript
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class QAStudioReporter implements Reporter {
	private apiKey: string;
	private apiUrl: string;
	private projectId: string;
	private testRunId: string | null = null;
	private resultsBatch: any[] = [];

	constructor() {
		this.apiKey = process.env.QA_STUDIO_API_KEY!;
		this.apiUrl = process.env.QA_STUDIO_API_URL || 'https://qastudio.dev/api';
		this.projectId = process.env.QA_STUDIO_PROJECT_ID!;
	}

	async onBegin() {
		// Create test run
		const response = await fetch(`${this.apiUrl}/runs`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				projectId: this.projectId,
				name: `Playwright Run - ${new Date().toISOString()}`,
				environment: process.env.QA_STUDIO_ENVIRONMENT || 'Development',
				milestoneId: process.env.QA_STUDIO_MILESTONE_ID
			})
		});

		const data = await response.json();
		this.testRunId = data.id;
		console.log(`Created test run: ${this.testRunId}`);
	}

	async onTestEnd(test: TestCase, result: TestResult) {
		const testResult = {
			title: test.title,
			fullTitle: test.titlePath().join(' > '),
			status: result.status,
			duration: result.duration,
			errorMessage: result.error?.message,
			stackTrace: result.error?.stack,
			attachments: result.attachments.map((att) => ({
				name: att.name,
				contentType: att.contentType,
				body: att.path // File path
			}))
		};

		this.resultsBatch.push(testResult);

		// Submit in batches of 10
		if (this.resultsBatch.length >= 10) {
			await this.submitBatch();
		}
	}

	async onEnd() {
		// Submit remaining results
		if (this.resultsBatch.length > 0) {
			await this.submitBatch();
		}

		// Complete test run
		if (this.testRunId) {
			await fetch(`${this.apiUrl}/runs/${this.testRunId}/complete`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`
				}
			});
			console.log(`Completed test run: ${this.testRunId}`);
		}
	}

	private async submitBatch() {
		try {
			await fetch(`${this.apiUrl}/results`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					testRunId: this.testRunId,
					results: this.resultsBatch
				})
			});

			console.log(`Submitted ${this.resultsBatch.length} test results`);
			this.resultsBatch = [];
		} catch (error) {
			console.error('Failed to submit results:', error);
		}
	}
}

export default QAStudioReporter;
```

---

## Support

For issues or questions:

- GitHub: https://github.com/your-org/qa-studio/issues
- Documentation: https://qastudio.dev/docs
