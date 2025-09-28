#!/usr/bin/env tsx
/**
 * ChittySchema Project Sync CLI
 * Command-line interface for managing project synchronization
 */

import { Command } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';
import 'dotenv/config';

const program = new Command();
const API_BASE = process.env.API_URL || 'http://localhost:3000';

// Session ID from environment or generate one
const SESSION_ID = process.env.CLAUDE_SESSION_ID || 'e8d3c439-4508-4597-a8d9-7bf3c5bf3ec8';

// Type definitions for API responses
interface InitResponse {
  sessionId: string;
  projectId: string;
  config: any;
}

interface StatusResponse {
  sessionId: string;
  status: {
    status: string;
    lastSync?: string;
    conflicts: number;
    pendingChanges: number;
    error?: string;
  };
  config: {
    enabled: boolean;
    syncInterval: number;
    endpoints: {
      registry: string;
      schema: string;
      chain: string;
    };
  };
}

interface TriggerResponse {
  success: boolean;
  message: string;
  syncId: string;
  changesDetected: number;
}

interface StateResponse {
  state: {
    sessionId: string;
    projectId: string;
    schema: {
      version: string;
      lastModified: string;
      checksum: string;
    };
    database: {
      url?: string;
      lastBackup?: string;
    };
    services: {
      registry: boolean;
      propagation: boolean;
      api: boolean;
    };
  };
}

interface ConfigResponse {
  config: {
    enabled: boolean;
    syncInterval: number;
    endpoints: {
      registry: string;
      schema: string;
      chain: string;
    };
  };
}

interface CleanupResponse {
  message: string;
  existed: boolean;
}

async function apiCall(endpoint: string, method = 'GET', data?: any) {
  const url = `${API_BASE}/api/v1/sync/project${endpoint}`;

  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText })) as { error?: string; message?: string };
    throw new Error(`API Error: ${error.error || error.message || response.statusText}`);
  }

  return response.json();
}

program
  .name('sync-cli')
  .description('ChittySchema Project Sync CLI')
  .version('1.0.0');

// Initialize sync for current session
program
  .command('init')
  .description('Initialize project sync for current session')
  .option('-n, --name <name>', 'Project name', 'chittyschema')
  .action(async (options) => {
    const spinner = ora('Initializing project sync...').start();

    try {
      const result = await apiCall('/initialize', 'POST', {
        sessionId: SESSION_ID,
        projectName: options.name
      }) as InitResponse;

      spinner.succeed('Project sync initialized successfully');
      console.log(chalk.green('✓ Session ID:'), result.sessionId);
      console.log(chalk.green('✓ Project ID:'), result.projectId);
      console.log(chalk.blue('ℹ Config:'), JSON.stringify(result.config, null, 2));
    } catch (error) {
      spinner.fail('Failed to initialize project sync');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Get sync status
program
  .command('status')
  .description('Get sync status for current session')
  .action(async () => {
    const spinner = ora('Fetching sync status...').start();

    try {
      const result = await apiCall(`/status/${SESSION_ID}`) as StatusResponse;

      spinner.succeed('Sync status retrieved');

      console.log(chalk.yellow('📊 Sync Status'));
      console.log('================');
      console.log(chalk.blue('Session ID:'), result.sessionId);
      console.log(chalk.blue('Status:'), getStatusColor(result.status.status), result.status.status);
      console.log(chalk.blue('Last Sync:'), result.status.lastSync || 'Never');
      console.log(chalk.blue('Conflicts:'), result.status.conflicts);
      console.log(chalk.blue('Pending Changes:'), result.status.pendingChanges);

      if (result.status.error) {
        console.log(chalk.red('Error:'), result.status.error);
      }

      console.log('\n' + chalk.yellow('⚙️  Configuration'));
      console.log('=================');
      console.log(chalk.blue('Enabled:'), result.config.enabled ? '✓' : '✗');
      console.log(chalk.blue('Sync Interval:'), `${result.config.syncInterval}ms`);
      console.log(chalk.blue('Registry:'), result.config.endpoints.registry);
      console.log(chalk.blue('Schema:'), result.config.endpoints.schema);
      console.log(chalk.blue('Chain:'), result.config.endpoints.chain);

    } catch (error) {
      spinner.fail('Failed to fetch sync status');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Trigger manual sync
program
  .command('trigger')
  .description('Manually trigger sync for current session')
  .action(async () => {
    const spinner = ora('Triggering sync...').start();

    try {
      const result = await apiCall(`/trigger/${SESSION_ID}`, 'POST') as TriggerResponse;

      spinner.succeed('Sync triggered successfully');
      console.log(chalk.green('✓ Success:'), result.success);
      console.log(chalk.blue('ℹ Message:'), result.message);

      // Wait a moment and check status
      spinner.start('Checking sync progress...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResult = await apiCall(`/status/${SESSION_ID}`) as StatusResponse;
      spinner.succeed('Sync completed');

      console.log(chalk.blue('Final Status:'), getStatusColor(statusResult.status.status), statusResult.status.status);
      console.log(chalk.blue('Last Sync:'), statusResult.status.lastSync);

    } catch (error) {
      spinner.fail('Failed to trigger sync');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Get project state
program
  .command('state')
  .description('Get current project state')
  .action(async () => {
    const spinner = ora('Fetching project state...').start();

    try {
      const result = await apiCall(`/state/${SESSION_ID}`) as StateResponse;

      spinner.succeed('Project state retrieved');

      console.log(chalk.yellow('🏗️  Project State'));
      console.log('==================');
      console.log(chalk.blue('Session ID:'), result.state.sessionId);
      console.log(chalk.blue('Project ID:'), result.state.projectId);

      console.log('\n' + chalk.yellow('📋 Schema'));
      console.log('===========');
      console.log(chalk.blue('Version:'), result.state.schema.version);
      console.log(chalk.blue('Last Modified:'), result.state.schema.lastModified);
      console.log(chalk.blue('Checksum:'), result.state.schema.checksum);

      console.log('\n' + chalk.yellow('🗄️  Database'));
      console.log('=============');
      console.log(chalk.blue('URL:'), result.state.database.url ? '[REDACTED]' : 'Not configured');
      console.log(chalk.blue('Last Backup:'), result.state.database.lastBackup || 'Never');

      console.log('\n' + chalk.yellow('🚀 Services'));
      console.log('=============');
      console.log(chalk.blue('Registry:'), result.state.services.registry ? '✓' : '✗');
      console.log(chalk.blue('Propagation:'), result.state.services.propagation ? '✓' : '✗');
      console.log(chalk.blue('API:'), result.state.services.api ? '✓' : '✗');

    } catch (error) {
      spinner.fail('Failed to fetch project state');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Update sync configuration
program
  .command('config')
  .description('Update sync configuration')
  .option('-e, --enable', 'Enable sync')
  .option('-d, --disable', 'Disable sync')
  .option('-i, --interval <ms>', 'Set sync interval in milliseconds')
  .option('--registry <url>', 'Set registry endpoint URL')
  .option('--schema <url>', 'Set schema endpoint URL')
  .option('--chain <url>', 'Set chain endpoint URL')
  .action(async (options) => {
    const spinner = ora('Updating sync configuration...').start();

    try {
      // First get current config
      const currentStatus = await apiCall(`/status/${SESSION_ID}`) as StatusResponse;
      const updates: any = { ...currentStatus.config };

      // Apply updates
      if (options.enable) updates.enabled = true;
      if (options.disable) updates.enabled = false;
      if (options.interval) updates.syncInterval = parseInt(options.interval);
      if (options.registry) updates.endpoints.registry = options.registry;
      if (options.schema) updates.endpoints.schema = options.schema;
      if (options.chain) updates.endpoints.chain = options.chain;

      const result = await apiCall(`/config/${SESSION_ID}`, 'PUT', updates) as ConfigResponse;

      spinner.succeed('Sync configuration updated');
      console.log(chalk.green('✓ Configuration updated successfully'));
      console.log(chalk.blue('New config:'), JSON.stringify(result.config, null, 2));

    } catch (error) {
      spinner.fail('Failed to update sync configuration');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Clean up sync data
program
  .command('cleanup')
  .description('Clean up sync data for current session')
  .option('-f, --force', 'Force cleanup without confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log(chalk.yellow('⚠️  This will remove all sync data for the current session.'));
      console.log(chalk.blue('Session ID:'), SESSION_ID);
      console.log(chalk.gray('Use --force to skip this confirmation.'));
      process.exit(0);
    }

    const spinner = ora('Cleaning up sync data...').start();

    try {
      const result = await apiCall(`/${SESSION_ID}`, 'DELETE') as CleanupResponse;

      spinner.succeed('Sync data cleaned up');
      console.log(chalk.green('✓'), result.message);
      console.log(chalk.blue('Session existed:'), result.existed ? 'Yes' : 'No');

    } catch (error) {
      spinner.fail('Failed to clean up sync data');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper function to colorize status
function getStatusColor(status: string): string {
  switch (status) {
    case 'idle': return chalk.green('●');
    case 'syncing': return chalk.yellow('●');
    case 'error': return chalk.red('●');
    case 'paused': return chalk.gray('●');
    default: return chalk.blue('●');
  }
}

program.parse();