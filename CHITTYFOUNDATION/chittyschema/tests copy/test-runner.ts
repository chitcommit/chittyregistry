/**
 * Test Runner for ChittyChain Schema Testing Framework
 * Coordinates execution of all test suites with comprehensive reporting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface TestSuiteConfig {
  name: string;
  file: string;
  timeout: number;
  retries: number;
  critical: boolean;
  description: string;
  dependencies?: string[];
}

interface TestResult {
  suite: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  duration: number;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  errors?: string[];
  output?: string;
}

interface TestRunSummary {
  timestamp: string;
  total_duration: number;
  environment: string;
  target_url: string;
  results: TestResult[];
  overall_status: 'passed' | 'failed' | 'partial';
  summary: {
    total_suites: number;
    passed_suites: number;
    failed_suites: number;
    skipped_suites: number;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    skipped_tests: number;
  };
  recommendations: string[];
}

class ChittyChainTestRunner {
  private testSuites: TestSuiteConfig[] = [
    {
      name: 'QA Test Suite',
      file: 'qa-test-suite.ts',
      timeout: 300000, // 5 minutes
      retries: 2,
      critical: true,
      description: 'Core functionality and integration testing'
    },
    {
      name: 'Penetration Tests',
      file: 'penetration-tests.ts',
      timeout: 600000, // 10 minutes
      retries: 1,
      critical: true,
      description: 'Security vulnerability testing and attack simulation'
    },
    {
      name: 'Load Testing',
      file: 'load-testing.ts',
      timeout: 900000, // 15 minutes
      retries: 0,
      critical: false,
      description: 'Performance testing under various load conditions'
    },
    {
      name: 'Security Automation',
      file: 'security-automation.ts',
      timeout: 300000, // 5 minutes
      retries: 1,
      critical: true,
      description: 'Continuous security monitoring and compliance validation'
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      'test-results',
      'test-results/coverage',
      'test-results/reports',
      'test-results/logs'
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async runTestSuite(suite: TestSuiteConfig, attempt: number = 1): Promise<TestResult> {
    console.log(`\n🚀 Running ${suite.name} (Attempt ${attempt}/${suite.retries + 1})`);
    console.log(`📝 ${suite.description}`);

    const startTime = Date.now();
    const logFile = join('test-results/logs', `${suite.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.log`);

    try {
      // Build vitest command
      const vitestCmd = [
        'env -u NODE_OPTIONS',
        `CHITTY_SCHEMA_URL=${process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001'}`,
        'npx vitest run',
        '--reporter=json',
        '--reporter=verbose',
        `--timeout=${suite.timeout}`,
        suite.file
      ].join(' ');

      console.log(`⚡ Executing: ${vitestCmd}`);

      const { stdout, stderr } = await execAsync(vitestCmd, {
        timeout: suite.timeout + 30000, // Extra 30s buffer
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const duration = Date.now() - startTime;

      // Save output to log file
      writeFileSync(logFile, `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`);

      // Parse vitest JSON output
      let testStats = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      };

      // Extract test statistics from verbose output
      const testSummaryMatch = stdout.match(/Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?(?:\s*\|\s*(\d+)\s+skipped)?/);
      if (testSummaryMatch) {
        testStats.passed = parseInt(testSummaryMatch[1]) || 0;
        testStats.failed = parseInt(testSummaryMatch[2]) || 0;
        testStats.skipped = parseInt(testSummaryMatch[3]) || 0;
        testStats.total = testStats.passed + testStats.failed + testStats.skipped;
      }

      // Check for errors in stderr
      const hasErrors = stderr.includes('Error:') || stderr.includes('Failed') || stdout.includes('FAIL');
      const status = hasErrors || testStats.failed > 0 ? 'failed' : 'passed';

      const result: TestResult = {
        suite: suite.name,
        status,
        duration,
        tests: testStats,
        output: stdout,
        errors: hasErrors ? [stderr] : undefined
      };

      if (status === 'passed') {
        console.log(`✅ ${suite.name} completed successfully`);
        console.log(`📊 Tests: ${testStats.passed} passed, ${testStats.failed} failed, ${testStats.skipped} skipped`);
        console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
      } else {
        console.log(`❌ ${suite.name} failed`);
        if (attempt <= suite.retries) {
          console.log(`🔄 Retrying ${suite.name} (${attempt}/${suite.retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          return this.runTestSuite(suite, attempt + 1);
        }
      }

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`💥 ${suite.name} encountered an error: ${error.message}`);

      // Save error to log file
      writeFileSync(logFile, `ERROR: ${error.message}\nSTACK: ${error.stack}\n`);

      if (attempt <= suite.retries) {
        console.log(`🔄 Retrying ${suite.name} due to error (${attempt}/${suite.retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
        return this.runTestSuite(suite, attempt + 1);
      }

      return {
        suite: suite.name,
        status: 'error',
        duration,
        tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
        errors: [error.message]
      };
    }
  }

  private async runHealthCheck(): Promise<boolean> {
    console.log('🏥 Running health check...');

    try {
      const healthCmd = 'env -u NODE_OPTIONS npm run doctor';
      const { stdout, stderr } = await execAsync(healthCmd, { timeout: 30000 });

      console.log('✅ Health check completed');

      // Check if doctor found critical issues
      if (stdout.includes('CRITICAL') || stderr.includes('Error:')) {
        console.log('⚠️  Health check found issues, but continuing with tests');
        return false;
      }

      return true;
    } catch (error: any) {
      console.log(`⚠️  Health check failed: ${error.message}`);
      return false;
    }
  }

  private generateReport(summary: TestRunSummary): void {
    // Generate JSON report
    const jsonReport = JSON.stringify(summary, null, 2);
    writeFileSync('test-results/test-report.json', jsonReport);

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(summary);
    writeFileSync('test-results/test-report.html', htmlReport);

    // Generate JUnit XML report
    const junitReport = this.generateJunitReport(summary);
    writeFileSync('test-results/test-report.xml', junitReport);

    console.log('\n📊 Reports generated:');
    console.log('  📄 JSON: test-results/test-report.json');
    console.log('  🌐 HTML: test-results/test-report.html');
    console.log('  📋 JUnit: test-results/test-report.xml');
  }

  private generateHtmlReport(summary: TestRunSummary): string {
    const statusColor = summary.overall_status === 'passed' ? '#28a745' : summary.overall_status === 'failed' ? '#dc3545' : '#ffc107';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChittyChain Schema Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; text-transform: uppercase; }
        .status-passed { background: #28a745; }
        .status-failed { background: #dc3545; }
        .status-partial { background: #ffc107; color: #212529; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .summary-number { font-size: 2em; font-weight: bold; color: #495057; }
        .summary-label { color: #6c757d; margin-top: 5px; }
        .suite-results { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e9ecef; }
        .suite-name { font-size: 1.2em; font-weight: bold; }
        .duration { color: #6c757d; }
        .test-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px; }
        .stat { text-align: center; }
        .stat-number { font-weight: bold; font-size: 1.5em; }
        .stat-passed { color: #28a745; }
        .stat-failed { color: #dc3545; }
        .stat-skipped { color: #ffc107; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin-top: 15px; }
        .recommendations { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin-top: 20px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 ChittyChain Schema Test Report</h1>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <span class="status-badge status-${summary.overall_status}">${summary.overall_status}</span>
                <span class="timestamp">${summary.timestamp}</span>
            </div>
            <div style="margin-top: 15px;">
                <strong>Target:</strong> ${summary.target_url}<br>
                <strong>Environment:</strong> ${summary.environment}<br>
                <strong>Duration:</strong> ${Math.round(summary.total_duration / 1000)}s
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">${summary.summary.total_suites}</div>
                <div class="summary-label">Test Suites</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${summary.summary.total_tests}</div>
                <div class="summary-label">Total Tests</div>
            </div>
            <div class="summary-card">
                <div class="summary-number stat-passed">${summary.summary.passed_tests}</div>
                <div class="summary-label">Passed</div>
            </div>
            <div class="summary-card">
                <div class="summary-number stat-failed">${summary.summary.failed_tests}</div>
                <div class="summary-label">Failed</div>
            </div>
        </div>

        ${summary.results.map(result => `
            <div class="suite-results">
                <div class="suite-header">
                    <span class="suite-name">${result.suite}</span>
                    <span class="status-badge status-${result.status}">${result.status}</span>
                </div>
                <div class="duration">Duration: ${Math.round(result.duration / 1000)}s</div>
                <div class="test-stats">
                    <div class="stat">
                        <div class="stat-number">${result.tests.total}</div>
                        <div>Total</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number stat-passed">${result.tests.passed}</div>
                        <div>Passed</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number stat-failed">${result.tests.failed}</div>
                        <div>Failed</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number stat-skipped">${result.tests.skipped}</div>
                        <div>Skipped</div>
                    </div>
                </div>
                ${result.errors ? `
                    <div class="errors">
                        <strong>Errors:</strong><br>
                        ${result.errors.map(error => `<pre>${error}</pre>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        ${summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  private generateJunitReport(summary: TestRunSummary): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="ChittyChain Schema Tests"
           tests="${summary.summary.total_tests}"
           failures="${summary.summary.failed_tests}"
           skipped="${summary.summary.skipped_tests}"
           time="${Math.round(summary.total_duration / 1000)}">
${summary.results.map(result => `
  <testsuite name="${result.suite}"
             tests="${result.tests.total}"
             failures="${result.tests.failed}"
             skipped="${result.tests.skipped}"
             time="${Math.round(result.duration / 1000)}">
    ${result.tests.passed > 0 ? Array(result.tests.passed).fill(0).map((_, i) => `
    <testcase name="test-${i + 1}" classname="${result.suite}" time="1"/>
    `).join('') : ''}
    ${result.tests.failed > 0 ? Array(result.tests.failed).fill(0).map((_, i) => `
    <testcase name="failed-test-${i + 1}" classname="${result.suite}" time="1">
      <failure message="Test failed">${result.errors?.[0] || 'Test failed'}</failure>
    </testcase>
    `).join('') : ''}
    ${result.tests.skipped > 0 ? Array(result.tests.skipped).fill(0).map((_, i) => `
    <testcase name="skipped-test-${i + 1}" classname="${result.suite}" time="0">
      <skipped/>
    </testcase>
    `).join('') : ''}
  </testsuite>
`).join('')}
</testsuites>`;
  }

  async run(suiteFilter?: string): Promise<void> {
    this.startTime = Date.now();

    console.log('🧪 ChittyChain Schema Testing Framework');
    console.log('=====================================');
    console.log(`🎯 Target: ${process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'test'}`);

    // Run health check
    const healthOk = await this.runHealthCheck();

    // Filter test suites
    let suitesToRun = this.testSuites;
    if (suiteFilter) {
      const filterLower = suiteFilter.toLowerCase();
      suitesToRun = this.testSuites.filter(suite =>
        suite.name.toLowerCase().includes(filterLower) ||
        suite.file.toLowerCase().includes(filterLower)
      );

      if (suitesToRun.length === 0) {
        console.log(`❌ No test suites match filter: ${suiteFilter}`);
        console.log('Available suites:', this.testSuites.map(s => s.name).join(', '));
        return;
      }
    }

    console.log(`\n🚀 Running ${suitesToRun.length} test suite(s):`);
    suitesToRun.forEach(suite => {
      console.log(`  📋 ${suite.name} - ${suite.description}`);
    });

    // Run test suites
    for (const suite of suitesToRun) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);

      // Stop on critical failure if specified
      if (suite.critical && result.status === 'failed') {
        console.log(`🛑 Critical test suite failed: ${suite.name}`);
        console.log('Stopping execution due to critical failure');
        break;
      }
    }

    // Generate summary
    const totalDuration = Date.now() - this.startTime;
    const summary = this.generateSummary(totalDuration);

    // Generate reports
    this.generateReport(summary);

    // Print final summary
    this.printSummary(summary);

    // Exit with appropriate code
    if (summary.overall_status === 'failed') {
      process.exit(1);
    }
  }

  private generateSummary(totalDuration: number): TestRunSummary {
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.total, 0);
    const passedTests = this.results.reduce((sum, r) => sum + r.tests.passed, 0);
    const failedTests = this.results.reduce((sum, r) => sum + r.tests.failed, 0);
    const skippedTests = this.results.reduce((sum, r) => sum + r.tests.skipped, 0);

    const passedSuites = this.results.filter(r => r.status === 'passed').length;
    const failedSuites = this.results.filter(r => r.status === 'failed' || r.status === 'error').length;
    const skippedSuites = this.results.filter(r => r.status === 'skipped').length;

    const criticalFailures = this.results.filter(r =>
      (r.status === 'failed' || r.status === 'error') &&
      this.testSuites.find(s => s.name === r.suite)?.critical
    ).length;

    const overallStatus = criticalFailures > 0 ? 'failed' :
      failedSuites > 0 ? 'partial' : 'passed';

    const recommendations: string[] = [];

    if (failedTests > 0) {
      recommendations.push(`Review and fix ${failedTests} failed test(s)`);
    }
    if (criticalFailures > 0) {
      recommendations.push('Address critical test failures immediately');
    }
    if (passedTests / totalTests < 0.9) {
      recommendations.push('Improve test success rate (currently < 90%)');
    }
    if (totalDuration > 30 * 60 * 1000) { // 30 minutes
      recommendations.push('Consider optimizing test execution time');
    }

    return {
      timestamp: new Date().toISOString(),
      total_duration: totalDuration,
      environment: process.env.NODE_ENV || 'test',
      target_url: process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001',
      results: this.results,
      overall_status: overallStatus,
      summary: {
        total_suites: this.results.length,
        passed_suites: passedSuites,
        failed_suites: failedSuites,
        skipped_suites: skippedSuites,
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        skipped_tests: skippedTests
      },
      recommendations
    };
  }

  private printSummary(summary: TestRunSummary): void {
    console.log('\n📊 Test Execution Summary');
    console.log('==========================');
    console.log(`Overall Status: ${summary.overall_status.toUpperCase()}`);
    console.log(`Total Duration: ${Math.round(summary.total_duration / 1000)}s`);
    console.log(`\nSuites: ${summary.summary.passed_suites}✅ ${summary.summary.failed_suites}❌ ${summary.summary.skipped_suites}⏭️`);
    console.log(`Tests:  ${summary.summary.passed_tests}✅ ${summary.summary.failed_tests}❌ ${summary.summary.skipped_tests}⏭️`);

    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    console.log(`\n📄 View detailed report: test-results/test-report.html`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const filter = args[1];

  const runner = new ChittyChainTestRunner();

  switch (command) {
    case 'all':
      await runner.run();
      break;
    case 'qa':
      await runner.run('qa-test-suite');
      break;
    case 'penetration':
    case 'pentest':
      await runner.run('penetration-tests');
      break;
    case 'load':
      await runner.run('load-testing');
      break;
    case 'security':
      await runner.run('security-automation');
      break;
    default:
      if (command) {
        await runner.run(command);
      } else {
        console.log('ChittyChain Schema Test Runner');
        console.log('Usage: node test-runner.ts <command> [filter]');
        console.log('Commands:');
        console.log('  all          - Run all test suites');
        console.log('  qa           - Run QA tests only');
        console.log('  penetration  - Run penetration tests only');
        console.log('  load         - Run load tests only');
        console.log('  security     - Run security automation only');
        console.log('  <filter>     - Run suites matching filter');
      }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ChittyChainTestRunner };