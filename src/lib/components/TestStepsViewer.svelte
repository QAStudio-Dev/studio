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
		FileCode,
		AlertTriangle
	} from 'lucide-svelte';
	import { Accordion } from '@skeletonlabs/skeleton-svelte';

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
		isTimeout?: boolean; // Indicates if the test failed due to timeout
	};

	let { steps, compact = false, isTimeout = false }: Props = $props();

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
				} else if (
					title.includes('after') ||
					title.includes('teardown') ||
					title.includes('cleanup')
				) {
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

	// Track expanded sections - convert to array of section titles for Accordion
	let expandedSections = $state<string[]>(['Test']);

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

	// Find the step where timeout likely occurred
	// For timeouts, we want to find the last step before teardown/cleanup hooks
	// since teardown runs even after timeout
	let lastStepId = $derived.by(() => {
		if (!isTimeout || steps.length === 0) return null;

		// Find the last non-teardown step (last step in Test section, or Setup if no Test steps)
		let lastNonTeardownStep: TestStep | null = null;

		for (const step of steps) {
			const category = step.category?.toLowerCase();
			const title = step.title.toLowerCase();

			// Skip teardown/cleanup hooks
			const isTeardown =
				category === 'hook' &&
				(title.includes('after') ||
					title.includes('teardown') ||
					title.includes('cleanup'));

			if (!isTeardown) {
				if (!lastNonTeardownStep || step.stepNumber > lastNonTeardownStep.stepNumber) {
					lastNonTeardownStep = step;
				}
			}
		}

		return lastNonTeardownStep?.id || null;
	});

	// Determine which section contains the timeout (the section with the last step)
	let timeoutSectionTitle = $derived.by(() => {
		if (!isTimeout || !lastStepId) return null;

		for (const section of sections) {
			if (section.steps.some((step) => step.id === lastStepId)) {
				return section.title;
			}
		}
		return null;
	});

	// Auto-expand to first failure or last step if timeout
	// Initialize expanded sections on mount
	let initialized = $state(false);

	$effect(() => {
		// Only run once on mount to set initial state
		if (initialized) return;
		initialized = true;

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

		const sectionsToExpand: string[] = ['Test']; // Always expand Test section

		sections.forEach((section) => {
			const failureId = findFirstFailure(section.steps);
			if (failureId && !sectionsToExpand.includes(section.title)) {
				sectionsToExpand.push(section.title);
			}

			// If timeout, expand the section containing the timeout
			if (
				isTimeout &&
				timeoutSectionTitle &&
				section.title === timeoutSectionTitle &&
				!sectionsToExpand.includes(section.title)
			) {
				sectionsToExpand.push(section.title);
			}
		});

		expandedSections = sectionsToExpand;
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

		<Accordion multiple value={expandedSections} class="space-y-3">
			{#each sections as section}
				<Accordion.Item
					value={section.title}
					class="border-surface-200-700 overflow-hidden rounded-lg border"
				>
					<h3>
						<Accordion.ItemTrigger
							class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-100-900"
						>
							<Accordion.ItemIndicator class="group flex-shrink-0">
								<ChevronDown
									class="hidden h-4 w-4 text-surface-500 group-data-[state=open]:block"
								/>
								<ChevronRight
									class="block h-4 w-4 text-surface-500 group-data-[state=open]:hidden"
								/>
							</Accordion.ItemIndicator>
							<span class="text-sm font-semibold">{section.title}</span>
							<span class="text-surface-600-300 ml-auto text-sm">
								{section.steps.length} step{section.steps.length !== 1 ? 's' : ''}
							</span>
						</Accordion.ItemTrigger>
					</h3>

					<Accordion.ItemContent>
						<div class="divide-surface-200-700 divide-y bg-surface-50-950">
							{#each section.steps as step}
								{@const StatusIcon = getStatusIcon(step.status)}
								{@const CategoryIcon = getCategoryIcon(step.category)}
								{@const hasChildren = step.childSteps && step.childSteps.length > 0}
								{@const isStepExpanded = expandedSteps.has(step.id)}

								<div>
									<!-- Step Row -->
									<button
										class="hover:bg-surface-100-800 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors {step.status ===
										'FAILED'
											? 'border-l-4 border-error-500 bg-error-500/5'
											: isTimeout && step.id === lastStepId
												? 'border-l-4 border-orange-500 bg-orange-500/5'
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
													<ChevronDown class="h-4 w-4 text-surface-500" />
												{:else}
													<ChevronRight
														class="h-4 w-4 text-surface-500"
													/>
												{/if}
											{/if}
										</div>

										<!-- Status Icon -->
										<StatusIcon
											class="h-4 w-4 flex-shrink-0 {getStatusColor(
												step.status
											)}"
										/>

										<!-- Step Content -->
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<span
													class="text-surface-900-50 text-sm {step.status ===
													'FAILED'
														? 'font-medium'
														: isTimeout && step.id === lastStepId
															? 'font-medium'
															: ''}"
												>
													{step.title}
												</span>
												{#if isTimeout && step.id === lastStepId}
													<span
														class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-200"
														title="Timeout occurred during or after this step"
													>
														<Clock class="h-3 w-3" />
														Likely Timeout Point
													</span>
												{/if}
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
					</Accordion.ItemContent>
				</Accordion.Item>
			{/each}
		</Accordion>
	</div>
{/if}
