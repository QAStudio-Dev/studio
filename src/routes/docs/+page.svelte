<script lang="ts">
	import { apiDocumentation, type ApiEndpoint, type HttpMethod } from '$lib/api-docs';
	import { Accordion } from '@skeletonlabs/skeleton-svelte';
	import CodeBlock from '$lib/components/CodeBlock.svelte';

	let selectedSection = $state('Projects');

	function getMethodColor(method: HttpMethod): string {
		const colors = {
			GET: 'bg-blue-500 dark:bg-blue-600',
			POST: 'bg-green-500 dark:bg-green-600',
			PATCH: 'bg-yellow-500 dark:bg-yellow-600',
			DELETE: 'bg-red-500 dark:bg-red-600'
		};
		return colors[method];
	}

	function getMethodTextColor(method: HttpMethod): string {
		const colors = {
			GET: 'text-blue-700 dark:text-blue-300',
			POST: 'text-green-700 dark:text-green-300',
			PATCH: 'text-yellow-700 dark:text-yellow-300',
			DELETE: 'text-red-700 dark:text-red-300'
		};
		return colors[method];
	}

	function scrollToSection(sectionTitle: string) {
		selectedSection = sectionTitle;
		const element = document.getElementById(sectionTitle.toLowerCase().replace(/\s+/g, '-'));
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<svelte:head>
	<title>API Documentation - QA Studio</title>
	<meta
		name="description"
		content="Complete REST API documentation for QA Studio test management platform"
	/>
</svelte:head>

<div class="min-h-screen bg-surface-50-950">
	<!-- Header -->
	<header
		class="sticky top-0 z-20 border-b border-surface-300-700 bg-surface-100-900 backdrop-blur"
	>
		<div class="container mx-auto px-4 py-6">
			<h1 class="text-3xl font-bold">QA Studio API Documentation</h1>
			<p class="mt-2 text-surface-600-400">
				Complete REST API reference for test management and reporting
			</p>
		</div>
	</header>

	<div class="container mx-auto px-4 py-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
			<!-- Sidebar Navigation -->
			<aside class="h-fit lg:sticky lg:top-24">
				<div class="card rounded-container p-4">
					<h2 class="mb-4 text-lg font-semibold">Endpoints</h2>
					<nav class="space-y-2">
						{#each apiDocumentation as section}
							<button
								onclick={() => scrollToSection(section.title)}
								class="w-full rounded-base px-3 py-2 text-left transition-colors {selectedSection ===
								section.title
									? 'bg-primary-500 text-white'
									: 'hover:bg-surface-200-800'}"
							>
								{section.title}
							</button>
						{/each}
					</nav>

					<!-- Base URL Info -->
					<div class="mt-6 border-t border-surface-300-700 pt-6">
						<h3 class="mb-2 text-sm font-semibold">Base URL</h3>
						<code class="block rounded-base bg-surface-900-100 p-2 text-xs break-all">
							https://your-domain.com
						</code>
					</div>

					<div class="mt-4">
						<h3 class="mb-2 text-sm font-semibold">Authentication</h3>
						<p class="text-xs text-surface-600-400">
							Currently no authentication required. Future versions will support API keys.
						</p>
					</div>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="space-y-12">
				{#each apiDocumentation as section}
					<section id={section.title.toLowerCase().replace(/\s+/g, '-')}>
						<div class="mb-6">
							<h2 class="mb-2 text-2xl font-bold">{section.title}</h2>
							<p class="text-surface-600-400">{section.description}</p>
						</div>

						<div class="space-y-6">
							{#each section.endpoints as endpoint, i}
								<div class="overflow-hidden card rounded-container">
									<!-- Endpoint Header -->
									<div class="border-b border-surface-300-700 bg-surface-100-900 px-6 py-4">
										<div class="flex flex-wrap items-center gap-3">
											<span
												class="rounded-base px-3 py-1 text-sm font-bold text-white {getMethodColor(
													endpoint.method
												)}"
											>
												{endpoint.method}
											</span>
											<code class="font-mono text-sm {getMethodTextColor(endpoint.method)}">
												{endpoint.path}
											</code>
										</div>
										<p class="mt-3 text-sm text-surface-700-300">
											{endpoint.description}
										</p>
									</div>

									<div class="space-y-6 p-6">
										<!-- Parameters -->
										{#if endpoint.parameters && endpoint.parameters.length > 0}
											<div>
												<h4 class="mb-3 font-semibold">Parameters</h4>
												<div class="overflow-x-auto">
													<table class="w-full text-sm">
														<thead class="bg-surface-100-900">
															<tr>
																<th class="px-4 py-2 text-left">Name</th>
																<th class="px-4 py-2 text-left">Type</th>
																<th class="px-4 py-2 text-left">Required</th>
																<th class="px-4 py-2 text-left">Description</th>
															</tr>
														</thead>
														<tbody class="divide-y divide-surface-300-700">
															{#each endpoint.parameters as param}
																<tr>
																	<td class="px-4 py-2">
																		<code class="text-xs">{param.name}</code>
																	</td>
																	<td class="px-4 py-2">
																		<span class="rounded-base bg-surface-200-800 px-2 py-1 text-xs">
																			{param.type}
																		</span>
																	</td>
																	<td class="px-4 py-2">
																		{#if param.required}
																			<span
																				class="rounded-base bg-red-500 px-2 py-1 text-xs text-white"
																			>
																				Yes
																			</span>
																		{:else}
																			<span
																				class="rounded-base bg-surface-200-800 px-2 py-1 text-xs"
																			>
																				No
																			</span>
																		{/if}
																	</td>
																	<td class="px-4 py-2 text-surface-600-400">
																		{param.description}
																	</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											</div>
										{/if}

										<!-- Request Body -->
										{#if endpoint.requestBody}
											<div>
												<div class="mb-3 flex items-center justify-between">
													<h4 class="font-semibold">Request Body</h4>
													<span class="text-xs text-surface-600-400">
														{endpoint.requestBody.contentType}
													</span>
												</div>
												<CodeBlock
													code={endpoint.requestBody.example}
													language="json"
													id={`req-${section.title}-${i}`}
												/>
											</div>
										{/if}

										<!-- Responses -->
										<div>
											<h4 class="mb-3 font-semibold">Responses</h4>
											<Accordion>
												{#each endpoint.responses as response, respIdx}
													<Accordion.Item value={`${section.title}-${i}-${respIdx}`}>
														<Accordion.ItemTrigger
															class="rounded-base bg-surface-100-900 px-4 py-3 transition-colors hover:bg-surface-200-800"
														>
															<div class="flex items-center gap-3">
																<span
																	class="rounded-base px-2 py-1 text-xs font-bold {response.status >=
																		200 && response.status < 300
																		? 'bg-green-500 text-white'
																		: response.status >= 400
																			? 'bg-red-500 text-white'
																			: 'bg-surface-300-700'}"
																>
																	{response.status}
																</span>
																<span class="text-sm">{response.description}</span>
															</div>
														</Accordion.ItemTrigger>
														<Accordion.ItemContent class="px-4 py-3">
															<CodeBlock
																code={response.example}
																language="json"
																id={`res-${section.title}-${i}-${respIdx}`}
															/>
														</Accordion.ItemContent>
													</Accordion.Item>
												{/each}
											</Accordion>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}

				<!-- Getting Started Section -->
				<section class="card rounded-container border border-primary-200-800 bg-primary-50-950 p-6">
					<h2 class="mb-4 text-xl font-bold">Getting Started</h2>
					<div class="space-y-4 text-sm">
						<div>
							<h3 class="mb-2 font-semibold">Making Your First Request</h3>
							<CodeBlock
								code={`// Fetch all projects
fetch('https://your-domain.com/api/projects')
  .then(res => res.json())
  .then(data => console.log(data));`}
								language="javascript"
								id="example-1"
							/>
						</div>
						<div>
							<h3 class="mb-2 font-semibold">Creating a Test Result</h3>
							<CodeBlock
								code={`// Submit test result
fetch('https://your-domain.com/api/projects/PROJECT_ID/test-runs/RUN_ID/results', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    testCaseId: 'TEST_CASE_ID',
    status: 'PASSED',
    duration: 5000
  })
}).then(res => res.json());`}
								language="javascript"
								id="example-2"
							/>
						</div>
					</div>
				</section>
			</main>
		</div>
	</div>
</div>
