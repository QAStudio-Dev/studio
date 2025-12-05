/**
 * Test Email Configuration
 *
 * Usage:
 *   npx tsx scripts/test-email.ts <recipient-email>
 *
 * Example:
 *   npx tsx scripts/test-email.ts ben@qastudio.dev
 */

import { config } from 'dotenv';

// Load .env file
config();

// Dynamically import to ensure env vars are loaded
async function main() {
	const { sendEmail } = await import('../src/lib/server/email.js');

	const recipient = process.argv[2];

	if (!recipient) {
		console.error('Error: Please provide a recipient email address');
		console.log('Usage: npx tsx scripts/test-email.ts <recipient-email>');
		process.exit(1);
	}

	console.log('Testing email configuration...');
	console.log('Recipient:', recipient);
	console.log('');

	const result = await sendEmail({
		to: recipient,
		subject: 'QA Studio - Email Test',
		text: `
Hello!

This is a test email from QA Studio to verify your email configuration is working correctly.

If you received this email, your SMTP settings are configured properly!

Configuration:
- Host: ${process.env.EMAIL_HOST}
- Port: ${process.env.EMAIL_PORT}
- From: ${process.env.EMAIL_FROM}

Sent at: ${new Date().toISOString()}

---
QA Studio
		`.trim(),
		html: `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #5B21B6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.header h1 { color: white; margin: 0; }
		.content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
		.success { background-color: #10b981; color: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
		.config { background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
		.footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>QA Studio Email Test</h1>
		</div>

		<div class="content">
			<p><strong>Hello!</strong></p>

			<div class="success">
				<strong>✓ Success!</strong> Your email configuration is working correctly.
			</div>

			<p>This is a test email from QA Studio to verify your email configuration.</p>

			<div class="config">
				<h3>Configuration Details:</h3>
				<ul>
					<li><strong>Host:</strong> ${process.env.EMAIL_HOST}</li>
					<li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
					<li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
				</ul>
			</div>

			<p><em>Sent at: ${new Date().toISOString()}</em></p>

			<div class="footer">
				<p>© ${new Date().getFullYear()} QA Studio. All rights reserved.</p>
			</div>
		</div>
	</div>
</body>
</html>
		`.trim()
	});

	if (result.success) {
		console.log('✓ Email sent successfully!');
		console.log('Message ID:', result.messageId);
		console.log('');
		console.log('Check your inbox at:', recipient);
	} else {
		console.error('✗ Failed to send email');
		console.error('Error:', result.error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Unexpected error:', error);
	process.exit(1);
});
