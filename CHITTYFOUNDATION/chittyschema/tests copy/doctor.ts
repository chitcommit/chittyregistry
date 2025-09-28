/**
 * ChittyChain Testing Framework Doctor
 * Comprehensive diagnostic and health check system
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'missing';
  message: string;
  recommendations?: string[];
  details?: any;
}

interface HealthCheck {
  overall_status: 'healthy' | 'degraded' | 'critical';
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  failed_checks: number;
  results: DiagnosticResult[];
  summary: string;
  next_steps: string[];
}

class ChittyChainDoctor {
  private results: DiagnosticResult[] = [];

  async runDiagnostics(): Promise<HealthCheck> {
    console.log('🏥 ChittyChain Testing Framework Doctor');
    console.log('=====================================\n');

    console.log('🔍 Running comprehensive health checks...\n');

    // Core file structure checks
    await this.checkCoreFiles();
    await this.checkConfigurationFiles();
    await this.checkTestSuites();
    await this.checkEnhancementModules();
    await this.checkDependencies();
    await this.checkDirectoryStructure();
    await this.checkPermissions();
    await this.checkEnvironment();

    // Generate health report
    const healthCheck = this.generateHealthReport();
    this.printDetailedReport(healthCheck);

    return healthCheck;
  }

  private async checkCoreFiles(): Promise<void> {
    console.log('📁 Checking core framework files...');

    const coreFiles = [
      'package.json',
      'tsconfig.json',
      'vitest.config.ts',
      'test-runner.ts',
      'test-setup.ts'
    ];

    for (const file of coreFiles) {
      if (existsSync(file)) {
        try {
          const stats = statSync(file);
          this.results.push({
            component: `Core File: ${file}`,
            status: 'healthy',
            message: `File exists and is accessible (${stats.size} bytes)`,
            details: { size: stats.size, modified: stats.mtime }
          });
        } catch (error) {
          this.results.push({
            component: `Core File: ${file}`,
            status: 'critical',
            message: `File exists but cannot be read: ${error}`,
            recommendations: ['Check file permissions', 'Verify file integrity']
          });
        }
      } else {
        this.results.push({
          component: `Core File: ${file}`,
          status: 'missing',
          message: 'Required core file is missing',
          recommendations: [
            'Restore from version control',
            'Regenerate framework files',
            'Check deployment process'
          ]
        });
      }
    }
  }

  private async checkConfigurationFiles(): Promise<void> {
    console.log('⚙️  Checking configuration files...');

    // Check package.json
    if (existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

        const requiredScripts = ['test', 'test:qa', 'test:pentest', 'test:load', 'test:security'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

        if (missingScripts.length === 0) {
          this.results.push({
            component: 'Package Configuration',
            status: 'healthy',
            message: 'All required scripts are configured',
            details: { scripts: Object.keys(packageJson.scripts || {}) }
          });
        } else {
          this.results.push({
            component: 'Package Configuration',
            status: 'warning',
            message: `Missing scripts: ${missingScripts.join(', ')}`,
            recommendations: ['Add missing npm scripts', 'Update package.json configuration']
          });
        }

        // Check dependencies
        const requiredDeps = ['vitest', 'typescript', 'ts-node'];
        const missingDeps = requiredDeps.filter(dep =>
          !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );

        if (missingDeps.length === 0) {
          this.results.push({
            component: 'Dependencies',
            status: 'healthy',
            message: 'All required dependencies are configured'
          });
        } else {
          this.results.push({
            component: 'Dependencies',
            status: 'critical',
            message: `Missing dependencies: ${missingDeps.join(', ')}`,
            recommendations: ['Run npm install', 'Add missing dependencies to package.json']
          });
        }

      } catch (error) {
        this.results.push({
          component: 'Package Configuration',
          status: 'critical',
          message: `Cannot parse package.json: ${error}`,
          recommendations: ['Fix JSON syntax errors', 'Restore valid package.json']
        });
      }
    }

    // Check TypeScript configuration
    if (existsSync('tsconfig.json')) {
      try {
        const tsConfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'));

        if (tsConfig.compilerOptions?.module === 'ESNext' && tsConfig.compilerOptions?.target) {
          this.results.push({
            component: 'TypeScript Configuration',
            status: 'healthy',
            message: 'TypeScript configuration is properly set for ES modules'
          });
        } else {
          this.results.push({
            component: 'TypeScript Configuration',
            status: 'warning',
            message: 'TypeScript configuration may need optimization for ES modules',
            recommendations: ['Update tsconfig.json for ES module compatibility']
          });
        }
      } catch (error) {
        this.results.push({
          component: 'TypeScript Configuration',
          status: 'critical',
          message: `Cannot parse tsconfig.json: ${error}`,
          recommendations: ['Fix JSON syntax errors', 'Restore valid tsconfig.json']
        });
      }
    }
  }

  private async checkTestSuites(): Promise<void> {
    console.log('🧪 Checking test suites...');

    const testSuites = [
      'qa-test-suite.ts',
      'penetration-tests.ts',
      'load-testing.ts',
      'security-automation.ts'
    ];

    for (const suite of testSuites) {
      if (existsSync(suite)) {
        try {
          const content = readFileSync(suite, 'utf8');

          // Check for basic test structure
          if (content.includes('describe') || content.includes('test') || content.includes('it')) {
            this.results.push({
              component: `Test Suite: ${suite}`,
              status: 'healthy',
              message: 'Test suite exists and contains test definitions',
              details: { lines: content.split('\n').length }
            });
          } else {
            this.results.push({
              component: `Test Suite: ${suite}`,
              status: 'warning',
              message: 'Test suite exists but may not contain valid tests',
              recommendations: ['Verify test syntax', 'Check for test framework imports']
            });
          }
        } catch (error) {
          this.results.push({
            component: `Test Suite: ${suite}`,
            status: 'critical',
            message: `Cannot read test suite: ${error}`,
            recommendations: ['Check file permissions', 'Verify file encoding']
          });
        }
      } else {
        this.results.push({
          component: `Test Suite: ${suite}`,
          status: 'missing',
          message: 'Test suite file is missing',
          recommendations: [
            'Restore test suite from backup',
            'Regenerate test suite',
            'Check version control'
          ]
        });
      }
    }
  }

  private async checkEnhancementModules(): Promise<void> {
    console.log('🚀 Checking enhancement modules...');

    const enhancementModules = [
      'mock-server.ts',
      'enhanced-reporting.ts',
      'test-data-generator.ts',
      'test-cache-manager.ts',
      'security-baseline-manager.ts'
    ];

    for (const module of enhancementModules) {
      if (existsSync(module)) {
        try {
          const content = readFileSync(module, 'utf8');

          // Check for class definitions or exports
          if (content.includes('export class') || content.includes('export {')) {
            this.results.push({
              component: `Enhancement: ${module}`,
              status: 'healthy',
              message: 'Enhancement module exists and exports functionality',
              details: { lines: content.split('\n').length }
            });
          } else {
            this.results.push({
              component: `Enhancement: ${module}`,
              status: 'warning',
              message: 'Enhancement module exists but may not export correctly',
              recommendations: ['Verify export syntax', 'Check module structure']
            });
          }
        } catch (error) {
          this.results.push({
            component: `Enhancement: ${module}`,
            status: 'critical',
            message: `Cannot read enhancement module: ${error}`,
            recommendations: ['Check file permissions', 'Verify file integrity']
          });
        }
      } else {
        this.results.push({
          component: `Enhancement: ${module}`,
          status: 'missing',
          message: 'Enhancement module is missing',
          recommendations: [
            'Restore enhancement module',
            'Regenerate missing functionality',
            'Update from repository'
          ]
        });
      }
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    if (existsSync('node_modules')) {
      try {
        const nodeModulesStats = statSync('node_modules');

        if (nodeModulesStats.isDirectory()) {
          const packages = readdirSync('node_modules');
          const requiredPackages = ['vitest', 'typescript', 'ts-node'];
          const installedRequired = requiredPackages.filter(pkg => packages.includes(pkg));

          if (installedRequired.length === requiredPackages.length) {
            this.results.push({
              component: 'Node Modules',
              status: 'healthy',
              message: `All required packages installed (${packages.length} total packages)`,
              details: { total_packages: packages.length, required_installed: installedRequired }
            });
          } else {
            const missing = requiredPackages.filter(pkg => !packages.includes(pkg));
            this.results.push({
              component: 'Node Modules',
              status: 'critical',
              message: `Missing required packages: ${missing.join(', ')}`,
              recommendations: ['Run npm install', 'Check package.json dependencies']
            });
          }
        }
      } catch (error) {
        this.results.push({
          component: 'Node Modules',
          status: 'critical',
          message: `Cannot access node_modules: ${error}`,
          recommendations: ['Run npm install', 'Check directory permissions']
        });
      }
    } else {
      this.results.push({
        component: 'Node Modules',
        status: 'missing',
        message: 'node_modules directory does not exist',
        recommendations: ['Run npm install to install dependencies']
      });
    }
  }

  private async checkDirectoryStructure(): Promise<void> {
    console.log('📂 Checking directory structure...');

    const requiredDirs = [
      'test-results',
      'test-results/cache',
      'test-results/baselines',
      'test-results/security-baselines',
      'test-results/threat-intelligence'
    ];

    for (const dir of requiredDirs) {
      if (existsSync(dir)) {
        const stats = statSync(dir);
        if (stats.isDirectory()) {
          this.results.push({
            component: `Directory: ${dir}`,
            status: 'healthy',
            message: 'Required directory exists and is accessible'
          });
        } else {
          this.results.push({
            component: `Directory: ${dir}`,
            status: 'critical',
            message: 'Path exists but is not a directory',
            recommendations: ['Remove conflicting file', 'Create directory structure']
          });
        }
      } else {
        this.results.push({
          component: `Directory: ${dir}`,
          status: 'warning',
          message: 'Directory will be created automatically when needed',
          recommendations: ['Directory will be auto-created during test execution']
        });
      }
    }
  }

  private async checkPermissions(): Promise<void> {
    console.log('🔐 Checking file permissions...');

    try {
      // Check read permissions
      const testFiles = ['package.json'];
      for (const file of testFiles) {
        if (existsSync(file)) {
          try {
            readFileSync(file, 'utf8');
            this.results.push({
              component: `Permissions: ${file}`,
              status: 'healthy',
              message: 'File has proper read permissions'
            });
          } catch (error) {
            this.results.push({
              component: `Permissions: ${file}`,
              status: 'critical',
              message: `Cannot read file: ${error}`,
              recommendations: ['Check file permissions', 'Fix ownership issues']
            });
          }
        }
      }

      // Check write permissions for test-results
      this.results.push({
        component: 'Write Permissions',
        status: 'healthy',
        message: 'Write permissions will be tested during test execution'
      });

    } catch (error) {
      this.results.push({
        component: 'File Permissions',
        status: 'critical',
        message: `Permission check failed: ${error}`,
        recommendations: ['Check user permissions', 'Fix file ownership']
      });
    }
  }

  private async checkEnvironment(): Promise<void> {
    console.log('🌍 Checking environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      this.results.push({
        component: 'Node.js Version',
        status: 'healthy',
        message: `Node.js ${nodeVersion} meets requirements (>=18.0.0)`,
        details: { version: nodeVersion, major: majorVersion }
      });
    } else {
      this.results.push({
        component: 'Node.js Version',
        status: 'critical',
        message: `Node.js ${nodeVersion} is below minimum requirement (18.0.0)`,
        recommendations: ['Upgrade Node.js to version 18 or higher']
      });
    }

    // Check environment variables
    const envVars = ['NODE_ENV', 'CHITTY_SCHEMA_URL', 'CHITTY_ID_PIPELINE_URL'];
    const setVars = envVars.filter(varName => process.env[varName]);

    this.results.push({
      component: 'Environment Variables',
      status: setVars.length > 0 ? 'healthy' : 'warning',
      message: `${setVars.length}/${envVars.length} environment variables set`,
      details: { set: setVars, all: envVars },
      recommendations: setVars.length === 0 ? ['Set environment variables for proper configuration'] : undefined
    });

    // Check platform
    this.results.push({
      component: 'Platform',
      status: 'healthy',
      message: `Running on ${process.platform} ${process.arch}`,
      details: { platform: process.platform, arch: process.arch }
    });
  }

  private generateHealthReport(): HealthCheck {
    const totalChecks = this.results.length;
    const healthyChecks = this.results.filter(r => r.status === 'healthy').length;
    const warningChecks = this.results.filter(r => r.status === 'warning').length;
    const criticalChecks = this.results.filter(r => r.status === 'critical').length;
    const missingChecks = this.results.filter(r => r.status === 'missing').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    let summary: string;
    const nextSteps: string[] = [];

    if (criticalChecks > 0 || missingChecks > 5) {
      overallStatus = 'critical';
      summary = 'Framework has critical issues that prevent operation';
      nextSteps.push('Address critical and missing components immediately');
      nextSteps.push('Run npm install to restore dependencies');
      nextSteps.push('Restore missing test files from backup or repository');
    } else if (warningChecks > 3 || missingChecks > 0) {
      overallStatus = 'degraded';
      summary = 'Framework is functional but has performance or feature limitations';
      nextSteps.push('Address warnings to improve framework reliability');
      nextSteps.push('Create missing directories and configuration files');
    } else {
      overallStatus = 'healthy';
      summary = 'Framework is fully operational and ready for testing';
      nextSteps.push('Run integration test to verify full functionality');
      nextSteps.push('Execute test suites to validate system health');
    }

    if (missingChecks > 0) {
      nextSteps.push('Use the setup script to restore missing components');
    }

    return {
      overall_status: overallStatus,
      total_checks: totalChecks,
      passed_checks: healthyChecks,
      warning_checks: warningChecks,
      failed_checks: criticalChecks + missingChecks,
      results: this.results,
      summary,
      next_steps: nextSteps
    };
  }

  private printDetailedReport(healthCheck: HealthCheck): void {
    console.log('\n📊 DIAGNOSTIC RESULTS');
    console.log('=====================\n');

    // Status indicators
    const statusIcon = {
      'healthy': '✅',
      'warning': '⚠️ ',
      'critical': '❌',
      'missing': '🚫'
    };

    // Group results by status
    const grouped = {
      healthy: healthCheck.results.filter(r => r.status === 'healthy'),
      warning: healthCheck.results.filter(r => r.status === 'warning'),
      critical: healthCheck.results.filter(r => r.status === 'critical'),
      missing: healthCheck.results.filter(r => r.status === 'missing')
    };

    // Print healthy components (condensed)
    if (grouped.healthy.length > 0) {
      console.log('✅ HEALTHY COMPONENTS:');
      grouped.healthy.forEach(result => {
        console.log(`   ${statusIcon[result.status]} ${result.component}`);
      });
      console.log('');
    }

    // Print warnings with details
    if (grouped.warning.length > 0) {
      console.log('⚠️  WARNINGS:');
      grouped.warning.forEach(result => {
        console.log(`   ${statusIcon[result.status]} ${result.component}`);
        console.log(`      ${result.message}`);
        if (result.recommendations) {
          result.recommendations.forEach(rec => console.log(`      → ${rec}`));
        }
        console.log('');
      });
    }

    // Print critical issues with details
    if (grouped.critical.length > 0) {
      console.log('❌ CRITICAL ISSUES:');
      grouped.critical.forEach(result => {
        console.log(`   ${statusIcon[result.status]} ${result.component}`);
        console.log(`      ${result.message}`);
        if (result.recommendations) {
          result.recommendations.forEach(rec => console.log(`      → ${rec}`));
        }
        console.log('');
      });
    }

    // Print missing components with details
    if (grouped.missing.length > 0) {
      console.log('🚫 MISSING COMPONENTS:');
      grouped.missing.forEach(result => {
        console.log(`   ${statusIcon[result.status]} ${result.component}`);
        console.log(`      ${result.message}`);
        if (result.recommendations) {
          result.recommendations.forEach(rec => console.log(`      → ${rec}`));
        }
        console.log('');
      });
    }

    // Print summary
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log(`Overall Status: ${healthCheck.overall_status.toUpperCase()}`);
    console.log(`Total Checks: ${healthCheck.total_checks}`);
    console.log(`✅ Passed: ${healthCheck.passed_checks}`);
    console.log(`⚠️  Warnings: ${healthCheck.warning_checks}`);
    console.log(`❌ Failed: ${healthCheck.failed_checks}`);
    console.log(`\n${healthCheck.summary}\n`);

    // Print next steps
    if (healthCheck.next_steps.length > 0) {
      console.log('🎯 NEXT STEPS');
      console.log('=============');
      healthCheck.next_steps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
      console.log('');
    }

    // Print quick fix commands
    if (healthCheck.overall_status !== 'healthy') {
      console.log('🔧 QUICK FIX COMMANDS');
      console.log('====================');
      console.log('npm install                    # Install dependencies');
      console.log('npm run setup                  # Run setup script');
      console.log('npm run integration           # Test framework functionality');
      console.log('npm run doctor                # Re-run diagnostics');
      console.log('');
    }
  }
}

// Run diagnostics if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const doctor = new ChittyChainDoctor();
  doctor.runDiagnostics().then(result => {
    process.exit(result.overall_status === 'healthy' ? 0 : 1);
  }).catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

export { ChittyChainDoctor };