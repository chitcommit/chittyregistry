/**
 * Global Jest Setup
 *
 * Runs once before all test suites
 */

export default async function globalSetup() {
  console.log('🔧 Setting up global test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/chitty_test';
  process.env.CHITTY_REGISTRY_URL = process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc';

  // Disable sync operations in test mode
  process.env.NOTION_SYNC_ENABLED = 'false';
  process.env.REGISTRY_AUTO_SYNC = 'false';

  console.log('✅ Global test environment setup complete');
}