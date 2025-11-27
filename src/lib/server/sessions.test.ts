import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSession, validateSession, deleteSession, verifyCsrfToken } from './sessions';
import { db } from './db';

// Mock the database
vi.mock('./db', () => ({
	db: {
		session: {
			create: vi.fn(),
			findUnique: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn()
		}
	}
}));

describe('sessions', () => {
	const mockUserId = 'test-user-id';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createSession', () => {
		it('should create a session with hashed token and CSRF token', async () => {
			const mockSession = {
				id: 'session-id',
				userId: mockUserId,
				token: 'hashed-token',
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			};

			(db.session.create as any).mockResolvedValue(mockSession);

			const result = await createSession(mockUserId);

			expect(result).toHaveProperty('sessionId');
			expect(result).toHaveProperty('token');
			expect(result).toHaveProperty('csrfToken');
			expect(result.sessionId).toBe('session-id');
			expect(result.token).toBeTruthy();
			expect(result.csrfToken).toBeTruthy();
			expect(db.session.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: mockUserId,
						token: expect.any(String),
						expiresAt: expect.any(Date)
					})
				})
			);
		});

		it('should generate unique tokens for each session', async () => {
			const mockSession1 = {
				id: 'session-id-1',
				userId: mockUserId,
				token: 'hashed-token-1',
				expiresAt: new Date()
			};
			const mockSession2 = {
				id: 'session-id-2',
				userId: mockUserId,
				token: 'hashed-token-2',
				expiresAt: new Date()
			};

			(db.session.create as any)
				.mockResolvedValueOnce(mockSession1)
				.mockResolvedValueOnce(mockSession2);

			const result1 = await createSession(mockUserId);
			const result2 = await createSession(mockUserId);

			expect(result1.token).not.toBe(result2.token);
			expect(result1.csrfToken).not.toBe(result2.csrfToken);
		});
	});

	describe('validateSession', () => {
		it('should validate a valid session', async () => {
			const sessionId = 'session-id';
			const token = 'test-token';

			// Mock finding the session
			const mockSession = {
				userId: mockUserId,
				token: require('crypto')
					.createHmac(
						'sha256',
						process.env.SESSION_SECRET || 'dev-secret-change-in-production'
					)
					.update(token)
					.digest('hex')
			};

			(db.session.findUnique as any).mockResolvedValue(mockSession);

			const result = await validateSession(sessionId, token);

			expect(result).toBe(mockUserId);
			expect(db.session.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: sessionId,
						expiresAt: expect.objectContaining({
							gt: expect.any(Date)
						})
					})
				})
			);
		});

		it('should return null for expired session', async () => {
			const sessionId = 'session-id';
			const token = 'test-token';

			(db.session.findUnique as any).mockResolvedValue(null);

			const result = await validateSession(sessionId, token);

			expect(result).toBeNull();
		});

		it('should return null for invalid token', async () => {
			const sessionId = 'session-id';
			const token = 'test-token';

			// Create a valid hash with wrong token so lengths match
			const wrongToken = 'wrong-token-1234567890123456789';
			const mockSession = {
				userId: mockUserId,
				token: require('crypto')
					.createHmac(
						'sha256',
						process.env.SESSION_SECRET || 'dev-secret-change-in-production'
					)
					.update(wrongToken)
					.digest('hex')
			};

			(db.session.findUnique as any).mockResolvedValue(mockSession);

			const result = await validateSession(sessionId, token);

			expect(result).toBeNull();
		});
	});

	describe('deleteSession', () => {
		it('should delete a session by ID', async () => {
			const sessionId = 'session-id';

			(db.session.delete as any).mockResolvedValue({});

			await deleteSession(sessionId);

			expect(db.session.delete).toHaveBeenCalledWith({
				where: { id: sessionId }
			});
		});

		it('should not throw if session does not exist', async () => {
			const sessionId = 'non-existent-session';

			(db.session.delete as any).mockRejectedValue(new Error('Not found'));

			await expect(deleteSession(sessionId)).resolves.not.toThrow();
		});
	});

	describe('verifyCsrfToken', () => {
		it('should verify a valid CSRF token', () => {
			const csrfToken = 'test-csrf-token';

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue(csrfToken)
				}
			} as any;

			const result = verifyCsrfToken(mockEvent, csrfToken);

			expect(result).toBe(true);
			expect(mockEvent.cookies.get).toHaveBeenCalledWith('qa_studio_csrf');
		});

		it('should reject an invalid CSRF token', () => {
			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('cookie-token')
				}
			} as any;

			const result = verifyCsrfToken(mockEvent, 'wrong-token');

			expect(result).toBe(false);
		});

		it('should reject if no CSRF token in cookie', () => {
			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue(null)
				}
			} as any;

			const result = verifyCsrfToken(mockEvent, 'any-token');

			expect(result).toBe(false);
		});
	});
});
