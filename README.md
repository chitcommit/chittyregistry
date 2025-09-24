# 🚦 ChittyOS Orchestrator Hub

## ⚠️ IMPORTANT: DO NOT SAVE FILES HERE

This is the **orchestrator landing zone** - a navigation hub for the ChittyOS ecosystem.

**You should NOT be creating new projects or files in this directory!**

---

## 🎯 Where Should You Go Instead?

### Active Project Workspaces

| Project | Purpose | Path |
|---------|---------|------|
| **ChittyChat** | Main platform & unified worker | `→ chittychat/` |
| **ChittyRouter** | AI gateway & intelligent routing | `→ chittyrouter/` |
| **ChittySchema** | Data framework & Notion sync | `→ chittyschema/` |
| **ChittyDashboard** | Command center & monitoring | `→ chittydashboard/` |
| **ChittyCases** | Legal case management | `→ chittycases/` |
| **ChittyID** | Identity management system | `→ chittyid/` |

### Quick Navigation

```bash
# Go to main platform
cd chittychat/

# Go to AI router
cd chittyrouter/

# Go to data schema
cd chittyschema/

# Go to dashboard
cd chittydashboard/
```

---

## 🎮 Orchestrator Commands

This hub provides central orchestration for all ChittyOS services:

### System Health & Validation
```bash
# Run comprehensive system check
./chittycheck/chittycheck-enhanced.sh

# Check project health
./chittychat/project-health-check.sh

# Validate ChittyID compliance
./chittychat/chittyid-command.sh
```

### Project Management
```bash
# Load orchestrator functions
source ./chittychat/project-orchestrator.sh

# Check system status
./chittychat/slash-commands-extended.sh status

# Sync across projects
./chittychat/slash-commands-extended.sh sync

# Deploy services
./chittychat/slash-commands-extended.sh deploy
```

### Service Registry
```bash
# Access service registry
./chittychat/claude-registry-client.sh

# Register new service
./chittychat/claude-registry-client.sh register

# List all services
./chittychat/claude-registry-client.sh list
```

---

## 🏗️ Architecture Overview

```
ChittyOS Orchestrator Hub (YOU ARE HERE)
    │
    ├── 🌐 chittychat/      → Main platform (gateway.chitty.cc)
    ├── 🤖 chittyrouter/    → AI gateway (router.chitty.cc)
    ├── 📊 chittyschema/    → Data framework (schema.chitty.cc)
    ├── 📈 chittydashboard/ → Monitoring (dashboard.chitty.cc)
    ├── ⚖️ chittycases/     → Legal management
    ├── 🆔 chittyid/        → Identity system (id.chitty.cc)
    ├── 🎨 chittybrand/     → Brand management
    ├── 📋 chittyregistry/  → Service registry (registry.chitty.cc)
    ├── 🧹 chittycleaner/   → Cleanup utilities
    └── 🔧 system/          → System tools
```

---

## ⚡ Quick Start

### 1. Choose Your Destination
Don't work here! Navigate to the appropriate project:

```bash
# For platform development
cd chittychat/

# For AI/routing work
cd chittyrouter/

# For data/schema work
cd chittyschema/
```

### 2. Run Health Check
Before starting work, validate the system:

```bash
./chittycheck/chittycheck-enhanced.sh
```

### 3. Start Development
Each project has its own README with specific instructions:

```bash
# Example: Start ChittyChat platform
cd chittychat/
npm install
npm run dev
```

---

## 🚨 Why This Structure?

The orchestrator hub pattern provides:

1. **Separation of Concerns** - Each service has its own workspace
2. **Central Coordination** - Unified tooling and validation
3. **Clean Organization** - No cluttered root directory
4. **Service Discovery** - Easy navigation between projects
5. **Compliance Checking** - Central validation point

---

## 📚 Documentation

- **CLAUDE.md** - AI assistant guidance (for Claude)
- **Individual READMEs** - Check each project directory
- **ChittyCheck Reports** - Run validation for current status

---

## 🆘 Need Help?

1. Run `./chittycheck/chittycheck-enhanced.sh` for system diagnostics
2. Check the CLAUDE.md file for detailed architecture info
3. Navigate to specific project directories for component docs
4. Use the orchestrator commands above for management tasks

---

**Remember: This is a navigation hub, not a workspace. Choose your actual project directory from the list above!**