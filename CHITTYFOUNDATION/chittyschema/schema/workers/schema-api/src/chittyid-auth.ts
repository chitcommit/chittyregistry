/**
 * ChittyID Pipeline Authentication & Session Management
 * Updated for new hardened pipeline architecture with distributed sessions
 * All ChittyID operations now go through Router → Intake → Trust → Authorization → Generation
 */

import { z } from 'zod';
import { DistributedSessionManager, SessionContext } from './distributed-session';

export interface Env {
  CHITTY_ID_PIPELINE_URL: string;
  CHITTY_ID_SESSION_SERVICE_URL: string;
  CHITTY_ID_API_KEY: string;
  SCHEMA_SERVICE_ID: string;
  SESSION_ENCRYPTION_KEY: string;
  LEGACY_GRACE_PERIOD_DAYS: string;
  SCHEMA_TEMPLATES: KVNamespace;
  VERIFIED_USERS: KVNamespace;
  SESSION_STORE: KVNamespace;
}

// =====================================================
// CHITTYID SCHEMAS
// =====================================================

// Updated schemas for pipeline architecture
const ChittyIDSchema = z.object({
  id: z.string().regex(/^[A-Z]{3,5}-[A-Z0-9]{16,}$/, 'Invalid ChittyID format'),
  entity_type: z.enum(['PEO', 'ORG', 'DEV', 'FIRM', 'CORP']),
  region: z.string(),
  trust_level: z.number().min(0).max(10),
  issued_at: z.string(),
  verified: z.boolean(),
  pipeline_status: z.enum(['pending', 'authenticated', 'authorized', 'active']),
  session_id: z.string().optional(),
  verification_method: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const SessionContextSchema = z.object({
  session_id: z.string(),
  chitty_id: z.string(),
  service_id: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  trust_level: z.number(),
  permissions: z.array(z.string()),
  vector_clock: z.record(z.number()),
  sync_status: z.enum(['synced', 'pending', 'conflict']),
});

const PipelineRequestSchema = z.object({
  chitty_id: z.string(),
  operation: z.enum(['validate', 'authenticate', 'authorize', 'generate_schema']),
  project_context: z.object({
    service: z.literal('schema'),
    operation_type: z.string(),
    resource_type: z.enum(['schema', 'template', 'deployment']),
    trust_required: z.number().optional(),
  }),
  session_context: SessionContextSchema.optional(),
});

export type ChittyID = z.infer<typeof ChittyIDSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type PipelineRequest = z.infer<typeof PipelineRequestSchema>;

// =====================================================
// CHITTYID PIPELINE AUTHENTICATION MIDDLEWARE
// =====================================================

export class ChittyIDPipelineAuth {
  private sessionManager: DistributedSessionManager;

  constructor(private env: Env) {
    this.sessionManager = new DistributedSessionManager(env);
  }

  /**
   * Authenticate request through pipeline with distributed session management
   */
  async authenticateRequest(request: Request, operationType: string = 'schema_generate'): Promise<{
    success: boolean;
    sessionContext?: SessionContext;
    chittyId?: ChittyID;
    userContext?: UserContext;
    error?: string;
    requiresPipeline?: boolean;
  }> {
    const chittyIdHeader = request.headers.get('X-ChittyID');
    const sessionIdHeader = request.headers.get('X-Session-ID');
    const apiKeyHeader = request.headers.get('X-API-Key');
    const authHeader = request.headers.get('Authorization');

    // 1. Check for existing session first
    if (sessionIdHeader) {
      const sessionContext = await this.sessionManager.getSession(sessionIdHeader);
      if (sessionContext && !this.isSessionExpired(sessionContext)) {
        const chittyId = await this.getChittyIDFromSession(sessionContext);
        return {
          success: true,
          sessionContext,
          chittyId,
          userContext: this.sessionToUserContext(sessionContext)
        };
      }
    }

    // 2. Extract ChittyID from various sources
    let chittyIdString = chittyIdHeader;

    // Auto-detect ChittyID from request body for simplified API
    if (apiKeyHeader === 'auto-detect' || authHeader === 'Bearer auto-detect') {
      try {
        const body = await request.clone().json();
        if (body.chittyId) {
          chittyIdString = body.chittyId;
        } else if (body.customizations?.chittyId) {
          chittyIdString = body.customizations.chittyId;
        }
      } catch (error) {
        // Not JSON or no ChittyID in body
      }
    }

    if (!chittyIdString) {
      return {
        success: false,
        error: 'ChittyID required for schema operations',
        requiresPipeline: true
      };
    }

    // 3. Process through pipeline
    return this.processThroughPipeline(chittyIdString, operationType, request);
  }

  /**
   * Process ChittyID through pipeline: Router → Intake → Trust → Authorization → Generation
   */
  private async processThroughPipeline(chittyId: string, operationType: string, request: Request): Promise<{
    success: boolean;
    sessionContext?: SessionContext;
    chittyId?: ChittyID;
    userContext?: UserContext;
    error?: string;
    requiresPipeline?: boolean;
  }> {
    try {
      // Create pipeline request
      const pipelineRequest: PipelineRequest = {
        chitty_id: chittyId,
        operation: 'authorize',
        project_context: {
          service: 'schema',
          operation_type: operationType,
          resource_type: this.getResourceType(operationType),
          trust_required: this.getRequiredTrustLevel(operationType)
        }
      };

      // Send through pipeline with circuit breaker
      const pipelineResponse = await this.callPipelineWithCircuitBreaker(pipelineRequest);

      if (!pipelineResponse.success) {
        return {
          success: false,
          error: pipelineResponse.error || 'Pipeline authentication failed',
          requiresPipeline: true
        };
      }

      // Create or update session
      const sessionContext = await this.sessionManager.createSession(
        chittyId,
        pipelineResponse.trust_level || 0,
        pipelineResponse.permissions || []
      );

      return {
        success: true,
        sessionContext,
        chittyId: pipelineResponse.chitty_id,
        userContext: this.sessionToUserContext(sessionContext)
      };

    } catch (error) {
      return {
        success: false,
        error: `Pipeline processing failed: ${error.message}`,
        requiresPipeline: true
      };
    }
  }

  /**
   * Call pipeline with circuit breaker and retry logic
   */
  private async callPipelineWithCircuitBreaker(request: PipelineRequest): Promise<any> {
    return this.withCircuitBreaker(async () => {
      const response = await fetch(`${this.env.CHITTY_ID_PIPELINE_URL}/pipeline/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.CHITTY_ID_API_KEY}`,
          'X-Service-ID': this.env.SCHEMA_SERVICE_ID
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Pipeline call failed: ${response.statusText}`);
      }

      return response.json();
    });
  }

  /**
   * Circuit breaker implementation for pipeline calls
   */
  private async withCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    // Simple circuit breaker - in production use more sophisticated implementation
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Helper methods
   */
  private getResourceType(operationType: string): 'schema' | 'template' | 'deployment' {
    if (operationType.includes('template')) return 'template';
    if (operationType.includes('deploy')) return 'deployment';
    return 'schema';
  }

  private getRequiredTrustLevel(operationType: string): number {
    switch (operationType) {
      case 'schema_validate': return 1;
      case 'schema_generate': return 3;
      case 'schema_deploy': return 5;
      case 'notion_deploy': return 4;
      case 'migration_plan': return 7;
      default: return 3;
    }
  }

  private isSessionExpired(session: SessionContext): boolean {
    return new Date() > new Date(session.expires_at);
  }

  private async getChittyIDFromSession(session: SessionContext): Promise<ChittyID> {
    // Fetch full ChittyID details from pipeline
    const response = await fetch(`${this.env.CHITTY_ID_PIPELINE_URL}/chittyid/${session.chitty_id}`, {
      headers: {
        'Authorization': `Bearer ${this.env.CHITTY_ID_API_KEY}`,
        'X-Session-ID': session.session_id
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ChittyID details');
    }

    return response.json();
  }

  private sessionToUserContext(session: SessionContext): UserContext {
    return {
      chittyId: session.chitty_id,
      entityType: 'UNKNOWN', // Will be filled from full ChittyID lookup
      trustLevel: session.trust_level,
      verified: true, // If it's in a session, it's verified
      region: 'UNKNOWN', // Will be filled from full ChittyID lookup
      permissions: session.permissions,
      quotas: this.calculateQuotasFromTrust(session.trust_level)
    };
  }

  private calculateQuotasFromTrust(trustLevel: number): UserQuotas {
    const baseQuotas = {
      schemasPerDay: 10,
      deploymentsPerDay: 5,
      validationsPerDay: 50,
      exportSizeMB: 10
    };

    const multiplier = Math.max(1, trustLevel / 2);

    return {
      schemasPerDay: Math.floor(baseQuotas.schemasPerDay * multiplier),
      deploymentsPerDay: Math.floor(baseQuotas.deploymentsPerDay * multiplier),
      validationsPerDay: Math.floor(baseQuotas.validationsPerDay * multiplier),
      exportSizeMB: Math.floor(baseQuotas.exportSizeMB * multiplier)
    };
  }
}

// =====================================================
// TYPES
// =====================================================

export interface UserContext {
  chittyId: string;
  entityType: string;
  trustLevel: number;
  verified: boolean;
  region: string;
  permissions: string[];
  quotas: UserQuotas;
}

export interface UserQuotas {
  schemasPerDay: number;
  deploymentsPerDay: number;
  validationsPerDay: number;
  exportSizeMB: number;
}

// =====================================================
// MIDDLEWARE FUNCTION
// =====================================================

export async function requirePipelineAuth(
  request: Request,
  env: Env,
  operationType: string = 'schema_generate'
): Promise<{
  success: boolean;
  sessionContext?: SessionContext;
  userContext?: UserContext;
  response?: Response;
}> {
  const auth = new ChittyIDPipelineAuth(env);
  const authResult = await auth.authenticateRequest(request, operationType);

  if (!authResult.success) {
    let statusCode = 401;
    let errorResponse: any = {
      error: 'ChittyID pipeline authentication required',
      message: authResult.error,
      requires_pipeline: authResult.requiresPipeline
    };

    if (authResult.requiresPipeline) {
      statusCode = 426; // Upgrade Required
      errorResponse.pipeline_info = {
        message: 'All ChittyID operations must go through the pipeline',
        pipeline_url: env.CHITTY_ID_PIPELINE_URL,
        help_url: 'https://id.chitty.cc/docs/pipeline'
      };
    }

    return {
      success: false,
      response: new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Pipeline-Required': 'true',
          'X-Session-Service': env.CHITTY_ID_SESSION_SERVICE_URL
        }
      })
    };
  }

  return {
    success: true,
    sessionContext: authResult.sessionContext,
    userContext: authResult.userContext
  };
}