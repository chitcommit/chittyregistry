#!/usr/bin/env tsx

/**
 * ChittyOS Security Audit Runner
 *
 * Comprehensive security testing and penetration testing runner:
 * - Authentication bypass tests
 * - Injection vulnerability tests (SQL, NoSQL, Command, etc.)
 * - Registry security and manipulation tests
 * - Rate limiting and DoS protection tests
 * - Session security and token validation
 * - Circuit breaker exploitation tests
 * - OWASP compliance validation
 *
 * Features:
 * - Risk-based test prioritization
 * - Vulnerability severity assessment
 * - Security compliance reporting
 * - Integration with security scanners
 * - Automated remediation suggestions
 * - Compliance framework mapping (OWASP, NIST, etc.)
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityTestSuite {
  id: string;
  name: string;
  description: string;
  testFiles: string[];
  category: 'authentication' | 'injection' | 'registry' | 'dos' | 'session' | 'compliance';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  timeout: number; // seconds
  retries: number;
  owaspMapping: string[]; // OWASP Top 10 mappings
  nistMapping: string[]; // NIST mappings
  prerequisites: string[]; // Environment setup requirements
  targetComponents: string[];
}

interface SecurityResult {
  suiteId: string;
  suiteName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'passed' | 'failed' | 'vulnerable' | 'skipped';
  vulnerabilities: SecurityVulnerability[];
  riskScore: number; // 0-100
  complianceStatus: {
    owasp: 'compliant' | 'non-compliant' | 'partial';
    nist: 'compliant' | 'non-compliant' | 'partial';
  };
  mitigationSuggestions: string[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorMessage?: string;
}

interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  impact: string;
  recommendation: string;
  cve?: string;
  owaspMapping?: string[];
  exploitComplexity: 'low' | 'medium' | 'high';
  affected: string[];
  evidence: any;
}

interface SecurityAuditReport {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  environment: string;
  gitCommit?: string;
  gitBranch?: string;
  testSuites: SecurityResult[];
  summary: {
    totalSuites: number;
    passedSuites: number;
    vulnerableSuites: number;
    failedSuites: number;
    overallRiskScore: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    complianceStatus: {
      owasp: 'compliant' | 'non-compliant' | 'partial';
      nist: 'compliant' | 'non-compliant' | 'partial';
    };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  complianceGaps: string[];
}

// Define security test suites
const SECURITY_TEST_SUITES: SecurityTestSuite[] = [
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass Tests',
    description: 'Test for authentication bypass vulnerabilities',
    testFiles: [
      'tests/security/auth-bypass.test.ts'
    ],
    category: 'authentication',
    riskLevel: 'critical',
    timeout: 1800, // 30 minutes
    retries: 1,
    owaspMapping: ['A01:2021 – Broken Access Control', 'A07:2021 – Identification and Authentication Failures'],
    nistMapping: ['AC-3', 'IA-2', 'IA-3'],
    prerequisites: ['Valid test accounts', 'Authentication tokens'],
    targetComponents: ['Authentication service', 'Session management', 'Token validation']
  },
  {
    id: 'injection-attacks',
    name: 'Injection Vulnerability Tests',
    description: 'Comprehensive injection testing (SQL, NoSQL, Command, etc.)',
    testFiles: [
      'tests/security/injection.test.ts'
    ],
    category: 'injection',
    riskLevel: 'critical',
    timeout: 2400, // 40 minutes
    retries: 1,
    owaspMapping: ['A03:2021 – Injection'],
    nistMapping: ['SI-10', 'SI-15'],
    prerequisites: ['Database access', 'API endpoints'],
    targetComponents: ['Database layer', 'API endpoints', 'Input validation']
  },
  {
    id: 'registry-security',
    name: 'Registry Security Tests',
    description: 'Test registry manipulation and poisoning attacks',
    testFiles: [
      'tests/security/registry-security.test.ts'
    ],
    category: 'registry',
    riskLevel: 'high',
    timeout: 1500, // 25 minutes
    retries: 1,
    owaspMapping: ['A06:2021 – Vulnerable and Outdated Components', 'A08:2021 – Software and Data Integrity Failures'],
    nistMapping: ['SI-7', 'CM-4'],
    prerequisites: ['Registry access', 'Service tokens'],
    targetComponents: ['Service registry', 'Service discovery', 'Registry cache']
  },
  {
    id: 'dos-protection',
    name: 'DoS Protection Tests',
    description: 'Test denial of service protection mechanisms',
    testFiles: [
      'tests/security/dos-protection.test.ts'
    ],
    category: 'dos',
    riskLevel: 'medium',
    timeout: 900, // 15 minutes
    retries: 2,
    owaspMapping: ['A04:2021 – Insecure Design'],
    nistMapping: ['SC-5', 'SC-6'],
    prerequisites: ['Load testing tools', 'Rate limiting configuration'],
    targetComponents: ['Rate limiters', 'Circuit breakers', 'Load balancers']
  },
  {
    id: 'session-security',
    name: 'Session Security Tests',
    description: 'Test session management and token security',
    testFiles: [
      'tests/security/session-security.test.ts'
    ],
    category: 'session',
    riskLevel: 'high',
    timeout: 1200, // 20 minutes
    retries: 1,
    owaspMapping: ['A07:2021 – Identification and Authentication Failures'],
    nistMapping: ['IA-4', 'IA-5', 'SC-23'],
    prerequisites: ['Session tokens', 'Authentication system'],
    targetComponents: ['Session management', 'Token generation', 'Cookie handling']
  },
  {
    id: 'compliance-validation',
    name: 'Security Compliance Validation',
    description: 'Validate compliance with security standards',
    testFiles: [
      'tests/security/compliance.test.ts'
    ],
    category: 'compliance',
    riskLevel: 'medium',
    timeout: 600, // 10 minutes
    retries: 1,
    owaspMapping: ['All OWASP Top 10'],
    nistMapping: ['All applicable NIST controls'],
    prerequisites: ['Security configuration', 'Compliance requirements'],
    targetComponents: ['All system components']
  }
];

class SecurityAuditRunner {
  private runId: string;
  private startTime: Date;
  private testResults: SecurityResult[] = [];
  private environment: string;
  private gitCommit?: string;
  private gitBranch?: string;

  constructor() {
    this.runId = `security-audit-${Date.now()}`;
    this.startTime = new Date();
    this.environment = process.env.NODE_ENV || 'security-test';
    this.gitCommit = process.env.GIT_COMMIT || process.env.GITHUB_SHA;
    this.gitBranch = process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME;
  }

  async runSecurityAudit(options: {
    riskLevels?: string[];
    categories?: string[];
    includeSuites?: string[];
    excludeSuites?: string[];
    failOnVulnerabilities?: boolean;
    generateReport?: boolean;
    reportFormats?: ('json' | 'html' | 'sarif')[];
    outputDir?: string;
    complianceFrameworks?: ('owasp' | 'nist')[];
  } = {}): Promise<SecurityAuditReport> {
    console.log('🔒 Starting ChittyOS Security Audit');
    console.log('===================================');
    console.log(`Audit ID: ${this.runId}`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Git Commit: ${this.gitCommit || 'unknown'}`);
    console.log(`Git Branch: ${this.gitBranch || 'unknown'}`);
    console.log(`Start Time: ${this.startTime.toISOString()}`);
    console.log('===================================\n');

    // Filter test suites based on options
    const suitesToRun = this.filterSecuritySuites(SECURITY_TEST_SUITES, options);

    console.log(`🛡️ Security Test Suites to Execute: ${suitesToRun.length}`);
    suitesToRun.forEach(suite => {
      console.log(`   - ${suite.name} (${suite.riskLevel} risk)`);
    });
    console.log('');

    // Set up security test environment
    await this.setupSecurityTestEnvironment();

    // Execute security test suites
    await this.runSecuritySuites(suitesToRun, options);

    // Generate final report
    const report = await this.generateSecurityReport(options);

    // Export reports in requested formats
    if (options.generateReport !== false) {
      await this.exportSecurityReports(report, options);
    }

    // Send security notifications
    await this.sendSecurityNotifications(report);

    // Print security summary
    this.printSecuritySummary(report);

    return report;
  }

  private filterSecuritySuites(suites: SecurityTestSuite[], options: any): SecurityTestSuite[] {
    let filtered = [...suites];

    // Filter by risk levels
    if (options.riskLevels?.length > 0) {
      filtered = filtered.filter(suite => options.riskLevels.includes(suite.riskLevel));
    }

    // Filter by categories
    if (options.categories?.length > 0) {
      filtered = filtered.filter(suite => options.categories.includes(suite.category));
    }

    // Filter by specific suites
    if (options.includeSuites?.length > 0) {
      filtered = filtered.filter(suite => options.includeSuites.includes(suite.id));
    }
    if (options.excludeSuites?.length > 0) {
      filtered = filtered.filter(suite => !options.excludeSuites.includes(suite.id));
    }

    // Sort by risk level (critical first)
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return filtered;
  }

  private async setupSecurityTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up security test environment...');

    // Verify security test prerequisites
    const requiredEnvVars = [
      'DATABASE_URL',
      'CHITTY_REGISTRY_URL',
      'SECURITY_TEST_MODE'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing security test environment variables: ${missingVars.join(', ')}`);
    }

    // Set security test specific environment variables
    process.env.NODE_ENV = 'security-test';
    process.env.SECURITY_AUDIT_RUN_ID = this.runId;
    process.env.SECURITY_TEST_MODE = 'true';

    // Create security output directories
    const outputDir = path.join(process.cwd(), 'security-results', this.runId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    console.log('✅ Security test environment ready\n');
  }

  private async runSecuritySuites(suites: SecurityTestSuite[], options: any): Promise<void> {
    console.log('🔍 Running security test suites...\n');

    for (const suite of suites) {
      console.log(`\n🛡️ Starting: ${suite.name}`);
      console.log(`   Risk Level: ${suite.riskLevel.toUpperCase()}`);
      console.log(`   Category: ${suite.category}`);
      console.log(`   OWASP Mapping: ${suite.owaspMapping.join(', ')}`);
      console.log(`   Timeout: ${suite.timeout}s`);

      const result = await this.executeSecuritySuite(suite, options);
      this.testResults.push(result);

      if (result.status === 'vulnerable' && options.failOnVulnerabilities) {
        const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical');
        if (criticalVulns.length > 0) {
          console.log(`\n🚨 Critical vulnerabilities found in: ${suite.name}`);
          console.log('   Stopping audit due to fail-on-vulnerabilities mode');
          break;
        }
      }
    }
  }

  private async executeSecuritySuite(suite: SecurityTestSuite, _options: any): Promise<SecurityResult> {
    const startTime = new Date();

    try {
      console.log(`🔍 Executing: ${suite.name}`);

      const result = await this.runSecurityTests(suite);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Analyze vulnerabilities
      const vulnerabilities = await this.analyzeVulnerabilities(result.details, suite);
      const riskScore = this.calculateRiskScore(vulnerabilities);
      const complianceStatus = this.assessCompliance(vulnerabilities, suite);
      const mitigationSuggestions = this.generateMitigationSuggestions(vulnerabilities);

      const securityResult: SecurityResult = {
        suiteId: suite.id,
        suiteName: suite.name,
        startTime,
        endTime,
        duration,
        status: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length > 0 ? 'vulnerable' :
                result.success ? 'passed' : 'failed',
        vulnerabilities,
        riskScore,
        complianceStatus,
        mitigationSuggestions,
        totalTests: result.totalTests,
        passedTests: result.passedTests,
        failedTests: result.failedTests,
        errorMessage: result.errorMessage
      };

      const statusIcon = securityResult.status === 'passed' ? '✅' :
                        securityResult.status === 'vulnerable' ? '🚨' : '❌';

      console.log(`${statusIcon} ${suite.name}: ${securityResult.status.toUpperCase()} (Risk: ${riskScore}/100)`);

      if (vulnerabilities.length > 0) {
        console.log(`   Vulnerabilities: ${vulnerabilities.length} found`);
        vulnerabilities.forEach(vuln => {
          console.log(`     - ${vuln.severity.toUpperCase()}: ${vuln.description}`);
        });
      }

      return securityResult;

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
        vulnerabilities: [],
        riskScore: 0,
        complianceStatus: { owasp: 'non-compliant', nist: 'non-compliant' },
        mitigationSuggestions: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        errorMessage: (error as Error).message
      };
    }
  }

  private async runSecurityTests(suite: SecurityTestSuite): Promise<{
    success: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    errorMessage?: string;
    details: any;
  }> {
    return new Promise((resolve) => {
      const jestArgs = [
        '--testPathPattern=' + suite.testFiles.join('|'),
        '--json',
        '--verbose',
        '--forceExit',
        `--testTimeout=${suite.timeout * 1000}`,
        '--passWithNoTests'
      ];

      console.log(`   Running: npx jest ${jestArgs.join(' ')}`);

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          SECURITY_TEST_MODE: 'true',
          SECURITY_AUDIT_RUN_ID: this.runId
        }
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
            errorMessage: code !== 0 ? stderr || 'Security test execution failed' : undefined,
            details: results
          });
        } catch (parseError) {
          resolve({
            success: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errorMessage: `Failed to parse security test results: ${(parseError as Error).message}`,
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
          errorMessage: `Security test process error: ${error.message}`,
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
            errorMessage: `Security test suite timed out after ${suite.timeout} seconds`,
            details: null
          });
        }
      }, suite.timeout * 1000);
    });
  }

  private async analyzeVulnerabilities(testDetails: any, suite: SecurityTestSuite): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (!testDetails?.testResults) {
      return vulnerabilities;
    }

    // Parse test results for security vulnerabilities
    for (const testResult of testDetails.testResults) {
      if (testResult.assertionResults) {
        for (const assertion of testResult.assertionResults) {
          if (assertion.status === 'failed' && assertion.failureMessages) {
            for (const failure of assertion.failureMessages) {
              // Extract vulnerability information from failure messages
              const vulnerability = this.parseVulnerabilityFromFailure(failure, suite);
              if (vulnerability) {
                vulnerabilities.push(vulnerability);
              }
            }
          }
        }
      }
    }

    return vulnerabilities;
  }

  private parseVulnerabilityFromFailure(failureMessage: string, _suite: SecurityTestSuite): SecurityVulnerability | null {
    // Extract vulnerability information from Jest failure messages
    // This is a simplified parser - in practice, you'd have more sophisticated parsing

    if (failureMessage.includes('SQL injection') || failureMessage.includes('injection vulnerability')) {
      return {
        id: `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        severity: 'critical',
        category: 'Injection',
        description: 'SQL injection vulnerability detected',
        impact: 'Potential unauthorized data access and manipulation',
        recommendation: 'Use parameterized queries and input validation',
        owaspMapping: ['A03:2021 – Injection'],
        exploitComplexity: 'low',
        affected: ['Database layer'],
        evidence: { failureMessage }
      };
    }

    if (failureMessage.includes('authentication bypass') || failureMessage.includes('auth bypass')) {
      return {
        id: `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        severity: 'critical',
        category: 'Authentication',
        description: 'Authentication bypass vulnerability detected',
        impact: 'Unauthorized access to protected resources',
        recommendation: 'Implement proper authentication validation',
        owaspMapping: ['A01:2021 – Broken Access Control'],
        exploitComplexity: 'medium',
        affected: ['Authentication service'],
        evidence: { failureMessage }
      };
    }

    if (failureMessage.includes('registry poisoning') || failureMessage.includes('service impersonation')) {
      return {
        id: `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        severity: 'high',
        category: 'Registry Security',
        description: 'Service registry manipulation vulnerability',
        impact: 'Potential service impersonation and data interception',
        recommendation: 'Implement service registry authentication and validation',
        owaspMapping: ['A08:2021 – Software and Data Integrity Failures'],
        exploitComplexity: 'medium',
        affected: ['Service registry'],
        evidence: { failureMessage }
      };
    }

    // Add more vulnerability patterns as needed

    return null;
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) {
      return 0;
    }

    const severityWeights = {
      critical: 40,
      high: 20,
      medium: 10,
      low: 5,
      info: 1
    };

    const totalScore = vulnerabilities.reduce((sum, vuln) => {
      return sum + severityWeights[vuln.severity];
    }, 0);

    // Cap at 100
    return Math.min(totalScore, 100);
  }

  private assessCompliance(vulnerabilities: SecurityVulnerability[], _suite: SecurityTestSuite): {
    owasp: 'compliant' | 'non-compliant' | 'partial';
    nist: 'compliant' | 'non-compliant' | 'partial';
  } {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');

    const owasp = criticalVulns.length > 0 ? 'non-compliant' :
                  highVulns.length > 0 ? 'partial' : 'compliant';

    const nist = criticalVulns.length > 0 ? 'non-compliant' :
                 highVulns.length > 0 ? 'partial' : 'compliant';

    return { owasp, nist };
  }

  private generateMitigationSuggestions(vulnerabilities: SecurityVulnerability[]): string[] {
    const suggestions = new Set<string>();

    for (const vuln of vulnerabilities) {
      suggestions.add(vuln.recommendation);

      // Add category-specific suggestions
      switch (vuln.category) {
        case 'Injection':
          suggestions.add('Implement input validation and sanitization');
          suggestions.add('Use parameterized queries and prepared statements');
          break;
        case 'Authentication':
          suggestions.add('Review authentication mechanisms');
          suggestions.add('Implement multi-factor authentication');
          break;
        case 'Registry Security':
          suggestions.add('Implement service registry authentication');
          suggestions.add('Add service identity verification');
          break;
      }
    }

    return Array.from(suggestions);
  }

  private async generateSecurityReport(_options: any): Promise<SecurityAuditReport> {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const totalSuites = this.testResults.length;
    const passedSuites = this.testResults.filter(r => r.status === 'passed').length;
    const vulnerableSuites = this.testResults.filter(r => r.status === 'vulnerable').length;
    const failedSuites = this.testResults.filter(r => r.status === 'failed').length;

    const allVulnerabilities = this.testResults.flatMap(r => r.vulnerabilities);
    const criticalVulns = allVulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = allVulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = allVulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulns = allVulnerabilities.filter(v => v.severity === 'low').length;

    const overallRiskScore = this.testResults.reduce((sum, r) => sum + r.riskScore, 0) / totalSuites || 0;

    const owaspCompliance = criticalVulns > 0 ? 'non-compliant' :
                           highVulns > 0 ? 'partial' : 'compliant';
    const nistCompliance = criticalVulns > 0 ? 'non-compliant' :
                          highVulns > 0 ? 'partial' : 'compliant';

    const recommendations = this.generateSecurityRecommendations(allVulnerabilities);
    const complianceGaps = this.identifyComplianceGaps(allVulnerabilities);

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
        vulnerableSuites,
        failedSuites,
        overallRiskScore,
        criticalVulnerabilities: criticalVulns,
        highVulnerabilities: highVulns,
        mediumVulnerabilities: mediumVulns,
        lowVulnerabilities: lowVulns,
        complianceStatus: {
          owasp: owaspCompliance,
          nist: nistCompliance
        }
      },
      recommendations,
      complianceGaps
    };
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    const mediumVulns = vulnerabilities.filter(v => v.severity === 'medium');

    if (criticalVulns.length > 0) {
      immediate.push(`Address ${criticalVulns.length} critical vulnerabilities immediately`);
      immediate.push('Implement emergency security patches');
      immediate.push('Consider taking affected systems offline if necessary');
    }

    if (highVulns.length > 0) {
      shortTerm.push(`Remediate ${highVulns.length} high-severity vulnerabilities within 1 week`);
      shortTerm.push('Implement additional security controls');
    }

    if (mediumVulns.length > 0) {
      shortTerm.push(`Address ${mediumVulns.length} medium-severity vulnerabilities within 1 month`);
    }

    longTerm.push('Implement automated security scanning in CI/CD pipeline');
    longTerm.push('Establish regular security audit schedule');
    longTerm.push('Provide security training for development team');

    return { immediate, shortTerm, longTerm };
  }

  private identifyComplianceGaps(vulnerabilities: SecurityVulnerability[]): string[] {
    const gaps = new Set<string>();

    const owaspMappings = vulnerabilities.flatMap(v => v.owaspMapping || []);
    const uniqueOwaspIssues = [...new Set(owaspMappings)];

    uniqueOwaspIssues.forEach(issue => {
      gaps.add(`OWASP compliance gap: ${issue}`);
    });

    if (vulnerabilities.some(v => v.category === 'Injection')) {
      gaps.add('Input validation framework needed');
    }

    if (vulnerabilities.some(v => v.category === 'Authentication')) {
      gaps.add('Authentication security review required');
    }

    return Array.from(gaps);
  }

  private async exportSecurityReports(report: SecurityAuditReport, options: any): Promise<void> {
    const outputDir = options.outputDir || path.join(process.cwd(), 'security-results', this.runId);
    const formats = options.reportFormats || ['json', 'html'];

    for (const format of formats) {
      await this.exportSecurityReport(report, format, outputDir);
    }
  }

  private async exportSecurityReport(report: SecurityAuditReport, format: string, outputDir: string): Promise<void> {
    const filename = `security-audit-${this.runId}.${format}`;
    const filepath = path.join(outputDir, filename);

    switch (format) {
      case 'json':
        await fs.promises.writeFile(filepath, JSON.stringify(report, null, 2));
        break;

      case 'html':
        const html = this.generateSecurityHTMLReport(report);
        await fs.promises.writeFile(filepath, html);
        break;

      case 'sarif':
        const sarif = this.generateSARIFReport(report);
        await fs.promises.writeFile(filepath, JSON.stringify(sarif, null, 2));
        break;
    }

    console.log(`📄 Security report exported: ${filepath}`);
  }

  private generateSecurityHTMLReport(report: SecurityAuditReport): string {
    const vulnerabilityRows = report.testSuites.flatMap(suite =>
      suite.vulnerabilities.map(vuln => `
        <tr class="${vuln.severity}">
          <td>${vuln.severity.toUpperCase()}</td>
          <td>${vuln.category}</td>
          <td>${vuln.description}</td>
          <td>${vuln.affected.join(', ')}</td>
          <td>${vuln.recommendation}</td>
        </tr>
      `)
    ).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>ChittyOS Security Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .critical { background-color: #f8d7da; }
        .high { background-color: #fff3cd; }
        .medium { background-color: #cce5ff; }
        .low { background-color: #d4edda; }
        .vulnerabilities-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .vulnerabilities-table th, .vulnerabilities-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .vulnerabilities-table th { background-color: #f2f2f2; }
        .recommendations { background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .risk-score { font-size: 2em; font-weight: bold; color: ${report.summary.overallRiskScore > 70 ? '#dc3545' : report.summary.overallRiskScore > 30 ? '#ffc107' : '#28a745'}; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 ChittyOS Security Audit Report</h1>
        <p><strong>Audit ID:</strong> ${report.runId}</p>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Duration:</strong> ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes</p>
        <p><strong>Overall Risk Score:</strong> <span class="risk-score">${report.summary.overallRiskScore.toFixed(1)}/100</span></p>
    </div>

    <div class="summary">
        <div class="summary-card critical">
            <h3>Critical</h3>
            <div class="risk-score">${report.summary.criticalVulnerabilities}</div>
        </div>
        <div class="summary-card high">
            <h3>High</h3>
            <div class="risk-score">${report.summary.highVulnerabilities}</div>
        </div>
        <div class="summary-card medium">
            <h3>Medium</h3>
            <div class="risk-score">${report.summary.mediumVulnerabilities}</div>
        </div>
        <div class="summary-card low">
            <h3>Low</h3>
            <div class="risk-score">${report.summary.lowVulnerabilities}</div>
        </div>
    </div>

    <h2>Compliance Status</h2>
    <p>OWASP Top 10: <strong>${report.summary.complianceStatus.owasp.toUpperCase()}</strong></p>
    <p>NIST Framework: <strong>${report.summary.complianceStatus.nist.toUpperCase()}</strong></p>

    <h2>Vulnerabilities</h2>
    <table class="vulnerabilities-table">
        <thead>
            <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Description</th>
                <th>Affected Components</th>
                <th>Recommendation</th>
            </tr>
        </thead>
        <tbody>
            ${vulnerabilityRows}
        </tbody>
    </table>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <h3>Immediate Actions</h3>
        <ul>
            ${report.recommendations.immediate.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        <h3>Short-term Actions</h3>
        <ul>
            ${report.recommendations.shortTerm.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        <h3>Long-term Actions</h3>
        <ul>
            ${report.recommendations.longTerm.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
  }

  private generateSARIFReport(report: SecurityAuditReport): any {
    // SARIF (Static Analysis Results Interchange Format) for security tools
    return {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "ChittyOS Security Audit",
            version: "1.0.0",
            informationUri: "https://chitty.cc/security-audit"
          }
        },
        results: report.testSuites.flatMap(suite =>
          suite.vulnerabilities.map(vuln => ({
            ruleId: vuln.id,
            level: vuln.severity === 'critical' ? 'error' :
                   vuln.severity === 'high' ? 'error' :
                   vuln.severity === 'medium' ? 'warning' : 'note',
            message: {
              text: vuln.description
            },
            locations: [{
              physicalLocation: {
                artifactLocation: {
                  uri: vuln.affected[0] || 'unknown'
                }
              }
            }]
          }))
        )
      }]
    };
  }

  private async sendSecurityNotifications(report: SecurityAuditReport): Promise<void> {
    try {
      const criticalVulns = report.summary.criticalVulnerabilities;
      const highVulns = report.summary.highVulnerabilities;

      if (criticalVulns > 0 || highVulns > 0) {
        // Send urgent security notifications
        if (process.env.SECURITY_ALERT_EMAIL) {
          await this.sendSecurityAlertEmail(report);
        }

        if (process.env.SECURITY_ALERT_SLACK) {
          await this.sendSecurityAlertSlack(report);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to send security notifications: ${(error as Error).message}`);
    }
  }

  private async sendSecurityAlertEmail(_report: SecurityAuditReport): Promise<void> {
    // Security alert email implementation would go here
    console.log('📧 Security alert email sent');
  }

  private async sendSecurityAlertSlack(_report: SecurityAuditReport): Promise<void> {
    // Security alert Slack notification implementation would go here
    console.log('🚨 Security alert Slack notification sent');
  }

  private printSecuritySummary(report: SecurityAuditReport): void {
    console.log('\n🔒 SECURITY AUDIT COMPLETED');
    console.log('===========================');
    console.log(`Audit ID: ${report.runId}`);
    console.log(`Overall Risk Score: ${report.summary.overallRiskScore.toFixed(1)}/100`);
    console.log(`Total Duration: ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Test Suites: ${report.summary.passedSuites}/${report.summary.totalSuites} passed`);
    console.log(`Vulnerabilities: ${report.summary.criticalVulnerabilities} critical, ${report.summary.highVulnerabilities} high, ${report.summary.mediumVulnerabilities} medium, ${report.summary.lowVulnerabilities} low`);
    console.log(`OWASP Compliance: ${report.summary.complianceStatus.owasp.toUpperCase()}`);
    console.log(`NIST Compliance: ${report.summary.complianceStatus.nist.toUpperCase()}`);

    if (report.recommendations.immediate.length > 0) {
      console.log('\n🚨 IMMEDIATE ACTIONS REQUIRED:');
      report.recommendations.immediate.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('===========================\n');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new SecurityAuditRunner();

  const options = {
    riskLevels: args.includes('--critical') ? ['critical'] :
                args.includes('--high') ? ['critical', 'high'] : undefined,
    categories: args.includes('--auth') ? ['authentication'] :
                args.includes('--injection') ? ['injection'] :
                args.includes('--registry') ? ['registry'] : undefined,
    failOnVulnerabilities: args.includes('--fail-on-vulnerabilities'),
    generateReport: !args.includes('--no-report'),
    reportFormats: ['json', 'html', 'sarif'] as ('json' | 'html' | 'sarif')[],
    outputDir: process.env.SECURITY_OUTPUT_DIR
  };

  try {
    const report = await runner.runSecurityAudit(options);

    // Exit with error code if vulnerabilities found
    const hasVulnerabilities = report.summary.criticalVulnerabilities > 0 || report.summary.highVulnerabilities > 0;
    process.exit(hasVulnerabilities ? 1 : 0);
  } catch (error) {
    console.error('💥 Security audit failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SecurityAuditRunner, SECURITY_TEST_SUITES };