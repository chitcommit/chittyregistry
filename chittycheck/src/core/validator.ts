import {
  ValidationResult,
  SystemCheck,
  CheckCategory,
  Priority,
  CheckOptions,
} from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, access } from "fs/promises";
import { constants } from "fs";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);
const logger = Logger.getInstance();

export class ChittyValidator {
  private checks: SystemCheck[] = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks(): void {
    this.checks = [
      {
        name: "node-version",
        description: "Check Node.js version compatibility",
        validator: this.checkNodeVersion.bind(this),
        category: CheckCategory.SYSTEM,
        priority: Priority.CRITICAL,
      },
      {
        name: "chittyos-directory",
        description: "Verify ChittyOS directory structure",
        validator: this.checkChittyOSStructure.bind(this),
        category: CheckCategory.CHITTYOS,
        priority: Priority.HIGH,
      },
      {
        name: "mcp-servers",
        description: "Check MCP server availability",
        validator: this.checkMCPServers.bind(this),
        category: CheckCategory.CHITTYOS,
        priority: Priority.HIGH,
      },
      {
        name: "onepassword-cli",
        description: "Verify 1Password CLI installation",
        validator: this.check1PasswordCLI.bind(this),
        category: CheckCategory.SECURITY,
        priority: Priority.MEDIUM,
      },
      {
        name: "git-status",
        description: "Check Git repository status",
        validator: this.checkGitStatus.bind(this),
        category: CheckCategory.DEVELOPMENT,
        priority: Priority.LOW,
      },
    ];
  }

  public async runAll(options: CheckOptions = {}): Promise<ValidationResult[]> {
    logger.setVerbose(options.verbose || false);
    logger.info("Starting ChittyOS validation checks...");

    const results: ValidationResult[] = [];

    for (const check of this.checks) {
      logger.debug(`Running check: ${check.name}`);
      try {
        const result = await Promise.race([
          check.validator(),
          this.timeout(options.timeout || 30000),
        ]);
        results.push(result);

        if (result.success) {
          logger.success(`${check.description}: OK`);
        } else {
          logger.error(`${check.description}: ${result.message}`);
        }
      } catch (error) {
        const errorResult: ValidationResult = {
          success: false,
          message: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
        results.push(errorResult);
        logger.error(`${check.description}: ${errorResult.message}`);
      }
    }

    return results;
  }

  private async timeout(ms: number): Promise<ValidationResult> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Check timed out")), ms);
    });
  }

  private async checkNodeVersion(): Promise<ValidationResult> {
    try {
      const { stdout } = await execAsync("node --version");
      const version = stdout.trim().replace("v", "");
      const majorVersion = parseInt(version.split(".")[0]);

      if (majorVersion >= 18) {
        return {
          success: true,
          message: `Node.js ${version} is compatible`,
          details: { version },
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: `Node.js ${version} is too old. Requires >= 18.0.0`,
          details: { version, required: ">=18.0.0" },
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Node.js not found or not accessible",
        timestamp: new Date(),
      };
    }
  }

  private async checkChittyOSStructure(): Promise<ValidationResult> {
    const homeDir = homedir();
    const chittyOSPath = join(
      homeDir,
      ".claude",
      "projects",
      "-",
      "chittychat",
    );
    const requiredPaths = [
      "connectors",
      "tools",
      "hooks",
      "projects",
      "config",
    ];

    try {
      await access(chittyOSPath, constants.F_OK);

      const missingPaths: string[] = [];
      for (const path of requiredPaths) {
        try {
          await access(join(chittyOSPath, path), constants.F_OK);
        } catch {
          missingPaths.push(path);
        }
      }

      if (missingPaths.length === 0) {
        return {
          success: true,
          message: "ChittyOS directory structure is complete",
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: `Missing ChittyOS directories: ${missingPaths.join(", ")}`,
          details: { missingPaths },
          timestamp: new Date(),
        };
      }
    } catch {
      return {
        success: false,
        message: "ChittyOS directory not found",
        details: { expectedPath: chittyOSPath },
        timestamp: new Date(),
      };
    }
  }

  private async checkMCPServers(): Promise<ValidationResult> {
    const homeDir = homedir();
    const mcpPath = join(
      homeDir,
      ".claude",
      "projects",
      "-",
      "chittychat",
      "connectors",
    );

    try {
      await access(join(mcpPath, "start-mcp-servers.sh"), constants.F_OK);

      const { stdout } = await execAsync('pgrep -f "mcp"');
      const runningProcesses = stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      return {
        success: true,
        message: `Found ${runningProcesses.length} MCP-related processes`,
        details: { processCount: runningProcesses.length },
        timestamp: new Date(),
      };
    } catch {
      return {
        success: false,
        message: "No MCP servers running or scripts not found",
        timestamp: new Date(),
      };
    }
  }

  private async check1PasswordCLI(): Promise<ValidationResult> {
    try {
      const { stdout } = await execAsync("op --version");
      const version = stdout.trim();

      return {
        success: true,
        message: `1Password CLI ${version} is available`,
        details: { version },
        timestamp: new Date(),
      };
    } catch {
      return {
        success: false,
        message: "1Password CLI not found or not accessible",
        timestamp: new Date(),
      };
    }
  }

  private async checkGitStatus(): Promise<ValidationResult> {
    try {
      await execAsync("git rev-parse --git-dir");
      const { stdout } = await execAsync("git status --porcelain");

      if (stdout.trim().length === 0) {
        return {
          success: true,
          message: "Git repository is clean",
          timestamp: new Date(),
        };
      } else {
        const changedFiles = stdout.trim().split("\n").length;
        return {
          success: true,
          message: `Git repository has ${changedFiles} changed files`,
          details: { changedFiles },
          timestamp: new Date(),
        };
      }
    } catch {
      return {
        success: false,
        message: "Not in a Git repository",
        timestamp: new Date(),
      };
    }
  }
}
