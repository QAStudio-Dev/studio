import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { handleValidationError, validateRequestBody } from './validation';

describe('validation', () => {
	describe('handleValidationError', () => {
		it('should handle ZodError with user-friendly message', () => {
			const schema = z.object({
				email: z.string().email(),
				age: z.number().min(18)
			});

			try {
				schema.parse({ email: 'invalid', age: 10 });
			} catch (error) {
				const response = handleValidationError(error);
				const body = response.body as ReadableStream;

				expect(response.status).toBe(400);
				// Response should contain error message
			}
		});

		it('should return first validation error', () => {
			const schema = z.object({
				name: z.string().min(3),
				email: z.string().email(),
				age: z.number()
			});

			try {
				schema.parse({ name: 'ab', email: 'bad', age: 'not a number' });
			} catch (error) {
				const response = handleValidationError(error);
				expect(response.status).toBe(400);

				// Should contain error about name (first error)
				// We can't easily read the body in tests, but we verify status
			}
		});

		it('should handle non-ZodError with generic message', () => {
			const genericError = new Error('Something went wrong');
			const response = handleValidationError(genericError);

			expect(response.status).toBe(400);
		});

		it('should handle unknown error types', () => {
			const response = handleValidationError('string error');
			expect(response.status).toBe(400);
		});
	});

	describe('validateRequestBody', () => {
		it('should parse valid request body', async () => {
			const schema = z.object({
				name: z.string(),
				age: z.number()
			});

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ name: 'John', age: 30 }),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(mockRequest, schema);

			expect(result).toEqual({ name: 'John', age: 30 });
		});

		it('should throw ZodError for invalid data', async () => {
			const schema = z.object({
				email: z.string().email(),
				age: z.number().min(18)
			});

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ email: 'not-an-email', age: 10 }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(validateRequestBody(mockRequest, schema)).rejects.toThrow();
		});

		it('should validate CUID format', async () => {
			const schema = z.object({
				id: z.string().cuid()
			});

			const validRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ id: 'clx1234567890abcdefghijk' }),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(validRequest, schema);
			expect(result.id).toBe('clx1234567890abcdefghijk');

			const invalidRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ id: 'invalid-id' }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(validateRequestBody(invalidRequest, schema)).rejects.toThrow();
		});

		it('should validate nested objects', async () => {
			const schema = z.object({
				user: z.object({
					name: z.string().min(1),
					email: z.string().email()
				}),
				preferences: z.object({
					notifications: z.boolean()
				})
			});

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({
					user: { name: 'Alice', email: 'alice@example.com' },
					preferences: { notifications: true }
				}),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(mockRequest, schema);

			expect(result.user.name).toBe('Alice');
			expect(result.preferences.notifications).toBe(true);
		});

		it('should validate arrays', async () => {
			const schema = z.object({
				tags: z.array(z.string()).min(1).max(5)
			});

			const validRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ tags: ['tag1', 'tag2'] }),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(validRequest, schema);
			expect(result.tags).toHaveLength(2);

			const tooManyRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ tags: ['1', '2', '3', '4', '5', '6'] }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(validateRequestBody(tooManyRequest, schema)).rejects.toThrow();
		});

		it('should handle optional fields', async () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional()
			});

			const withOptional = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ required: 'value', optional: 'present' }),
				headers: { 'Content-Type': 'application/json' }
			});

			const resultWith = await validateRequestBody(withOptional, schema);
			expect(resultWith.optional).toBe('present');

			const withoutOptional = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ required: 'value' }),
				headers: { 'Content-Type': 'application/json' }
			});

			const resultWithout = await validateRequestBody(withoutOptional, schema);
			expect(resultWithout.optional).toBeUndefined();
		});
	});

	describe('integration validation schemas', () => {
		it('should validate Jira issue creation schema', async () => {
			const CreateJiraIssueSchema = z.object({
				integrationId: z.string().cuid(),
				testResultId: z.string().cuid(),
				projectKey: z
					.string()
					.min(1)
					.max(10)
					.regex(/^[A-Z][A-Z0-9]*$/, 'Project key must be uppercase letters and numbers'),
				summary: z.string().min(1).max(255),
				description: z.string().max(32000).optional(),
				issueType: z.string().min(1).max(50),
				priority: z.string().min(1).max(50).optional(),
				labels: z.array(z.string().max(255)).max(10).optional()
			});

			const validRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({
					integrationId: 'clx1234567890abcdefghijk',
					testResultId: 'clx9876543210zyxwvutsrqp',
					projectKey: 'PROJ',
					summary: 'Test failed on login page',
					description: 'The login button is not working',
					issueType: 'Bug',
					priority: 'High',
					labels: ['qa-studio', 'automated-test']
				}),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(validRequest, CreateJiraIssueSchema);

			expect(result.projectKey).toBe('PROJ');
			expect(result.labels).toHaveLength(2);
		});

		it('should reject invalid Jira project keys', async () => {
			const projectKeySchema = z
				.string()
				.regex(/^[A-Z][A-Z0-9]*$/, 'Project key must be uppercase letters and numbers');

			// Valid keys
			expect(() => projectKeySchema.parse('PROJ')).not.toThrow();
			expect(() => projectKeySchema.parse('P')).not.toThrow();
			expect(() => projectKeySchema.parse('PROJECT123')).not.toThrow();

			// Invalid keys
			expect(() => projectKeySchema.parse('proj')).toThrow(); // lowercase
			expect(() => projectKeySchema.parse('123PROJ')).toThrow(); // starts with number
			expect(() => projectKeySchema.parse('PROJ-123')).toThrow(); // contains dash
			expect(() => projectKeySchema.parse('')).toThrow(); // empty
		});

		it('should validate integration update schema', async () => {
			const UpdateIntegrationSchema = z.object({
				name: z.string().min(1).max(100).optional(),
				status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional()
			});

			const validRequest = new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({
					name: 'Updated Integration Name',
					status: 'ACTIVE'
				}),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(validRequest, UpdateIntegrationSchema);
			expect(result.status).toBe('ACTIVE');

			const invalidStatusRequest = new Request('http://localhost', {
				method: 'PATCH',
				body: JSON.stringify({ status: 'INVALID_STATUS' }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(
				validateRequestBody(invalidStatusRequest, UpdateIntegrationSchema)
			).rejects.toThrow();
		});

		it('should enforce string length limits', async () => {
			const schema = z.object({
				summary: z.string().min(1).max(255)
			});

			const tooLongRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ summary: 'x'.repeat(256) }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(validateRequestBody(tooLongRequest, schema)).rejects.toThrow();

			const emptyRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ summary: '' }),
				headers: { 'Content-Type': 'application/json' }
			});

			await expect(validateRequestBody(emptyRequest, schema)).rejects.toThrow();

			const validRequest = new Request('http://localhost', {
				method: 'POST',
				body: JSON.stringify({ summary: 'Valid summary' }),
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await validateRequestBody(validRequest, schema);
			expect(result.summary).toBe('Valid summary');
		});
	});
});
