/**
 * ChittyAuth Service - Zero Trust Authentication and Authorization for ChittyOS
 *
 * Responsibilities:
 * - Zero Trust user authentication for all ChittyOS apps
 * - MCP (Model Context Protocol) server authentication
 * - Session management across the ecosystem
 * - Generate API keys (with ChittyID validation)
 * - Manage authorizations (who can access what)
 * - Validate API requests and JWT tokens
 * - Cloudflare Zero Trust integration
 * - OAuth/SSO integration
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { SignJWT, jwtVerify } from "jose";
import { AuthorizationService } from "./services/AuthorizationService.js";
import { APIKeyService } from "./services/APIKeyService.js";
import { RegistryClient } from "./services/RegistryClient.js";
import ChittyIDClient from "@chittyos/chittyid-client";

const app = new Hono();

// Apply CORS
app.use("*", cors());

// Health endpoint (public)
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "ChittyAuth",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Key Generation endpoint
app.post("/v1/api-keys/generate", async (c) => {
  const env = c.env;
  const { chitty_id, name, scopes } = await c.req.json();

  try {
    // Initialize services
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    const apiKeyService = new APIKeyService(env);
    const authorizationService = new AuthorizationService(env);

    // 1. Verify ChittyID with ChittyID service
    const validationResult = await chittyIDClient.validate(chitty_id);
    if (!validationResult.valid) {
      return c.json(
        {
          success: false,
          error: "Invalid ChittyID",
        },
        401,
      );
    }

    // 2. Check if requestor has permission to generate keys
    const canGenerateKeys = await authorizationService.hasPermission(
      chitty_id,
      "api_keys:generate",
    );

    if (!canGenerateKeys) {
      return c.json(
        {
          success: false,
          error: "Insufficient permissions to generate API keys",
        },
        403,
      );
    }

    // 3. Generate API key
    const apiKey = await apiKeyService.generateKey({
      chitty_id,
      name: name || "API Key",
      scopes: scopes || ["read"],
    });

    return c.json({
      success: true,
      api_key: apiKey.key,
      key_id: apiKey.id,
      created_at: apiKey.created_at,
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate API key",
      },
      500,
    );
  }
});

// Validate API key endpoint
app.post("/v1/api-keys/validate", async (c) => {
  const env = c.env;
  const { api_key } = await c.req.json();

  try {
    const apiKeyService = new APIKeyService(env);
    const validation = await apiKeyService.validateKey(api_key);

    if (!validation.valid) {
      return c.json(
        {
          valid: false,
          error: validation.error,
        },
        401,
      );
    }

    return c.json({
      valid: true,
      chitty_id: validation.chitty_id,
      scopes: validation.scopes,
      created_at: validation.created_at,
    });
  } catch (error) {
    console.error("Error validating API key:", error);
    return c.json(
      {
        valid: false,
        error: "Validation failed",
      },
      500,
    );
  }
});

// Grant authorization endpoint
app.post("/v1/authorizations/grant", async (c) => {
  const env = c.env;
  const { requestor_chitty_id, target_resource, permissions, granted_by } =
    await c.req.json();

  try {
    // Initialize services
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    const authorizationService = new AuthorizationService(env);
    const registryClient = new RegistryClient(env);

    // 1. Verify both ChittyIDs
    const [isValidRequestor, isValidGrantor] = await Promise.all([
      chittyIDClient.validate(requestor_chitty_id).then((r) => r.valid),
      chittyIDClient.validate(granted_by).then((r) => r.valid),
    ]);

    if (!isValidRequestor || !isValidGrantor) {
      return c.json(
        {
          success: false,
          error: "Invalid ChittyID",
        },
        401,
      );
    }

    // 2. Verify resource exists in Registry
    const resourceExists = await registryClient.resourceExists(target_resource);
    if (!resourceExists) {
      return c.json(
        {
          success: false,
          error: "Resource not found in registry",
        },
        404,
      );
    }

    // 3. Check if grantor has permission to grant access
    const canGrant = await authorizationService.hasPermission(
      granted_by,
      `grant:${target_resource}`,
    );

    if (!canGrant) {
      return c.json(
        {
          success: false,
          error: "Insufficient permissions to grant access",
        },
        403,
      );
    }

    // 4. Grant the authorization
    const authorization = await authorizationService.grantAccess({
      chitty_id: requestor_chitty_id,
      resource: target_resource,
      permissions: permissions || ["read"],
      granted_by,
      granted_at: new Date().toISOString(),
    });

    return c.json({
      success: true,
      authorization,
    });
  } catch (error) {
    console.error("Error granting authorization:", error);
    return c.json(
      {
        success: false,
        error: "Failed to grant authorization",
      },
      500,
    );
  }
});

// Check authorization endpoint
app.post("/v1/authorizations/check", async (c) => {
  const env = c.env;
  const { chitty_id, resource, permission } = await c.req.json();

  try {
    const authorizationService = new AuthorizationService(env);

    const hasAccess = await authorizationService.checkAccess(
      chitty_id,
      resource,
      permission,
    );

    return c.json({
      authorized: hasAccess,
      chitty_id,
      resource,
      permission,
    });
  } catch (error) {
    console.error("Error checking authorization:", error);
    return c.json(
      {
        authorized: false,
        error: "Authorization check failed",
      },
      500,
    );
  }
});

// List authorizations for a ChittyID
app.get("/v1/authorizations/:chitty_id", async (c) => {
  const env = c.env;
  const chitty_id = c.req.param("chitty_id");

  try {
    const authorizationService = new AuthorizationService(env);
    const authorizations =
      await authorizationService.listAuthorizations(chitty_id);

    return c.json({
      success: true,
      chitty_id,
      authorizations,
    });
  } catch (error) {
    console.error("Error listing authorizations:", error);
    return c.json(
      {
        success: false,
        error: "Failed to list authorizations",
      },
      500,
    );
  }
});

// JWT token generation endpoint
app.post("/v1/tokens/generate", async (c) => {
  const env = c.env;
  const { chitty_id, expires_in } = await c.req.json();

  try {
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });

    // Verify ChittyID
    const validationResult = await chittyIDClient.validate(chitty_id);
    if (!validationResult.valid) {
      return c.json(
        {
          success: false,
          error: "Invalid ChittyID",
        },
        401,
      );
    }

    // Generate JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET || "default-secret");
    const jwt = await new SignJWT({
      chitty_id,
      iss: "auth.chitty.cc",
      aud: "chittyos",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expires_in || "1h")
      .sign(secret);

    return c.json({
      success: true,
      token: jwt,
      type: "Bearer",
      expires_in: expires_in || "1h",
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate token",
      },
      500,
    );
  }
});

// JWT token validation endpoint
app.post("/v1/tokens/validate", async (c) => {
  const env = c.env;
  const { token } = await c.req.json();

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET || "default-secret");
    const { payload } = await jwtVerify(token, secret);

    return c.json({
      valid: true,
      chitty_id: payload.chitty_id,
      issued_at: payload.iat,
      expires_at: payload.exp,
    });
  } catch (error) {
    return c.json(
      {
        valid: false,
        error: "Invalid token",
      },
      401,
    );
  }
});

// =================== USER AUTHENTICATION ENDPOINTS ===================

// User Registration endpoint
app.post("/v1/auth/register", async (c) => {
  const env = c.env;
  const { email, password, name, app_origin } = await c.req.json();

  try {
    // 1. Request ChittyID for the new user
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    const userChittyID = await chittyIDClient.mint({
      entity: "PEO", // Person
      name: name,
      metadata: { email, app_origin },
    });

    // 2. Hash password
    const passwordHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password + env.AUTH_SALT),
    );

    // 3. Store user in KV
    const userData = {
      chitty_id: userChittyID,
      email,
      name,
      password_hash: Array.from(new Uint8Array(passwordHash)),
      created_at: new Date().toISOString(),
      app_origin,
      active: true,
    };

    await env.AUTH_USERS.put(email, JSON.stringify(userData));
    await env.AUTH_USERS.put(`chitty:${userChittyID}`, email);

    // 4. Generate session JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const jwt = await new SignJWT({
      chitty_id: userChittyID,
      email,
      name,
      app: app_origin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return c.json({
      success: true,
      user: {
        chitty_id: userChittyID,
        email,
        name,
      },
      token: jwt,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return c.json(
      {
        success: false,
        error: "Registration failed",
      },
      500,
    );
  }
});

// User Login endpoint
app.post("/v1/auth/login", async (c) => {
  const env = c.env;
  const { email, password, app_origin } = await c.req.json();

  try {
    // 1. Get user from KV
    const userDataString = await env.AUTH_USERS.get(email);
    if (!userDataString) {
      return c.json(
        {
          success: false,
          error: "Invalid credentials",
        },
        401,
      );
    }

    const userData = JSON.parse(userDataString);

    // 2. Verify password
    const passwordHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password + env.AUTH_SALT),
    );
    const providedHash = Array.from(new Uint8Array(passwordHash));

    if (
      JSON.stringify(providedHash) !== JSON.stringify(userData.password_hash)
    ) {
      return c.json(
        {
          success: false,
          error: "Invalid credentials",
        },
        401,
      );
    }

    // 3. Generate session JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const jwt = await new SignJWT({
      chitty_id: userData.chitty_id,
      email: userData.email,
      name: userData.name,
      app: app_origin,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    // 4. Update last login
    userData.last_login = new Date().toISOString();
    await env.AUTH_USERS.put(email, JSON.stringify(userData));

    return c.json({
      success: true,
      user: {
        chitty_id: userData.chitty_id,
        email: userData.email,
        name: userData.name,
      },
      token: jwt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json(
      {
        success: false,
        error: "Login failed",
      },
      500,
    );
  }
});

// Session validation endpoint
app.post("/v1/auth/validate", async (c) => {
  const env = c.env;
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ valid: false, error: "No token provided" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    return c.json({
      valid: true,
      user: {
        chitty_id: payload.chitty_id,
        email: payload.email,
        name: payload.name,
        app: payload.app,
      },
    });
  } catch (error) {
    return c.json({ valid: false, error: "Invalid token" }, 401);
  }
});

// User logout endpoint
app.post("/v1/auth/logout", async (c) => {
  // For stateless JWT, logout is handled client-side
  // Could implement token blacklist here if needed
  return c.json({
    success: true,
    message: "Logged out successfully",
  });
});

// =================== ZERO TRUST & MCP ENDPOINTS ===================

// Cloudflare Zero Trust MCP Portal authentication
app.post("/v1/mcp/portal/authenticate", async (c) => {
  const env = c.env;

  // Extract Cloudflare Access headers
  const cfAccessJwt = c.req.header("Cf-Access-Jwt-Assertion");
  const cfAccessEmail = c.req.header("Cf-Access-Authenticated-User-Email");

  if (!cfAccessJwt) {
    return c.json(
      {
        authenticated: false,
        error: "Missing Cloudflare Access JWT",
      },
      401,
    );
  }

  try {
    // Verify JWT with Cloudflare Access
    const identityResponse = await fetch(
      `https://${env.CLOUDFLARE_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/get-identity`,
      {
        headers: {
          "Cf-Access-Jwt-Assertion": cfAccessJwt,
        },
      },
    );

    if (!identityResponse.ok) {
      return c.json(
        {
          authenticated: false,
          error: "Cloudflare Access verification failed",
        },
        401,
      );
    }

    const identity = await identityResponse.json();

    // Request ChittyID for the authenticated user if not exists
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    let userChittyID = await env.AUTH_USERS.get(`cf_email:${identity.email}`);

    if (!userChittyID) {
      // Create new ChittyID for CF Access user
      userChittyID = await chittyIDClient.mint({
        entity: "PEO",
        name: identity.name || identity.email,
        metadata: {
          cf_access_email: identity.email,
          cf_access_groups: identity.groups,
          portal_auth: true,
        },
      });

      // Store CF Access email -> ChittyID mapping
      await env.AUTH_USERS.put(`cf_email:${identity.email}`, userChittyID);
      await env.AUTH_USERS.put(
        `chitty:${userChittyID}`,
        JSON.stringify({
          email: identity.email,
          name: identity.name,
          cf_groups: identity.groups,
          auth_type: "cf_access_portal",
          created_at: new Date().toISOString(),
        }),
      );
    }

    // Generate MCP Portal session token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const portalToken = await new SignJWT({
      chitty_id: userChittyID,
      cf_email: identity.email,
      cf_groups: identity.groups,
      type: "mcp_portal",
      portal_access: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return c.json({
      authenticated: true,
      chitty_id: userChittyID,
      cf_identity: identity,
      portal_token: portalToken,
      mcp_portal_url: `https://mcp.${env.CHITTYOS_DOMAIN || "chitty.cc"}`,
    });
  } catch (error) {
    console.error("MCP Portal authentication error:", error);
    return c.json(
      {
        authenticated: false,
        error: "Portal authentication failed",
      },
      500,
    );
  }
});

// MCP Linked App OAuth flow
app.post("/v1/mcp/linked-app/oauth", async (c) => {
  const env = c.env;
  const { app_id, chitty_id, redirect_uri, scopes } = await c.req.json();

  try {
    // Verify ChittyID
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    const validationResult = await chittyIDClient.validate(chitty_id);

    if (!validationResult.valid) {
      return c.json(
        {
          authorized: false,
          error: "Invalid ChittyID",
        },
        401,
      );
    }

    // Generate OAuth authorization code
    const authCode = crypto.randomUUID();
    const codeData = {
      chitty_id,
      app_id,
      redirect_uri,
      scopes: scopes || ["read"],
      created_at: Date.now(),
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Store auth code temporarily
    await env.AUTH_OAUTH_CODES.put(authCode, JSON.stringify(codeData), {
      expirationTtl: 600, // 10 minutes
    });

    return c.json({
      authorized: true,
      authorization_code: authCode,
      redirect_uri: `${redirect_uri}?code=${authCode}&state=${app_id}`,
      expires_in: 600,
    });
  } catch (error) {
    console.error("MCP OAuth error:", error);
    return c.json(
      {
        authorized: false,
        error: "OAuth authorization failed",
      },
      500,
    );
  }
});

// MCP OAuth token exchange
app.post("/v1/mcp/linked-app/token", async (c) => {
  const env = c.env;
  const { code, client_id, client_secret, grant_type } = await c.req.json();

  if (grant_type !== "authorization_code") {
    return c.json(
      {
        error: "unsupported_grant_type",
        error_description: "Only authorization_code grant type is supported",
      },
      400,
    );
  }

  try {
    // Retrieve and validate auth code
    const codeDataString = await env.AUTH_OAUTH_CODES.get(code);
    if (!codeDataString) {
      return c.json(
        {
          error: "invalid_grant",
          error_description: "Authorization code not found or expired",
        },
        400,
      );
    }

    const codeData = JSON.parse(codeDataString);

    if (codeData.app_id !== client_id) {
      return c.json(
        {
          error: "invalid_client",
          error_description: "Client ID mismatch",
        },
        400,
      );
    }

    if (Date.now() > codeData.expires_at) {
      return c.json(
        {
          error: "invalid_grant",
          error_description: "Authorization code expired",
        },
        400,
      );
    }

    // Generate access token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const accessToken = await new SignJWT({
      chitty_id: codeData.chitty_id,
      app_id: codeData.app_id,
      scopes: codeData.scopes,
      type: "mcp_linked_app",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    // Generate refresh token
    const refreshToken = await new SignJWT({
      chitty_id: codeData.chitty_id,
      app_id: codeData.app_id,
      type: "mcp_refresh_token",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    // Delete used auth code
    await env.AUTH_OAUTH_CODES.delete(code);

    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: codeData.scopes.join(" "),
    });
  } catch (error) {
    console.error("OAuth token exchange error:", error);
    return c.json(
      {
        error: "server_error",
        error_description: "Token exchange failed",
      },
      500,
    );
  }
});

// MCP Server authentication
app.post("/v1/mcp/authenticate", async (c) => {
  const env = c.env;
  const { server_id, chitty_id, capabilities } = await c.req.json();

  try {
    // Verify ChittyID
    const chittyIDClient = new ChittyIDClient({
      serviceUrl: env.CHITTYID_SERVICE_URL || "https://id.chitty.cc/v1",
      apiKey: env.CHITTYID_API_KEY,
    });
    const validationResult = await chittyIDClient.validate(chitty_id);

    if (!validationResult.valid) {
      return c.json({ authenticated: false, error: "Invalid ChittyID" }, 401);
    }

    // Generate MCP session token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const mcpToken = await new SignJWT({
      chitty_id,
      server_id,
      capabilities,
      type: "mcp_server",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Store MCP server session
    await env.AUTH_MCP_SERVERS.put(
      `mcp:${server_id}`,
      JSON.stringify({
        chitty_id,
        server_id,
        capabilities,
        token: mcpToken,
        authenticated_at: new Date().toISOString(),
        active: true,
      }),
    );

    return c.json({
      authenticated: true,
      server_id,
      chitty_id,
      token: mcpToken,
      capabilities,
    });
  } catch (error) {
    console.error("MCP authentication error:", error);
    return c.json(
      { authenticated: false, error: "Authentication failed" },
      500,
    );
  }
});

// MCP Server validation
app.post("/v1/mcp/validate", async (c) => {
  const env = c.env;
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ valid: false, error: "No MCP token provided" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== "mcp_server") {
      return c.json({ valid: false, error: "Invalid token type" }, 401);
    }

    return c.json({
      valid: true,
      server_id: payload.server_id,
      chitty_id: payload.chitty_id,
      capabilities: payload.capabilities,
    });
  } catch (error) {
    return c.json({ valid: false, error: "Invalid MCP token" }, 401);
  }
});

export default app;
