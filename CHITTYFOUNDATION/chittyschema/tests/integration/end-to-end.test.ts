#!/usr/bin/env tsx
/**
 * End-to-End Integration Test for ChittySchema
 * Tests complete data flow from evidence submission to fact extraction
 */

import axios from 'axios';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3000/api/v1';
const SESSION_ID = 'e8d3c439-4508-4597-a8d9-7bf3c5bf3ec8';

interface TestResult {
  test: string;
  status: 'passed' | 'failed';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any
): Promise<TestResult> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${path}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': SESSION_ID
      }
    });

    console.log(chalk.green(`✅ ${name}`));
    return {
      test: name,
      status: 'passed',
      data: response.data
    };
  } catch (error: any) {
    console.log(chalk.red(`❌ ${name}: ${error.message}`));
    return {
      test: name,
      status: 'failed',
      message: error.response?.data?.error || error.message
    };
  }
}

async function runIntegrationTests() {
  console.log(chalk.blue('🚀 ChittySchema End-to-End Integration Test'));
  console.log(chalk.gray(`Session ID: ${SESSION_ID}\n`));

  // 1. Health Check
  const health = await testEndpoint(
    'System Health Check',
    'GET',
    '/../../health'
  );
  results.push(health);

  // 2. Initialize Sync Session
  const syncInit = await testEndpoint(
    'Initialize Sync Session',
    'POST',
    '/sync/initialize',
    {
      sessionId: SESSION_ID,
      projectName: 'integration-test'
    }
  );
  results.push(syncInit);

  const projectId = syncInit.data?.projectId;

  // 3. Create a Test Case
  const testCase = await testEndpoint(
    'Create Test Case',
    'POST',
    '/cases',
    {
      title: 'Integration Test Case',
      description: 'End-to-end test of ChittySchema data flow',
      docketNumber: `TEST-${Date.now()}`,
      courtName: 'Test Court',
      status: 'open'
    }
  );
  results.push(testCase);

  const caseId = testCase.data?.id;

  // 4. Submit Evidence
  const evidence = await testEndpoint(
    'Submit Evidence',
    'POST',
    '/evidence',
    {
      caseId,
      title: 'Test Evidence Document',
      description: 'This is a test document containing important facts',
      type: 'document',
      tier: 'GOVERNMENT',
      content: 'The contract was signed on January 15, 2024. The amount agreed was $50,000.'
    }
  );
  results.push(evidence);

  const evidenceId = evidence.data?.id;

  // 5. Create Atomic Facts
  const fact1 = await testEndpoint(
    'Create Date Fact',
    'POST',
    '/facts',
    {
      text: 'Contract signed on January 15, 2024',
      factType: 'DATE',
      evidenceId,
      classificationLevel: 'FACT',
      weight: 0.95
    }
  );
  results.push(fact1);

  const fact2 = await testEndpoint(
    'Create Amount Fact',
    'POST',
    '/facts',
    {
      text: 'Contract amount is $50,000',
      factType: 'AMOUNT',
      evidenceId,
      classificationLevel: 'FACT',
      weight: 0.90
    }
  );
  results.push(fact2);

  // 6. Get Case Summary
  if (caseId) {
    const summary = await testEndpoint(
      'Get Case Summary',
      'GET',
      `/cases/${caseId}/summary`
    );
    results.push(summary);

    console.log(chalk.cyan('\nCase Summary:'));
    console.log(chalk.gray(JSON.stringify(summary.data, null, 2)));
  }

  // 7. Check Sync Status
  const syncStatus = await testEndpoint(
    'Check Sync Status',
    'GET',
    `/sync/status/${SESSION_ID}`
  );
  results.push(syncStatus);

  // 8. Trigger Manual Sync
  const syncTrigger = await testEndpoint(
    'Trigger Manual Sync',
    'POST',
    `/sync/trigger/${SESSION_ID}`
  );
  results.push(syncTrigger);

  // 9. Extract Topics from Evidence
  if (evidenceId) {
    const topics = await testEndpoint(
      'Extract Topics',
      'POST',
      `/topics/extract/evidence/${evidenceId}`
    );
    results.push(topics);
  }

  // 10. Property Data Test
  const propertyData = await testEndpoint(
    'Get Property Ownership',
    'GET',
    '/property/pin/14-21-111-008-1006/ownership'
  );
  results.push(propertyData);

  // 11. Clean up sync session
  const cleanup = await testEndpoint(
    'Clean Up Session',
    'DELETE',
    `/sync/${SESSION_ID}`
  );
  results.push(cleanup);

  // Print Summary
  console.log(chalk.blue('\n📊 Test Results Summary'));
  console.log('='.repeat(50));

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const color = result.status === 'passed' ? chalk.green : chalk.red;
    console.log(`${icon} ${color(result.test)}`);
    if (result.message) {
      console.log(chalk.gray(`   └─ ${result.message}`));
    }
  });

  console.log('='.repeat(50));
  console.log(chalk.blue('Total Tests:'), results.length);
  console.log(chalk.green('Passed:'), passed);
  console.log(chalk.red('Failed:'), failed);
  console.log(chalk.yellow('Success Rate:'), `${((passed / results.length) * 100).toFixed(1)}%`);

  // Data Flow Validation
  if (passed === results.length) {
    console.log(chalk.green('\n🎉 All integration tests passed!'));
    console.log(chalk.cyan('Data flow validated:'));
    console.log('  1. ✅ Case creation');
    console.log('  2. ✅ Evidence submission');
    console.log('  3. ✅ Fact extraction');
    console.log('  4. ✅ Case summary aggregation');
    console.log('  5. ✅ Sync session management');
    console.log('  6. ✅ Topic extraction');
    console.log('  7. ✅ Property data integration');
  } else {
    console.log(chalk.yellow('\n⚠️  Some tests failed. Check the logs above for details.'));
  }

  return { passed, failed, total: results.length };
}

// Run tests if executed directly
if (process.argv[1] && process.argv[1].endsWith('end-to-end.test.ts')) {
  runIntegrationTests()
    .then(({ passed, failed, total }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error(chalk.red('Test suite failed:'), error);
      process.exit(1);
    });
}

export { runIntegrationTests };