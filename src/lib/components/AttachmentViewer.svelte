<script lang="ts">
	import { Download, FileImage, FileVideo, FileArchive, File, X, Maximize2 } from 'lucide-svelte';

	interface Props {
		attachments: Array<{
			id: string;
			filename: string;
			originalName: string;
			mimeType: string;
			size: number;
			url: string;
		}>;
		inline?: boolean; // Show inline previews by default
	}

	let { attachments, inline = true }: Props = $props();
	let expandedAttachment = $state<string | null>(null);

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
		return File;
	}

	function getAttachmentType(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'Screenshot';
		if (mimeType.startsWith('video/')) return 'Video';
		if (mimeType.includes('zip')) return 'Trace';
		return 'File';
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	function isVideo(mimeType: string): boolean {
		return mimeType.startsWith('video/');
	}

	function isViewable(mimeType: string): boolean {
		return isImage(mimeType) || isVideo(mimeType);
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
		<h4 class="text-sm font-semibold">Attachments ({attachments.length})</h4>

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
</style>
