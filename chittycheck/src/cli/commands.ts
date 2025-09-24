import { Command } from "commander";
import { ChittyValidator } from "../core/validator.js";
import { Logger } from "../utils/logger.js";
import { CheckOptions } from "../types/index.js";
import ora from "ora";
import chalk from "chalk";

const logger = Logger.getInstance();

export function createProgram(): Command {
  const program = new Command();

  program
    .name("chittycheck")
    .description("ChittyOS validation and verification system")
    .version("1.0.0");

  program
    .command("validate")
    .alias("check")
    .description("Run all validation checks")
    .option("-v, --verbose", "Enable verbose output")
    .option(
      "-t, --timeout <ms>",
      "Set timeout for each check in milliseconds",
      "30000",
    )
    .option("--skip-cache", "Skip cached results")
    .action(async (options) => {
      const spinner = ora("Initializing ChittyCheck...").start();

      try {
        const validator = new ChittyValidator();
        const checkOptions: CheckOptions = {
          verbose: options.verbose,
          timeout: parseInt(options.timeout),
          skipCache: options.skipCache,
        };

        spinner.stop();

        const results = await validator.runAll(checkOptions);

        console.log("\n" + chalk.bold("ChittyCheck Results:"));
        console.log(chalk.gray("─".repeat(50)));

        const passed = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        console.log(`\n${chalk.green("✓")} Passed: ${passed}`);
        console.log(`${chalk.red("✗")} Failed: ${failed}`);
        console.log(`${chalk.blue("ℹ")} Total: ${results.length}\n`);

        if (failed > 0) {
          console.log(chalk.yellow("Failed checks:"));
          results
            .filter((r) => !r.success)
            .forEach((result) => {
              console.log(`  ${chalk.red("✗")} ${result.message}`);
              if (result.details && options.verbose) {
                console.log(
                  `    ${chalk.gray(JSON.stringify(result.details, null, 2))}`,
                );
              }
            });
        }

        process.exit(failed > 0 ? 1 : 0);
      } catch (error) {
        spinner.fail("ChittyCheck failed");
        logger.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    });

  program
    .command("health")
    .description("Quick health check of critical systems")
    .action(async () => {
      const spinner = ora("Running health check...").start();

      try {
        const validator = new ChittyValidator();
        const results = await validator.runAll({ verbose: false });

        const critical = results.filter((r) => !r.success);

        spinner.stop();

        if (critical.length === 0) {
          console.log(chalk.green("✓ System healthy"));
        } else {
          console.log(chalk.red(`✗ ${critical.length} critical issues found`));
          critical.forEach((issue) => {
            console.log(`  ${chalk.red("✗")} ${issue.message}`);
          });
        }

        process.exit(critical.length > 0 ? 1 : 0);
      } catch (error) {
        spinner.fail("Health check failed");
        logger.error(error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    });

  program
    .command("status")
    .description("Show current ChittyOS status")
    .action(async () => {
      logger.info("ChittyOS Status:");
      logger.info("- Framework: v1.0.1");
      logger.info("- ChittyCheck: v1.0.0");
      logger.info("- Node.js: " + process.version);
      logger.info("- Platform: " + process.platform);
      logger.info("- Architecture: " + process.arch);
    });

  return program;
}
