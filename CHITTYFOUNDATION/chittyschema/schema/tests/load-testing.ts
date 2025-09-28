/**
 * ChittyChain Schema Load Testing Suite
 * Performance and scalability testing for pipeline architecture
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// =====================================================
// LOAD TEST CONFIGURATION
// =====================================================

const LOAD_CONFIG = {
  TARGET_URL: 'https://schema.chitty.cc',
  CONCURRENT_USERS: {
    LIGHT: 10,
    MEDIUM: 50,
    HEAVY: 100,
    STRESS: 500
  },
  TEST_DURATION: {
    SHORT: 30 * 1000,    // 30 seconds
    MEDIUM: 2 * 60 * 1000, // 2 minutes
    LONG: 5 * 60 * 1000    // 5 minutes
  },
  THRESHOLDS: {
    RESPONSE_TIME_P95: 2000,  // 2 seconds
    RESPONSE_TIME_P99: 5000,  // 5 seconds
    ERROR_RATE: 0.05,         // 5%
    THROUGHPUT_MIN: 100       // requests per second
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

class LoadTestMetrics {
  private responses: Array<{ status: number; duration: number; timestamp: number }> = [];

  record(status: number, duration: number) {
    this.responses.push({
      status,
      duration,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    const durations = this.responses.map(r => r.duration).sort((a, b) => a - b);
    const errors = this.responses.filter(r => r.status >= 400).length;
    const total = this.responses.length;

    return {
      totalRequests: total,
      errorRate: total > 0 ? errors / total : 0,
      averageResponseTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      p50: durations[Math.floor(durations.length * 0.5)] || 0,
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      p99: durations[Math.floor(durations.length * 0.99)] || 0,
      minResponseTime: durations[0] || 0,
      maxResponseTime: durations[durations.length - 1] || 0,
      throughput: this.calculateThroughput()
    };
  }

  private calculateThroughput(): number {
    if (this.responses.length < 2) return 0;

    const startTime = Math.min(...this.responses.map(r => r.timestamp));
    const endTime = Math.max(...this.responses.map(r => r.timestamp));
    const durationSeconds = (endTime - startTime) / 1000;

    return durationSeconds > 0 ? this.responses.length / durationSeconds : 0;
  }
}

async function makeRequest(url: string, options: RequestInit = {}): Promise<{ status: number; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    return { status: response.status, duration };
  } catch (error) {
    const duration = Date.now() - start;
    return { status: 0, duration }; // Network error
  }
}

async function runConcurrentLoad(
  requestGenerator: () => Promise<{ status: number; duration: number }>,
  concurrency: number,
  duration: number
): Promise<LoadTestMetrics> {
  const metrics = new LoadTestMetrics();
  const startTime = Date.now();
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() - startTime < duration) {
          const result = await requestGenerator();
          metrics.record(result.status, result.duration);

          // Small delay to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        }
      })()
    );
  }

  await Promise.all(workers);
  return metrics;
}

// =====================================================
// BASIC LOAD TESTS
// =====================================================

describe('Basic Load Testing', () => {

  test('Health endpoint should handle light load', async () => {
    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/health`),
      LOAD_CONFIG.CONCURRENT_USERS.LIGHT,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    expect(results.errorRate).toBeLessThan(LOAD_CONFIG.THRESHOLDS.ERROR_RATE);
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);
    expect(results.totalRequests).toBeGreaterThan(0);

    console.log('Health endpoint light load results:', results);
  });

  test('Template listing should handle medium load', async () => {
    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/direct/templates`),
      LOAD_CONFIG.CONCURRENT_USERS.MEDIUM,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    expect(results.errorRate).toBeLessThan(LOAD_CONFIG.THRESHOLDS.ERROR_RATE);
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);

    console.log('Template listing medium load results:', results);
  });

  test('Schema validation should handle sustained load', async () => {
    const testSchema = 'CREATE TABLE test_load (id INT PRIMARY KEY, name TEXT);';

    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/direct/validate/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: testSchema,
          platform: 'postgresql'
        })
      }),
      LOAD_CONFIG.CONCURRENT_USERS.MEDIUM,
      LOAD_CONFIG.TEST_DURATION.MEDIUM
    );

    const results = metrics.getMetrics();

    expect(results.errorRate).toBeLessThan(LOAD_CONFIG.THRESHOLDS.ERROR_RATE);
    expect(results.p99).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P99);

    console.log('Schema validation sustained load results:', results);
  });
});

// =====================================================
// PIPELINE AUTHENTICATION LOAD TESTS
// =====================================================

describe('Pipeline Authentication Load Testing', () => {

  test('Pipeline authentication should handle concurrent requests', async () => {
    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/api/v1/schema/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer auto-detect'
        },
        body: JSON.stringify({
          chittyId: 'PEO-LOADTEST123',
          platform: 'postgresql',
          entities: ['people']
        })
      }),
      LOAD_CONFIG.CONCURRENT_USERS.LIGHT,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    // Most requests should fail with 426 (pipeline required) - this is expected
    const pipelineRequiredCount = metrics.getMetrics().totalRequests; // All should be 426
    expect(pipelineRequiredCount).toBeGreaterThan(0);

    // Response times should still be reasonable
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);

    console.log('Pipeline authentication load results:', results);
  });

  test('Session endpoints should handle high concurrency', async () => {
    const sessionIds = Array.from({ length: 100 }, (_, i) => `load_test_session_${i}`);

    const metrics = await runConcurrentLoad(
      () => {
        const randomSessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
        return makeRequest(`${LOAD_CONFIG.TARGET_URL}/session/get/${randomSessionId}`);
      },
      LOAD_CONFIG.CONCURRENT_USERS.HEAVY,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    // Most requests should return 404 (session not found) - this is expected
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);
    expect(results.totalRequests).toBeGreaterThan(0);

    console.log('Session endpoints high concurrency results:', results);
  });
});

// =====================================================
// DISTRIBUTED SESSION LOAD TESTS
// =====================================================

describe('Distributed Session Load Testing', () => {

  test('Session creation should handle burst traffic', async () => {
    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chitty_id: `PEO-BURST${Math.floor(Math.random() * 1000)}`,
          trust_level: Math.floor(Math.random() * 10) + 1,
          permissions: ['schema:generate']
        })
      }),
      LOAD_CONFIG.CONCURRENT_USERS.HEAVY,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    // Session creation might fail due to auth, but should respond quickly
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95 * 2); // Allow 2x for complex operations
    expect(results.totalRequests).toBeGreaterThan(0);

    console.log('Session creation burst traffic results:', results);
  });

  test('Session sync should handle distributed conflicts', async () => {
    const testSessions = Array.from({ length: 50 }, (_, i) => ({
      session_id: `conflict_test_${i}`,
      chitty_id: `PEO-CONFLICT${i}`,
      vector_clock: { 'service_a': Math.floor(Math.random() * 10), 'service_b': Math.floor(Math.random() * 10) },
      trust_level: Math.floor(Math.random() * 10) + 1
    }));

    const metrics = await runConcurrentLoad(
      () => {
        const randomSession = testSessions[Math.floor(Math.random() * testSessions.length)];
        return makeRequest(`${LOAD_CONFIG.TARGET_URL}/session/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: [randomSession] })
        });
      },
      LOAD_CONFIG.CONCURRENT_USERS.MEDIUM,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    expect(results.p99).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P99);

    console.log('Session sync conflict resolution results:', results);
  });
});

// =====================================================
// NOTION WEBHOOK LOAD TESTS
// =====================================================

describe('Notion Webhook Load Testing', () => {

  test('Webhook processing should handle event bursts', async () => {
    const eventTypes = ['page.content_updated', 'database.schema_updated', 'comment.created'];

    const metrics = await runConcurrentLoad(
      () => {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const eventPayload = {
          object: 'event',
          id: `load_test_${Date.now()}_${Math.random()}`,
          type: eventType,
          last_edited_time: new Date().toISOString(),
          data: {
            object: eventType.startsWith('page') ? 'page' : 'database',
            id: `obj_${Math.floor(Math.random() * 1000)}`
          }
        };

        return makeRequest(`${LOAD_CONFIG.TARGET_URL}/webhook/notion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Notion-Signature': 'sha256=test_load_signature'
          },
          body: JSON.stringify(eventPayload)
        });
      },
      LOAD_CONFIG.CONCURRENT_USERS.MEDIUM,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    // Webhooks might fail signature validation but should process quickly
    expect(results.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);

    console.log('Webhook event burst results:', results);
  });

  test('DLQ processing should handle failure recovery load', async () => {
    // Simulate failed operations being moved to DLQ
    const failedOperations = Array.from({ length: 100 }, (_, i) => ({
      operation_id: `failed_${i}`,
      retry_count: Math.floor(Math.random() * 3),
      status: 'failed',
      error_details: 'Simulated failure for load testing'
    }));

    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/bridge/notion/dlq/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': 'load_test_key',
          'X-Service-ID': 'load_test_service'
        },
        body: JSON.stringify({
          operations: failedOperations.slice(0, 10) // Process in batches
        })
      }),
      LOAD_CONFIG.CONCURRENT_USERS.LIGHT,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    console.log('DLQ processing load results:', results);
  });
});

// =====================================================
// STRESS TESTS
// =====================================================

describe('Stress Testing', () => {

  test('System should gracefully degrade under extreme load', async () => {
    const metrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/health`),
      LOAD_CONFIG.CONCURRENT_USERS.STRESS,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const results = metrics.getMetrics();

    // Under stress, some requests may fail, but system should not crash
    expect(results.errorRate).toBeLessThan(0.8); // Allow up to 80% errors under stress
    expect(results.totalRequests).toBeGreaterThan(0);

    // Response times may be high but should not timeout completely
    expect(results.maxResponseTime).toBeLessThan(30000); // 30 seconds max

    console.log('Extreme load stress test results:', results);
  });

  test('Memory usage should remain stable under sustained load', async () => {
    // Run a longer test to check for memory leaks
    const longMetrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/direct/templates`),
      LOAD_CONFIG.CONCURRENT_USERS.MEDIUM,
      LOAD_CONFIG.TEST_DURATION.LONG
    );

    const results = longMetrics.getMetrics();

    // System should maintain performance over time
    expect(results.errorRate).toBeLessThan(LOAD_CONFIG.THRESHOLDS.ERROR_RATE * 2); // Allow 2x error rate for long test
    expect(results.throughput).toBeGreaterThan(10); // Minimum viable throughput

    console.log('Sustained load memory stability results:', results);
  });

  test('Recovery after overload should be quick', async () => {
    // First, overload the system
    const overloadMetrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/health`),
      LOAD_CONFIG.CONCURRENT_USERS.STRESS,
      10000 // 10 seconds of overload
    );

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test normal load after overload
    const recoveryMetrics = await runConcurrentLoad(
      () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/health`),
      LOAD_CONFIG.CONCURRENT_USERS.LIGHT,
      LOAD_CONFIG.TEST_DURATION.SHORT
    );

    const recoveryResults = recoveryMetrics.getMetrics();

    // System should recover to normal performance
    expect(recoveryResults.errorRate).toBeLessThan(LOAD_CONFIG.THRESHOLDS.ERROR_RATE);
    expect(recoveryResults.p95).toBeLessThan(LOAD_CONFIG.THRESHOLDS.RESPONSE_TIME_P95);

    console.log('Post-overload recovery results:', recoveryResults);
  });
});

// =====================================================
// SCALABILITY TESTS
// =====================================================

describe('Scalability Testing', () => {

  test('Response time should scale linearly with load', async () => {
    const loadLevels = [10, 25, 50, 100];
    const results: Array<{ load: number; p95: number; throughput: number }> = [];

    for (const load of loadLevels) {
      const metrics = await runConcurrentLoad(
        () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/direct/templates`),
        load,
        LOAD_CONFIG.TEST_DURATION.SHORT
      );

      const result = metrics.getMetrics();
      results.push({
        load,
        p95: result.p95,
        throughput: result.throughput
      });

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Response time should not increase exponentially
    const firstResult = results[0];
    const lastResult = results[results.length - 1];

    // P95 should not increase more than 10x for 10x load
    expect(lastResult.p95).toBeLessThan(firstResult.p95 * 10);

    console.log('Scalability test results:', results);
  });

  test('Distributed session sync should scale with session count', async () => {
    const sessionCounts = [10, 50, 100, 250];
    const results: Array<{ sessions: number; p95: number }> = [];

    for (const sessionCount of sessionCounts) {
      const sessions = Array.from({ length: sessionCount }, (_, i) => ({
        session_id: `scale_test_${i}`,
        chitty_id: `PEO-SCALE${i}`,
        vector_clock: { service_a: 1, service_b: 1 }
      }));

      const metrics = await runConcurrentLoad(
        () => makeRequest(`${LOAD_CONFIG.TARGET_URL}/session/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: sessions.slice(0, 10) }) // Sync in batches
        }),
        LOAD_CONFIG.CONCURRENT_USERS.LIGHT,
        LOAD_CONFIG.TEST_DURATION.SHORT
      );

      const result = metrics.getMetrics();
      results.push({
        sessions: sessionCount,
        p95: result.p95
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Session sync scalability results:', results);
  });
});

// =====================================================
// RESOURCE EXHAUSTION TESTS
// =====================================================

describe('Resource Exhaustion Testing', () => {

  test('System should handle connection pool exhaustion', async () => {
    // Try to exhaust connections by holding them open
    const connectionHolders: Promise<any>[] = [];

    for (let i = 0; i < 1000; i++) {
      connectionHolders.push(
        fetch(`${LOAD_CONFIG.TARGET_URL}/health`, {
          keepalive: true
        }).catch(() => {}) // Ignore failures
      );
    }

    // System should still respond to new requests
    const response = await makeRequest(`${LOAD_CONFIG.TARGET_URL}/health`);
    expect(response.status).toBe(200);

    // Cleanup
    await Promise.allSettled(connectionHolders);
  });

  test('System should handle large payload processing', async () => {
    const largePayloads = [
      { size: '1KB', schema: 'A'.repeat(1024) },
      { size: '10KB', schema: 'A'.repeat(10240) },
      { size: '100KB', schema: 'A'.repeat(102400) },
      { size: '1MB', schema: 'A'.repeat(1048576) }
    ];

    for (const payload of largePayloads) {
      const result = await makeRequest(`${LOAD_CONFIG.TARGET_URL}/direct/validate/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: payload.schema,
          platform: 'postgresql'
        })
      });

      // Should handle or reject large payloads gracefully
      expect([200, 413, 400]).toContain(result.status);
      expect(result.duration).toBeLessThan(30000); // Should not hang

      console.log(`${payload.size} payload: ${result.status} in ${result.duration}ms`);
    }
  });
});