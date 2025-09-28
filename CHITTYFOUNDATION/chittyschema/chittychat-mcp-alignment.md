# ChittyChat + MCP Alignment Configuration

## Overview
Aligning ChittyChat traffic control with Claude's Model Context Protocol (MCP) for seamless AI-leveraged project management.

## MCP Server Configuration for ChittyChat

### 1. ChittyChat MCP Server Manifest
```json
{
  "name": "chittychat-mcp",
  "version": "1.0.0",
  "description": "ChittyChat traffic controller for AI project management",
  "author": "ChittyOS Framework",
  "capabilities": {
    "tools": true,
    "resources": true,
    "notifications": true
  },
  "endpoints": {
    "base": "https://sync.chitty.cc",
    "websocket": "wss://sync.chitty.cc/mcp"
  }
}
```

### 2. MCP Tool Definitions for ChittyChat

```typescript
// MCP Tools exposed to Claude
const chittyMCPTools = {
  // Pipeline Management
  "chittychat.pipeline.status": {
    description: "Check pipeline status and health",
    parameters: {
      verbose: { type: "boolean", optional: true }
    }
  },

  // Session Management
  "chittychat.session.fork": {
    description: "Fork current AI session for parallel work",
    parameters: {
      base_session: { type: "string" },
      branch_name: { type: "string" }
    }
  },

  // Duplication Prevention
  "chittychat.validate.unique": {
    description: "Check for duplicates before resource creation",
    parameters: {
      type: { type: "string", enum: ["project", "component", "database"] },
      identifier: { type: "string" }
    }
  },

  // Emergency Protocols
  "chittychat.emergency.check": {
    description: "Check for system contamination or threats",
    parameters: {
      level: { type: "string", enum: ["normal", "warning", "critical"] }
    }
  },

  // 5-Entity System Integration
  "chittychat.entity.register": {
    description: "Register entity in ChittyLedger 5-entity system",
    parameters: {
      entity_type: { type: "string", enum: ["people", "places", "things", "events", "authorities"] },
      chitty_id: { type: "string" },
      data: { type: "object" }
    }
  }
};
```

### 3. Claude MCP Configuration

Add to Claude Desktop settings (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "chittychat": {
      "command": "node",
      "args": ["/Users/nb/.claude/projects/-/chittyschema/mcp-server/chittychat-mcp.js"],
      "env": {
        "CHITTYCHAT_URL": "https://sync.chitty.cc",
        "CHITTYID_URL": "https://id.chitty.cc",
        "CHITTYROUTER_URL": "https://gateway.chitty.cc",
        "NEON_DATABASE_URL": "postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require"
      }
    }
  }
}
```

### 4. MCP Server Implementation

```javascript
// /Users/nb/.claude/projects/-/chittyschema/mcp-server/chittychat-mcp.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const CHITTYCHAT_URL = process.env.CHITTYCHAT_URL || 'https://sync.chitty.cc';

class ChittyChatMCPServer {
  constructor() {
    this.server = new Server({
      name: 'chittychat-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    this.setupTools();
    this.setupResources();
  }

  setupTools() {
    // Pipeline status check
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'pipeline_status',
          description: 'Check ChittyChat pipeline status',
          inputSchema: {
            type: 'object',
            properties: {
              verbose: { type: 'boolean' }
            }
          }
        },
        {
          name: 'validate_unique',
          description: 'Check for duplicates before creation',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              identifier: { type: 'string' }
            },
            required: ['type', 'identifier']
          }
        },
        {
          name: 'entity_register',
          description: 'Register entity in 5-entity system',
          inputSchema: {
            type: 'object',
            properties: {
              entity_type: {
                type: 'string',
                enum: ['people', 'places', 'things', 'events', 'authorities']
              },
              chitty_id: { type: 'string' },
              data: { type: 'object' }
            },
            required: ['entity_type', 'chitty_id', 'data']
          }
        }
      ]
    }));

    // Tool execution handlers
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch(name) {
        case 'pipeline_status':
          return await this.checkPipelineStatus(args);
        case 'validate_unique':
          return await this.validateUnique(args);
        case 'entity_register':
          return await this.registerEntity(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async checkPipelineStatus(args) {
    const response = await fetch(`${CHITTYCHAT_URL}/pipeline/status`);
    const data = await response.json();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  async validateUnique(args) {
    const response = await fetch(`${CHITTYCHAT_URL}/validate/unique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const data = await response.json();
    return {
      content: [{
        type: 'text',
        text: data.is_unique ? '✅ Resource is unique' : '❌ Duplicate detected'
      }]
    };
  }

  async registerEntity(args) {
    // Register with ChittyLedger 5-entity system
    const response = await fetch(`${CHITTYCHAT_URL}/entity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const data = await response.json();
    return {
      content: [{
        type: 'text',
        text: `Entity registered: ${data.chitty_id}`
      }]
    };
  }

  setupResources() {
    this.server.setRequestHandler('resources/list', async () => ({
      resources: [
        {
          uri: 'chittychat://status',
          name: 'ChittyChat System Status',
          mimeType: 'application/json'
        },
        {
          uri: 'chittychat://entities',
          name: '5-Entity System Registry',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;

      if (uri === 'chittychat://status') {
        const response = await fetch(`${CHITTYCHAT_URL}/system/status`);
        const data = await response.json();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ChittyChat MCP Server running');
  }
}

// Start server
const server = new ChittyChatMCPServer();
server.run().catch(console.error);
```

## Usage in Claude

Once configured, you can use ChittyChat commands directly:

```
// Check pipeline status
<use_mcp_tool>
<server_name>chittychat</server_name>
<tool_name>pipeline_status</tool_name>
<arguments>{"verbose": true}</arguments>
</use_mcp_tool>

// Validate uniqueness before creating
<use_mcp_tool>
<server_name>chittychat</server_name>
<tool_name>validate_unique</tool_name>
<arguments>{"type": "project", "identifier": "new-ai-project"}</arguments>
</use_mcp_tool>

// Register entity in 5-entity system
<use_mcp_tool>
<server_name>chittychat</server_name>
<tool_name>entity_register</tool_name>
<arguments>{
  "entity_type": "people",
  "chitty_id": "CHITTY-PEO-ABC123",
  "data": {
    "legal_name": "Test Entity",
    "entity_type": "INDIVIDUAL"
  }
}</arguments>
</use_mcp_tool>
```

## Integration with ChittyLedger

The MCP server connects directly to:
- **Neon Database**: 5-entity system (people, places, things, events, authorities)
- **ChittyRouter**: Traffic control and routing
- **ChittyID**: Deterministic ID generation
- **ChittyChat**: Session and project management

## Emergency Protocols via MCP

```javascript
// Add emergency tools to MCP server
{
  name: 'emergency_stop',
  description: 'Emergency pipeline stop (Code Brown)',
  inputSchema: {
    type: 'object',
    properties: {
      reason: { type: 'string' },
      severity: { type: 'string', enum: ['warning', 'critical', 'brown'] }
    }
  }
}
```

## Next Steps

1. **Install MCP SDK**:
   ```bash
   cd /Users/nb/.claude/projects/-/chittyschema
   npm install @modelcontextprotocol/sdk
   ```

2. **Create MCP server directory**:
   ```bash
   mkdir -p mcp-server
   ```

3. **Deploy MCP server**:
   - Copy the implementation above to `mcp-server/chittychat-mcp.js`
   - Update Claude Desktop config
   - Restart Claude

4. **Test integration**:
   - Use MCP tools in Claude conversations
   - Verify ChittyChat traffic control works
   - Check 5-entity system registration

---

This alignment enables Claude to directly interact with ChittyChat's traffic control system, preventing duplicates, managing AI sessions, and coordinating with the ChittyLedger 5-entity system.