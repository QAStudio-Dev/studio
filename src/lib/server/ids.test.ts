import { describe, it, expect } from 'vitest';
import {
	generateProjectId,
	generateTestRunId,
	generateTestCaseId,
	generateTestResultId,
	generateTestSuiteId,
	generateEnvironmentId,
	generateMilestoneId,
	generateAttachmentId,
	generateTeamId,
	generateUserId
} from './ids';

describe('ID Generators', () => {
	describe('ID Format Validation', () => {
		it('should generate project IDs with correct length (8 chars)', () => {
			const id = generateProjectId();
			expect(id).toHaveLength(8);
		});

		it('should generate test run IDs with correct length (4 chars)', () => {
			const id = generateTestRunId();
			expect(id).toHaveLength(4);
		});

		it('should generate test case IDs with correct length (3 chars)', () => {
			const id = generateTestCaseId();
			expect(id).toHaveLength(3);
		});

		it('should generate test result IDs with correct length (4 chars)', () => {
			const id = generateTestResultId();
			expect(id).toHaveLength(4);
		});

		it('should generate test suite IDs with correct length (4 chars)', () => {
			const id = generateTestSuiteId();
			expect(id).toHaveLength(4);
		});

		it('should generate environment IDs with correct length (3 chars)', () => {
			const id = generateEnvironmentId();
			expect(id).toHaveLength(3);
		});

		it('should generate milestone IDs with correct length (3 chars)', () => {
			const id = generateMilestoneId();
			expect(id).toHaveLength(3);
		});

		it('should generate attachment IDs with correct length (4 chars)', () => {
			const id = generateAttachmentId();
			expect(id).toHaveLength(4);
		});

		it('should generate team IDs with correct length (6 chars)', () => {
			const id = generateTeamId();
			expect(id).toHaveLength(6);
		});

		it('should generate user IDs with correct length (6 chars)', () => {
			const id = generateUserId();
			expect(id).toHaveLength(6);
		});
	});

	describe('ID Character Set', () => {
		const alphanumericRegex = /^[0-9A-Za-z]+$/;

		it('should generate project IDs with only alphanumeric characters', () => {
			const id = generateProjectId();
			expect(id).toMatch(alphanumericRegex);
		});

		it('should generate test run IDs with only alphanumeric characters', () => {
			const id = generateTestRunId();
			expect(id).toMatch(alphanumericRegex);
		});

		it('should generate test case IDs with only alphanumeric characters', () => {
			const id = generateTestCaseId();
			expect(id).toMatch(alphanumericRegex);
		});

		it('should generate attachment IDs with only alphanumeric characters', () => {
			const id = generateAttachmentId();
			expect(id).toMatch(alphanumericRegex);
		});

		it('should not contain special characters or symbols', () => {
			// Generate multiple IDs to increase confidence
			for (let i = 0; i < 100; i++) {
				const id = generateProjectId();
				expect(id).not.toMatch(/[^0-9A-Za-z]/);
			}
		});

		it('should be URL-safe (no need for encoding)', () => {
			const id = generateProjectId();
			const encoded = encodeURIComponent(id);
			expect(encoded).toBe(id); // Should not need encoding
		});
	});

	describe('ID Uniqueness', () => {
		it('should generate unique project IDs', () => {
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateProjectId());
			}

			expect(ids.size).toBe(iterations);
		});

		it('should generate unique test run IDs', () => {
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateTestRunId());
			}

			expect(ids.size).toBe(iterations);
		});

		it('should generate unique test case IDs (with allowance for rare collisions)', () => {
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateTestCaseId());
			}

			// 3-char IDs have 238k combinations, so some collisions are statistically possible
			// Expect at least 99% uniqueness in 1000 generations
			expect(ids.size).toBeGreaterThanOrEqual(iterations * 0.99);
		});

		it('should generate unique attachment IDs (with allowance for rare collisions)', () => {
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateAttachmentId());
			}

			// 4-char IDs have 14.7M combinations, collisions are rare but possible
			// Expect at least 99% uniqueness
			expect(ids.size).toBeGreaterThanOrEqual(iterations * 0.99);
		});

		it('should handle concurrent ID generation without collisions', () => {
			const ids = new Set();
			const iterations = 1000;

			// Generate IDs in parallel
			const promises = Array.from({ length: iterations }, () =>
				Promise.resolve(generateProjectId())
			);

			return Promise.all(promises).then((generatedIds) => {
				generatedIds.forEach((id) => ids.add(id));
				expect(ids.size).toBe(iterations);
			});
		});
	});

	describe('Collision Probability', () => {
		it('should have extremely low collision probability for project IDs (8 chars)', () => {
			// 62^8 = 218 trillion combinations
			// Testing with 10,000 IDs should have virtually 0% collision rate
			const ids = new Set();
			const iterations = 10000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateProjectId());
			}

			expect(ids.size).toBe(iterations);
		});

		it('should have low collision probability for test run IDs (4 chars)', () => {
			// 62^4 = 14.7 million combinations
			// Testing with 5,000 IDs should have very low collision rate
			// But birthday paradox means some collisions are statistically possible
			const ids = new Set();
			const iterations = 5000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateTestRunId());
			}

			// Expect at least 99.5% uniqueness
			expect(ids.size).toBeGreaterThanOrEqual(iterations * 0.995);
		});

		it('should have acceptable collision probability for test case IDs (3 chars)', () => {
			// 62^3 = 238k combinations
			// Testing with 1,000 IDs should have low collision rate
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				ids.add(generateTestCaseId());
			}

			// Allow for potential collisions with 3 char IDs, but expect > 95% uniqueness
			expect(ids.size).toBeGreaterThan(iterations * 0.95);
		});
	});

	describe('Performance', () => {
		it('should generate project IDs quickly (< 1ms per ID)', () => {
			const start = performance.now();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				generateProjectId();
			}

			const elapsed = performance.now() - start;
			const avgTime = elapsed / iterations;

			expect(avgTime).toBeLessThan(1); // Should be well under 1ms per ID
		});

		it('should generate 10,000 IDs in reasonable time', () => {
			const start = performance.now();
			const iterations = 10000;

			for (let i = 0; i < iterations; i++) {
				generateProjectId();
			}

			const elapsed = performance.now() - start;

			expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
		});
	});

	describe('Consistency', () => {
		it('should always return string type', () => {
			expect(typeof generateProjectId()).toBe('string');
			expect(typeof generateTestRunId()).toBe('string');
			expect(typeof generateTestCaseId()).toBe('string');
			expect(typeof generateAttachmentId()).toBe('string');
		});

		it('should never return empty strings', () => {
			for (let i = 0; i < 100; i++) {
				expect(generateProjectId()).not.toBe('');
				expect(generateTestRunId()).not.toBe('');
				expect(generateTestCaseId()).not.toBe('');
			}
		});

		it('should never return undefined or null', () => {
			expect(generateProjectId()).not.toBeUndefined();
			expect(generateProjectId()).not.toBeNull();
			expect(generateTestRunId()).not.toBeUndefined();
			expect(generateTestRunId()).not.toBeNull();
		});
	});

	describe('Real-world Usage Patterns', () => {
		it('should generate IDs suitable for URLs', () => {
			const projectId = generateProjectId();
			const testRunId = generateTestRunId();

			// Construct URL-like paths
			const url1 = `/projects/${projectId}`;
			const url2 = `/projects/${projectId}/runs/${testRunId}`;

			expect(url1).toMatch(/^\/projects\/[0-9A-Za-z]{8}$/);
			expect(url2).toMatch(/^\/projects\/[0-9A-Za-z]{8}\/runs\/[0-9A-Za-z]{4}$/);
		});

		it('should generate IDs suitable for database primary keys', () => {
			const id = generateProjectId();

			// Should be indexable and efficient for DB lookups
			expect(id.length).toBeLessThan(36); // Shorter than UUID
			expect(id).toMatch(/^[0-9A-Za-z]+$/); // No special chars that need escaping
		});

		it('should generate IDs that are case-sensitive unique', () => {
			const ids = new Set();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				const id = generateProjectId();
				ids.add(id);
				// Also add lowercase version to check case sensitivity matters
				ids.add(id.toLowerCase());
			}

			// Should have more than 1000 entries if case matters
			expect(ids.size).toBeGreaterThan(iterations);
		});
	});

	describe('ID Distribution', () => {
		it('should have good character distribution (no bias)', () => {
			const charCounts: Record<string, number> = {};
			const iterations = 10000;

			for (let i = 0; i < iterations; i++) {
				const id = generateProjectId();
				for (const char of id) {
					charCounts[char] = (charCounts[char] || 0) + 1;
				}
			}

			// Check that characters are reasonably distributed
			const counts = Object.values(charCounts);
			const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
			const variance =
				counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
			const stdDev = Math.sqrt(variance);

			// Standard deviation should be relatively low (good distribution)
			// This is a rough check - actual statistics would be more complex
			expect(stdDev / avg).toBeLessThan(0.5); // Coefficient of variation < 0.5
		});
	});

	describe('Alphabet Consistency', () => {
		it('should use the same alphabet across all generators', () => {
			const projectChars = new Set<string>();
			const runChars = new Set<string>();

			for (let i = 0; i < 100; i++) {
				generateProjectId()
					.split('')
					.forEach((c) => projectChars.add(c));
				generateTestRunId()
					.split('')
					.forEach((c) => runChars.add(c));
			}

			// Both should use characters from the same alphabet
			// (0-9, A-Z, a-z = 62 chars total)
			const allChars = new Set([...projectChars, ...runChars]);
			expect(allChars.size).toBeLessThanOrEqual(62);
		});

		it('should include digits, uppercase, and lowercase letters', () => {
			const allChars = new Set<string>();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				generateProjectId()
					.split('')
					.forEach((c) => allChars.add(c));
			}

			const hasDigit = Array.from(allChars).some((c) => /[0-9]/.test(c));
			const hasUpper = Array.from(allChars).some((c) => /[A-Z]/.test(c));
			const hasLower = Array.from(allChars).some((c) => /[a-z]/.test(c));

			expect(hasDigit).toBe(true);
			expect(hasUpper).toBe(true);
			expect(hasLower).toBe(true);
		});
	});
});
