/**
 * Global Jest test setup
 *
 * This file runs before each test file and sets up common test utilities,
 * environment variables, and global configurations.
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for all tests
jest.setTimeout(30000);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chitty_test';
process.env.CHITTY_REGISTRY_URL = process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc';

// Disable external network calls in tests unless explicitly enabled
if (!process.env.ENABLE_EXTERNAL_CALLS) {
  process.env.CHITTY_REGISTRY_URL = 'http://localhost:3001/mock-registry';
}

// Global test utilities
global.testUtils = {
  // Common test data generators
  generateTestSessionContext: () => ({
    sessionId: `test-session-${Date.now()}`,
    userId: 'test-user',
    trustLevel: 'authenticated',
    permissions: ['read', 'write'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
    metadata: {
      source: 'test-suite',
      environment: 'test'
    }
  }),

  generateTestPipelineToken: () => ({
    __brand: 'PipelineToken' as const,
    sessionId: `test-session-${Date.now()}`,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    permissions: ['id-generation'],
    trustLevel: 'authenticated'
  }),

  generateTestChittyID: (namespace: string = 'TEST') => {
    const identifier = Math.random().toString(16).slice(2, 18).toUpperCase();
    return `CHITTY-${namespace}-${identifier}`;
  },

  // Async utilities
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock server utilities
  createMockResponse: (data: any, status: number = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Map([['content-type', 'application/json']])
  })
};

// Global mock implementations
global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
  // Default mock fetch implementation
  if (url.includes('/health')) {
    return Promise.resolve(global.testUtils.createMockResponse({ status: 'healthy' }));
  }

  if (url.includes('registry.chitty.cc')) {
    return Promise.resolve(global.testUtils.createMockResponse({
      services: [
        {
          id: 'chitty-id-service',
          name: 'ChittyID Generation Service',
          version: '1.0.0',
          endpoints: { primary: 'https://id.chitty.cc' },
          pipelineCompliant: true,
          capabilities: ['id-generation'],
          dependencies: [],
          enforcement: { level: 'strict', interceptChittyId: true, requirePipelineToken: true }
        }
      ]
    }));
  }

  // Default 404 for unmocked endpoints
  return Promise.resolve(global.testUtils.createMockResponse(
    { error: 'Not found', url }, 404
  ));
});

// Console suppression for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Suppress console output in tests unless DEBUG is set
  if (!process.env.DEBUG && !process.env.VERBOSE_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

afterEach(() => {
  // Restore console
  jest.restoreAllMocks();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, just log
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in tests, just log
});

// Performance monitoring
const testStartTimes = new Map<string, number>();

beforeEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName) {
    testStartTimes.set(testName, Date.now());
  }
});

afterEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName && testStartTimes.has(testName)) {
    const duration = Date.now() - testStartTimes.get(testName)!;
    testStartTimes.delete(testName);

    // Log slow tests
    if (duration > 5000 && process.env.WARN_SLOW_TESTS) {
      console.warn(`⚠️ Slow test detected: ${testName} took ${duration}ms`);
    }
  }
});

// Test isolation helpers
export const testHelpers = {
  // Database helpers
  cleanupDatabase: async () => {
    // Implementation would clean test database
    console.log('🧹 Cleaning up test database...');
  },

  // Mock helpers
  mockChittyOSService: (serviceId: string, responses: Record<string, any>) => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      for (const [endpoint, response] of Object.entries(responses)) {
        if (url.includes(endpoint)) {
          return Promise.resolve(global.testUtils.createMockResponse(response));
        }
      }
      return Promise.resolve(global.testUtils.createMockResponse({ error: 'Not mocked' }, 404));
    });

    global.fetch = mockFetch;
    return mockFetch;
  },

  // Security test helpers
  createMaliciousPayload: (type: 'sql' | 'xss' | 'command') => {
    const payloads = {
      sql: "'; DROP TABLE users; --",
      xss: '<script>alert("XSS")</script>',
      command: '; rm -rf /'
    };
    return payloads[type];
  },

  // Load test helpers
  generateLoadTestData: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `Test Item ${i}`,
      data: `Test data for item ${i}`,
      timestamp: new Date().toISOString()
    }));
  }
};

// Export for use in test files
declare global {
  var testUtils: {
    generateTestSessionContext: () => any;
    generateTestPipelineToken: () => any;
    generateTestChittyID: (namespace?: string) => string;
    waitFor: (ms: number) => Promise<void>;
    createMockResponse: (data: any, status?: number) => any;
  };

  var fetch: jest.MockedFunction<typeof fetch>;
}