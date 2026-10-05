import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock } = vi.hoisted(() => ({
	createMock: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	OPENAI_SECRET_KEY: 'test-key'
}));

vi.mock('openai', () => {
	class OpenAI {
		chat = {
			completions: {
				create: createMock
			}
		};
	}

	return { default: OpenAI };
});

import { analyzeFailurePatterns, diagnoseFailedTest, summarizeTestRun } from './openai';

function completion(content: string | null, finishReason: string, reasoningTokens?: number) {
	return {
		choices: [
			{
				finish_reason: finishReason,
				message: { content }
			}
		],
		usage: {
			completion_tokens_details: {
				reasoning_tokens: reasoningTokens
			}
		}
	};
}

describe('OpenAI chat completions', () => {
	beforeEach(() => {
		createMock.mockReset();
	});

	it('returns visible content with room for reasoning tokens', async () => {
		createMock.mockResolvedValueOnce(completion('Shared timeout in checkout.', 'stop', 400));

		const analysis = await analyzeFailurePatterns({
			failures: [
				{
					testCaseTitle: 'Checkout submits the order',
					errorMessage: 'Timeout 30000ms exceeded',
					testType: 'E2E',
					suiteName: 'Checkout'
				}
			]
		});

		expect(analysis).toBe('Shared timeout in checkout.');
		expect(createMock).toHaveBeenCalledTimes(1);
		expect(createMock).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'gpt-5-mini',
				max_completion_tokens: 16000,
				reasoning_effort: 'low'
			})
		);
	});

	it('retries when reasoning consumes the token budget and content is empty', async () => {
		createMock
			.mockResolvedValueOnce(completion(null, 'length', 2000))
			.mockResolvedValueOnce(completion('Three failures share a stale locator.', 'stop', 20));

		const analysis = await analyzeFailurePatterns({
			failures: [
				{
					testCaseTitle: 'Login shows the dashboard',
					errorMessage: 'locator.click: Timeout',
					testType: 'E2E'
				}
			]
		});

		expect(analysis).toBe('Three failures share a stale locator.');
		expect(createMock).toHaveBeenCalledTimes(2);
		expect(createMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				max_completion_tokens: 16000,
				reasoning_effort: 'low'
			})
		);
		expect(createMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				max_completion_tokens: 32000,
				reasoning_effort: 'minimal'
			})
		);
	});

	it('does not retry a second time when the larger budget is also empty', async () => {
		createMock
			.mockResolvedValueOnce(completion('', 'length', 16000))
			.mockResolvedValueOnce(completion(null, 'length', 32000));

		await expect(
			analyzeFailurePatterns({
				failures: [{ testCaseTitle: 'Search returns results', testType: 'API' }]
			})
		).rejects.toThrow('Failed to analyze failure patterns');
		expect(createMock).toHaveBeenCalledTimes(2);
	});

	it('does not retry when the model stops without text for another reason', async () => {
		createMock.mockResolvedValueOnce(completion(null, 'content_filter'));

		await expect(
			summarizeTestRun({
				testRunName: 'Nightly',
				totalTests: 4,
				passed: 1,
				failed: 3,
				blocked: 0,
				skipped: 0,
				failedTests: []
			})
		).rejects.toThrow('Failed to generate AI summary');
		expect(createMock).toHaveBeenCalledTimes(1);
	});

	it('skips the API when there are no failures to analyze', async () => {
		await expect(analyzeFailurePatterns({ failures: [] })).resolves.toBe(
			'No failures to analyze.'
		);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('diagnoses a failed test from the completion content', async () => {
		createMock.mockResolvedValueOnce(completion('The button was not visible.', 'stop'));

		await expect(
			diagnoseFailedTest({
				testCaseTitle: 'Save profile',
				testType: 'UI',
				priority: 'HIGH',
				errorMessage: 'Element not found'
			})
		).resolves.toBe('The button was not visible.');
	});
});
