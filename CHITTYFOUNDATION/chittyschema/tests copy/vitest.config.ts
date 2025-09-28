import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test timeout
    testTimeout: 30000,

    // Hook timeouts
    hookTimeout: 10000,

    // Test file patterns
    include: [
      '**/*.test.ts',
      '**/*-tests.ts',
      '**/qa-test-suite.ts',
      '**/penetration-tests.ts',
      '**/load-testing.ts',
      '**/security-automation.ts'
    ],

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'test-results/**',
      'coverage/**'
    ],

    // Global setup/teardown
    globalSetup: './test-setup.ts',

    // Reporters
    reporters: ['verbose', 'json', 'junit'],

    // Output files
    outputFile: {
      json: './test-results/test-results.json',
      junit: './test-results/test-results.xml'
    },

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './test-results/coverage',
      exclude: [
        'node_modules/**',
        'test-results/**',
        '**/*.test.ts',
        '**/*-tests.ts',
        'test-setup.ts',
        'test-runner.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },

    // Retry configuration
    retry: 2,

    // Bail on first failure for critical tests
    bail: process.env.NODE_ENV === 'production' ? 1 : 0,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: process.env.CI ? 2 : 4,
        minThreads: 1
      }
    },

    // Test isolation
    isolate: true,

    // Environment variables
    env: {
      NODE_ENV: 'test',
      CHITTY_SCHEMA_URL: process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001',
      CHITTY_ID_PIPELINE_URL: process.env.CHITTY_ID_PIPELINE_URL || 'http://localhost:3001/pipeline'
    }
  }
});