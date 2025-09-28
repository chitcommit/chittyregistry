/**
 * Global test setup for ChittyChain Schema tests
 * Initializes test environment and provides shared utilities
 */

// Set up test environment
global.console = console;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CHITTY_SCHEMA_URL = process.env.CHITTY_SCHEMA_URL || 'https://schema.chitty.cc';
process.env.CHITTY_ID_PIPELINE_URL = process.env.CHITTY_ID_PIPELINE_URL || 'https://id.chitty.cc/pipeline';

// Mock fetch for offline testing if endpoints are not available
const originalFetch = global.fetch;

// Setup function called before all tests
export async function setup() {
  console.log('🔧 Setting up ChittyChain Schema test environment...');

  // Ensure test directories exist
  const fs = await import('fs');
  const path = await import('path');

  const testResultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  console.log('✅ Test environment ready');
}

// Teardown function called after all tests
export async function teardown() {
  console.log('🧹 Cleaning up test environment...');
  // Cleanup logic here if needed
  console.log('✅ Test environment cleaned up');
}