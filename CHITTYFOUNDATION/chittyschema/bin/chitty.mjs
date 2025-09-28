#!/usr/bin/env node

/**
 * ChittyCLI - Advanced Command Line Interface
 * Unified CLI for ChittySchema operations
 */

import { Command } from 'commander';
import { ChittySchema } from '../dist/index.js';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const program = new Command();
const configPath = join(homedir(), '.chittyconfig.json');

// Load configuration
async function loadConfig() {
  try {
    const data = await readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      namespace: 'DEFAULT',
      database: {
        type: 'sqlite',
        connectionString: join(homedir(), '.chitty.db')
      },
      security: {
        remoteOnly: false
      }
    };
  }
}

// Save configuration
async function saveConfig(config) {
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

// Initialize ChittySchema instance
async function initSchema() {
  const config = await loadConfig();
  return new ChittySchema(config);
}

program
  .name('chitty')
  .description('ChittyCLI - Advanced Legal Evidence Management')
  .version('2.0.0');

// ID Commands
program
  .command('id:generate [type]')
  .description('Generate a new ChittyID')
  .option('-n, --namespace <namespace>', 'Override namespace')
  .option('-c, --count <count>', 'Generate multiple IDs', '1')
  .action(async (type, options) => {
    const spinner = ora('Generating ChittyID...').start();
    try {
      const schema = await initSchema();
      const count = parseInt(options.count);

      if (count > 1) {
        const ids = await schema.getIDGenerator().generateBatch(count, type);
        spinner.succeed(chalk.green(`Generated ${count} ChittyIDs:`));
        ids.forEach(id => console.log(chalk.cyan(id)));
      } else {
        const id = await schema.getIDGenerator().generate(type);
        spinner.succeed(chalk.green('Generated ChittyID:'));
        console.log(chalk.cyan(id));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('id:validate <id>')
  .description('Validate a ChittyID format')
  .action(async (id) => {
    const schema = await initSchema();
    const valid = schema.getIDGenerator().validate(id);

    if (valid) {
      console.log(chalk.green('✓ Valid ChittyID format'));
      const parsed = schema.getIDGenerator().parse(id);
      console.log(chalk.gray('Namespace:'), chalk.cyan(parsed.namespace));
      console.log(chalk.gray('Hash:'), chalk.cyan(parsed.hash));
    } else {
      console.log(chalk.red('✗ Invalid ChittyID format'));
      process.exit(1);
    }
  });

program
  .command('id:verify <id>')
  .description('Verify a ChittyID against remote service')
  .action(async (id) => {
    const spinner = ora('Verifying ChittyID...').start();
    try {
      const schema = await initSchema();
      const valid = await schema.getIDGenerator().verify(id);

      if (valid) {
        spinner.succeed(chalk.green('✓ ChittyID verified'));
        const metadata = schema.getIDGenerator().getMetadata(id);
        if (metadata) {
          console.log(chalk.gray('Created:'), metadata.createdAt);
          console.log(chalk.gray('Lifecycle:'), chalk.cyan(metadata.lifecycle));
          console.log(chalk.gray('Immutable:'), metadata.immutable ? chalk.green('Yes') : chalk.yellow('No'));
        }
      } else {
        spinner.fail(chalk.red('✗ ChittyID verification failed'));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('id:mint <id>')
  .description('Mint a ChittyID')
  .option('-h, --hard', 'Hard mint to blockchain')
  .action(async (id, options) => {
    const spinner = ora('Minting ChittyID...').start();
    try {
      const schema = await initSchema();

      if (options.hard) {
        const txHash = await schema.getIDGenerator().hardMint(id);
        spinner.succeed(chalk.green('✓ ChittyID hard minted to blockchain'));
        console.log(chalk.gray('Transaction:'), chalk.cyan(txHash));
      } else {
        await schema.getIDGenerator().softMint(id);
        spinner.succeed(chalk.green('✓ ChittyID soft minted to database'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

// Evidence Commands
program
  .command('evidence:create')
  .description('Create new evidence entry')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'content',
        message: 'Evidence content:',
        validate: input => input.length > 0
      },
      {
        type: 'list',
        name: 'type',
        message: 'Evidence type:',
        choices: ['document', 'testimony', 'physical', 'digital', 'forensic', 'audio', 'video', 'image']
      },
      {
        type: 'number',
        name: 'tier',
        message: 'Evidence tier (0.0-1.0):',
        default: 0.5,
        validate: input => input >= 0 && input <= 1
      },
      {
        type: 'input',
        name: 'source',
        message: 'Evidence source (optional):'
      }
    ]);

    const spinner = ora('Creating evidence...').start();
    try {
      const schema = await initSchema();
      const evidence = await schema.createEvidence({
        content: answers.content,
        type: answers.type,
        tier: answers.tier,
        metadata: {
          source: answers.source || undefined
        }
      });

      spinner.succeed(chalk.green('✓ Evidence created'));
      console.log(chalk.gray('Evidence ID:'), chalk.cyan(evidence.id));
      console.log(chalk.gray('Status:'), chalk.yellow(evidence.status));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('evidence:process <id>')
  .description('Process evidence through AI pipeline')
  .action(async (id) => {
    const spinner = ora('Processing evidence...').start();
    try {
      const schema = await initSchema();
      const result = await schema.processEvidence(id);

      spinner.succeed(chalk.green('✓ Evidence processed'));
      console.log(chalk.gray('Atomic Facts:'), chalk.cyan(result.facts.length));
      console.log(chalk.gray('Contradictions:'), chalk.yellow(result.contradictions.length));
      console.log(chalk.gray('Chain Updates:'), chalk.cyan(result.chainUpdates.length));
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('evidence:search <query>')
  .description('Search evidence database')
  .option('-l, --limit <limit>', 'Result limit', '10')
  .action(async (query, options) => {
    const spinner = ora('Searching evidence...').start();
    try {
      const schema = await initSchema();
      const results = await schema.searchEvidence(query, {
        limit: parseInt(options.limit)
      });

      spinner.succeed(chalk.green(`Found ${results.length} results`));
      results.forEach(result => {
        console.log(chalk.cyan(result.id), chalk.gray('-'), result.content.substring(0, 100));
        console.log(chalk.gray('  Score:'), result.score, chalk.gray('Type:'), result.type);
      });
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('evidence:mint <id>')
  .description('Mint evidence to blockchain')
  .option('-h, --hard', 'Hard mint (blockchain)', false)
  .action(async (id, options) => {
    const spinner = ora('Minting evidence...').start();
    try {
      const schema = await initSchema();
      const result = await schema.mintEvidence(id, options.hard);

      if (options.hard) {
        spinner.succeed(chalk.green('✓ Evidence hard minted to blockchain'));
        console.log(chalk.gray('Transaction:'), chalk.cyan(result.transactionHash));
      } else {
        spinner.succeed(chalk.green('✓ Evidence soft minted'));
        console.log(chalk.gray('Minted At:'), result.mintedAt);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

// System Commands
program
  .command('health')
  .description('Check system health')
  .action(async () => {
    const spinner = ora('Checking system health...').start();
    try {
      const schema = await initSchema();
      const health = await schema.performHealthCheck();

      spinner.succeed(chalk.green('Health check complete'));
      console.log(chalk.gray('Status:'),
        health.status === 'healthy' ? chalk.green(health.status) :
        health.status === 'degraded' ? chalk.yellow(health.status) :
        chalk.red(health.status)
      );

      console.log(chalk.gray('Services:'));
      Object.entries(health.services).forEach(([service, status]) => {
        console.log(`  ${service}: ${status ? chalk.green('✓') : chalk.red('✗')}`);
      });
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure ChittyCLI')
  .action(async () => {
    const currentConfig = await loadConfig();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'namespace',
        message: 'Default namespace:',
        default: currentConfig.namespace
      },
      {
        type: 'list',
        name: 'databaseType',
        message: 'Database type:',
        choices: ['sqlite', 'postgresql', 'neon'],
        default: currentConfig.database?.type
      },
      {
        type: 'confirm',
        name: 'remoteOnly',
        message: 'Use remote ID generation (production)?',
        default: currentConfig.security?.remoteOnly
      }
    ]);

    const newConfig = {
      namespace: answers.namespace,
      database: {
        type: answers.databaseType,
        connectionString: currentConfig.database?.connectionString
      },
      security: {
        remoteOnly: answers.remoteOnly
      }
    };

    if (answers.databaseType !== 'sqlite') {
      const dbAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'connectionString',
          message: 'Database connection string:',
          default: currentConfig.database?.connectionString
        }
      ]);
      newConfig.database.connectionString = dbAnswer.connectionString;
    }

    await saveConfig(newConfig);
    console.log(chalk.green('✓ Configuration saved'));
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    console.log(chalk.cyan('ChittyCLI Interactive Mode'));
    console.log(chalk.gray('Type "exit" to quit\n'));

    while (true) {
      const { command } = await inquirer.prompt([
        {
          type: 'input',
          name: 'command',
          message: 'chitty>',
          prefix: ''
        }
      ]);

      if (command === 'exit' || command === 'quit') {
        console.log(chalk.gray('Goodbye!'));
        process.exit(0);
      }

      try {
        const args = command.split(' ');
        await program.parseAsync(['node', 'chitty', ...args]);
      } catch (error) {
        console.log(chalk.red('Error:'), error.message);
      }
    }
  });

program.parse();