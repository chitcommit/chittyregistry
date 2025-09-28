# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@chittyos/chittyschema v2.0.0** - Advanced legal evidence management platform with blockchain anchoring. This universal data framework service provides a neutralized schema for managing evidence, facts, cases, and property data. It integrates with the ChittyOS ecosystem (v1.0.1) and provides both REST APIs and Notion synchronization capabilities.

## Development Commands

### Core Commands
```bash
npm run dev                 # Start development server (tsx watch src/index.ts)
npm run build              # Build TypeScript to dist/ (tsc -p tsconfig.json)
npm run start              # Start production server (node dist/index.js)
npm run lint               # Run TypeScript type checking (tsc --noEmit)
NODE_OPTIONS="" npx tsc --noEmit  # Direct TypeScript check (avoids NODE_OPTIONS conflicts)
```

**Note**: This project uses `tsc` directly for building and runs on Express.js. The development server uses `tsx watch` and main entry point is `src/index.ts`.

### Testing Commands
```bash
# Main test commands
npm test                                    # Run all tests with Jest
npm run test:watch                         # Run tests in watch mode
npm run test:coverage                      # Run tests with coverage report

# RECOMMENDED: Use simple config for development (faster, fewer reporters)
NODE_ENV=test npx jest --config jest.config.simple.js tests/qa/smoke/basic-health.test.ts --testTimeout=30000

# QA Test Suites
npm run test:qa                           # Run full QA suite
npm run test:qa:smoke                     # Quick smoke tests
npm run test:qa:integration              # Integration tests
npm run test:qa:compliance                # Compliance tests

# Security Testing
npm run test:security                     # Full security audit
npm run test:security:critical           # Critical security issues only
npm run test:security:high               # High priority security tests

# Load Testing
npm run test:load                         # Performance/load tests (10 min timeout)

# Running specific test suites (use NODE_ENV=test for proper test environment)
NODE_ENV=test npx jest --config jest.config.simple.js tests/qa/smoke/ --testTimeout=60000
NODE_ENV=test npx jest --config jest.config.simple.js tests/security/auth-bypass.test.ts --testTimeout=30000
```

### Database Commands
```bash
npm run db:push            # Push schema to PostgreSQL (Neon)
npm run seed               # Seed database with initial data
tsx scripts/migrate-databases.ts    # Run database migrations
```

### Notion Integration Commands
```bash
npm run setup:notion              # Setup Notion databases
npm run setup:notion:neutral      # Setup neutral Notion schema
npm run test:notion              # Test Notion procedures
npm run test:notion:databases    # Test database validation
npm run test:sync                # Test sync integration
npm run deploy:notion            # Deploy to Notion
```

### Sync Commands
```bash
npm run sync                     # Run sync CLI
npm run sync:init               # Initialize sync
npm run sync:status             # Check sync status
npm run sync:trigger            # Trigger manual sync
npm run sync:verify             # Verify sync integrity
npm run validate:registry       # Validate ChittyOS registry integration
```

### macOS Extension Commands
```bash
npm run macos:notion:init      # Initialize macOS Notion extension
npm run macos:notion:test      # Test macOS Notion extension
npm run macos:notion:health    # Health check for macOS extension
```

### ChittyOS System Commands
```bash
# ChittyOS Validation & Health Checks
/chittycheck                        # Run comprehensive ChittyID compliance check
/health                            # System health check
/services                          # List ChittyOS central services
/registry                          # ChittyOS registry client operations

# ChittyID Integration (requires CHITTY_ID_TOKEN)
canon <entity>                     # Resolve entity through ChittyOS Canon service
schema_validate <data> <type>      # Validate data against ChittyOS schema
```

**Important**: This project is subject to ChittyID compliance checks. All ID generation must use the ChittyOS ID service (https://id.chitty.cc). Local ID generation patterns are flagged as violations.

## Architecture Overview

### Core Structure

The application is an Express.js API server with TypeScript, organized into several key layers:

1. **API Layer** (`src/index.ts`, `src/routes/`) - Note: Development server runs from `src/index.ts`
   - Express server with CORS enabled
   - REST endpoints under `/api/v1/`
   - ChittyOS middleware integration for framework headers
   - Analytics middleware for request tracking

2. **Routes** (`src/routes/`)
   - `property.ts` - Property ownership and tax data
   - `cases.ts` - Case management
   - `evidence.ts` - Evidence submission and retrieval
   - `facts.ts` - Atomic fact management
   - `ai-evidence.ts` - AI-powered evidence analysis
   - `sync.ts` - Synchronization endpoints
   - `topics.ts` - Topic extraction
   - `neutral.ts` - Neutral schema operations

3. **ChittyOS Integration** (`src/lib/chittyos/`)
   - `integration.ts` - Main ChittyOS framework integration
   - Manages session IDs, service registration, heartbeats
   - Reads config from `chittyos.config.json`
   - Provides middleware for request context

4. **Platform Extensions** (`src/platforms/`)
   - **macOS Core** (`src/platforms/macos/core/`)
     - `service-registry.ts` - Service registration with ChittyOS
     - `pipeline-enforcement.ts` - Pipeline validation
     - `schema-propagation.ts` - Schema synchronization
   - **Notion Extension** (`src/platforms/macos/extensions/notion/`)
     - Native Notion integration for macOS
     - Sync capabilities with Notion databases

5. **Database Layer** (`db/`)
   - PostgreSQL with Neon as provider
   - Drizzle ORM for database operations
   - Universal neutral schema supporting multiple domains
   - Schema files: `schema.ts`, `schema-postgres.ts`, `production-schema.sql`

6. **MCP Integration** (`src/mcp/`)
   - Model Context Protocol client for AI integrations
   - Sync client for cross-platform communication

### ChittyID Namespace System

The system uses ChittyID namespaces for universal data classification:
- **PEO** - People/Entities
- **PLACE** - Locations
- **PROP** - Objects/Assets
- **EVNT** - Events/Actions
- **AUTH** - Authorities
- **INFO** - Information
- **FACT** - Atomic Facts
- **CONTEXT** - Projects/Cases
- **ACTOR** - System Users

### Test Organization

Tests are organized by category with different configurations:
- `tests/qa/` - Quality assurance tests (60s timeout)
- `tests/security/` - Security vulnerability tests (120s timeout)
- `tests/load/` - Performance and load tests (300s timeout)
- `tests/integration/` - Integration tests (180s timeout)

Each category has its own setup files and can be run independently. The `jest.config.simple.js` provides a faster, simpler configuration for development.

### Configuration Files

- `chittyos.config.json` - ChittyOS framework configuration
- `tsconfig.json` - TypeScript configuration (ES2020, ESNext modules)
- `jest.config.js` - Comprehensive Jest configuration with multiple projects
- `jest.config.simple.js` - Simplified Jest config for faster testing
- `.env` - Environment variables (DATABASE_URL, NODE_ENV, etc.)

### Service Endpoints

The service runs on port 3000 by default and provides:
- Health check: `GET /health`
- ChittyOS status: `GET /chittyos/status`
- Analytics: `GET /analytics/metrics`, `/analytics/summary`, `/analytics/report`
- API endpoints under `/api/v1/` for all domain operations

### Environment Variables

Key environment variables used:
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_PROVIDER` - Database provider (default: postgres)
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Server port (default: 3000)
- `CHITTY_REGISTRY_URL` - ChittyOS registry URL (https://registry.chitty.cc)
- `CHITTY_ID_TOKEN` - Authentication token for ChittyOS services (required for ID minting)

## Key Development Patterns

### ChittyOS Framework Integration
- All services integrate with ChittyOS v1.0.1 framework via `chittyos.config.json`
- Session management through unique session IDs
- Automatic service registration with ChittyOS registry
- Heartbeat monitoring for service health

### Universal Schema Architecture
- Neutralized data model supporting multiple domains (legal, property, evidence)
- ChittyID namespace system for universal entity classification
- Drizzle ORM with both SQLite (development) and PostgreSQL (production) support
- Schema propagation across services via `src/platforms/macos/core/schema-propagation.ts`

### Testing Strategy

The codebase uses a multi-tiered testing approach:
1. **Development**: Use `jest.config.simple.js` for quick development testing
2. **CI/CD**: Use the full `jest.config.js` for comprehensive testing with multiple reporters
3. **Security**: Run security tests before any deployment (`npm run test:security`)
4. **Performance**: Load tests available for validation (`npm run test:load`)

**Testing by Category:**
- **QA Tests** (`tests/qa/`): 60s timeout, includes smoke tests, integration, compliance
- **Security Tests** (`tests/security/`): 120s timeout, vulnerability detection, auth bypass
- **Load Tests** (`tests/load/`): 300s timeout, performance validation
- **Integration Tests** (`tests/integration/`): 180s timeout, end-to-end workflows

When working with tests, prefer the simplified configuration during development and use specific test file paths for targeted testing.