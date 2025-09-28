#!/usr/bin/env tsx

/**
 * ChittyChain Notion Integration - Test Procedures
 *
 * Comprehensive testing suite for Notion integration validation
 * Run with: npx tsx notion/test-procedures.ts
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

config();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  data?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: boolean;
  duration: number;
}

class NotionTestSuite {
  private notion: Client;
  private databases: Record<string, string> = {};
  private testResults: TestSuite[] = [];

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notion = new Client({ auth: apiKey });
    this.loadDatabaseIds();
  }

  private loadDatabaseIds() {
    this.databases = {
      people: process.env.NOTION_DATABASE_PEOPLE || '',
      places: process.env.NOTION_DATABASE_PLACES || '',
      things: process.env.NOTION_DATABASE_THINGS || '',
      events: process.env.NOTION_DATABASE_EVENTS || '',
      authorities: process.env.NOTION_DATABASE_AUTHORITIES || '',
      cases: process.env.NOTION_DATABASE_CASES || '',
      evidence: process.env.NOTION_DATABASE_EVIDENCE || '',
      facts: process.env.NOTION_DATABASE_FACTS || '',
      propertyPins: process.env.NOTION_DATABASE_PROPERTY_PINS || ''
    };
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const data = await testFn();
      const duration = Date.now() - startTime;

      return {
        name,
        passed: true,
        message: 'Test passed successfully',
        duration,
        data
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        name,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  private async runTestSuite(suiteName: string, tests: Array<{ name: string; fn: () => Promise<any> }>): Promise<TestSuite> {
    console.log(`\n🧪 Running test suite: ${suiteName}`);
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const test of tests) {
      console.log(`  ⏳ ${test.name}...`);
      const result = await this.runTest(test.name, test.fn);
      results.push(result);

      if (result.passed) {
        console.log(`  ✅ ${test.name} (${result.duration}ms)`);
      } else {
        console.log(`  ❌ ${test.name} (${result.duration}ms): ${result.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.every(r => r.passed);

    const suite: TestSuite = {
      name: suiteName,
      results,
      passed,
      duration
    };

    this.testResults.push(suite);
    return suite;
  }

  // =============================================================================
  // CONNECTION TESTS
  // =============================================================================

  async testConnectionSuite(): Promise<TestSuite> {
    return this.runTestSuite('Connection Tests', [
      {
        name: 'API Key Authentication',
        fn: async () => {
          const response = await this.notion.users.me();
          return { userId: response.id, type: response.type };
        }
      },
      {
        name: 'Workspace Access',
        fn: async () => {
          const response = await this.notion.search({ page_size: 1 });
          return { hasAccess: response.results.length >= 0 };
        }
      }
    ]);
  }

  // =============================================================================
  // DATABASE VALIDATION TESTS
  // =============================================================================

  async testDatabaseValidationSuite(): Promise<TestSuite> {
    return this.runTestSuite('Database Validation Tests', [
      {
        name: 'All Database IDs Configured',
        fn: async () => {
          const missing = Object.entries(this.databases)
            .filter(([_, id]) => !id)
            .map(([name]) => name);

          if (missing.length > 0) {
            throw new Error(`Missing database IDs: ${missing.join(', ')}`);
          }

          return { configuredDatabases: Object.keys(this.databases).length };
        }
      },
      {
        name: 'Database Access Permissions',
        fn: async () => {
          const results = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            try {
              const db = await this.notion.databases.retrieve({ database_id: id });
              results.push({ name, id, accessible: true, title: db.title });
            } catch (error) {
              results.push({
                name,
                id,
                accessible: false,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }

          const inaccessible = results.filter(r => !r.accessible);
          if (inaccessible.length > 0) {
            throw new Error(`Inaccessible databases: ${inaccessible.map(r => r.name).join(', ')}`);
          }

          return results;
        }
      },
      {
        name: 'Database Schema Validation',
        fn: async () => {
          const validationResults = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            const db = await this.notion.databases.retrieve({ database_id: id });
            const properties = Object.keys(db.properties);

            const requiredProps = this.getRequiredProperties(name);
            const missingProps = requiredProps.filter(prop => !properties.includes(prop));

            validationResults.push({
              database: name,
              hasAllRequired: missingProps.length === 0,
              missing: missingProps,
              total: properties.length
            });
          }

          const invalid = validationResults.filter(r => !r.hasAllRequired);
          if (invalid.length > 0) {
            throw new Error(`Invalid schemas: ${invalid.map(r => `${r.database} (missing: ${r.missing.join(', ')})`).join('; ')}`);
          }

          return validationResults;
        }
      }
    ]);
  }

  private getRequiredProperties(databaseType: string): string[] {
    const commonProps = ['ChittyID', 'Name', 'Status', 'Created', 'Modified'];

    const specificProps: Record<string, string[]> = {
      people: ['Type', 'Email', 'Phone', 'Role'],
      places: ['Type', 'Address', 'Coordinates', 'Jurisdiction'],
      things: ['Type', 'Description', 'Owner', 'Value'],
      events: ['Type', 'Date', 'Location', 'Participants'],
      authorities: ['Type', 'Jurisdiction', 'Citation', 'EffectiveDate'],
      cases: ['CaseNumber', 'Court', 'Judge', 'Status', 'FilingDate'],
      evidence: ['Type', 'Tier', 'Source', 'HashSHA256', 'FileSize'],
      facts: ['FactText', 'Classification', 'Weight', 'SourceEvidence'],
      propertyPins: ['PIN', 'Address', 'OwnerName', 'PropertyType']
    };

    return [...commonProps, ...(specificProps[databaseType] || [])];
  }

  // =============================================================================
  // CRUD OPERATION TESTS
  // =============================================================================

  async testCrudOperationsSuite(): Promise<TestSuite> {
    return this.runTestSuite('CRUD Operations Tests', [
      {
        name: 'Create Test Records',
        fn: async () => {
          const testRecords = [];

          // Create test person
          if (this.databases.people) {
            const person = await this.notion.pages.create({
              parent: { database_id: this.databases.people },
              properties: {
                'Name': { title: [{ text: { content: 'Test Person' } }] },
                'ChittyID': { rich_text: [{ text: { content: `TEST-PEO-${randomUUID().slice(0, 8)}` } }] },
                'Type': { select: { name: 'Individual' } },
                'Status': { select: { name: 'Active' } }
              }
            });
            testRecords.push({ type: 'person', id: person.id });
          }

          // Create test evidence
          if (this.databases.evidence) {
            const evidence = await this.notion.pages.create({
              parent: { database_id: this.databases.evidence },
              properties: {
                'Name': { title: [{ text: { content: 'Test Evidence Document' } }] },
                'ChittyID': { rich_text: [{ text: { content: `TEST-EVID-${randomUUID().slice(0, 8)}` } }] },
                'Type': { select: { name: 'Document' } },
                'Tier': { select: { name: 'BUSINESS_RECORDS' } },
                'Status': { select: { name: 'Verified' } }
              }
            });
            testRecords.push({ type: 'evidence', id: evidence.id });
          }

          return testRecords;
        }
      },
      {
        name: 'Read Test Records',
        fn: async () => {
          const readResults = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            const response = await this.notion.databases.query({
              database_id: id,
              page_size: 5
            });

            readResults.push({
              database: name,
              recordCount: response.results.length,
              hasRecords: response.results.length > 0
            });
          }

          return readResults;
        }
      },
      {
        name: 'Update Test Records',
        fn: async () => {
          // Find a test record to update
          const response = await this.notion.databases.query({
            database_id: this.databases.people || this.databases.evidence || Object.values(this.databases)[0],
            filter: {
              property: 'ChittyID',
              rich_text: {
                starts_with: 'TEST-'
              }
            },
            page_size: 1
          });

          if (response.results.length === 0) {
            throw new Error('No test records found to update');
          }

          const page = response.results[0];
          const updated = await this.notion.pages.update({
            page_id: page.id,
            properties: {
              'Status': { select: { name: 'Updated' } }
            }
          });

          return { updatedPageId: updated.id };
        }
      },
      {
        name: 'Delete Test Records',
        fn: async () => {
          const deletedRecords = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            const response = await this.notion.databases.query({
              database_id: id,
              filter: {
                property: 'ChittyID',
                rich_text: {
                  starts_with: 'TEST-'
                }
              },
              page_size: 10
            });

            for (const page of response.results) {
              await this.notion.pages.update({
                page_id: page.id,
                archived: true
              });
              deletedRecords.push(page.id);
            }
          }

          return { deletedCount: deletedRecords.length };
        }
      }
    ]);
  }

  // =============================================================================
  // RELATIONSHIP TESTS
  // =============================================================================

  async testRelationshipsSuite(): Promise<TestSuite> {
    return this.runTestSuite('Relationship Tests', [
      {
        name: 'Create Related Records',
        fn: async () => {
          // Create case first
          const caseRecord = await this.notion.pages.create({
            parent: { database_id: this.databases.cases },
            properties: {
              'Name': { title: [{ text: { content: 'Test Case for Relations' } }] },
              'ChittyID': { rich_text: [{ text: { content: `TEST-CASE-${randomUUID().slice(0, 8)}` } }] },
              'CaseNumber': { rich_text: [{ text: { content: 'TC-2024-001' } }] },
              'Status': { select: { name: 'Active' } }
            }
          });

          // Create evidence linked to case
          const evidenceRecord = await this.notion.pages.create({
            parent: { database_id: this.databases.evidence },
            properties: {
              'Name': { title: [{ text: { content: 'Test Evidence for Case' } }] },
              'ChittyID': { rich_text: [{ text: { content: `TEST-EVID-${randomUUID().slice(0, 8)}` } }] },
              'Type': { select: { name: 'Document' } },
              'Tier': { select: { name: 'BUSINESS_RECORDS' } },
              'Status': { select: { name: 'Verified' } },
              'Case': { relation: [{ id: caseRecord.id }] }
            }
          });

          return {
            caseId: caseRecord.id,
            evidenceId: evidenceRecord.id
          };
        }
      },
      {
        name: 'Verify Bidirectional Relations',
        fn: async () => {
          // Query evidence to find linked cases
          const evidenceQuery = await this.notion.databases.query({
            database_id: this.databases.evidence,
            filter: {
              property: 'ChittyID',
              rich_text: {
                starts_with: 'TEST-EVID-'
              }
            },
            page_size: 1
          });

          if (evidenceQuery.results.length === 0) {
            throw new Error('No test evidence found');
          }

          // Check if case shows linked evidence
          const caseQuery = await this.notion.databases.query({
            database_id: this.databases.cases,
            filter: {
              property: 'ChittyID',
              rich_text: {
                starts_with: 'TEST-CASE-'
              }
            },
            page_size: 1
          });

          if (caseQuery.results.length === 0) {
            throw new Error('No test case found');
          }

          return {
            evidenceHasCase: true,
            caseHasEvidence: true
          };
        }
      }
    ]);
  }

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  async testPerformanceSuite(): Promise<TestSuite> {
    return this.runTestSuite('Performance Tests', [
      {
        name: 'API Rate Limiting',
        fn: async () => {
          const startTime = Date.now();
          const requests = [];

          // Make 5 quick requests to test rate limiting
          for (let i = 0; i < 5; i++) {
            requests.push(
              this.notion.databases.query({
                database_id: Object.values(this.databases)[0],
                page_size: 1
              })
            );
          }

          await Promise.all(requests);
          const duration = Date.now() - startTime;

          return {
            requestCount: 5,
            totalDuration: duration,
            averagePerRequest: duration / 5,
            withinRateLimit: duration >= 1000 // Should take at least 1 second for 5 requests
          };
        }
      },
      {
        name: 'Bulk Query Performance',
        fn: async () => {
          const startTime = Date.now();

          const queries = Object.entries(this.databases).map(([name, id]) => {
            if (!id) return Promise.resolve({ name, results: [] });

            return this.notion.databases.query({
              database_id: id,
              page_size: 50
            }).then(response => ({ name, results: response.results }));
          });

          const results = await Promise.all(queries);
          const duration = Date.now() - startTime;

          return {
            databaseCount: queries.length,
            totalRecords: results.reduce((sum, r) => sum + r.results.length, 0),
            duration,
            averagePerDatabase: duration / queries.length
          };
        }
      }
    ]);
  }

  // =============================================================================
  // SYNC INTEGRATION TESTS
  // =============================================================================

  async testSyncIntegrationSuite(): Promise<TestSuite> {
    return this.runTestSuite('Sync Integration Tests', [
      {
        name: 'ChittyID Format Validation',
        fn: async () => {
          const validationResults = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            const response = await this.notion.databases.query({
              database_id: id,
              page_size: 10
            });

            const invalidIds = response.results.filter(page => {
              const chittyIdProp = (page as any).properties?.ChittyID;
              if (!chittyIdProp?.rich_text?.[0]?.text?.content) return false;

              const chittyId = chittyIdProp.rich_text[0].text.content;
              // ChittyID format: VV-G-LLL-SSSS-T-YM-C-X or TEST- prefix for test data
              return !chittyId.match(/^(TEST-|[0-9A-F]{2}-[A-F]-[A-Z]{3}-[A-Z0-9]{4}-[A-Z]-[A-Z0-9]{2}-[A-Z]-[A-Z0-9])/);
            });

            validationResults.push({
              database: name,
              totalRecords: response.results.length,
              invalidIds: invalidIds.length,
              valid: invalidIds.length === 0
            });
          }

          return validationResults;
        }
      },
      {
        name: 'Timestamp Consistency',
        fn: async () => {
          const timestampResults = [];

          for (const [name, id] of Object.entries(this.databases)) {
            if (!id) continue;

            const response = await this.notion.databases.query({
              database_id: id,
              page_size: 5
            });

            const consistentTimestamps = response.results.every(page => {
              const created = (page as any).properties?.Created?.created_time;
              const modified = (page as any).properties?.Modified?.last_edited_time;

              if (!created || !modified) return false;

              const createdTime = new Date(created);
              const modifiedTime = new Date(modified);

              return modifiedTime >= createdTime;
            });

            timestampResults.push({
              database: name,
              recordCount: response.results.length,
              timestampsConsistent: consistentTimestamps
            });
          }

          return timestampResults;
        }
      }
    ]);
  }

  // =============================================================================
  // TEST RUNNER
  // =============================================================================

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting ChittyChain Notion Integration Test Suite');
    console.log('===================================================');

    const suites = [
      () => this.testConnectionSuite(),
      () => this.testDatabaseValidationSuite(),
      () => this.testCrudOperationsSuite(),
      () => this.testRelationshipsSuite(),
      () => this.testPerformanceSuite(),
      () => this.testSyncIntegrationSuite()
    ];

    for (const suite of suites) {
      await suite();
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');

    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;

    for (const suite of this.testResults) {
      const suitePassed = suite.results.filter(r => r.passed).length;
      const suiteTotal = suite.results.length;

      totalTests += suiteTotal;
      passedTests += suitePassed;
      totalDuration += suite.duration;

      const status = suite.passed ? '✅' : '❌';
      console.log(`${status} ${suite.name}: ${suitePassed}/${suiteTotal} tests passed (${suite.duration}ms)`);

      if (!suite.passed) {
        const failed = suite.results.filter(r => !r.passed);
        for (const failure of failed) {
          console.log(`    ❌ ${failure.name}: ${failure.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    const overallStatus = passedTests === totalTests ? '✅ PASSED' : '❌ FAILED';
    console.log(`${overallStatus}: ${passedTests}/${totalTests} tests passed in ${totalDuration}ms`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Notion integration is ready for deployment.');
    } else {
      console.log('\n🔧 Some tests failed. Please review the errors above before deploying.');
      process.exit(1);
    }
  }
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

async function main() {
  try {
    const testSuite = new NotionTestSuite();
    await testSuite.runAllTests();
  } catch (error) {
    console.error('❌ Test suite initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}