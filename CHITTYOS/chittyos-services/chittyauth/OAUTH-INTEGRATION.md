# ChittyAuth OAuth Integration Guide

This document describes the OAuth2 and MCP Portal authentication capabilities added to ChittyAuth MCP Agent, enabling enterprise authentication through Cloudflare Zero Trust and external application integration.

## Overview

ChittyAuth now supports:
- **MCP Portal Authentication** - Cloudflare Zero Trust single sign-on
- **MCP Linked Apps OAuth** - OAuth2 authorization code flow for external applications
- **Token Management** - Validation and lifecycle management for authentication tokens

## MCP Portal Authentication

### Description
Authenticate users through Cloudflare Zero Trust MCP Portal with enterprise-grade access control.

### Tool: `mcp_portal_authenticate`

**Parameters:**
- `cf_access_jwt` (string, required) - Cloudflare Access JWT token from Zero Trust
- `cf_access_email` (string, optional) - Cloudflare Access user email

**Usage:**
```javascript
const result = await mcp.callTool("mcp_portal_authenticate", {
  cf_access_jwt: "eyJhbGciOiJSUzI1NiI...",
  cf_access_email: "user@company.com"
});
```

**Response:**
```javascript
{
  success: true,
  chitty_id: "CHITTY-PEO-USER123-ABC",
  portal_url: "https://portal.chitty.cc/dashboard",
  message: "MCP Portal authentication successful"
}
```

### Integration Steps
1. **Configure Cloudflare Zero Trust** with ChittyAuth as an application
2. **Set up Access Policies** to control who can authenticate
3. **Deploy MCP Portal** with proper domain and certificate
4. **Test Authentication** using the MCP tool

## MCP Linked Apps OAuth

### Description
Standard OAuth2 authorization code flow for linking MCP servers to external applications.

### Tool: `create_linked_app_oauth`

**Parameters:**
- `chitty_id` (string, required) - ChittyID requesting the OAuth flow
- `app_id` (string, required) - Target application identifier
- `redirect_uri` (string, required) - OAuth callback URL for the app
- `scopes` (array, optional) - OAuth scopes to request (default: ["read"])

**Usage:**
```javascript
const result = await mcp.callTool("create_linked_app_oauth", {
  chitty_id: "CHITTY-PEO-USER123-ABC",
  app_id: "external-crm-system",
  redirect_uri: "https://crm.example.com/oauth/callback",
  scopes: ["read", "write", "profile"]
});
```

**Response:**
```javascript
{
  success: true,
  authorization_code: "oauth_code_abcdef123456",
  redirect_uri: "https://crm.example.com/oauth/callback?code=oauth_code_abcdef123456",
  expires_in: 600
}
```

### Tool: `exchange_oauth_tokens`

**Parameters:**
- `authorization_code` (string, required) - OAuth authorization code from previous step
- `client_id` (string, required) - OAuth client ID
- `client_secret` (string, optional) - OAuth client secret
- `grant_type` (string, optional) - OAuth grant type (default: "authorization_code")

**Usage:**
```javascript
const result = await mcp.callTool("exchange_oauth_tokens", {
  authorization_code: "oauth_code_abcdef123456",
  client_id: "external-crm-client-id",
  client_secret: "secret_key_xyz789",
  grant_type: "authorization_code"
});
```

**Response:**
```javascript
{
  success: true,
  access_token: "access_token_uvwxyz...",
  refresh_token: "refresh_token_123abc...",
  token_type: "Bearer",
  expires_in: 3600,
  scope: "read write profile"
}
```

## Token Validation

### Tool: `validate_mcp_token`

**Parameters:**
- `token` (string, required) - MCP token to validate
- `token_type` (enum, required) - Type: "portal", "server", or "linked_app"

**Usage:**
```javascript
const result = await mcp.callTool("validate_mcp_token", {
  token: "portal_token_abc123",
  token_type: "portal"
});
```

**Response:**
```javascript
{
  valid: true,
  chitty_id: "CHITTY-PEO-USER123-ABC",
  token_type: "portal",
  server_id: "mcp-server-001",
  capabilities: ["auth", "data_access"]
}
```

## Complete OAuth Flow Example

### 1. External App Requests Authorization
```javascript
// Step 1: Create OAuth flow
const authFlow = await mcp.callTool("create_linked_app_oauth", {
  chitty_id: "CHITTY-PEO-USER123-ABC",
  app_id: "salesforce-integration",
  redirect_uri: "https://app.example.com/oauth/callback",
  scopes: ["contacts:read", "leads:write"]
});

// Redirect user to: authFlow.redirect_uri
```

### 2. User Authorizes Application
User visits the redirect URI and grants permissions.

### 3. Exchange Code for Tokens
```javascript
// Step 2: Exchange authorization code for tokens
const tokens = await mcp.callTool("exchange_oauth_tokens", {
  authorization_code: authFlow.authorization_code,
  client_id: "salesforce-client-123",
  client_secret: "sf_secret_xyz789"
});

// Store tokens.access_token for API calls
```

### 4. Use Access Token
```javascript
// Step 3: Make authenticated API calls
const apiCall = await fetch("https://api.chitty.cc/v1/contacts", {
  headers: {
    "Authorization": `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json"
  }
});
```

## Security Considerations

### ChittyID Validation
- All OAuth flows require valid ChittyIDs minted from `id.chitty.cc`
- No local ChittyID generation - service fails if ChittyID authority is unavailable
- ChittyID validation happens before any OAuth operations

### Token Security
- JWT tokens use HS256 signing with rotation-capable secrets
- Refresh tokens stored securely with limited lifetime
- All tokens include ChittyID in claims for audit trails

### Cloudflare Zero Trust Integration
- Portal authentication leverages existing Zero Trust policies
- Access control inherits from Cloudflare Access rules
- Session management with automatic cleanup

### State Management
- OAuth flows tracked in persistent MCP state
- Session data encrypted and time-limited
- Automatic cleanup of expired tokens and sessions

## Configuration

### Environment Variables
```bash
# ChittyAuth service URL
CHITTYAUTH_URL=https://auth.chitty.cc

# ChittyID service integration
CHITTYID_SERVICE_URL=https://id.chitty.cc
CHITTYID_API_KEY=your_chittyid_token

# JWT secrets
JWT_SECRET=your_jwt_secret_key

# Session timeout
SESSION_TIMEOUT=3600
```

### MCP Agent Configuration
```json
{
  "name": "ChittyAuth",
  "version": "1.0.0",
  "capabilities": {
    "tools": {
      "count": 11,
      "categories": [
        "mcp_portal_auth",
        "mcp_linked_apps",
        "oauth2_flow",
        "cloudflare_zero_trust"
      ]
    }
  }
}
```

## Error Handling

### Common Errors
- `Invalid ChittyID` - ChittyID not minted from id.chitty.cc
- `OAuth Authorization Failed` - User denied permissions or invalid app_id
- `Token Exchange Failed` - Invalid authorization code or client credentials
- `Invalid MCP Token` - Token expired, malformed, or revoked

### Error Response Format
```javascript
{
  success: false,
  error: "Error message",
  error_description: "Detailed error description",
  error_code: "OAUTH_INVALID_CODE"
}
```

## Testing

### Development Testing
```bash
# Run comprehensive test suite
npm run test:mcp

# Test specific OAuth flows
CHITTY_API_KEY=chitty-dev-token-2025 node test-oauth-flows.js
```

### Production Validation
- Monitor OAuth success/failure rates
- Track token usage and expiration
- Validate ChittyID authority connectivity
- Test Cloudflare Zero Trust integration

## Deployment

### Cloudflare Workers
```bash
# Deploy MCP Agent with OAuth capabilities
npm run deploy:mcp

# Deploy to specific environment
npm run deploy:mcp -- --env production
```

### Health Checks
```bash
# Check MCP Agent health
curl https://auth-mcp.chitty.cc/health

# Validate OAuth endpoints
curl -X POST https://auth.chitty.cc/v1/mcp/portal/authenticate
```

## Integration Examples

### Claude Desktop
```json
{
  "mcpServers": {
    "chittyauth": {
      "command": "node",
      "args": ["path/to/chittyauth/src/mcp-agent.js"],
      "env": {
        "CHITTY_API_KEY": "your-token"
      }
    }
  }
}
```

### External Applications
```javascript
// Express.js integration
app.use('/oauth', chittyAuthOAuthMiddleware({
  chittyAuthUrl: 'https://auth.chitty.cc',
  clientId: 'your-app-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://yourapp.com/oauth/callback'
}));
```

## Support

For issues with OAuth integration:
1. Check ChittyID connectivity: `https://id.chitty.cc/health`
2. Validate Cloudflare Zero Trust policies
3. Review MCP Agent logs for authentication errors
4. Test with development tokens before production deployment

## License

MIT License - ChittyOS Authentication Team