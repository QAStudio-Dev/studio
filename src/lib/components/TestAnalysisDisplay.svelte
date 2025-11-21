<script lang="ts">
	import type { AnalysisCategory } from '$lib/../generated/client/client';

	interface Props {
		analysis: {
			id: string;
			rootCause: string;
			category: AnalysisCategory;
			suggestedFix: string;
			fixCode?: string | null;
			confidence: number;
			additionalNotes?: string | null;
			analyzedAt: Date;
		};
		cached?: boolean;
	}

	let { analysis, cached = false }: Props = $props();

	function getCategoryColor(category: AnalysisCategory): string {
		const colors: Record<AnalysisCategory, string> = {
			STALE_LOCATOR: 'warning',
			TIMING_ISSUE: 'tertiary',
			NETWORK_ERROR: 'error',
			ASSERTION_FAILURE: 'secondary',
			DATA_ISSUE: 'primary',
			ENVIRONMENT_ISSUE: 'warning',
			CONFIGURATION_ERROR: 'error',
			OTHER: 'surface'
		};
		return colors[category] || 'surface';
	}

	function getCategoryIcon(category: AnalysisCategory): string {
		const icons: Record<AnalysisCategory, string> = {
			STALE_LOCATOR: '🔍',
			TIMING_ISSUE: '⏱️',
			NETWORK_ERROR: '🌐',
			ASSERTION_FAILURE: '✅',
			DATA_ISSUE: '📊',
			ENVIRONMENT_ISSUE: '🖥️',
			CONFIGURATION_ERROR: '⚙️',
			OTHER: '🔧'
		};
		return icons[category] || '🔧';
	}

	function formatCategory(category: AnalysisCategory): string {
		return category.replace(/_/g, ' ');
	}

	let copied = $state(false);

	async function copyCode() {
		if (analysis.fixCode) {
			await navigator.clipboard.writeText(analysis.fixCode);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<div class="bg-surface-100-800 space-y-6 card rounded-container p-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<h3 class="h3">AI Analysis</h3>
			{#if cached}
				<span class="badge preset-outlined-surface-500 text-xs">Cached</span>
			{/if}
		</div>
		<span class="badge preset-filled-{getCategoryColor(analysis.category)}-500 text-sm">
			{getCategoryIcon(analysis.category)}
			{formatCategory(analysis.category)}
		</span>
	</div>

	<!-- Root Cause -->
	<div class="space-y-2">
		<h4 class="h4 text-primary-500">Root Cause</h4>
		<p class="text-surface-600-300-token">{analysis.rootCause}</p>
	</div>

	<!-- Suggested Fix -->
	<div class="space-y-2">
		<h4 class="h4 text-primary-500">Suggested Fix</h4>
		<p class="leading-relaxed">{analysis.suggestedFix}</p>
	</div>

	<!-- Fix Code -->
	{#if analysis.fixCode}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h4 class="h4 text-primary-500">Fix Code</h4>
				<button class="btn preset-outlined-surface-500 btn-sm" onclick={copyCode}>
					{#if copied}
						✓ Copied!
					{:else}
						📋 Copy
					{/if}
				</button>
			</div>
			<div class="code-block bg-surface-200-700 overflow-x-auto rounded-container p-4">
				<pre class="text-sm"><code class="language-typescript">{analysis.fixCode}</code
					></pre>
			</div>
		</div>
	{/if}

	<!-- Confidence Score -->
	<div class="space-y-2">
		<div class="flex items-center justify-between text-sm">
			<span class="font-semibold">Confidence Score</span>
			<span class="text-surface-600-300-token">{Math.round(analysis.confidence * 100)}%</span>
		</div>
		<div class="bg-surface-300-600 h-2 w-full overflow-hidden rounded-full">
			<div
				class="h-full rounded-full transition-all duration-300"
				class:bg-success-500={analysis.confidence >= 0.8}
				class:bg-warning-500={analysis.confidence >= 0.5 && analysis.confidence < 0.8}
				class:bg-error-500={analysis.confidence < 0.5}
				style="width: {analysis.confidence * 100}%"
			></div>
		</div>
		<p class="text-surface-600-300-token text-xs">
			{#if analysis.confidence >= 0.9}
				Very high confidence - This fix should resolve the issue
			{:else if analysis.confidence >= 0.7}
				High confidence - Likely to resolve the issue
			{:else if analysis.confidence >= 0.5}
				Moderate confidence - Worth trying this fix
			{:else}
				Lower confidence - Multiple possible causes
			{/if}
		</p>
	</div>

	<!-- Additional Notes -->
	{#if analysis.additionalNotes}
		<div class="alert preset-outlined-surface-500">
			<div class="flex items-start gap-3">
				<div class="text-2xl">💡</div>
				<div class="flex-1">
					<strong>Additional Notes:</strong>
					<p class="mt-1">{analysis.additionalNotes}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Metadata -->
	<div class="text-surface-600-300-token border-surface-300-600 border-t pt-4 text-xs">
		Analyzed {new Date(analysis.analyzedAt).toLocaleString()}
	</div>
</div>
