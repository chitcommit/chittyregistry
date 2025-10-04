/**
 * ChittyAuth MCP Agent
 * Provides authentication and authorization tools through MCP protocol
 * Using Cloudflare's stateful MCP Agent API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { AuthorizationService } from "./services/AuthorizationService.js";
import { APIKeyService } from "./services/APIKeyService.js";
import ChittyIDClient from "@chittyos/chittyid-client";

export class ChittyAuthMCP {
  server = new McpServer({
    name: "ChittyAuth",
    version: "1.0.0",
    description:
      "Authentication and authorization service for ChittyOS ecosystem",
  });

  async init() {
    // Initialize services with environment bindings
    this.chittyIDClient = new ChittyIDClient({
      serviceUrl: this.env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: this.env.CHITTYID_API_KEY,
    });
    this.apiKeyService = new APIKeyService(this.env);
    this.authorizationService = new AuthorizationService(this.env);

    // Define authentication tools
    this.defineAuthTools();

    // Initialize state management
    await this.initializeState();
  }

  async initializeState() {
    // Set initial state structure for auth sessions
    const initialState = await this.initialState();
    if (!initialState.sessions) {
      await this.setState({
        sessions: {},
        apiKeys: {},
        activeTokens: [],
      });
    }
  }

  defineAuthTools() {
    // Tool: MCP Portal Authentication
    this.server.tool(
      "mcp_portal_authenticate",
      {
        description:
          "Authenticate user through Cloudflare Zero Trust MCP Portal",
        params: z.object({
          cf_access_jwt: z.string().describe("Cloudflare Access JWT token"),
          cf_access_email: z
            .string()
            .optional()
            .describe("Cloudflare Access user email"),
        }),
      },
      async ({ cf_access_jwt, cf_access_email }) => {
        try {
          // Call the portal authentication endpoint
          const response = await fetch(
            `${this.env.CHITTYAUTH_URL || "https://auth.chitty.cc"}/v1/mcp/portal/authenticate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Cf-Access-Jwt-Assertion": cf_access_jwt,
                "Cf-Access-Authenticated-User-Email": cf_access_email || "",
              },
            },
          );

          const result = await response.json();

          if (result.authenticated) {
            // Store session in MCP state
            await this.updateState({
              [`sessions.${result.chitty_id}`]: {
                type: "mcp_portal",
                chitty_id: result.chitty_id,
                cf_identity: result.cf_identity,
                token: result.portal_token,
                authenticated_at: new Date().toISOString(),
              },
            });
          }

          return {
            success: result.authenticated,
            chitty_id: result.chitty_id,
            portal_url: result.mcp_portal_url,
            message: result.authenticated
              ? "MCP Portal authentication successful"
              : result.error,
          };
        } catch (error) {
          return {
            success: false,
            error: `MCP Portal authentication failed: ${error.message}`,
          };
        }
      },
    );

    // Tool: MCP Linked App OAuth
    this.server.tool(
      "create_linked_app_oauth",
      {
        description:
          "Create OAuth authorization flow for linking MCP to external app",
        params: z.object({
          chitty_id: z.string().describe("ChittyID requesting the OAuth flow"),
          app_id: z.string().describe("Target application identifier"),
          redirect_uri: z.string().describe("OAuth callback URL for the app"),
          scopes: z
            .array(z.string())
            .optional()
            .describe("OAuth scopes to request"),
        }),
      },
      async ({ app_id, chitty_id, redirect_uri, scopes }) => {
        try {
          const response = await fetch(
            `${this.env.CHITTYAUTH_URL || "https://auth.chitty.cc"}/v1/mcp/linked-app/oauth`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ app_id, chitty_id, redirect_uri, scopes }),
            },
          );

          const result = await response.json();

          if (result.authorized) {
            // Store OAuth session in MCP state
            await this.updateState({
              [`oauth_sessions.${result.authorization_code}`]: {
                app_id,
                chitty_id,
                redirect_uri,
                scopes: scopes || ["read"],
                created_at: new Date().toISOString(),
                expires_at: new Date(
                  Date.now() + result.expires_in * 1000,
                ).toISOString(),
              },
            });
          }

          return {
            success: result.authorized,
            authorization_code: result.authorization_code,
            redirect_uri: result.redirect_uri,
            expires_in: result.expires_in,
            message: result.authorized
              ? "OAuth authorization successful"
              : result.error,
          };
        } catch (error) {
          return {
            success: false,
            error: `OAuth authorization failed: ${error.message}`,
          };
        }
      },
    );

    // Tool: OAuth Token Exchange
    this.server.tool(
      "exchange_oauth_tokens",
      {
        description:
          "Exchange OAuth authorization code for access/refresh tokens",
        params: z.object({
          authorization_code: z.string().describe("OAuth authorization code"),
          client_id: z.string().describe("OAuth client ID"),
          client_secret: z.string().optional().describe("OAuth client secret"),
          grant_type: z
            .string()
            .default("authorization_code")
            .describe("OAuth grant type"),
        }),
      },
      async ({ authorization_code, client_id, client_secret, grant_type }) => {
        try {
          const response = await fetch(
            `${this.env.CHITTYAUTH_URL || "https://auth.chitty.cc"}/v1/mcp/linked-app/token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: authorization_code,
                client_id,
                client_secret,
                grant_type,
              }),
            },
          );

          const result = await response.json();

          if (result.access_token) {
            // Store token in MCP state
            await this.updateState({
              [`access_tokens.${result.access_token.substring(0, 10)}`]: {
                client_id,
                token_type: result.token_type,
                expires_in: result.expires_in,
                scope: result.scope,
                created_at: new Date().toISOString(),
              },
            });
          }

          return {
            success: !!result.access_token,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            token_type: result.token_type,
            expires_in: result.expires_in,
            scope: result.scope,
            error: result.error,
            error_description: result.error_description,
          };
        } catch (error) {
          return {
            success: false,
            error: `Token exchange failed: ${error.message}`,
          };
        }
      },
    );

    // Tool: Generate API Key
    this.server.tool(
      "generate_api_key",
      {
        description: "Generate a new API key with ChittyID validation",
        params: z.object({
          chitty_id: z.string().describe("ChittyID requesting the API key"),
          name: z.string().optional().describe("Name for the API key"),
          scopes: z
            .array(z.string())
            .optional()
            .describe("Permission scopes for the key"),
        }),
      },
      async ({ chitty_id, name, scopes }) => {
        try {
          // Verify ChittyID with actual ChittyID service
          const validationResult =
            await this.chittyIDClient.validate(chitty_id);
          if (!validationResult.valid) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Invalid ChittyID. Must be minted from id.chitty.cc",
                },
              ],
            };
          }

          // Check permission to generate keys
          const hasPermission = await this.authorizationService.hasPermission(
            chitty_id,
            "api_keys:generate",
          );

          if (!hasPermission) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Insufficient permissions to generate API keys",
                },
              ],
            };
          }

          // Generate actual API key
          const apiKey = await this.apiKeyService.generateKey({
            chitty_id,
            name: name || "MCP Generated Key",
            scopes: scopes || ["read"],
          });

          // Store in state for session tracking
          const state = await this.state();
          state.apiKeys[apiKey.id] = {
            chitty_id,
            created_at: apiKey.created_at,
            scopes,
          };
          await this.setState(state);

          return {
            content: [
              {
                type: "text",
                text: `✅ API Key Generated\n\nKey ID: ${apiKey.id}\nAPI Key: ${apiKey.key}\nChittyID: ${chitty_id}\nScopes: ${scopes?.join(", ") || "read"}\nCreated: ${apiKey.created_at}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error generating API key: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: Validate API Key
    this.server.tool(
      "validate_api_key",
      {
        description: "Validate an API key and return its metadata",
        params: z.object({
          api_key: z.string().describe("API key to validate"),
        }),
      },
      async ({ api_key }) => {
        try {
          const validation = await this.apiKeyService.validateKey(api_key);

          if (!validation.valid) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Invalid API Key\n\nReason: ${validation.reason || "Key not found or expired"}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `✅ Valid API Key\n\nKey ID: ${validation.key_id}\nChittyID: ${validation.chitty_id}\nScopes: ${validation.scopes.join(", ")}\nCreated: ${validation.created_at}\nExpires: ${validation.expires_at || "Never"}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error validating API key: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: Check Permission
    this.server.tool(
      "check_permission",
      {
        description: "Check if a ChittyID has permission for a specific action",
        params: z.object({
          chitty_id: z.string().describe("ChittyID to check"),
          permission: z
            .string()
            .describe("Permission to verify (e.g., 'api_keys:generate')"),
          resource: z
            .string()
            .optional()
            .describe("Optional resource identifier"),
        }),
      },
      async ({ chitty_id, permission, resource }) => {
        try {
          const hasPermission = await this.authorizationService.hasPermission(
            chitty_id,
            permission,
            resource,
          );

          return {
            content: [
              {
                type: "text",
                text: hasPermission
                  ? `✅ Permission Granted\n\nChittyID: ${chitty_id}\nPermission: ${permission}${resource ? `\nResource: ${resource}` : ""}`
                  : `❌ Permission Denied\n\nChittyID: ${chitty_id}\nPermission: ${permission}${resource ? `\nResource: ${resource}` : ""}\n\nInsufficient privileges for this operation`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error checking permission: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: Generate JWT Token
    this.server.tool(
      "generate_jwt",
      {
        description: "Generate a JWT token for authentication",
        params: z.object({
          chitty_id: z.string().describe("ChittyID for the token"),
          expires_in: z
            .string()
            .optional()
            .describe("Expiration time (e.g., '1h', '24h')"),
          claims: z
            .object({})
            .optional()
            .describe("Additional claims for the token"),
        }),
      },
      async ({ chitty_id, expires_in = "1h", claims = {} }) => {
        try {
          // Verify ChittyID first
          const validationResult =
            await this.chittyIDClient.validate(chitty_id);
          if (!validationResult.valid) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Invalid ChittyID. Must be minted from id.chitty.cc",
                },
              ],
            };
          }

          // Generate JWT with real secret from environment
          const secret = new TextEncoder().encode(this.env.JWT_SECRET);
          const jwt = await new SignJWT({
            chitty_id,
            ...claims,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(expires_in)
            .setIssuer("chittyauth.chitty.cc")
            .sign(secret);

          // Track in state
          const state = await this.state();
          state.activeTokens.push({
            chitty_id,
            issued_at: new Date().toISOString(),
            expires_in,
          });
          await this.setState(state);

          return {
            content: [
              {
                type: "text",
                text: `✅ JWT Token Generated\n\nToken: ${jwt}\n\nChittyID: ${chitty_id}\nExpires In: ${expires_in}\nIssuer: chittyauth.chitty.cc`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error generating JWT: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: Validate JWT Token
    this.server.tool(
      "validate_jwt",
      {
        description: "Validate and decode a JWT token",
        params: z.object({
          token: z.string().describe("JWT token to validate"),
        }),
      },
      async ({ token }) => {
        try {
          const secret = new TextEncoder().encode(this.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret, {
            issuer: "chittyauth.chitty.cc",
          });

          return {
            content: [
              {
                type: "text",
                text: `✅ Valid JWT Token\n\nChittyID: ${payload.chitty_id}\nIssued At: ${new Date(payload.iat * 1000).toISOString()}\nExpires At: ${new Date(payload.exp * 1000).toISOString()}\nIssuer: ${payload.iss}\n\nClaims: ${JSON.stringify(payload, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Invalid JWT Token\n\nError: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: Grant Authorization
    this.server.tool(
      "grant_authorization",
      {
        description: "Grant a permission to a ChittyID",
        params: z.object({
          grantor_chitty_id: z
            .string()
            .describe("ChittyID granting the permission"),
          grantee_chitty_id: z
            .string()
            .describe("ChittyID receiving the permission"),
          permission: z.string().describe("Permission to grant"),
          resource: z
            .string()
            .optional()
            .describe("Optional resource identifier"),
          expires_at: z
            .string()
            .optional()
            .describe("Optional expiration date (ISO string)"),
        }),
      },
      async ({
        grantor_chitty_id,
        grantee_chitty_id,
        permission,
        resource,
        expires_at,
      }) => {
        try {
          // Verify grantor has permission to grant
          const canGrant = await this.authorizationService.hasPermission(
            grantor_chitty_id,
            "authorizations:grant",
          );

          if (!canGrant) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Grantor lacks permission to grant authorizations",
                },
              ],
            };
          }

          // Grant the authorization
          const result = await this.authorizationService.grantPermission({
            grantor: grantor_chitty_id,
            grantee: grantee_chitty_id,
            permission,
            resource,
            expires_at,
          });

          return {
            content: [
              {
                type: "text",
                text: `✅ Authorization Granted\n\nGrantor: ${grantor_chitty_id}\nGrantee: ${grantee_chitty_id}\nPermission: ${permission}${resource ? `\nResource: ${resource}` : ""}${expires_at ? `\nExpires: ${expires_at}` : ""}\nAuthorization ID: ${result.authorization_id}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error granting authorization: ${error.message}`,
              },
            ],
          };
        }
      },
    );

    // Tool: List Active Sessions
    this.server.tool(
      "list_sessions",
      {
        description: "List active authentication sessions",
        params: z.object({
          chitty_id: z.string().optional().describe("Filter by ChittyID"),
        }),
      },
      async ({ chitty_id }) => {
        try {
          const state = await this.state();
          let sessions = Object.entries(state.sessions || {});

          if (chitty_id) {
            sessions = sessions.filter(
              ([_, session]) => session.chitty_id === chitty_id,
            );
          }

          if (sessions.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No active sessions found",
                },
              ],
            };
          }

          const sessionList = sessions
            .map(
              ([id, session]) =>
                `Session ID: ${id}\nChittyID: ${session.chitty_id}\nCreated: ${session.created_at}`,
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: `📊 Active Sessions (${sessions.length}):\n\n${sessionList}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing sessions: ${error.message}`,
              },
            ],
          };
        }
      },
    );
  }

  // Add missing methods for state management
  async setState(newState) {
    // Mock state management for testing
    this.currentState = { ...this.currentState, ...newState };
  }

  async state() {
    return this.currentState || {};
  }

  async updateState(updates) {
    const currentState = await this.state();
    await this.setState({ ...currentState, ...updates });
  }

  async initialState() {
    return this.currentState || {};
  }
}

// Export default for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    const agent = new ChittyAuthMCP();
    agent.env = env;
    agent.ctx = ctx;
    await agent.init();

    // Handle MCP protocol over WebSocket
    if (request.headers.get("Upgrade") === "websocket") {
      return agent.handleWebSocket(request);
    }

    // Handle HTTP requests for health check
    if (new URL(request.url).pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "ChittyAuth MCP Agent",
          version: "1.0.0",
          account: "0bc21e3a5a9de1a4cc843be9c3e98121",
          capabilities: [
            "generate_api_key",
            "validate_api_key",
            "check_permission",
            "generate_jwt",
            "validate_jwt",
            "grant_authorization",
            "list_sessions",
            "mcp_portal_authenticate",
            "create_linked_app_oauth",
            "exchange_oauth_tokens",
            "validate_mcp_token",
          ],
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response("ChittyAuth MCP Agent - Connect via MCP protocol", {
      status: 200,
    });
  },
};
