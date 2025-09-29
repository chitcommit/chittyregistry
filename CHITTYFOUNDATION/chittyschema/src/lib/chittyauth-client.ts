/**
 * ChittyAuth Client Integration
 * Handles OAuth and API key management for ChittySchema MCP Agent
 */

export interface ChittyAuthConfig {
  authUrl: string;
  clientId: string;
  scope: string[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string[];
}

export class ChittyAuthClient {
  private config: ChittyAuthConfig;
  private token: AuthToken | null = null;

  constructor(config: ChittyAuthConfig) {
    this.config = config;
  }

  /**
   * Initialize authentication with ChittyAuth service
   */
  async authenticate(env: any): Promise<AuthToken> {
    const authUrl = env.CHITTYAUTH_URL || "https://auth.chitty.cc";
    const clientId = env.CHITTYAUTH_CLIENT_ID;
    const clientSecret = env.CHITTYAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("ChittyAuth credentials not configured");
    }

    try {
      const response = await fetch(`${authUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          scope:
            "schema:read schema:write evidence:manage cases:manage mcp:agent",
        }),
      });

      if (!response.ok) {
        throw new Error(`ChittyAuth authentication failed: ${response.status}`);
      }

      const tokenData = await response.json();
      this.token = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope?.split(" ") || [],
      };

      return this.token;
    } catch (error) {
      throw new Error(`ChittyAuth client error: ${error.message}`);
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(env: any): Promise<string> {
    if (!this.token || this.isTokenExpired()) {
      await this.authenticate(env);
    }

    return this.token!.accessToken;
  }

  /**
   * Validate API key with ChittyAuth
   */
  async validateApiKey(apiKey: string, env: any): Promise<boolean> {
    const authUrl = env.CHITTYAUTH_URL || "https://auth.chitty.cc";

    try {
      const response = await fetch(`${authUrl}/api/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.warn("ChittyAuth API key validation failed:", error);
      return false;
    }
  }

  /**
   * Create authenticated request headers
   */
  async createAuthHeaders(env: any): Promise<Record<string, string>> {
    const token = await this.getAccessToken(env);
    return {
      Authorization: `Bearer ${token}`,
      "X-ChittyAuth-Client": "chittyschema-mcp",
      "X-ChittyAuth-Version": "1.0",
    };
  }

  /**
   * Check if current token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.token) return true;
    return Date.now() >= this.token.expiresAt - 30000; // 30 second buffer
  }

  /**
   * Check if user has required scope
   */
  hasScope(requiredScope: string): boolean {
    return this.token?.scope.includes(requiredScope) || false;
  }

  /**
   * Get user info from ChittyAuth
   */
  async getUserInfo(env: any): Promise<any> {
    const authUrl = env.CHITTYAUTH_URL || "https://auth.chitty.cc";
    const headers = await this.createAuthHeaders(env);

    try {
      const response = await fetch(`${authUrl}/api/user/info`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`ChittyAuth user info error: ${error.message}`);
    }
  }
}

/**
 * Authentication middleware for MCP operations
 */
export class MCPAuthMiddleware {
  private authClient: ChittyAuthClient;

  constructor(authClient: ChittyAuthClient) {
    this.authClient = authClient;
  }

  /**
   * Validate MCP request authentication
   */
  async validateRequest(
    request: any,
    env: any,
  ): Promise<{ valid: boolean; user?: any; error?: string }> {
    // Check for API key in headers
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return { valid: false, error: "No authentication provided" };
    }

    // Validate with ChittyAuth
    const isValid = await this.authClient.validateApiKey(apiKey, env);

    if (!isValid) {
      return { valid: false, error: "Invalid API key" };
    }

    // Get user info
    try {
      const user = await this.authClient.getUserInfo(env);
      return { valid: true, user };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check if user has permission for MCP operation
   */
  async checkPermission(
    user: any,
    operation: string,
    resource: string,
  ): Promise<boolean> {
    // Define permission matrix
    const permissions = {
      "schema:read": ["validate-chittyid", "get-status"],
      "schema:write": ["create-case", "create-fact"],
      "evidence:manage": ["ingest-evidence", "analyze-evidence"],
      "cases:manage": ["create-case"],
      "mcp:agent": ["request-chittyid"], // Special permission for ChittyID requests
    };

    // Check if user has required scope
    for (const [scope, operations] of Object.entries(permissions)) {
      if (operations.includes(operation)) {
        return this.authClient.hasScope(scope);
      }
    }

    return false;
  }
}

export default ChittyAuthClient;
