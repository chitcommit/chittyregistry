/**
 * ChittyGateway - Unified API Gateway & Router
 *
 * Provides two access patterns:
 * 1. Gateway Access: gateway.chitty.cc/api/* (general use, unified auth)
 * 2. Direct Access: *.chitty.cc (partner integrations, direct service calls)
 *
 * The gateway acts as a smart router, not a replacement for direct services
 */

export interface Env {
  // KV Namespaces
  CACHE: KVNamespace;
  TEMPLATES: KVNamespace;

  // D1 Database
  DB: D1Database;

  // R2 Storage
  EXPORTS: R2Bucket;

  // AI
  AI: any;

  // Analytics
  ANALYTICS: AnalyticsEngineDataset;

  // Secrets
  DATABASE_URL: string;
  NOTION_API_KEY: string;
  GITHUB_TOKEN: string;
  OPENAI_API_KEY: string;
  AUTH_SECRET: string;

  // Environment variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
}

// Route handlers
import { handleSchemaRoutes } from "./routes/schema";
import { handleNotionRoutes } from "./routes/notion";
import { handleExportRoutes } from "./routes/export";
import { handleValidationRoutes } from "./routes/validation";
import { handleMCPRoutes } from "./routes/mcp";
import { handleLegacyRoutes } from "./routes/legacy";
import { handleChittyIDRoutes } from "./routes/chittyid";
import { handleRegistryRoutes } from "./routes/registry";
import { handleLedgerRoutes } from "./routes/ledger";
import { handleTrustRoutes } from "./routes/trust";
import { handleVerifyRoutes } from "./routes/verify";

// Middleware
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { analyticsMiddleware } from "./middleware/analytics";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Apply CORS headers
    const corsHeaders = corsMiddleware();

    // Handle OPTIONS requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      // Analytics tracking
      ctx.waitUntil(analyticsMiddleware(request, env));

      // Rate limiting
      const rateLimitResponse = await rateLimitMiddleware(request, env);
      if (rateLimitResponse) return rateLimitResponse;

      // Authentication for protected routes
      const authRequired = !url.pathname.startsWith("/api/public/");
      if (authRequired) {
        const authResponse = await authMiddleware(request, env);
        if (authResponse) return authResponse;
      }

      // Route to appropriate service
      let response: Response;

      // Schema API Routes (formerly schema.chitty.cc)
      if (url.pathname.startsWith("/api/schema/")) {
        response = await handleSchemaRoutes(request, env, url);
      }
      // Notion Integration Routes
      else if (url.pathname.startsWith("/api/notion/")) {
        response = await handleNotionRoutes(request, env, url);
      }
      // Export Routes
      else if (url.pathname.startsWith("/api/export/")) {
        response = await handleExportRoutes(request, env, url);
      }
      // Validation Routes
      else if (url.pathname.startsWith("/api/validate/")) {
        response = await handleValidationRoutes(request, env, url);
      }
      // MCP Server Routes
      else if (url.pathname.startsWith("/mcp/")) {
        response = await handleMCPRoutes(request, env, url);
      }
      // ChittyID Service Routes (formerly id.chitty.cc)
      else if (url.pathname.startsWith("/api/id/")) {
        response = await handleChittyIDRoutes(request, env, url);
      }
      // Registry Service Routes (formerly registry.chitty.cc)
      else if (url.pathname.startsWith("/api/registry/")) {
        response = await handleRegistryRoutes(request, env, url);
      }
      // Ledger Service Routes (formerly ledger.chitty.cc)
      else if (url.pathname.startsWith("/api/ledger/")) {
        response = await handleLedgerRoutes(request, env, url);
      }
      // Trust Service Routes (formerly trust.chitty.cc)
      else if (url.pathname.startsWith("/api/trust/")) {
        response = await handleTrustRoutes(request, env, url);
      }
      // Verification Service Routes (formerly verify.chitty.cc)
      else if (url.pathname.startsWith("/api/verify/")) {
        response = await handleVerifyRoutes(request, env, url);
      }
      // Legacy redirect handlers
      else if (url.pathname.startsWith("/legacy/")) {
        response = await handleLegacyRoutes(request, env, url);
      }
      // Health check
      else if (url.pathname === "/health") {
        response = new Response(
          JSON.stringify({
            status: "healthy",
            service: "ChittyGateway",
            environment: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // Service discovery endpoint
      else if (url.pathname === "/api/services") {
        response = new Response(
          JSON.stringify({
            services: {
              schema: {
                base: "/api/schema",
                docs: "https://docs.chitty.cc/api/schema",
              },
              notion: {
                base: "/api/notion",
                docs: "https://docs.chitty.cc/api/notion",
              },
              export: {
                base: "/api/export",
                docs: "https://docs.chitty.cc/api/export",
              },
              validation: {
                base: "/api/validate",
                docs: "https://docs.chitty.cc/api/validation",
              },
              mcp: {
                base: "/mcp",
                docs: "https://docs.chitty.cc/api/mcp",
              },
              id: {
                base: "/api/id",
                docs: "https://docs.chitty.cc/api/id",
              },
              registry: {
                base: "/api/registry",
                docs: "https://docs.chitty.cc/api/registry",
              },
              ledger: {
                base: "/api/ledger",
                docs: "https://docs.chitty.cc/api/ledger",
              },
              trust: {
                base: "/api/trust",
                docs: "https://docs.chitty.cc/api/trust",
              },
              verify: {
                base: "/api/verify",
                docs: "https://docs.chitty.cc/api/verify",
              },
            },
            version: "1.0.0",
            gateway: "gateway.chitty.cc",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // Root endpoint
      else if (url.pathname === "/") {
        response = new Response(
          JSON.stringify({
            message: "ChittyGateway - Unified API Gateway",
            version: "1.0.0",
            services: "GET /api/services for service discovery",
            health: "GET /health for health check",
            docs: "https://docs.chitty.cc",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        response = new Response(
          JSON.stringify({
            error: "Not Found",
            message: `Route ${url.pathname} not found`,
            suggestion: "Check /api/services for available endpoints",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error("Gateway error:", error);

      // Log error to analytics
      ctx.waitUntil(
        env.ANALYTICS.writeDataPoint({
          blobs: ["error", url.pathname],
          doubles: [1],
          indexes: [Date.now()],
        }),
      );

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          requestId: crypto.randomUUID(),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }
  },
};
