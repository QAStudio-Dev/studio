<script lang="ts">
	import { AlertCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-svelte';
	import { cleanErrorMessage, cleanStackTrace } from '$lib/utils/error-formatter';

	interface Props {
		errorMessage?: string | null;
		stackTrace?: string | null;
		compact?: boolean; // If true, show collapsed by default
	}

	let { errorMessage, stackTrace, compact = false }: Props = $props();
	let isExpanded = $state(!compact);
	let copiedError = $state(false);
	let copiedStack = $state(false);

	// Clean the error message and stack trace
	let cleanedErrorMessage = $derived(cleanErrorMessage(errorMessage));
	let cleanedStackTrace = $derived(cleanStackTrace(stackTrace));

	function copyToClipboard(text: string, type: 'error' | 'stack') {
		navigator.clipboard.writeText(text);
		if (type === 'error') {
			copiedError = true;
			setTimeout(() => (copiedError = false), 2000);
		} else {
			copiedStack = true;
			setTimeout(() => (copiedStack = false), 2000);
		}
	}

	// Parse stack trace to highlight file paths and line numbers
	function parseStackTrace(stack: string): Array<{ text: string; isFile: boolean; line?: string }> {
		const lines = stack.split('\n');
		return lines.map((line) => {
			// Match common stack trace patterns
			// e.g., "at functionName (file.js:123:45)" or "at file.js:123:45"
			const fileMatch = line.match(/\((.*?):(\d+):(\d+)\)/) || line.match(/at (.*?):(\d+):(\d+)/);
			if (fileMatch) {
				return {
					text: line,
					isFile: true,
					line: `${fileMatch[2]}:${fileMatch[3]}`
				};
			}
			return { text: line, isFile: false };
		});
	}

	let parsedStackTrace = $derived(cleanedStackTrace ? parseStackTrace(cleanedStackTrace) : []);
</script>

{#if errorMessage || stackTrace}
	<div class="space-y-3">
		<!-- Toggle Header (if compact mode) -->
		{#if compact}
			<button
				onclick={() => (isExpanded = !isExpanded)}
				class="flex w-full items-center gap-2 text-sm font-semibold text-error-500 transition-colors hover:text-error-600"
			>
				{#if isExpanded}
					<ChevronUp class="h-4 w-4" />
				{:else}
					<ChevronDown class="h-4 w-4" />
				{/if}
				<AlertCircle class="h-4 w-4" />
				<span>Error Details</span>
			</button>
		{/if}

		{#if isExpanded}
			<div class="space-y-4">
				<!-- Error Message -->
				{#if cleanedErrorMessage}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-sm font-semibold text-error-500">Error Message</h4>
							<button
								onclick={() => copyToClipboard(cleanedErrorMessage, 'error')}
								class="preset-ghost btn btn-sm"
								title="Copy error message"
							>
								{#if copiedError}
									<Check class="h-4 w-4 text-success-500" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</button>
						</div>
						<div
							class="error-message rounded-container border-l-4 border-error-500 bg-error-500/10 p-4"
						>
							<pre
								class="font-mono text-sm break-words whitespace-pre-wrap text-error-700 dark:text-error-300">{cleanedErrorMessage}</pre>
						</div>
					</div>
				{/if}

				<!-- Stack Trace -->
				{#if cleanedStackTrace}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-sm font-semibold text-error-500">Stack Trace</h4>
							<button
								onclick={() => copyToClipboard(cleanedStackTrace, 'stack')}
								class="preset-ghost btn btn-sm"
								title="Copy stack trace"
							>
								{#if copiedStack}
									<Check class="h-4 w-4 text-success-500" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</button>
						</div>
						<div
							class="stack-trace border-surface-200-700 bg-surface-900-50 max-h-96 overflow-y-auto rounded-container border p-4"
						>
							<div class="space-y-1 font-mono text-xs">
								{#each parsedStackTrace as line}
									<div
										class={line.isFile
											? 'text-primary-600 dark:text-primary-400'
											: 'text-surface-700 dark:text-surface-300'}
									>
										{#if line.isFile}
											<span class="hover:underline">{line.text}</span>
										{:else}
											<span>{line.text}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.error-message pre {
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
	}

	.stack-trace {
		scrollbar-width: thin;
		scrollbar-color: rgb(var(--color-surface-400)) transparent;
	}

	.stack-trace::-webkit-scrollbar {
		width: 8px;
	}

	.stack-trace::-webkit-scrollbar-track {
		background: transparent;
	}

	.stack-trace::-webkit-scrollbar-thumb {
		background-color: rgb(var(--color-surface-400));
		border-radius: 4px;
	}

	.stack-trace::-webkit-scrollbar-thumb:hover {
		background-color: rgb(var(--color-surface-500));
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
</style>
