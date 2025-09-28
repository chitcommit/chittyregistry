#!/usr/bin/env node

/**
 * ChittyCheck - Comprehensive System Validation
 * Checks ChittyID compliance, database integrity, and system alignment
 */

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { config } from "dotenv";

config();

class ChittyCheck {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.passed = [];
    this.chittyIdPatterns = {
      // ROGUE patterns - should NEVER exist
      rogue: [
        /uuid\.v[0-9]/g,
        /crypto\.randomBytes/g,
        /Date\.now\(\)/g,
        /Math\.random/g,
        /nanoid/g,
        /shortid/g,
        /\+\+counter/g,
        /INCREMENT.*ID/gi,
        /generateId|generateID|genId|makeId/gi,
        /createHash.*digest/g,
        /`ID-\${.*}`/g,
        /`CHITTY-\${.*}`/g, // Even CHITTY prefix with local generation is ROGUE
      ],
      // AUTHORIZED patterns
      authorized: [
        /https:\/\/id\.chitty\.cc\/v1\/mint/g,
        /CHITTY_ID_TOKEN/g,
        /mintChittyId/g,
        /requestChittyId/g,
      ],
    };
  }

  async runAllChecks() {
    console.log("🔍 ChittyCheck - System Validation Starting...\n");
    console.log("=".repeat(50));

    // 1. ChittyID Compliance Check
    await this.checkChittyIdCompliance();

    // 2. Database Schema Check
    await this.checkDatabaseSchema();

    // 3. Environment Configuration Check
    await this.checkEnvironmentConfig();

    // 4. File System Scan for Rogue ID Generation
    await this.scanForRogueIdGeneration();

    // 5. ChittyID Service Connectivity
    await this.checkChittyIdService();

    // 6. Multi-Case Support Validation
    await this.checkMultiCaseSupport();

    // Generate Report
    this.generateReport();
  }

  async checkChittyIdCompliance() {
    console.log("\n📋 Checking ChittyID Compliance...");

    // Check for ChittyID token
    if (!process.env.CHITTY_ID_TOKEN) {
      this.violations.push(
        "❌ CHITTY_ID_TOKEN not configured - cannot request IDs",
      );
    } else {
      this.passed.push("✅ CHITTY_ID_TOKEN configured");
    }

    // Check for rogue ID generation in package.json
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      const roguePackages = ["uuid", "nanoid", "shortid", "cuid"];

      const foundRogue = Object.keys(pkg.dependencies || {})
        .concat(Object.keys(pkg.devDependencies || {}))
        .filter((dep) => roguePackages.includes(dep));

      if (foundRogue.length > 0) {
        this.violations.push(
          `❌ Rogue ID packages found: ${foundRogue.join(", ")}`,
        );
      } else {
        this.passed.push("✅ No rogue ID generation packages in dependencies");
      }
    }
  }

  async checkDatabaseSchema() {
    console.log("\n🗄️  Checking Database Schema...");

    if (!process.env.DATABASE_URL) {
      this.warnings.push("⚠️  DATABASE_URL not configured");
      return;
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      const client = await pool.connect();

      // Check for 5-entity system
      const entityTables = [
        "people",
        "places",
        "things",
        "events",
        "authorities",
      ];
      const tableCheck = await client.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ANY($1)
      `,
        [entityTables],
      );

      const foundTables = tableCheck.rows.map((r) => r.table_name);
      const missingTables = entityTables.filter(
        (t) => !foundTables.includes(t),
      );

      if (missingTables.length === 0) {
        this.passed.push("✅ 5-entity system fully deployed");
      } else {
        this.violations.push(
          `❌ Missing entity tables: ${missingTables.join(", ")}`,
        );
      }

      // Check for chitty_id columns
      const chittyIdCheck = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE column_name = 'chitty_id'
        AND table_schema = 'public'
      `);

      if (chittyIdCheck.rows.length >= 5) {
        this.passed.push(
          `✅ ChittyID columns found in ${chittyIdCheck.rows.length} tables`,
        );
      } else {
        this.warnings.push(
          `⚠️  Only ${chittyIdCheck.rows.length} tables have chitty_id columns`,
        );
      }

      client.release();
      await pool.end();
    } catch (error) {
      this.warnings.push(`⚠️  Database check failed: ${error.message}`);
    }
  }

  async checkEnvironmentConfig() {
    console.log("\n⚙️  Checking Environment Configuration...");

    const requiredEnvVars = ["CHITTY_ID_TOKEN", "DATABASE_URL"];

    const optionalEnvVars = [
      "CHITTY_ID_URL",
      "CHITTYROUTER_URL",
      "NOTION_TOKEN",
    ];

    requiredEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        this.violations.push(`❌ Required env var missing: ${varName}`);
      } else {
        this.passed.push(`✅ ${varName} configured`);
      }
    });

    optionalEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        this.warnings.push(`⚠️  Optional env var missing: ${varName}`);
      }
    });

    // Check for duplicate .env files
    const envFiles = [".env", ".env.chittyos", ".env.local", ".env.production"];
    const foundEnvFiles = envFiles.filter((f) =>
      fs.existsSync(path.join(process.cwd(), f)),
    );

    if (foundEnvFiles.length > 1) {
      this.warnings.push(
        `⚠️  Multiple env files found: ${foundEnvFiles.join(", ")}`,
      );
    }
  }

  async scanForRogueIdGeneration() {
    console.log("\n🔍 Scanning for Rogue ID Generation...");

    const extensions = [".js", ".ts", ".jsx", ".tsx", ".py"];
    const excludeDirs = ["node_modules", ".git", "dist", "build", "coverage"];

    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const dirname = path.basename(fullPath);
          if (!excludeDirs.includes(dirname)) {
            scanDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            this.scanFile(fullPath);
          }
        }
      }
    };

    const srcPath = path.join(process.cwd(), "src");
    if (fs.existsSync(srcPath)) {
      scanDir(srcPath);
    }

    const scriptsPath = path.join(process.cwd(), "scripts");
    if (fs.existsSync(scriptsPath)) {
      scanDir(scriptsPath);
    }
  }

  scanFile(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(process.cwd(), filePath);

    // Check for rogue patterns
    for (const pattern of this.chittyIdPatterns.rogue) {
      const matches = content.match(pattern);
      if (matches) {
        this.violations.push(
          `❌ Rogue ID generation in ${relativePath}: ${matches[0]}`,
        );
      }
    }

    // Check for authorized patterns
    let hasAuthorized = false;
    for (const pattern of this.chittyIdPatterns.authorized) {
      if (pattern.test(content)) {
        hasAuthorized = true;
        break;
      }
    }

    // If file generates IDs but doesn't use ChittyID service
    if (
      content.includes("id") &&
      content.includes("generate") &&
      !hasAuthorized
    ) {
      this.warnings.push(
        `⚠️  Suspicious ID handling in ${relativePath} - no ChittyID service call found`,
      );
    }
  }

  async checkChittyIdService() {
    console.log("\n🌐 Checking ChittyID Service...");

    const chittyIdUrl = process.env.CHITTY_ID_URL || "https://id.chitty.cc";

    try {
      const response = await fetch(`${chittyIdUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.passed.push("✅ ChittyID service is reachable");
      } else {
        this.warnings.push(
          `⚠️  ChittyID service returned status ${response.status}`,
        );
      }
    } catch (error) {
      this.violations.push(`❌ ChittyID service unreachable: ${error.message}`);
    }
  }

  async checkMultiCaseSupport() {
    console.log("\n📂 Checking Multi-Case Support...");

    // Check for case_id parameter support
    const cliFiles = ["evidence_cli.py", "evidence_analyzer_chittyos.py"];

    for (const file of cliFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        if (content.includes("--case-id") || content.includes("case_id")) {
          this.passed.push(`✅ ${file} supports multi-case via case_id`);
        } else {
          this.warnings.push(`⚠️  ${file} may not support multi-case`);
        }
      }
    }
  }

  generateReport() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 CHITTYCHECK REPORT");
    console.log("=".repeat(50));

    // Critical Violations
    if (this.violations.length > 0) {
      console.log("\n🚨 CRITICAL VIOLATIONS:");
      this.violations.forEach((v) => console.log(`   ${v}`));
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      this.warnings.forEach((w) => console.log(`   ${w}`));
    }

    // Passed Checks
    if (this.passed.length > 0) {
      console.log("\n✅ PASSED CHECKS:");
      this.passed.forEach((p) => console.log(`   ${p}`));
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    const total =
      this.violations.length + this.warnings.length + this.passed.length;
    const score = Math.round((this.passed.length / total) * 100);

    console.log(`📈 COMPLIANCE SCORE: ${score}%`);
    console.log(`   Violations: ${this.violations.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
    console.log(`   Passed: ${this.passed.length}`);

    // ChittyID Rule Enforcement
    console.log("\n🔒 CHITTYID ENFORCEMENT:");
    if (
      this.violations.some(
        (v) => v.includes("ID generation") || v.includes("ID packages"),
      )
    ) {
      console.log("   ❌ FAILED - Local ID generation detected!");
      console.log("   ALL IDs must be requested from https://id.chitty.cc");
      console.log("   NO fallbacks, NO local generation, SERVICE OR FAIL");
    } else {
      console.log("   ✅ PASSED - No local ID generation detected");
      console.log("   System correctly depends on ChittyID service");
    }

    console.log("\n" + "=".repeat(50));

    // Exit code based on violations
    if (this.violations.length > 0) {
      console.log(
        "\n❌ ChittyCheck FAILED - Critical violations must be fixed",
      );
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log("\n⚠️  ChittyCheck PASSED with warnings");
      process.exit(0);
    } else {
      console.log("\n✅ ChittyCheck PASSED - System fully compliant");
      process.exit(0);
    }
  }
}

// Run ChittyCheck
const checker = new ChittyCheck();
checker.runAllChecks().catch((error) => {
  console.error("❌ ChittyCheck failed:", error);
  process.exit(1);
});
