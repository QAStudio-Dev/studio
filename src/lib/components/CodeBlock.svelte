<script lang="ts">
	import { codeToHtml, type BundledLanguage } from 'shiki';
	import { onMount } from 'svelte';

	interface Props {
		code: string;
		language?: BundledLanguage;
		showLineNumbers?: boolean;
		id?: string;
	}

	let { code, language = 'json', showLineNumbers = false, id = '' }: Props = $props();

	let highlightedCode = $state<string>('');
	let copied = $state(false);

	onMount(async () => {
		try {
			highlightedCode = await codeToHtml(code, {
				lang: language,
				themes: {
					light: 'github-light',
					dark: 'github-dark'
				}
			});
		} catch (error) {
			console.error('Failed to highlight code:', error);
			// Fallback to plain code if highlighting fails
		}
	});

	async function copyToClipboard() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<div class="group relative">
	{#if highlightedCode}
		<div class="code-block-wrapper overflow-x-auto rounded-base">
			{@html highlightedCode}
		</div>
	{:else}
		<pre class="overflow-x-auto rounded-base bg-surface-900-100 p-4 text-xs"><code>{code}</code
			></pre>
	{/if}

	<button
		onclick={copyToClipboard}
		class="absolute top-2 right-2 rounded-base bg-surface-700-300 px-3 py-1.5 text-xs font-medium opacity-0 transition-all group-hover:opacity-100 hover:bg-surface-600-400"
	>
		{copied ? '✓ Copied!' : 'Copy'}
	</button>
</div>

<style>
	:global(.code-block-wrapper pre) {
		padding: 1rem;
		margin: 0;
		overflow-x: auto;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	:global(.code-block-wrapper code) {
		font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	/* Light theme colors */
	:global(.light .code-block-wrapper pre) {
		background-color: #f6f8fa;
	}

	/* Dark theme colors */
	:global(.dark .code-block-wrapper pre) {
		background-color: #0d1117;
	}

	:global(.shiki) {
		border-radius: 0.375rem;
		background-color: transparent !important;
	}
</style>
