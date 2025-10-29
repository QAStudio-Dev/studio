<script lang="ts">
	import { Download, FileImage, FileVideo, FileArchive, File, X, Maximize2, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	interface Props {
		attachments: Array<{
			id: string;
			filename: string;
			originalName: string;
			mimeType: string;
			size: number;
			url: string;
		}>;
		inline?: boolean; // Show inline previews when expanded
		defaultExpanded?: boolean; // Whether attachments are shown by default
	}

	let { attachments, inline = true, defaultExpanded = false }: Props = $props();
	let expandedAttachment = $state<string | null>(null);
	let isExpanded = $state(defaultExpanded);
	let markdownContents = $state<Record<string, string>>({});
	let loadingMarkdown = $state<Record<string, boolean>>({});

	// Configure marked for safe HTML rendering
	onMount(() => {
		marked.setOptions({
			breaks: true,
			gfm: true
		});
	});

	// Load markdown content when attachments are expanded and visible
	$effect(() => {
		if (isExpanded && inline) {
			attachments.forEach(attachment => {
				if (isMarkdown(attachment.mimeType) && !markdownContents[attachment.id] && !loadingMarkdown[attachment.id]) {
					loadMarkdownContent(attachment.id);
				}
			});
		}
	});

	// Load markdown content when modal is opened for a markdown file
	$effect(() => {
		if (expandedAttachment) {
			const attachment = attachments.find(a => a.id === expandedAttachment);
			if (attachment && isMarkdown(attachment.mimeType) && !markdownContents[attachment.id] && !loadingMarkdown[attachment.id]) {
				loadMarkdownContent(attachment.id);
			}
		}
	});

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function getAttachmentIcon(mimeType: string) {
		if (mimeType.startsWith('image/')) return FileImage;
		if (mimeType.startsWith('video/')) return FileVideo;
		if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
		if (mimeType.startsWith('text/')) return File;
		return File;
	}

	function getAttachmentType(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'Screenshot';
		if (mimeType.startsWith('video/')) return 'Video';
		if (mimeType.includes('zip')) return 'Trace';
		if (mimeType === 'text/markdown') return 'Error Context';
		if (mimeType.startsWith('text/')) return 'Text File';
		return 'File';
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	function isVideo(mimeType: string): boolean {
		return mimeType.startsWith('video/');
	}

	function isMarkdown(mimeType: string): boolean {
		return mimeType === 'text/markdown' || mimeType === 'text/x-markdown';
	}

	function isViewable(mimeType: string): boolean {
		return isImage(mimeType) || isVideo(mimeType) || isMarkdown(mimeType);
	}

	async function loadMarkdownContent(attachmentId: string) {
		if (markdownContents[attachmentId] || loadingMarkdown[attachmentId]) {
			return;
		}

		loadingMarkdown[attachmentId] = true;
		try {
			const response = await fetch(`/api/attachments/${attachmentId}`);
			if (response.ok) {
				const text = await response.text();
				markdownContents[attachmentId] = text;
			}
		} catch (error) {
			console.error('Failed to load markdown:', error);
		} finally {
			loadingMarkdown[attachmentId] = false;
		}
	}

	function expandAttachment(attachmentId: string) {
		expandedAttachment = attachmentId;
	}

	function closeExpanded() {
		expandedAttachment = null;
	}
</script>

{#if attachments && attachments.length > 0}
	<div class="space-y-3">
		<!-- Toggle Header -->
		<button
			onclick={() => isExpanded = !isExpanded}
			class="flex items-center gap-2 text-sm font-semibold hover:text-primary-500 transition-colors w-full"
		>
			{#if isExpanded}
				<ChevronUp class="w-4 h-4" />
			{:else}
				<ChevronDown class="w-4 h-4" />
			{/if}
			<span>Attachments ({attachments.length})</span>
		</button>

		{#if isExpanded}
			<div class="space-y-4">
				{#each attachments as attachment}
				<div class="card p-4">
					<!-- Header -->
					<div class="flex items-start justify-between gap-3 mb-3">
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<div class="text-surface-600-300">
								<svelte:component this={getAttachmentIcon(attachment.mimeType)} class="w-5 h-5" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium truncate" title={attachment.originalName}>
									{attachment.originalName}
								</div>
								<div class="text-xs text-surface-600-300 mt-1">
									{getAttachmentType(attachment.mimeType)} • {formatBytes(attachment.size)}
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex gap-2">
							{#if isViewable(attachment.mimeType) && inline}
								<button
									onclick={() => expandAttachment(attachment.id)}
									class="btn btn-sm preset-tonal"
									title="Expand"
								>
									<Maximize2 class="w-4 h-4" />
								</button>
							{/if}
							<a
								href="/api/attachments/{attachment.id}"
								download={attachment.originalName}
								class="btn btn-sm variant-ghost"
								title="Download {attachment.originalName}"
							>
								<Download class="w-4 h-4" />
							</a>
						</div>
					</div>

					<!-- Inline Preview -->
					{#if inline && isImage(attachment.mimeType)}
						<div class="rounded-container overflow-hidden bg-surface-900-50 border border-surface-200-700">
							<img
								src="/api/attachments/{attachment.id}"
								alt={attachment.originalName}
								class="w-full h-auto max-h-96 object-contain cursor-pointer"
								onclick={() => expandAttachment(attachment.id)}
							/>
						</div>
					{:else if inline && isVideo(attachment.mimeType)}
						<div class="rounded-container overflow-hidden bg-surface-900-50 border border-surface-200-700">
							<video
								src="/api/attachments/{attachment.id}"
								controls
								class="w-full h-auto max-h-96"
								preload="metadata"
							>
								<track kind="captions" />
								Your browser does not support the video tag.
							</video>
						</div>
					{:else if inline && isMarkdown(attachment.mimeType)}
						<div class="rounded-container overflow-hidden bg-surface-900-50 border border-surface-200-700 p-4">
							{#if loadingMarkdown[attachment.id]}
								<div class="text-center py-4 text-surface-600-300">
									<div class="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
									<span class="ml-2">Loading...</span>
								</div>
							{:else if markdownContents[attachment.id]}
								<div class="prose prose-sm dark:prose-invert max-w-none">
									{@html marked.parse(markdownContents[attachment.id])}
								</div>
							{/if}
						</div>
					{:else if !isViewable(attachment.mimeType)}
						<a
							href="/api/attachments/{attachment.id}"
							download={attachment.originalName}
							class="block p-4 text-center border-2 border-dashed border-surface-300-600 rounded-container hover:border-primary-500 transition-colors"
						>
							<div class="text-surface-600-300 mb-2">
								<svelte:component this={getAttachmentIcon(attachment.mimeType)} class="w-8 h-8 mx-auto" />
							</div>
							<div class="text-sm text-surface-600-300">
								Click to download
							</div>
						</a>
					{/if}
				</div>
			{/each}
			</div>
		{/if}
	</div>

	<!-- Expanded View Modal -->
	{#if expandedAttachment}
		{@const attachment = attachments.find((a) => a.id === expandedAttachment)}
		{#if attachment}
			<!-- Backdrop -->
			<button
				onclick={closeExpanded}
				class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm cursor-pointer"
				aria-label="Close expanded view"
			></button>

			<!-- Modal Content -->
			<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
				<div class="relative max-w-7xl max-h-full pointer-events-auto">
					<!-- Close Button -->
					<button
						onclick={closeExpanded}
						class="absolute -top-12 right-0 btn preset-filled text-white hover:bg-white/20"
						aria-label="Close"
					>
						<X class="w-5 h-5" />
					</button>

					<!-- Content -->
					<div class="bg-surface-50-950 rounded-container shadow-2xl overflow-hidden">
						{#if isImage(attachment.mimeType)}
							<img
								src="/api/attachments/{attachment.id}"
								alt={attachment.originalName}
								class="max-h-[85vh] max-w-full object-contain"
							/>
						{:else if isVideo(attachment.mimeType)}
							<video
								src="/api/attachments/{attachment.id}"
								controls
								autoplay
								class="max-h-[85vh] max-w-full"
							>
								<track kind="captions" />
								Your browser does not support the video tag.
							</video>
						{:else if isMarkdown(attachment.mimeType)}
							<div class="max-h-[85vh] max-w-4xl overflow-auto p-8">
								{#if loadingMarkdown[attachment.id]}
									<div class="text-center py-8 text-surface-600-300">
										<div class="inline-block animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
										<span class="ml-2">Loading markdown...</span>
									</div>
								{:else if markdownContents[attachment.id]}
									<div class="prose prose-sm dark:prose-invert max-w-none">
										{@html marked.parse(markdownContents[attachment.id])}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Info Bar -->
						<div class="p-4 border-t border-surface-200-700">
							<div class="flex items-center justify-between gap-4">
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium truncate">{attachment.originalName}</div>
									<div class="text-xs text-surface-600-300">
										{getAttachmentType(attachment.mimeType)} • {formatBytes(attachment.size)}
									</div>
								</div>
								<a
									href="/api/attachments/{attachment.id}"
									download={attachment.originalName}
									class="btn btn-sm preset-filled-primary-500"
								>
									<Download class="w-4 h-4" />
									Download
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/if}
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	/* Basic prose styling for markdown with light/dark mode support */
	.prose {
		line-height: 1.75;
		color: light-dark(rgb(var(--color-surface-900)), rgb(var(--color-surface-50)));
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3),
	.prose :global(h4) {
		font-weight: 600;
		margin-top: 1.5em;
		margin-bottom: 0.5em;
		line-height: 1.25;
		color: light-dark(rgb(var(--color-surface-950)), rgb(var(--color-surface-50)));
	}

	.prose :global(h1) {
		font-size: 1.5em;
	}
	.prose :global(h2) {
		font-size: 1.25em;
	}
	.prose :global(h3) {
		font-size: 1.125em;
	}

	.prose :global(p) {
		margin-top: 0.75em;
		margin-bottom: 0.75em;
	}

	.prose :global(code) {
		background-color: light-dark(rgb(var(--color-surface-100)), rgb(var(--color-surface-800)));
		color: light-dark(rgb(var(--color-error-600)), rgb(var(--color-error-400)));
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.prose :global(pre) {
		background-color: light-dark(rgb(var(--color-surface-100)), rgb(var(--color-surface-800)));
		color: light-dark(rgb(var(--color-surface-900)), rgb(var(--color-surface-100)));
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 1rem 0;
		border: 1px solid light-dark(rgb(var(--color-surface-200)), rgb(var(--color-surface-700)));
	}

	.prose :global(pre code) {
		background-color: transparent;
		padding: 0;
		font-size: 0.875em;
		color: inherit;
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.prose :global(li) {
		margin: 0.25rem 0;
	}

	.prose :global(a) {
		color: rgb(var(--color-primary-500));
		text-decoration: underline;
	}

	.prose :global(a:hover) {
		color: rgb(var(--color-primary-600));
	}

	.prose :global(blockquote) {
		border-left: 4px solid light-dark(rgb(var(--color-surface-300)), rgb(var(--color-surface-600)));
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
		color: light-dark(rgb(var(--color-surface-600)), rgb(var(--color-surface-400)));
	}

	.prose :global(hr) {
		border: 0;
		border-top: 1px solid light-dark(rgb(var(--color-surface-300)), rgb(var(--color-surface-700)));
		margin: 2rem 0;
	}

	.prose :global(strong) {
		font-weight: 600;
		color: light-dark(rgb(var(--color-surface-950)), rgb(var(--color-surface-50)));
	}

	.prose :global(table) {
		width: 100%;
		margin: 1rem 0;
		border-collapse: collapse;
	}

	.prose :global(th),
	.prose :global(td) {
		padding: 0.5rem;
		border: 1px solid light-dark(rgb(var(--color-surface-300)), rgb(var(--color-surface-700)));
		text-align: left;
	}

	.prose :global(th) {
		background-color: light-dark(rgb(var(--color-surface-100)), rgb(var(--color-surface-800)));
		font-weight: 600;
	}
</style>
