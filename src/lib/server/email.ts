// TODO: Install resend package when email functionality is needed
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

interface InvitationEmailData {
	to: string;
	teamName: string;
	inviterName: string;
	role: string;
	inviteUrl: string;
	expiresAt: Date;
}

/**
 * Send team invitation email via Resend
 */
export async function sendInvitationEmail(data: InvitationEmailData) {
	const { to, teamName, inviterName, role, inviteUrl, expiresAt } = data;

	const expiresIn = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

	try {
		// TODO: Uncomment when resend is installed
		throw new Error('Email functionality not yet implemented');
		/* const result = await resend.emails.send({
			from: 'QA Studio <invitations@qastudio.dev>',
			to,
			subject: `You've been invited to join ${teamName} on QA Studio`,
			html: `
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
			`
		});

		return result; */
	} catch (error) {
		console.error('Failed to send invitation email:', error);
		throw new Error('Failed to send invitation email');
	}
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
	try {
		// TODO: Uncomment when resend is installed
		throw new Error('Email functionality not yet implemented');
		/* await resend.emails.send({
			from: 'QA Studio <notifications@qastudio.dev>',
			to: adminEmail,
			subject: `${memberName} joined ${teamName}`,
			html: `
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
            <a href="https://qastudio.dev/teams" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Team</a>
        </div>
    </div>
</body>
</html>
			`
		}); */
	} catch (error) {
		console.error('Failed to send acceptance notification:', error);
		// Don't throw - notification email is nice-to-have
	}
}
