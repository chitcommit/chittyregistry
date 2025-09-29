#!/bin/bash

# Deploy ChittySchema MCP Agent with 1Password Integration
# Uses ChittyCorp LLC Global API Key for ChittyID Foundation service

set -e

echo "🚀 Deploying ChittySchema MCP Agent with 1Password secrets..."

# Check if 1Password CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not found. Install with: brew install 1password-cli"
    exit 1
fi

# Check if signed in to 1Password
if ! op account get &> /dev/null; then
    echo "🔐 Please sign in to 1Password CLI first:"
    echo "   op signin"
    exit 1
fi

# Get the ChittyCorp LLC Global API Key from 1Password
echo "🔑 Retrieving ChittyCorp LLC Global API Key from 1Password..."
CHITTY_ID_TOKEN=$(op read "op://Private/gxyne23yqngvk2nzjwl62uakx4/ChittyCorp LLC/global_api_key")

if [ -z "$CHITTY_ID_TOKEN" ]; then
    echo "❌ Failed to retrieve CHITTY_ID_TOKEN from 1Password"
    exit 1
fi

echo "✅ Successfully retrieved API key from 1Password"

# Set the secret in Wrangler for all environments
echo "🔧 Setting secrets in Cloudflare Workers..."

# Development environment
wrangler secret put CHITTY_ID_TOKEN --env development <<< "$CHITTY_ID_TOKEN"

# Staging environment
wrangler secret put CHITTY_ID_TOKEN --env staging <<< "$CHITTY_ID_TOKEN"

# Production environment
wrangler secret put CHITTY_ID_TOKEN --env production <<< "$CHITTY_ID_TOKEN"

echo "✅ Secrets set successfully for all environments"

# Deploy to staging first
echo "🚀 Deploying to staging environment..."
wrangler deploy --config wrangler.mcp.toml --env staging

echo "✅ Staging deployment complete"

# Ask for production deployment confirmation
read -p "🔴 Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production environment..."
    wrangler deploy --config wrangler.mcp.toml --env production
    echo "✅ Production deployment complete"

    echo "🌐 ChittySchema MCP Agent is now live at:"
    echo "   • Production: https://portal.chitty.cc/schema/"
    echo "   • Staging: https://mcp-schema.chitty.cc/"
else
    echo "⏸️  Production deployment skipped"
fi

echo ""
echo "🎉 ChittySchema MCP Agent deployment complete!"
echo ""
echo "📋 Available MCP Tools:"
echo "   • request-chittyid - ChittyID from Foundation (secure)"
echo "   • validate-chittyid - Format validation (absolute blocking)"
echo "   • ingest-evidence - Service-orchestrated evidence"
echo "   • create-case - Legal case management"
echo "   • create-fact - Atomic fact creation"
echo "   • analyze-evidence - AI-powered analysis"
echo "   • get-status - Session metrics"
echo ""
echo "🔐 Authentication: ChittyAuth (auth.chitty.cc)"
echo "🚦 Routing: ChittyRouter Ultimate Worker"
echo "🆔 ChittyID: Foundation service (id.chitty.cc)"
echo "🔒 Format: VV-G-LLL-SSSS-T-YM-C-X ONLY"