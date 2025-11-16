<script lang="ts">
	import { SignUp } from 'svelte-clerk/client';
	import { Check, Sparkles, Plug, FolderGit, Zap } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Sign Up - QA Studio</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
		<!-- Left Side: Sign Up Form -->
		<div class="order-2 lg:order-1">
			<div class="mx-auto w-full max-w-md">
				<div class="mb-8 text-center lg:text-left">
					<h1 class="mb-2 text-4xl font-black">Start Testing Smarter</h1>
					<p class="text-lg text-surface-600-400">
						Join thousands of QA engineers. Free forever for one project.
					</p>
				</div>

				<SignUp />

				<div class="mt-8 text-center">
					<p class="text-sm text-surface-600-400">
						Already have an account?
						<a
							href="/sign-in"
							class="font-medium text-primary-500 hover:text-primary-600"
						>
							Sign in
						</a>
					</p>
				</div>
			</div>
		</div>

		<!-- Right Side: Benefits -->
		<div class="order-1 lg:order-2">
			<div
				class="card rounded-container bg-gradient-to-br from-success-500 to-tertiary-500 p-8 text-white"
			>
				<div class="mb-6">
					<div
						class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2"
					>
						<Zap class="h-4 w-4" />
						<span class="text-sm font-semibold">Free Forever</span>
					</div>
					<h2 class="mb-2 text-3xl font-black">Everything You Need to Get Started</h2>
					<p class="text-lg opacity-90">
						No credit card required. Upgrade only when you need advanced features.
					</p>
				</div>

				<div class="space-y-4">
					<!-- Free Tier -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<Check class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">Complete Test Management</p>
							<p class="text-sm opacity-90">
								One project with unlimited test cases and runs
							</p>
						</div>
					</div>

					<!-- Playwright Integration -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<Check class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">Automated Test Reporting</p>
							<p class="text-sm opacity-90">
								Seamless Playwright integration with zero code changes
							</p>
						</div>
					</div>

					<!-- Divider -->
					<div class="border-t border-white/20 pt-4">
						<p class="mb-3 text-sm font-semibold opacity-90">Upgrade anytime for:</p>
					</div>

					<!-- Team Collaboration -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<Check class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">Team Collaboration</p>
							<p class="text-sm opacity-90">Add team members with per-seat pricing</p>
						</div>
					</div>

					<!-- AI Features -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<Sparkles class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">AI-Powered Testing</p>
							<p class="text-sm opacity-90">
								Auto-generate test cases and get smart insights
							</p>
						</div>
					</div>

					<!-- Integrations -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<Plug class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">Premium Integrations</p>
							<p class="text-sm opacity-90">Jira, Slack, GitHub, and more</p>
						</div>
					</div>

					<!-- Multiple Projects -->
					<div class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20"
						>
							<FolderGit class="h-4 w-4" />
						</div>
						<div>
							<p class="font-semibold">Unlimited Projects</p>
							<p class="text-sm opacity-90">Create and manage multiple projects</p>
						</div>
					</div>
				</div>

				<!-- TODO: Have fortune 500 companies use the platform ;) -->
				<!-- <div class="mt-8 border-t border-white/20 pt-6">
					<p class="text-sm opacity-90">
						Join QA engineers from startups to Fortune 500 companies.
					</p>
				</div> -->
			</div>
		</div>
	</div>
</div>
