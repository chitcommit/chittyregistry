#!/usr/bin/env tsx
/**
 * Setup script for ChittyGateway dual-access architecture
 * Configures both gateway and direct service endpoints
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ServiceConfig {
  name: string;
  subdomain: string;
  workerName: string;
  gatewayPath: string;
  directAccess: boolean;
  partnerOnly?: boolean;
}

const SERVICES: ServiceConfig[] = [
  {
    name: "Schema Service",
    subdomain: "schema",
    workerName: "chitty-schema",
    gatewayPath: "/api/schema",
    directAccess: true,
  },
  {
    name: "ChittyID Service",
    subdomain: "id",
    workerName: "chitty-id",
    gatewayPath: "/api/id",
    directAccess: true,
  },
  {
    name: "Registry Service",
    subdomain: "registry",
    workerName: "chitty-registry",
    gatewayPath: "/api/registry",
    directAccess: true,
  },
  {
    name: "Ledger Service",
    subdomain: "ledger",
    workerName: "chitty-ledger",
    gatewayPath: "/api/ledger",
    directAccess: true,
  },
  {
    name: "Trust Service",
    subdomain: "trust",
    workerName: "chitty-trust",
    gatewayPath: "/api/trust",
    directAccess: true,
  },
  {
    name: "Verification Service",
    subdomain: "verify",
    workerName: "chitty-verify",
    gatewayPath: "/api/verify",
    directAccess: true,
  },
  {
    name: "Chain Service",
    subdomain: "chain",
    workerName: "chitty-chain",
    gatewayPath: "/api/chain",
    directAccess: true,
    partnerOnly: true, // Only accessible via direct subdomain
  },
];

async function setupDualAccess() {
  console.log("🚀 Setting up ChittyGateway Dual-Access Architecture");
  console.log("====================================================\n");

  // Step 1: Verify Cloudflare CLI
  try {
    execSync("wrangler --version", { stdio: "ignore" });
    console.log("✅ Wrangler CLI found");
  } catch {
    console.error("❌ Wrangler CLI not found. Please install it first:");
    console.error("   npm install -g wrangler");
    process.exit(1);
  }

  // Step 2: Create service configuration files
  console.log("\n📝 Creating service configurations...\n");

  for (const service of SERVICES) {
    if (service.directAccess) {
      await createDirectServiceConfig(service);
    }
  }

  // Step 3: Create gateway routing configuration
  await createGatewayRoutingConfig();

  // Step 4: Create environment configuration
  await createEnvironmentConfig();

  // Step 5: Generate documentation
  await generateAccessDocumentation();

  console.log("\n✅ Dual-access architecture setup complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Review generated configurations in gateway/configs/");
  console.log("2. Deploy services: npm run deploy:all");
  console.log("3. Configure DNS records for all subdomains");
  console.log("4. Test both access patterns");
  console.log("\n🔗 Access Patterns:");
  console.log("   Gateway: https://gateway.chitty.cc/api/*");
  console.log("   Direct:  https://*.chitty.cc/*");
}

async function createDirectServiceConfig(service: ServiceConfig) {
  const configDir = path.join(process.cwd(), "configs", "services");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const config = `# ${service.name} - Direct Access Configuration
name = "${service.workerName}"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Direct subdomain routing
routes = [
  { pattern = "${service.subdomain}.chitty.cc/*", custom_domain = true }
]

[vars]
SERVICE_NAME = "${service.name}"
ACCESS_PATTERN = "direct"
GATEWAY_FORWARD = "${service.partnerOnly ? "false" : "true"}"

# Direct service gets its own KV namespace
[[kv_namespaces]]
binding = "CACHE"
id = "${service.workerName}_cache"

# Service-specific rate limiting
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "${service.subdomain}"
simple = { limit = 1000, period = 60 }
`;

  const filePath = path.join(configDir, `${service.subdomain}.toml`);
  fs.writeFileSync(filePath, config);
  console.log(`   ✅ Created config for ${service.subdomain}.chitty.cc`);
}

async function createGatewayRoutingConfig() {
  const configDir = path.join(process.cwd(), "configs");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const routingConfig = {
    routes: SERVICES.filter((s) => !s.partnerOnly).map((service) => ({
      path: service.gatewayPath,
      target: {
        direct: `https://${service.subdomain}.chitty.cc`,
        internal: service.workerName,
      },
      features: {
        cache: true,
        transform: true,
        auth: "unified",
      },
    })),
    fallback: {
      mode: "proxy",
      target: "direct",
    },
  };

  const filePath = path.join(configDir, "gateway-routing.json");
  fs.writeFileSync(filePath, JSON.stringify(routingConfig, null, 2));
  console.log("\n   ✅ Created gateway routing configuration");
}

async function createEnvironmentConfig() {
  const envTemplate = `# ChittyGateway Dual-Access Environment Configuration

# Gateway Configuration
GATEWAY_URL=https://gateway.chitty.cc
GATEWAY_MODE=dual

# Direct Service URLs (for partner integrations)
SCHEMA_SERVICE_URL=https://schema.chitty.cc
ID_SERVICE_URL=https://id.chitty.cc
REGISTRY_SERVICE_URL=https://registry.chitty.cc
LEDGER_SERVICE_URL=https://ledger.chitty.cc
TRUST_SERVICE_URL=https://trust.chitty.cc
VERIFY_SERVICE_URL=https://verify.chitty.cc
CHAIN_SERVICE_URL=https://chain.chitty.cc

# Access Control
ENABLE_GATEWAY=true
ENABLE_DIRECT=true
PARTNER_API_KEYS=true

# Feature Flags
GATEWAY_CACHING=true
GATEWAY_TRANSFORMATION=true
UNIFIED_AUTH=true
SERVICE_DISCOVERY=true

# Monitoring
ANALYTICS_ENABLED=true
TRACK_ACCESS_PATTERN=true
`;

  const filePath = path.join(process.cwd(), ".env.dual-access");
  fs.writeFileSync(filePath, envTemplate);
  console.log("   ✅ Created environment configuration");
}

async function generateAccessDocumentation() {
  const docs = `# ChittyOS Service Access Guide

## Quick Start

### For General Applications (Use Gateway)
\`\`\`javascript
const client = new ChittyClient({
  endpoint: 'https://gateway.chitty.cc',
  apiKey: 'YOUR_GATEWAY_KEY'
});
\`\`\`

### For Partner Integrations (Use Direct)
\`\`\`javascript
const schemaClient = new SchemaClient({
  endpoint: 'https://schema.chitty.cc',
  apiKey: 'YOUR_SCHEMA_KEY'
});
\`\`\`

## Service Endpoints

| Service | Gateway URL | Direct URL | Partner Only |
|---------|------------|------------|--------------|
${SERVICES.map(
  (s) =>
    `| ${s.name} | gateway.chitty.cc${s.gatewayPath} | ${s.subdomain}.chitty.cc | ${s.partnerOnly ? "Yes" : "No"} |`,
).join("\n")}

## When to Use Each Pattern

### Gateway Access
- Building new applications
- Need unified authentication
- Want automatic failover
- Require request transformation

### Direct Access
- Partner integrations
- High-volume operations
- Custom SLAs required
- Legacy system compatibility

## Authentication

### Gateway Auth Header
\`\`\`
Authorization: Bearer GATEWAY_API_KEY
\`\`\`

### Direct Service Auth Header
\`\`\`
X-Service-API-Key: SERVICE_SPECIFIC_KEY
\`\`\`

## Rate Limits

- **Gateway**: 100 req/min (burstable to 200)
- **Direct**: 1000 req/min (customizable for partners)

## Support

- General: support@chitty.cc
- Partners: partners@chitty.cc
- Emergency: ops@chitty.cc
`;

  const filePath = path.join(process.cwd(), "ACCESS_GUIDE.md");
  fs.writeFileSync(filePath, docs);
  console.log("   ✅ Generated access documentation");
}

// Run the setup
setupDualAccess().catch(console.error);
