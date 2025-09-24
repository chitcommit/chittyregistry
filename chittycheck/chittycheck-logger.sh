#!/bin/bash

# ChittyCheck Central Logging System
# Reports compliance violations to central registry for systematic tracking

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Central logging configuration
CHITTYCHECK_LOG_DIR="$HOME/.chittyos/compliance-logs"
CHITTYCHECK_CENTRAL_LOG="$CHITTYCHECK_LOG_DIR/central.jsonl"
CHITTYCHECK_REGISTRY_ENDPOINT="${REGISTRY_SERVICE:-https://registry.chitty.cc}/api/v1/compliance"

# Ensure log directory exists
mkdir -p "$CHITTYCHECK_LOG_DIR"

# Function to log compliance results locally and centrally
log_compliance_result() {
    local project_name="$1"
    local project_path="$2"
    local violations="$3"
    local warnings="$4"
    local passed="$5"
    local critical_violations="$6"  # JSON array as string
    local rogue_patterns_detail="$7"  # Detailed pattern analysis

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local session_id="${CLAUDE_SESSION_ID:-$(uuidgen 2>/dev/null || echo 'unknown')}"
    local compliance_score=0
    local total_checks=$((violations + warnings + passed))

    if [ $total_checks -gt 0 ]; then
        compliance_score=$(( (passed * 100) / total_checks ))
    fi

    # Create compliance record
    local compliance_record=$(cat <<EOF
{
    "timestamp": "$timestamp",
    "session_id": "$session_id",
    "project": {
        "name": "$project_name",
        "path": "$project_path"
    },
    "compliance": {
        "score": $compliance_score,
        "violations": $violations,
        "warnings": $warnings,
        "passed": $passed,
        "total_checks": $total_checks,
        "grade": "$(get_compliance_grade $compliance_score)"
    },
    "critical_violations": $critical_violations,
    "rogue_patterns": $rogue_patterns_detail,
    "environment": {
        "framework_version": "${CHITTYOS_FRAMEWORK_VERSION:-1.0.1}",
        "has_token": $([ -n "$CHITTY_ID_TOKEN" ] && [ "$CHITTY_ID_TOKEN" != "YOUR_TOKEN_HERE_REPLACE_ME" ] && echo "true" || echo "false"),
        "git_branch": "$(git branch --show-current 2>/dev/null || echo 'none')"
    },
    "system": {
        "hostname": "$(hostname)",
        "user": "$(whoami)",
        "os": "$(uname -s)",
        "chittyos_account": "${CHITTYOS_ACCOUNT_ID:-unknown}"
    }
}
EOF
)

    # Log locally
    echo "$compliance_record" >> "$CHITTYCHECK_CENTRAL_LOG"

    # Report to central registry (async)
    report_to_registry "$compliance_record" &

    # Generate daily summary if needed
    check_daily_summary

    echo -e "${CYAN}📊 Logged compliance result: ${compliance_score}% (${violations}v/${warnings}w)${RESET}" >&2
}

# Function to get compliance grade
get_compliance_grade() {
    local score=$1
    if [ $score -ge 95 ]; then echo "A+"
    elif [ $score -ge 90 ]; then echo "A"
    elif [ $score -ge 85 ]; then echo "B+"
    elif [ $score -ge 80 ]; then echo "B"
    elif [ $score -ge 75 ]; then echo "C+"
    elif [ $score -ge 70 ]; then echo "C"
    elif [ $score -ge 65 ]; then echo "D"
    else echo "F"
    fi
}

# Function to report to central registry
report_to_registry() {
    local compliance_record="$1"

    if [ -n "$CHITTY_ID_TOKEN" ] && [ "$CHITTY_ID_TOKEN" != "YOUR_TOKEN_HERE_REPLACE_ME" ]; then
        local response=$(curl -s -X POST "$CHITTYCHECK_REGISTRY_ENDPOINT/report" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $CHITTY_ID_TOKEN" \
            -H "X-ChittyOS-Account: $CHITTYOS_ACCOUNT_ID" \
            -d "$compliance_record" 2>/dev/null)

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Reported to central registry${RESET}" >&2
        else
            echo -e "${YELLOW}⚠️  Could not report to registry (offline/unreachable)${RESET}" >&2
        fi
    fi
}

# Function to check if daily summary is needed
check_daily_summary() {
    local today=$(date +"%Y-%m-%d")
    local summary_file="$CHITTYCHECK_LOG_DIR/daily-${today}.json"

    if [ ! -f "$summary_file" ]; then
        generate_daily_summary "$today" > "$summary_file"
    fi
}

# Function to generate daily summary
generate_daily_summary() {
    local date="$1"
    local today_logs=$(grep "\"$date" "$CHITTYCHECK_CENTRAL_LOG" 2>/dev/null)

    if [ -z "$today_logs" ]; then
        echo '{"date":"'$date'","summary":"No compliance checks today"}'
        return
    fi

    local total_checks=$(echo "$today_logs" | wc -l)
    local failed_checks=$(echo "$today_logs" | grep '"violations":[1-9]' | wc -l)
    local avg_score=$(echo "$today_logs" | jq -s 'map(.compliance.score) | add / length' 2>/dev/null || echo "0")

    cat <<EOF
{
    "date": "$date",
    "summary": {
        "total_projects_checked": $total_checks,
        "failed_projects": $failed_checks,
        "average_compliance_score": $avg_score,
        "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    },
    "top_violations": $(echo "$today_logs" | jq -s '[.[].critical_violations[]] | group_by(.) | map({violation: .[0], count: length}) | sort_by(-.count) | .[0:5]' 2>/dev/null || echo '[]')
}
EOF
}

# Function to show compliance trends
show_compliance_trends() {
    echo -e "${CYAN}${BOLD}📊 COMPLIANCE TRENDS${RESET}"
    echo -e "════════════════════════════════════"

    if [ ! -f "$CHITTYCHECK_CENTRAL_LOG" ]; then
        echo "No compliance data available"
        return
    fi

    local total_records=$(wc -l < "$CHITTYCHECK_CENTRAL_LOG")
    local recent_records=$(tail -10 "$CHITTYCHECK_CENTRAL_LOG" | jq -s 'map(.compliance.score) | add / length' 2>/dev/null || echo "0")

    echo "Total compliance checks: $total_records"
    echo "Recent average score: ${recent_records}%"
    echo "Log location: $CHITTYCHECK_CENTRAL_LOG"
    echo ""

    echo "Recent violations by type:"
    tail -20 "$CHITTYCHECK_CENTRAL_LOG" | jq -r '.critical_violations[]?' 2>/dev/null | sort | uniq -c | sort -nr | head -5
    echo ""

    echo "Daily summaries available:"
    ls -1 "$CHITTYCHECK_LOG_DIR"/daily-*.json 2>/dev/null | wc -l | xargs echo
}

# Export functions for use in chittycheck
export -f log_compliance_result
export -f show_compliance_trends

# If called directly, show trends
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "$1" in
        "trends"|"")
            show_compliance_trends
            ;;
        "summary")
            generate_daily_summary "$(date +%Y-%m-%d)"
            ;;
        *)
            echo "Usage: $0 [trends|summary]"
            ;;
    esac
fi