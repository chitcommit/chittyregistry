/**
 * Load Testing Suite for ChittyChain Schema API
 * Performance testing under various load conditions including stress testing and scalability validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const SCHEMA_URL = process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001';

interface LoadTestConfig {
  name: string;
  concurrent: number;
  requests: number;
  duration?: number;
  rampUp?: number;
  endpoints: string[];
}

interface PerformanceMetrics {
  test_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_duration: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  p50_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  throughput: number;
  error_rate: number;
  concurrent_users: number;
}

interface ResponseTimeData {
  timestamp: number;
  response_time: number;
  status: number;
  endpoint: string;
}

describe('ChittyChain Schema Load Testing', () => {
  let client: AxiosInstance;
  let performanceResults: PerformanceMetrics[] = [];

  beforeAll(async () => {
    client = axios.create({
      baseURL: SCHEMA_URL,
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        'Authorization': 'Bearer mock-load-test-token',
        'X-ChittyID': 'CHITTY-LOAD-TEST-001'
      }
    });

    console.log(`⚡ Load testing against: ${SCHEMA_URL}`);
  });

  async function executeLoadTest(config: LoadTestConfig): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const responseTimes: ResponseTimeData[] = [];
    const promises: Promise<any>[] = [];

    console.log(`\n🚀 Starting ${config.name}...`);
    console.log(`📊 Concurrent Users: ${config.concurrent}, Total Requests: ${config.requests}`);

    // Create concurrent user batches
    const requestsPerBatch = Math.floor(config.requests / config.concurrent);
    const rampUpDelay = config.rampUp ? config.rampUp / config.concurrent : 0;

    for (let batch = 0; batch < config.concurrent; batch++) {
      const batchPromise = (async () => {
        // Ramp up delay
        if (rampUpDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, batch * rampUpDelay));
        }

        const batchRequests: Promise<any>[] = [];

        for (let req = 0; req < requestsPerBatch; req++) {
          const endpoint = config.endpoints[req % config.endpoints.length];
          const requestStart = Date.now();

          const requestPromise = client.get(endpoint).then(response => {
            const responseTime = Date.now() - requestStart;
            responseTimes.push({
              timestamp: requestStart,
              response_time: responseTime,
              status: response.status,
              endpoint
            });
            return response;
          }).catch(error => {
            const responseTime = Date.now() - requestStart;
            responseTimes.push({
              timestamp: requestStart,
              response_time: responseTime,
              status: error.response?.status || 0,
              endpoint
            });
            return error.response || { status: 0, data: null };
          });

          batchRequests.push(requestPromise);

          // Add small delay between requests in same batch to avoid overwhelming
          if (req < requestsPerBatch - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        return Promise.all(batchRequests);
      })();

      promises.push(batchPromise);
    }

    // Wait for all requests to complete or timeout
    const allResponses = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    // Flatten responses
    const responses = allResponses.flat();

    // Calculate metrics
    const successfulRequests = responseTimes.filter(r => r.status >= 200 && r.status < 400).length;
    const failedRequests = responseTimes.length - successfulRequests;

    const responseTimesOnly = responseTimes.map(r => r.response_time).sort((a, b) => a - b);
    const avgResponseTime = responseTimesOnly.reduce((a, b) => a + b, 0) / responseTimesOnly.length;

    const p50Index = Math.floor(responseTimesOnly.length * 0.5);
    const p95Index = Math.floor(responseTimesOnly.length * 0.95);
    const p99Index = Math.floor(responseTimesOnly.length * 0.99);

    const metrics: PerformanceMetrics = {
      test_name: config.name,
      total_requests: responseTimes.length,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      total_duration: totalDuration,
      avg_response_time: Math.round(avgResponseTime),
      min_response_time: responseTimesOnly[0] || 0,
      max_response_time: responseTimesOnly[responseTimesOnly.length - 1] || 0,
      p50_response_time: responseTimesOnly[p50Index] || 0,
      p95_response_time: responseTimesOnly[p95Index] || 0,
      p99_response_time: responseTimesOnly[p99Index] || 0,
      throughput: Math.round((responseTimes.length / totalDuration) * 1000), // requests per second
      error_rate: Math.round((failedRequests / responseTimes.length) * 100),
      concurrent_users: config.concurrent
    };

    performanceResults.push(metrics);

    console.log(`✅ ${config.name} completed in ${totalDuration}ms`);
    console.log(`📊 Success Rate: ${Math.round((successfulRequests / responseTimes.length) * 100)}%`);
    console.log(`⚡ Throughput: ${metrics.throughput} req/s`);
    console.log(`⏱️  Avg Response Time: ${metrics.avg_response_time}ms`);
    console.log(`📈 P95 Response Time: ${metrics.p95_response_time}ms`);

    return metrics;
  }

  describe('Basic Load Testing', () => {
    it('should handle health endpoint load', async () => {
      const config: LoadTestConfig = {
        name: 'Health Endpoint Load Test',
        concurrent: 10,
        requests: 100,
        rampUp: 1000,
        endpoints: ['/health', '/version']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(5); // Less than 5% error rate
      expect(metrics.avg_response_time).toBeLessThan(200); // Under 200ms average
      expect(metrics.p95_response_time).toBeLessThan(500); // P95 under 500ms
      expect(metrics.throughput).toBeGreaterThan(50); // At least 50 req/s
    });

    it('should handle schema listing under load', async () => {
      const config: LoadTestConfig = {
        name: 'Schema Listing Load Test',
        concurrent: 15,
        requests: 150,
        rampUp: 2000,
        endpoints: ['/api/schemas', '/api/schemas/templates']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(10); // Less than 10% error rate
      expect(metrics.avg_response_time).toBeLessThan(1000); // Under 1 second average
      expect(metrics.p95_response_time).toBeLessThan(2000); // P95 under 2 seconds
      expect(metrics.throughput).toBeGreaterThan(30); // At least 30 req/s
    });

    it('should handle schema validation under load', async () => {
      const config: LoadTestConfig = {
        name: 'Schema Validation Load Test',
        concurrent: 20,
        requests: 200,
        rampUp: 3000,
        endpoints: ['/api/schemas/validate']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(15); // Less than 15% error rate
      expect(metrics.avg_response_time).toBeLessThan(1500); // Under 1.5 seconds average
      expect(metrics.p99_response_time).toBeLessThan(5000); // P99 under 5 seconds
    });
  });

  describe('Pipeline Authentication Load', () => {
    it('should handle authentication requests under load', async () => {
      const config: LoadTestConfig = {
        name: 'Authentication Load Test',
        concurrent: 25,
        requests: 250,
        rampUp: 2000,
        endpoints: ['/api/auth/validate', '/api/session/info']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(10); // Less than 10% error rate
      expect(metrics.avg_response_time).toBeLessThan(800); // Under 800ms average
      expect(metrics.p95_response_time).toBeLessThan(1500); // P95 under 1.5 seconds
      expect(metrics.throughput).toBeGreaterThan(40); // At least 40 req/s
    });

    it('should handle concurrent session management', async () => {
      const config: LoadTestConfig = {
        name: 'Session Management Load Test',
        concurrent: 30,
        requests: 300,
        rampUp: 5000,
        endpoints: ['/api/session/update', '/api/session/sync']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(20); // Less than 20% error rate (expected conflicts)
      expect(metrics.avg_response_time).toBeLessThan(1200); // Under 1.2 seconds average
      expect(metrics.p95_response_time).toBeLessThan(3000); // P95 under 3 seconds
    });
  });

  describe('Distributed Session Load Testing', () => {
    it('should handle burst traffic on distributed sessions', async () => {
      const config: LoadTestConfig = {
        name: 'Distributed Session Burst Test',
        concurrent: 50,
        requests: 500,
        rampUp: 1000, // Quick ramp-up for burst
        endpoints: [
          '/api/session/create',
          '/api/session/update',
          '/api/session/sync',
          '/api/session/conflict'
        ]
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(25); // Less than 25% error rate (conflicts expected)
      expect(metrics.avg_response_time).toBeLessThan(2000); // Under 2 seconds average
      expect(metrics.throughput).toBeGreaterThan(20); // At least 20 req/s under burst
    });

    it('should maintain consistency under load', async () => {
      const config: LoadTestConfig = {
        name: 'Session Consistency Load Test',
        concurrent: 40,
        requests: 400,
        rampUp: 8000,
        endpoints: ['/api/session/read', '/api/session/write']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(15); // Less than 15% error rate
      expect(metrics.p99_response_time).toBeLessThan(4000); // P99 under 4 seconds
    });
  });

  describe('Notion Webhook Load Testing', () => {
    it('should handle webhook processing under load', async () => {
      const config: LoadTestConfig = {
        name: 'Webhook Processing Load Test',
        concurrent: 35,
        requests: 350,
        rampUp: 5000,
        endpoints: [
          '/api/webhooks/notion/process',
          '/api/webhooks/notion/validate'
        ]
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(12); // Less than 12% error rate
      expect(metrics.avg_response_time).toBeLessThan(1000); // Under 1 second average
      expect(metrics.p95_response_time).toBeLessThan(2500); // P95 under 2.5 seconds
    });

    it('should handle DLQ recovery under load', async () => {
      const config: LoadTestConfig = {
        name: 'DLQ Recovery Load Test',
        concurrent: 20,
        requests: 200,
        rampUp: 3000,
        endpoints: ['/api/webhooks/dlq/process', '/api/webhooks/dlq/retry']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(20); // Less than 20% error rate
      expect(metrics.avg_response_time).toBeLessThan(1500); // Under 1.5 seconds average
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load gracefully', async () => {
      const config: LoadTestConfig = {
        name: 'Extreme Load Stress Test',
        concurrent: 100,
        requests: 1000,
        rampUp: 5000,
        endpoints: [
          '/health',
          '/api/schemas',
          '/api/schemas/validate',
          '/api/session/info'
        ]
      };

      const metrics = await executeLoadTest(config);

      // Under extreme load, higher error rates are acceptable
      expect(metrics.error_rate).toBeLessThan(50); // Less than 50% error rate
      expect(metrics.avg_response_time).toBeLessThan(5000); // Under 5 seconds average
      expect(metrics.throughput).toBeGreaterThan(10); // At least 10 req/s under stress

      // System should not crash
      expect(metrics.total_requests).toBeGreaterThan(500); // At least half requests processed
    });

    it('should recover from stress conditions', async () => {
      // Light load after stress test to verify recovery
      const config: LoadTestConfig = {
        name: 'Post-Stress Recovery Test',
        concurrent: 5,
        requests: 50,
        rampUp: 2000,
        endpoints: ['/health', '/api/schemas']
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(10); // Should recover to low error rate
      expect(metrics.avg_response_time).toBeLessThan(1000); // Should recover to good response times
    });

    it('should handle sustained load', async () => {
      const config: LoadTestConfig = {
        name: 'Sustained Load Test',
        concurrent: 25,
        requests: 500,
        rampUp: 10000, // Gradual ramp-up over 10 seconds
        endpoints: [
          '/api/schemas',
          '/api/schemas/validate',
          '/api/session/info',
          '/api/webhooks/notion/process'
        ]
      };

      const metrics = await executeLoadTest(config);

      expect(metrics.error_rate).toBeLessThan(15); // Less than 15% error rate
      expect(metrics.avg_response_time).toBeLessThan(2000); // Under 2 seconds average
      expect(metrics.throughput).toBeGreaterThan(15); // At least 15 req/s sustained
    });
  });

  describe('Scalability Testing', () => {
    it('should demonstrate linear response time scaling', async () => {
      const loadLevels = [10, 20, 40];
      const scalabilityResults: PerformanceMetrics[] = [];

      for (const concurrent of loadLevels) {
        const config: LoadTestConfig = {
          name: `Scalability Test - ${concurrent} Users`,
          concurrent,
          requests: concurrent * 10,
          rampUp: 2000,
          endpoints: ['/api/schemas', '/api/schemas/validate']
        };

        const metrics = await executeLoadTest(config);
        scalabilityResults.push(metrics);

        // Allow system to cool down between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Verify response times scale reasonably
      for (let i = 1; i < scalabilityResults.length; i++) {
        const prev = scalabilityResults[i - 1];
        const curr = scalabilityResults[i];

        // Response time shouldn't increase more than 3x with 2x load
        const responseTimeRatio = curr.avg_response_time / prev.avg_response_time;
        expect(responseTimeRatio).toBeLessThan(3);

        // Throughput should increase with more concurrent users
        expect(curr.throughput).toBeGreaterThan(prev.throughput * 0.8); // At least 80% scaling
      }
    });

    it('should maintain performance under varying request patterns', async () => {
      // Test different request patterns
      const patterns = [
        { name: 'Read Heavy', endpoints: ['/api/schemas', '/api/schemas', '/api/schemas', '/api/session/info'] },
        { name: 'Write Heavy', endpoints: ['/api/schemas/validate', '/api/schemas/create', '/api/session/update'] },
        { name: 'Mixed Load', endpoints: ['/api/schemas', '/api/schemas/validate', '/api/session/info', '/api/webhooks/notion/process'] }
      ];

      for (const pattern of patterns) {
        const config: LoadTestConfig = {
          name: `Pattern Test - ${pattern.name}`,
          concurrent: 20,
          requests: 200,
          rampUp: 3000,
          endpoints: pattern.endpoints
        };

        const metrics = await executeLoadTest(config);

        expect(metrics.error_rate).toBeLessThan(20); // Less than 20% error rate
        expect(metrics.avg_response_time).toBeLessThan(2000); // Under 2 seconds average

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });
  });

  afterAll(async () => {
    // Generate load testing report
    console.log('\n⚡ Load Testing Results Summary:');
    console.log('=================================');

    const totalTests = performanceResults.length;
    const avgThroughput = performanceResults.reduce((sum, r) => sum + r.throughput, 0) / totalTests;
    const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.avg_response_time, 0) / totalTests;
    const avgErrorRate = performanceResults.reduce((sum, r) => sum + r.error_rate, 0) / totalTests;

    console.log(`Total Load Tests: ${totalTests}`);
    console.log(`Average Throughput: ${Math.round(avgThroughput)} req/s`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`Average Error Rate: ${Math.round(avgErrorRate)}%`);

    // Performance benchmarks
    const passedBenchmarks = performanceResults.filter(r =>
      r.error_rate < 15 &&
      r.avg_response_time < 2000 &&
      r.p95_response_time < 5000
    );

    console.log(`\n📊 Performance Benchmarks:`);
    console.log(`Tests Meeting SLA: ${passedBenchmarks.length}/${totalTests} (${Math.round((passedBenchmarks.length / totalTests) * 100)}%)`);

    // Best and worst performing tests
    const bestThroughput = performanceResults.reduce((best, current) =>
      current.throughput > best.throughput ? current : best
    );

    const worstErrorRate = performanceResults.reduce((worst, current) =>
      current.error_rate > worst.error_rate ? current : worst
    );

    console.log(`\n🏆 Best Throughput: ${bestThroughput.test_name} (${bestThroughput.throughput} req/s)`);
    console.log(`⚠️  Highest Error Rate: ${worstErrorRate.test_name} (${worstErrorRate.error_rate}%)`);

    // Recommendations
    console.log(`\n💡 Performance Recommendations:`);
    if (avgResponseTime > 1000) {
      console.log(`  - Consider response time optimization (current: ${Math.round(avgResponseTime)}ms)`);
    }
    if (avgErrorRate > 10) {
      console.log(`  - Investigate error handling under load (current: ${Math.round(avgErrorRate)}%)`);
    }
    if (avgThroughput < 50) {
      console.log(`  - Consider scaling infrastructure (current: ${Math.round(avgThroughput)} req/s)`);
    }

    if (avgResponseTime <= 1000 && avgErrorRate <= 10 && avgThroughput >= 50) {
      console.log(`  ✅ System meets performance benchmarks!`);
    }
  });
});