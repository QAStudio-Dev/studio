<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Download, FileCode, KeyRound } from '@lucide/svelte';

	let swaggerContainer: HTMLDivElement;

	onMount(() => {
		if (browser) {
			// Dynamically import and initialize Swagger UI
			(async () => {
				const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-bundle.js'))
					.default;

				// Check if dark mode is active using data-mode attribute
				let isDarkMode = document.documentElement.getAttribute('data-mode') === 'dark';

				// Initialize Swagger UI with dynamic theme
				SwaggerUIBundle({
					url: '/api/openapi',
					dom_id: '#swagger-ui',
					deepLinking: true,
					presets: [SwaggerUIBundle.presets.apis],
					layout: 'BaseLayout',
					displayRequestDuration: true,
					filter: true,
					tryItOutEnabled: true,
					persistAuthorization: true,
					// Use dark theme if dark mode is active
					syntaxHighlight: {
						theme: isDarkMode ? 'monokai' : 'agate'
					}
				});

				// Watch for data-mode attribute changes and reload Swagger UI
				const observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.attributeName === 'data-mode') {
							const newIsDarkMode =
								document.documentElement.getAttribute('data-mode') === 'dark';
							if (newIsDarkMode !== isDarkMode) {
								// Reload the page to reinitialize Swagger UI with new theme
								window.location.reload();
							}
						}
					});
				});

				observer.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ['data-mode']
				});
			})();
		}
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
	{#if browser && document.documentElement.getAttribute('data-mode') === 'dark'}
		<link rel="stylesheet" href="/SwaggerDark.css" />
	{/if}
</svelte:head>

<div class="min-h-screen bg-surface-50-950">
	<header
		class="border-b border-surface-200-800 bg-gradient-to-b from-primary-500/10 to-transparent"
	>
		<div class="container mx-auto px-4 py-10">
			<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div class="max-w-2xl">
					<span
						class="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600-400"
					>
						<FileCode class="h-3.5 w-3.5" />
						REST API · OpenAPI 3.0
					</span>
					<h1 class="mb-3 text-4xl font-bold">API Documentation</h1>
					<p class="text-lg text-surface-600-400">
						Create test runs, report results, and manage test cases programmatically.
						Authenticate with an API key and integrate QA Studio into any CI/CD
						pipeline.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<a href="/settings?tab=api-keys" class="btn preset-filled-primary-500">
						<KeyRound class="h-4 w-4" />
						Get an API Key
					</a>
					<a href="/api/openapi" class="btn preset-outlined-surface-300-700" download>
						<Download class="h-4 w-4" />
						OpenAPI Spec
					</a>
				</div>
			</div>
		</div>
	</header>

	<div id="swagger-ui" class="container mx-auto px-4 py-4" bind:this={swaggerContainer}></div>
</div>

<style>
	/* Override Swagger UI styles for better integration */
	:global(#swagger-ui .swagger-ui .wrapper) {
		max-width: none;
		padding: 0;
	}

	:global(#swagger-ui .swagger-ui .information-container .info) {
		margin: 1.5rem 0;
	}

	:global(#swagger-ui .swagger-ui .info .title) {
		font-family: inherit;
	}

	/* Dark mode adjustments */
	:global([data-mode='dark'] #swagger-ui .swagger-ui) {
		background: #1a1a1a;
		color: #e5e5e5;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .info .title) {
		color: #fff;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .info .description) {
		color: #d1d1d1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock-tag) {
		color: #fff;
		border-bottom: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock .opblock-summary) {
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock .opblock-summary-description) {
		color: #d1d1d1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock .opblock-summary-path) {
		color: #e5e5e5;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .opblock-description-wrapper,
		[data-mode='dark'] #swagger-ui .swagger-ui .opblock-body
	) {
		background: #242424;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .model-box,
		[data-mode='dark'] #swagger-ui .swagger-ui .model,
		[data-mode='dark'] #swagger-ui .swagger-ui .responses-inner
	) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .model-title,
		[data-mode='dark'] #swagger-ui .swagger-ui .parameter__name,
		[data-mode='dark'] #swagger-ui .swagger-ui .response-col_status
	) {
		color: #fff;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .response-col_description) {
		color: #d1d1d1;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .scheme-container,
		[data-mode='dark'] #swagger-ui .swagger-ui .information-container
	) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui table thead tr th,
		[data-mode='dark'] #swagger-ui .swagger-ui table thead tr td
	) {
		color: #fff;
		border-color: #3a3a3a;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .parameter__type,
		[data-mode='dark'] #swagger-ui .swagger-ui .parameter__in
	) {
		color: #999;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .response-col_links) {
		color: #6b9bd1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .btn) {
		background: #3a3a3a;
		color: #fff;
		border-color: #4a4a4a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .btn:hover) {
		background: #4a4a4a;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui input[type='text'],
		[data-mode='dark'] #swagger-ui .swagger-ui textarea,
		[data-mode='dark'] #swagger-ui .swagger-ui select
	) {
		background: #2a2a2a;
		color: #e5e5e5;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .topbar) {
		background: #1a1a1a;
		border-bottom: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .topbar .download-url-input) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	/* Additional dark mode coverage for better readability */
	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock-tag-section) {
		background: #1a1a1a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .parameters-col_description) {
		color: #d1d1d1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .tab) {
		color: #d1d1d1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .tab.active) {
		color: #fff;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .renderedMarkdown,
		[data-mode='dark'] #swagger-ui .swagger-ui .renderedMarkdown p,
		[data-mode='dark'] #swagger-ui .swagger-ui .renderedMarkdown code
	) {
		color: #d1d1d1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui code) {
		background: #1a1a1a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui pre) {
		background: #1a1a1a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .highlight-code) {
		background: #1a1a1a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .microlight) {
		background: #1a1a1a;
		color: #e5e5e5;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .copy-to-clipboard) {
		background: #3a3a3a;
		color: #fff;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .copy-to-clipboard:hover) {
		background: #4a4a4a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .execute-wrapper) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .response) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .response .response-col_description__inner) {
		color: #d1d1d1;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .response-control-media-type__accept-message
	) {
		color: #999;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui table tbody tr) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui table tbody tr:hover) {
		background: #333;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui table tbody tr td) {
		color: #d1d1d1;
		border-color: #3a3a3a;
	}

	:global(
		[data-mode='dark'] #swagger-ui .swagger-ui .parameters,
		[data-mode='dark'] #swagger-ui .swagger-ui .parameters-col_description
	) {
		background: transparent;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .wrapper) {
		background: #1a1a1a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui section.models) {
		background: #1a1a1a;
		border: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui section.models h4) {
		color: #fff;
		border-bottom: 1px solid #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .model-container) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .prop-type) {
		color: #6b9bd1;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .prop-format) {
		color: #999;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock-section-header) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock-section-header h4) {
		color: #fff;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .opblock-section-header label) {
		color: #d1d1d1;
	}

	/* Fix for the Responses section */
	:global([data-mode='dark'] #swagger-ui .swagger-ui .responses-wrapper) {
		background: #242424;
	}

	:global(
		[data-mode='dark']
			#swagger-ui
			.swagger-ui
			.response-control-media-type--accept-controller
			select
	) {
		background: #2a2a2a;
		color: #e5e5e5;
		border-color: #3a3a3a;
	}

	/* JSON syntax highlighting in dark mode */
	:global([data-mode='dark'] #swagger-ui .swagger-ui .json .string) {
		color: #98c379;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .json .number) {
		color: #d19a66;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .json .boolean) {
		color: #d19a66;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .json .null) {
		color: #c678dd;
	}

	:global([data-mode='dark'] #swagger-ui .swagger-ui .json .key) {
		color: #61afef;
	}
</style>
