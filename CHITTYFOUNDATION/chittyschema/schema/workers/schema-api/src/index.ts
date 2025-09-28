/**
 * ChittyChain Schema API - Main Entry Point
 * Updated for new hardened ChittyID pipeline architecture
 *
 * API Structure:
 * - Pipeline endpoints (authenticated) - require ChittyID pipeline auth
 * - Direct endpoints (public validation) - basic validation only
 * - Bridge endpoints (service integrations) - service-to-service auth
 * - Session endpoints (distributed state) - session management
 */

import { requirePipelineAuth } from './chittyid-auth';
import { DistributedSessionManager } from './distributed-session';
import { handleNotionWebhook, processNotionDLQ } from './notion-webhook-sync';
import { PuppeteerService } from './puppeteer-service';

export interface Env {
  // ChittyID Pipeline
  CHITTY_ID_PIPELINE_URL: string;
  CHITTY_ID_SESSION_SERVICE_URL: string;
  CHITTY_ID_API_KEY: string;
  SCHEMA_SERVICE_ID: string;
  SESSION_ENCRYPTION_KEY: string;

  // Storage
  SCHEMA_TEMPLATES: KVNamespace;
  VERIFIED_USERS: KVNamespace;
  SESSION_STORE: KVNamespace;
  NOTION_SYNC_QUEUE: KVNamespace;
  NOTION_DLQ: KVNamespace;

  // External Services
  NOTION_WEBHOOK_SECRET: string;
  PUPPETEER_SERVICE_URL: string;

  // Configuration
  LEGACY_GRACE_PERIOD_DAYS: string;
}

// =====================================================
// MAIN WORKER
// =====================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS();
      }

      // Route to appropriate handler
      const response = await routeRequest(request, env, path);

      // Add CORS headers to all responses
      return addCORSHeaders(response);

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for DLQ processing
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    switch (controller.cron) {
      case '*/5 * * * *': // Every 5 minutes
        await processNotionDLQ(env);
        break;
      default:
        console.log('Unknown scheduled event:', controller.cron);
    }
  }
};

// =====================================================
// REQUEST ROUTING
// =====================================================

async function routeRequest(request: Request, env: Env, path: string): Promise<Response> {
  // Pipeline endpoints - require ChittyID pipeline authentication
  if (path.startsWith('/api/v1/')) {
    return handlePipelineEndpoint(request, env, path);
  }

  // Direct endpoints - public validation and simple operations
  if (path.startsWith('/direct/')) {
    return handleDirectEndpoint(request, env, path);
  }

  // Bridge endpoints - service-to-service integrations
  if (path.startsWith('/bridge/')) {
    return handleBridgeEndpoint(request, env, path);
  }

  // Session endpoints - distributed session management
  if (path.startsWith('/session/')) {
    return handleSessionEndpoint(request, env, path);
  }

  // Webhook endpoints
  if (path.startsWith('/webhook/')) {
    return handleWebhookEndpoint(request, env, path);
  }

  // Health check
  if (path === '/health') {
    return handleHealthCheck(env);
  }

  // API documentation
  if (path === '/' || path === '/docs') {
    return handleAPIDocumentation();
  }

  return new Response('Not Found', { status: 404 });
}

// =====================================================
// PIPELINE ENDPOINTS (Authenticated)
// =====================================================

async function handlePipelineEndpoint(request: Request, env: Env, path: string): Promise<Response> {
  // Extract operation type from path for appropriate auth level
  const operationType = extractOperationType(path);

  // Require pipeline authentication
  const authResult = await requirePipelineAuth(request, env, operationType);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { sessionContext, userContext } = authResult;

  switch (true) {
    case path.startsWith('/api/v1/schema/generate'):
      return handleSchemaGeneration(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/schema/validate'):
      return handleSchemaValidation(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/schema/deploy'):
      return handleSchemaDeployment(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/notion/deploy'):
      return handleNotionDeployment(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/schema/analyze'):
      return handleSchemaAnalysis(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/migration/plan'):
      return handleMigrationPlanning(request, env, userContext!, sessionContext!);

    case path.startsWith('/api/v1/generate/types'):
      return handleTypeGeneration(request, env, userContext!, sessionContext!);

    default:
      return new Response('Endpoint not found', { status: 404 });
  }
}

// =====================================================
// DIRECT ENDPOINTS (Public)
// =====================================================

async function handleDirectEndpoint(request: Request, env: Env, path: string): Promise<Response> {
  switch (true) {
    case path.startsWith('/direct/validate/schema'):
      return handleDirectSchemaValidation(request, env);

    case path.startsWith('/direct/templates'):
      return handleTemplateList(request, env);

    case path.startsWith('/direct/health'):
      return handleHealthCheck(env);

    default:
      return new Response('Direct endpoint not found', { status: 404 });
  }
}

// =====================================================
// BRIDGE ENDPOINTS (Service-to-Service)
// =====================================================

async function handleBridgeEndpoint(request: Request, env: Env, path: string): Promise<Response> {
  // Verify service-to-service authentication
  const serviceAuth = await verifyServiceAuth(request, env);
  if (!serviceAuth.success) {
    return new Response('Unauthorized service', { status: 401 });
  }

  switch (true) {
    case path.startsWith('/bridge/sync/notion'):
      return handleNotionSync(request, env);

    case path.startsWith('/bridge/session/sync'):
      return handleSessionSync(request, env);

    case path.startsWith('/bridge/metrics'):
      return handleMetricsCollection(request, env);

    default:
      return new Response('Bridge endpoint not found', { status: 404 });
  }
}

// =====================================================
// SESSION ENDPOINTS
// =====================================================

async function handleSessionEndpoint(request: Request, env: Env, path: string): Promise<Response> {
  const sessionManager = new DistributedSessionManager(env);

  switch (true) {
    case path.startsWith('/session/create'):
      return handleSessionCreate(request, env, sessionManager);

    case path.startsWith('/session/get'):
      return handleSessionGet(request, env, sessionManager);

    case path.startsWith('/session/update'):
      return handleSessionUpdate(request, env, sessionManager);

    case path.startsWith('/session/sync'):
      return handleSessionSyncEndpoint(request, env, sessionManager);

    default:
      return new Response('Session endpoint not found', { status: 404 });
  }
}

// =====================================================
// WEBHOOK ENDPOINTS
// =====================================================

async function handleWebhookEndpoint(request: Request, env: Env, path: string): Promise<Response> {
  switch (true) {
    case path === '/webhook/notion':
      return handleNotionWebhook(request, env);

    default:
      return new Response('Webhook endpoint not found', { status: 404 });
  }
}

// =====================================================
// PIPELINE ENDPOINT HANDLERS
// =====================================================

async function handleSchemaGeneration(
  request: Request,
  env: Env,
  userContext: any,
  sessionContext: any
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();

    // Validate request against schema
    const { platform, entities, customizations } = body;

    // Generate schema using ChittyChain engine
    const schema = await generateLegalSchema({
      platform,
      entities,
      customizations: {
        ...customizations,
        chitty_id: userContext.chittyId,
        trust_level: userContext.trustLevel
      }
    });

    // Update session with operation
    await updateSessionActivity(sessionContext, 'schema_generation', env);

    return Response.json({
      success: true,
      schema,
      session_id: sessionContext.session_id,
      generation_metadata: {
        timestamp: new Date().toISOString(),
        user_trust_level: userContext.trustLevel,
        permissions_used: ['schema:generate']
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

async function handleSchemaValidation(
  request: Request,
  env: Env,
  userContext: any,
  sessionContext: any
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { schema, platform, strictMode } = body;

    // Validate schema
    const validation = await validateLegalSchema({
      schema,
      platform,
      strictMode,
      userContext
    });

    return Response.json({
      success: true,
      validation,
      session_id: sessionContext.session_id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

async function handleSchemaDeployment(
  request: Request,
  env: Env,
  userContext: any,
  sessionContext: any
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Check deployment permissions
  if (!userContext.permissions.includes('schema:deploy')) {
    return Response.json({
      error: 'Insufficient permissions for deployment',
      required_permission: 'schema:deploy',
      your_trust_level: userContext.trustLevel
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { schemaId, target } = body;

    // Deploy schema
    const deployment = await deploySchema({
      schemaId,
      target,
      userContext,
      sessionContext
    });

    return Response.json({
      success: true,
      deployment,
      session_id: sessionContext.session_id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function extractOperationType(path: string): string {
  if (path.includes('/generate')) return 'schema_generate';
  if (path.includes('/validate')) return 'schema_validate';
  if (path.includes('/deploy')) return 'schema_deploy';
  if (path.includes('/notion')) return 'notion_deploy';
  if (path.includes('/migration')) return 'migration_plan';
  return 'schema_generate';
}

async function verifyServiceAuth(request: Request, env: Env): Promise<{ success: boolean }> {
  const serviceKey = request.headers.get('X-Service-Key');
  const serviceId = request.headers.get('X-Service-ID');

  // Verify service authentication
  if (serviceKey !== env.CHITTY_ID_API_KEY || !serviceId) {
    return { success: false };
  }

  return { success: true };
}

async function updateSessionActivity(sessionContext: any, activity: string, env: Env): Promise<void> {
  const sessionManager = new DistributedSessionManager(env);
  await sessionManager.updateSession(sessionContext.session_id, {
    vector_clock: {
      ...sessionContext.vector_clock,
      [env.SCHEMA_SERVICE_ID]: (sessionContext.vector_clock[env.SCHEMA_SERVICE_ID] || 0) + 1
    }
  });
}

function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ChittyID, X-Session-ID, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function addCORSHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ChittyID, X-Session-ID, X-API-Key');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function handleHealthCheck(env: Env): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chittychain-schema-api',
    version: '2.0.0',
    pipeline: {
      url: env.CHITTY_ID_PIPELINE_URL,
      session_service: env.CHITTY_ID_SESSION_SERVICE_URL
    },
    features: {
      pipeline_auth: true,
      distributed_sessions: true,
      notion_sync: true,
      dlq_processing: true,
      circuit_breakers: true
    }
  };

  return Response.json(health);
}

async function handleAPIDocumentation(): Promise<Response> {
  const docs = {
    name: 'ChittyChain Schema API',
    version: '2.0.0',
    description: 'Legal database schema generation with hardened ChittyID pipeline authentication',
    architecture: {
      pipeline_endpoints: 'Require ChittyID pipeline authentication',
      direct_endpoints: 'Public validation and basic operations',
      bridge_endpoints: 'Service-to-service integrations',
      session_endpoints: 'Distributed session management'
    },
    authentication: {
      type: 'ChittyID Pipeline',
      flow: 'Router → Intake → Trust → Authorization → Generation',
      session_management: 'Distributed with vector clocks'
    },
    endpoints: {
      '/api/v1/schema/generate': 'Generate legal database schema',
      '/api/v1/schema/validate': 'Validate existing schema',
      '/api/v1/schema/deploy': 'Deploy schema to target platform',
      '/api/v1/notion/deploy': 'Deploy to Notion workspace',
      '/direct/validate/schema': 'Public schema validation',
      '/webhook/notion': 'Notion webhook handler',
      '/health': 'Service health check'
    }
  };

  return Response.json(docs);
}

// =====================================================
// PLACEHOLDER IMPLEMENTATIONS
// =====================================================

async function generateLegalSchema(options: any): Promise<any> {
  // Implementation would call the actual schema generation engine
  return {
    id: crypto.randomUUID(),
    platform: options.platform,
    entities: options.entities,
    sql: '-- Generated legal schema SQL',
    metadata: {
      version: '2.0.0',
      generated_at: new Date().toISOString(),
      chitty_id: options.customizations.chitty_id
    }
  };
}

async function validateLegalSchema(options: any): Promise<any> {
  // Implementation would validate the schema
  return {
    isValid: true,
    score: 95,
    issues: [],
    recommendations: ['Schema meets legal compliance requirements']
  };
}

async function deploySchema(options: any): Promise<any> {
  // Implementation would deploy the schema
  return {
    deploymentId: crypto.randomUUID(),
    status: 'completed',
    message: 'Schema deployed successfully'
  };
}

// Placeholder handlers for remaining endpoints
async function handleNotionDeployment(request: Request, env: Env, userContext: any, sessionContext: any): Promise<Response> {
  return Response.json({ message: 'Notion deployment endpoint' });
}

async function handleSchemaAnalysis(request: Request, env: Env, userContext: any, sessionContext: any): Promise<Response> {
  return Response.json({ message: 'Schema analysis endpoint' });
}

async function handleMigrationPlanning(request: Request, env: Env, userContext: any, sessionContext: any): Promise<Response> {
  return Response.json({ message: 'Migration planning endpoint' });
}

async function handleTypeGeneration(request: Request, env: Env, userContext: any, sessionContext: any): Promise<Response> {
  return Response.json({ message: 'Type generation endpoint' });
}

async function handleDirectSchemaValidation(request: Request, env: Env): Promise<Response> {
  return Response.json({ message: 'Direct schema validation endpoint' });
}

async function handleTemplateList(request: Request, env: Env): Promise<Response> {
  return Response.json({ message: 'Template list endpoint' });
}

async function handleNotionSync(request: Request, env: Env): Promise<Response> {
  return Response.json({ message: 'Notion sync bridge endpoint' });
}

async function handleSessionSync(request: Request, env: Env): Promise<Response> {
  return Response.json({ message: 'Session sync bridge endpoint' });
}

async function handleMetricsCollection(request: Request, env: Env): Promise<Response> {
  return Response.json({ message: 'Metrics collection endpoint' });
}

async function handleSessionCreate(request: Request, env: Env, sessionManager: DistributedSessionManager): Promise<Response> {
  return Response.json({ message: 'Session create endpoint' });
}

async function handleSessionGet(request: Request, env: Env, sessionManager: DistributedSessionManager): Promise<Response> {
  return Response.json({ message: 'Session get endpoint' });
}

async function handleSessionUpdate(request: Request, env: Env, sessionManager: DistributedSessionManager): Promise<Response> {
  return Response.json({ message: 'Session update endpoint' });
}

async function handleSessionSyncEndpoint(request: Request, env: Env, sessionManager: DistributedSessionManager): Promise<Response> {
  return Response.json({ message: 'Session sync endpoint' });
}