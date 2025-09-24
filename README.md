# 🚦 ChittyOS Orchestrator Hub

## 🎛️ ChittyOS Orchestrator Functions

This is the **orchestrator control center** - you can:

✅ **Initialize new projects** (with proper access)
✅ **Edit existing projects** across the ecosystem
✅ **Configure/reconfigure** multiple projects
✅ **Cross-project operations** and coordination

**Note**: Individual project files should be saved in their respective directories

---

## 🎯 Available Project Workspaces

### Active Project Directories

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

# Cleanup & maintenance
./chittycleaner/cleanup-system.sh
./system/project-health-audit.sh
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

### 1. Orchestrator Operations
From this hub, you can:

```bash
# Initialize new project with ChittyID
./chittyid/mint-new-project.sh PROJECT_NAME

# Cross-project configuration
./system/configure-multi-project.sh

# Access control management
./system/manage-access-rights.sh

# Project lifecycle management
./system/archive-project.sh PROJECT_NAME
./system/cleanup-inactive-projects.sh
./system/restore-archived-project.sh PROJECT_NAME

# Project consolidation & forking
./system/merge-projects.sh PROJECT_A PROJECT_B
./system/consolidate-similar-projects.sh
./system/fork-project.sh SOURCE_PROJECT NEW_PROJECT
./system/split-project.sh LARGE_PROJECT COMPONENT_NAME
```

### 2. Navigate to Specific Projects
For focused development:

```bash
# For platform development
cd chittychat/

# For AI/routing work
cd chittyrouter/

# For data/schema work
cd chittyschema/
```

### 3. Run Health Check
Before starting work, validate the system:

```bash
./chittycheck/chittycheck-enhanced.sh
```

### 4. Start Development
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