import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the environment variables first
vi.mock('$env/static/private', () => ({
	KV_REST_API_URL: 'https://test-redis.upstash.io',
	KV_REST_API_TOKEN: 'test_token'
}));

vi.mock('$app/environment', () => ({
	dev: true
}));

// Mock the Redis client with factory returning mock methods
vi.mock('@upstash/redis', () => {
	const mockGet = vi.fn();
	const mockSet = vi.fn();
	const mockSetex = vi.fn();
	const mockDel = vi.fn();
	const mockScan = vi.fn();
	const mockExists = vi.fn();

	return {
		Redis: vi.fn(() => ({
			get: mockGet,
			set: mockSet,
			setex: mockSetex,
			del: mockDel,
			scan: mockScan,
			exists: mockExists
		})),
		// Export mocks so tests can access them
		__mockGet: mockGet,
		__mockSet: mockSet,
		__mockSetex: mockSetex,
		__mockDel: mockDel,
		__mockScan: mockScan,
		__mockExists: mockExists
	};
});

// Import after mocks are set up
import {
	getCache,
	setCache,
	deleteCache,
	deleteCachePattern,
	hasCache,
	getCachedOrFetch,
	CacheKeys,
	CacheTTL,
	isCacheEnabled
} from './redis';

// Get the mock functions from the mocked module
import * as RedisMock from '@upstash/redis';
const mockGet = (RedisMock as any).__mockGet;
const mockSet = (RedisMock as any).__mockSet;
const mockSetex = (RedisMock as any).__mockSetex;
const mockDel = (RedisMock as any).__mockDel;
const mockScan = (RedisMock as any).__mockScan;
const mockExists = (RedisMock as any).__mockExists;

describe('Redis Caching Layer', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		mockGet.mockClear();
		mockSet.mockClear();
		mockSetex.mockClear();
		mockDel.mockClear();
		mockScan.mockClear();
		mockExists.mockClear();
	});

	describe('Environment & Initialization', () => {
		it('should indicate caching is enabled when env vars are set', () => {
			expect(isCacheEnabled).toBe(true);
		});

		it('should define cache key helpers', () => {
			expect(CacheKeys.project('test-id')).toBe('project:test-id');
			expect(CacheKeys.projects('user-123')).toBe('projects:user:user-123');
			expect(CacheKeys.testRun('run-456')).toBe('run:run-456');
			expect(CacheKeys.testResult('result-789')).toBe('result:result-789');
			expect(CacheKeys.testResults('run-123')).toBe('results:run:run-123');
		});

		it('should validate cache key inputs', () => {
			// Empty strings should throw
			expect(() => CacheKeys.project('')).toThrow('Cache key project id cannot be empty');
			expect(() => CacheKeys.projects('  ')).toThrow('Cache key user id cannot be empty');

			// Colon and asterisk characters should throw
			expect(() => CacheKeys.project('test:id')).toThrow(
				"Cache key project id cannot contain ':' or '*' characters"
			);
			expect(() => CacheKeys.testRun('run*123')).toThrow(
				"Cache key test run id cannot contain ':' or '*' characters"
			);
		});

		it('should define TTL constants', () => {
			expect(CacheTTL.project).toBe(2592000); // 30 days
			expect(CacheTTL.testRun).toBe(2592000); // 30 days
			expect(CacheTTL.testResult).toBe(2592000); // 30 days
			expect(CacheTTL.testCase).toBe(2592000); // 30 days
			expect(CacheTTL.apiKey).toBe(300); // 5 minutes
		});
	});

	describe('getCache', () => {
		it('should return cached data when key exists', async () => {
			const mockData = { id: '123', name: 'Test Project' };
			mockGet.mockResolvedValue(mockData);

			const result = await getCache('project:123');

			expect(result).toEqual(mockData);
			expect(mockGet).toHaveBeenCalledWith('project:123');
			expect(mockGet).toHaveBeenCalledTimes(1);
		});

		it('should return null when key does not exist', async () => {
			mockGet.mockResolvedValue(null);

			const result = await getCache('non-existent-key');

			expect(result).toBeNull();
			expect(mockGet).toHaveBeenCalledWith('non-existent-key');
		});

		it('should return null and log error on Redis failure', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockGet.mockRejectedValue(new Error('Redis connection failed'));

			const result = await getCache('test-key');

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalledWith('Redis get error:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});

		it('should handle complex objects', async () => {
			const complexData = {
				id: '123',
				nested: {
					array: [1, 2, 3],
					object: { key: 'value' }
				},
				date: '2024-01-01T00:00:00.000Z'
			};
			mockGet.mockResolvedValue(complexData);

			const result = await getCache('complex-key');

			expect(result).toEqual(complexData);
		});
	});

	describe('setCache', () => {
		it('should set cache with TTL', async () => {
			mockSetex.mockResolvedValue('OK');

			const data = { id: '123', name: 'Test' };
			const result = await setCache('test-key', data, 300);

			expect(result).toBe(true);
			expect(mockSetex).toHaveBeenCalledWith('test-key', 300, data);
			expect(mockSet).not.toHaveBeenCalled();
		});

		it('should set cache without TTL', async () => {
			mockSet.mockResolvedValue('OK');

			const data = { id: '456', name: 'Permanent' };
			const result = await setCache('permanent-key', data);

			expect(result).toBe(true);
			expect(mockSet).toHaveBeenCalledWith('permanent-key', data);
			expect(mockSetex).not.toHaveBeenCalled();
		});

		it('should return false on Redis failure', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockSetex.mockRejectedValue(new Error('Redis write failed'));

			const result = await setCache('fail-key', { data: 'test' }, 60);

			expect(result).toBe(false);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Redis set error:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});

		it('should handle various data types', async () => {
			mockSet.mockResolvedValue('OK');

			// String
			await setCache('string-key', 'test string');
			expect(mockSet).toHaveBeenCalledWith('string-key', 'test string');

			// Number
			await setCache('number-key', 42);
			expect(mockSet).toHaveBeenCalledWith('number-key', 42);

			// Array
			await setCache('array-key', [1, 2, 3]);
			expect(mockSet).toHaveBeenCalledWith('array-key', [1, 2, 3]);

			// Object
			await setCache('object-key', { foo: 'bar' });
			expect(mockSet).toHaveBeenCalledWith('object-key', { foo: 'bar' });
		});
	});

	describe('deleteCache', () => {
		it('should delete a single key', async () => {
			mockDel.mockResolvedValue(1);

			const result = await deleteCache('test-key');

			expect(result).toBe(true);
			expect(mockDel).toHaveBeenCalledWith('test-key');
		});

		it('should delete multiple keys', async () => {
			mockDel.mockResolvedValue(3);

			const result = await deleteCache(['key1', 'key2', 'key3']);

			expect(result).toBe(true);
			expect(mockDel).toHaveBeenCalledWith('key1', 'key2', 'key3');
		});

		it('should return false on Redis failure', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockDel.mockRejectedValue(new Error('Delete failed'));

			const result = await deleteCache('fail-key');

			expect(result).toBe(false);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Redis del error:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});
	});

	describe('deleteCachePattern', () => {
		it('should delete all keys matching pattern using SCAN', async () => {
			// First scan returns cursor 10 with 2 keys
			// Second scan returns cursor 0 (done) with 1 key
			mockScan
				.mockResolvedValueOnce([10, ['key1', 'key2']])
				.mockResolvedValueOnce([0, ['key3']]);
			mockDel.mockResolvedValue(3);

			const result = await deleteCachePattern('projects:user:*');

			expect(result).toBe(true);
			expect(mockScan).toHaveBeenCalledTimes(2);
			expect(mockScan).toHaveBeenNthCalledWith(1, 0, {
				match: 'projects:user:*',
				count: 100
			});
			expect(mockScan).toHaveBeenNthCalledWith(2, 10, {
				match: 'projects:user:*',
				count: 100
			});
			expect(mockDel).toHaveBeenCalledWith('key1', 'key2', 'key3');
		});

		it('should handle string cursor from Redis', async () => {
			// Redis can return cursor as string
			mockScan.mockResolvedValueOnce(['10', ['key1']]).mockResolvedValueOnce(['0', ['key2']]);
			mockDel.mockResolvedValue(2);

			const result = await deleteCachePattern('test:*');

			expect(result).toBe(true);
			expect(mockDel).toHaveBeenCalledWith('key1', 'key2');
		});

		it('should not call del when no keys match', async () => {
			mockScan.mockResolvedValueOnce([0, []]);

			const result = await deleteCachePattern('nonexistent:*');

			expect(result).toBe(true);
			expect(mockScan).toHaveBeenCalledTimes(1);
			expect(mockDel).not.toHaveBeenCalled();
		});

		it('should return false on Redis failure', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockScan.mockRejectedValue(new Error('Scan failed'));

			const result = await deleteCachePattern('fail:*');

			expect(result).toBe(false);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Redis pattern delete error:',
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('should handle large result sets with multiple iterations', async () => {
			// Simulate 5 iterations
			mockScan
				.mockResolvedValueOnce([1, ['key1', 'key2']])
				.mockResolvedValueOnce([2, ['key3', 'key4']])
				.mockResolvedValueOnce([3, ['key5']])
				.mockResolvedValueOnce([4, ['key6', 'key7', 'key8']])
				.mockResolvedValueOnce([0, ['key9']]);
			mockDel.mockResolvedValue(9);

			const result = await deleteCachePattern('large:*');

			expect(result).toBe(true);
			expect(mockScan).toHaveBeenCalledTimes(5);
			expect(mockDel).toHaveBeenCalledWith(
				'key1',
				'key2',
				'key3',
				'key4',
				'key5',
				'key6',
				'key7',
				'key8',
				'key9'
			);
		});
	});

	describe('hasCache', () => {
		it('should return true when key exists', async () => {
			mockExists.mockResolvedValue(1);

			const result = await hasCache('existing-key');

			expect(result).toBe(true);
			expect(mockExists).toHaveBeenCalledWith('existing-key');
		});

		it('should return false when key does not exist', async () => {
			mockExists.mockResolvedValue(0);

			const result = await hasCache('non-existent');

			expect(result).toBe(false);
		});

		it('should return false on Redis failure', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockExists.mockRejectedValue(new Error('Exists check failed'));

			const result = await hasCache('fail-key');

			expect(result).toBe(false);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Redis exists error:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});
	});

	describe('getCachedOrFetch', () => {
		it('should return cached data if available (cache hit)', async () => {
			const cachedData = { id: '123', name: 'Cached Project' };
			mockGet.mockResolvedValue(cachedData);

			const fetchFn = vi.fn();
			const result = await getCachedOrFetch('project:123', fetchFn, 300);

			expect(result).toEqual(cachedData);
			expect(mockGet).toHaveBeenCalledWith('project:123');
			expect(fetchFn).not.toHaveBeenCalled();
			expect(mockSetex).not.toHaveBeenCalled();
		});

		it('should fetch and cache data on cache miss', async () => {
			mockGet.mockResolvedValue(null);
			const freshData = { id: '456', name: 'Fresh Project' };
			const fetchFn = vi.fn().mockResolvedValue(freshData);
			mockSetex.mockResolvedValue('OK');

			const result = await getCachedOrFetch('project:456', fetchFn, 300);

			expect(result).toEqual(freshData);
			expect(mockGet).toHaveBeenCalledWith('project:456');
			expect(fetchFn).toHaveBeenCalledTimes(1);
			expect(mockSetex).toHaveBeenCalledWith('project:456', 300, freshData);
		});

		it('should work without TTL', async () => {
			mockGet.mockResolvedValue(null);
			const data = { id: '789', name: 'No TTL' };
			const fetchFn = vi.fn().mockResolvedValue(data);
			mockSet.mockResolvedValue('OK');

			const result = await getCachedOrFetch('project:789', fetchFn);

			expect(result).toEqual(data);
			expect(fetchFn).toHaveBeenCalledTimes(1);
			expect(mockSet).toHaveBeenCalledWith('project:789', data);
			expect(mockSetex).not.toHaveBeenCalled();
		});

		it('should propagate errors from fetch function', async () => {
			mockGet.mockResolvedValue(null);
			const fetchFn = vi.fn().mockRejectedValue(new Error('Database error'));

			await expect(getCachedOrFetch('fail-key', fetchFn, 60)).rejects.toThrow(
				'Database error'
			);

			expect(mockGet).toHaveBeenCalled();
			expect(fetchFn).toHaveBeenCalled();
			expect(mockSetex).not.toHaveBeenCalled();
		});

		it('should still return fetched data even if caching fails', async () => {
			mockGet.mockResolvedValue(null);
			const data = { id: '999', name: 'Cache Fail' };
			const fetchFn = vi.fn().mockResolvedValue(data);
			mockSetex.mockRejectedValue(new Error('Cache write failed'));

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await getCachedOrFetch('project:999', fetchFn, 300);

			expect(result).toEqual(data);
			expect(fetchFn).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith('Redis set error:', expect.any(Error));

			consoleErrorSpy.mockRestore();
		});

		it('should handle async fetch functions', async () => {
			mockGet.mockResolvedValue(null);
			mockSetex.mockResolvedValue('OK');

			const asyncFetch = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return { id: 'async', name: 'Async Data' };
			};

			const result = await getCachedOrFetch('async-key', asyncFetch, 60);

			expect(result).toEqual({ id: 'async', name: 'Async Data' });
			expect(mockSetex).toHaveBeenCalledWith('async-key', 60, {
				id: 'async',
				name: 'Async Data'
			});
		});
	});

	describe('Integration scenarios', () => {
		it('should handle full cache lifecycle: set, get, delete', async () => {
			const testData = { id: 'lifecycle', name: 'Lifecycle Test' };

			// Set
			mockSetex.mockResolvedValue('OK');
			await setCache('lifecycle:test', testData, 300);
			expect(mockSetex).toHaveBeenCalledWith('lifecycle:test', 300, testData);

			// Get
			mockGet.mockResolvedValue(testData);
			const retrieved = await getCache('lifecycle:test');
			expect(retrieved).toEqual(testData);

			// Delete
			mockDel.mockResolvedValue(1);
			await deleteCache('lifecycle:test');
			expect(mockDel).toHaveBeenCalledWith('lifecycle:test');
		});

		it('should handle batch operations', async () => {
			const keys = ['batch:1', 'batch:2', 'batch:3'];
			mockDel.mockResolvedValue(3);

			const result = await deleteCache(keys);

			expect(result).toBe(true);
			expect(mockDel).toHaveBeenCalledWith(...keys);
		});
	});
});
