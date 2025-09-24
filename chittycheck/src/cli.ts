#!/usr/bin/env node

import { createProgram } from "./cli/commands.js";

async function main(): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(
      "ChittyCheck error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
