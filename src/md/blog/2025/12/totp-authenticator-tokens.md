---
title: Introducing Shared Authenticator Tokens - Streamline Your 2FA Testing
date: 2025-12-02T10:00:00.000Z
description: Generate TOTP codes for automated testing with QA Studio's new shared authenticator tokens feature. Perfect for Playwright tests and team collaboration.
cover: ''
category: Product Updates
tags:
    - authentication
    - automation
    - security
    - totp
    - 2fa
author: QA Studio Team
slug: totp-authenticator-tokens
published: true
---

Testing applications with two-factor authentication (2FA) has always been a challenge for QA teams. You need to generate TOTP codes from your phone, manually type them into test forms, and coordinate across team members when sharing test accounts. What if there was a better way?

Today, we're excited to announce **Shared Authenticator Tokens** in QA Studio - a powerful new feature that brings enterprise-grade TOTP management directly into your testing workflow.

## The Problem with 2FA in Testing

Modern applications increasingly rely on two-factor authentication for security. While this is great for production security, it creates friction during testing:

- **Manual Code Entry**: Pulling codes from Google Authenticator on your phone and typing them into automated tests isn't scalable
- **Team Coordination**: Sharing authenticator secrets across team members is cumbersome and insecure
- **Test Automation Blockers**: Playwright and Selenium tests can't easily handle TOTP codes without complex workarounds
- **Multiple Accounts**: Managing dozens of test accounts with 2FA enabled becomes overwhelming
- **Environment Sprawl**: Production, staging, QA - each environment has its own set of 2FA-enabled accounts

## The Solution: Team-Shared Authenticator Tokens

QA Studio now lets you store, manage, and generate TOTP codes for all your team's test accounts in one secure location. No more juggling phones or sharing secrets via Slack.

### Key Features

#### 1. Centralized Token Management

Store all your team's authenticator tokens in one place. Add tokens via the web UI or API:

```typescript
// Add a token via API
POST /api/authenticator-tokens
{
  "name": "Production Admin Login",
  "description": "Admin account for production smoke tests",
  "secret": "JBSWY3DPEHPK3PXP",
  "issuer": "QA Studio",
  "accountName": "admin@company.com"
}
```

Or use the built-in QR code scanner to import tokens directly from services like GitHub, AWS, or your own applications.

#### 2. Batch Code Generation

Generate TOTP codes for all your team's tokens in a single API call - perfect for dashboard UIs or automated test suites:

```typescript
// Get codes for all tokens
GET /api/authenticator-tokens/codes

// Response
{
  "token-123": {
    "code": "123456",
    "timeRemaining": 25,
    "period": 30,
    "digits": 6,
    "tokenId": "token-123",
    "tokenName": "Production Admin Login"
  }
}
```

#### 3. Playwright Integration Ready

Integrate seamlessly with your existing test automation:

```typescript
import { test, expect } from '@playwright/test';

test('admin login with 2FA', async ({ page, request }) => {
	// Get TOTP code from QA Studio API
	const response = await request.get(
		'https://qastudio.dev/api/authenticator-tokens/token-123/code',
		{
			headers: {
				Authorization: 'Bearer YOUR_API_KEY'
			}
		}
	);

	const { code } = await response.json();

	// Use in your login flow
	await page.goto('https://app.example.com/login');
	await page.fill('[name="email"]', 'admin@company.com');
	await page.fill('[name="password"]', 'test-password');
	await page.click('button[type="submit"]');

	// Enter TOTP code
	await page.fill('[name="code"]', code);
	await page.click('button[type="submit"]');

	await expect(page).toHaveURL('/dashboard');
});
```

#### 4. Bank-Grade Security

We take security seriously. Your authenticator secrets are protected with:

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption with 256-bit keys
- **Key Versioning**: Support for zero-downtime key rotation
- **Authentication Tags**: Tamper detection ensures encrypted data hasn't been modified
- **Secure Key Storage**: Encryption keys stored in environment variables, never in database
- **CSRF Protection**: All state-changing operations require CSRF tokens
- **Rate Limiting**: Prevent abuse with intelligent rate limiting (20 requests/minute per user)
- **Audit Logging**: Track all token access and modifications

```typescript
// Example encrypted storage format
// v2:{iv(24 hex)}:{encrypted}:{authTag(32 hex)}
'v2:a1b2c3d4e5f6g7h8i9j0k1l2:9f8e7d6c5b4a3f2e1d0c9b8a7:1a2b3c4d5e6f7g8h9i0j1k2l3m4n';
```

#### 5. Flexible Configuration

Support for all major TOTP configurations:

- **Algorithms**: SHA1, SHA256, SHA512
- **Digits**: 6 or 8 digit codes
- **Period**: 30 or 60 second intervals
- **Custom Issuer/Account Names**: Organize tokens by service and account

```typescript
// Advanced token configuration
POST /api/authenticator-tokens
{
  "name": "AWS Root Account",
  "secret": "JBSWY3DPEHPK3PXP",
  "issuer": "Amazon Web Services",
  "accountName": "root@company.com",
  "algorithm": "SHA256",  // Default: SHA1
  "digits": 8,            // Default: 6
  "period": 60            // Default: 30
}
```

## Real-World Use Cases

### E-Commerce Testing

Your team is testing a production e-commerce site with 2FA-protected admin panel:

- Store admin TOTP tokens in QA Studio
- Automated Playwright tests fetch codes via API
- Run overnight regression tests without manual intervention
- New team members get instant access to test accounts

### Multi-Environment API Testing

Testing across dev, staging, and production environments:

- Each environment has separate admin accounts with 2FA
- QA Studio stores all tokens: "Dev Admin", "Staging Admin", "Prod Admin"
- API tests dynamically fetch the correct code based on target environment
- No more "which authenticator app has the staging code?"

### Security Penetration Testing

Red team testing login flows:

- Store test account authenticators for various privilege levels
- Quickly generate codes for different user roles
- Test rate limiting and brute force protection
- Verify 2FA implementation across attack vectors

## Getting Started

### Step 1: Add Your First Token

Navigate to the **Authenticators** page in QA Studio and click "Add Token". You have two options:

**Option A: Scan QR Code**

1. Click "Scan QR Code"
2. Upload a screenshot or image of the QR code from your 2FA setup page
3. QA Studio automatically extracts the secret and configuration
4. Review and save

**Option B: Manual Entry**

1. Enter a friendly name (e.g., "GitHub Admin")
2. Paste the TOTP secret from your service
3. Optionally configure issuer, account name, algorithm, digits, and period
4. Save

### Step 2: Generate Codes

Click on any token to view its current code and countdown timer. The code updates automatically every 30 seconds (or your configured period).

### Step 3: Use in Automation

Get your API key from the QA Studio settings and integrate with your test framework:

```bash
# Test the API endpoint
curl https://qastudio.dev/api/authenticator-tokens/codes \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## API Reference

All authenticator token features are available via REST API:

| Endpoint                             | Method | Description                    |
| ------------------------------------ | ------ | ------------------------------ |
| `/api/authenticator-tokens`          | GET    | List all team tokens           |
| `/api/authenticator-tokens`          | POST   | Create new token               |
| `/api/authenticator-tokens/:id`      | GET    | Get single token               |
| `/api/authenticator-tokens/:id`      | PATCH  | Update token                   |
| `/api/authenticator-tokens/:id`      | DELETE | Delete token                   |
| `/api/authenticator-tokens/:id/code` | GET    | Generate code for single token |
| `/api/authenticator-tokens/codes`    | GET    | Generate codes for all tokens  |

For detailed API documentation with interactive examples, visit our [API Documentation](/docs).

## Performance & Scalability

We've optimized the authenticator tokens feature for high-performance testing workflows:

- **Composite Indexes**: `[teamId, createdAt]` and `[teamId, name]` for fast queries
- **Parallel Code Generation**: All tokens processed concurrently via `Promise.all()`
- **Redis-Backed Rate Limiting**: Distributed rate limiting with in-memory fallback for development
- **Efficient Queries**: Single database query fetches all team tokens
- **Sub-Second Response Times**: Generate codes for hundreds of tokens in milliseconds

## Security Architecture

The authenticator tokens feature follows defense-in-depth principles:

```
1. Authentication: Verify session cookie or API key
2. CSRF Protection: Validate CSRF token for state-changing operations
3. Rate Limiting: 20 requests/minute per user (Redis sliding window)
4. Authorization: Verify user belongs to token's team
5. Decryption: AES-256-GCM with authentication tag verification
6. Code Generation: TOTP algorithm with current timestamp
7. Audit Logging: Track all token access and modifications
```

## What's Next?

This is just the beginning. We're already working on:

- **Browser Extension**: Generate codes directly in Chrome/Firefox without API calls
- **Mobile App**: Native iOS/Android apps for on-the-go code generation
- **Webhook Integration**: Automatically fetch codes in CI/CD pipelines
- **Import/Export**: Bulk import from Google Authenticator, Authy, 1Password
- **Token Sharing Permissions**: Fine-grained access control per token
- **Usage Analytics**: Track which tokens are used most in automation

## Security Note

This feature is designed for **test environments and QA workflows**. Never use QA Studio to store production authenticator secrets for your own personal accounts. For production 2FA management, use dedicated password managers like 1Password or Bitwarden.

## Pricing

Authenticator Tokens are included in all QA Studio plans at no additional cost. API access is available with any paid plan.

## Get Help

Having questions or need assistance with authenticator tokens?

- **Documentation**: [API Documentation](/docs)
- **Discord**: [Join our community](https://discord.gg/rw3UfdB9pN)
- **GitHub**: [Report issues or request features](https://github.com/QAStudio-Dev/studio/issues)
- **Email**: ben@qastudio.dev

Happy testing! 🚀
