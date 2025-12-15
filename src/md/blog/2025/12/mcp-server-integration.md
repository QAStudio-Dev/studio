---
title: Introducing the QA Studio MCP Server - Test Management Directly from Claude
date: 2025-12-15T10:00:00.000Z
description: Interact with your test management platform directly from Claude using the Model Context Protocol. Create test runs, view results, and manage test cases through natural conversation.
cover: ''
category: Product Updates
tags:
    - integrations
    - mcp
    - automation
    - api
    - ai
author: QA Studio Team
slug: mcp-server-integration
published: true
---

What if you could manage your entire testing workflow through natural conversation with Claude? Create test runs, check results, and organize test cases without leaving your chat interface?

Today, we're excited to announce the **QA Studio MCP Server** - a Model Context Protocol integration that brings QA Studio's powerful API directly into Claude Desktop and any MCP-compatible AI assistant.

## What is the Model Context Protocol?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open standard that allows AI assistants like Claude to interact with external tools and services. Think of it as a bridge between Claude's conversational AI and real-world applications.

With MCP, you can ask Claude questions like:

> "Show me all test runs for project ABC123"

> "Create a new regression test run for staging environment"

> "What failed tests do we have in run XYZ789?"

And Claude will use the QA Studio MCP server to execute those operations and return real results from your test management platform.

## Why MCP for Test Management?

Testing teams juggle multiple tools throughout their day: switching between test execution frameworks, result dashboards, ticket trackers, and communication platforms. Context switching kills productivity.

The QA Studio MCP server eliminates this friction:

- **Natural Language Interface**: Describe what you want instead of remembering API endpoints
- **Contextual Workflows**: Claude can chain multiple operations together intelligently
- **No UI Required**: Access QA Studio features without opening a browser
- **Perfect for Automation**: Integrate testing workflows into broader AI-assisted development
- **Team Collaboration**: Share testing insights directly in conversations with Claude

## Key Features

### 1. Project Discovery

List and search across all your testing projects:

```
You: Show me all projects in QA Studio
Claude: I'll list all your projects...

[Uses list-projects tool]

You have 3 projects:
- ABC123: E-Commerce Platform (created Nov 2024)
- DEF456: Mobile App Testing (created Dec 2024)
- GHI789: API Automation Suite (created Dec 2024)
```

Search with natural language:

```
You: Find projects related to "mobile"
Claude: [Uses list-projects with search filter]

Found 1 project matching "mobile":
- DEF456: Mobile App Testing
```

### 2. Test Run Management

Create test runs with full context:

```
You: Create a new test run for project ABC123 called "Sprint 45 Regression"
     in the staging environment
Claude: [Uses create-test-run tool]

✅ Created test run: RUN-abc1
   Name: Sprint 45 Regression
   Project: ABC123
   Environment: staging
   Status: In Progress
```

View test run history:

```
You: Show me recent test runs for ABC123
Claude: [Uses list-test-runs tool]

Recent test runs for ABC123:
1. RUN-abc1: Sprint 45 Regression (staging) - In Progress
2. RUN-abc2: Smoke Tests (production) - Completed (98% pass rate)
3. RUN-abc3: API Integration Tests (QA) - Completed (100% pass rate)
```

Get detailed run information:

```
You: Get details for test run RUN-abc1
Claude: [Uses get-test-run tool]

Test Run: RUN-abc1
Name: Sprint 45 Regression
Project: ABC123
Environment: staging
Status: In Progress
Tests: 45 passed, 3 failed, 2 skipped (50 total)
Duration: 12m 34s
Started: 2025-12-15 10:30:00
```

### 3. Test Results Analysis

Filter and analyze test results:

```
You: Show me all failed tests in run RUN-abc1
Claude: [Uses get-test-results with status filter]

Failed Tests (3):
1. User Login - Login with invalid credentials
   Error: Expected 401, got 500
   Duration: 2.3s

2. Shopping Cart - Add product to cart
   Error: Cart total calculation incorrect
   Duration: 1.8s

3. Checkout - Process payment
   Error: Timeout waiting for payment gateway
   Duration: 30s
```

### 4. Test Case Creation

Create detailed test cases with steps:

```
You: Create a high priority functional test case for project ABC123:
     Title: "Verify user login with valid credentials"
     Steps:
     1. Navigate to login page
     2. Enter valid username and password
     3. Click login button
     Expected: User is redirected to dashboard

Claude: [Uses create-test-case tool]

✅ Created test case: TC-123
   Title: Verify user login with valid credentials
   Priority: HIGH
   Type: FUNCTIONAL
   Steps: 3 steps defined
   Status: Active
```

### 5. Manual Test Result Submission

Submit manual test results directly from conversation:

```
You: Submit these manual test results for project ABC123, run RUN-abc1:
     - "Login test" - passed
     - "Registration test" - failed (Error: Email validation not working)
     - "Logout test" - passed

Claude: [Uses submit-test-results tool]

✅ Submitted 3 test results:
   - Login test: PASSED
   - Registration test: FAILED (Email validation not working)
   - Logout test: PASSED
```

## Real-World Workflows

### Morning Standup Preparation

```
You: What's our testing status for project ABC123?
Claude: Let me check your recent test runs...

Latest test run (RUN-abc2):
- Name: Sprint 44 Regression
- Status: Completed
- Pass Rate: 95% (47/50 tests passed)
- Failed Tests: 3 (User Login, Cart Calculation, Payment Processing)
- Last Run: Yesterday at 11:45 PM

Would you like me to show details on the failed tests?
```

### Quick Test Execution

```
You: Start a smoke test for staging environment on project ABC123
Claude: [Creates test run]

✅ Created smoke test run: RUN-abc3
   You can now execute your tests against this run ID.

   Playwright command:
   npx playwright test --project=staging --grep=@smoke
```

### Debugging Failed Tests

```
You: Why did the "User Login" test fail in run RUN-abc2?
Claude: [Gets test result details]

Test: User Login
Status: FAILED
Error: Expected status 401 for invalid credentials, got 500
Stack Trace:
  at login.spec.ts:45:12
  at async test (/app/tests/auth/login.spec.ts:40:3)

This appears to be a server error (500) instead of the expected
authentication error (401). The backend might be throwing an unhandled
exception during login validation.
```

### Sprint Planning

```
You: Create a new test run for Sprint 46 regression testing in QA environment
     for project ABC123
Claude: [Creates test run]

✅ Created test run: RUN-abc4
   Name: Sprint 46 Regression
   Environment: QA

   Ready for test execution. Would you like me to create test cases for
   the new sprint features?
```

## Installation

### Prerequisites

- Claude Desktop (or any MCP-compatible client)
- QA Studio API key (get from Settings → API Keys)
- Node.js 16+ (for running the MCP server)

### Step 1: Install via NPM

The QA Studio MCP server is available as an npm package:

```bash
npm install -g @qastudio-dev/mcp-server
```

Or use npx to run without installing:

```bash
npx @qastudio-dev/mcp-server
```

### Step 2: Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
	"mcpServers": {
		"qastudio": {
			"command": "npx",
			"args": ["-y", "@qastudio-dev/mcp-server"],
			"env": {
				"QA_STUDIO_API_URL": "https://qastudio.dev/api",
				"QA_STUDIO_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### Step 4: Test the Integration

Start a new conversation:

```
You: Show me all projects in QA Studio
Claude: I'll list your projects using the QA Studio MCP server...
```

If you see projects listed, you're all set! 🎉

## Available Tools

The MCP server exposes 7 powerful tools:

| Tool                  | Description                    | Key Parameters                      |
| --------------------- | ------------------------------ | ----------------------------------- |
| `list-projects`       | List/search projects           | `search` (optional)                 |
| `create-test-run`     | Create new test run            | `projectId`, `name`, `env`          |
| `list-test-runs`      | List runs with pagination      | `projectId`, `limit`, `offset`      |
| `get-test-run`        | Get detailed run information   | `projectId`, `testRunId`            |
| `get-test-results`    | Get results with status filter | `projectId`, `testRunId`, `status`  |
| `create-test-case`    | Create test case with steps    | `projectId`, `title`, `steps`       |
| `submit-test-results` | Submit manual test results     | `projectId`, `testRunId`, `results` |

All tools work through natural language - you don't need to memorize these. Just describe what you want!

## Local Development

Want to contribute or customize the MCP server? It's open source!

```bash
# Clone the repository
git clone https://github.com/QAStudio-Dev/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Configure for local development in Claude Desktop
{
  "mcpServers": {
    "qastudio": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "QA_STUDIO_API_URL": "http://localhost:3000/api",
        "QA_STUDIO_API_KEY": "your-api-key"
      }
    }
  }
}
```

The MCP server is built with:

- **TypeScript** for type safety
- **@modelcontextprotocol/sdk** for MCP protocol handling
- **Node.js fetch** for API requests
- **stdio transport** for Claude Desktop integration

## Security Considerations

The MCP server follows security best practices:

- **API Key Authentication**: All requests require valid QA Studio API key
- **HTTPS Only**: Production instances use encrypted connections
- **No Local Storage**: API keys stored in Claude Desktop config, not on disk
- **Team Isolation**: API keys grant access only to your team's data
- **Read/Write Operations**: Full support for creating and modifying test data
- **Audit Logging**: All API operations logged server-side in QA Studio

### Best Practices

- **Never commit API keys**: Keep your Claude Desktop config out of version control
- **Use environment-specific keys**: Different keys for dev, staging, production
- **Rotate keys regularly**: Generate new API keys periodically
- **Revoke unused keys**: Delete API keys you're no longer using
- **Monitor API usage**: Track MCP server activity in QA Studio audit logs

## Troubleshooting

### MCP Server Not Loading

1. Verify the `claude_desktop_config.json` syntax is valid JSON
2. Check that `QA_STUDIO_API_KEY` is set correctly
3. Ensure `QA_STUDIO_API_URL` points to your QA Studio instance
4. Restart Claude Desktop completely (quit and reopen)

### API Errors

1. Verify API key is valid in QA Studio settings
2. Check API key has not expired or been revoked
3. Ensure you have permissions for the requested operations
4. Check QA Studio API logs for detailed error messages

### Connection Issues

1. Confirm QA Studio instance is accessible from your machine
2. Check firewall/VPN settings if using self-hosted QA Studio
3. Verify `QA_STUDIO_API_URL` includes `/api` path
4. Test API directly with curl to rule out MCP server issues:

```bash
curl https://qastudio.dev/api/projects \
  -H "X-API-Key: your-api-key"
```

## What's Next?

This is just the beginning of our AI-assisted testing journey. We're working on:

- **More MCP Tools**: Milestone management, environment configuration, team collaboration
- **Advanced Analysis**: Claude analyzing test trends, suggesting fixes, identifying flaky tests
- **Custom Workflows**: Build your own MCP tools on top of QA Studio's API
- **CI/CD Integration**: Trigger test runs and report results through Claude conversations
- **Multi-Project Operations**: Operate across multiple projects in one conversation
- **Test Generation**: Ask Claude to generate Playwright tests for new features

## The Future of Test Management

The QA Studio MCP server represents a shift in how we interact with testing tools. Instead of navigating complex UIs or memorizing API endpoints, you can simply describe what you need in natural language.

This is especially powerful when combined with other MCP servers:

- Ask Claude to review code changes (GitHub MCP) and create corresponding test cases (QA Studio MCP)
- Analyze production errors (Sentry MCP) and trigger regression tests (QA Studio MCP)
- Update Jira tickets (Jira MCP) with test results from QA Studio (QA Studio MCP)

The Model Context Protocol enables these cross-tool workflows without writing a single integration script.

## Get Started Today

1. **Get an API Key**: Log in to QA Studio → Settings → API Keys → Create API Key
2. **Install MCP Server**: `npm install -g @qastudio-dev/mcp-server`
3. **Configure Claude Desktop**: Add config to `claude_desktop_config.json`
4. **Start Testing**: Open Claude and ask about your projects!

## Links

- **GitHub Repository**: [github.com/QAStudio-Dev/mcp-server](https://github.com/QAStudio-Dev/mcp-server)
- **QA Studio Main Project**: [github.com/QAStudio-Dev/studio](https://github.com/QAStudio-Dev/studio)
- **Playwright Reporter**: [github.com/QAStudio-Dev/playwright](https://github.com/QAStudio-Dev/playwright)
- **Model Context Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **API Documentation**: [qastudio.dev/docs](https://qastudio.dev/docs)

## Get Help

Questions or need assistance with the MCP server?

- **Documentation**: [API Documentation](/docs)
- **Discord**: [Join our community](https://discord.gg/rw3UfdB9pN)
- **GitHub Issues**: [Report bugs or request features](https://github.com/QAStudio-Dev/mcp-server/issues)
- **Email**: ben@qastudio.dev

Happy testing! 🚀
