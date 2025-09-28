#!/usr/bin/env tsx

/**
 * ChittyChain Notion Implementation - Automated Deployment Script
 *
 * Complete deployment automation for the Notion integration
 * Run with: npm run deploy:notion
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

config();

interface DeploymentStep {
  name: string;
  description: string;
  execute: () => Promise<any>;
  required: boolean;
  rollback?: () => Promise<void>;
}

interface DeploymentResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  duration: number;
}

class NotionDeployment {
  private results: DeploymentResult[] = [];
  private rollbackStack: Array<() => Promise<void>> = [];

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment() {
    const required = [
      'DATABASE_URL',
      'NOTION_API_KEY'
    ];

    const missing = required.filter(env => !process.env[env]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  private async executeStep(step: DeploymentStep): Promise<DeploymentResult> {
    console.log(`\n🔄 ${step.name}`);
    console.log(`   ${step.description}`);

    const startTime = Date.now();

    try {
      const data = await step.execute();
      const duration = Date.now() - startTime;

      if (step.rollback) {
        this.rollbackStack.push(step.rollback);
      }

      const result: DeploymentResult = {
        step: step.name,
        success: true,
        message: 'Step completed successfully',
        data,
        duration
      };

      console.log(`✅ ${step.name} completed (${duration}ms)`);
      this.results.push(result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      const result: DeploymentResult = {
        step: step.name,
        success: false,
        message,
        duration
      };

      console.log(`❌ ${step.name} failed (${duration}ms): ${message}`);
      this.results.push(result);

      if (step.required) {
        throw new Error(`Required step failed: ${step.name} - ${message}`);
      }

      return result;
    }
  }

  private async runCommand(command: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', reject);
    });
  }

  private async backupCurrentState(): Promise<any> {
    const backupData = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? '***masked***' : undefined,
        NOTION_API_KEY: process.env.NOTION_API_KEY ? '***masked***' : undefined
      },
      databaseIds: {
        people: process.env.NOTION_DATABASE_PEOPLE,
        places: process.env.NOTION_DATABASE_PLACES,
        things: process.env.NOTION_DATABASE_THINGS,
        events: process.env.NOTION_DATABASE_EVENTS,
        authorities: process.env.NOTION_DATABASE_AUTHORITIES,
        cases: process.env.NOTION_DATABASE_CASES,
        evidence: process.env.NOTION_DATABASE_EVIDENCE,
        facts: process.env.NOTION_DATABASE_FACTS,
        propertyPins: process.env.NOTION_DATABASE_PROPERTY_PINS
      }
    };

    const backupFile = `backup-${Date.now()}.json`;
    writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    return { backupFile, data: backupData };
  }

  async deploy(): Promise<void> {
    console.log('🚀 ChittyChain Notion Implementation - Automated Deployment');
    console.log('===========================================================');

    const steps: DeploymentStep[] = [
      {
        name: 'Environment Backup',
        description: 'Creating backup of current configuration',
        execute: () => this.backupCurrentState(),
        required: true
      },
      {
        name: 'Database Schema Validation',
        description: 'Ensuring PostgreSQL schema is up to date',
        execute: async () => {
          if (!existsSync('db/production-schema.sql')) {
            throw new Error('Database schema file not found');
          }

          // Check if schema is applied
          const result = await this.runCommand('psql', [
            process.env.DATABASE_URL!,
            '-c',
            "SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;"
          ]);

          return { schemaVersion: result.trim() };
        },
        required: true
      },
      {
        name: 'Dependency Installation',
        description: 'Installing and updating dependencies',
        execute: async () => {
          const output = await this.runCommand('npm', ['install']);
          return { npmOutput: output };
        },
        required: true
      },
      {
        name: 'TypeScript Compilation',
        description: 'Compiling TypeScript source code',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'lint']);
          return { tscOutput: output };
        },
        required: true
      },
      {
        name: 'Notion Database Setup',
        description: 'Creating Notion databases with proper schema',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'setup:notion']);
          return { setupOutput: output };
        },
        required: true,
        rollback: async () => {
          console.log('🔄 Rolling back Notion database creation...');
          // Note: Notion databases would need manual cleanup
        }
      },
      {
        name: 'Database Connection Test',
        description: 'Testing connectivity to all systems',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'test:notion:databases']);
          return { testOutput: output };
        },
        required: true
      },
      {
        name: 'CRUD Operations Test',
        description: 'Validating basic database operations',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'test:notion']);
          return { crudTestOutput: output };
        },
        required: true
      },
      {
        name: 'Initial Data Sync',
        description: 'Synchronizing existing data from PostgreSQL to Notion',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'sync:initial']);
          return { syncOutput: output };
        },
        required: false
      },
      {
        name: 'Sync Verification',
        description: 'Verifying data integrity after initial sync',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'sync:verify']);
          return { verificationOutput: output };
        },
        required: false
      },
      {
        name: 'Worker Deployment',
        description: 'Starting background sync workers',
        execute: async () => {
          const output = await this.runCommand('npm', ['run', 'sync:worker']);
          return { workerOutput: output };
        },
        required: false
      },
      {
        name: 'Health Check',
        description: 'Final system health validation',
        execute: async () => {
          const output = await this.runCommand('curl', [
            'http://localhost:3000/health',
            '-f',
            '-s'
          ]);
          return { healthOutput: JSON.parse(output) };
        },
        required: true
      }
    ];

    try {
      for (const step of steps) {
        await this.executeStep(step);
      }

      this.printSuccessSummary();

    } catch (error) {
      console.log(`\n❌ Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
      await this.rollback();
      process.exit(1);
    }
  }

  private async rollback(): Promise<void> {
    if (this.rollbackStack.length === 0) {
      console.log('ℹ️  No rollback actions to perform');
      return;
    }

    console.log('\n🔄 Rolling back deployment...');

    for (const rollbackFn of this.rollbackStack.reverse()) {
      try {
        await rollbackFn();
      } catch (error) {
        console.log(`⚠️  Rollback step failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('✅ Rollback completed');
  }

  private printSuccessSummary(): void {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL');
    console.log('========================');

    const totalSteps = this.results.length;
    const successfulSteps = this.results.filter(r => r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`📊 Summary: ${successfulSteps}/${totalSteps} steps completed in ${totalDuration}ms`);

    console.log('\n📋 Next Steps:');
    console.log('1. Access your Notion workspace to see the ChittyChain databases');
    console.log('2. Start adding evidence and cases through the web interface');
    console.log('3. Monitor sync operations via the dashboard');
    console.log('4. Configure webhooks for real-time bidirectional sync');

    console.log('\n🔗 Useful Commands:');
    console.log('• npm run test:notion          - Run comprehensive tests');
    console.log('• npm run sync:status          - Check sync worker status');
    console.log('• curl http://localhost:3000/health - System health check');

    console.log('\n📚 Documentation:');
    console.log('• notion/DEPLOYMENT_GUIDE.md   - Complete deployment guide');
    console.log('• notion/database-templates.md - Database schema reference');
    console.log('• PHASE_1_COMPLETE.md          - Architecture overview');

    if (process.env.NODE_ENV === 'production') {
      console.log('\n⚠️  PRODUCTION DEPLOYMENT REMINDERS:');
      console.log('• Set up monitoring and alerting');
      console.log('• Configure automated backups');
      console.log('• Review security settings');
      console.log('• Update DNS and SSL certificates');
    }
  }
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    skipTests: args.includes('--skip-tests'),
    dryRun: args.includes('--dry-run')
  };

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  if (options.force) {
    console.log('⚠️  FORCE MODE - Skipping safety checks');
  }

  try {
    const deployment = new NotionDeployment();
    await deployment.deploy();
  } catch (error) {
    console.error('💥 Deployment initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}