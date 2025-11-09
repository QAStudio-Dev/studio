<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let swaggerContainer: HTMLDivElement;

	onMount(async () => {
		if (browser) {
			// Dynamically import Swagger UI for browser only
			const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-bundle.js')).default;
			const SwaggerUIStandalonePreset = (await import('swagger-ui-dist/swagger-ui-standalone-preset.js')).default;

			// Initialize Swagger UI
			SwaggerUIBundle({
				url: '/api/openapi',
				dom_id: '#swagger-ui',
				deepLinking: true,
				presets: [
					SwaggerUIBundle.presets.apis,
					SwaggerUIStandalonePreset
				],
				plugins: [
					SwaggerUIBundle.plugins.DownloadUrl
				],
				layout: 'StandaloneLayout',
				displayRequestDuration: true,
				filter: true,
				tryItOutEnabled: true,
				persistAuthorization: true
			});
		}
	});
</script>

<svelte:head>
	<title>API Documentation - QA Studio</title>
	<meta
		name="description"
		content="Interactive REST API documentation for QA Studio test management platform"
	/>
	<link
		rel="stylesheet"
		href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css"
	/>
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
		filter: invert(1) hue-rotate(180deg);
	}

	:global(.dark #swagger-ui .swagger-ui img) {
		filter: invert(1) hue-rotate(180deg);
	}
</style>
