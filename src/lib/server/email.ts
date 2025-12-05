import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true'; // true for 465, false for 587

// Use EMAIL_FROM if set, otherwise fall back to EMAIL_USER
// This allows using a display name: EMAIL_FROM="QA Studio <ben@qastudio.dev>"
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'noreply@qastudio.dev';

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		if (!EMAIL_USER || !EMAIL_PASSWORD) {
			console.warn('Email credentials not configured. Emails will not be sent.');
			// Return a test transporter that logs instead of sending
			transporter = nodemailer.createTransport({
				streamTransport: true,
				newline: 'unix',
				buffer: true
			});
		} else {
			transporter = nodemailer.createTransport({
				host: EMAIL_HOST,
				port: EMAIL_PORT,
				secure: EMAIL_SECURE,
				auth: {
					user: EMAIL_USER,
					pass: EMAIL_PASSWORD
				}
			});
		}
	}
	return transporter;
}

/**
 * Send an email
 */
export async function sendEmail({
	to,
	subject,
	text,
	html
}: {
	to: string;
	subject: string;
	text: string;
	html?: string;
}) {
	const transporter = getTransporter();

	try {
		const info = await transporter.sendMail({
			from: EMAIL_FROM,
			to,
			subject,
			text,
			html: html || text
		});

		console.log('Email sent:', info.messageId);
		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error('Error sending email:', error);
		return { success: false, error };
	}
}

interface InvitationEmailData {
	to: string;
	teamName: string;
	inviterName: string;
	role: string;
	inviteUrl: string;
	expiresAt: Date;
}

/**
 * Send team invitation email
 */
export async function sendInvitationEmail(data: InvitationEmailData) {
	const { to, teamName, inviterName, role, inviteUrl, expiresAt } = data;

	const expiresIn = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

	const text = `
You've been invited to join ${teamName}!

Hi there,

${inviterName} has invited you to join ${teamName} on QA Studio.

Your Role: ${role}

Accept your invitation here:
${inviteUrl}

This invitation will expire in ${expiresIn} ${expiresIn === 1 ? 'day' : 'days'}.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} QA Studio. All rights reserved.
	`.trim();

	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
    </div>

    <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on QA Studio.
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">Your Role:</p>
            <p style="margin: 0; font-size: 18px; color: #667eea; font-weight: bold;">${role}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            This invitation will expire in ${expiresIn} ${expiresIn === 1 ? 'day' : 'days'}.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
            If you didn't expect this invitation, you can safely ignore this email.
        </p>

        <p style="font-size: 14px; color: #6b7280; margin: 0;">
            <a href="${inviteUrl}" style="color: #667eea; text-decoration: none;">${inviteUrl}</a>
        </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} QA Studio. All rights reserved.</p>
        <p style="margin: 8px 0 0 0;">
            <a href="https://qastudio.dev" style="color: #9ca3af; text-decoration: none;">qastudio.dev</a>
        </p>
    </div>
</body>
</html>
	`.trim();

	return sendEmail({
		to,
		subject: `You've been invited to join ${teamName} on QA Studio`,
		text,
		html
	});
}

/**
 * Send notification to team admin when invitation is accepted
 */
export async function sendInvitationAcceptedEmail(
	adminEmail: string,
	teamName: string,
	memberName: string,
	memberEmail: string
) {
	const appUrl = process.env.PUBLIC_APP_URL || 'https://qastudio.dev';

	const text = `
New Team Member!

${memberName} (${memberEmail}) has accepted your invitation and joined ${teamName}.

View your team: ${appUrl}/teams

© ${new Date().getFullYear()} QA Studio. All rights reserved.
	`.trim();

	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Member Joined</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #10b981; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Team Member!</h1>
    </div>

    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">
            <strong>${memberName}</strong> (${memberEmail}) has accepted your invitation and joined <strong>${teamName}</strong>.
        </p>

        <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/teams" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Team</a>
        </div>
    </div>
</body>
</html>
	`.trim();

	return sendEmail({
		to: adminEmail,
		subject: `${memberName} joined ${teamName}`,
		text,
		html
	}).catch((error) => {
		console.error('Failed to send acceptance notification:', error);
		// Don't throw - notification email is nice-to-have
	});
}

/**
 * Send enterprise inquiry notification to sales team
 */
export async function sendEnterpriseInquiryEmail({
	companyName,
	contactName,
	email,
	phone,
	estimatedSeats,
	requirements,
	inquiryId
}: {
	companyName: string;
	contactName?: string | null;
	email: string;
	phone?: string | null;
	estimatedSeats?: number | null;
	requirements?: string | null;
	inquiryId: string;
}) {
	const salesEmail = process.env.SALES_EMAIL || 'ben@qastudio.dev';
	const appUrl = process.env.PUBLIC_APP_URL || 'https://qastudio.dev';

	const text = `
New Enterprise Inquiry!

Company: ${companyName}
Contact Name: ${contactName || 'Not provided'}
Email: ${email}
Phone: ${phone || 'Not provided'}
Estimated Seats: ${estimatedSeats ? estimatedSeats.toLocaleString() : 'Not specified'}

Requirements:
${requirements || 'None provided'}

---
View in Admin Panel: ${appUrl}/admin/teams
Inquiry ID: ${inquiryId}

© ${new Date().getFullYear()} QA Studio. All rights reserved.
	`.trim();

	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Enterprise Inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Enterprise Inquiry!</h1>
    </div>

    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            A new enterprise inquiry has been submitted.
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Company Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #6b7280; width: 140px;">Company:</td>
                    <td style="padding: 8px 0; color: #111827;">${companyName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Contact Name:</td>
                    <td style="padding: 8px 0; color: #111827;">${contactName || '<em>Not provided</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Email:</td>
                    <td style="padding: 8px 0;">
                        <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Phone:</td>
                    <td style="padding: 8px 0; color: #111827;">${phone || '<em>Not provided</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Estimated Seats:</td>
                    <td style="padding: 8px 0;">
                        <strong style="color: #667eea; font-size: 18px;">${estimatedSeats ? estimatedSeats.toLocaleString() : '<em>Not specified</em>'}</strong>
                    </td>
                </tr>
            </table>
        </div>

        ${
			requirements
				? `
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">Requirements</h3>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${requirements}</p>
        </div>
        `
				: ''
		}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/admin/teams" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View in Admin Panel</a>
        </div>

        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <strong>Inquiry ID:</strong> ${inquiryId}
            </p>
        </div>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} QA Studio. All rights reserved.</p>
    </div>
</body>
</html>
	`.trim();

	return sendEmail({
		to: salesEmail,
		subject: `New Enterprise Inquiry: ${companyName}`,
		text,
		html
	});
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail({
	to,
	name,
	teamName
}: {
	to: string;
	name?: string;
	teamName?: string;
}) {
	const appUrl = process.env.PUBLIC_APP_URL || 'https://qastudio.dev';
	const greeting = name ? `Hi ${name}` : 'Welcome';

	const text = `
${greeting}!

Welcome to QA Studio! We're excited to have you on board.

${teamName ? `Your team "${teamName}" is ready to go.` : "Let's get started with your first project."}

Here's what you can do next:
- Create your first project
- Invite team members
- Start tracking test results

Get started: ${appUrl}/projects/new

Need help? Check out our documentation at ${appUrl}/docs or contact support.

Happy testing!
The QA Studio Team

© ${new Date().getFullYear()} QA Studio. All rights reserved.
	`.trim();

	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to QA Studio</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to QA Studio!</h1>
    </div>

    <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 18px; margin-bottom: 20px;">${greeting}!</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            We're excited to have you on board. ${teamName ? `Your team <strong>"${teamName}"</strong> is ready to go.` : "Let's get started with your first project."}
        </p>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #065f46;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #047857;">
                <li style="margin: 8px 0;">Create your first project</li>
                <li style="margin: 8px 0;">Invite team members to collaborate</li>
                <li style="margin: 8px 0;">Start tracking test results</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/projects/new" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Get Started</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 14px; color: #6b7280;">
            Need help? Check out our <a href="${appUrl}/docs" style="color: #667eea; text-decoration: none;">documentation</a> or contact our support team.
        </p>

        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            Happy testing!<br>
            <strong>The QA Studio Team</strong>
        </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} QA Studio. All rights reserved.</p>
        <p style="margin: 8px 0 0 0;">
            <a href="https://qastudio.dev" style="color: #9ca3af; text-decoration: none;">qastudio.dev</a>
        </p>
    </div>
</body>
</html>
	`.trim();

	return sendEmail({
		to,
		subject: 'Welcome to QA Studio!',
		text,
		html
	});
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
	to,
	resetUrl,
	expiresInMinutes = 60
}: {
	to: string;
	resetUrl: string;
	expiresInMinutes?: number;
}) {
	const text = `
Password Reset Request

Hi there,

We received a request to reset your password for your QA Studio account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} QA Studio. All rights reserved.
	`.trim();

	const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
    </div>

    <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your QA Studio account.
        </p>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⏱️ This link will expire in ${expiresInMinutes} minutes.</strong>
            </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>

        <p style="font-size: 14px; color: #6b7280; margin: 0;">
            <strong>Link:</strong> <a href="${resetUrl}" style="color: #667eea; text-decoration: none; word-break: break-all;">${resetUrl}</a>
        </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} QA Studio. All rights reserved.</p>
    </div>
</body>
</html>
	`.trim();

	return sendEmail({
		to,
		subject: 'Reset Your QA Studio Password',
		text,
		html
	});
}
