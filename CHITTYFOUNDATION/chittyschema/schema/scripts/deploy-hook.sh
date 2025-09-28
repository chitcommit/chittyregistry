#!/bin/bash
#
# ChittyChain Schema Deploy Hook
# Automated deployment script triggered by GitHub Actions
# Handles schema.chitty.cc updates and service deployments
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYMENT_ID=$(date +%s)

# Environment variables with defaults
ENVIRONMENT="${ENVIRONMENT:-production}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
SCHEMA_API_URL="${SCHEMA_API_URL:-https://schema.chitty.cc/api}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
DRY_RUN="${DRY_RUN:-false}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check prerequisites
check_prerequisites() {
    log_info "🔍 Checking prerequisites..."

    local missing_tools=()

    if ! command -v node >/dev/null 2>&1; then
        missing_tools+=("node")
    fi

    if ! command -v npm >/dev/null 2>&1; then
        missing_tools+=("npm")
    fi

    if ! command -v curl >/dev/null 2>&1; then
        missing_tools+=("curl")
    fi

    if ! command -v jq >/dev/null 2>&1; then
        missing_tools+=("jq")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi

    # Check for Wrangler if deploying to Cloudflare
    if [[ "$ENVIRONMENT" == "production" ]] && ! command -v wrangler >/dev/null 2>&1; then
        log_warning "Wrangler not found, installing..."
        npm install -g wrangler
    fi

    log_success "Prerequisites check passed"
}

# Validate environment
validate_environment() {
    log_info "🔧 Validating environment configuration..."

    local missing_vars=()

    if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
        missing_vars+=("CLOUDFLARE_API_TOKEN")
    fi

    if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
        missing_vars+=("CLOUDFLARE_ACCOUNT_ID")
    fi

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi

    # Test Cloudflare authentication
    if ! wrangler whoami >/dev/null 2>&1; then
        log_error "Cloudflare authentication failed"
        log_info "Please check your CLOUDFLARE_API_TOKEN"
        exit 1
    fi

    log_success "Environment validation passed"
}

# Generate schema exports
generate_exports() {
    log_info "📦 Generating schema exports..."

    cd "$PROJECT_DIR"

    # Run the schema export script
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would run schema export"
        mkdir -p dist/sql dist/json dist/notion dist/docs
        touch dist/manifest.json
    else
        node scripts/schema-export.js \
            --outputDir "dist" \
            --apiUrl "$SCHEMA_API_URL" \
            --apiKey "${SCHEMA_API_KEY:-}" \
            --schemaFile "chittychain-production-schema.sql" \
            --notionFile "notion-database-templates.md"
    fi

    log_success "Schema exports generated"
}

# Deploy API worker
deploy_api() {
    log_info "🚀 Deploying Schema API..."

    cd "$PROJECT_DIR/workers/schema-api"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy API worker"
        return 0
    fi

    # Install dependencies
    if [[ ! -d "node_modules" ]] || [[ "package-lock.json" -nt "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci
    fi

    # Run type checking and linting
    log_info "Running quality checks..."
    npm run type-check
    npm run lint

    # Deploy to Cloudflare
    log_info "Deploying to Cloudflare Workers..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        wrangler deploy --env production
    else
        wrangler deploy --env development
    fi

    log_success "API deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log_info "🎨 Deploying Frontend..."

    cd "$PROJECT_DIR/frontend"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy frontend"
        return 0
    fi

    # Install dependencies
    if [[ ! -d "node_modules" ]] || [[ "package-lock.json" -nt "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci
    fi

    # Build the application
    log_info "Building frontend..."
    npm run build

    # Deploy to Cloudflare Pages
    log_info "Deploying to Cloudflare Pages..."
    npx @cloudflare/next-on-pages

    if [[ "$ENVIRONMENT" == "production" ]]; then
        npx wrangler pages deploy .vercel/output/static \
            --project-name chittychain-schema \
            --compatibility-date 2024-04-05
    else
        npx wrangler pages deploy .vercel/output/static \
            --project-name chittychain-schema-dev \
            --compatibility-date 2024-04-05
    fi

    log_success "Frontend deployed successfully"
}

# Update KV storage with templates
update_templates() {
    log_info "🗄️ Updating template storage..."

    cd "$PROJECT_DIR"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would update KV templates"
        return 0
    fi

    # Upload generated templates to KV
    if [[ -d "dist/notion" ]]; then
        for template_file in dist/notion/*.json; do
            if [[ -f "$template_file" ]]; then
                template_name=$(basename "$template_file" .json)
                template_key="notion:${template_name#notion-}"

                log_info "Uploading template: $template_key"
                wrangler kv:key put \
                    --binding SCHEMA_TEMPLATES \
                    "$template_key" \
                    --path "$template_file"
            fi
        done
    fi

    # Upload SQL schemas
    if [[ -d "dist/sql" ]]; then
        for sql_file in dist/sql/*.sql; do
            if [[ -f "$sql_file" ]]; then
                schema_name=$(basename "$sql_file" .sql)
                schema_key="sql:${schema_name#chittychain-}"

                log_info "Uploading schema: $schema_key"
                wrangler kv:key put \
                    --binding SCHEMA_TEMPLATES \
                    "$schema_key" \
                    --path "$sql_file"
            fi
        done
    fi

    log_success "Templates updated successfully"
}

# Health check deployed services
health_check() {
    log_info "🏥 Running health checks..."

    local api_health="false"
    local frontend_health="false"

    # Check API health
    if curl -sf "$SCHEMA_API_URL/health" >/dev/null 2>&1; then
        api_health="true"
        log_success "API health check passed"
    else
        log_error "API health check failed"
    fi

    # Check frontend health
    if curl -sf "https://schema.chitty.cc" >/dev/null 2>&1; then
        frontend_health="true"
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
    fi

    # Overall status
    if [[ "$api_health" == "true" && "$frontend_health" == "true" ]]; then
        log_success "All services healthy"
        return 0
    else
        log_error "Some services unhealthy"
        return 1
    fi
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"

    log_info "📢 Sending notifications..."

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$status" != "success" ]] && color="danger"

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d '{
                "text": "ChittyChain Schema Deployment",
                "attachments": [
                    {
                        "color": "'"$color"'",
                        "title": "'"$message"'",
                        "fields": [
                            {
                                "title": "Environment",
                                "value": "'"$ENVIRONMENT"'",
                                "short": true
                            },
                            {
                                "title": "Deployment ID",
                                "value": "'"$DEPLOYMENT_ID"'",
                                "short": true
                            },
                            {
                                "title": "Timestamp",
                                "value": "'"$TIMESTAMP"'",
                                "short": false
                            }
                        ]
                    }
                ]
            }' \
            --silent --show-error
    fi

    # Discord notification
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        local color=3066993  # Green
        [[ "$status" != "success" ]] && color=15158332  # Red

        curl -X POST "$DISCORD_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d '{
                "embeds": [
                    {
                        "title": "ChittyChain Schema Deployment",
                        "description": "'"$message"'",
                        "color": '"$color"',
                        "fields": [
                            {
                                "name": "Environment",
                                "value": "'"$ENVIRONMENT"'",
                                "inline": true
                            },
                            {
                                "name": "Status",
                                "value": "'"$status"'",
                                "inline": true
                            }
                        ],
                        "timestamp": "'"$TIMESTAMP"'"
                    }
                ]
            }' \
            --silent --show-error
    fi

    log_success "Notifications sent"
}

# Cleanup function
cleanup() {
    log_info "🧹 Cleaning up..."

    # Remove temporary files
    rm -rf "$PROJECT_DIR/dist/temp" || true

    # Clear npm cache if needed
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm cache clean --force || true
    fi

    log_success "Cleanup completed"
}

# Rollback function
rollback() {
    log_error "🔄 Starting rollback procedure..."

    # This would implement rollback logic
    # For now, just log what would be done
    log_info "Would rollback to previous deployment"
    log_info "Would restore previous KV values"
    log_info "Would notify of rollback completion"

    send_notifications "rollback" "Deployment rolled back due to failure"
}

# Main deployment function
main() {
    log_info "🎯 Starting ChittyChain Schema Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Deployment ID: $DEPLOYMENT_ID"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi

    local deployment_success="false"

    # Set up error handling
    trap 'rollback; exit 1' ERR

    # Run deployment steps
    check_prerequisites
    validate_environment
    generate_exports
    deploy_api
    deploy_frontend
    update_templates

    # Health checks
    if health_check; then
        deployment_success="true"
        log_success "🎉 Deployment completed successfully!"
        send_notifications "success" "Schema deployed successfully to $ENVIRONMENT"
    else
        log_error "❌ Deployment failed health checks"
        send_notifications "failure" "Deployment failed health checks"
        exit 1
    fi

    cleanup

    # Final summary
    echo
    log_info "📊 Deployment Summary"
    log_info "Status: $([ "$deployment_success" == "true" ] && echo "SUCCESS" || echo "FAILED")"
    log_info "Environment: $ENVIRONMENT"
    log_info "API URL: $SCHEMA_API_URL"
    log_info "Frontend URL: https://schema.chitty.cc"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Duration: $(($(date +%s) - DEPLOYMENT_ID)) seconds"
    echo
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--dry-run] [--environment ENV] [--help]"
                echo ""
                echo "Options:"
                echo "  --dry-run          Run without making actual changes"
                echo "  --environment ENV  Set deployment environment (default: production)"
                echo "  --help            Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  CLOUDFLARE_API_TOKEN    Cloudflare API token (required)"
                echo "  CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID (required)"
                echo "  SCHEMA_API_URL          Schema API base URL"
                echo "  SLACK_WEBHOOK_URL       Slack webhook for notifications"
                echo "  DISCORD_WEBHOOK_URL     Discord webhook for notifications"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    main "$@"
fi