<script lang="ts">
	import { Check, X, ArrowRight, Zap, Shield, Code, Download } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Pricing - QA Studio</title>
	<meta
		name="description"
		content="QA Studio pricing: Self-hosted open source (unlimited users, free forever) or hosted SaaS (free: 1 user/project, Pro: $10/user/month for teams)."
	/>
</svelte:head>

<!-- Hero Section -->
<section
	class="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 py-20 text-white"
>
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-3xl text-center">
			<h1 class="mb-4 text-5xl font-bold">Simple, Transparent Pricing</h1>
			<p class="text-xl text-white/90">
				Choose between our hosted platform or self-host the open source version
			</p>
		</div>
	</div>
</section>

<!-- Self-Hosted Pricing -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<div class="mb-8 text-center">
				<h2 class="mb-2 text-2xl font-bold">Self-Hosted (Open Source)</h2>
				<p class="text-surface-600 dark:text-surface-400">
					Run on your own infrastructure with full source code access
				</p>
			</div>

			<div class="grid gap-8 lg:grid-cols-3">
				<!-- Self-Hosted Free -->
				<div
					class="rounded-2xl border-2 border-surface-300 bg-white p-8 dark:border-surface-700 dark:bg-surface-800"
				>
					<div class="mb-6">
						<div class="mb-2 flex items-center gap-2">
							<Code class="h-6 w-6 text-primary-500" />
							<h2 class="text-2xl font-bold">Community</h2>
						</div>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							Self-hosted with community support
						</p>
					</div>

					<div class="mb-6">
						<div class="flex items-baseline gap-2">
							<span class="text-5xl font-bold">$0</span>
							<span class="text-surface-600 dark:text-surface-400">/forever</span>
						</div>
						<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
							AGPL-3.0 open source
						</p>
					</div>

					<a
						href="https://github.com/QAStudio-Dev/studio"
						class="mb-6 btn w-full preset-outlined-primary-500"
					>
						<Download class="mr-2 h-4 w-4" />
						Download & Install
					</a>

					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Unlimited users</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Unlimited projects</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Unlimited test cases</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Test execution tracking</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Milestone planning</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">REST API access</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Playwright integration</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Full source code access</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Community support (GitHub)</span>
						</div>
					</div>
				</div>

				<!-- Pro Support (Coming Soon) -->
				<div
					class="relative rounded-2xl border-2 border-surface-300 bg-white p-8 dark:border-surface-700 dark:bg-surface-800"
				>
					<!-- Coming Soon Badge -->
					<div class="absolute -top-4 left-1/2 -translate-x-1/2">
						<span
							class="rounded-full bg-warning-500 px-4 py-1 text-sm font-bold text-white"
						>
							Coming Soon
						</span>
					</div>

					<div class="mb-6">
						<div class="mb-2 flex items-center gap-2">
							<Zap class="h-6 w-6 text-primary-500" />
							<h2 class="text-2xl font-bold">Pro Support</h2>
						</div>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							Self-hosted + priority support
						</p>
					</div>

					<div class="mb-6">
						<div class="flex items-baseline gap-2">
							<span class="text-5xl font-bold">$99</span>
							<span class="text-surface-600 dark:text-surface-400">/month</span>
						</div>
						<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
							Billed monthly or annually
						</p>
					</div>

					<a href="/contact-sales" class="mb-6 btn w-full preset-outlined-primary-500">
						Contact Sales
					</a>

					<div class="mb-4 text-sm font-bold text-primary-500">
						Everything in Community, plus:
					</div>

					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Priority email support</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>48-hour response SLA</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Setup assistance</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Migration help</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Custom feature requests</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Security updates & patches</span>
						</div>
					</div>
				</div>

				<!-- Enterprise -->
				<div
					class="rounded-2xl border-2 border-surface-300 bg-white p-8 dark:border-surface-700 dark:bg-surface-800"
				>
					<div class="mb-6">
						<div class="mb-2 flex items-center gap-2">
							<Shield class="h-6 w-6 text-primary-500" />
							<h2 class="text-2xl font-bold">Enterprise</h2>
						</div>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							For large teams with custom needs
						</p>
					</div>

					<div class="mb-6">
						<div class="flex items-baseline gap-2">
							<span class="text-4xl font-bold">Custom</span>
						</div>
						<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
							Contact us for pricing
						</p>
					</div>

					<a href="/contact-sales" class="mb-6 btn w-full preset-outlined-primary-500">
						Contact Sales
					</a>

					<div class="mb-4 text-sm font-bold text-primary-500">
						Everything in Pro, plus:
					</div>

					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Dedicated support engineer</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>24/7 emergency support</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								><strong>4-hour critical response SLA</strong></span
							>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Custom development</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">On-premises deployment help</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">SSO integration (SAML, OAuth)</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Compliance assistance (SOC2, HIPAA)</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Hosted SaaS Pricing -->
<section class="bg-surface-50 py-20 dark:bg-surface-900">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<div class="mb-8 text-center">
				<h2 class="mb-2 text-2xl font-bold">Hosted on qastudio.dev</h2>
				<p class="text-surface-600 dark:text-surface-400">
					We manage everything - just sign up and start testing
				</p>
			</div>

			<div class="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
				<!-- SaaS Free -->
				<div
					class="rounded-2xl border-2 border-surface-300 bg-white p-8 dark:border-surface-700 dark:bg-surface-800"
				>
					<div class="mb-6">
						<div class="mb-2 flex items-center gap-2">
							<Code class="h-6 w-6 text-primary-500" />
							<h2 class="text-2xl font-bold">Free</h2>
						</div>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							Perfect for individual users
						</p>
					</div>

					<div class="mb-6">
						<div class="flex items-baseline gap-2">
							<span class="text-5xl font-bold">$0</span>
							<span class="text-surface-600 dark:text-surface-400">/forever</span>
						</div>
						<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
							No credit card required
						</p>
					</div>

					<a href="/signup" class="mb-6 btn w-full preset-outlined-primary-500">
						Sign Up Free
					</a>

					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">1 user</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">1 project</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Unlimited test cases</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Test execution tracking</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Milestone planning</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">REST API access</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Playwright integration</span>
						</div>
						<div class="flex items-start gap-3">
							<X class="h-5 w-5 flex-shrink-0 text-surface-400" />
							<span class="text-sm text-surface-500">Team collaboration</span>
						</div>
						<div class="flex items-start gap-3">
							<X class="h-5 w-5 flex-shrink-0 text-surface-400" />
							<span class="text-sm text-surface-500">Twilio integration</span>
						</div>
						<div class="flex items-start gap-3">
							<X class="h-5 w-5 flex-shrink-0 text-surface-400" />
							<span class="text-sm text-surface-500">SMS testing</span>
						</div>
					</div>
				</div>

				<!-- SaaS Pro -->
				<div
					class="relative rounded-2xl border-2 border-primary-500 bg-white p-8 shadow-xl dark:bg-surface-800"
				>
					<!-- Popular Badge -->
					<div class="absolute -top-4 left-1/2 -translate-x-1/2">
						<span
							class="rounded-full bg-primary-500 px-4 py-1 text-sm font-bold text-white"
						>
							Popular
						</span>
					</div>

					<div class="mb-6">
						<div class="mb-2 flex items-center gap-2">
							<Zap class="h-6 w-6 text-primary-500" />
							<h2 class="text-2xl font-bold">Pro</h2>
						</div>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							For teams that need to collaborate
						</p>
					</div>

					<div class="mb-6">
						<div class="flex items-baseline gap-2">
							<span class="text-5xl font-bold">$10</span>
							<span class="text-surface-600 dark:text-surface-400">/user/month</span>
						</div>
						<p class="mt-2 text-sm text-surface-600 dark:text-surface-400">
							Billed monthly
						</p>
					</div>

					<a href="/signup" class="mb-6 btn w-full preset-filled-primary-500">
						Start Pro Trial
					</a>

					<div class="mb-4 text-sm font-bold text-primary-500">
						Everything in Free, plus:
					</div>

					<div class="space-y-3">
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Unlimited users</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Unlimited projects</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Team collaboration</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>Twilio integration</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"><strong>SMS testing (TOTP codes)</strong></span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Priority email support</span>
						</div>
						<div class="flex items-start gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Advanced integrations</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Comparison with Competitors -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-5xl">
			<h2 class="mb-4 text-center text-3xl font-bold lg:text-4xl">
				Compare with Competitors
			</h2>
			<p class="mb-12 text-center text-lg text-surface-600 dark:text-surface-400">
				See how QA Studio self-hosted pricing compares to commercial alternatives
			</p>

			<!-- Comparison Table -->
			<div
				class="overflow-x-auto rounded-xl border border-surface-300 dark:border-surface-700"
			>
				<table class="w-full">
					<thead class="bg-surface-100 dark:bg-surface-800">
						<tr>
							<th class="p-4 text-left font-bold">For 10 Users</th>
							<th
								class="bg-primary-500/10 p-4 text-center font-bold text-primary-600 dark:text-primary-400"
							>
								QA Studio<br />
								<span class="text-xs font-normal">(Self-Hosted)</span>
							</th>
							<th class="p-4 text-center font-bold">TestRail</th>
							<th class="p-4 text-center font-bold">Qase.io</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-200 dark:divide-surface-700">
						<!-- Monthly Cost -->
						<tr class="bg-white dark:bg-surface-900">
							<td class="p-4 font-medium">Monthly Cost</td>
							<td class="bg-primary-500/5 p-4 text-center">
								<div
									class="text-2xl font-bold text-success-600 dark:text-success-400"
								>
									$0
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-xl font-bold text-error-600">$350</div>
								<div class="text-xs text-surface-600 dark:text-surface-400">
									$35/user
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-xl font-bold text-error-600">$360</div>
								<div class="text-xs text-surface-600 dark:text-surface-400">
									$36/user
								</div>
							</td>
						</tr>

						<!-- Annual Cost -->
						<tr class="bg-surface-50 dark:bg-surface-800">
							<td class="p-4 font-medium">Annual Cost</td>
							<td class="bg-primary-500/5 p-4 text-center">
								<div
									class="text-2xl font-bold text-success-600 dark:text-success-400"
								>
									$0
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-xl font-bold text-error-600">$4,200</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-xl font-bold text-error-600">$4,320</div>
							</td>
						</tr>

						<!-- Setup Fee -->
						<tr class="bg-white dark:bg-surface-900">
							<td class="p-4 font-medium">Setup Fee</td>
							<td class="bg-primary-500/5 p-4 text-center">
								<div class="font-bold text-success-600 dark:text-success-400">
									$0
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-surface-600 dark:text-surface-400">$0</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-surface-600 dark:text-surface-400">$0</div>
							</td>
						</tr>

						<!-- Data Privacy -->
						<tr class="bg-surface-50 dark:bg-surface-800">
							<td class="p-4 font-medium">Data Location</td>
							<td class="bg-primary-500/5 p-4 text-center">
								<div class="font-bold text-success-600 dark:text-success-400">
									Your servers
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-surface-600 dark:text-surface-400">
									Their cloud
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-surface-600 dark:text-surface-400">
									Their cloud
								</div>
							</td>
						</tr>

						<!-- 5 Year TCO -->
						<tr class="bg-white dark:bg-surface-900">
							<td class="p-4 font-medium">5-Year Total Cost</td>
							<td class="bg-primary-500/5 p-4 text-center">
								<div
									class="text-2xl font-bold text-success-600 dark:text-success-400"
								>
									$0
								</div>
								<div class="text-xs text-surface-600 dark:text-surface-400">
									+ hosting costs
								</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-2xl font-bold text-error-600">$21,000</div>
							</td>
							<td class="p-4 text-center">
								<div class="text-2xl font-bold text-error-600">$21,600</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="mt-8 text-center">
				<p class="mb-4 text-lg font-bold text-success-600 dark:text-success-400">
					Save $21,000+ over 5 years with QA Studio
				</p>
				<a href="/signup" class="btn preset-filled-primary-500">
					Get Started Free
					<ArrowRight class="ml-2 h-5 w-5" />
				</a>
			</div>
		</div>
	</div>
</section>

<!-- FAQ Section -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-3xl">
			<h2 class="mb-12 text-center text-3xl font-bold lg:text-4xl">Pricing Questions</h2>

			<div class="space-y-6">
				<!-- FAQ 1 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">
						What's the difference between self-hosted and hosted SaaS?
					</h3>
					<p class="text-surface-600 dark:text-surface-400">
						<strong>Self-hosted (open source):</strong> Download the AGPL-3.0 code and
						run it on your own servers. Completely free with unlimited users and
						projects. You manage everything.<br /><br />
						<strong>Hosted SaaS (qastudio.dev):</strong> We manage everything - just sign
						up and start testing. Free tier includes 1 user and 1 project. Pro tier ($10/user/month)
						adds unlimited users, projects, teams, Twilio integration, and SMS testing.
					</p>
				</div>

				<!-- FAQ 2 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">
						Is the self-hosted version really unlimited?
					</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Yes! The self-hosted version is AGPL-3.0 open source with no artificial
						limits. Add unlimited users, create unlimited projects and test cases. The
						only costs are your hosting infrastructure (typically $10-30/month on cloud
						providers).
					</p>
				</div>

				<!-- FAQ 3 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">What's included in Pro Support?</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Pro Support ($99/month) includes priority email support with 48-hour
						response SLA, setup assistance, migration help from other tools, custom
						feature requests, and a private Slack channel for your team.
					</p>
				</div>

				<!-- FAQ 4 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">Can I try Pro Support before paying?</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Yes! We offer a 30-day free trial of Pro Support. Contact us and we'll set
						you up with full access to evaluate the support experience.
					</p>
				</div>

				<!-- FAQ 5 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">What are the hosting costs?</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Hosting costs depend on your infrastructure. A typical small team setup
						costs $10-30/month on cloud providers like DigitalOcean or AWS. You can also
						run it on-premises for free if you have existing servers.
					</p>
				</div>

				<!-- FAQ 6 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">How does Enterprise pricing work?</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Enterprise pricing is customized based on your needs - team size, support
						requirements, custom development, and SLA expectations. Contact our sales
						team for a quote.
					</p>
				</div>

				<!-- FAQ 7 -->
				<div class="rounded-xl bg-surface-50 p-6 dark:bg-surface-800">
					<h3 class="mb-2 text-lg font-bold">Can I get a refund?</h3>
					<p class="text-surface-600 dark:text-surface-400">
						Yes. We offer a 30-day money-back guarantee on Pro Support subscriptions. If
						you're not satisfied, we'll refund your payment, no questions asked.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section
	class="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 py-20 text-white"
>
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-3xl text-center">
			<h2 class="mb-4 text-3xl font-bold lg:text-4xl">Ready to Get Started?</h2>
			<p class="mb-8 text-lg text-white/90">
				Install QA Studio in minutes. No credit card required.
			</p>
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="/signup"
					class="btn w-full bg-white btn-lg text-primary-600 hover:bg-white/90 sm:w-auto"
				>
					<Download class="mr-2 h-5 w-5" />
					Get Started Free
				</a>
				<a
					href="/contact-sales"
					class="btn w-full border-white bg-transparent btn-lg text-white hover:bg-white/10 sm:w-auto"
				>
					Contact Sales
				</a>
			</div>
		</div>
	</div>
</section>
