<script lang="ts">
	import {
		Check,
		FolderTree,
		PlayCircle,
		Calendar,
		BarChart3,
		Image,
		Code,
		Users,
		Lock,
		Shield,
		Zap,
		GitBranch,
		Terminal,
		ArrowRight,
		FileText,
		CheckCircle2,
		AlertCircle
	} from 'lucide-svelte';
</script>

<svelte:head>
	<title>Features - QA Studio</title>
	<meta
		name="description"
		content="Complete test management features. Test cases, test runs, milestones, reporting, API access, and more. Self-hosted and open source."
	/>
</svelte:head>

<!-- Hero Section -->
<section
	class="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 py-20 text-white"
>
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-3xl text-center">
			<h1 class="mb-4 text-5xl font-bold">Everything You Need for Test Management</h1>
			<p class="mb-8 text-xl text-white/90">
				Comprehensive features for organizing, executing, and tracking your testing efforts
			</p>
			<a
				href="/signup"
				class="btn preset-filled bg-white btn-lg text-primary-600 hover:bg-white/90"
			>
				Get Started Free
				<ArrowRight class="ml-2 h-5 w-5" />
			</a>
		</div>
	</div>
</section>

<!-- Core Features Grid -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<h2 class="mb-12 text-center text-3xl font-bold lg:text-4xl">Core Features</h2>

			<div class="grid gap-12 md:grid-cols-2">
				<!-- Test Case Management -->
				<div>
					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500"
						>
							<FolderTree class="h-6 w-6" />
						</div>
						<h3 class="text-2xl font-bold">Test Case Management</h3>
					</div>
					<p class="mb-6 text-surface-600 dark:text-surface-400">
						Organize test cases in hierarchical suites. Define detailed test steps,
						expected results, priorities, and automation status.
					</p>
					<ul class="space-y-3">
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Hierarchical test suite organization</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Step-by-step test instructions</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								>Priority levels (Critical, High, Medium, Low)</span
							>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								>Test types (Functional, Regression, Smoke, etc.)</span
							>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								>Automation tracking (Automated, Manual, Candidate)</span
							>
						</li>
					</ul>
				</div>

				<!-- Test Execution -->
				<div>
					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-500/10 text-secondary-500"
						>
							<PlayCircle class="h-6 w-6" />
						</div>
						<h3 class="text-2xl font-bold">Test Execution Tracking</h3>
					</div>
					<p class="mb-6 text-surface-600 dark:text-surface-400">
						Plan and execute test runs across different environments. Track results with
						detailed status, duration, and failure information.
					</p>
					<ul class="space-y-3">
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Plan test runs with specific test cases</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								>Multiple environments (Production, Staging, QA, etc.)</span
							>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm"
								>Status tracking (Passed, Failed, Blocked, Skipped)</span
							>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Execution duration metrics</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Who executed what and when</span>
						</li>
					</ul>
				</div>

				<!-- Milestone Planning -->
				<div>
					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary-500/10 text-tertiary-500"
						>
							<Calendar class="h-6 w-6" />
						</div>
						<h3 class="text-2xl font-bold">Milestone Planning</h3>
					</div>
					<p class="mb-6 text-surface-600 dark:text-surface-400">
						Track testing progress against release milestones and deadlines. See what's
						tested and what's still pending.
					</p>
					<ul class="space-y-3">
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Create release milestones with due dates</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Link test runs to milestones</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Track testing completion percentage</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Identify blockers before releases</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Historical milestone comparison</span>
						</li>
					</ul>
				</div>

				<!-- Reporting & Analytics -->
				<div>
					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-lg bg-success-500/10 text-success-500"
						>
							<BarChart3 class="h-6 w-6" />
						</div>
						<h3 class="text-2xl font-bold">Reporting & Analytics</h3>
					</div>
					<p class="mb-6 text-surface-600 dark:text-surface-400">
						Detailed reports and visualizations to understand test coverage, execution
						trends, and quality metrics.
					</p>
					<ul class="space-y-3">
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Pass/fail rate dashboards</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Test execution history and trends</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Test coverage analysis</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Flaky test identification</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span class="text-sm">Export reports to PDF/CSV</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Rich Test Results -->
<section class="bg-surface-50 py-20 dark:bg-surface-900">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<div class="grid items-center gap-12 md:grid-cols-2">
				<div>
					<div class="mb-4 flex items-center gap-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-500/10 text-warning-500"
						>
							<Image class="h-6 w-6" />
						</div>
						<h2 class="text-3xl font-bold">Rich Test Results</h2>
					</div>
					<p class="mb-6 text-lg text-surface-600 dark:text-surface-400">
						Capture everything you need to debug failures quickly. Screenshots, logs,
						stack traces, and more.
					</p>
					<ul class="space-y-3">
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Screenshot attachments</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Video recordings (for E2E tests)</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Console logs and network activity</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Stack traces for failures</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Custom file attachments</span>
						</li>
						<li class="flex gap-3">
							<Check class="h-5 w-5 flex-shrink-0 text-success-500" />
							<span>Step-by-step execution details</span>
						</li>
					</ul>
				</div>

				<div class="rounded-xl bg-white p-6 shadow-xl dark:bg-surface-800">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<AlertCircle class="h-5 w-5 text-error-500" />
							<span class="font-bold">Test Failed</span>
						</div>
						<span class="text-sm text-surface-600 dark:text-surface-400">2.3s</span>
					</div>
					<div
						class="mb-4 rounded-lg bg-surface-50 p-4 font-mono text-sm dark:bg-surface-900"
					>
						<div class="text-error-500">
							AssertionError: Expected button to be visible
						</div>
						<div class="mt-2 text-xs text-surface-600 dark:text-surface-400">
							at page.click (test.spec.ts:42)
						</div>
					</div>
					<div class="mb-2 text-sm font-medium">Attachments:</div>
					<div class="space-y-2">
						<div class="flex items-center gap-2 text-sm">
							<Image class="h-4 w-4 text-primary-500" />
							<span>screenshot-failure.png</span>
						</div>
						<div class="flex items-center gap-2 text-sm">
							<FileText class="h-4 w-4 text-primary-500" />
							<span>console-logs.txt</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Developer Features -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<h2 class="mb-12 text-center text-3xl font-bold lg:text-4xl">Built for Developers</h2>

			<div class="grid gap-8 md:grid-cols-3">
				<!-- REST API -->
				<div class="rounded-xl border border-surface-300 p-6 dark:border-surface-700">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500"
					>
						<Code class="h-6 w-6" />
					</div>
					<h3 class="mb-3 text-xl font-bold">Full REST API</h3>
					<p class="mb-4 text-surface-600 dark:text-surface-400">
						Complete API access for automation, custom integrations, and programmatic
						control.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Create/update test cases</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Submit test results</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Fetch reports and analytics</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>OpenAPI documentation</span>
						</li>
					</ul>
				</div>

				<!-- CI/CD Integration -->
				<div class="rounded-xl border border-surface-300 p-6 dark:border-surface-700">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-500/10 text-secondary-500"
					>
						<GitBranch class="h-6 w-6" />
					</div>
					<h3 class="mb-3 text-xl font-bold">CI/CD Integration</h3>
					<p class="mb-4 text-surface-600 dark:text-surface-400">
						Seamlessly integrate with your existing CI/CD pipelines and testing
						frameworks.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>GitHub Actions integration</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>GitLab CI/CD support</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Jenkins plugins</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Generic webhook support</span>
						</li>
					</ul>
				</div>

				<!-- Test Framework Support -->
				<div class="rounded-xl border border-surface-300 p-6 dark:border-surface-700">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-tertiary-500/10 text-tertiary-500"
					>
						<Terminal class="h-6 w-6" />
					</div>
					<h3 class="mb-3 text-xl font-bold">Playwright Integration</h3>
					<p class="mb-4 text-surface-600 dark:text-surface-400">
						Official Playwright reporters for automatic test result reporting.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Playwright reporter (TypeScript)</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Playwright reporter (Python)</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>REST API for custom reporters</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Generic JSON/XML import</span>
						</li>
					</ul>
				</div>

				<!-- Built-in Testing Features -->
				<div class="rounded-xl border border-surface-300 p-6 dark:border-surface-700">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success-500/10 text-success-500"
					>
						<CheckCircle2 class="h-6 w-6" />
					</div>
					<h3 class="mb-3 text-xl font-bold">Built-in Testing Tools</h3>
					<p class="mb-4 text-surface-600 dark:text-surface-400">
						Integrated testing utilities for common scenarios.
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>TOTP testing (2FA codes)</span>
						</li>
						<li class="flex gap-2">
							<Check class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>SMS testing (via Twilio)</span>
						</li>
						<li class="flex gap-2">
							<AlertCircle class="h-4 w-4 flex-shrink-0 text-warning-500" />
							<span class="text-surface-500">Email testing (coming soon)</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Security & Privacy -->
<section class="bg-surface-50 py-20 dark:bg-surface-900">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<h2 class="mb-12 text-center text-3xl font-bold lg:text-4xl">
				Security & Privacy First
			</h2>

			<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
				<!-- Self-Hosted -->
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500"
					>
						<Lock class="h-8 w-8" />
					</div>
					<h3 class="mb-2 font-bold">Self-Hosted</h3>
					<p class="text-sm text-surface-600 dark:text-surface-400">
						Your data stays on your infrastructure, never on third-party servers
					</p>
				</div>

				<!-- Encrypted Storage -->
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-500/10 text-secondary-500"
					>
						<Shield class="h-8 w-8" />
					</div>
					<h3 class="mb-2 font-bold">Secure Authentication</h3>
					<p class="text-sm text-surface-600 dark:text-surface-400">
						bcrypt password hashing, secure sessions, CSRF protection
					</p>
				</div>

				<!-- Role-Based Access -->
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-500/10 text-tertiary-500"
					>
						<Users class="h-8 w-8" />
					</div>
					<h3 class="mb-2 font-bold">Role-Based Access</h3>
					<p class="text-sm text-surface-600 dark:text-surface-400">
						Fine-grained permissions: Owner, Admin, Manager, Tester, Viewer
					</p>
				</div>

				<!-- Audit Logs -->
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10 text-success-500"
					>
						<FileText class="h-8 w-8" />
					</div>
					<h3 class="mb-2 font-bold">Audit Trail</h3>
					<p class="text-sm text-surface-600 dark:text-surface-400">
						Track who created, updated, or executed tests for compliance
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- All Features List -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-6xl">
			<h2 class="mb-12 text-center text-3xl font-bold lg:text-4xl">Complete Feature List</h2>

			<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
				<!-- Column 1 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Test Management</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Hierarchical test suites</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Test case duplication & templates</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Test step definitions</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Priority management</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Test type categorization</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Automation tracking</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Bulk operations</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Search and filtering</span>
						</li>
					</ul>
				</div>

				<!-- Column 2 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Execution & Results</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Test run planning</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Multiple environments</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Status tracking</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Screenshot attachments</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Video recordings</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Log file uploads</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Stack trace capture</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Execution history</span>
						</li>
					</ul>
				</div>

				<!-- Column 3 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Reporting & Analytics</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Dashboard overview</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Pass/fail rate charts</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Test coverage metrics</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Trend analysis</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Flaky test detection</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Custom reports</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>PDF/CSV export</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Scheduled reports</span>
						</li>
					</ul>
				</div>

				<!-- Column 4 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Collaboration</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Team management</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Role-based permissions</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>User assignments</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Activity tracking</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Comments & notes</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Email notifications</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Audit logs</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>User activity history</span>
						</li>
					</ul>
				</div>

				<!-- Column 5 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Integrations</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>REST API</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Playwright reporter (TypeScript)</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Playwright reporter (Python)</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>TOTP testing</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>SMS testing (Twilio)</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>GitHub Actions</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>GitLab CI/CD</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Webhook support</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>OpenAPI documentation</span>
						</li>
					</ul>
				</div>

				<!-- Column 6 -->
				<div>
					<h3 class="mb-4 font-bold text-primary-500">Security & Deployment</h3>
					<ul class="space-y-2 text-sm">
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Self-hosted deployment</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Docker support</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>bcrypt password hashing</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Secure sessions</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>CSRF protection</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>API key authentication</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>PostgreSQL database</span>
						</li>
						<li class="flex gap-2">
							<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-success-500" />
							<span>Open source codebase</span>
						</li>
					</ul>
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
			<h2 class="mb-4 text-3xl font-bold lg:text-4xl">Ready to Try All These Features?</h2>
			<p class="mb-8 text-lg text-white/90">
				Get started for free. No credit card required. Quick setup with Docker.
			</p>
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="/signup"
					class="btn w-full bg-white btn-lg text-primary-600 hover:bg-white/90 sm:w-auto"
				>
					Get Started Free
					<ArrowRight class="ml-2 h-5 w-5" />
				</a>
				<a
					href="/docs"
					class="btn w-full border-white bg-transparent btn-lg text-white hover:bg-white/10 sm:w-auto"
				>
					View Documentation
				</a>
			</div>
		</div>
	</div>
</section>
