#!/bin/bash

# ChittyCheck Initialization Script
# Sets up a new project with ChittyOS compliance from the start

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PROJECT_NAME="${1:-$(basename $(pwd))}"
PROJECT_PATH="${2:-$(pwd)}"

echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}${BOLD}   🚀 CHITTYOS PROJECT INITIALIZATION: $PROJECT_NAME${RESET}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo ""

cd "$PROJECT_PATH"

# Step 1: Initialize git repository if not exists
echo -e "${BOLD}1️⃣  GIT REPOSITORY SETUP${RESET}"
if [ ! -d ".git" ]; then
    git init
    echo -e "  ${GREEN}✅ Initialized git repository${RESET}"
else
    echo -e "  ${YELLOW}ℹ️  Git repository already exists${RESET}"
fi

# Create feature branch
BRANCH_NAME="feature/setup-$(date +%Y%m%d)"
if ! git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    git checkout -b "$BRANCH_NAME"
    echo -e "  ${GREEN}✅ Created feature branch: $BRANCH_NAME${RESET}"
else
    git checkout "$BRANCH_NAME"
    echo -e "  ${YELLOW}ℹ️  Switched to existing branch: $BRANCH_NAME${RESET}"
fi

# Step 2: Create essential files
echo ""
echo -e "${BOLD}2️⃣  ESSENTIAL FILES CREATION${RESET}"

# Create .gitignore
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# ChittyOS Standard .gitignore

# Environment variables
.env
.env.local
.env.production

# Dependencies
node_modules/
npm-debug.log*
package-lock.json

# Build outputs
dist/
build/
.next/
.nuxt/

# Runtime
*.log
.DS_Store
.vscode/
.idea/

# ChittyOS specific
.chittyos/
*.chittyid.bak

# Temporary files
tmp/
temp/
*.tmp
EOF
    echo -e "  ${GREEN}✅ Created .gitignore${RESET}"
else
    echo -e "  ${YELLOW}ℹ️  .gitignore already exists${RESET}"
fi

# Create .env.example
if [ ! -f ".env.example" ]; then
    cat > .env.example << 'EOF'
# ChittyOS Environment Configuration Template
# Copy to .env and fill in your values

# ChittyID Configuration (REQUIRED)
CHITTY_ID_TOKEN=YOUR_TOKEN_HERE_REPLACE_ME
CHITTY_ID_BASE=https://id.chitty.cc

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
NEON_DATABASE_URL=postgresql://user:password@neon.tech:port/database

# Storage Configuration
R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_BUCKET=your-cloudflare-bucket

# ChittyOS Services
REGISTRY_SERVICE=https://registry.chitty.cc
CHITTYOS_ACCOUNT_ID=bbf9fcd845e78035b7a135c481e88541

# Security Configuration
HTTPS=true
SECURITY_HEADERS=true

# Application Configuration
NODE_ENV=development
PORT=3000
EOF
    echo -e "  ${GREEN}✅ Created .env.example${RESET}"
else
    echo -e "  ${YELLOW}ℹ️  .env.example already exists${RESET}"
fi

# Create basic .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "  ${GREEN}✅ Created .env from template${RESET}"
    echo -e "  ${YELLOW}⚠️  Remember to update .env with your actual values${RESET}"
else
    echo -e "  ${YELLOW}ℹ️  .env already exists${RESET}"
fi

# Create CLAUDE.md
if [ ! -f "CLAUDE.md" ]; then
    cat > CLAUDE.md << EOF
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**$PROJECT_NAME** - [Brief description of your project]

## Slash Commands (EXECUTE IMMEDIATELY)
- **\`/chittycheck\`** → Execute: \`/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh\`
- **\`/status\`** → Execute: \`source /Users/nb/.claude/projects/-/chittycheck/chittycheck-status.sh && chittycheck_status "badge"\`
- **\`/qa\`** → Execute: \`/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --qa\`
- **\`/security\`** → Execute: \`/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --security\`

## Development Commands

### Installation
\`\`\`bash
npm install              # Install dependencies
\`\`\`

### Development
\`\`\`bash
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run tests
\`\`\`

## ChittyOS Integration

### ChittyID Compliance
- ✅ All IDs sourced from https://id.chitty.cc
- ✅ No local ID generation
- ✅ ChittyID token configured

### Core Systems
- 🆔 **ID System**: ChittyID integration
- 🔀 **Git System**: Feature branch workflow
- 💾 **Data System**: Database and storage configured
- 🔖 **Registry System**: Service discovery enabled
- 🔐 **Security System**: HTTPS and security headers

## Architecture
[Describe your project architecture here]

## Key Features
[List main features and functionality]

---
*Initialized with ChittyOS Project Setup v1.0.0*
EOF
    echo -e "  ${GREEN}✅ Created CLAUDE.md${RESET}"
else
    echo -e "  ${YELLOW}ℹ️  CLAUDE.md already exists${RESET}"
fi

# Step 3: Package.json setup (if Node.js project)
echo ""
echo -e "${BOLD}3️⃣  PROJECT CONFIGURATION${RESET}"

if [ -f "package.json" ] || [ "$PROJECT_TYPE" = "node" ]; then
    if [ ! -f "package.json" ]; then
        npm init -y
        echo -e "  ${GREEN}✅ Created package.json${RESET}"
    fi

    # Add ChittyOS scripts if not present
    if ! grep -q "chittycheck" package.json; then
        # Add chittycheck scripts using jq if available, otherwise manual
        if command -v jq &> /dev/null; then
            # Use jq to add scripts
            cp package.json package.json.bak
            jq '.scripts += {
                "chittycheck": "/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh",
                "status": "source /Users/nb/.claude/projects/-/chittycheck/chittycheck-status.sh && chittycheck_status \"badge\"",
                "compliance": "/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh",
                "security": "/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh --security"
            }' package.json.bak > package.json
            echo -e "  ${GREEN}✅ Added ChittyOS scripts to package.json${RESET}"
        else
            echo -e "  ${YELLOW}ℹ️  Manually add ChittyOS scripts to package.json${RESET}"
        fi
    fi
fi

# Step 4: Initial commit
echo ""
echo -e "${BOLD}4️⃣  INITIAL COMMIT${RESET}"

git add .
if git diff --staged --quiet; then
    echo -e "  ${YELLOW}ℹ️  No changes to commit${RESET}"
else
    git commit -m "🚀 Initialize ChittyOS compliant project: $PROJECT_NAME

- Set up git repository with feature branch workflow
- Create essential configuration files (.gitignore, .env.example, CLAUDE.md)
- Configure ChittyOS compliance tooling
- Initialize project structure

🤖 Generated with ChittyOS Project Init

Co-Authored-By: ChittyCheck <noreply@chitty.cc>"
    echo -e "  ${GREEN}✅ Created initial commit${RESET}"
fi

# Step 5: Run initial validation
echo ""
echo -e "${BOLD}5️⃣  INITIAL VALIDATION${RESET}"
echo ""

# Run chittycheck to validate setup
if [ -f "/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh" ]; then
    /Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh
else
    echo -e "  ${YELLOW}⚠️  ChittyCheck not found, skipping validation${RESET}"
fi

echo ""
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}${BOLD}   ✅ PROJECT INITIALIZATION COMPLETE!${RESET}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "${BOLD}Next Steps:${RESET}"
echo "1. Update .env with your actual ChittyID token and configuration"
echo "2. Run 'chittycheck' to validate your setup"
echo "3. Start developing in the '$BRANCH_NAME' branch"
echo "4. Use 'git worktree' for additional sessions if needed"
echo ""
echo -e "${BOLD}Quick Commands:${RESET}"
echo "• chittycheck           # Validate ChittyOS compliance"
echo "• chittycheck --help    # Show detailed help"
echo "• git status            # Check current git status"
echo ""
echo -e "${DIM}Project initialized with ChittyOS compliance standards${RESET}"
echo -e "${DIM}For support: https://registry.chitty.cc/help${RESET}"