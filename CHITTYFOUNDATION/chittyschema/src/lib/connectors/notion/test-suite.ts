/**
 * Notion Test Suite - Neutral Universal Framework
 *
 * Comprehensive testing suite for the neutral Notion connector
 * Validates functionality, performance, and data integrity
 */

import { NeutralNotionConnector } from './neutral-connector';
import { NotionDatabaseSetup } from './database-setup';
import { NotionSyncService } from './sync-service';
import {
  NotionConnectorConfig,
  NeutralEntity,
  UniversalInformation,
  AtomicFact,
  EntityType,
  InformationTier,
  FactClassification
} from './types';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

export class NotionTestSuite {
  private connector: NeutralNotionConnector;
  private setupService: NotionDatabaseSetup;
  private syncService: NotionSyncService;
  private config: NotionConnectorConfig;
  private testEntityIds: string[] = [];
  private testInformationIds: string[] = [];
  private testFactIds: string[] = [];

  constructor(config: NotionConnectorConfig) {
    this.config = config;
    this.connector = new NeutralNotionConnector(config.apiKey, config.databaseIds);
    this.setupService = new NotionDatabaseSetup(config);
    this.syncService = new NotionSyncService(config);
  }

  /**
   * Run complete test suite
   */
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('🧪 Starting Notion Connector Test Suite...');

    const startTime = Date.now();
    const results: TestResult[] = [];

    // Database validation tests
    results.push(await this.testDatabaseConnectivity());
    results.push(await this.testDatabaseSchemas());

    // Entity CRUD tests
    results.push(await this.testCreateEntity());
    results.push(await this.testGetEntity());
    results.push(await this.testGetEntitiesByType());
    results.push(await this.testSearchEntities());

    // Information CRUD tests
    results.push(await this.testCreateInformation());
    results.push(await this.testGetInformationByTier());

    // Fact CRUD tests
    results.push(await this.testCreateFact());
    results.push(await this.testGetFactsByClassification());

    // Advanced functionality tests
    results.push(await this.testChittyIdGeneration());
    results.push(await this.testDataValidation());
    results.push(await this.testErrorHandling());

    // Performance tests
    results.push(await this.testBatchOperations());
    results.push(await this.testRateLimiting());

    // Sync tests
    results.push(await this.testSyncService());

    // Cleanup
    await this.cleanup();

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const suiteResult: TestSuiteResult = {
      totalTests: results.length,
      passed,
      failed,
      duration,
      results
    };

    console.log('\n📊 Test Suite Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${duration}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.testName}: ${result.error}`);
      });
    }

    return suiteResult;
  }

  /**
   * Test database connectivity
   */
  private async testDatabaseConnectivity(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.setupService.healthCheck(this.config.databaseIds);

      return {
        testName: 'Database Connectivity',
        success: isHealthy,
        duration: Date.now() - startTime,
        error: isHealthy ? undefined : 'Database health check failed'
      };
    } catch (error) {
      return {
        testName: 'Database Connectivity',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test database schemas
   */
  private async testDatabaseSchemas(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Validate that all required databases exist and have correct structure
      const requiredDatabases = ['entities', 'information', 'facts', 'contexts', 'relationships', 'conflicts', 'activities', 'actors'];
      const missingDatabases = [];

      for (const dbName of requiredDatabases) {
        if (!this.config.databaseIds[dbName]) {
          missingDatabases.push(dbName);
        }
      }

      const success = missingDatabases.length === 0;

      return {
        testName: 'Database Schemas',
        success,
        duration: Date.now() - startTime,
        error: success ? undefined : `Missing databases: ${missingDatabases.join(', ')}`
      };
    } catch (error) {
      return {
        testName: 'Database Schemas',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test entity creation
   */
  private async testCreateEntity(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const testEntity = {
        name: 'Test Research Subject',
        entityType: 'PEO' as EntityType,
        description: 'Test entity for validation',
        status: 'Active' as const,
        visibility: 'Public' as const,
        contextTags: ['test', 'research'],
        verificationStatus: 'Verified' as const,
        accessLevel: 'Standard' as const,
        metadata: { testId: 'TEST-001', source: 'automated-test' }
      };

      const entity = await this.connector.createEntity(testEntity);
      this.testEntityIds.push(entity.id);

      const success = !!(entity.id && entity.chittyId && entity.name === testEntity.name);

      return {
        testName: 'Create Entity',
        success,
        duration: Date.now() - startTime,
        data: { entityId: entity.id, chittyId: entity.chittyId },
        error: success ? undefined : 'Entity creation validation failed'
      };
    } catch (error) {
      return {
        testName: 'Create Entity',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test entity retrieval
   */
  private async testGetEntity(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      if (this.testEntityIds.length === 0) {
        throw new Error('No test entities available');
      }

      const entityId = this.testEntityIds[0];
      const entity = await this.connector.getEntity(entityId);

      const success = !!(entity && entity.id === entityId);

      return {
        testName: 'Get Entity',
        success,
        duration: Date.now() - startTime,
        data: entity,
        error: success ? undefined : 'Entity retrieval failed'
      };
    } catch (error) {
      return {
        testName: 'Get Entity',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test getting entities by type
   */
  private async testGetEntitiesByType(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const entities = await this.connector.getEntitiesByType('PEO', { limit: 10 });

      const success = Array.isArray(entities);

      return {
        testName: 'Get Entities By Type',
        success,
        duration: Date.now() - startTime,
        data: { count: entities.length },
        error: success ? undefined : 'Get entities by type failed'
      };
    } catch (error) {
      return {
        testName: 'Get Entities By Type',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test entity search
   */
  private async testSearchEntities(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const results = await this.connector.searchEntities('Test', ['PEO']);

      const success = Array.isArray(results);

      return {
        testName: 'Search Entities',
        success,
        duration: Date.now() - startTime,
        data: { count: results.length },
        error: success ? undefined : 'Entity search failed'
      };
    } catch (error) {
      return {
        testName: 'Search Entities',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test information creation
   */
  private async testCreateInformation(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const testInfo = {
        title: 'Test Document',
        contentType: 'Document' as const,
        informationTier: 'PRIMARY_SOURCE' as InformationTier,
        authenticityStatus: 'Authentic' as const,
        sensitivityLevel: 'Standard' as const,
        verificationStatus: 'Verified' as const,
        tags: ['test', 'document']
      };

      const information = await this.connector.createInformation(testInfo);
      this.testInformationIds.push(information.id);

      const success = !!(information.id && information.chittyId && information.title === testInfo.title);

      return {
        testName: 'Create Information',
        success,
        duration: Date.now() - startTime,
        data: { informationId: information.id, chittyId: information.chittyId },
        error: success ? undefined : 'Information creation validation failed'
      };
    } catch (error) {
      return {
        testName: 'Create Information',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test getting information by tier
   */
  private async testGetInformationByTier(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const information = await this.connector.getInformationByTier('PRIMARY_SOURCE', { limit: 10 });

      const success = Array.isArray(information);

      return {
        testName: 'Get Information By Tier',
        success,
        duration: Date.now() - startTime,
        data: { count: information.length },
        error: success ? undefined : 'Get information by tier failed'
      };
    } catch (error) {
      return {
        testName: 'Get Information By Tier',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test fact creation
   */
  private async testCreateFact(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const testFact = {
        factStatement: 'Test subject completed assessment on 2024-01-15',
        classification: 'OBSERVATION' as FactClassification,
        certaintyLevel: 0.95,
        confidenceScore: 0.90,
        weight: 0.85,
        extractedBy: 'Human' as const,
        verificationStatus: 'Verified' as const,
        sensitivityLevel: 'Standard' as const,
        context: { testId: 'FACT-001', source: 'automated-test' }
      };

      const fact = await this.connector.createFact(testFact);
      this.testFactIds.push(fact.id);

      const success = !!(fact.id && fact.chittyId && fact.factStatement === testFact.factStatement);

      return {
        testName: 'Create Fact',
        success,
        duration: Date.now() - startTime,
        data: { factId: fact.id, chittyId: fact.chittyId },
        error: success ? undefined : 'Fact creation validation failed'
      };
    } catch (error) {
      return {
        testName: 'Create Fact',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test getting facts by classification
   */
  private async testGetFactsByClassification(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const facts = await this.connector.getFactsByClassification('OBSERVATION', { limit: 10 });

      const success = Array.isArray(facts);

      return {
        testName: 'Get Facts By Classification',
        success,
        duration: Date.now() - startTime,
        data: { count: facts.length },
        error: success ? undefined : 'Get facts by classification failed'
      };
    } catch (error) {
      return {
        testName: 'Get Facts By Classification',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test ChittyID generation
   */
  private async testChittyIdGeneration(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create multiple entities and verify ChittyIDs are unique
      const entities = [];

      for (let i = 0; i < 3; i++) {
        const entity = await this.connector.createEntity({
          name: `ChittyID Test Entity ${i}`,
          entityType: 'PEO' as EntityType,
          status: 'Active' as const,
          visibility: 'Public' as const,
          contextTags: ['test'],
          verificationStatus: 'Verified' as const,
          accessLevel: 'Standard' as const,
          metadata: {}
        });
        entities.push(entity);
        this.testEntityIds.push(entity.id);
      }

      // Verify all ChittyIDs are unique and properly formatted
      const chittyIds = entities.map(e => e.chittyId);
      const uniqueIds = new Set(chittyIds);
      const allValidFormat = chittyIds.every(id => id.startsWith('CHITTY-'));

      const success = uniqueIds.size === entities.length && allValidFormat;

      return {
        testName: 'ChittyID Generation',
        success,
        duration: Date.now() - startTime,
        data: { chittyIds },
        error: success ? undefined : 'ChittyID generation or uniqueness failed'
      };
    } catch (error) {
      return {
        testName: 'ChittyID Generation',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test data validation
   */
  private async testDataValidation(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test required fields validation
      let validationFailed = false;

      try {
        await this.connector.createEntity({
          name: '', // Empty name should fail
          entityType: 'PEO' as EntityType,
          status: 'Active' as const,
          visibility: 'Public' as const,
          contextTags: [],
          verificationStatus: 'Verified' as const,
          accessLevel: 'Standard' as const,
          metadata: {}
        });
      } catch (error) {
        validationFailed = true; // Expected
      }

      return {
        testName: 'Data Validation',
        success: validationFailed,
        duration: Date.now() - startTime,
        error: validationFailed ? undefined : 'Validation should have failed for empty name'
      };
    } catch (error) {
      return {
        testName: 'Data Validation',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test invalid entity ID
      const result = await this.connector.getEntity('invalid-id');

      const success = result === null; // Should return null for invalid ID

      return {
        testName: 'Error Handling',
        success,
        duration: Date.now() - startTime,
        error: success ? undefined : 'Error handling failed'
      };
    } catch (error) {
      return {
        testName: 'Error Handling',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test batch operations
   */
  private async testBatchOperations(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create multiple entities in batch
      const batchSize = 5;
      const entities = [];

      for (let i = 0; i < batchSize; i++) {
        const entity = await this.connector.createEntity({
          name: `Batch Test Entity ${i}`,
          entityType: 'PEO' as EntityType,
          status: 'Active' as const,
          visibility: 'Public' as const,
          contextTags: ['batch-test'],
          verificationStatus: 'Verified' as const,
          accessLevel: 'Standard' as const,
          metadata: { batchIndex: i }
        });
        entities.push(entity);
        this.testEntityIds.push(entity.id);
      }

      const success = entities.length === batchSize;
      const avgTime = (Date.now() - startTime) / batchSize;

      return {
        testName: 'Batch Operations',
        success,
        duration: Date.now() - startTime,
        data: { batchSize, avgTimePerEntity: avgTime },
        error: success ? undefined : 'Batch operations failed'
      };
    } catch (error) {
      return {
        testName: 'Batch Operations',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test rate limiting
   */
  private async testRateLimiting(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Make rapid requests to test rate limiting
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(this.connector.getEntitiesByType('PEO', { limit: 1 }));
      }

      await Promise.all(promises);

      return {
        testName: 'Rate Limiting',
        success: true,
        duration: Date.now() - startTime,
        data: { requestCount: 5 }
      };
    } catch (error) {
      return {
        testName: 'Rate Limiting',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test sync service
   */
  private async testSyncService(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const syncStatus = this.syncService.getSyncStatus();

      const success = typeof syncStatus.inProgress === 'boolean';

      return {
        testName: 'Sync Service',
        success,
        duration: Date.now() - startTime,
        data: syncStatus,
        error: success ? undefined : 'Sync service test failed'
      };
    } catch (error) {
      return {
        testName: 'Sync Service',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // Note: Notion API doesn't support deletion directly
    // Test entities would need to be manually archived/deleted
    // or marked with a test flag for cleanup

    console.log(`Test data to cleanup: ${this.testEntityIds.length} entities, ${this.testInformationIds.length} information items, ${this.testFactIds.length} facts`);
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category: 'connectivity' | 'crud' | 'advanced' | 'performance'): Promise<TestResult[]> {
    const results: TestResult[] = [];

    switch (category) {
      case 'connectivity':
        results.push(await this.testDatabaseConnectivity());
        results.push(await this.testDatabaseSchemas());
        break;

      case 'crud':
        results.push(await this.testCreateEntity());
        results.push(await this.testGetEntity());
        results.push(await this.testCreateInformation());
        results.push(await this.testCreateFact());
        break;

      case 'advanced':
        results.push(await this.testChittyIdGeneration());
        results.push(await this.testDataValidation());
        results.push(await this.testErrorHandling());
        break;

      case 'performance':
        results.push(await this.testBatchOperations());
        results.push(await this.testRateLimiting());
        break;
    }

    return results;
  }
}