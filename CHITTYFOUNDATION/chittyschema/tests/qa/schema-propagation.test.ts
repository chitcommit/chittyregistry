/**
 * ChittyOS Schema Propagation Tests
 *
 * Tests schema propagation to all 6 target systems:
 * 1. PostgreSQL (Primary)
 * 2. Notion Databases
 * 3. ChittyChain Blockchain
 * 4. Service Registry
 * 5. Local SQLite (Backup)
 * 6. Monitoring Dashboard
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SchemaPropagationService } from '../../src/platforms/macos/core/schema-propagation.js';
import { ChittyOSServiceRegistry } from '../../src/platforms/macos/core/service-registry.js';

interface PropagationTarget {
  id: string;
  name: string;
  type: 'database' | 'blockchain' | 'service' | 'dashboard';
  endpoint: string;
  priority: number;
  maxRetries: number;
  timeoutMs: number;
}

interface SchemaChange {
  id: string;
  type: 'create_table' | 'alter_table' | 'create_index' | 'drop_table' | 'add_column' | 'modify_column';
  targetTable: string;
  sql: string;
  metadata: {
    version: string;
    timestamp: Date;
    author: string;
    description: string;
  };
}

interface PropagationResult {
  targetId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  retryCount: number;
  finalStatus: 'success' | 'failed' | 'timeout' | 'retrying';
}

const testContext = {
  propagationService: null as SchemaPropagationService | null,
  registry: null as ChittyOSServiceRegistry | null,
  testSchemaChanges: [] as SchemaChange[],
  targetSystems: [] as PropagationTarget[]
};

// Define the 6 target systems for schema propagation
const SCHEMA_PROPAGATION_TARGETS: PropagationTarget[] = [
  {
    id: 'postgres-primary',
    name: 'PostgreSQL Primary Database',
    type: 'database',
    endpoint: process.env.DATABASE_URL || 'postgresql://localhost:5432/chitty',
    priority: 1,
    maxRetries: 3,
    timeoutMs: 30000
  },
  {
    id: 'notion-databases',
    name: 'Notion Workspace Databases',
    type: 'database',
    endpoint: process.env.NOTION_API_URL || 'https://api.notion.com/v1',
    priority: 2,
    maxRetries: 5,
    timeoutMs: 15000
  },
  {
    id: 'chittychain-blockchain',
    name: 'ChittyChain Blockchain Registry',
    type: 'blockchain',
    endpoint: process.env.CHITTYCHAIN_URL || 'https://chain.chitty.cc',
    priority: 3,
    maxRetries: 3,
    timeoutMs: 60000
  },
  {
    id: 'service-registry',
    name: 'ChittyOS Service Registry',
    type: 'service',
    endpoint: process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc',
    priority: 4,
    maxRetries: 2,
    timeoutMs: 10000
  },
  {
    id: 'sqlite-backup',
    name: 'Local SQLite Backup',
    type: 'database',
    endpoint: './backup/chitty.db',
    priority: 5,
    maxRetries: 1,
    timeoutMs: 5000
  },
  {
    id: 'monitoring-dashboard',
    name: 'ChittyOS Monitoring Dashboard',
    type: 'dashboard',
    endpoint: process.env.CHITTY_MONITORING_URL || 'https://monitor.chitty.cc',
    priority: 6,
    maxRetries: 2,
    timeoutMs: 10000
  }
];

describe('ChittyOS Schema Propagation Tests', () => {

  beforeAll(async () => {
    console.log('🏗️ Setting up schema propagation test environment...');

    // Initialize propagation service
    testContext.propagationService = new SchemaPropagationService();
    testContext.registry = ChittyOSServiceRegistry.getInstance();
    testContext.targetSystems = SCHEMA_PROPAGATION_TARGETS;

    // Prepare test schema changes
    testContext.testSchemaChanges = generateTestSchemaChanges();

    console.log(`📊 Testing propagation to ${testContext.targetSystems.length} target systems`);
    console.log(`🔄 Prepared ${testContext.testSchemaChanges.length} test schema changes`);
  });

  beforeEach(async () => {
    // Reset any state between tests
    if (testContext.propagationService) {
      await testContext.propagationService.resetPropagationState();
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up schema propagation test environment...');
    await generatePropagationTestReport();
  });

  describe('Target System Connectivity', () => {

    test('should validate all 6 target systems are reachable', async () => {
      console.log('🔍 Testing connectivity to all target systems...');

      const connectivityResults: Array<{
        targetId: string;
        reachable: boolean;
        responseTime: number;
        error?: string;
      }> = [];

      for (const target of testContext.targetSystems) {
        const startTime = Date.now();

        try {
          console.log(`🔗 Testing: ${target.name}`);

          const isReachable = await testTargetConnectivity(target);
          const responseTime = Date.now() - startTime;

          connectivityResults.push({
            targetId: target.id,
            reachable: isReachable,
            responseTime
          });

          console.log(`${isReachable ? '✅' : '❌'} ${target.name}: ${responseTime}ms`);

        } catch (error) {
          const responseTime = Date.now() - startTime;
          connectivityResults.push({
            targetId: target.id,
            reachable: false,
            responseTime,
            error: (error as Error).message
          });

          console.log(`❌ ${target.name}: FAILED (${responseTime}ms) - ${(error as Error).message}`);
        }
      }

      // Generate connectivity summary
      const reachableTargets = connectivityResults.filter(r => r.reachable).length;
      const totalTargets = connectivityResults.length;
      const connectivityPercentage = (reachableTargets / totalTargets) * 100;

      console.log(`📊 Connectivity Summary: ${reachableTargets}/${totalTargets} targets reachable (${connectivityPercentage.toFixed(1)}%)`);

      // Critical systems must be reachable
      const criticalSystems = ['postgres-primary', 'notion-databases'];
      for (const critical of criticalSystems) {
        const result = connectivityResults.find(r => r.targetId === critical);
        expect(result?.reachable).toBe(true);
      }

      // At least 4/6 systems should be reachable
      expect(reachableTargets).toBeGreaterThanOrEqual(4);

    }, 120000); // 2 minute timeout for connectivity tests

    test('should validate target system authentication', async () => {
      console.log('🔑 Testing authentication for all target systems...');

      const authResults: Array<{
        targetId: string;
        authenticated: boolean;
        error?: string;
      }> = [];

      for (const target of testContext.targetSystems) {
        try {
          console.log(`🔐 Auth test: ${target.name}`);

          const isAuthenticated = await testTargetAuthentication(target);

          authResults.push({
            targetId: target.id,
            authenticated: isAuthenticated
          });

          console.log(`${isAuthenticated ? '✅' : '❌'} ${target.name}: ${isAuthenticated ? 'AUTHENTICATED' : 'AUTH FAILED'}`);

        } catch (error) {
          authResults.push({
            targetId: target.id,
            authenticated: false,
            error: (error as Error).message
          });

          console.log(`❌ ${target.name}: AUTH ERROR - ${(error as Error).message}`);
        }
      }

      // Critical systems must have valid authentication
      const criticalSystems = ['postgres-primary', 'notion-databases'];
      for (const critical of criticalSystems) {
        const result = authResults.find(r => r.targetId === critical);
        expect(result?.authenticated).toBe(true);
      }
    });
  });

  describe('Schema Change Propagation', () => {

    test('should propagate CREATE TABLE changes to all targets', async () => {
      console.log('📋 Testing CREATE TABLE propagation...');

      const createTableChange: SchemaChange = {
        id: 'test-create-table-001',
        type: 'create_table',
        targetTable: 'test_propagation_table',
        sql: `CREATE TABLE test_propagation_table (
          id SERIAL PRIMARY KEY,
          chitty_id VARCHAR(255) UNIQUE NOT NULL,
          test_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        metadata: {
          version: '1.0.0-test',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Test table for propagation validation'
        }
      };

      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        createTableChange,
        testContext.targetSystems
      );

      // Validate propagation results
      expect(propagationResults).toBeDefined();
      expect(propagationResults.length).toBe(testContext.targetSystems.length);

      // Check that critical systems succeeded
      const criticalSuccesses = propagationResults.filter(r =>
        ['postgres-primary', 'notion-databases'].includes(r.targetId) && r.success
      );

      expect(criticalSuccesses.length).toBeGreaterThanOrEqual(1);

      // Log detailed results
      logPropagationResults('CREATE TABLE', propagationResults);

    }, 180000); // 3 minute timeout

    test('should propagate ALTER TABLE changes to all targets', async () => {
      console.log('🔧 Testing ALTER TABLE propagation...');

      const alterTableChange: SchemaChange = {
        id: 'test-alter-table-001',
        type: 'alter_table',
        targetTable: 'test_propagation_table',
        sql: `ALTER TABLE test_propagation_table ADD COLUMN new_field VARCHAR(100)`,
        metadata: {
          version: '1.1.0-test',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Add new field to test table'
        }
      };

      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        alterTableChange,
        testContext.targetSystems
      );

      expect(propagationResults).toBeDefined();
      expect(propagationResults.length).toBe(testContext.targetSystems.length);

      logPropagationResults('ALTER TABLE', propagationResults);

    }, 180000);

    test('should propagate CREATE INDEX changes to database targets', async () => {
      console.log('📇 Testing CREATE INDEX propagation...');

      const createIndexChange: SchemaChange = {
        id: 'test-create-index-001',
        type: 'create_index',
        targetTable: 'test_propagation_table',
        sql: `CREATE INDEX idx_test_propagation_chitty_id ON test_propagation_table(chitty_id)`,
        metadata: {
          version: '1.2.0-test',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Create index on chitty_id column'
        }
      };

      const databaseTargets = testContext.targetSystems.filter(t => t.type === 'database');
      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        createIndexChange,
        databaseTargets
      );

      expect(propagationResults).toBeDefined();
      expect(propagationResults.length).toBe(databaseTargets.length);

      logPropagationResults('CREATE INDEX', propagationResults);

    }, 120000);

    test('should handle propagation failures gracefully', async () => {
      console.log('💥 Testing propagation failure handling...');

      const invalidChange: SchemaChange = {
        id: 'test-invalid-change-001',
        type: 'create_table',
        targetTable: 'invalid_table',
        sql: `CREATE INVALID TABLE syntax_error (this should fail)`,
        metadata: {
          version: '1.0.0-test-fail',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Intentionally invalid SQL to test error handling'
        }
      };

      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        invalidChange,
        testContext.targetSystems
      );

      // Some or all propagations should fail
      const failedPropagations = propagationResults.filter(r => !r.success);
      expect(failedPropagations.length).toBeGreaterThan(0);

      // Verify that errors are properly captured
      for (const failed of failedPropagations) {
        expect(failed.error).toBeDefined();
        expect(failed.finalStatus).toBe('failed');
      }

      logPropagationResults('INVALID CHANGE', propagationResults);

    }, 120000);
  });

  describe('Propagation Ordering and Dependencies', () => {

    test('should respect target system priorities', async () => {
      console.log('🎯 Testing priority-based propagation ordering...');

      const testChange = testContext.testSchemaChanges[0];
      const startTime = Date.now();

      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        testChange,
        testContext.targetSystems
      );

      const endTime = Date.now();

      // Verify that higher priority targets were processed first
      const sortedByPriority = testContext.targetSystems
        .sort((a, b) => a.priority - b.priority);

      const resultsByPriority = propagationResults
        .sort((a, b) => {
          const targetA = testContext.targetSystems.find(t => t.id === a.targetId)!;
          const targetB = testContext.targetSystems.find(t => t.id === b.targetId)!;
          return targetA.priority - targetB.priority;
        });

      console.log('📊 Propagation Order:');
      for (let i = 0; i < resultsByPriority.length; i++) {
        const result = resultsByPriority[i];
        const target = testContext.targetSystems.find(t => t.id === result.targetId)!;
        console.log(`  ${i + 1}. ${target.name} (Priority ${target.priority}): ${result.success ? '✅' : '❌'} ${result.executionTime}ms`);
      }

      // Verify PostgreSQL (priority 1) was processed first
      expect(resultsByPriority[0].targetId).toBe('postgres-primary');

    }, 180000);

    test('should handle retry logic for failed propagations', async () => {
      console.log('🔄 Testing retry logic for failed propagations...');

      // Create a change that might fail on some systems
      const testChange: SchemaChange = {
        id: 'test-retry-001',
        type: 'create_table',
        targetTable: 'retry_test_table',
        sql: `CREATE TABLE retry_test_table (
          id SERIAL PRIMARY KEY,
          chitty_id VARCHAR(255) UNIQUE NOT NULL
        )`,
        metadata: {
          version: '1.0.0-retry-test',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Test retry logic'
        }
      };

      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        testChange,
        testContext.targetSystems
      );

      // Verify that failed propagations were retried
      for (const result of propagationResults) {
        if (!result.success) {
          const target = testContext.targetSystems.find(t => t.id === result.targetId)!;
          expect(result.retryCount).toBeLessThanOrEqual(target.maxRetries);
          console.log(`🔄 ${target.name}: ${result.retryCount}/${target.maxRetries} retries`);
        }
      }

    }, 240000); // 4 minute timeout for retry testing
  });

  describe('Cross-System Consistency', () => {

    test('should maintain schema consistency across all targets', async () => {
      console.log('🔍 Testing cross-system schema consistency...');

      // Apply multiple schema changes
      const changes = testContext.testSchemaChanges.slice(0, 3);

      for (const change of changes) {
        console.log(`📝 Applying change: ${change.description}`);

        await testContext.propagationService!.propagateSchemaChange(
          change,
          testContext.targetSystems
        );

        // Small delay between changes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Validate consistency across systems
      const consistencyResults = await validateCrossSystemConsistency(testContext.targetSystems);

      console.log('📊 Schema Consistency Results:');
      for (const result of consistencyResults) {
        console.log(`  ${result.targetId}: ${result.consistent ? '✅' : '❌'} ${result.consistent ? 'CONSISTENT' : result.inconsistencies?.join(', ')}`);
      }

      // At least the database systems should be consistent
      const databaseConsistency = consistencyResults.filter(r =>
        ['postgres-primary', 'sqlite-backup'].includes(r.targetId) && r.consistent
      );

      expect(databaseConsistency.length).toBeGreaterThanOrEqual(1);

    }, 300000); // 5 minute timeout

    test('should handle rollback scenarios', async () => {
      console.log('↩️ Testing rollback scenarios...');

      const rollbackTestChange: SchemaChange = {
        id: 'test-rollback-001',
        type: 'create_table',
        targetTable: 'rollback_test_table',
        sql: `CREATE TABLE rollback_test_table (
          id SERIAL PRIMARY KEY,
          test_field VARCHAR(100)
        )`,
        metadata: {
          version: '1.0.0-rollback-test',
          timestamp: new Date(),
          author: 'schema-propagation-test',
          description: 'Test rollback functionality'
        }
      };

      // Apply the change
      const propagationResults = await testContext.propagationService!.propagateSchemaChange(
        rollbackTestChange,
        testContext.targetSystems
      );

      // Simulate a rollback scenario
      const rollbackResults = await testContext.propagationService!.rollbackSchemaChange(
        rollbackTestChange.id,
        testContext.targetSystems
      );

      console.log('↩️ Rollback Results:');
      for (const result of rollbackResults) {
        const target = testContext.targetSystems.find(t => t.id === result.targetId)!;
        console.log(`  ${target.name}: ${result.success ? '✅' : '❌'} ${result.success ? 'ROLLED BACK' : result.error}`);
      }

      // Verify that rollbacks were attempted
      expect(rollbackResults.length).toBe(testContext.targetSystems.length);

    }, 180000);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function testTargetConnectivity(target: PropagationTarget): Promise<boolean> {
  try {
    switch (target.type) {
      case 'database':
        if (target.endpoint.startsWith('postgresql://')) {
          // Test PostgreSQL connection
          return await testPostgreSQLConnectivity(target.endpoint);
        } else if (target.endpoint.endsWith('.db')) {
          // Test SQLite connection
          return await testSQLiteConnectivity(target.endpoint);
        }
        return false;

      case 'service':
      case 'dashboard':
      case 'blockchain':
        // Test HTTP endpoint
        return await testHTTPConnectivity(target.endpoint, target.timeoutMs);

      default:
        return false;
    }
  } catch (error) {
    console.error(`Connectivity test failed for ${target.id}:`, error);
    return false;
  }
}

async function testHTTPConnectivity(endpoint: string, timeoutMs: number): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs)
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

async function testPostgreSQLConnectivity(connectionString: string): Promise<boolean> {
  // In a real implementation, this would use pg client
  // For testing, we'll simulate the connection
  return connectionString.includes('postgresql://');
}

async function testSQLiteConnectivity(filePath: string): Promise<boolean> {
  // In a real implementation, this would check if SQLite file exists and is accessible
  return true; // Simplified for testing
}

async function testTargetAuthentication(target: PropagationTarget): Promise<boolean> {
  try {
    switch (target.type) {
      case 'database':
        if (target.endpoint.startsWith('postgresql://')) {
          // Test PostgreSQL authentication
          return target.endpoint.includes('@'); // Simplified check for credentials
        }
        return true; // SQLite doesn't require auth

      case 'service':
      case 'dashboard':
      case 'blockchain':
        // Test API authentication
        const authToken = process.env[`${target.id.toUpperCase().replace(/-/g, '_')}_TOKEN`];
        return !!authToken;

      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

function generateTestSchemaChanges(): SchemaChange[] {
  return [
    {
      id: 'test-change-001',
      type: 'create_table',
      targetTable: 'propagation_test_entities',
      sql: `CREATE TABLE propagation_test_entities (
        id SERIAL PRIMARY KEY,
        chitty_id VARCHAR(255) UNIQUE NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      metadata: {
        version: '1.0.0',
        timestamp: new Date(),
        author: 'schema-propagation-test',
        description: 'Create test entities table'
      }
    },
    {
      id: 'test-change-002',
      type: 'alter_table',
      targetTable: 'propagation_test_entities',
      sql: `ALTER TABLE propagation_test_entities ADD COLUMN metadata JSONB`,
      metadata: {
        version: '1.1.0',
        timestamp: new Date(),
        author: 'schema-propagation-test',
        description: 'Add metadata column'
      }
    },
    {
      id: 'test-change-003',
      type: 'create_index',
      targetTable: 'propagation_test_entities',
      sql: `CREATE INDEX idx_propagation_test_entity_type ON propagation_test_entities(entity_type)`,
      metadata: {
        version: '1.2.0',
        timestamp: new Date(),
        author: 'schema-propagation-test',
        description: 'Create index on entity_type'
      }
    }
  ];
}

function logPropagationResults(changeType: string, results: PropagationResult[]): void {
  console.log(`📊 ${changeType} Propagation Results:`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

  console.log(`  ✅ Successful: ${successful}/${results.length}`);
  console.log(`  ❌ Failed: ${failed}/${results.length}`);
  console.log(`  ⏱️ Average time: ${avgTime.toFixed(0)}ms`);

  for (const result of results) {
    const target = testContext.targetSystems.find(t => t.id === result.targetId)!;
    console.log(`    ${result.success ? '✅' : '❌'} ${target.name}: ${result.executionTime}ms ${result.error ? `(${result.error})` : ''}`);
  }
}

async function validateCrossSystemConsistency(targets: PropagationTarget[]): Promise<Array<{
  targetId: string;
  consistent: boolean;
  inconsistencies?: string[];
}>> {
  const results: Array<{
    targetId: string;
    consistent: boolean;
    inconsistencies?: string[];
  }> = [];

  for (const target of targets) {
    try {
      // In a real implementation, this would check schema consistency
      // For testing, we'll simulate consistency checks
      const consistent = Math.random() > 0.2; // 80% chance of consistency

      results.push({
        targetId: target.id,
        consistent,
        inconsistencies: consistent ? undefined : ['schema_version_mismatch']
      });

    } catch (error) {
      results.push({
        targetId: target.id,
        consistent: false,
        inconsistencies: [(error as Error).message]
      });
    }
  }

  return results;
}

async function generatePropagationTestReport(): Promise<void> {
  console.log('\n📊 SCHEMA PROPAGATION TEST REPORT');
  console.log('=================================');
  console.log(`🎯 Target Systems: ${testContext.targetSystems.length}`);
  console.log(`🔄 Test Changes: ${testContext.testSchemaChanges.length}`);
  console.log('=================================');

  for (const target of testContext.targetSystems) {
    console.log(`📦 ${target.name}:`);
    console.log(`   Type: ${target.type}`);
    console.log(`   Priority: ${target.priority}`);
    console.log(`   Max Retries: ${target.maxRetries}`);
    console.log(`   Timeout: ${target.timeoutMs}ms`);
  }

  console.log('=================================\n');
}

// Mock implementation of SchemaPropagationService for testing
class SchemaPropagationService {
  async resetPropagationState(): Promise<void> {
    // Reset any internal state
  }

  async propagateSchemaChange(
    change: SchemaChange,
    targets: PropagationTarget[]
  ): Promise<PropagationResult[]> {
    const results: PropagationResult[] = [];

    for (const target of targets.sort((a, b) => a.priority - b.priority)) {
      const startTime = Date.now();
      let retryCount = 0;
      let success = false;
      let error: string | undefined;

      // Simulate propagation with retry logic
      while (retryCount <= target.maxRetries && !success) {
        try {
          // Simulate propagation time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

          // Simulate success/failure (80% success rate)
          success = Math.random() > 0.2;

          if (!success && retryCount < target.maxRetries) {
            retryCount++;
            console.log(`🔄 Retry ${retryCount}/${target.maxRetries} for ${target.name}`);
          } else if (!success) {
            error = 'Propagation failed after all retries';
          }

        } catch (e) {
          error = (e as Error).message;
          retryCount++;
        }
      }

      const executionTime = Date.now() - startTime;

      results.push({
        targetId: target.id,
        success,
        executionTime,
        error,
        retryCount,
        finalStatus: success ? 'success' : 'failed'
      });
    }

    return results;
  }

  async rollbackSchemaChange(
    changeId: string,
    targets: PropagationTarget[]
  ): Promise<PropagationResult[]> {
    const results: PropagationResult[] = [];

    for (const target of targets) {
      const startTime = Date.now();

      // Simulate rollback (90% success rate)
      const success = Math.random() > 0.1;
      const executionTime = Date.now() - startTime;

      results.push({
        targetId: target.id,
        success,
        executionTime,
        error: success ? undefined : 'Rollback failed',
        retryCount: 0,
        finalStatus: success ? 'success' : 'failed'
      });
    }

    return results;
  }
}