/**
 * Simple Test Setup
 * Minimal setup for testing without complex mocking
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/chitty_test';
process.env.CHITTY_REGISTRY_URL = 'https://registry.chitty.cc';

// Test timeouts
export const testTimeout = {
  short: 5000,
  medium: 15000,
  long: 30000
};

// Setup test environment
export async function setupTestEnvironment() {
  // Basic test setup without complex mocking
  console.log('Setting up test environment...');
}

export const mockServices = {
  // Mock service configurations
};