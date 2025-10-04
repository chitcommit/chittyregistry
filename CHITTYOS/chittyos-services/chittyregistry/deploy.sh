#!/bin/bash

# ChittyRegistry Deployment Script

set -e

echo "🚀 Deploying ChittyRegistry..."

# Build the project
echo "📦 Building project..."
npm run build

# Create logs directory
mkdir -p logs

# Deploy to registry.chitty.cc
echo "🌐 Deploying to registry.chitty.cc..."

# Update SERVICE_URL for primary domain
export SERVICE_URL=https://registry.chitty.cc

# Start with PM2 or Docker based on environment
if command -v pm2 &> /dev/null; then
    echo "🔄 Using PM2 for deployment..."
    pm2 delete chittyregistry || true
    pm2 start ecosystem.config.js --env production
    pm2 save
else
    echo "🐳 Using Docker for deployment..."
    docker-compose down || true
    docker-compose up -d --build
fi

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 10

# Health check
echo "🔍 Performing health check..."
curl -f http://localhost:3000/health || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ Deployment to registry.chitty.cc completed successfully!"

# Deploy mirror to chitty.cc/registry
echo "🪞 Setting up mirror at chitty.cc/registry..."

# This would typically involve nginx configuration or reverse proxy setup
# For now, we'll create a deployment note
cat > chitty-cc-registry-setup.md << EOF
# Mirror Setup for chitty.cc/registry

To set up the registry mirror at chitty.cc/registry, configure your reverse proxy (nginx/traefik) with:

\`\`\`nginx
location /registry {
    proxy_pass http://localhost:3000;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;

    # Remove /registry prefix when forwarding
    rewrite ^/registry(.*) \$1 break;
}
\`\`\`

Or with Traefik labels:
\`\`\`yaml
labels:
  - "traefik.http.routers.chittyregistry-mirror.rule=Host(\`chitty.cc\`) && PathPrefix(\`/registry\`)"
  - "traefik.http.middlewares.chittyregistry-stripprefix.stripprefix.prefixes=/registry"
  - "traefik.http.routers.chittyregistry-mirror.middlewares=chittyregistry-stripprefix"
\`\`\`
EOF

echo "📋 Mirror setup instructions created in chitty-cc-registry-setup.md"

# Bootstrap canonical services
echo "🌱 Bootstrapping canonical ChittyOS services..."
sleep 5

# This would require admin authentication in production
# For now, we'll note that it needs to be done manually
echo "⚠️  Manual step required: Bootstrap canonical services by calling:"
echo "   POST /api/v1/bootstrap with admin authentication"

echo "🎉 ChittyRegistry deployment completed!"
echo "📊 Registry available at:"
echo "   - https://registry.chitty.cc"
echo "   - https://chitty.cc/registry (after proxy setup)"
echo ""
echo "📖 API Documentation:"
echo "   - Health: https://registry.chitty.cc/health"
echo "   - Info: https://registry.chitty.cc/info"
echo "   - API: https://registry.chitty.cc/api/v1"