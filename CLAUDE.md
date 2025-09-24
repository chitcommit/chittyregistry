# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **ChittyOS Framework Core Repository** - the central orchestration point for a comprehensive ecosystem of 34+ interconnected services, tools, and applications. The repository serves as the development workspace and deployment coordination center for the entire ChittyOS platform, which spans AI connectors, identity management, legal technology, and enterprise automation.

## Essential Commands

### ChittyOS Slash Commands (EXECUTE IMMEDIATELY)
When user types these commands, run them immediately with the Bash tool:

```bash
# Core Validation
/chittycheck    # Execute: /Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh
/health         # Execute: ./chittychat/project-health-check.sh
/chittyid       # Execute: ./chittychat/chittyid-command.sh

# Project Management
/project        # Execute: bash -c 'source ./chittychat/project-orchestrator.sh && project'
/status         # Execute: ./chittychat/slash-commands-extended.sh status
/sync           # Execute: ./chittychat/slash-commands-extended.sh sync

# Development & Deployment
/deploy         # Execute: ./chittychat/slash-commands-extended.sh deploy
/test           # Execute: ./chittychat/slash-commands-extended.sh test
/clean          # Execute: ./chittychat/slash-commands-extended.sh clean

# Registry Integration
/registry       # Execute: ./chittychat/claude-registry-client.sh
```

### Development Commands by Component

**ChittyChat Platform (Unified Worker)**:
```bash
cd chittychat/
npm install
npm run dev                    # Wrangler dev server (port 8787)
npm run deploy                 # Deploy optimized platform
npm run deploy:production      # Deploy to production environment
npm test                      # Comprehensive test suite
npm run benchmark             # Platform optimization analysis
```

**ChittyRouter AI Gateway**:
```bash
cd chittyrouter/
npm run dev                   # AI-enabled dev server
npm run test:all              # All test suites (unit/integration/performance)
npm run deploy:production     # Deploy to production
npm run validate              # Lint + test + build validation
npm run chittyid:generate     # Generate test ChittyIDs
```

**ChittySchema Data Framework**:
```bash
cd chittyschema/
npm run dev                   # Development server with tsx watch
npm run test:qa               # QA test suite
npm run test:security         # Security audit tests
npm run db:push               # Push schema to PostgreSQL
npm run sync:trigger          # Trigger manual sync
```

**ChittyOS Infrastructure (Makefile-based)**:
```bash
cd chittyrouter/
make validate                 # Validate with 1Password CLI
make test                     # Run consolidation tests
make ci-guards               # ChittyID CI guard validation
make clean                   # Clean up old files
```

### Testing Commands

**Comprehensive Testing**:
```bash
# ChittyChat platform tests
cd chittychat/ && npm run test
cd chittychat/ && node test-real-system.js

# ChittyRouter AI gateway tests
cd chittyrouter/ && npm run test:all
cd chittyrouter/ && npm run test:failure

# ChittySchema security & compliance
cd chittyschema/ && npm run test:security:critical
cd chittyschema/ && npm run test:qa:compliance

# Cross-component validation
/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --qa
```

## Architecture Overview

### High-Level System Architecture

The ChittyOS ecosystem follows a **hub-and-spoke architecture** with centralized identity management and distributed service orchestration:

```
                    🏛️ ChittyOS Central Authority
                            ├── 🆔 id.chitty.cc (ChittyID Authority)
                            ├── 📋 registry.chitty.cc (Service Registry)
                            ├── ⚖️ canon.chitty.cc (Canonical Data)
                            └── 📊 schema.chitty.cc (Universal Schema)
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
        🚪 ChittyChat Platform   🤖 AI Gateway    📊 Data Framework
        (34+ Services → 1)      (ChittyRouter)   (ChittySchema)
        gateway.chitty.cc       router.chitty.cc  schema.chitty.cc
```

### Core Design Principles

1. **ChittyID Authority**: ALL identifiers MUST be minted from `id.chitty.cc` - no local generation allowed
2. **Service Orchestration**: Single unified workers replace microservice sprawl (85% resource reduction)
3. **Cross-Session Continuity**: Git worktree management with session state persistence
4. **Evidence-Based Operations**: All activities generate verifiable evidence for blockchain anchoring
5. **Universal Schema**: Entity-based data model supporting PEO/PLACE/PROP/EVNT/AUTH classifications

### Major Components

**1. ChittyChat Platform** (`chittychat/`):
- **Purpose**: Unified Cloudflare Worker consolidating 34+ microservices
- **Key Files**: `src/platform-worker.js`, `wrangler.optimized.toml`
- **Services**: AI Gateway, Auth, Beacon, Canon, Chat, Registry, Sync, Verify
- **Optimization**: 85% resource reduction, $500/month cost savings
- **Account**: ChittyCorp LLC (bbf9fcd845e78035b7a135c481e88541)

**2. ChittyRouter AI Gateway** (`chittyrouter/`):
- **Purpose**: AI-powered intelligent email routing for legal workflows
- **Key Files**: `src/ai/intelligent-router.js`, `src/ai/agent-orchestrator.js`
- **AI Models**: Llama 4, GPT-OSS, Gemma 3 with automatic fallback chains
- **Features**: Multi-agent coordination, document analysis, automated responses

**3. ChittySchema Data Framework** (`chittyschema/`):
- **Purpose**: Universal neutralized schema for evidence, facts, cases, properties
- **Key Files**: `db/schema.ts`, `src/routes/*.ts`
- **Database**: PostgreSQL with Neon provider, Drizzle ORM
- **Integration**: Notion sync, macOS extensions, ChittyOS service registry

**4. Supporting Infrastructure**:
- **ChittyCheck**: Comprehensive compliance validation (`chittycheck/`)
- **ChittyID Research**: Identity system research and prototypes (`chittyid/`)
- **Legal Tech**: Case management and document processing (`legal/`)
- **System Tools**: 1Password integration, macOS automation (`system/`)

### Key Integration Patterns

**ChittyID Integration**:
- **Never generate locally** - all IDs come from `https://id.chitty.cc/v1/mint`
- **Required token**: `CHITTY_ID_TOKEN` in environment
- **Format**: `CHITTY-{ENTITY}-{SEQUENCE}-{CHECKSUM}`
- **Entities**: PEO, PLACE, PROP, EVNT, AUTH, INFO, FACT, CONTEXT, ACTOR

**Cross-Session Management**:
- **Git Worktrees**: Each session gets isolated branch with `git worktree`
- **State Persistence**: Session data synced via GitHub repositories
- **Evidence Collection**: All operations generate evidence for ChittyID blockchain
- **Conflict Prevention**: Automatic session boundary detection

**Service Discovery**:
- **Registry**: `registry.chitty.cc` maintains service catalog
- **Auto-Registration**: Projects self-register with metadata
- **Health Monitoring**: Continuous service availability validation
- **Load Balancing**: Intelligent routing based on capacity and performance

## Environment Configuration

### Critical Environment Variables

```bash
# ChittyID Authentication (REQUIRED)
CHITTY_ID_TOKEN=your_chittyid_token_here

# ChittyOS Core Services
CHITTYOS_ACCOUNT_ID=bbf9fcd845e78035b7a135c481e88541
REGISTRY_SERVICE=https://registry.chitty.cc
CHITTYID_SERVICE=https://id.chitty.cc
GATEWAY_SERVICE=https://gateway.chitty.cc

# Database & Storage
NEON_DATABASE_URL=postgresql://...
DATABASE_URL=postgresql://...
CLOUDFLARE_ACCOUNT_ID=bbf9fcd845e78035b7a135c481e88541

# AI Services (ChittyRouter)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
CF_AIG_TOKEN=...

# Notion Integration (ChittySchema)
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=...
```

### Deployment Environments

**Production Domains**:
- `gateway.chitty.cc` - Unified platform entry point
- `api.chitty.cc` - API gateway and services
- `id.chitty.cc` - ChittyID authority
- `registry.chitty.cc` - Service registry
- `schema.chitty.cc` - Data framework
- `router.chitty.cc` - AI gateway

## Development Workflow

### Initial Setup
```bash
# 1. Load ChittyOS environment
source chittychat/project-orchestrator.sh

# 2. Validate system compliance
/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh

# 3. Ensure ChittyID token configured
echo $CHITTY_ID_TOKEN  # Should not be empty

# 4. Start development environment
cd chittychat/ && npm run dev    # Port 8787
```

### Working with Sessions
```bash
# Load session management
project                          # Initialize session context

# Check session status
/status                         # Session and git status

# Sync across sessions
/sync start                     # Enable cross-session sync
```

### Testing Strategy
```bash
# Run compliance validation first
/chittycheck

# Component-specific testing
cd chittyrouter/ && npm run test:all
cd chittyschema/ && npm run test:security
cd chittychat/ && npm run test

# Cross-system integration
./chittychat/project-health-check.sh
```

## Security Considerations

### ChittyID Compliance
- **No local ID generation** - ChittyCheck enforces this with pattern detection
- **Token security** - Never commit `CHITTY_ID_TOKEN` to repositories
- **Service validation** - All services must authenticate through ChittyID

### Infrastructure Security
- **1Password CLI** - Secrets managed through `op run --env-file=.env.op`
- **Cloudflare Security** - Workers deployed to ChittyCorp LLC account
- **Database Security** - PostgreSQL with Neon provider, SSL required
- **API Security** - Bearer token authentication, rate limiting

### Session Security
- **Isolated worktrees** - Each session runs in separate git worktree
- **Evidence collection** - All operations logged for audit trails
- **Cross-session validation** - Session conflicts detected and prevented

## Common Development Tasks

### Adding New Services
1. Register service in `~/.chittyos/config.json`
2. Add health endpoint following existing patterns
3. Integrate with ChittyID for identity management
4. Update registry via `/registry` command

### Deploying Changes
1. Run `/chittycheck` to ensure compliance
2. Execute component-specific tests
3. Use `/deploy` for coordinated deployment
4. Monitor via `/health` command

### Debugging Issues
1. Check `/status` for system overview
2. Review logs in `~/.chittychat/compliance/`
3. Use `/chittyid` for identity-specific issues
4. Consult service-specific CLAUDE.md files in subdirectories

## File Structure

```
/
├── chittychat/           # Unified platform (main service)
├── chittyrouter/         # AI gateway and routing
├── chittyschema/         # Data framework and sync
├── chittycheck/          # Compliance validation
├── chittyid/             # Identity research and tools
├── legal/                # Legal technology components
├── system/               # System integration tools
├── tmp/                  # Temporary workspace
└── CLAUDE.md            # This file
```

## Support and Troubleshooting

- **Service Status**: All services implement `/health` endpoints
- **Compliance Issues**: Run `/chittycheck --qa` for detailed diagnostics
- **Documentation**: Each component has its own CLAUDE.md with specific guidance
- **Registry Issues**: Use `/registry sync` to refresh service catalog
- **Session Conflicts**: Use `project` command for session management