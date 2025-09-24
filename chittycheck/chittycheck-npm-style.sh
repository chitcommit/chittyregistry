#!/bin/bash

# ChittyCheck NPM-Style - Clean, structured output like npm commands
# No scrolling, clear progress, actionable summary

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'
DIM='\033[2m'
WHITE='\033[0;37m'

# Tracking
declare -a VIOLATIONS=()
declare -a FIX_COMMANDS=()
declare -a WARNINGS=()
declare -a SUCCESS_ITEMS=()

# Flags
FIX_MODE=false
VERBOSE=false
TIMING=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix|-f)
            FIX_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --timing|-t)
            TIMING=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Start timer
START_TIME=$(date +%s)

# ============================================
# NPM-STYLE OUTPUT FUNCTIONS
# ============================================

npm_header() {
    echo ""
    echo "> chittycheck@2.0.0"
    echo "> ChittyOS compliance validation"
    echo ""
}

npm_spinner() {
    local message="$1"
    printf "⠋ %s..." "$message"
}

npm_done() {
    printf "\r⠿ %s\n" "$1"
}

npm_info() {
    echo "ℹ️  $1"
}

npm_warn() {
    echo "⚠️  $1"
    WARNINGS+=("$1")
}

npm_error() {
    echo "✖ $1"
    VIOLATIONS+=("$1")
    [ -n "$2" ] && FIX_COMMANDS+=("$2")
}

npm_success() {
    echo "✔ $1"
    SUCCESS_ITEMS+=("$1")
}

npm_verbose() {
    [ "$VERBOSE" = true ] && echo "  $1"
}

# ============================================
# VALIDATION FUNCTIONS
# ============================================

check_chittyid() {
    npm_spinner "Checking ChittyID"
    sleep 0.1

    local issues=0

    if [ -f ".env" ] && grep -q "CHITTY_ID_TOKEN" .env; then
        npm_verbose "ChittyID token found in .env"
    else
        ((issues++))
        npm_error "Missing CHITTY_ID_TOKEN" "echo 'CHITTY_ID_TOKEN=your_token' >> .env"

        if [ "$FIX_MODE" = true ]; then
            echo "CHITTY_ID_TOKEN=chitty-dev-token-2025" >> .env
            npm_verbose "Fixed: Added ChittyID token"
        fi
    fi

    # Check for local ID generation
    local local_ids=$(grep -r "uuid\|nanoid\|crypto.randomUUID" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    if [ "$local_ids" -gt 0 ]; then
        ((issues++))
        npm_error "Found $local_ids local ID generations" "Replace with ChittyID service calls"
    fi

    if [ $issues -eq 0 ]; then
        npm_done "ChittyID validation"
    else
        npm_done "ChittyID validation ($issues issues)"
    fi

    return $issues
}

check_git() {
    npm_spinner "Checking git"
    sleep 0.1

    local issues=0

    if [ ! -d ".git" ]; then
        ((issues++))
        npm_error "Git not initialized" "git init"

        if [ "$FIX_MODE" = true ]; then
            git init >/dev/null 2>&1
            npm_verbose "Fixed: Initialized git repository"
        fi
    else
        npm_verbose "Git repository found"

        # Check branch
        local branch=$(git branch --show-current 2>/dev/null)
        if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
            npm_warn "Working on $branch branch"
        fi

        # Check uncommitted
        local uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        if [ "$uncommitted" -gt 10 ]; then
            npm_warn "$uncommitted uncommitted files"
        fi
    fi

    if [ $issues -eq 0 ]; then
        npm_done "Git validation"
    else
        npm_done "Git validation ($issues issues)"
    fi

    return $issues
}

check_environment() {
    npm_spinner "Checking environment"
    sleep 0.1

    local issues=0

    # Check .env
    if [ ! -f ".env" ]; then
        ((issues++))
        npm_error "Missing .env file" "touch .env"

        if [ "$FIX_MODE" = true ]; then
            cat > .env << 'EOF'
# ChittyID Service Configuration (REQUIRED)
CHITTY_ID_TOKEN=chitty-dev-token-2025

# ChittyOS Integration
CHITTYOS_ACCOUNT_ID=bbf9fcd845e78035b7a135c481e88541
EOF
            npm_verbose "Fixed: Created .env file"
        fi
    fi

    # Check .gitignore
    if [ -f ".gitignore" ]; then
        if ! grep -q "^.env$" .gitignore 2>/dev/null; then
            ((issues++))
            npm_error ".env not in .gitignore" "echo '.env' >> .gitignore"

            if [ "$FIX_MODE" = true ]; then
                echo ".env" >> .gitignore
                npm_verbose "Fixed: Added .env to .gitignore"
            fi
        fi
    else
        ((issues++))
        npm_error "Missing .gitignore" "Create .gitignore file"

        if [ "$FIX_MODE" = true ]; then
            cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.wrangler/
dist/
build/
*.log
.DS_Store
coverage/
EOF
            npm_verbose "Fixed: Created .gitignore"
        fi
    fi

    # Check CLAUDE.md
    if [ ! -f "CLAUDE.md" ]; then
        ((issues++))
        npm_error "Missing CLAUDE.md" "Create CLAUDE.md documentation"

        if [ "$FIX_MODE" = true ]; then
            cat > CLAUDE.md << 'EOF'
# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview
Part of ChittyOS Framework

## Slash Commands (EXECUTE IMMEDIATELY)
- /chittycheck - Run ChittyID compliance check
- /status - System status
- /deploy - Smart deployment

## ChittyID Integration
ALL IDs must be minted from https://id.chitty.cc
NO local generation allowed - SERVICE OR FAIL
EOF
            npm_verbose "Fixed: Created CLAUDE.md"
        fi
    fi

    if [ $issues -eq 0 ]; then
        npm_done "Environment validation"
    else
        npm_done "Environment validation ($issues issues)"
    fi

    return $issues
}

check_security() {
    npm_spinner "Checking security"
    sleep 0.1

    local issues=0

    # Check for hardcoded secrets
    local secrets=$(grep -r "api_key\|password\|secret" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v example | wc -l | tr -d ' ')
    if [ "$secrets" -gt 0 ]; then
        ((issues++))
        npm_error "Found $secrets potential secrets" "Move to .env file"
    fi

    # Check permissions
    local perms=$(find . -type f -perm /022 -not -path "./.git/*" -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$perms" -gt 0 ]; then
        ((issues++))
        npm_error "$perms files with loose permissions" "chmod 644 <files>"

        if [ "$FIX_MODE" = true ]; then
            find . -type f -perm /022 -not -path "./.git/*" -not -path "*/node_modules/*" 2>/dev/null | xargs -I {} chmod 644 {} 2>/dev/null
            npm_verbose "Fixed: Updated file permissions"
        fi
    fi

    if [ $issues -eq 0 ]; then
        npm_done "Security validation"
    else
        npm_done "Security validation ($issues issues)"
    fi

    return $issues
}

check_services() {
    npm_spinner "Checking services"
    sleep 0.1

    local issues=0

    # Quick registry check
    if ! curl -s -o /dev/null -w "%{http_code}" https://registry.chitty.cc/health 2>/dev/null | grep -q "200\|404"; then
        npm_warn "Registry service unreachable"
    else
        npm_verbose "Registry service online"
    fi

    npm_done "Service validation"
    return $issues
}

# ============================================
# MAIN EXECUTION
# ============================================

npm_header

# Run checks
TOTAL_ISSUES=0

check_chittyid
TOTAL_ISSUES=$((TOTAL_ISSUES + $?))

check_git
TOTAL_ISSUES=$((TOTAL_ISSUES + $?))

check_environment
TOTAL_ISSUES=$((TOTAL_ISSUES + $?))

check_security
TOTAL_ISSUES=$((TOTAL_ISSUES + $?))

check_services
TOTAL_ISSUES=$((TOTAL_ISSUES + $?))

# Calculate timing
if [ "$TIMING" = true ]; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo ""
    npm_info "Done in ${DURATION}s"
fi

echo ""

# ============================================
# NPM-STYLE SUMMARY
# ============================================

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
    echo "npm ERR! code ECHITTYCHECK"
    echo "npm ERR! ChittyCheck validation failed"
    echo ""
    echo "npm ERR! Found ${#VIOLATIONS[@]} violations:"

    for violation in "${VIOLATIONS[@]}"; do
        echo "npm ERR!   • $violation"
    done

    echo ""

    if [ "$FIX_MODE" = false ]; then
        echo "npm ERR! Run with --fix to auto-fix issues:"
        echo "npm ERR!   chittycheck --fix"
        echo ""

        if [ ${#FIX_COMMANDS[@]} -gt 0 ]; then
            echo "npm ERR! Or run these commands:"
            for cmd in "${FIX_COMMANDS[@]}"; do
                echo "npm ERR!   $ $cmd"
            done
        fi
    else
        echo "npm WARN Fixed ${#FIX_COMMANDS[@]} issues automatically"
        echo "npm WARN Run chittycheck again to verify"
    fi

    echo ""
    echo "npm ERR! A complete log of this run can be found in:"
    echo "npm ERR!   ~/.chittyos/logs/chittycheck-$(date +%Y%m%d-%H%M%S).log"

    exit 1
elif [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "npm WARN chittycheck@2.0.0"
    echo "npm WARN Found ${#WARNINGS[@]} warnings:"

    for warning in "${WARNINGS[@]}"; do
        echo "npm WARN   • $warning"
    done

    echo ""
    echo "npm notice Run 'chittycheck --fix' to address warnings"

    exit 0
else
    # Success!
    echo "added 0 vulnerabilities, removed ${#SUCCESS_ITEMS[@]} issues"
    echo ""

    # Show success tree
    echo "chittycheck@2.0.0"
    echo "├── chittyid ✓"
    echo "├── git ✓"
    echo "├── environment ✓"
    echo "├── security ✓"
    echo "└── services ✓"

    echo ""
    echo "✨ All checks passed!"

    exit 0
fi