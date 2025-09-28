/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',

  // TypeScript support
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Test directory structure
  roots: [
    '<rootDir>/tests',
    '<rootDir>/src'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Higher thresholds for critical components
    './src/platforms/macos/core/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/platforms/macos/extensions/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Test setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Test timeouts
  testTimeout: 30000, // 30 seconds default
  slowTestThreshold: 10000, // 10 seconds

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        suiteName: 'ChittyOS Test Suite',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'test-report.html',
        pageTitle: 'ChittyOS Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false
      }
    ]
  ],

  // Custom test configurations by category
  projects: [
    // QA Tests
    {
      displayName: 'QA Tests',
      testMatch: ['<rootDir>/tests/qa/**/*.test.ts'],
      testTimeout: 60000, // 1 minute for QA tests
      setupFilesAfterEnv: ['<rootDir>/tests/qa/qa-setup.ts'],
      globalSetup: '<rootDir>/tests/qa/qa-global-setup.ts',
      coverageDirectory: 'coverage/qa'
    },

    // Security Tests
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      testTimeout: 120000, // 2 minutes for security tests
      setupFilesAfterEnv: ['<rootDir>/tests/security/security-setup.ts'],
      globalSetup: '<rootDir>/tests/security/security-global-setup.ts',
      coverageDirectory: 'coverage/security',
      // Disable coverage for security tests as they focus on vulnerabilities
      collectCoverage: false
    },

    // Load/Performance Tests
    {
      displayName: 'Load Tests',
      testMatch: ['<rootDir>/tests/load/**/*.test.ts'],
      testTimeout: 300000, // 5 minutes for load tests
      setupFilesAfterEnv: ['<rootDir>/tests/load/load-setup.ts'],
      coverageDirectory: 'coverage/load',
      // Minimal coverage for load tests
      collectCoverage: false
    },

    // Integration Tests
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 180000, // 3 minutes for integration tests
      setupFilesAfterEnv: ['<rootDir>/tests/integration/integration-setup.ts'],
      coverageDirectory: 'coverage/integration'
    },

    // Unit Tests
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/src/**/*.spec.ts'
      ],
      testTimeout: 10000, // 10 seconds for unit tests
      coverageDirectory: 'coverage/unit'
    }
  ],

  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Module path mapping for imports
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020'
      }
    }]
  },

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: [
    'node_modules',
    'src/lib/db.ts' // Don't mock database for integration tests
  ],

  // Snapshot serializers
  snapshotSerializers: [],

  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Fail tests on console errors/warnings in test mode
  verbose: true,
  silent: false,

  // Custom matchers and expect extensions
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/custom-matchers.ts'
  ],

  // Error handling
  errorOnDeprecated: true,
  bail: false, // Don't stop on first failure unless specified

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Dependency extraction (for watch mode optimization)
  dependencyExtractor: undefined,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles that prevent Jest from exiting cleanly
  detectOpenHandles: true,

  // Detect leaked globals
  detectLeaks: false,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Notify mode for watch
  notify: false,
  notifyMode: 'failure-change',

  // Pass with no tests (useful for conditional test runs)
  passWithNoTests: true,

  // Random seed for test order determinism
  randomize: false,

  // Test name pattern filtering
  testNamePattern: undefined,

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.git/'
  ],

  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.git/',
    '/coverage/',
    '/test-results/'
  ],

  // Custom test results processor
  testResultsProcessor: undefined,

  // Custom test runner
  testRunner: 'jest-circus/runner',

  // Test sequence configuration
  testSequencer: '@jest/test-sequencer',

  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@babel/runtime/helpers/esm/))'
  ]
};