#!/bin/bash

# ChittyCheck Status Line Module
# Provides compact compliance status for integration into status displays

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Function to run silent chittycheck and return status
chittycheck_status() {
    local violations=0
    local warnings=0
    local passed=0
    local critical_violations=()

    # Load configuration silently
    if [ -f "$HOME/.chittyos/config.json" ] && command -v jq &> /dev/null; then
        eval "$(jq -r '.services | to_entries[] | .value[] | "export \(.name | ascii_upcase)_SERVICE=\"\(.url)\""' "$HOME/.chittyos/config.json" 2>/dev/null)" 2>/dev/null
        export REGISTRY_SERVICE=$(jq -r '.registry // "https://registry.chitty.cc"' "$HOME/.chittyos/config.json" 2>/dev/null)
        export CHITTYOS_ACCOUNT_ID=$(jq -r '.account_id // "bbf9fcd845e78035b7a135c481e88541"' "$HOME/.chittyos/config.json" 2>/dev/null)
    fi

    # Load .env if exists
    if [ -f ".env" ]; then
        set -a
        source .env 2>/dev/null
        set +a
    fi

    # Quick checks (silent)

    # 1. Token check
    if [ -n "$CHITTY_ID_TOKEN" ] && [ "$CHITTY_ID_TOKEN" != "YOUR_TOKEN_HERE_REPLACE_ME" ]; then
        ((passed++))
    else
        ((violations++))
        critical_violations+=("No valid ChittyID token")
    fi

    # 2. Rogue package check (if package.json exists)
    if [ -f "package.json" ]; then
        local rogue_packages=(uuid nanoid shortid cuid uniqid)
        for pkg in "${rogue_packages[@]}"; do
            if grep -q "\"$pkg\"" package.json 2>/dev/null; then
                ((violations++))
                critical_violations+=("Rogue ID package: $pkg")
            fi
        done
        ((passed++))  # No rogue packages found
    fi

    # 3. Rogue pattern check (quick scan)
    if [ -d "src" ] || [ -d "." ]; then
        local pattern_count=0
        local rogue_patterns=("crypto\.randomUUID" "nanoid\(\)" "Math\.random.*toString" "generateId\|generateID")

        for pattern in "${rogue_patterns[@]}"; do
            local count=$(grep -r "$pattern" --include="*.js" --include="*.ts" --include="*.py" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
            pattern_count=$((pattern_count + count))
        done

        if [ $pattern_count -gt 0 ]; then
            ((violations++))
            critical_violations+=("$pattern_count rogue ID patterns")
        else
            ((passed++))
        fi
    fi

    # 4. ChittyID integration check
    if grep -r "id\.chitty\.cc\|ChittyIDClient\|mintChittyId" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v node_modules | head -1 >/dev/null; then
        ((passed++))
    else
        ((warnings++))
    fi

    # 5. Git/session check
    if [ -d ".git" ]; then
        local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
            ((warnings++))
        else
            ((passed++))
        fi

        if ! git diff-index --quiet HEAD -- 2>/dev/null; then
            ((warnings++))
        else
            ((passed++))
        fi
    fi

    # 6. Essential files check
    [ -f ".gitignore" ] && ((passed++)) || ((warnings++))
    [ -f "CLAUDE.md" ] && ((passed++)) || ((warnings++))

    # Calculate score
    local total_checks=$((violations + warnings + passed))
    local score=0
    if [ $total_checks -gt 0 ]; then
        score=$(( (passed * 100) / total_checks ))
    fi

    # Return results based on format requested
    case "$1" in
        "compact")
            # For status lines - very compact format
            local color=""
            local icon=""
            if [ $violations -gt 0 ]; then
                color="${RED}"
                icon="❌"
            elif [ $warnings -gt 0 ]; then
                color="${YELLOW}"
                icon="⚠️"
            else
                color="${GREEN}"
                icon="✅"
            fi

            local issues=$((violations + warnings))
            echo -e "${color}${icon}${score}%${RESET}${color}(${issues})${RESET}"
            ;;
        "badge")
            # For status badges - medium format
            local status_color=""
            local status_text=""
            if [ $violations -gt 0 ]; then
                status_color="${RED}"
                status_text="FAIL"
            elif [ $warnings -gt 0 ]; then
                status_color="${YELLOW}"
                status_text="WARN"
            else
                status_color="${GREEN}"
                status_text="PASS"
            fi

            # Core Systems Status with detailed indicators and issue counts
            local id_issues=0
            local id_status=""
            local id_color="${GREEN}"
            if [ -n "$CHITTY_ID_TOKEN" ] && [ "$CHITTY_ID_TOKEN" != "YOUR_TOKEN_HERE_REPLACE_ME" ]; then
                id_status="🆔"
                id_color="${GREEN}"
            elif [ -n "$CHITTY_ID_TOKEN" ]; then
                id_status="🆔"
                id_color="${YELLOW}"
                id_issues=1
            else
                id_status="🆔"
                id_color="${RED}"
                id_issues=1
            fi

            local git_issues=0
            local git_status=""
            local git_color="${GREEN}"
            if [ -d ".git" ]; then
                local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
                # Count git issues
                if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
                    ((git_issues++))  # Working on main/master
                fi
                if ! git diff-index --quiet HEAD -- 2>/dev/null; then
                    ((git_issues++))  # Uncommitted changes
                fi
                local untracked=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
                if [ "$untracked" -gt 0 ]; then
                    git_issues=$((git_issues + untracked))  # Untracked files
                fi

                if [ $git_issues -eq 0 ]; then
                    git_status="🔀"
                    git_color="${GREEN}"
                else
                    git_status="🔀GIT"
                    if [ $git_issues -le 2 ]; then
                        git_color="${YELLOW}"
                    else
                        git_color="${RED}"
                    fi
                fi
            else
                git_status="🔀GIT"
                git_color="${RED}"
                git_issues=3  # Not a git repo is a major issue
            fi

            local data_issues=0
            local data_status=""
            local data_color="${GREEN}"
            # Count data configuration issues
            if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ]; then
                ((data_issues++))  # No database
            fi
            if [ -z "$R2_BUCKET" ] && [ -z "$CLOUDFLARE_R2_BUCKET" ]; then
                ((data_issues++))  # No storage
            fi

            if [ $data_issues -eq 0 ]; then
                data_status="💾"
                data_color="${GREEN}"
            else
                data_status="💾DATA"
                if [ $data_issues -eq 1 ]; then
                    data_color="${YELLOW}"
                else
                    data_color="${RED}"
                fi
            fi

            local registry_issues=0
            local registry_status=""
            local registry_color="${GREEN}"
            # Count registry issues
            if [ -z "$REGISTRY_SERVICE" ]; then
                registry_issues=$((registry_issues + 2))  # No registry service
            fi
            if [ -z "$CHITTYOS_ACCOUNT_ID" ]; then
                ((registry_issues++))  # No account ID
            fi
            # Test registry connectivity (quick check)
            if [ -n "$REGISTRY_SERVICE" ]; then
                if ! curl -s --max-time 2 "$REGISTRY_SERVICE/health" >/dev/null 2>&1; then
                    ((registry_issues++))  # Registry unreachable
                fi
            fi

            if [ $registry_issues -eq 0 ]; then
                registry_status="🔖"
                registry_color="${GREEN}"
            else
                registry_status="🔖RGSTRY"
                if [ $registry_issues -le 2 ]; then
                    registry_color="${YELLOW}"
                else
                    registry_color="${RED}"
                fi
            fi

            # Build the systems indicator
            local systems_indicator=""
            local overall_systems_color="${GREEN}"
            local total_system_issues=$((id_issues + git_issues + data_issues + registry_issues))

            if [ $total_system_issues -gt 0 ]; then
                if [ $violations -gt 0 ]; then
                    overall_systems_color="${RED}"
                    systems_indicator="❌"
                else
                    overall_systems_color="${YELLOW}"
                    systems_indicator="⚠️"
                fi
            else
                overall_systems_color="${GREEN}"
                systems_indicator="✅"
            fi

            # Function to get color based on issue severity
            get_issue_color() {
                local issues=$1
                if [ $issues -eq 0 ]; then
                    echo "${GREEN}"
                elif [ $issues -le 2 ]; then
                    echo "${YELLOW}"
                elif [ $issues -le 5 ]; then
                    echo "${RED}"
                else
                    echo "${RED}"
                fi
            }

            # Build detailed status parts with color-coded numbers only
            local id_part=""
            if [ $id_issues -gt 0 ]; then
                local id_number_color=$(get_issue_color $id_issues)
                id_part="${id_status}:${id_number_color}${id_issues}${RESET}"
            else
                id_part="🆔"  # Compact emoji only when passed
            fi

            local git_part=""
            if [ $git_issues -gt 0 ]; then
                local git_number_color=$(get_issue_color $git_issues)
                git_part="${git_status}:${git_number_color}${git_issues}${RESET}"
            else
                git_part="🔀"  # Compact emoji only when passed
            fi

            local data_part=""
            if [ $data_issues -gt 0 ]; then
                local data_number_color=$(get_issue_color $data_issues)
                data_part="${data_status}:${data_number_color}${data_issues}${RESET}"
            else
                data_part="💾"  # Compact emoji only when passed
            fi

            local registry_part=""
            if [ $registry_issues -gt 0 ]; then
                local registry_number_color=$(get_issue_color $registry_issues)
                registry_part="${registry_status}:${registry_number_color}${registry_issues}${RESET}"
            else
                registry_part="🔖"  # Compact emoji only when passed
            fi

            echo -e "${CYAN}ChittyCheck:${RESET} ${status_color}${status_text} ${score}%${RESET} ${CYAN}(${violations}v/${warnings}w)${RESET} ${overall_systems_color}${systems_indicator}{${id_part}|${git_part}|${data_part}|${registry_part}}${RESET}"
            ;;
        "full")
            # Full status report
            echo "ChittyCheck Status:"
            echo "  Compliance: $score%"
            echo "  Violations: $violations"
            echo "  Warnings: $warnings"
            echo "  Passed: $passed"
            echo "  Issues to fix: $((violations + warnings))"

            if [ ${#critical_violations[@]} -gt 0 ]; then
                echo "  Critical issues:"
                for violation in "${critical_violations[@]}"; do
                    echo "    • $violation"
                done
            fi
            ;;
        *)
            # Default: just the percentage and issue count
            echo "${score}% (${violations}v/${warnings}w)"
            ;;
    esac
}

# If called directly, show full status
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    chittycheck_status "full"
fi