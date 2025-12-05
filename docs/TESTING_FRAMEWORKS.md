# Multi-Framework Testing Support

## Overview

QA Studio provides a framework-agnostic REST API for uploading test results from any testing framework. While we provide a Playwright reporter out of the box, you can integrate results from:

- **Playwright** ✅ (Built-in reporter available)
- **Cypress**
- **Jest**
- **Mocha**
- **JUnit**
- **PyTest**
- **RSpec**
- **TestNG**
- **NUnit**
- **XUnit**
- Any other testing framework

## How It Works

1. **Create a Test Run** - Initialize a test run before your tests start
2. **Submit Results** - Send test results as they complete or in batches
3. **Upload Attachments** - Include screenshots, videos, traces, etc.
4. **Complete the Run** - Mark the run as finished

## Quick Start

### 1. Get Your API Key

Create an API key in QA Studio:

1. Go to Settings → API Keys
2. Click "Create New API Key"
3. Copy the key and store it securely

### 2. Set Your Base URL

```bash
# Development
export QA_STUDIO_URL=http://localhost:5173/api
export QA_STUDIO_API_KEY=your-api-key

# Production
export QA_STUDIO_URL=https://your-domain.com/api
export QA_STUDIO_API_KEY=your-api-key
```

## API Reference

### Authentication

All requests require Bearer token authentication:

```bash
Authorization: Bearer <your-api-key>
```

### 1. Create Test Run

**Endpoint:** `POST /api/runs`

```json
{
	"projectId": "proj_abc123",
	"name": "Nightly Regression - Chrome",
	"description": "Full regression suite",
	"environment": "Production",
	"milestoneId": "milestone_xyz"
}
```

**Response:**

```json
{
	"id": "run_def456",
	"projectId": "proj_abc123",
	"name": "Nightly Regression - Chrome",
	"status": "RUNNING",
	"createdAt": "2025-12-03T10:00:00Z"
}
```

### 2. Submit Test Results

**Endpoint:** `POST /api/results`

```json
{
	"testRunId": "run_def456",
	"results": [
		{
			"title": "should login successfully",
			"fullTitle": "Auth > Login > should login successfully",
			"status": "passed",
			"duration": 1500,
			"startedAt": "2025-12-03T10:01:00Z"
		},
		{
			"title": "should handle invalid credentials",
			"fullTitle": "Auth > Login > should handle invalid credentials",
			"status": "failed",
			"duration": 800,
			"errorMessage": "Expected error message to be displayed",
			"stackTrace": "AssertionError: ...",
			"startedAt": "2025-12-03T10:01:02Z",
			"attachments": [
				{
					"name": "failure-screenshot.png",
					"contentType": "image/png",
					"body": "<base64-encoded-data>"
				}
			]
		}
	]
}
```

**Supported Status Values:**

- `passed`
- `failed`
- `skipped`
- `blocked`
- `retest`

### 3. Upload Attachments

**Endpoint:** `POST /api/attachments`

For large files (videos, traces), upload separately:

```bash
curl -X POST https://qastudio.dev/api/attachments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@screenshot.png" \
  -F "testRunId=run_def456" \
  -F "testResultId=result_789"
```

## Framework-Specific Examples

### Cypress

Create a custom reporter plugin:

```javascript
// cypress/plugins/qa-studio-reporter.js
const fetch = require('node-fetch');

const QA_STUDIO_URL = process.env.QA_STUDIO_URL;
const API_KEY = process.env.QA_STUDIO_API_KEY;
const PROJECT_ID = process.env.QA_STUDIO_PROJECT_ID;

let testRunId;

module.exports = {
	async before(details) {
		// Create test run
		const response = await fetch(`${QA_STUDIO_URL}/runs`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				projectId: PROJECT_ID,
				name: `Cypress Run - ${new Date().toISOString()}`,
				environment: 'CI'
			})
		});
		const run = await response.json();
		testRunId = run.id;
	},

	async afterEach(test, result) {
		// Submit individual test result
		await fetch(`${QA_STUDIO_URL}/results`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				testRunId,
				results: [
					{
						title: test.title,
						fullTitle: test.fullTitle,
						status: result.state === 'passed' ? 'passed' : 'failed',
						duration: result.duration,
						errorMessage: result.error?.message,
						stackTrace: result.error?.stack
					}
				]
			})
		});
	}
};
```

### Jest

Create a custom reporter:

```javascript
// jest-qa-studio-reporter.js
const fetch = require('node-fetch');

class QAStudioReporter {
	constructor(globalConfig, options) {
		this.globalConfig = globalConfig;
		this.options = options;
		this.testRunId = null;
	}

	async onRunStart() {
		const response = await fetch(`${process.env.QA_STUDIO_URL}/runs`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.QA_STUDIO_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				projectId: process.env.QA_STUDIO_PROJECT_ID,
				name: `Jest Run - ${new Date().toISOString()}`,
				environment: 'Development'
			})
		});
		const run = await response.json();
		this.testRunId = run.id;
	}

	async onTestResult(test, testResult) {
		const results = testResult.testResults.map((result) => ({
			title: result.title,
			fullTitle: result.fullTitle,
			status: result.status === 'passed' ? 'passed' : 'failed',
			duration: result.duration,
			errorMessage: result.failureMessages[0]
		}));

		await fetch(`${process.env.QA_STUDIO_URL}/results`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.QA_STUDIO_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				testRunId: this.testRunId,
				results
			})
		});
	}
}

module.exports = QAStudioReporter;
```

Add to `jest.config.js`:

```javascript
module.exports = {
	reporters: ['default', './jest-qa-studio-reporter.js']
};
```

### PyTest

Create a pytest plugin:

```python
# conftest.py
import pytest
import requests
import os
from datetime import datetime

QA_STUDIO_URL = os.getenv('QA_STUDIO_URL')
API_KEY = os.getenv('QA_STUDIO_API_KEY')
PROJECT_ID = os.getenv('QA_STUDIO_PROJECT_ID')

test_run_id = None

def pytest_sessionstart(session):
    global test_run_id
    response = requests.post(
        f'{QA_STUDIO_URL}/runs',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'projectId': PROJECT_ID,
            'name': f'PyTest Run - {datetime.now().isoformat()}',
            'environment': 'Testing'
        }
    )
    test_run_id = response.json()['id']

def pytest_runtest_logreport(report):
    if report.when == 'call':
        status = 'passed' if report.outcome == 'passed' else 'failed'

        result = {
            'title': report.nodeid.split('::')[-1],
            'fullTitle': report.nodeid,
            'status': status,
            'duration': int(report.duration * 1000)
        }

        if report.outcome == 'failed':
            result['errorMessage'] = str(report.longrepr)

        requests.post(
            f'{QA_STUDIO_URL}/results',
            headers={
                'Authorization': f'Bearer {API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'testRunId': test_run_id,
                'results': [result]
            }
        )
```

### JUnit XML Import

For frameworks that output JUnit XML, create a simple converter:

```bash
#!/bin/bash
# convert-junit.sh

JUNIT_FILE=$1
QA_STUDIO_URL=${QA_STUDIO_URL}
API_KEY=${QA_STUDIO_API_KEY}
PROJECT_ID=${QA_STUDIO_PROJECT_ID}

# Create test run
RUN_ID=$(curl -s -X POST "${QA_STUDIO_URL}/runs" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"${PROJECT_ID}\",\"name\":\"JUnit Import - $(date)\"}" \
  | jq -r '.id')

# Parse JUnit XML and submit results
# (Use xmlstarlet, python, or your preferred XML parser)
python3 << EOF
import xml.etree.ElementTree as ET
import requests
import json

tree = ET.parse('${JUNIT_FILE}')
root = tree.getroot()

results = []
for testcase in root.iter('testcase'):
    result = {
        'title': testcase.get('name'),
        'fullTitle': f"{testcase.get('classname')}.{testcase.get('name')}",
        'duration': int(float(testcase.get('time', 0)) * 1000),
        'status': 'passed'
    }

    failure = testcase.find('failure')
    if failure is not None:
        result['status'] = 'failed'
        result['errorMessage'] = failure.get('message')
        result['stackTrace'] = failure.text

    skipped = testcase.find('skipped')
    if skipped is not None:
        result['status'] = 'skipped'

    results.append(result)

requests.post(
    '${QA_STUDIO_URL}/results',
    headers={
        'Authorization': f'Bearer ${API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'testRunId': '${RUN_ID}',
        'results': results
    }
)
EOF
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test and Report

on: [push]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Run Tests
              env:
                  QA_STUDIO_URL: ${{ secrets.QA_STUDIO_URL }}
                  QA_STUDIO_API_KEY: ${{ secrets.QA_STUDIO_API_KEY }}
                  QA_STUDIO_PROJECT_ID: ${{ secrets.QA_STUDIO_PROJECT_ID }}
              run: npm test
```

### GitLab CI

```yaml
test:
    script:
        - npm test
    variables:
        QA_STUDIO_URL: $QA_STUDIO_URL
        QA_STUDIO_API_KEY: $QA_STUDIO_API_KEY
        QA_STUDIO_PROJECT_ID: $QA_STUDIO_PROJECT_ID
```

## Best Practices

1. **Create runs at the start** - Initialize the test run before any tests execute
2. **Batch results** - Send results in batches (10-50) for better performance
3. **Handle failures gracefully** - Don't fail tests if reporting fails
4. **Include context** - Add environment, milestone, and descriptive names
5. **Attach evidence** - Include screenshots, videos, and logs for failures
6. **Use unique names** - Include timestamp and context in test run names

## Troubleshooting

### API Key Issues

- Ensure your API key is valid and not expired
- Check that the key has appropriate permissions

### Connection Errors

- Verify the QA_STUDIO_URL is correct
- Check network connectivity and firewalls
- Ensure SSL certificates are valid (for HTTPS)

### Result Submission Failures

- Validate JSON structure matches the API schema
- Check that testRunId exists and is valid
- Ensure attachment data is properly base64 encoded
- Verify status values are one of: passed, failed, skipped, blocked, retest

## Additional Resources

- [API Keys Setup](./API_KEYS_SETUP.md)
- [Playwright API Guide](./PLAYWRIGHT_API_GUIDE.md)
- [Reporter API Reference](./REPORTER_API.md)
- [Integrations](./INTEGRATIONS.md)
