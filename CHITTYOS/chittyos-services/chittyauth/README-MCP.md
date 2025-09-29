# ChittyAuth MCP Agent

A **real authentication service** for the ChittyOS ecosystem, implemented as a stateful MCP (Model Context Protocol) Agent with **complete OAuth2 and Portal integration** for cross-synced MCPs in Cloudflare account 121.

## Overview

ChittyAuth MCP Agent provides **genuine authentication and authorization** capabilities through MCP tools, not simulation. It integrates with:

- **ChittyID Service** - Validates real ChittyIDs from `id.chitty.cc`
- **JWT Token Management** - Generates and validates real JWT tokens
- **API Key Generation** - Creates authenticated API keys with permissions
- **Authorization System** - Real permission checking and granting
- **Session Management** - Stateful session tracking with persistence

## Features

### 🔐 Authentication Tools

1. **`generate_api_key`** - Generate API keys with ChittyID validation
2. **`validate_api_key`** - Validate existing API keys
3. **`generate_jwt`** - Create JWT tokens with custom claims
4. **`validate_jwt`** - Verify and decode JWT tokens

### 🛡️ Authorization Tools

5. **`check_permission`** - Verify ChittyID permissions
6. **`grant_authorization`** - Grant permissions to ChittyIDs
7. **`list_sessions`** - View active authentication sessions

### 💾 Stateful Capabilities

- **Persistent State** - Uses Cloudflare D1 database for state management
- **Session Tracking** - Maintains authentication sessions across connections
- **Token Cleanup** - Automatic cleanup of expired tokens
- **WebSocket Support** - Real-time MCP protocol over WebSocket

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ChittyAuth MCP Agent                        │
├─────────────────────────────────────────────────────────────┤
│  MCP Tools:                                                 │
│  • generate_api_key     • validate_api_key                  │
│  • generate_jwt         • validate_jwt                      │
│  • check_permission     • grant_authorization               │
│  • list_sessions                                            │
├─────────────────────────────────────────────────────────────┤
│  Real Services Integration:                                 │
│  • ChittyID Client   • API Key Service                     │
│  • Authorization     • JWT Management                      │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare Infrastructure:                                 │
│  • D1 Database       • KV Storage                          │
│  • Durable Objects   • WebSocket Support                   │
└─────────────────────────────────────────────────────────────┘
```

## Deployment

### Prerequisites

- Cloudflare Workers account
- D1 Database for state persistence
- KV Namespaces for session/token storage
- ChittyOS service bindings (ChittyID, Registry)

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev:mcp

# Run tests
npm run test:mcp
```

### Production Deployment

```bash
# Build for production
npm run build:mcp

# Deploy to Cloudflare
npm run deploy:mcp
```

## Configuration

### Environment Variables

```toml
# wrangler-mcp.toml
[env.production.vars]
ENVIRONMENT = "production"
CHITTYID_ENDPOINT = "https://id.chitty.cc"
REGISTRY_ENDPOINT = "https://registry.chitty.cc"
JWT_SECRET = "your-production-jwt-secret"
SESSION_TIMEOUT = "3600"
```

### Service Bindings

```toml
[[services]]
binding = "CHITTYID_SERVICE"
service = "chittyid"

[[services]]
binding = "REGISTRY_SERVICE"
service = "chittyregistry"
```

## Usage Examples

### Connect to MCP Agent

```javascript
// Using MCP SDK
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client(
  {
    name: "chittyauth-client",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Connect via WebSocket
await client.connect("wss://auth-mcp.chitty.cc");
```

### Generate API Key

```javascript
const result = await client.request(
  {
    method: "tools/call",
    params: {
      name: "generate_api_key",
      arguments: {
        chitty_id: "CHITTY-PEO-USER123-ABC",
        name: "My Application Key",
        scopes: ["read", "write"]
      }
    }
  }
);

console.log(result.content[0].text);
// ✅ API Key Generated
// Key ID: key_1234567890
// API Key: chitty_abcdef123456...
```

### Check Permissions

```javascript
const permissionCheck = await client.request(
  {
    method: "tools/call",
    params: {
      name: "check_permission",
      arguments: {
        chitty_id: "CHITTY-PEO-USER123-ABC",
        permission: "api_keys:generate"
      }
    }
  }
);
```

### Generate JWT Token

```javascript
const token = await client.request(
  {
    method: "tools/call",
    params: {
      name: "generate_jwt",
      arguments: {
        chitty_id: "CHITTY-PEO-USER123-ABC",
        expires_in: "24h",
        claims: {
          role: "user",
          permissions: ["read", "write"]
        }
      }
    }
  }
);
```

## Key Differences from Traditional Auth

### ✅ What This Provides (Real)

- **Real ChittyID validation** via `id.chitty.cc` service
- **Actual JWT tokens** with cryptographic signatures
- **Persistent API keys** stored in KV/D1 database
- **Real permission system** with granular access control
- **Stateful sessions** that persist across connections
- **Blockchain integration** for audit trails

### ❌ What This Doesn't Do (No Simulation)

- ❌ No mock ChittyID generation
- ❌ No simulated authentication responses
- ❌ No fake permission systems
- ❌ No hardcoded API keys
- ❌ No local state that disappears

## Security Features

- **ChittyID Authority Enforcement** - All IDs must be from `id.chitty.cc`
- **JWT Cryptographic Security** - Real HS256 signed tokens
- **Permission-Based Access Control** - Granular authorization system
- **Session Tracking** - Monitor active authentication sessions
- **Automatic Cleanup** - Expired tokens removed automatically
- **Audit Trails** - All auth operations logged for compliance

## Integration with ChittyMCP

This MCP Agent can be used alongside ChittyMCP to provide real authentication:

```javascript
// In ChittyMCP, validate tokens via ChittyAuth MCP Agent
const authValidation = await chittyAuthMCP.callTool("validate_api_key", {
  api_key: request.headers.authorization?.replace("Bearer ", "")
});

if (!authValidation.content[0].text.includes("✅ Valid API Key")) {
  throw new Error("Invalid authentication");
}
```

## Testing

The test suite validates all authentication flows:

```bash
npm run test:mcp
```

Tests cover:
- ✅ API key generation with ChittyID validation
- ✅ Permission checking and authorization
- ✅ JWT token generation and validation
- ✅ Session management and cleanup
- ✅ Error handling for invalid requests

## Production Readiness

- **Stateful Architecture** - Uses Cloudflare's stateful MCP Agent API
- **Real Service Integration** - Connects to actual ChittyOS services
- **Scalable Infrastructure** - Leverages Cloudflare Workers platform
- **Monitoring & Health Checks** - Built-in observability
- **Error Handling** - Comprehensive error responses
- **Performance Optimized** - WebSocket hibernation and efficient state

## License

MIT License - ChittyOS Team