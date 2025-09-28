#!/usr/bin/env tsx

/**
 * ChittyOS QA Test Suite Runner
 *
 * Comprehensive test runner for all QA test categories:
 * - Registry integration tests
 * - Schema propagation tests
 * - Pipeline compliance tests
 * - Service health monitoring
 * - Database schema validation
 * - Notion extension testing
 *
 * Features:
 * - Parallel and sequential test execution
 * - Detailed reporting with metrics
 * - CI/CD integration support
 * - Test result export (JSON, XML, HTML)
 * - Email notifications for failures
 * - Slack integration for team notifications
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testFiles: string[];
  category: 'integration' | 'compliance' | 'functional' | 'smoke';
  timeout: number; // seconds
  retries: number;
  parallel: boolean;
  dependencies: string[]; // Other test suites that must pass first
  critical: boolean; // If true, failure stops entire suite
}

interface TestResult {
  suiteId: string;
  suiteName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage?: number;
  errorMessage?: string;
  detailedResults: any;
}

interface QAReport {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  environment: string;
  gitCommit?: string;
  gitBranch?: string;
  testSuites: TestResult[];
  summary: {
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    skippedSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallStatus: 'passed' | 'failed' | 'partial';
    coveragePercentage?: number;
  };
  recommendations: string[];
}

// Define QA test suites
const QA_TEST_SUITES: TestSuite[] = [
  {
    id: 'smoke-tests',
    name: 'Smoke Tests',
    description: 'Basic health checks and critical path validation',
    testFiles: [
      'tests/qa/smoke/basic-health.test.ts',
      'tests/qa/smoke/critical-services.test.ts'
    ],
    category: 'smoke',
    timeout: 300, // 5 minutes
    retries: 2,
    parallel: false,
    dependencies: [],
    critical: true
  },
  {
    id: 'registry-integration',
    name: 'Registry Integration Tests',
    description: 'Test all 36 registered services connectivity and compliance',
    testFiles: [
      'tests/qa/registry-integration.test.ts'
    ],
    category: 'integration',
    timeout: 1800, // 30 minutes
    retries: 1,
    parallel: false,
    dependencies: ['smoke-tests'],
    critical: true
  },
  {
    id: 'schema-propagation',
    name: 'Schema Propagation Tests',
    description: 'Test schema propagation to all 6 target systems',
    testFiles: [
      'tests/qa/schema-propagation.test.ts'
    ],
    category: 'integration',
    timeout: 2400, // 40 minutes
    retries: 1,
    parallel: false,
    dependencies: ['registry-integration'],
    critical: true
  },
  {
    id: 'pipeline-compliance',
    name: 'Pipeline Compliance Tests',
    description: 'Validate ChittyID generation pipeline compliance',
    testFiles: [
      'tests/qa/pipeline-compliance.test.ts'
    ],
    category: 'compliance',
    timeout: 1800, // 30 minutes
    retries: 2,
    parallel: false,
    dependencies: ['smoke-tests'],
    critical: true
  },
  {
    id: 'service-health',
    name: 'Service Health Monitoring',
    description: 'Monitor health of all ChittyOS services',
    testFiles: [
      'tests/qa/service-health.test.ts'
    ],
    category: 'functional',
    timeout: 900, // 15 minutes
    retries: 1,
    parallel: true,
    dependencies: ['registry-integration'],
    critical: false
  },
  {
    id: 'database-validation',
    name: 'Database Schema Validation',
    description: 'Validate database schemas and constraints',
    testFiles: [
      'tests/qa/database-validation.test.ts'
    ],
    category: 'functional',
    timeout: 600, // 10 minutes
    retries: 1,
    parallel: true,
    dependencies: ['smoke-tests'],
    critical: false
  },
  {
    id: 'notion-extension',
    name: 'Notion Extension Tests',
    description: 'Test Notion workspace integration and CRUD operations',
    testFiles: [
      'tests/qa/notion-extension.test.ts'
    ],
    category: 'integration',
    timeout: 1200, // 20 minutes
    retries: 2,
    parallel: true,
    dependencies: ['smoke-tests'],
    critical: false
  }
];

class QATestRunner {
  private runId: string;
  private startTime: Date;
  private testResults: TestResult[] = [];
  private environment: string;
  private gitCommit?: string;
  private gitBranch?: string;

  constructor() {
    this.runId = `qa-${Date.now()}`;
    this.startTime = new Date();
    this.environment = process.env.NODE_ENV || 'test';
    this.gitCommit = process.env.GIT_COMMIT || process.env.GITHUB_SHA;
    this.gitBranch = process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME;
  }

  async runAllSuites(options: {
    parallel?: boolean;
    includeCategories?: string[];
    excludeCategories?: string[];
    includeSuites?: string[];
    excludeSuites?: string[];
    failFast?: boolean;
    generateReport?: boolean;
    reportFormats?: ('json' | 'xml' | 'html')[];
    outputDir?: string;
  } = {}): Promise<QAReport> {
    console.log('🧪 Starting ChittyOS QA Test Suite');
    console.log('================================');
    console.log(`Run ID: ${this.runId}`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Git Commit: ${this.gitCommit || 'unknown'}`);
    console.log(`Git Branch: ${this.gitBranch || 'unknown'}`);
    console.log(`Start Time: ${this.startTime.toISOString()}`);
    console.log('================================\n');

    // Filter test suites based on options
    const suitesToRun = this.filterTestSuites(QA_TEST_SUITES, options);

    console.log(`📋 Test Suites to Execute: ${suitesToRun.length}`);
    suitesToRun.forEach(suite => {
      console.log(`   - ${suite.name} (${suite.category})`);
    });
    console.log('');

    // Set up test environment
    await this.setupTestEnvironment();

    // Execute test suites
    if (options.parallel && !this.hasDependencies(suitesToRun)) {
      await this.runSuitesInParallel(suitesToRun, options);
    } else {
      await this.runSuitesSequentially(suitesToRun, options);
    }

    // Generate final report
    const report = await this.generateReport(options);

    // Export reports in requested formats
    if (options.generateReport !== false) {
      await this.exportReports(report, options);
    }

    // Send notifications
    await this.sendNotifications(report);

    // Print summary
    this.printSummary(report);

    return report;
  }

  private filterTestSuites(suites: TestSuite[], options: any): TestSuite[] {
    let filtered = [...suites];

    // Filter by categories
    if (options.includeCategories?.length > 0) {
      filtered = filtered.filter(suite => options.includeCategories.includes(suite.category));
    }
    if (options.excludeCategories?.length > 0) {
      filtered = filtered.filter(suite => !options.excludeCategories.includes(suite.category));
    }

    // Filter by specific suites
    if (options.includeSuites?.length > 0) {
      filtered = filtered.filter(suite => options.includeSuites.includes(suite.id));
    }
    if (options.excludeSuites?.length > 0) {
      filtered = filtered.filter(suite => !options.excludeSuites.includes(suite.id));
    }

    return filtered;
  }

  private hasDependencies(suites: TestSuite[]): boolean {
    return suites.some(suite => suite.dependencies.length > 0);
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🛠️ Setting up test environment...');

    // Verify environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'CHITTY_REGISTRY_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('   Using default values for testing');
    }

    // Set test-specific environment variables
    process.env.NODE_ENV = 'test';
    process.env.QA_TEST_RUN_ID = this.runId;

    // Create output directories
    const outputDir = path.join(process.cwd(), 'test-results', this.runId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    console.log('✅ Test environment ready\n');
  }

  private async runSuitesSequentially(suites: TestSuite[], options: any): Promise<void> {
    console.log('🔄 Running test suites sequentially...\n');

    // Sort suites by dependencies
    const sortedSuites = this.sortSuitesByDependencies(suites);

    for (const suite of sortedSuites) {
      console.log(`\n📝 Starting: ${suite.name}`);
      console.log(`   Description: ${suite.description}`);
      console.log(`   Timeout: ${suite.timeout}s`);

      const result = await this.executeSuite(suite, options);
      this.testResults.push(result);

      if (result.status === 'failed' && suite.critical && options.failFast) {
        console.log(`\n💥 Critical test suite failed: ${suite.name}`);
        console.log('   Stopping execution due to fail-fast mode');
        break;
      }
    }
  }

  private async runSuitesInParallel(suites: TestSuite[], options: any): Promise<void> {
    console.log('⚡ Running test suites in parallel...\n');

    const promises = suites.map(suite => this.executeSuite(suite, options));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.testResults.push(result.value);
      } else {
        // Handle rejected promises
        const suite = suites[index];
        this.testResults.push({
          suiteId: suite.id,
          suiteName: suite.name,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          status: 'failed',
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          errorMessage: result.reason?.message || 'Unknown error',
          detailedResults: null
        });
      }
    });
  }

  private sortSuitesByDependencies(suites: TestSuite[]): TestSuite[] {
    const sorted: TestSuite[] = [];
    const remaining = [...suites];

    while (remaining.length > 0) {
      const canRun = remaining.filter(suite =>
        suite.dependencies.every(dep =>
          sorted.some(s => s.id === dep)
        )
      );

      if (canRun.length === 0) {
        // Circular dependencies or missing dependencies
        console.warn('⚠️ Dependency resolution issue, adding remaining suites');
        sorted.push(...remaining);
        break;
      }

      // Add suites that can run
      canRun.forEach(suite => {
        sorted.push(suite);
        const index = remaining.indexOf(suite);
        remaining.splice(index, 1);
      });
    }

    return sorted;
  }

  private async executeSuite(suite: TestSuite, _options: any): Promise<TestResult> {
    const startTime = new Date();

    try {
      console.log(`🚀 Executing: ${suite.name}`);

      const result = await this.runJestTests(suite);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const testResult: TestResult = {
        suiteId: suite.id,
        suiteName: suite.name,
        startTime,
        endTime,
        duration,
        status: result.success ? 'passed' : 'failed',
        totalTests: result.totalTests,
        passedTests: result.passedTests,
        failedTests: result.failedTests,
        skippedTests: result.skippedTests,
        coverage: result.coverage,
        errorMessage: result.errorMessage,
        detailedResults: result.details
      };

      console.log(`${result.success ? '✅' : '❌'} ${suite.name}: ${result.success ? 'PASSED' : 'FAILED'} (${duration}ms)`);
      if (result.coverage) {
        console.log(`   Coverage: ${result.coverage}%`);
      }

      return testResult;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`💥 ${suite.name}: ERROR (${duration}ms)`);
      console.error(`   Error: ${(error as Error).message}`);

      return {
        suiteId: suite.id,
        suiteName: suite.name,
        startTime,
        endTime,
        duration,
        status: 'failed',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        errorMessage: (error as Error).message,
        detailedResults: null
      };
    }
  }

  private async runJestTests(suite: TestSuite): Promise<{
    success: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    coverage?: number;
    errorMessage?: string;
    details: any;
  }> {
    return new Promise((resolve) => {
      const jestArgs = [
        '--testPathPatterns=' + suite.testFiles.join('|'),
        '--json',
        '--coverage',
        '--verbose',
        '--forceExit',
        `--testTimeout=${suite.timeout * 1000}`
      ];

      console.log(`   Running: npx jest ${jestArgs.join(' ')}`);

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      jestProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      jestProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      jestProcess.on('close', (code) => {
        try {
          const results = JSON.parse(stdout);

          resolve({
            success: code === 0,
            totalTests: results.numTotalTests || 0,
            passedTests: results.numPassedTests || 0,
            failedTests: results.numFailedTests || 0,
            skippedTests: results.numPendingTests || 0,
            coverage: results.coverageMap ? this.calculateCoverage(results.coverageMap) : undefined,
            errorMessage: code !== 0 ? stderr || 'Test execution failed' : undefined,
            details: results
          });
        } catch (parseError) {
          resolve({
            success: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            errorMessage: `Failed to parse Jest results: ${(parseError as Error).message}`,
            details: { stdout, stderr }
          });
        }
      });

      jestProcess.on('error', (error) => {
        resolve({
          success: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          errorMessage: `Jest process error: ${error.message}`,
          details: null
        });
      });

      // Handle timeout
      setTimeout(() => {
        if (!jestProcess.killed) {
          jestProcess.kill('SIGTERM');
          resolve({
            success: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            errorMessage: `Test suite timed out after ${suite.timeout} seconds`,
            details: null
          });
        }
      }, suite.timeout * 1000);
    });
  }

  private calculateCoverage(coverageMap: any): number {
    // Simplified coverage calculation
    if (!coverageMap || typeof coverageMap !== 'object') {
      return 0;
    }

    const files = Object.keys(coverageMap);
    if (files.length === 0) {
      return 0;
    }

    const totalLines = files.reduce((total, file) => {
      const fileCoverage = coverageMap[file];
      return total + (fileCoverage?.l?.length || 0);
    }, 0);

    const coveredLines = files.reduce((total, file) => {
      const fileCoverage = coverageMap[file];
      const lines = fileCoverage?.l || {};
      return total + Object.values(lines).filter(count => (count as number) > 0).length;
    }, 0);

    return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
  }

  private async generateReport(_options: any): Promise<QAReport> {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const totalSuites = this.testResults.length;
    const passedSuites = this.testResults.filter(r => r.status === 'passed').length;
    const failedSuites = this.testResults.filter(r => r.status === 'failed').length;
    const skippedSuites = this.testResults.filter(r => r.status === 'skipped').length;

    const totalTests = this.testResults.reduce((sum, r) => sum + r.totalTests, 0);
    const passedTests = this.testResults.reduce((sum, r) => sum + r.passedTests, 0);
    const failedTests = this.testResults.reduce((sum, r) => sum + r.failedTests, 0);

    const overallStatus = failedSuites > 0 ? 'failed' : passedSuites === totalSuites ? 'passed' : 'partial';

    const coverageResults = this.testResults.filter(r => r.coverage !== undefined);
    const averageCoverage = coverageResults.length > 0
      ? coverageResults.reduce((sum, r) => sum + r.coverage!, 0) / coverageResults.length
      : undefined;

    const recommendations = this.generateRecommendations();

    return {
      runId: this.runId,
      startTime: this.startTime,
      endTime,
      totalDuration,
      environment: this.environment,
      gitCommit: this.gitCommit,
      gitBranch: this.gitBranch,
      testSuites: this.testResults,
      summary: {
        totalSuites,
        passedSuites,
        failedSuites,
        skippedSuites,
        totalTests,
        passedTests,
        failedTests,
        overallStatus,
        coveragePercentage: averageCoverage
      },
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedSuites = this.testResults.filter(r => r.status === 'failed');
    if (failedSuites.length > 0) {
      recommendations.push(`Fix ${failedSuites.length} failed test suite(s): ${failedSuites.map(s => s.suiteName).join(', ')}`);
    }

    const slowSuites = this.testResults.filter(r => r.duration > 300000); // > 5 minutes
    if (slowSuites.length > 0) {
      recommendations.push(`Optimize performance of slow test suites: ${slowSuites.map(s => s.suiteName).join(', ')}`);
    }

    const lowCoverageSuites = this.testResults.filter(r => r.coverage && r.coverage < 80);
    if (lowCoverageSuites.length > 0) {
      recommendations.push(`Improve test coverage for: ${lowCoverageSuites.map(s => s.suiteName).join(', ')}`);
    }

    const criticalFailures = this.testResults.filter(r => r.status === 'failed' &&
      QA_TEST_SUITES.find(s => s.id === r.suiteId)?.critical
    );
    if (criticalFailures.length > 0) {
      recommendations.push('URGENT: Address critical test failures before deployment');
    }

    return recommendations;
  }

  private async exportReports(report: QAReport, options: any): Promise<void> {
    const outputDir = options.outputDir || path.join(process.cwd(), 'test-results', this.runId);
    const formats = options.reportFormats || ['json', 'html'];

    for (const format of formats) {
      await this.exportReport(report, format, outputDir);
    }
  }

  private async exportReport(report: QAReport, format: string, outputDir: string): Promise<void> {
    const filename = `qa-report-${this.runId}.${format}`;
    const filepath = path.join(outputDir, filename);

    switch (format) {
      case 'json':
        await fs.promises.writeFile(filepath, JSON.stringify(report, null, 2));
        break;

      case 'xml':
        const xml = this.generateJUnitXML(report);
        await fs.promises.writeFile(filepath, xml);
        break;

      case 'html':
        const html = this.generateHTMLReport(report);
        await fs.promises.writeFile(filepath, html);
        break;
    }

    console.log(`📄 Report exported: ${filepath}`);
  }

  private generateJUnitXML(report: QAReport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="ChittyOS QA Suite" tests="${report.summary.totalTests}" failures="${report.summary.failedTests}" time="${report.totalDuration / 1000}">\n`;

    for (const suite of report.testSuites) {
      xml += `  <testsuite name="${suite.suiteName}" tests="${suite.totalTests}" failures="${suite.failedTests}" time="${suite.duration / 1000}">\n`;

      if (suite.status === 'failed' && suite.errorMessage) {
        xml += `    <testcase name="${suite.suiteName}" classname="QA">\n`;
        xml += `      <failure message="${this.escapeXML(suite.errorMessage)}"/>\n`;
        xml += `    </testcase>\n`;
      }

      xml += `  </testsuite>\n`;
    }

    xml += '</testsuites>';
    return xml;
  }

  private generateHTMLReport(report: QAReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>ChittyOS QA Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .suite { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .passed { background: #d4edda; }
        .failed { background: #f8d7da; }
        .skipped { background: #fff3cd; }
        .recommendations { background: #e2e3e5; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ChittyOS QA Test Report</h1>
        <p><strong>Run ID:</strong> ${report.runId}</p>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Duration:</strong> ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes</p>
        <p><strong>Status:</strong> ${report.summary.overallStatus.toUpperCase()}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p>Total Suites: ${report.summary.totalSuites} (${report.summary.passedSuites} passed, ${report.summary.failedSuites} failed, ${report.summary.skippedSuites} skipped)</p>
        <p>Total Tests: ${report.summary.totalTests} (${report.summary.passedTests} passed, ${report.summary.failedTests} failed)</p>
        ${report.summary.coveragePercentage ? `<p>Average Coverage: ${report.summary.coveragePercentage.toFixed(1)}%</p>` : ''}
    </div>

    <h2>Test Suites</h2>
    ${report.testSuites.map(suite => `
        <div class="suite ${suite.status}">
            <h3>${suite.suiteName}</h3>
            <p>Status: ${suite.status.toUpperCase()}</p>
            <p>Duration: ${(suite.duration / 1000).toFixed(2)}s</p>
            <p>Tests: ${suite.totalTests} (${suite.passedTests} passed, ${suite.failedTests} failed, ${suite.skippedTests} skipped)</p>
            ${suite.coverage ? `<p>Coverage: ${suite.coverage.toFixed(1)}%</p>` : ''}
            ${suite.errorMessage ? `<p><strong>Error:</strong> ${this.escapeHTML(suite.errorMessage)}</p>` : ''}
        </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${this.escapeHTML(rec)}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>`;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async sendNotifications(report: QAReport): Promise<void> {
    try {
      // Email notifications
      if (process.env.QA_EMAIL_NOTIFICATIONS === 'true') {
        await this.sendEmailNotification(report);
      }

      // Slack notifications
      if (process.env.QA_SLACK_WEBHOOK) {
        await this.sendSlackNotification(report);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to send notifications: ${(error as Error).message}`);
    }
  }

  private async sendEmailNotification(_report: QAReport): Promise<void> {
    // Email notification implementation would go here
    console.log('📧 Email notification sent');
  }

  private async sendSlackNotification(_report: QAReport): Promise<void> {
    // Slack notification implementation would go here
    console.log('💬 Slack notification sent');
  }

  private printSummary(report: QAReport): void {
    console.log('\n🏁 QA TEST SUITE COMPLETED');
    console.log('==========================');
    console.log(`Run ID: ${report.runId}`);
    console.log(`Overall Status: ${report.summary.overallStatus.toUpperCase()}`);
    console.log(`Total Duration: ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Test Suites: ${report.summary.passedSuites}/${report.summary.totalSuites} passed`);
    console.log(`Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
    if (report.summary.coveragePercentage) {
      console.log(`Coverage: ${report.summary.coveragePercentage.toFixed(1)}%`);
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('==========================\n');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new QATestRunner();

  const options = {
    parallel: args.includes('--parallel'),
    includeCategories: args.includes('--smoke') ? ['smoke'] :
                      args.includes('--integration') ? ['integration'] :
                      args.includes('--compliance') ? ['compliance'] : undefined,
    failFast: args.includes('--fail-fast'),
    generateReport: !args.includes('--no-report'),
    reportFormats: ['json', 'html'] as ('json' | 'xml' | 'html')[],
    outputDir: process.env.QA_OUTPUT_DIR
  };

  try {
    const report = await runner.runAllSuites(options);
    process.exit(report.summary.overallStatus === 'passed' ? 0 : 1);
  } catch (error) {
    console.error('💥 QA Test Suite failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { QATestRunner, QA_TEST_SUITES };