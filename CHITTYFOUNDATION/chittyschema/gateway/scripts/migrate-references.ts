#!/usr/bin/env tsx
/**
 * Migration script for ChittyGateway dual-access pattern
 *
 * This script identifies references that should use the gateway
 * while preserving direct service URLs for partner integrations
 *
 * Strategy:
 * - Internal app code → Use gateway.chitty.cc
 * - Partner configs → Keep direct *.chitty.cc
 * - Documentation → Show both patterns
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// Service migration mappings
// Only migrate internal references, not partner/direct integration configs
const SERVICE_MIGRATIONS = {
  // Schema service (ONLY in app code, not partner configs)
  "schema.chitty.cc": "gateway.chitty.cc/api/schema",
  "https://schema.chitty.cc": "https://gateway.chitty.cc/api/schema",
  "http://schema.chitty.cc": "https://gateway.chitty.cc/api/schema",

  // ID service
  "id.chitty.cc": "gateway.chitty.cc/api/id",
  "https://id.chitty.cc": "https://gateway.chitty.cc/api/id",
  "http://id.chitty.cc": "https://gateway.chitty.cc/api/id",

  // Registry service
  "registry.chitty.cc": "gateway.chitty.cc/api/registry",
  "https://registry.chitty.cc": "https://gateway.chitty.cc/api/registry",
  "http://registry.chitty.cc": "https://gateway.chitty.cc/api/registry",

  // Ledger service
  "ledger.chitty.cc": "gateway.chitty.cc/api/ledger",
  "https://ledger.chitty.cc": "https://gateway.chitty.cc/api/ledger",
  "http://ledger.chitty.cc": "https://gateway.chitty.cc/api/ledger",

  // Trust service
  "trust.chitty.cc": "gateway.chitty.cc/api/trust",
  "https://trust.chitty.cc": "https://gateway.chitty.cc/api/trust",
  "http://trust.chitty.cc": "https://gateway.chitty.cc/api/trust",

  // Verify service
  "verify.chitty.cc": "gateway.chitty.cc/api/verify",
  "https://verify.chitty.cc": "https://gateway.chitty.cc/api/verify",
  "http://verify.chitty.cc": "https://gateway.chitty.cc/api/verify",

  // Chain service (if exists)
  "chain.chitty.cc": "gateway.chitty.cc/api/chain",
  "https://chain.chitty.cc": "https://gateway.chitty.cc/api/chain",
  "http://chain.chitty.cc": "https://gateway.chitty.cc/api/chain",
};

// File patterns to search
const FILE_PATTERNS = [
  "**/*.ts",
  "**/*.js",
  "**/*.tsx",
  "**/*.jsx",
  "**/*.json",
  "**/*.yml",
  "**/*.yaml",
  "**/*.md",
  "**/*.env",
  "**/*.toml",
  "**/.*rc",
];

// Directories to ignore
const IGNORE_DIRS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  ".next",
  "gateway/scripts", // Don't modify this script itself
];

interface MigrationResult {
  file: string;
  changes: Array<{
    from: string;
    to: string;
    line: number;
  }>;
}

async function findFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of FILE_PATTERNS) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore: IGNORE_DIRS,
      absolute: false,
    });
    files.push(...matches);
  }

  return files;
}

function migrateContent(
  content: string,
  filePath: string,
): { content: string; changes: MigrationResult["changes"] } {
  let updatedContent = content;
  const changes: MigrationResult["changes"] = [];
  const lines = content.split("\n");

  // Track replacements to avoid duplicates
  const replacements = new Map<string, string>();

  Object.entries(SERVICE_MIGRATIONS).forEach(([oldUrl, newUrl]) => {
    lines.forEach((line, lineNum) => {
      if (line.includes(oldUrl)) {
        // Check if this is already a gateway URL (avoid double migration)
        if (!line.includes("gateway.chitty.cc")) {
          const regex = new RegExp(escapeRegExp(oldUrl), "g");
          const newLine = line.replace(regex, newUrl);

          if (newLine !== line) {
            changes.push({
              from: oldUrl,
              to: newUrl,
              line: lineNum + 1,
            });

            replacements.set(line, newLine);
          }
        }
      }
    });
  });

  // Apply all replacements
  replacements.forEach((newLine, oldLine) => {
    updatedContent = updatedContent.replace(oldLine, newLine);
  });

  return { content: updatedContent, changes };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function migrateFile(filePath: string): Promise<MigrationResult | null> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const { content: updatedContent, changes } = migrateContent(
      content,
      filePath,
    );

    if (changes.length > 0) {
      await fs.promises.writeFile(filePath, updatedContent, "utf-8");
      return { file: filePath, changes };
    }

    return null;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return null;
  }
}

async function main() {
  const rootDir = process.cwd();

  console.log("🔄 ChittyGateway Migration Script");
  console.log("==================================");
  console.log(`📁 Root directory: ${rootDir}`);
  console.log("");

  console.log("🔍 Finding files to migrate...");
  const files = await findFiles(rootDir);
  console.log(`📋 Found ${files.length} files to check`);
  console.log("");

  const results: MigrationResult[] = [];
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    const result = await migrateFile(filePath);

    if (result) {
      results.push(result);
      console.log(`✅ ${file} - ${result.changes.length} changes`);
    }

    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`   Processed ${processedCount}/${files.length} files...`);
    }
  }

  console.log("");
  console.log("📊 Migration Summary");
  console.log("===================");
  console.log(`✅ Files modified: ${results.length}`);
  console.log(
    `📝 Total changes: ${results.reduce((sum, r) => sum + r.changes.length, 0)}`,
  );

  if (results.length > 0) {
    console.log("");
    console.log("📋 Modified files:");
    results.forEach((result) => {
      console.log(`   ${result.file}`);
      result.changes.forEach((change) => {
        console.log(`      Line ${change.line}: ${change.from} → ${change.to}`);
      });
    });
  }

  console.log("");
  console.log("✅ Migration complete!");
  console.log("");
  console.log("📌 Next steps:");
  console.log("1. Review the changes with: git diff");
  console.log("2. Test the application locally");
  console.log("3. Deploy the ChittyGateway with: npm run deploy");
  console.log("4. Update DNS records to point gateway.chitty.cc to Cloudflare");
}

// Run the migration
main().catch(console.error);
