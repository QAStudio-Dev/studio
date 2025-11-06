<script lang="ts">
	const lastUpdated = 'January 15, 2025';
</script>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<div class="mb-8">
		<a href="/" class="mb-4 inline-flex items-center gap-2 text-primary-500 hover:underline">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Back to Home
		</a>
		<h1 class="mb-2 text-4xl font-black">Privacy Policy</h1>
		<p class="text-surface-600 dark:text-surface-400">Last updated: {lastUpdated}</p>
	</div>

	<div class="prose prose-lg max-w-none dark:prose-invert">
		<section class="mb-8">
			<h2>1. Introduction</h2>
			<p>
				QA Studio ("we," "our," or "us") is committed to protecting your privacy. This Privacy
				Policy explains how we collect, use, disclose, and safeguard your information when you use
				our test management platform at qastudio.dev (the "Service").
			</p>
			<p>
				<strong>Self-Hosted Deployments:</strong> If you self-host QA Studio, you are the data controller
				and this privacy policy does not apply to your deployment. You are responsible for complying
				with applicable privacy laws.
			</p>
		</section>

		<section class="mb-8">
			<h2>2. Information We Collect</h2>

			<h3>2.1 Information You Provide</h3>
			<ul>
				<li>
					<strong>Account Information:</strong> Email address, name, and authentication credentials managed
					through Clerk.
				</li>
				<li>
					<strong>Test Data:</strong> Test cases, test results, test runs, attachments (screenshots,
					logs, videos), comments, and related metadata.
				</li>
				<li>
					<strong>Team Information:</strong> Team name, member information, and organization details.
				</li>
				<li>
					<strong>Payment Information:</strong> Processed securely by Stripe. We do not store complete
					credit card numbers.
				</li>
				<li>
					<strong>Integration Data:</strong> Webhook URLs, API tokens for third-party integrations (Slack,
					Discord, GitHub, etc.).
				</li>
			</ul>

			<h3>2.2 Automatically Collected Information</h3>
			<ul>
				<li>
					<strong>Usage Data:</strong> IP address, browser type, device information, pages visited, features
					used, and interaction patterns.
				</li>
				<li>
					<strong>Cookies:</strong> Session cookies for authentication, preference cookies for user settings,
					and analytics cookies.
				</li>
				<li>
					<strong>API Usage:</strong> API requests, response times, and error logs for monitoring and
					debugging.
				</li>
			</ul>

			<h3>2.3 Information from Third Parties</h3>
			<ul>
				<li>
					<strong>Clerk:</strong> Authentication provider that manages user accounts and sessions.
				</li>
				<li>
					<strong>Stripe:</strong> Payment processor for billing and subscription management.
				</li>
				<li>
					<strong>OpenAI:</strong> AI-powered test diagnostics and insights (optional feature).
				</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>3. How We Use Your Information</h2>
			<p>We use collected information for:</p>
			<ul>
				<li>
					<strong>Service Delivery:</strong> Providing and maintaining the test management platform.
				</li>
				<li>
					<strong>Test Management:</strong> Storing, organizing, and displaying your test data.
				</li>
				<li>
					<strong>AI Features:</strong> Generating test diagnostics and insights (when enabled).
				</li>
				<li>
					<strong>Communication:</strong> Sending notifications, updates, and support responses.
				</li>
				<li>
					<strong>Analytics:</strong> Understanding usage patterns to improve the platform.
				</li>
				<li><strong>Security:</strong> Detecting fraud, abuse, and security threats.</li>
				<li>
					<strong>Billing:</strong> Processing payments and managing subscriptions.
				</li>
				<li><strong>Legal Compliance:</strong> Complying with applicable laws and regulations.</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>4. Data Sharing and Disclosure</h2>

			<h3>4.1 Third-Party Service Providers</h3>
			<p>We share data with trusted service providers:</p>
			<ul>
				<li><strong>Clerk:</strong> Authentication and user management</li>
				<li><strong>Vercel:</strong> Hosting and infrastructure</li>
				<li><strong>Stripe:</strong> Payment processing</li>
				<li><strong>OpenAI:</strong> AI-powered features (only when you use AI diagnostics)</li>
				<li><strong>Vercel Blob:</strong> File storage for attachments</li>
			</ul>

			<h3>4.2 Team Members</h3>
			<p>
				If you're part of a team, your test data, activity, and profile information may be visible
				to other team members.
			</p>

			<h3>4.3 Legal Requirements</h3>
			<p>We may disclose information if required by law, court order, or government request.</p>

			<h3>4.4 Business Transfers</h3>
			<p>
				In the event of a merger, acquisition, or sale, your information may be transferred to the
				new owner.
			</p>
		</section>

		<section class="mb-8">
			<h2>5. Data Retention</h2>
			<ul>
				<li>
					<strong>Active Accounts:</strong> We retain your data as long as your account is active.
				</li>
				<li>
					<strong>Deleted Accounts:</strong> Data is deleted within 30 days of account deletion, except
					where required by law.
				</li>
				<li>
					<strong>Backups:</strong> Backup data may persist for up to 90 days after deletion.
				</li>
				<li>
					<strong>Legal Requirements:</strong> We may retain certain data longer if required by law.
				</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>6. Data Security</h2>
			<p>We implement industry-standard security measures:</p>
			<ul>
				<li><strong>Encryption:</strong> Data encrypted in transit (TLS) and at rest.</li>
				<li><strong>Access Controls:</strong> Role-based access and authentication.</li>
				<li><strong>Regular Audits:</strong> Security reviews and vulnerability assessments.</li>
				<li>
					<strong>Secure Infrastructure:</strong> Hosted on Vercel with enterprise-grade security.
				</li>
			</ul>
			<p>
				<strong>Note:</strong> No system is 100% secure. While we strive to protect your data, we cannot
				guarantee absolute security.
			</p>
		</section>

		<section class="mb-8">
			<h2>7. Your Rights</h2>
			<p>You have the right to:</p>
			<ul>
				<li><strong>Access:</strong> Request a copy of your personal data.</li>
				<li><strong>Correction:</strong> Update or correct inaccurate information.</li>
				<li><strong>Deletion:</strong> Request deletion of your account and data.</li>
				<li><strong>Export:</strong> Download your test data in portable formats.</li>
				<li><strong>Opt-Out:</strong> Unsubscribe from marketing communications.</li>
				<li><strong>Object:</strong> Object to certain data processing activities.</li>
			</ul>
			<p>
				To exercise these rights, contact us at <a href="mailto:privacy@qastudio.dev"
					>privacy@qastudio.dev</a
				>.
			</p>
		</section>

		<section class="mb-8">
			<h2>8. International Data Transfers</h2>
			<p>
				Your data may be transferred to and processed in countries outside your residence. We ensure
				appropriate safeguards are in place through:
			</p>
			<ul>
				<li>Standard contractual clauses</li>
				<li>Adequate data protection laws in the destination country</li>
				<li>Service provider agreements requiring data protection</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>9. Children's Privacy</h2>
			<p>
				QA Studio is not intended for users under 13 years old. We do not knowingly collect
				information from children. If we discover we have collected data from a child, we will
				delete it immediately.
			</p>
		</section>

		<section class="mb-8">
			<h2>10. AI Features and OpenAI</h2>
			<p>When you use AI-powered features (test diagnostics, insights):</p>
			<ul>
				<li>Test failure data and error messages are sent to OpenAI for analysis.</li>
				<li>OpenAI may use this data per their data usage policy.</li>
				<li>AI features are optional and can be disabled at any time.</li>
				<li>We cache AI responses to reduce API calls and costs.</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>11. Cookies and Tracking</h2>
			<p>We use cookies for:</p>
			<ul>
				<li><strong>Essential:</strong> Authentication and session management (required).</li>
				<li><strong>Preferences:</strong> Storing your settings and preferences.</li>
				<li><strong>Analytics:</strong> Understanding usage patterns (can be disabled).</li>
			</ul>
			<p>You can control cookies through your browser settings.</p>
		</section>

		<section class="mb-8">
			<h2>12. Third-Party Links</h2>
			<p>
				Our Service may contain links to third-party websites or services. We are not responsible
				for their privacy practices. Please review their privacy policies before providing
				information.
			</p>
		</section>

		<section class="mb-8">
			<h2>13. Changes to This Policy</h2>
			<p>
				We may update this Privacy Policy periodically. We will notify you of material changes via
				email or in-app notification. Continued use of the Service constitutes acceptance of the
				updated policy.
			</p>
		</section>

		<section class="mb-8">
			<h2>14. GDPR Compliance (EU Users)</h2>
			<p>If you are in the European Economic Area (EEA):</p>
			<ul>
				<li>
					<strong>Legal Basis:</strong> We process data based on consent, contract, legitimate interest,
					or legal obligation.
				</li>
				<li>
					<strong>Data Protection Officer:</strong> Contact privacy@qastudio.dev for GDPR inquiries.
				</li>
				<li>
					<strong>Supervisory Authority:</strong> You have the right to lodge a complaint with your local
					data protection authority.
				</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>15. CCPA Compliance (California Users)</h2>
			<p>California residents have additional rights:</p>
			<ul>
				<li>Know what personal information is collected, used, and shared.</li>
				<li>Delete personal information.</li>
				<li>Opt-out of the sale of personal information (we do not sell your data).</li>
				<li>Non-discrimination for exercising privacy rights.</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>16. Contact Us</h2>
			<p>For privacy-related questions or concerns:</p>
			<ul>
				<li>
					<strong>Email:</strong>
					<a href="mailto:privacy@qastudio.dev">privacy@qastudio.dev</a>
				</li>
				<li>
					<strong>Support:</strong>
					<a href="mailto:support@qastudio.dev">support@qastudio.dev</a>
				</li>
			</ul>
		</section>
	</div>
</div>
