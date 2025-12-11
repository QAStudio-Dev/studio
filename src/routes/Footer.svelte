<script lang="ts">
	// Get current year dynamically
	const currentYear = new Date().getFullYear();
</script>

<footer class="border-t border-surface-300-700 bg-surface-50-950">
	<div class="container mx-auto px-4 py-12">
		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
			<!-- Brand Section -->
			<div class="lg:col-span-1">
				<div class="mb-4 flex items-center gap-2">
					<img src="/full.svg" alt="QA Studio" class="h-6" />
				</div>
				<p class="mb-4 text-sm text-surface-600-400">
					Modern test management built by QA engineers, for QA engineers.
				</p>
				<div class="flex items-center gap-3">
					<a
						href="https://github.com/QAStudio-Dev/studio"
						target="_blank"
						rel="noopener noreferrer"
						class="flex h-8 w-8 items-center justify-center rounded-base bg-surface-200-800 text-surface-700-300 transition-colors hover:bg-primary-500 hover:text-white"
						aria-label="GitHub"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path
								fill-rule="evenodd"
								d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
								clip-rule="evenodd"
							/>
						</svg>
					</a>
					<a
						href="https://www.linkedin.com/company/qa-studio-dev"
						target="_blank"
						rel="noopener noreferrer"
						class="flex h-8 w-8 items-center justify-center rounded-base bg-surface-200-800 text-surface-700-300 transition-colors hover:bg-primary-500 hover:text-white"
						aria-label="LinkedIn"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
							/>
						</svg>
					</a>
					<a
						href="https://discord.gg/rw3UfdB9pN"
						target="_blank"
						rel="noopener noreferrer"
						class="flex h-8 w-8 items-center justify-center rounded-base bg-surface-200-800 text-surface-700-300 transition-colors hover:bg-primary-500 hover:text-white"
						aria-label="Discord"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
							/>
						</svg>
					</a>
				</div>
			</div>

			<!-- Product Links -->
			<div>
				<h3 class="mb-4 text-sm font-bold">Product</h3>
				<ul class="space-y-2 text-sm">
					<li>
						<a
							href="/docs"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							API Documentation
						</a>
					</li>
					<li>
						<a
							href="/projects"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Projects
						</a>
					</li>
					<!-- <li>
						<a
							href="https://github.com"
							target="_blank"
							rel="noopener noreferrer"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Self-Hosting Guide
						</a>
					</li> -->
					<!-- <li>
						<a href="/" class="text-surface-600-400 transition-colors hover:text-primary-500">
							Pricing
						</a>
					</li> -->
				</ul>
			</div>

			<!-- Resources Links -->
			<div>
				<h3 class="mb-4 text-sm font-bold">Resources</h3>
				<ul class="space-y-2 text-sm">
					<li>
						<a
							href="/blog"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Blog
						</a>
					</li>
					<li>
						<a
							href="https://github.com"
							target="_blank"
							rel="noopener noreferrer"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							GitHub
						</a>
					</li>
					<li>
						<a
							href="/sitemap.xml"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Sitemap
						</a>
					</li>
					<!-- <li>
						<a
							href="/blog"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Changelog
						</a>
					</li> -->
					<!-- <li>
						<a
							href="https://discord.com"
							target="_blank"
							rel="noopener noreferrer"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Community
						</a>
					</li> -->
				</ul>
			</div>

			<!-- Company Links -->
			<div>
				<h3 class="mb-4 text-sm font-bold">Company</h3>
				<ul class="space-y-2 text-sm">
					<li>
						<a
							href="/about"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							About
						</a>
					</li>
					<li>
						<a
							href="/contact"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Contact
						</a>
					</li>
					<li>
						<a
							href="/privacy"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Privacy Policy
						</a>
					</li>
					<li>
						<a
							href="/terms"
							class="text-surface-600-400 transition-colors hover:text-primary-500"
						>
							Terms of Service
						</a>
					</li>
				</ul>
			</div>
		</div>

		<!-- Bottom Bar -->
		<div class="mt-8 border-t border-surface-300-700 pt-8">
			<div class="flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
				<div class="flex items-center gap-2 text-surface-600-400">
					<span>© {currentYear} QA Studio</span>
					<span class="text-surface-400-600">•</span>
					<span>Built with ❤️ by QA Engineers</span>
				</div>
				<!-- <div class="flex items-center gap-1 text-xs text-surface-600-400">
					<span class="rounded-full bg-success-500/10 px-2 py-1 text-success-500">
						✓ Open Source
					</span>
					<span class="rounded-full bg-primary-500/10 px-2 py-1 text-primary-500">
						v1.0.0
					</span>
				</div> -->
			</div>
		</div>
	</div>
</footer>
