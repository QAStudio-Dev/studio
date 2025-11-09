<script lang="ts">
	import { SignIn } from 'svelte-clerk';
	import { Check, Sparkles, Plug, FolderGit } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Sign In - QA Studio</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
		<!-- Left Side: Sign In Form -->
		<div class="order-2 lg:order-1">
			<div class="mx-auto w-full max-w-md">
				<div class="mb-8 text-center lg:text-left">
					<h1 class="mb-2 text-4xl font-black">Welcome Back</h1>
					<p class="text-surface-600-400 text-lg">Sign in to continue your QA journey</p>
				</div>

				<SignIn />

				<div class="mt-8 text-center">
					<p class="text-surface-600-400 text-sm">
						Don't have an account?
						<a href="/sign-up" class="font-medium text-primary-500 hover:text-primary-600">
							Sign up - it's free!
						</a>
					</p>
				</div>
			</div>
		</div>

		<!-- Right Side: Benefits -->
		<div class="order-1 lg:order-2">
			<div class="card rounded-container bg-gradient-to-br from-primary-500 to-secondary-500 p-8 text-white">
				<div class="mb-6">
					<h2 class="mb-2 text-3xl font-black">Start Testing Smarter</h2>
					<p class="text-lg opacity-90">
						Free forever for one project. Upgrade anytime for advanced features.
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
							<p class="font-semibold">Free Forever</p>
							<p class="text-sm opacity-90">One project with unlimited test cases and runs</p>
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
								Auto-generate test cases and get intelligent insights (Pro)
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
							<p class="font-semibold">Seamless Integrations</p>
							<p class="text-sm opacity-90">
								Connect with Jira, Slack, GitHub, and more (Pro)
							</p>
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
							<p class="font-semibold">Multiple Projects</p>
							<p class="text-sm opacity-90">
								Create and manage unlimited projects (Pro)
							</p>
						</div>
					</div>
				</div>

				<div class="mt-8 border-t border-white/20 pt-6">
					<p class="text-sm opacity-90">
						Start free, upgrade when you need more. No credit card required.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
