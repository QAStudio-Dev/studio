<script lang="ts">
	import {
		Plus,
		FolderOpen,
		TestTube2,
		Play,
		TrendingUp,
		CheckCircle2,
		XCircle,
		Clock,
		Users,
		Crown,
		AlertCircle
	} from 'lucide-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';

	let { data } = $props();
	let { user, projects, stats, subscription } = $derived(data);

	function getStatusColor(status: string) {
		const colors: Record<string, string> = {
			PASSED: 'text-success-500',
			FAILED: 'text-error-500',
			BLOCKED: 'text-warning-500',
			SKIPPED: 'text-surface-500',
			RETEST: 'text-warning-500',
			UNTESTED: 'text-surface-400'
		};
		return colors[status] || 'text-surface-500';
	}

	function getStatusIcon(status: string) {
		return {
			PASSED: CheckCircle2,
			FAILED: XCircle,
			BLOCKED: AlertCircle,
			SKIPPED: Clock,
			RETEST: Clock,
			UNTESTED: Clock
		}[status] || Clock;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-4xl font-bold mb-2">
					Welcome back, {user.firstName || 'there'}!
				</h1>
				<p class="text-lg text-surface-600-300">
					{#if user.team}
						Team: {user.team.name}
						{#if subscription.hasActiveSubscription}
							<span class="badge preset-filled-primary-500 ml-2">
								<Crown class="w-3 h-3 inline mr-1" />
								Pro
							</span>
						{/if}
					{:else}
						Personal workspace
					{/if}
				</p>
			</div>

			{#if subscription.canCreateProject}
				<a href="/projects/new" class="btn preset-filled-primary-500">
					<Plus class="w-4 h-4 mr-2" />
					New Project
				</a>
			{:else}
				<div class="text-right">
					<div class="badge preset-filled-warning-500 mb-2">
						Project limit reached
					</div>
					<a href="/teams/new" class="btn preset-filled-primary-500 btn-sm">
						<Crown class="w-4 h-4 mr-2" />
						Upgrade to Pro
					</a>
				</div>
			{/if}
		</div>
	</div>

	{#if projects.length === 0}
		<!-- Empty State -->
		<div class="card p-12 text-center max-w-2xl mx-auto">
			<div class="mb-6">
				<div
					class="w-24 h-24 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4"
				>
					<FolderOpen class="w-12 h-12 text-primary-500" />
				</div>
				<h2 class="text-3xl font-bold mb-2">Let's get started!</h2>
				<p class="text-lg text-surface-600-300 mb-8">
					Create your first project to start managing test cases and tracking results.
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/projects/new" class="btn preset-filled-primary-500 text-lg px-8 py-4">
					<Plus class="w-5 h-5 mr-2" />
					Create Your First Project
				</a>
				<a href="/docs" class="btn preset-outlined-surface-500">
					View Documentation
				</a>
			</div>

			{#if !subscription.hasActiveSubscription}
				<div class="mt-8 p-4 bg-surface-50-900 rounded-container">
					<p class="text-sm text-surface-600-300 mb-2">
						<strong>Free plan:</strong> 1 project · Unlimited test cases
					</p>
					<a href="/teams/new" class="text-primary-500 hover:underline text-sm">
						Upgrade to Pro for unlimited projects and AI features →
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<!-- Projects -->
			<div class="card p-6">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-primary-500/10 rounded-lg">
						<FolderOpen class="w-6 h-6 text-primary-500" />
					</div>
					<span class="text-3xl font-bold">{stats.totalProjects}</span>
				</div>
				<h3 class="text-sm font-medium text-surface-600-300">Projects</h3>
				{#if !subscription.hasActiveSubscription}
					<p class="text-xs text-surface-500-400 mt-1">
						{stats.totalProjects} / {subscription.projectLimit} used
					</p>
				{/if}
			</div>

			<!-- Test Cases -->
			<div class="card p-6">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-secondary-500/10 rounded-lg">
						<TestTube2 class="w-6 h-6 text-secondary-500" />
					</div>
					<span class="text-3xl font-bold">{stats.totalTestCases}</span>
				</div>
				<h3 class="text-sm font-medium text-surface-600-300">Test Cases</h3>
			</div>

			<!-- Test Runs -->
			<div class="card p-6">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-tertiary-500/10 rounded-lg">
						<Play class="w-6 h-6 text-tertiary-500" />
					</div>
					<span class="text-3xl font-bold">{stats.totalTestRuns}</span>
				</div>
				<h3 class="text-sm font-medium text-surface-600-300">Test Runs</h3>
			</div>

			<!-- Pass Rate -->
			<div class="card p-6">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-success-500/10 rounded-lg">
						<TrendingUp class="w-6 h-6 text-success-500" />
					</div>
					<span class="text-3xl font-bold">{stats.passRate}%</span>
				</div>
				<h3 class="text-sm font-medium text-surface-600-300">Pass Rate</h3>
			</div>
		</div>

		<div class="grid lg:grid-cols-3 gap-8">
			<!-- Projects List -->
			<div class="lg:col-span-2">
				<div class="card p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-2xl font-bold">Your Projects</h2>
						{#if subscription.canCreateProject}
							<a href="/projects/new" class="btn preset-outlined-surface-500 btn-sm">
								<Plus class="w-4 h-4 mr-1" />
								New Project
							</a>
						{/if}
					</div>

					<div class="space-y-4">
						{#each projects as project}
							<a
								href="/projects/{project.id}"
								class="block p-4 rounded-container hover:bg-surface-100-800 transition-colors border border-surface-200-700"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-3 mb-2">
											<h3 class="font-bold text-lg">{project.name}</h3>
											<span class="badge preset-filled-surface-500 text-xs">{project.key}</span>
										</div>
										{#if project.description}
											<p class="text-sm text-surface-600-300 mb-3">{project.description}</p>
										{/if}

										<div class="flex items-center gap-6 text-sm text-surface-600-300">
											<div class="flex items-center gap-2">
												<TestTube2 class="w-4 h-4" />
												<span>{project._count.testCases} test cases</span>
											</div>
											<div class="flex items-center gap-2">
												<Play class="w-4 h-4" />
												<span>{project._count.testRuns} runs</span>
											</div>
										</div>
									</div>

									<div class="text-right text-sm text-surface-500-400">
										{formatDate(project.updatedAt)}
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="card p-6">
				<h2 class="text-xl font-bold mb-6">Recent Results</h2>

				{#if stats.recentResults.length > 0}
					<div class="space-y-4">
						{#each stats.recentResults as result}
							{@const StatusIcon = getStatusIcon(result.status)}
							<div class="pb-4 border-b border-surface-200-700 last:border-0 last:pb-0">
								<div class="flex items-start gap-3">
									<StatusIcon class="w-5 h-5 flex-shrink-0 mt-0.5 {getStatusColor(result.status)}" />
									<div class="flex-1 min-w-0">
										<p class="font-medium text-sm truncate">{result.testCase.title}</p>
										<p class="text-xs text-surface-600-300 truncate">
											{result.testRun.project.key} · {result.testRun.name}
										</p>
										<p class="text-xs text-surface-500-400 mt-1">
											{formatDate(result.executedAt)}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8">
						<Clock class="w-12 h-12 text-surface-400 mx-auto mb-2" />
						<p class="text-sm text-surface-600-300">No test results yet</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Upgrade Prompt for Free Users -->
		{#if !subscription.hasActiveSubscription}
			<div class="mt-8">
				<div class="card p-6 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20">
					<div class="flex items-center gap-4">
						<div class="p-3 bg-primary-500 rounded-lg">
							<Crown class="w-6 h-6 text-white" />
						</div>
						<div class="flex-1">
							<h3 class="font-bold text-lg mb-1">Unlock Pro Features</h3>
							<p class="text-sm text-surface-600-300">
								Unlimited projects · AI-powered failure analysis · Priority support
							</p>
						</div>
						<a href="/teams/new" class="btn preset-filled-primary-500">
							Upgrade to Pro
						</a>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
