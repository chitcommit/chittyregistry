#!/bin/bash

# ChittyRegistry Cloudflare Deployment Script

set -e

echo "🚀 Deploying ChittyRegistry to Cloudflare Workers..."

# Check if authenticated with Cloudflare
echo "📋 Checking Cloudflare authentication..."
if ! wrangler whoami > /dev/null 2>&1; then
    echo "❌ Not authenticated with Cloudflare. Please run: wrangler login"
    exit 1
fi

# Deploy to production
echo "🌐 Deploying to registry.chitty.cc..."
wrangler deploy --env production

# Test the deployment
echo "🔍 Testing deployment..."
sleep 5

# Test registry.chitty.cc
echo "Testing registry.chitty.cc..."
curl -s https://registry.chitty.cc/health | jq '.status, .service' || echo "⚠️ registry.chitty.cc not responding yet"

# Test chitty.cc/registry
echo "Testing chitty.cc/registry..."
curl -s https://chitty.cc/registry/health | jq '.status, .service' || echo "⚠️ chitty.cc/registry not responding yet"

echo "✅ Cloudflare deployment initiated!"
echo "📊 Endpoints:"
echo "   - https://registry.chitty.cc"
echo "   - https://chitty.cc/registry"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure DNS in Cloudflare dashboard"
echo "   2. Set up KV namespace for persistent storage"
echo "   3. Configure Durable Objects for health monitoring"