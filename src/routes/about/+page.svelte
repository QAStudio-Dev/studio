<script lang="ts">
	import { Heart, Code, Users, Zap } from 'lucide-svelte';
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
		<h1 class="mb-2 text-4xl font-black">About QA Studio</h1>
		<p class="text-surface-600 dark:text-surface-400">
			Built by a QA engineer who got tired of building the same thing over and over.
		</p>
	</div>

	<!-- The Story -->
	<div class="card mb-6 p-8">
		<h2 class="mb-4 text-2xl font-bold">The Story Behind QA Studio</h2>
		<div class="prose dark:prose-invert max-w-none">
			<p class="text-surface-600 dark:text-surface-400">
				After building countless test management platforms, suites, and tools across different
				companies and projects, I realized something: I kept solving the same problems over and over
				again. Every organization needed the same core features—test case management, execution
				tracking, reporting—but I was constantly reinventing the wheel.
			</p>
			<p class="text-surface-600 dark:text-surface-400">
				As a passionate believer in open source and a lover of software development, I decided it was
				time to build something different. Something the entire QA community could benefit from.
				Something that wouldn't need to be rebuilt from scratch at the next company.
			</p>
			<p class="text-surface-600 dark:text-surface-400">
				<strong class="text-surface-900 dark:text-surface-100">QA Studio was born from that frustration and that passion.</strong>
			</p>
			<p class="text-surface-600 dark:text-surface-400">
				It's the test management platform I wish existed when I started my career. Modern, fast,
				API-first, and completely open source. No vendor lock-in. No proprietary formats. No
				artificial limitations based on pricing tiers.
			</p>
		</div>
	</div>

	<!-- Mission & Values -->
	<div class="mb-6 grid gap-6 md:grid-cols-2">
		<!-- Open Source First -->
		<div class="card p-6">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-500/10">
				<Heart class="h-6 w-6 text-success-500" />
			</div>
			<h3 class="mb-2 text-xl font-bold">Open Source First</h3>
			<p class="text-sm text-surface-600 dark:text-surface-400">
				QA Studio is completely open source. Fork it, modify it, host it yourself. The code belongs
				to the community, and the community drives its future.
			</p>
		</div>

		<!-- Built by QA Engineers -->
		<div class="card p-6">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10">
				<Code class="h-6 w-6 text-primary-500" />
			</div>
			<h3 class="mb-2 text-xl font-bold">Built by QA Engineers</h3>
			<p class="text-sm text-surface-600 dark:text-surface-400">
				Every feature is designed by someone who's actually used test management tools in the
				trenches. No bloat, no confusion—just what you need to get work done.
			</p>
		</div>

		<!-- Community Driven -->
		<div class="card p-6">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-500/10">
				<Users class="h-6 w-6 text-secondary-500" />
			</div>
			<h3 class="mb-2 text-xl font-bold">Community Driven</h3>
			<p class="text-sm text-surface-600 dark:text-surface-400">
				Features are prioritized based on what the community needs. Have an idea? Open an issue.
				Want to contribute? Send a PR. This is built for QA engineers, by QA engineers.
			</p>
		</div>

		<!-- Modern & Fast -->
		<div class="card p-6">
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10">
				<Zap class="h-6 w-6 text-warning-500" />
			</div>
			<h3 class="mb-2 text-xl font-bold">Modern & Fast</h3>
			<p class="text-sm text-surface-600 dark:text-surface-400">
				Built with SvelteKit, TypeScript, and modern web technologies. No sluggish interfaces, no
				30-second page loads. Test management that keeps up with your workflow.
			</p>
		</div>
	</div>

	<!-- Why Open Source -->
	<div class="card mb-6 bg-primary-50/50 p-8 dark:bg-primary-950/50">
		<h2 class="mb-4 text-2xl font-bold">Why Open Source?</h2>
		<div class="space-y-4 text-surface-600 dark:text-surface-400">
			<p>
				<strong class="text-surface-900 dark:text-surface-100"
					>Because test management shouldn't be locked behind expensive licenses.</strong
				>
			</p>
			<p>
				I've worked at startups that couldn't afford enterprise test management tools. I've seen
				teams build hacky spreadsheet solutions because they had no budget. I've watched talented QA
				engineers struggle with outdated, proprietary software that couldn't be customized to their
				needs.
			</p>
			<p>
				Open source means anyone can use QA Studio. Any team, any size, any budget. Want to host it
				yourself? Go ahead. Need to add a custom feature? Fork it. Need enterprise support?
				<a href="/contact" class="text-primary-500 hover:underline">We've got you covered</a>.
			</p>
			<p>
				<strong class="text-surface-900 dark:text-surface-100"
					>QA Studio grows stronger with every contribution, every feature request, every bug
					report.</strong
				>
				That's the power of open source.
			</p>
		</div>
	</div>

	<!-- The Tech Stack -->
	<div class="card mb-6 p-8">
		<h2 class="mb-4 text-2xl font-bold">Built With Modern Technology</h2>
		<p class="mb-6 text-surface-600 dark:text-surface-400">
			QA Studio is built with cutting-edge web technologies that prioritize performance, developer
			experience, and scalability:
		</p>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">SvelteKit</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">
					Lightning-fast frontend framework
				</div>
			</div>
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">TypeScript</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">Type-safe development</div>
			</div>
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">PostgreSQL</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">Reliable, scalable database</div>
			</div>
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">Prisma</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">Modern ORM for data management</div>
			</div>
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">Playwright</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">First-class test integration</div>
			</div>
			<div class="rounded-base bg-surface-100-900 p-4">
				<div class="mb-1 font-semibold">Docker</div>
				<div class="text-sm text-surface-600 dark:text-surface-400">Easy self-hosting (coming soon)</div>
			</div>
		</div>
	</div>

	<!-- Get Involved -->
	<div class="card p-8">
		<h2 class="mb-4 text-2xl font-bold">Get Involved</h2>
		<p class="mb-6 text-surface-600 dark:text-surface-400">
			QA Studio is more than just software—it's a community. Here's how you can be part of it:
		</p>
		<div class="space-y-4">
			<div class="flex items-start gap-4">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10"
				>
					<span class="text-sm font-bold text-primary-500">1</span>
				</div>
				<div>
					<div class="font-semibold">Try QA Studio</div>
					<div class="text-sm text-surface-600 dark:text-surface-400">
						<a href="/sign-up" class="text-primary-500 hover:underline">Sign up for free</a> and start
						managing your tests today. No credit card required.
					</div>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10"
				>
					<span class="text-sm font-bold text-primary-500">2</span>
				</div>
				<div>
					<div class="font-semibold">Contribute Code</div>
					<div class="text-sm text-surface-600 dark:text-surface-400">
						Check out our
						<a
							href="https://github.com/QAStudio-Dev/studio"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary-500 hover:underline">GitHub repository</a
						>. PRs welcome!
					</div>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10"
				>
					<span class="text-sm font-bold text-primary-500">3</span>
				</div>
				<div>
					<div class="font-semibold">Join the Community</div>
					<div class="text-sm text-surface-600 dark:text-surface-400">
						Connect with other QA engineers on
						<a
							href="https://discord.gg/rw3UfdB9pN"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary-500 hover:underline">Discord</a
						>. Share tips, ask questions, and help shape the future of QA Studio.
					</div>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10"
				>
					<span class="text-sm font-bold text-primary-500">4</span>
				</div>
				<div>
					<div class="font-semibold">Spread the Word</div>
					<div class="text-sm text-surface-600 dark:text-surface-400">
						Star us on GitHub, share with your team, and help other QA engineers discover a better
						way to manage tests.
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Final Note -->
	<div class="mt-8 text-center">
		<p class="text-surface-600 dark:text-surface-400">
			Built with ❤️ by
			<a
				href="https://spurlock.app"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-primary-500 hover:underline">Ben</a
			>
			and the QA Studio community
		</p>
	</div>
</div>
