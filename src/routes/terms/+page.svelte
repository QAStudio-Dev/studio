<script lang="ts">
	const lastUpdated = 'January 15, 2025';
</script>

<svelte:head>
	<title>Terms of Service - QA Studio</title>
	<meta
		name="description"
		content="QA Studio Terms of Service - Legal agreement for using our test management platform."
	/>
</svelte:head>

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
		<h1 class="mb-2 text-4xl font-black">Terms of Service</h1>
		<p class="text-surface-600 dark:text-surface-400">Last updated: {lastUpdated}</p>
	</div>

	<div class="prose prose-lg max-w-none dark:prose-invert">
		<section class="mb-8">
			<h2>1. Acceptance of Terms</h2>
			<p>
				By accessing or using QA Studio ("Service"), you agree to be bound by these Terms of
				Service ("Terms"). If you disagree with any part of these terms, you may not use the
				Service.
			</p>
			<p>
				<strong>Self-Hosted Deployments:</strong> These Terms apply to our hosted service at qastudio.dev.
				Self-hosted deployments are governed by our open-source license.
			</p>
		</section>

		<section class="mb-8">
			<h2>2. Description of Service</h2>
			<p>QA Studio is a test management platform that provides:</p>
			<ul>
				<li>Test case organization and management</li>
				<li>Test execution tracking and reporting</li>
				<li>Team collaboration features</li>
				<li>API access for automation</li>
				<li>Third-party integrations (Slack, Discord, GitHub, etc.)</li>
				<li>AI-powered test diagnostics (optional)</li>
				<li>File storage for test attachments</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>3. Account Registration</h2>
			<h3>3.1 Eligibility</h3>
			<p>
				You must be at least 13 years old and capable of forming a binding contract to use the
				Service.
			</p>

			<h3>3.2 Account Security</h3>
			<p>You are responsible for:</p>
			<ul>
				<li>Maintaining the confidentiality of your account credentials</li>
				<li>All activities that occur under your account</li>
				<li>Notifying us immediately of any unauthorized access</li>
			</ul>

			<h3>3.3 Account Information</h3>
			<p>
				You must provide accurate, current, and complete information during registration and keep
				it updated.
			</p>
		</section>

		<section class="mb-8">
			<h2>4. Subscription Plans and Billing</h2>

			<h3>4.1 Free Tier</h3>
			<ul>
				<li>One project with unlimited test cases</li>
				<li>Full API access</li>
				<li>No credit card required</li>
				<li>Subject to fair use limitations</li>
			</ul>

			<h3>4.2 Paid Plans</h3>
			<ul>
				<li>Billed monthly or annually via Stripe</li>
				<li>Automatic renewal unless canceled</li>
				<li>Pricing available at qastudio.dev/pricing</li>
				<li>Subject to change with 30 days notice</li>
			</ul>

			<h3>4.3 Refunds</h3>
			<ul>
				<li>No refunds for partial months</li>
				<li>Cancel anytime to prevent future charges</li>
				<li>Pro-rata refunds at our sole discretion</li>
			</ul>

			<h3>4.4 Payment Failures</h3>
			<p>
				If payment fails, we may suspend or downgrade your account after notification. You remain
				responsible for any outstanding charges.
			</p>
		</section>

		<section class="mb-8">
			<h2>5. Acceptable Use Policy</h2>
			<p>You agree NOT to:</p>
			<ul>
				<li>Violate any laws or regulations</li>
				<li>Infringe on intellectual property rights</li>
				<li>Transmit malware, viruses, or malicious code</li>
				<li>Attempt to gain unauthorized access to systems</li>
				<li>Interfere with or disrupt the Service</li>
				<li>Use the Service for illegal activities</li>
				<li>Scrape or harvest data without permission</li>
				<li>Reverse engineer or decompile the Service</li>
				<li>Resell or redistribute the Service</li>
				<li>Use the Service to compete with us</li>
				<li>Upload excessively large files to abuse storage</li>
				<li>Generate excessive API requests to abuse resources</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>6. User Content</h2>

			<h3>6.1 Your Content</h3>
			<p>
				You retain ownership of all test data, attachments, and content you upload ("User
				Content").
			</p>

			<h3>6.2 License to Us</h3>
			<p>You grant us a limited license to:</p>
			<ul>
				<li>Store, process, and display your User Content</li>
				<li>Perform backups and ensure redundancy</li>
				<li>Provide AI-powered features (when enabled)</li>
				<li>Comply with legal obligations</li>
			</ul>

			<h3>6.3 Content Responsibility</h3>
			<p>You are solely responsible for your User Content, including:</p>
			<ul>
				<li>Legality and compliance with laws</li>
				<li>Accuracy and reliability</li>
				<li>Obtaining necessary permissions</li>
				<li>Not violating third-party rights</li>
			</ul>

			<h3>6.4 Content Removal</h3>
			<p>
				We may remove User Content that violates these Terms or applicable laws, with or without
				notice.
			</p>
		</section>

		<section class="mb-8">
			<h2>7. Intellectual Property</h2>

			<h3>7.1 Our Rights</h3>
			<p>
				QA Studio and its original content, features, and functionality are owned by us and
				protected by international copyright, trademark, and other intellectual property laws.
			</p>

			<h3>7.2 Open Source</h3>
			<p>
				QA Studio is open-source software. The source code is available under our open-source
				license. These Terms govern the hosted service, not self-hosted deployments.
			</p>

			<h3>7.3 Trademarks</h3>
			<p>
				"QA Studio" and our logos are trademarks. You may not use them without our written
				permission.
			</p>
		</section>

		<section class="mb-8">
			<h2>8. API Usage</h2>
			<p>API access is subject to:</p>
			<ul>
				<li>Rate limits and usage quotas</li>
				<li>Authentication requirements</li>
				<li>API documentation and guidelines</li>
				<li>Prohibition of abuse or excessive requests</li>
			</ul>
			<p>We may modify API limits or access with reasonable notice.</p>
		</section>

		<section class="mb-8">
			<h2>9. Third-Party Services</h2>

			<h3>9.1 Integrations</h3>
			<p>
				QA Studio integrates with third-party services (Slack, Discord, GitHub, etc.). Your use of
				these integrations is subject to their respective terms of service.
			</p>

			<h3>9.2 Service Providers</h3>
			<p>We use third-party service providers:</p>
			<ul>
				<li><strong>Clerk:</strong> Authentication</li>
				<li><strong>Stripe:</strong> Payment processing</li>
				<li><strong>Vercel:</strong> Hosting</li>
				<li><strong>OpenAI:</strong> AI features</li>
			</ul>
			<p>Your use of the Service constitutes agreement to their terms.</p>
		</section>

		<section class="mb-8">
			<h2>10. Privacy and Data Protection</h2>
			<p>
				Our Privacy Policy (qastudio.dev/privacy) explains how we collect, use, and protect your
				data. By using the Service, you agree to our Privacy Policy.
			</p>
		</section>

		<section class="mb-8">
			<h2>11. Service Availability</h2>

			<h3>11.1 Uptime</h3>
			<p>
				We strive for high availability but do not guarantee uninterrupted access. We are not
				liable for downtime or service interruptions.
			</p>

			<h3>11.2 Maintenance</h3>
			<p>
				We may perform scheduled maintenance with reasonable notice. Emergency maintenance may
				occur without notice.
			</p>

			<h3>11.3 Service Modifications</h3>
			<p>
				We may modify, suspend, or discontinue any part of the Service at any time with reasonable
				notice.
			</p>
		</section>

		<section class="mb-8">
			<h2>12. Termination</h2>

			<h3>12.1 By You</h3>
			<p>
				You may terminate your account at any time through account settings or by contacting
				support.
			</p>

			<h3>12.2 By Us</h3>
			<p>We may suspend or terminate your account if you:</p>
			<ul>
				<li>Violate these Terms</li>
				<li>Fail to pay fees</li>
				<li>Engage in fraudulent activity</li>
				<li>Pose a security or legal risk</li>
			</ul>

			<h3>12.3 Effect of Termination</h3>
			<p>Upon termination:</p>
			<ul>
				<li>Your access to the Service ends immediately</li>
				<li>We may delete your data after 30 days</li>
				<li>You remain liable for any outstanding fees</li>
				<li>Provisions that should survive termination remain in effect</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>13. Disclaimers</h2>
			<p>
				THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS
				OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
			</p>
			<ul>
				<li>Warranties of merchantability</li>
				<li>Fitness for a particular purpose</li>
				<li>Non-infringement</li>
				<li>Accuracy or reliability</li>
				<li>Uninterrupted or error-free operation</li>
			</ul>
			<p>
				We do not warrant that the Service will meet your requirements or that defects will be
				corrected.
			</p>
		</section>

		<section class="mb-8">
			<h2>14. Limitation of Liability</h2>
			<p>
				TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
				INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
			</p>
			<ul>
				<li>Loss of profits or revenue</li>
				<li>Loss of data</li>
				<li>Loss of business opportunities</li>
				<li>Cost of substitute services</li>
			</ul>
			<p>
				OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE
				CLAIM, OR $100, WHICHEVER IS GREATER.
			</p>
		</section>

		<section class="mb-8">
			<h2>15. Indemnification</h2>
			<p>You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from:</p>
			<ul>
				<li>Your use of the Service</li>
				<li>Your User Content</li>
				<li>Your violation of these Terms</li>
				<li>Your violation of third-party rights</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2>16. Dispute Resolution</h2>

			<h3>16.1 Informal Resolution</h3>
			<p>
				Before filing a claim, you agree to contact us at legal@qastudio.dev to resolve the
				dispute informally.
			</p>

			<h3>16.2 Arbitration</h3>
			<p>
				Any disputes not resolved informally shall be resolved through binding arbitration, except
				where prohibited by law.
			</p>

			<h3>16.3 Class Action Waiver</h3>
			<p>
				You agree to resolve disputes individually, not as part of a class action or collective
				proceeding.
			</p>
		</section>

		<section class="mb-8">
			<h2>17. Governing Law</h2>
			<p>
				These Terms are governed by the laws of the United States, without regard to conflict of
				law principles.
			</p>
		</section>

		<section class="mb-8">
			<h2>18. Changes to Terms</h2>
			<p>
				We may update these Terms periodically. Material changes will be notified via email or
				in-app notification at least 30 days before taking effect. Continued use constitutes
				acceptance.
			</p>
		</section>

		<section class="mb-8">
			<h2>19. Severability</h2>
			<p>
				If any provision of these Terms is found unenforceable, the remaining provisions remain in
				effect.
			</p>
		</section>

		<section class="mb-8">
			<h2>20. Entire Agreement</h2>
			<p>
				These Terms, along with our Privacy Policy, constitute the entire agreement between you and
				us regarding the Service.
			</p>
		</section>

		<section class="mb-8">
			<h2>21. Contact Information</h2>
			<p>For questions about these Terms:</p>
			<ul>
				<li>
					<strong>Email:</strong>
					<a href="mailto:legal@qastudio.dev">legal@qastudio.dev</a>
				</li>
				<li>
					<strong>Support:</strong>
					<a href="mailto:support@qastudio.dev">support@qastudio.dev</a>
				</li>
			</ul>
		</section>

		<section class="mb-8 card border-2 border-primary-500/20 bg-primary-50/50 p-6 dark:bg-primary-950/50">
			<h2 class="mt-0">Open Source License</h2>
			<p>
				QA Studio is open-source software. These Terms of Service apply to our hosted service at
				qastudio.dev.
			</p>
			<p>
				For self-hosted deployments, please refer to our open-source license at <a
					href="https://github.com/qastudio/qastudio" target="_blank" rel="noopener noreferrer"
					>GitHub</a
				>.
			</p>
		</section>

		<section class="mb-8">
			<p class="text-sm text-surface-600 dark:text-surface-400">
				By using QA Studio, you acknowledge that you have read, understood, and agree to be bound
				by these Terms of Service.
			</p>
		</section>
	</div>
</div>
