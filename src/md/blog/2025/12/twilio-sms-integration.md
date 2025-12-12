---
title: Send and Receive SMS Messages Directly in Your Testing Platform
date: 2025-12-11T10:00:00.000Z
description: Test SMS functionality end-to-end with QA Studio's new Twilio integration. Send messages via API and receive webhooks for complete SMS workflow testing.
cover: ''
category: Product Updates
tags:
    - integrations
    - sms
    - twilio
    - automation
    - api
author: QA Studio Team
slug: twilio-sms-integration
published: true
---

Testing SMS functionality has always been challenging. You need real phone numbers, carrier integrations, webhook handling, and proper security. What if you could test SMS workflows directly within your QA platform?

Today, we're excited to announce **Twilio SMS Integration** in QA Studio - a complete solution for sending and receiving SMS messages in your testing workflows.

## The Challenge of SMS Testing

Modern applications rely heavily on SMS for critical user interactions:

- **Authentication Codes**: 2FA verification, password resets, magic links
- **Notifications**: Order confirmations, shipping updates, appointment reminders
- **Alerts**: Security warnings, fraud detection, account activity
- **Marketing**: Promotional campaigns, abandoned cart recovery

Testing these SMS workflows typically requires:

- Multiple physical phones or SIM cards for testing
- Manual verification of message delivery and content
- Complex webhook setups for receiving messages
- Expensive third-party testing services
- Security concerns with exposing credentials

## The Solution: Native Twilio Integration

QA Studio now integrates directly with Twilio, bringing enterprise-grade SMS capabilities into your testing platform. Send outbound messages via API and receive inbound messages through secure webhooks - all within your existing testing infrastructure.

### Key Features

#### 1. Secure Configuration Management

Store your Twilio credentials securely with bank-grade encryption:

```typescript
// Configure Twilio via API
POST /api/integrations/twilio
{
  "accountSid": "ACfade1234567890abcdef1234567890ab",
  "authToken": "your-auth-token",
  "phoneNumber": "+15551234567"
}
```

Security features include:

- **AES-256-GCM Encryption**: All credentials encrypted at rest with authenticated encryption
- **Key Versioning**: Support for zero-downtime credential rotation
- **No Plaintext Storage**: Credentials never stored in logs or error messages
- **Team Isolation**: Each team's credentials completely isolated from others

#### 2. Send SMS Messages via API

Send SMS messages programmatically from your test automation:

```typescript
// Send an SMS message
POST /api/integrations/twilio/sms/send
{
  "to": "+15559876543",
  "body": "Your verification code is: 123456"
}

// Response
{
  "success": true,
  "messageSid": "SM1234567890abcdef",
  "status": "queued",
  "to": "+15559876543",
  "from": "+15551234567",
  "body": "Your verification code is: 123456",
  "dateCreated": "2025-12-11T10:00:00Z"
}
```

Perfect for Playwright or Selenium tests that need to trigger SMS workflows:

```typescript
import { test, expect } from '@playwright/test';

test('user signup with SMS verification', async ({ page, request }) => {
	// User signs up
	await page.goto('https://app.example.com/signup');
	await page.fill('[name="phone"]', '+15559876543');
	await page.click('button[type="submit"]');

	// Send verification code via QA Studio
	const smsResponse = await request.post(
		'https://qastudio.dev/api/integrations/twilio/sms/send',
		{
			headers: { Authorization: 'Bearer YOUR_API_KEY' },
			data: {
				to: '+15559876543',
				body: 'Your verification code is: 123456'
			}
		}
	);

	const { messageSid } = await smsResponse.json();

	// Verify message was sent
	expect(messageSid).toMatch(/^SM/);

	// Continue with test flow
	await page.fill('[name="code"]', '123456');
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/dashboard');
});
```

#### 3. Receive SMS Messages via Webhooks

QA Studio provides a secure webhook endpoint for receiving inbound SMS messages from Twilio:

```
https://qastudio.dev/api/integrations/twilio/sms/receive
```

Configure this URL in your Twilio phone number settings under **Messaging > Webhook > A MESSAGE COMES IN**.

When a message arrives, QA Studio automatically:

1. **Verifies Twilio Signature**: Validates the X-Twilio-Signature header using HMAC-SHA1
2. **Checks Account Ownership**: Ensures the AccountSid matches your team's configuration
3. **Prevents Replay Attacks**: Detects and ignores duplicate messages using unique MessageSid
4. **Stores Message**: Saves the full message payload for audit trail and testing verification
5. **Returns TwiML**: Sends proper XML response to acknowledge receipt

Security layers include:

```typescript
// Webhook security flow
1. Signature Verification: HMAC-SHA1 with timing-safe comparison
2. Account SID Verification: Ensures message is from your Twilio account
3. Phone Number Lookup: Finds team by recipient phone number
4. Duplicate Detection: Prevents processing of replayed webhooks
5. Data Sanitization: Prevents log injection attacks
```

#### 4. Complete Message Tracking

All sent and received messages are stored in the database with full audit trail:

```typescript
// Query your team's SMS messages
GET /
	api /
	integrations /
	twilio /
	messages[
		// Response
		({
			id: 'msg_123',
			direction: 'OUTBOUND',
			messageSid: 'SM1234567890abcdef',
			from: '+15551234567',
			to: '+15559876543',
			body: 'Your verification code is: 123456',
			status: 'delivered',
			sentBy: 'user_456',
			createdAt: '2025-12-11T10:00:00Z'
		},
		{
			id: 'msg_124',
			direction: 'INBOUND',
			messageSid: 'SM9876543210fedcba',
			from: '+15559876543',
			to: '+15551234567',
			body: 'STOP',
			createdAt: '2025-12-11T10:05:00Z'
		})
	];
```

Track:

- Message direction (inbound/outbound)
- Delivery status (queued, sent, delivered, failed)
- Sender and recipient
- Message content and metadata
- User who triggered the message
- Complete Twilio response data

#### 5. Plan-Based Rate Limiting

Prevent runaway costs with intelligent rate limiting:

| Plan       | SMS Limit     | Window |
| ---------- | ------------- | ------ |
| FREE       | Not available | -      |
| PRO        | 100 messages  | 1 hour |
| ENTERPRISE | 1000 messages | 1 hour |

Rate limiting uses Redis with sliding window algorithm for distributed, production-safe enforcement:

```typescript
// Rate limit example response
{
  "status": 429,
  "message": "Rate limit exceeded. Try again after 2025-12-11T11:00:00Z"
}
```

#### 6. E.164 Phone Number Validation

All phone numbers are validated against E.164 format to ensure delivery:

```typescript
// Valid E.164 formats
✅ "+15551234567"     // US
✅ "+442071234567"    // UK
✅ "+33123456789"     // France
✅ "+861234567890"    // China

// Invalid formats (will be rejected)
❌ "5551234567"       // Missing +
❌ "+0551234567"      // Starts with 0
❌ "+1-555-123-4567"  // Has dashes
❌ "(555) 123-4567"   // Formatted
```

## Real-World Use Cases

### E-Commerce Order Confirmations

Your team is testing an e-commerce platform's SMS notification system:

- Configure Twilio integration in QA Studio
- Place test order in your application
- Your app sends SMS via your backend
- QA Studio receives the inbound SMS via webhook
- Test automation verifies message content, delivery time, and format
- Complete end-to-end test without manual phone checking

### Two-Factor Authentication Testing

Testing 2FA login flows with SMS codes:

- User enters phone number in your application
- Your backend calls QA Studio's send SMS endpoint
- QA Studio sends verification code via Twilio
- Test automation extracts code from sent message record
- Enter code in application to complete login
- No need to check physical phone or external SMS service

### Appointment Reminder Testing

Healthcare application sends appointment reminders:

- Schedule test appointment in your application
- Application triggers SMS reminder 24 hours before
- QA Studio webhook receives the message
- Test verifies reminder was sent to correct patient
- Verify message contains appointment details (time, location, doctor)
- Test cancellation replies ("Reply CANCEL to cancel")

### SMS Marketing Campaign Testing

Testing bulk SMS campaigns:

- Upload test contact list to your marketing platform
- Trigger campaign send
- QA Studio tracks all outbound messages
- Verify messages respect rate limits (100/hr for Pro)
- Check for proper opt-out handling
- Verify message content matches template

## Getting Started

### Step 1: Get Twilio Credentials

1. Sign up for a [Twilio account](https://www.twilio.com/try-twilio)
2. Purchase a phone number with SMS capabilities
3. Get your Account SID and Auth Token from the Twilio Console

### Step 2: Configure QA Studio

Navigate to **Settings > Integrations > Twilio** and configure:

```typescript
// Via UI or API
POST /api/integrations/twilio
{
  "accountSid": "ACfade1234567890abcdef1234567890ab",
  "authToken": "your-auth-token",
  "phoneNumber": "+15551234567"
}
```

### Step 3: Configure Twilio Webhook

In your Twilio Console:

1. Go to **Phone Numbers > Manage > Active Numbers**
2. Click on your phone number
3. Under **Messaging Configuration**:
    - Set "A MESSAGE COMES IN" to: `https://qastudio.dev/api/integrations/twilio/sms/receive`
    - Set HTTP method to: `POST`
4. Save

### Step 4: Send Your First Message

Test the integration with a simple API call:

```bash
curl -X POST https://qastudio.dev/api/integrations/twilio/sms/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15559876543",
    "body": "Hello from QA Studio!"
  }'
```

### Step 5: Test Inbound Messages

Send a text message to your Twilio phone number from your phone. Check the QA Studio dashboard to see the received message.

## API Reference

All Twilio integration features are available via REST API:

| Endpoint                                | Method | Description                |
| --------------------------------------- | ------ | -------------------------- |
| `/api/integrations/twilio`              | GET    | Get current configuration  |
| `/api/integrations/twilio`              | POST   | Configure integration      |
| `/api/integrations/twilio`              | DELETE | Remove configuration       |
| `/api/integrations/twilio/sms/send`     | POST   | Send outbound SMS          |
| `/api/integrations/twilio/sms/receive`  | POST   | Webhook for inbound SMS    |
| `/api/integrations/twilio/messages`     | GET    | List all team messages     |
| `/api/integrations/twilio/messages/:id` | GET    | Get single message details |

For detailed API documentation with interactive examples, visit our [API Documentation](/docs).

## Security Architecture

The Twilio integration follows defense-in-depth security principles:

### Webhook Security

```
1. TLS Encryption: All webhook traffic over HTTPS
2. Signature Verification: HMAC-SHA1 validation with timing-safe comparison
3. Account Ownership: Verify AccountSid matches team configuration
4. Phone Number Lookup: Find team by recipient phone (indexed for performance)
5. Duplicate Detection: Prevent replay attacks using unique MessageSid
6. Log Sanitization: Prevent log injection attacks on message content
```

### Credential Security

```
1. Encryption at Rest: AES-256-GCM with authentication tags
2. Key Versioning: Support for zero-downtime key rotation
3. Environment Variables: Encryption keys never stored in database
4. No Plaintext Logging: Credentials never appear in logs or errors
5. Team Isolation: Complete separation between teams
```

### Rate Limiting

```
1. Redis-Backed: Distributed sliding window algorithm
2. Plan-Based Limits: Different limits for Pro (100/hr) vs Enterprise (1000/hr)
3. Graceful Degradation: In-memory fallback for development
4. Per-Team Tracking: Isolated rate limits by team ID
```

## Performance Optimizations

We've optimized the SMS integration for production workloads:

- **Database Indexing**: `Team.twilioPhoneNumber` indexed for fast webhook lookups
- **Collision Prevention**: Failed message SIDs include random bytes to prevent conflicts
- **Atomic Operations**: Redis rate limiting prevents race conditions
- **Webhook Resilience**: Failed database writes don't fail webhook (message already sent)
- **Efficient Queries**: Single query to look up team configuration
- **Crypto Best Practices**: Timing-safe comparisons prevent timing attacks

## Error Handling

The integration handles errors gracefully:

```typescript
// Invalid phone number
{
  "status": 400,
  "message": "Invalid phone number format. Use E.164 format like +15551234567"
}

// Rate limit exceeded
{
  "status": 429,
  "message": "Rate limit exceeded. Try again after 2025-12-11T11:00:00Z"
}

// Twilio API error
{
  "status": 400,
  "message": "The 'From' number +15551234567 is not a valid, SMS-capable inbound phone number"
}

// Configuration error
{
  "status": 400,
  "message": "Twilio is not properly configured. Please add your credentials."
}
```

All errors are logged server-side with sanitized content to prevent credential leakage.

## What's Next?

This is just the beginning of our Twilio integration. We're already working on:

- **MMS Support**: Send and receive images, videos, and multi-media messages
- **Message Templates**: Reusable templates for common testing scenarios
- **Bulk Messaging**: Send to multiple recipients in a single API call
- **Delivery Status Webhooks**: Track delivery, read receipts, and failures
- **Message Search**: Full-text search across all your team's messages
- **Analytics Dashboard**: Visualize message volume, delivery rates, and costs
- **WhatsApp Integration**: Extend to WhatsApp Business API
- **Voice Call Support**: Test IVR systems and voice workflows

## Compliance & Best Practices

When using the SMS integration, please follow these guidelines:

- **Test Numbers Only**: Use this feature for testing purposes with test phone numbers
- **Obtain Consent**: Always get opt-in consent before sending SMS to real users
- **Include Opt-Out**: Provide clear opt-out instructions in messages
- **TCPA Compliance**: Follow US regulations for automated messaging
- **GDPR Compliance**: Respect data privacy regulations for EU users
- **Rate Limiting**: Respect Twilio's rate limits and QA Studio's plan limits
- **Cost Monitoring**: Track SMS usage to avoid unexpected Twilio charges

QA Studio is designed for **testing environments and QA workflows**. For production SMS campaigns, use dedicated marketing platforms.

## Pricing

The Twilio SMS integration is available on Pro and Enterprise plans:

| Plan       | Feature Access | Rate Limit |
| ---------- | -------------- | ---------- |
| FREE       | Not available  | -          |
| PRO        | ✅ Included    | 100/hour   |
| ENTERPRISE | ✅ Included    | 1000/hour  |

Twilio charges apply separately based on your Twilio account's messaging rates.

## Troubleshooting

### Messages Not Sending

1. Verify Twilio credentials are correct
2. Check phone number is SMS-capable in Twilio Console
3. Ensure recipient number is in E.164 format
4. Check you haven't exceeded rate limits
5. Verify Twilio account has sufficient balance

### Webhooks Not Receiving

1. Confirm webhook URL is configured in Twilio Console
2. Check webhook URL is exactly: `https://qastudio.dev/api/integrations/twilio/sms/receive`
3. Verify HTTP method is set to POST
4. Ensure Twilio phone number matches configured number in QA Studio
5. Check server logs for signature verification failures

### Rate Limit Errors

1. Check your team's plan limits (Pro: 100/hr, Enterprise: 1000/hr)
2. Wait for the time window to reset (indicated in error message)
3. Consider upgrading to Enterprise for higher limits
4. Implement exponential backoff in your test automation

## Get Help

Having questions or need assistance with the Twilio integration?

- **Documentation**: [API Documentation](/docs)
- **Discord**: [Join our community](https://discord.gg/rw3UfdB9pN)
- **GitHub**: [Report issues or request features](https://github.com/QAStudio-Dev/studio/issues)
- **Email**: ben@qastudio.dev

Happy testing! 🚀
