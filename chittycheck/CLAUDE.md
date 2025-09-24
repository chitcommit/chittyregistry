# CLAUDE.md

## Project Overview
**ChittyCheck** - Comprehensive Systems Checkup for ChittyOS Ecosystem

ChittyCheck validates ChittyID compliance, service integration, session management, and system health across the entire ChittyOS ecosystem.

## Slash Commands (EXECUTE IMMEDIATELY)
- **`/chittycheck`** → Execute: `/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh`
- **`/qa`** → Execute: `/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --qa`
- **`/security`** → Execute: `/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --security`
- **`/status`** → Execute: `source /Users/nb/.claude/projects/-/chittycheck/chittycheck-status.sh && chittycheck_status "badge"`
- **`/compliance`** → Execute: `source /Users/nb/.claude/projects/-/chittycheck/chittycheck-status.sh && chittycheck_status "compact"`
- **`/init`** → Execute: `/Users/nb/.claude/projects/-/chittycheck/chittycheck-init.sh`

## Architecture

### Core Components
1. **chittycheck-enhanced.sh** - Main systems checkup script
2. **chittycheck-status.sh** - Lightweight status module for integration
3. **chittycheck-logger.sh** - Central logging and reporting

### Validation Coverage
- ✅ **ChittyID Compliance** - Token validation, rogue pattern detection
- ✅ **Service Integration** - Registry, canon, schema, verify services
- ✅ **Session Management** - Git worktrees, branch validation
- ✅ **Environment Health** - .env, .gitignore, CLAUDE.md creation
- ✅ **Central Logging** - Reports to ChittyChat analytics platform
- ✅ **QA Testing** - Built-in quality assurance with `--qa` flag

## Usage

### Basic Checkup
```bash
./chittycheck-enhanced.sh
# Shows: 🔍 CHITTYCHECK - SYSTEMS CHECKUP: project.chitty.cc
```

### QA Mode
```bash
./chittycheck-enhanced.sh --qa
# Includes additional validation tests
```

### Status Integration
```bash
# Compact format: ❌42%(4)
source chittycheck-status.sh && chittycheck_status "compact"

# Badge format: ChittyCheck: FAIL 42% (2v/2w)
source chittycheck-status.sh && chittycheck_status "badge"
```

## Central Reporting

ChittyCheck automatically reports compliance data to:
- **ChittyChat Platform**: `gateway.chitty.cc/api/analytics/compliance`
- **Local Logs**: `~/.chittychat/compliance/YYYY-MM-DD.jsonl`

This enables ecosystem-wide tracking of systematic issues like unauthorized ID generation patterns.

## Integration

ChittyCheck is integrated into:
- **Status Lines** - Shows compliance percentage and issue count
- **ChittyOS Services** - Validates all central service connections
- **Project Orchestration** - Called by project management tools
- **CI/CD Pipelines** - Automated compliance validation

## Key Features

- **Auto-fix** - Creates missing .env, .gitignore, CLAUDE.md
- **Smart Detection** - Identifies 1189+ unauthorized ID patterns
- **Grade System** - A+ to F compliance scoring
- **Session Safe** - Validates worktree usage and branch management
- **Security Focused** - Prevents secrets leakage, validates permissions

## Development

### Requirements
- ChittyOS Framework v1.0.1+
- Valid CHITTY_ID_TOKEN
- Access to registry.chitty.cc

### Testing
```bash
# Run with QA validation
./chittycheck-enhanced.sh --qa

# Check specific format
./chittycheck-enhanced.sh | grep "Grade:"
```

## ChittyOS Ecosystem Integration

Part of the ChittyOS Framework - validates compliance across:
- **36+ Services** (chittyid, registry, canon, schema, etc.)
- **Session Management** (worktrees, branches, conflicts)
- **Central Logging** (systematic issue tracking)
- **Cross-Project Standards** (consistent environments)

---

**Mission**: Ensure every project in the ChittyOS ecosystem maintains compliance with ChittyID standards and architectural patterns.