# ChittyOS MCP Integration Architecture

Complete flow: **ChittyAuth** (OAuth/API keys) → **ChittyRouter** (Ultimate Worker) → **MCP Portal** (AI Access)

## Architecture Overview

```
🔐 ChittyAuth           🚦 ChittyRouter               🌐 MCP Portal
(auth.chitty.cc)        (router.chitty.cc)           (portal.chitty.cc) ✅ LIVE
    │                        │                              │
    ├─ OAuth Server          ├─ Ultimate Worker            ├─ MCP Agent Server
    ├─ API Key Management    ├─ Service Discovery          ├─ AI Tool Registry
    ├─ Permission Matrix     ├─ Route Management           ├─ Evidence Tools
    └─ User Management       └─ Load Balancing             └─ ChittyID Tools
```

## Authentication Flow (ChittyAuth)

### 1. OAuth 2.0 + API Keys
```typescript
// Environment Variables
CHITTYAUTH_URL=https://auth.chitty.cc
CHITTYAUTH_CLIENT_ID=chittyschema_mcp_client
CHITTYAUTH_CLIENT_SECRET=***

// Scopes for ChittySchema MCP
const REQUIRED_SCOPES = [
  "schema:read",        // Read schema data
  "schema:write",       // Write schema data
  "evidence:manage",    // Manage evidence
  "cases:manage",       // Manage legal cases
  "mcp:agent"          // Special MCP agent access
];
```

### 2. Token Exchange
```javascript
// Client credentials flow for MCP Agent
POST https://auth.chitty.cc/oauth/token
Authorization: Basic <client_credentials>
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "scope": "schema:read schema:write evidence:manage cases:manage mcp:agent"
}

// Response
{
  "access_token": "chitty_auth_token_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "schema:read schema:write evidence:manage cases:manage mcp:agent"
}
```

### 3. API Key Validation
```javascript
// Validate API keys for direct access
POST https://auth.chitty.cc/api/validate
Authorization: Bearer <api_key>

// Response: 200 OK = valid, 401 = invalid
```

## Routing Flow (ChittyRouter)

### 1. Ultimate Worker Integration
```javascript
// ChittyRouter receives authenticated requests
// routes to appropriate service based on path

// MCP requests route to ChittySchema service
if (pathname.startsWith("/schema")) {
  const schemaService = new ChittySchemaService(env);
  return await schemaService.handleRequest(request, pathname);
}

// MCP Agent portal routes
if (pathname.startsWith("/mcp-schema")) {
  const mcpAgent = new ChittySchemaMCP(env);
  return await mcpAgent.handleMCPRequest(request);
}
```

### 2. Service Discovery & Load Balancing
```javascript
// ChittyRouter automatically discovers ChittySchema service
// Registers at: https://registry.chitty.cc
{
  "service": "chittyschema",
  "version": "2.0.0",
  "endpoints": {
    "mcp": "https://mcp-schema.chitty.cc",
    "api": "https://schema.chitty.cc/api/v1",
    "health": "https://schema.chitty.cc/health"
  },
  "capabilities": [
    "mcp-agent",
    "evidence-management",
    "chittyid-validation",
    "case-management"
  ]
}
```

## MCP Portal Integration

### 1. AI-Accessible Tools
```typescript
// Available MCP tools through ChittyRouter
const MCP_TOOLS = [
  {
    name: "request-chittyid",
    description: "Request ChittyID from Foundation service",
    parameters: {
      namespace: ["PEO", "PLACE", "PROP", "EVNT", "AUTH", "INFO", "FACT", "CONTEXT", "ACTOR"],
      input: "string"
    },
    authentication: "mcp:agent scope required"
  },
  {
    name: "validate-chittyid",
    description: "Validate ChittyID format (blocks CHITTY-* absolutely)",
    parameters: { id: "string" },
    authentication: "schema:read scope required"
  },
  {
    name: "ingest-evidence",
    description: "Service-orchestrated evidence ingestion",
    parameters: {
      filename: "string",
      contentType: "string",
      description: "string",
      caseId: "string?"
    },
    authentication: "evidence:manage scope required"
  },
  {
    name: "create-case",
    description: "Create new legal case",
    parameters: {
      docketNumber: "string",
      jurisdiction: "string",
      title: "string"
    },
    authentication: "cases:manage scope required"
  }
];
```

### 2. Complete Request Flow
```javascript
// 1. AI makes request to live MCP portal
POST https://portal.chitty.cc/schema/tools/ingest-evidence
Authorization: Bearer <chittyauth_api_key>
Content-Type: application/json

{
  "filename": "evidence.pdf",
  "contentType": "application/pdf",
  "description": "Critical evidence document"
}

// 2. ChittyRouter receives request
// 3. ChittyAuth validates API key & permissions
// 4. ChittyRouter routes to ChittySchema MCP Agent
// 5. MCP Agent processes with service orchestration:
//    - Requests ChittyID from Foundation (id.chitty.cc)
//    - Validates with ChittyVerify service
//    - Checks compliance with ChittyCheck service
//    - Stores in database with official format enforcement

// 6. Response back through the chain
{
  "success": true,
  "evidence": {
    "id": "evidence_uuid",
    "chittyId": "CT-A-CHI-0001-T-2401-A-01", // Official format ONLY
    "status": "verified",
    "compliance": "passed"
  }
}
```

## Security & Compliance

### 1. ChittyID Format Enforcement
```typescript
// ABSOLUTE BLOCKING in all layers
if (id.startsWith("CHITTY-")) {
  throw new Error("BLOCKED: CHITTY-* format is prohibited. Use official VV-G-LLL-SSSS-T-YM-C-X format only");
}

// Official format validation
const officialPattern = /^(CP|CL|CT|CE)-[A-Z0-9]-[A-Z0-9]{3}-[0-9]{4}-[PLTE]-[0-9]{4}-[A-Z]-[0-9]{2}$/;
```

### 2. Permission Matrix
| Scope | MCP Tools | Description |
|-------|-----------|-------------|
| `schema:read` | `validate-chittyid`, `get-status` | Read schema data |
| `schema:write` | `create-case`, `create-fact` | Write schema data |
| `evidence:manage` | `ingest-evidence`, `analyze-evidence` | Manage evidence |
| `cases:manage` | `create-case` | Manage legal cases |
| `mcp:agent` | `request-chittyid` | Special ChittyID Foundation access |

### 3. Audit Trail
```javascript
// All MCP operations logged with:
{
  "timestamp": "2024-09-28T23:00:00Z",
  "user": "mcp_agent_user_id",
  "tool": "ingest-evidence",
  "parameters": { "filename": "evidence.pdf" },
  "result": "success",
  "chittyId": "CT-A-CHI-0001-T-2401-A-01",
  "authProvider": "chittyauth",
  "routedThrough": "chittyrouter"
}
```

## Deployment Configuration

### ChittyAuth Environment
```bash
# OAuth Server
OAUTH_ISSUER=https://auth.chitty.cc
CLIENT_REGISTRY_ENCRYPTION_KEY=***
USER_DATABASE_URL=postgresql://...

# API Key Management
API_KEY_ENCRYPTION_KEY=***
API_KEY_ROTATION_INTERVAL=30d
```

### ChittyRouter Environment
```bash
# Service Discovery
CHITTYAUTH_URL=https://auth.chitty.cc
CHITTYSCHEMA_SERVICE_URL=https://schema.chitty.cc
REGISTRY_URL=https://registry.chitty.cc

# MCP Portal - LIVE
MCP_AGENT_ENABLED=true
MCP_PORTAL_URL=https://portal.chitty.cc
MCP_PORTAL_SCHEMA_PATH=/schema
```

### ChittySchema MCP Environment
```bash
# Authentication
CHITTYAUTH_URL=https://auth.chitty.cc
CHITTYAUTH_CLIENT_ID=chittyschema_mcp_client
CHITTYAUTH_CLIENT_SECRET=***

# ChittyID Foundation
CHITTYID_FOUNDATION_URL=https://id.chitty.cc
CHITTY_ID_TOKEN=*** # ChittyCorp LLC Global API Key from 1Password
# 1Password ref: op://Private/gxyne23yqngvk2nzjwl62uakx4/ChittyCorp LLC/global_api_key

# Service Orchestration
CHITTYVERIFY_SERVICE_URL=https://verify.chitty.cc
CHITTYCHECK_SERVICE_URL=https://check.chitty.cc
```

## Account Management

**ChittyCorp LLC Account Details:**
- **Production Account ID**: `bbf9fcd845e78035b7a135c481e88541`
- **Account Email**: `nick@chittycorp.com`
- **Global API Key**: `op://Private/gxyne23yqngvk2nzjwl62uakx4/ChittyCorp LLC/global_api_key`
- **MCP Portal Account ID**: `0bc21e3a5a9de1a4cc843be9c3e98121` (Account 121)

## Summary

**Complete Integration Flow:**
1. **ChittyAuth** manages OAuth tokens and API keys with scope-based permissions
2. **ChittyRouter** routes authenticated requests to appropriate services via Ultimate Worker
3. **MCP Portal** provides AI-accessible tools with proper authentication and format enforcement
4. **Foundation Services** handle ChittyID generation, verification, and compliance
5. **Audit & Compliance** ensures all operations are logged and ChittyID format is enforced

This architecture provides secure, scalable AI access to ChittySchema while maintaining strict ChittyOS compliance and service orchestration patterns under the ChittyCorp LLC organizational umbrella.