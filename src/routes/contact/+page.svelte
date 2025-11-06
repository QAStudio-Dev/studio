<script lang="ts">
	import { Mail, Github, MessageCircle } from 'lucide-svelte';
</script>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<div class="mb-8">
		<a href="/" class="mb-4 inline-flex items-center gap-2 text-primary-500 hover:underline">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Back to Home
		</a>
		<h1 class="mb-2 text-4xl font-black">Contact Us</h1>
		<p class="text-surface-600 dark:text-surface-400">
			We're here to help. Choose the best way to reach us below.
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Email Support -->
		<a
			href="mailto:ben@qastudio.dev"
			class="group flex flex-col items-center card p-8 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 transition-all group-hover:scale-110"
			>
				<Mail class="h-8 w-8 text-primary-500" />
			</div>
			<h2 class="mb-2 text-xl font-bold">Email Support</h2>
			<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
				Get help with your account, billing, or general inquiries.
			</p>
			<span class="text-sm font-medium text-primary-500">ben@qastudio.dev</span>
		</a>

		<!-- GitHub Issues -->
		<a
			href="https://github.com/QAStudio-Dev/studio/issues"
			target="_blank"
			rel="noopener noreferrer"
			class="group flex flex-col items-center card p-8 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-500/10 transition-all group-hover:scale-110"
			>
				<Github class="h-8 w-8 text-surface-700 dark:text-surface-300" />
			</div>
			<h2 class="mb-2 text-xl font-bold">Report Issues</h2>
			<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
				Found a bug? Request a feature? Open an issue on GitHub.
			</p>
			<span class="text-sm font-medium text-surface-700 dark:text-surface-300"
				>View on GitHub →</span
			>
		</a>

		<!-- Discord Community -->
		<a
			href="https://discord.gg/rw3UfdB9pN"
			target="_blank"
			rel="noopener noreferrer"
			class="group flex flex-col items-center card p-8 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
		>
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-500/10 transition-all group-hover:scale-110"
			>
				<MessageCircle class="h-8 w-8 text-secondary-500" />
			</div>
			<h2 class="mb-2 text-xl font-bold">Join Discord</h2>
			<p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
				Connect with the community, get quick help, and share feedback.
			</p>
			<span class="text-sm font-medium text-secondary-500">Join Server →</span>
		</a>
	</div>

	<!-- Additional Information -->
	<div class="mt-12 card p-8">
		<h2 class="mb-4 text-2xl font-bold">Frequently Asked Questions</h2>
		<div class="space-y-6">
			<div>
				<h3 class="mb-2 text-lg font-semibold">What's the best way to report a bug?</h3>
				<p class="text-surface-600 dark:text-surface-400">
					Please open an issue on our
					<a
						href="https://github.com/QAStudio-Dev/studio/issues"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-500 hover:underline">GitHub repository</a
					>. Include steps to reproduce, expected behavior, and screenshots if applicable.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">How quickly can I expect a response?</h3>
				<p class="text-surface-600 dark:text-surface-400">
					For email support, we typically respond within 24-48 hours. For urgent issues, try our
					Discord community for faster responses from the team and other users.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">Do you offer enterprise support?</h3>
				<p class="text-surface-600 dark:text-surface-400">
					Yes! For enterprise support plans, dedicated onboarding, and custom integrations, please
					reach out to
					<a href="mailto:ben@qastudio.dev" class="text-primary-500 hover:underline"
						>ben@qastudio.dev</a
					>.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">Can I contribute to QA Studio?</h3>
				<p class="text-surface-600 dark:text-surface-400">
					Absolutely! QA Studio is open source. Check out our
					<a
						href="https://github.com/QAStudio-Dev/studio"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary-500 hover:underline">GitHub repository</a
					>
					to get started. We welcome contributions, feature requests, and bug reports.
				</p>
			</div>
		</div>
	</div>

	<!-- Business Inquiries -->
	<div class="mt-6 card bg-primary-50/50 p-8 dark:bg-primary-950/50">
		<h2 class="mb-2 text-xl font-bold">Business Inquiries</h2>
		<p class="mb-4 text-surface-600 dark:text-surface-400">
			For partnerships, press inquiries, or business development opportunities, please contact:
		</p>
		<a href="mailto:ben@qastudio.dev" class="font-medium text-primary-500 hover:underline">
			ben@qastudio.dev
		</a>
	</div>
</div>
