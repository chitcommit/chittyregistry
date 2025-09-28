/**
 * Global Jest Teardown
 *
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  // Clean up any global resources
  // Note: Individual test cleanup should be handled in afterEach/afterAll

  console.log('✅ Global test environment cleanup complete');
}