<script lang="ts">
	import {
		Download,
		FileImage,
		FileVideo,
		FileArchive,
		File,
		Image as ImageIcon
	} from 'lucide-svelte';
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
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
	}

	let { attachments }: Props = $props();
	let selectedAttachment = $state<string | null>(null);
	let markdownContents = $state<Record<string, string>>({});
	let loadingMarkdown = $state<Record<string, boolean>>({});

	// Configure marked for safe HTML rendering
	onMount(() => {
		marked.setOptions({
			breaks: true,
			gfm: true
		});
	});

	// Load markdown content when modal is opened for a markdown file
	$effect(() => {
		if (selectedAttachment) {
			const attachment = attachments.find((a) => a.id === selectedAttachment);
			if (
				attachment &&
				isMarkdown(attachment.mimeType) &&
				!markdownContents[attachment.id] &&
				!loadingMarkdown[attachment.id]
			) {
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

	function isTrace(mimeType: string): boolean {
		return mimeType.includes('zip') || mimeType.includes('application/zip');
	}

	function isViewable(mimeType: string): boolean {
		return isImage(mimeType) || isVideo(mimeType) || isMarkdown(mimeType) || isTrace(mimeType);
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

	function selectAttachment(attachmentId: string) {
		selectedAttachment = attachmentId;
	}
</script>

{#if attachments && attachments.length > 0}
	<Dialog>
		<Dialog.Trigger class="btn w-full preset-tonal-secondary">
			<ImageIcon class="h-4 w-4" />
			View Attachments ({attachments.length})
		</Dialog.Trigger>

		<Portal>
			<Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-50-950/80 backdrop-blur-sm" />
			<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<Dialog.Content
					class="flex max-h-[90vh] w-full max-w-5xl flex-col space-y-4 overflow-hidden card bg-surface-100-900 p-6 shadow-xl"
				>
					<Dialog.Title class="text-2xl font-bold">Attachments ({attachments.length})</Dialog.Title>

					<div class="flex-1 space-y-3 overflow-y-auto">
						{#each attachments as attachment}
							<div class="card bg-surface-50-950 p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<div class="text-surface-600-300">
											<svelte:component
												this={getAttachmentIcon(attachment.mimeType)}
												class="h-5 w-5"
											/>
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-medium" title={attachment.originalName}>
												{attachment.originalName}
											</div>
											<div class="text-surface-600-300 mt-1 text-xs">
												{getAttachmentType(attachment.mimeType)} • {formatBytes(attachment.size)}
											</div>
										</div>
									</div>

									<div class="flex gap-2">
										{#if isViewable(attachment.mimeType)}
											<button
												onclick={() => selectAttachment(attachment.id)}
												class="preset-tonal-primary-500 btn btn-sm"
												title="View {attachment.originalName}"
											>
												<ImageIcon class="h-4 w-4" />
												View
											</button>
										{/if}
										<a
											href="/api/attachments/{attachment.id}"
											download={attachment.originalName}
											class="preset-tonal-surface-500 btn btn-sm"
											title="Download {attachment.originalName}"
										>
											<Download class="h-4 w-4" />
										</a>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<Dialog.CloseTrigger class="btn preset-filled-surface-500">Close</Dialog.CloseTrigger>
				</Dialog.Content>
			</Dialog.Positioner>
		</Portal>
	</Dialog>

	<!-- Full screen attachment viewer -->
	{#if selectedAttachment}
		{@const attachment = attachments.find((a) => a.id === selectedAttachment)}
		{#if attachment}
			<Dialog open={!!selectedAttachment} onOpenChange={() => (selectedAttachment = null)}>
				<Portal>
					<Dialog.Backdrop class="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm" />
					<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
						<Dialog.Content class="relative flex max-h-[95vh] w-full max-w-7xl flex-col">
							<div
								class="flex max-h-[95vh] flex-col overflow-hidden rounded-container bg-surface-50-950 shadow-2xl"
							>
								<!-- Content -->
								<div class="flex flex-1 items-center justify-center overflow-auto bg-black/50">
									{#if isImage(attachment.mimeType)}
										<img
											src="/api/attachments/{attachment.id}"
											alt={attachment.originalName}
											class="max-h-full max-w-full object-contain"
										/>
									{:else if isVideo(attachment.mimeType)}
										<video
											src="/api/attachments/{attachment.id}"
											controls
											autoplay
											class="max-h-full max-w-full"
										>
											<track kind="captions" />
											Your browser does not support the video tag.
										</video>
									{:else if isTrace(attachment.mimeType)}
										<div class="h-full w-full bg-white">
											<iframe
												src="https://trace.playwright.dev/?trace={encodeURIComponent(
													`${window.location.origin}/api/attachments/${attachment.id}`
												)}"
												class="h-full w-full border-0"
												title="Playwright Trace Viewer"
											></iframe>
										</div>
									{:else if isMarkdown(attachment.mimeType)}
										<div class="w-full max-w-4xl overflow-auto bg-surface-100-900 p-8">
											{#if loadingMarkdown[attachment.id]}
												<div class="text-surface-600-300 py-8 text-center">
													<div
														class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
													></div>
													<span class="ml-2">Loading markdown...</span>
												</div>
											{:else if markdownContents[attachment.id]}
												<div class="prose prose-sm max-w-none dark:prose-invert">
													{@html marked.parse(markdownContents[attachment.id])}
												</div>
											{/if}
										</div>
									{/if}
								</div>

								<!-- Info Bar -->
								<div class="border-surface-200-700 border-t bg-surface-100-900 p-4">
									<div class="flex items-center justify-between gap-4">
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-medium">{attachment.originalName}</div>
											<div class="text-surface-600-300 text-xs">
												{getAttachmentType(attachment.mimeType)} • {formatBytes(attachment.size)}
											</div>
										</div>
										<div class="flex gap-2">
											<a
												href="/api/attachments/{attachment.id}"
												download={attachment.originalName}
												class="btn preset-filled-primary-500 btn-sm"
											>
												<Download class="h-4 w-4" />
												Download
											</a>
											<Dialog.CloseTrigger class="btn preset-filled-surface-500 btn-sm">
												Close
											</Dialog.CloseTrigger>
										</div>
									</div>
								</div>
							</div>
						</Dialog.Content>
					</Dialog.Positioner>
				</Portal>
			</Dialog>
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
