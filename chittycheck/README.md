# ChittyCheck

ChittyOS validation and verification system.

## Overview

ChittyCheck is a comprehensive validation tool for the ChittyOS Framework, designed to verify system health, configuration, and dependencies.

## Installation

```bash
npm install
npm run build
```

## Usage

### CLI Commands

```bash
# Run all validation checks
npm run check
# or
node dist/cli.js validate

# Quick health check
node dist/cli.js health

# Show system status
node dist/cli.js status

# Verbose output
node dist/cli.js validate --verbose
```

### Programmatic Usage

```typescript
import { ChittyValidator } from 'chittycheck';

const validator = new ChittyValidator();
const results = await validator.runAll({
  verbose: true,
  timeout: 30000
});
```

## Validation Checks

ChittyCheck performs the following validations:

- **Node.js Version**: Ensures Node.js >= 18.0.0
- **ChittyOS Structure**: Verifies directory structure
- **MCP Servers**: Checks MCP server availability
- **1Password CLI**: Validates security tooling
- **Git Status**: Repository health check

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Type check
npm run typecheck
```

## Integration

ChittyCheck integrates with the ChittyOS ecosystem and can be invoked through:
- Direct CLI usage
- ChittyOS slash commands (`/chittycheck`)
- Automated health monitoring
- CI/CD validation pipelines