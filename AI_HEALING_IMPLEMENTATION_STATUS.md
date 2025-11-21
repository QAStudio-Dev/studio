# AI Trace Analysis & Healing Feature - Implementation Status

## Overview

AI-powered trace analysis system that analyzes Playwright test failure traces and provides actionable fix suggestions.

## ✅ Completed

### 1. Database Schema (Prisma)

- ✅ Added `TestResultAnalysis` model
- ✅ Added `AnalysisCategory` enum (STALE_LOCATOR, TIMING_ISSUE, NETWORK_ERROR, etc.)
- ✅ Added AI usage tracking to `Subscription` model:
    - `aiAnalysisCount`: Current month usage
    - `aiAnalysisResetAt`: When counter was last reset
- ✅ Migration applied: `20251121204118_add_ai_trace_analysis`

### 2. Core Analysis Library (`src/lib/server/trace-analyzer.ts`)

- ✅ `extractTraceData()`: Extracts trace.json from zip
- ✅ `buildAnalysisContext()`: Builds context from trace + test result
- ✅ `analyzeWithAI()`: Sends context to OpenAI GPT-4 for analysis
- ✅ `analyzeTrace()`: Main orchestration function
- ✅ Comprehensive system prompt with patterns for all failure categories
- ✅ Example fix code for each category type

### 3. API Endpoint (`src/routes/api/test-results/[id]/analyze-trace/+server.ts`)

- ✅ POST endpoint for analyzing traces
- ✅ Authentication & authorization checks
- ✅ Quota enforcement (10 free, unlimited pro)
- ✅ Monthly usage tracking with automatic reset
- ✅ Caching (returns existing analysis if already done)
- ✅ Error handling for various failure scenarios
- ✅ Response includes quota remaining info

### 4. Dependencies

- ✅ Installed `adm-zip` for zip file extraction
- ✅ Installed `openai` for AI analysis
- ✅ Installed `@types/adm-zip` for TypeScript support

## 🚧 TODO: Remaining Implementation

### 5. Frontend Components

#### A. Test Result Analysis Button

**File**: `src/routes/projects/[projectId]/runs/[runId]/+page.svelte`

```svelte
<script lang="ts">
	import { Button, Spinner, Alert } from '@skeletonlabs/skeleton-svelte';

	let analyzing = false;
	let analysis: any = null;
	let error = '';

	async function analyzeFailure(testResultId: string) {
		analyzing = true;
		error = '';

		try {
			const response = await fetch(`/api/test-results/${testResultId}/analyze-trace`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Analysis failed';
				return;
			}

			const data = await response.json();
			analysis = data.analysis;

			// Show success toast
			toastStore.trigger({
				message: `Analysis complete! ${data.cached ? '(Cached)' : ''}`,
				background: 'variant-filled-success'
			});
		} catch (err: any) {
			error = err.message;
		} finally {
			analyzing = false;
		}
	}
</script>

{#if testResult.status === 'FAILED' && hasTraceAttachment}
	<div class="analysis-section">
		<Button
			onclick={() => analyzeFailure(testResult.id)}
			disabled={analyzing}
			class="preset-filled"
		>
			{#if analyzing}
				<Spinner size="sm" />
				Analyzing with AI...
			{:else}
				🤖 Analyze Failure
			{/if}
		</Button>

		{#if analysis}
			<div class="analysis-result mt-4">
				<!-- Display analysis here -->
			</div>
		{/if}

		{#if error}
			<Alert variant="error">{error}</Alert>
		{/if}
	</div>
{/if}
```

#### B. Analysis Display Component

**File**: `src/lib/components/TestAnalysisDisplay.svelte`

```svelte
<script lang="ts">
	import { Badge, Button, Code } from '@skeletonlabs/skeleton-svelte';
	import type { AnalysisCategory } from '@prisma/client';

	export let analysis: {
		rootCause: string;
		category: AnalysisCategory;
		suggestedFix: string;
		fixCode?: string;
		confidence: number;
		additionalNotes?: string;
	};

	function getCategoryColor(category: AnalysisCategory) {
		const colors = {
			STALE_LOCATOR: 'warning',
			TIMING_ISSUE: 'tertiary',
			NETWORK_ERROR: 'error',
			ASSERTION_FAILURE: 'secondary',
			DATA_ISSUE: 'primary',
			ENVIRONMENT_ISSUE: 'warning',
			CONFIGURATION_ERROR: 'error',
			OTHER: 'surface'
		};
		return colors[category] || 'surface';
	}

	function getCategoryIcon(category: AnalysisCategory) {
		const icons = {
			STALE_LOCATOR: '🔍',
			TIMING_ISSUE: '⏱️',
			NETWORK_ERROR: '🌐',
			ASSERTION_FAILURE: '✅',
			DATA_ISSUE: '📊',
			ENVIRONMENT_ISSUE: '🖥️',
			CONFIGURATION_ERROR: '⚙️',
			OTHER: '🔧'
		};
		return icons[category] || '🔧';
	}

	async function copyCode() {
		if (analysis.fixCode) {
			await navigator.clipboard.writeText(analysis.fixCode);
			// Show toast
		}
	}
</script>

<div class="space-y-4 card rounded-container p-6">
	<div class="flex items-center justify-between">
		<h3 class="h3">AI Analysis</h3>
		<Badge variant="filled-{getCategoryColor(analysis.category)}">
			{getCategoryIcon(analysis.category)}
			{analysis.category.replace('_', ' ')}
		</Badge>
	</div>

	<div class="space-y-2">
		<h4 class="h4">Root Cause</h4>
		<p class="text-surface-600-300">{analysis.rootCause}</p>
	</div>

	<div class="space-y-2">
		<h4 class="h4">Suggested Fix</h4>
		<p>{analysis.suggestedFix}</p>
	</div>

	{#if analysis.fixCode}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h4 class="h4">Fix Code</h4>
				<Button size="sm" variant="ghost" onclick={copyCode}>📋 Copy</Button>
			</div>
			<Code lang="typescript" code={analysis.fixCode} />
		</div>
	{/if}

	<div class="flex items-center gap-2">
		<span class="text-sm">Confidence:</span>
		<div class="flex-1">
			<progress class="progress" value={analysis.confidence} max="1" />
		</div>
		<span class="text-sm">{Math.round(analysis.confidence * 100)}%</span>
	</div>

	{#if analysis.additionalNotes}
		<Alert variant="ghost">
			<strong>Note:</strong>
			{analysis.additionalNotes}
		</Alert>
	{/if}
</div>
```

### 6. Healing Dashboard

**File**: `src/routes/projects/[projectId]/healing/+page.svelte`

Shows aggregate healing insights:

- Total failures analyzed
- Category breakdown (pie chart)
- Most problematic tests
- Average confidence scores
- Time saved estimates

**File**: `src/routes/projects/[projectId]/healing/+page.server.ts`

```typescript
export const load = async ({ params, locals }) => {
	const userId = requireAuth(locals);
	const projectId = params.projectId;

	// Get all analyses for this project
	const analyses = await db.testResultAnalysis.findMany({
		where: {
			testResult: {
				testCase: {
					projectId
				}
			}
		},
		include: {
			testResult: {
				include: {
					testCase: true
				}
			}
		}
	});

	// Calculate statistics
	const stats = {
		totalAnalyzed: analyses.length,
		categoriesBreakdown: groupBy(analyses, 'category'),
		avgConfidence: avg(analyses.map((a) => a.confidence)),
		mostProblematicTests: getMostProblematicTests(analyses),
		fixesApplied: analyses.filter((a) => a.wasFixed).length
	};

	return { stats };
};
```

### 7. Automatic Analysis Cron Job

**File**: `src/routes/api/cron/analyze-failures/+server.ts`

```typescript
export const GET: RequestHandler = async ({ request }) => {
	// Verify cron secret
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Find recent failed tests with traces that haven't been analyzed
	const unanalyzedFailures = await db.testResult.findMany({
		where: {
			status: 'FAILED',
			createdAt: {
				gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
			},
			attachments: {
				some: {
					mimeType: 'application/zip',
					originalName: { contains: 'trace' }
				}
			},
			analysis: null
		},
		take: 10, // Process 10 at a time
		include: {
			testCase: {
				include: {
					project: {
						include: {
							team: {
								include: {
									subscription: true
								}
							}
						}
					}
				}
			},
			attachments: true,
			steps: true
		}
	});

	const results = [];

	for (const failure of unanalyzedFailures) {
		try {
			// Check quota
			const team = failure.testCase.project.team;
			if (!team) continue;

			const quotaCheck = await checkAIAnalysisQuota(team.id, team.subscription);

			if (!quotaCheck.allowed) {
				console.log(`Skipping ${failure.id} - quota exceeded for team ${team.id}`);
				continue;
			}

			// Download trace and analyze
			const traceAttachment = failure.attachments.find(
				(a) => a.mimeType === 'application/zip' && a.originalName.includes('trace')
			);

			if (!traceAttachment) continue;

			const traceResponse = await fetch(traceAttachment.url);
			const traceBuffer = Buffer.from(await traceResponse.arrayBuffer());

			const analysis = await analyzeTrace(traceBuffer, {
				...failure,
				testStepResults: failure.steps
			});

			// Save analysis
			await db.testResultAnalysis.create({
				data: {
					testResultId: failure.id,
					analysisType: 'AI_TRACE_ANALYSIS',
					rootCause: analysis.rootCause,
					category: analysis.category,
					suggestedFix: analysis.suggestedFix,
					fixCode: analysis.fixCode,
					confidence: analysis.confidence,
					additionalNotes: analysis.additionalNotes,
					analyzedBy: 'ai-cron'
				}
			});

			// Increment usage
			await incrementAIAnalysisUsage(team.id, team.subscription);

			results.push({
				testResultId: failure.id,
				success: true
			});
		} catch (error: any) {
			results.push({
				testResultId: failure.id,
				success: false,
				error: error.message
			});
		}
	}

	return json({
		analyzed: results.length,
		results
	});
};
```

**Update**: `vercel.json`

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-attachments",
			"schedule": "0 2 * * *"
		},
		{
			"path": "/api/cron/analyze-failures",
			"schedule": "0 */6 * * *"
		}
	]
}
```

### 8. API Documentation

Add to `src/lib/api-docs.ts`:

```typescript
{
  id: 'analyze-trace',
  title: 'Analyze Test Failure Trace',
  method: 'POST',
  path: '/api/test-results/{id}/analyze-trace',
  description: 'Analyze a Playwright trace file using AI to diagnose test failures and suggest fixes.',
  category: 'AI Features',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      type: 'string',
      description: 'Test result ID'
    }
  ],
  requestBody: null,
  responses: [
    {
      status: 200,
      description: 'Analysis successful',
      example: {
        analysis: {
          id: 'anal_abc123',
          rootCause: 'Element selector #submit-btn no longer exists in the DOM',
          category: 'STALE_LOCATOR',
          suggestedFix: 'Use a more stable selector like getByRole or add a data-testid attribute',
          fixCode: "await page.getByRole('button', { name: 'Submit' }).click();",
          confidence: 0.92,
          analyzedAt: '2025-01-21T10:30:00Z'
        },
        cached: false,
        quotaRemaining: 7
      }
    },
    {
      status: 404,
      description: 'Test result or trace file not found',
      example: { error: 'No trace file found for this test result' }
    },
    {
      status: 429,
      description: 'Quota exceeded',
      example: {
        error: 'AI analysis quota exceeded',
        message: 'Free tier limit of 10 AI analyses per month exceeded.',
        limit: 10,
        used: 10
      }
    }
  ]
}
```

### 9. Environment Variables

Add to `.env.example`:

```env
# OpenAI API Key for AI trace analysis
OPENAI_API_KEY=sk-...
```

### 10. Pricing Page Updates

**File**: `src/routes/+page.svelte`

Update pricing cards:

```svelte
<div class="feature-item">
	<CheckIcon /> AI Failure Analysis: 10/month
</div>

<!-- Pro plan -->
<div class="feature-item">
	<CheckIcon /> AI Failure Analysis: Unlimited
</div>
```

## Testing Checklist

- [ ] Test with valid trace.zip file
- [ ] Test with invalid/corrupted trace
- [ ] Test quota enforcement (free tier)
- [ ] Test quota reset at month boundary
- [ ] Test with no trace attachment
- [ ] Test cached analysis return
- [ ] Test all failure categories
- [ ] Test confidence scoring
- [ ] Test fix code generation
- [ ] Test authorization (wrong user/team)
- [ ] Test cron job automatic analysis

## Deployment Steps

1. ✅ Database migration already applied
2. Add `OPENAI_API_KEY` to environment variables (Vercel)
3. Deploy backend changes
4. Test API endpoint with Postman/curl
5. Deploy frontend components
6. Update vercel.json with cron schedule
7. Monitor OpenAI API usage & costs
8. Update documentation site

## Cost Estimates

### OpenAI API Costs

- **GPT-4 Turbo**: ~$0.01-0.03 per analysis
- **Expected usage**: 1000 analyses/month
- **Monthly cost**: ~$10-30

### Pricing Strategy

- **Free**: 10 analyses/month
- **Pro** ($49/mo): Unlimited analyses
- **Break-even**: ~50-100 analyses/month per user

## Future Enhancements

1. **Auto-fix PR Creation**: Generate PRs with fixes automatically
2. **Pattern Detection**: Detect repeated failures across tests
3. **Test Flakiness Tracking**: Identify flaky tests from analysis patterns
4. **Custom Analysis Rules**: Allow teams to add custom failure patterns
5. **Integration with GitHub Issues**: Auto-create issues for failures
6. **Batch Analysis**: Analyze multiple failures at once
7. **Analysis History**: Track how fixes improved test stability
8. **ML Model Training**: Train custom model on team's specific failures

## Notes

- All AI analysis is cached - same test result won't be re-analyzed
- Quota resets monthly (calendar month)
- Pro users get unlimited analyses
- Traces must be uploaded as attachments (application/zip mime type)
- Analysis works best with Playwright traces (has expected structure)
- System prompt is comprehensive and handles all common failure types
