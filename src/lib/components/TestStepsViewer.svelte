<script lang="ts">
	import {
		CheckCircle2,
		XCircle,
		Circle,
		ChevronRight,
		ChevronDown,
		Clock,
		Code2,
		Zap,
		Box,
		FlaskConical,
		FileCode
	} from 'lucide-svelte';

	type TestStep = {
		id: string;
		stepNumber: number;
		title: string;
		category: string | null;
		status: 'PASSED' | 'FAILED' | 'SKIPPED';
		duration: number | null;
		startTime: Date | null;
		error: string | null;
		stackTrace: string | null;
		location: { file: string; line: number; column?: number } | null;
		childSteps?: TestStep[];
	};

	type Props = {
		steps: TestStep[];
		compact?: boolean;
	};

	let { steps, compact = false }: Props = $props();

	// Group steps by category into Setup, Test, Teardown sections
	type StepSection = {
		title: string;
		steps: TestStep[];
		defaultExpanded: boolean;
	};

	let sections = $derived.by(() => {
		const setupSteps: TestStep[] = [];
		const testSteps: TestStep[] = [];
		const teardownSteps: TestStep[] = [];

		function categorizeStep(step: TestStep) {
			const category = step.category?.toLowerCase();

			// Hook categories typically indicate setup/teardown
			if (category === 'hook') {
				// Use title to determine if it's setup or teardown
				const title = step.title.toLowerCase();
				if (
					title.includes('before') ||
					title.includes('setup') ||
					title.includes('fixture')
				) {
					setupSteps.push(step);
				} else if (title.includes('after') || title.includes('teardown')) {
					teardownSteps.push(step);
				} else {
					setupSteps.push(step); // Default hooks to setup
				}
			} else if (category === 'fixture') {
				setupSteps.push(step);
			} else {
				// test.step, pw:api, expect, other all go to test body
				testSteps.push(step);
			}
		}

		steps.forEach(categorizeStep);

		const result: StepSection[] = [];

		if (setupSteps.length > 0) {
			result.push({
				title: 'Setup',
				steps: setupSteps,
				defaultExpanded: false
			});
		}

		if (testSteps.length > 0) {
			result.push({
				title: 'Test',
				steps: testSteps,
				defaultExpanded: true
			});
		}

		if (teardownSteps.length > 0) {
			result.push({
				title: 'Teardown',
				steps: teardownSteps,
				defaultExpanded: false
			});
		}

		return result;
	});

	// Track expanded sections
	let expandedSections = $state<Set<string>>(new Set(['Test']));

	function toggleSection(title: string) {
		if (expandedSections.has(title)) {
			expandedSections.delete(title);
		} else {
			expandedSections.add(title);
		}
		expandedSections = new Set(expandedSections);
	}

	// Track expanded steps for nested hierarchy
	let expandedSteps = $state<Set<string>>(new Set());

	function toggleStep(stepId: string) {
		if (expandedSteps.has(stepId)) {
			expandedSteps.delete(stepId);
		} else {
			expandedSteps.add(stepId);
		}
		expandedSteps = new Set(expandedSteps);
	}

	// Auto-expand to first failure
	$effect(() => {
		function findFirstFailure(steps: TestStep[]): string | null {
			for (const step of steps) {
				if (step.status === 'FAILED') {
					return step.id;
				}
				if (step.childSteps && step.childSteps.length > 0) {
					const failureId = findFirstFailure(step.childSteps);
					if (failureId) {
						expandedSteps.add(step.id); // Expand parent
						return failureId;
					}
				}
			}
			return null;
		}

		sections.forEach((section) => {
			const failureId = findFirstFailure(section.steps);
			if (failureId) {
				expandedSections.add(section.title);
			}
		});
	});

	function getStatusIcon(status: string) {
		return (
			{
				PASSED: CheckCircle2,
				FAILED: XCircle,
				SKIPPED: Circle
			}[status] || Circle
		);
	}

	function getStatusColor(status: string) {
		return (
			{
				PASSED: 'text-success-500',
				FAILED: 'text-error-500',
				SKIPPED: 'text-surface-500'
			}[status] || 'text-surface-500'
		);
	}

	function getCategoryIcon(category: string | null) {
		const cat = category?.toLowerCase();
		return (
			{
				hook: Zap,
				'test.step': Box,
				'pw:api': Code2,
				expect: CheckCircle2,
				fixture: FlaskConical,
				other: FileCode
			}[cat || 'other'] || FileCode
		);
	}

	function formatDuration(durationMs: number | null) {
		if (!durationMs) return '';
		if (durationMs < 1000) return `${durationMs}ms`;
		return `${(durationMs / 1000).toFixed(2)}s`;
	}

	function formatLocation(location: { file: string; line: number; column?: number } | null) {
		if (!location) return '';
		return `${location.file}:${location.line}${location.column ? `:${location.column}` : ''}`;
	}
</script>

{#if sections.length > 0}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h4 class="text-sm font-semibold">Test Steps</h4>
			<div class="text-surface-600-300 flex items-center gap-2 text-xs">
				<span>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
			</div>
		</div>

		<div class="space-y-2">
			{#each sections as section}
				{@const isExpanded = expandedSections.has(section.title)}

				<!-- Section Header -->
				<div class="border-surface-200-700 overflow-hidden rounded-container border">
					<button
						class="bg-surface-50-900 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-100-900"
						onclick={() => toggleSection(section.title)}
					>
						{#if isExpanded}
							<ChevronDown class="h-4 w-4 text-surface-500" />
						{:else}
							<ChevronRight class="h-4 w-4 text-surface-500" />
						{/if}
						<span class="text-sm font-medium">{section.title}</span>
						<span class="text-surface-600-300 ml-auto text-xs">
							{section.steps.length} step{section.steps.length !== 1 ? 's' : ''}
						</span>
					</button>

					<!-- Section Steps -->
					{#if isExpanded}
						<div class="divide-surface-200-700 divide-y">
							{#each section.steps as step}
								{@const StatusIcon = getStatusIcon(step.status)}
								{@const CategoryIcon = getCategoryIcon(step.category)}
								{@const hasChildren = step.childSteps && step.childSteps.length > 0}
								{@const isStepExpanded = expandedSteps.has(step.id)}

								<div class="bg-surface-50-950">
									<!-- Step Row -->
									<button
										class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-100-900 {step.status ===
										'FAILED'
											? 'border-l-2 border-error-500 bg-error-500/5'
											: ''}"
										onclick={() => hasChildren && toggleStep(step.id)}
										disabled={!hasChildren}
									>
										<!-- Expand indicator -->
										<div
											class="flex h-5 w-4 flex-shrink-0 items-center justify-center"
										>
											{#if hasChildren}
												{#if isStepExpanded}
													<ChevronDown class="h-3 w-3 text-surface-500" />
												{:else}
													<ChevronRight
														class="h-3 w-3 text-surface-500"
													/>
												{/if}
											{/if}
										</div>

										<!-- Status Icon -->
										<StatusIcon
											class="mt-0.5 h-4 w-4 flex-shrink-0 {getStatusColor(
												step.status
											)}"
										/>

										<!-- Step Content -->
										<div class="min-w-0 flex-1">
											<div class="flex items-start gap-2">
												<span
													class="text-surface-900-50 text-sm {step.status ===
													'FAILED'
														? 'font-medium'
														: ''}"
												>
													{step.title}
												</span>
												{#if step.category}
													<span
														class="badge-sm badge flex-shrink-0 preset-outlined-surface-500"
													>
														<CategoryIcon class="mr-1 h-3 w-3" />
														{step.category}
													</span>
												{/if}
											</div>

											<!-- Error Message -->
											{#if step.error}
												<div class="mt-1 rounded-base bg-error-500/10 p-2">
													<p
														class="font-mono text-xs break-words text-error-500"
													>
														{step.error}
													</p>
												</div>
											{/if}

											<!-- Stack Trace (collapsed by default) -->
											{#if step.stackTrace && !compact}
												<details class="mt-1">
													<summary
														class="text-surface-600-300 hover:text-surface-700-200 cursor-pointer text-xs"
													>
														Stack Trace
													</summary>
													<pre
														class="mt-1 rounded-base bg-surface-100-900 p-2 font-mono text-xs break-words whitespace-pre-wrap">{step.stackTrace}</pre>
												</details>
											{/if}
										</div>

										<!-- Duration & Location -->
										<div
											class="text-surface-600-300 flex flex-shrink-0 flex-col items-end gap-0.5 text-xs"
										>
											{#if step.duration}
												<div class="flex items-center gap-1">
													<Clock class="h-3 w-3" />
													<span>{formatDuration(step.duration)}</span>
												</div>
											{/if}
											{#if step.location && !compact}
												<code class="text-xs"
													>{formatLocation(step.location)}</code
												>
											{/if}
										</div>
									</button>

									<!-- Nested Child Steps -->
									{#if hasChildren && isStepExpanded && step.childSteps}
										<div class="border-surface-200-700 border-l-2 pl-6">
											{#each step.childSteps as childStep}
												{@const ChildStatusIcon = getStatusIcon(
													childStep.status
												)}
												{@const ChildCategoryIcon = getCategoryIcon(
													childStep.category
												)}

												<div
													class="border-surface-200-700 flex items-start gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-surface-100-900 {childStep.status ===
													'FAILED'
														? 'bg-error-500/5'
														: ''}"
												>
													<ChildStatusIcon
														class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 {getStatusColor(
															childStep.status
														)}"
													/>

													<div class="min-w-0 flex-1">
														<div class="flex items-start gap-2">
															<span
																class="text-surface-900-50 text-xs {childStep.status ===
																'FAILED'
																	? 'font-medium'
																	: ''}"
															>
																{childStep.title}
															</span>
															{#if childStep.category}
																<span
																	class="badge-sm badge flex-shrink-0 preset-outlined-surface-500"
																>
																	<ChildCategoryIcon
																		class="mr-1 h-2.5 w-2.5"
																	/>
																	{childStep.category}
																</span>
															{/if}
														</div>

														{#if childStep.error}
															<div
																class="mt-1 rounded-base bg-error-500/10 p-2"
															>
																<p
																	class="font-mono text-xs break-words text-error-500"
																>
																	{childStep.error}
																</p>
															</div>
														{/if}
													</div>

													{#if childStep.duration}
														<div
															class="text-surface-600-300 flex-shrink-0 text-xs"
														>
															{formatDuration(childStep.duration)}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
