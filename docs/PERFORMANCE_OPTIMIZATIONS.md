# Performance Optimizations

This document tracks performance optimizations implemented in the QA Studio codebase.

## Test Results Submission API (`/api/results`)

### Problem: N+1 Query Performance

The test results submission endpoint processes test results from automated runners (e.g., Playwright). With large test suites (100+ tests), this could lead to performance issues due to N+1 queries.

### Optimization: Suite Hierarchy Caching

**Location:** [src/api/test-results/POST.ts](../src/api/test-results/POST.ts:290-355)

**Implementation:**

- Added in-memory `SuiteCache` to store already-resolved suite hierarchies
- Cache key format: `"projectId:parentId:suiteName"`
- Prevents repeated database lookups for the same suite path
- Particularly effective when multiple tests share the same suite structure

**Impact:**

- **Before:** O(n \* m) queries where n = number of tests, m = suite hierarchy depth
- **After:** O(unique_suites \* m) queries - dramatically reduced when tests share suites

**Example:**

```typescript
// 100 tests in the same suite "Auth > Login"
// Before: 200 queries (2 per test for 2-level hierarchy)
// After: 2 queries (cached for remaining 98 tests)
```

### Existing Optimizations

1. **Test Case Pre-loading**
   - All test cases for a project are loaded upfront in memory
   - Fast in-memory lookups to check if test case exists
   - Avoids database query per test case lookup

2. **Batch Operations**
   - Notification sending uses `Promise.allSettled()` for parallel execution
   - Multiple integrations can be notified simultaneously

### Future Optimizations

**Prisma Transactions for Batch Inserts:**

```typescript
// TODO: Consider using Prisma.$transaction() for creating multiple test cases/results
// This would provide:
// - Atomic batch operations
// - Better error recovery
// - Potential performance gains for large batches
await db.$transaction([
  db.testCase.createMany({...}),
  db.testResult.createMany({...})
]);
```

**Attachment Batch Uploads:**

```typescript
// TODO: Consider parallel attachment uploads with concurrency limit
// Current: Sequential uploads
// Future: Promise.all() with p-limit for controlled concurrency
```

### Performance Metrics

Recommended monitoring for production:

- Track test result submission duration by batch size
- Monitor database query counts per request
- Alert on submissions taking >30s for 100+ tests

### Database Indexes

See [DATABASE_INDEXES.md](./DATABASE_INDEXES.md) for index recommendations.

## Notification System

### Optimization: Parallel Integration Sending

**Location:** [src/lib/server/integrations.ts](../src/lib/server/integrations.ts:77-104)

**Implementation:**

- Uses `Promise.allSettled()` to send to all integrations in parallel
- Tracks success/failure per integration
- Returns detailed error information

**Impact:**

- Notifications to 3 integrations complete in ~1s instead of ~3s
- Individual failures don't block other integrations

## General Best Practices

1. **Avoid SELECT N+1 Queries**
   - Use `include` or `select` with Prisma to pre-load related data
   - Cache frequently accessed data in memory during request processing
   - Consider using Prisma's `findUnique` with `include` instead of separate queries

2. **Use Batch Operations**
   - `createMany()` instead of multiple `create()` calls
   - `updateMany()` instead of loops with individual updates
   - `deleteMany()` instead of loops with individual deletes

3. **Optimize Database Queries**
   - Add indexes on frequently queried fields
   - Use `select` to limit fields returned
   - Avoid loading unnecessary related data

4. **Parallel Processing**
   - Use `Promise.all()` or `Promise.allSettled()` for independent operations
   - Consider using libraries like `p-limit` for controlled concurrency

5. **Caching Strategies**
   - Request-level caching for data used multiple times
   - Consider Redis for cross-request caching if needed
   - Cache invalidation strategy is crucial

## Performance Testing

To test performance improvements:

```bash
# Simulate 100 test results
npm run test:perf:results

# Profile database queries
DATABASE_URL="..." npx prisma studio
# Enable query logging in Prisma
```

## Monitoring Recommendations

1. **Application Performance Monitoring (APM)**
   - Track endpoint response times
   - Monitor database query counts and duration
   - Alert on slow queries (>1s)

2. **Database Monitoring**
   - Query execution plans
   - Index usage statistics
   - Connection pool utilization

3. **Custom Metrics**
   - Test result batch size distribution
   - Suite cache hit rate
   - Notification success/failure rates
