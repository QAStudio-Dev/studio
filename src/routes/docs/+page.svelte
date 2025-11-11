<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let swaggerContainer: HTMLDivElement;

	onMount(() => {
		if (browser) {
			// Dynamically import and initialize Swagger UI
			(async () => {
				// @ts-expect-error - swagger-ui-dist doesn't have type definitions
				const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-bundle.js')).default;
				const SwaggerUIStandalonePreset = (
					await import('swagger-ui-dist/swagger-ui-standalone-preset.js')
				).default;

				// Check if dark mode is active using data-mode attribute
				let isDarkMode = document.documentElement.getAttribute('data-mode') === 'dark';

				// Initialize Swagger UI with dynamic theme
				SwaggerUIBundle({
					url: '/api/openapi',
					dom_id: '#swagger-ui',
					deepLinking: true,
					presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
					plugins: [SwaggerUIBundle.plugins.DownloadUrl],
					layout: 'StandaloneLayout',
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
							const newIsDarkMode = document.documentElement.getAttribute('data-mode') === 'dark';
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
	<title>API Documentation - QA Studio</title>
	<meta
		name="description"
		content="Interactive REST API documentation for QA Studio test management platform"
	/>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
	{#if browser && document.documentElement.getAttribute('data-mode') === 'dark'}
		<link rel="stylesheet" href="/SwaggerDark.css" />
	{/if}
</svelte:head>

<div class="min-h-screen bg-surface-50-950">
	<!-- Header -->
	<header class="border-b border-surface-300-700 bg-surface-100-900">
		<div class="container mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold">QA Studio API Documentation</h1>
					<p class="mt-2 text-surface-600-400">
						Interactive REST API reference for test management and reporting
					</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Swagger UI Container -->
	<div id="swagger-ui" bind:this={swaggerContainer}></div>
</div>

<style>
	/* Override Swagger UI styles for better integration */
	:global(#swagger-ui) {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	/* Dark mode adjustments */
	:global(.dark #swagger-ui .swagger-ui) {
		background: #1a1a1a;
		color: #e5e5e5;
	}

	:global(.dark #swagger-ui .swagger-ui .info .title) {
		color: #fff;
	}

	:global(.dark #swagger-ui .swagger-ui .info .description) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock-tag) {
		color: #fff;
		border-bottom: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock .opblock-summary) {
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock .opblock-summary-description) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock .opblock-summary-path) {
		color: #e5e5e5;
	}

	:global(
		.dark #swagger-ui .swagger-ui .opblock-description-wrapper,
		.dark #swagger-ui .swagger-ui .opblock-body
	) {
		background: #242424;
	}

	:global(
		.dark #swagger-ui .swagger-ui .model-box,
		.dark #swagger-ui .swagger-ui .model,
		.dark #swagger-ui .swagger-ui .responses-inner
	) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(
		.dark #swagger-ui .swagger-ui .model-title,
		.dark #swagger-ui .swagger-ui .parameter__name,
		.dark #swagger-ui .swagger-ui .response-col_status
	) {
		color: #fff;
	}

	:global(.dark #swagger-ui .swagger-ui .response-col_description) {
		color: #d1d1d1;
	}

	:global(
		.dark #swagger-ui .swagger-ui .scheme-container,
		.dark #swagger-ui .swagger-ui .information-container
	) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(
		.dark #swagger-ui .swagger-ui table thead tr th,
		.dark #swagger-ui .swagger-ui table thead tr td
	) {
		color: #fff;
		border-color: #3a3a3a;
	}

	:global(
		.dark #swagger-ui .swagger-ui .parameter__type,
		.dark #swagger-ui .swagger-ui .parameter__in
	) {
		color: #999;
	}

	:global(.dark #swagger-ui .swagger-ui .response-col_links) {
		color: #6b9bd1;
	}

	:global(.dark #swagger-ui .swagger-ui .btn) {
		background: #3a3a3a;
		color: #fff;
		border-color: #4a4a4a;
	}

	:global(.dark #swagger-ui .swagger-ui .btn:hover) {
		background: #4a4a4a;
	}

	:global(
		.dark #swagger-ui .swagger-ui input[type='text'],
		.dark #swagger-ui .swagger-ui textarea,
		.dark #swagger-ui .swagger-ui select
	) {
		background: #2a2a2a;
		color: #e5e5e5;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .topbar) {
		background: #1a1a1a;
		border-bottom: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .topbar .download-url-input) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	/* Additional dark mode coverage for better readability */
	:global(.dark #swagger-ui .swagger-ui .opblock-tag-section) {
		background: #1a1a1a;
	}

	:global(.dark #swagger-ui .swagger-ui .parameters-col_description) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui .tab) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui .tab.active) {
		color: #fff;
	}

	:global(
		.dark #swagger-ui .swagger-ui .renderedMarkdown,
		.dark #swagger-ui .swagger-ui .renderedMarkdown p,
		.dark #swagger-ui .swagger-ui .renderedMarkdown code
	) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui code) {
		background: #1a1a1a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui pre) {
		background: #1a1a1a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .highlight-code) {
		background: #1a1a1a;
	}

	:global(.dark #swagger-ui .swagger-ui .microlight) {
		background: #1a1a1a;
		color: #e5e5e5;
	}

	:global(.dark #swagger-ui .swagger-ui .copy-to-clipboard) {
		background: #3a3a3a;
		color: #fff;
	}

	:global(.dark #swagger-ui .swagger-ui .copy-to-clipboard:hover) {
		background: #4a4a4a;
	}

	:global(.dark #swagger-ui .swagger-ui .execute-wrapper) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .response) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .response .response-col_description__inner) {
		color: #d1d1d1;
	}

	:global(.dark #swagger-ui .swagger-ui .response-control-media-type__accept-message) {
		color: #999;
	}

	:global(.dark #swagger-ui .swagger-ui table tbody tr) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui table tbody tr:hover) {
		background: #333;
	}

	:global(.dark #swagger-ui .swagger-ui table tbody tr td) {
		color: #d1d1d1;
		border-color: #3a3a3a;
	}

	:global(
		.dark #swagger-ui .swagger-ui .parameters,
		.dark #swagger-ui .swagger-ui .parameters-col_description
	) {
		background: transparent;
	}

	:global(.dark #swagger-ui .swagger-ui .wrapper) {
		background: #1a1a1a;
	}

	:global(.dark #swagger-ui .swagger-ui section.models) {
		background: #1a1a1a;
		border: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui section.models h4) {
		color: #fff;
		border-bottom: 1px solid #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .model-container) {
		background: #2a2a2a;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .prop-type) {
		color: #6b9bd1;
	}

	:global(.dark #swagger-ui .swagger-ui .prop-format) {
		color: #999;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock-section-header) {
		background: #242424;
		border-color: #3a3a3a;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock-section-header h4) {
		color: #fff;
	}

	:global(.dark #swagger-ui .swagger-ui .opblock-section-header label) {
		color: #d1d1d1;
	}

	/* Fix for the Responses section */
	:global(.dark #swagger-ui .swagger-ui .responses-wrapper) {
		background: #242424;
	}

	:global(.dark #swagger-ui .swagger-ui .response-control-media-type--accept-controller select) {
		background: #2a2a2a;
		color: #e5e5e5;
		border-color: #3a3a3a;
	}

	/* JSON syntax highlighting in dark mode */
	:global(.dark #swagger-ui .swagger-ui .json .string) {
		color: #98c379;
	}

	:global(.dark #swagger-ui .swagger-ui .json .number) {
		color: #d19a66;
	}

	:global(.dark #swagger-ui .swagger-ui .json .boolean) {
		color: #d19a66;
	}

	:global(.dark #swagger-ui .swagger-ui .json .null) {
		color: #c678dd;
	}

	:global(.dark #swagger-ui .swagger-ui .json .key) {
		color: #61afef;
	}
</style>
