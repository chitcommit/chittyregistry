/**
 * Mock API Server for ChittyChain Schema Testing
 * Provides realistic responses for offline testing and development
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  delay?: number;
}

interface RequestLog {
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

class MockChittySchemaServer {
  private server: any;
  private port: number = 3001;
  private requestLogs: RequestLog[] = [];
  private rateLimitStore: Map<string, number[]> = new Map();

  constructor() {
    this.server = createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '', `http://localhost:${this.port}`);
    const method = req.method || 'GET';

    // Log request
    const requestLog: RequestLog = {
      timestamp: Date.now(),
      method,
      url: url.pathname + url.search,
      headers: req.headers as Record<string, string>
    };

    // Read body if present
    if (method !== 'GET' && method !== 'HEAD') {
      requestLog.body = await this.readBody(req);
    }

    this.requestLogs.push(requestLog);
    console.log(`📝 ${method} ${url.pathname} - ${this.getClientIP(req)}`);

    // Apply rate limiting simulation
    if (this.isRateLimited(req)) {
      this.sendResponse(res, {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Rate limit exceeded', retryAfter: 60 }
      });
      return;
    }

    // Route handling
    const response = this.routeRequest(method, url, requestLog);

    // Add delay simulation for load testing
    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    this.sendResponse(res, response);
  }

  private routeRequest(method: string, url: URL, request: RequestLog): MockResponse {
    const path = url.pathname;
    const query = url.searchParams;

    // Health endpoints
    if (path === '/health') {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          services: {
            database: 'connected',
            pipeline: 'operational',
            cache: 'healthy'
          }
        }
      };
    }

    // Pipeline service health (for CHITTY_ID_PIPELINE_URL)
    if (path === '/pipeline/health') {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'operational',
          pipeline_stages: ['router', 'intake', 'trust', 'authorization', 'generation'],
          active_sessions: 42
        }
      };
    }

    // Schema API endpoints
    if (path.startsWith('/api/v1/schema/')) {
      return this.handleSchemaEndpoint(method, path, request);
    }

    // Session management
    if (path.startsWith('/session/')) {
      return this.handleSessionEndpoint(method, path, request);
    }

    // Notion webhook endpoints
    if (path.startsWith('/api/v1/notion/')) {
      return this.handleNotionEndpoint(method, path, request);
    }

    // Mock admin endpoints for penetration testing
    if (path.startsWith('/admin/')) {
      return this.handleAdminEndpoint(method, path, request);
    }

    // Debug endpoint for test logs
    if (path === '/debug/requests') {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          total_requests: this.requestLogs.length,
          recent_requests: this.requestLogs.slice(-10)
        }
      };
    }

    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Endpoint not found', path }
    };
  }

  private handleSchemaEndpoint(method: string, path: string, request: RequestLog): MockResponse {
    // Check for required ChittyID pipeline authentication
    const headers = request.headers;
    const chittyId = headers['x-chitty-id'] || request.body?.chittyId;

    if (!chittyId) {
      return {
        status: 426,
        headers: {
          'Content-Type': 'application/json',
          'Upgrade': 'ChittyID-Pipeline/1.0'
        },
        body: {
          error: 'ChittyID pipeline authentication required',
          pipeline_url: 'https://id.chitty.cc/pipeline',
          documentation: 'https://docs.chitty.cc/pipeline-auth'
        }
      };
    }

    // Validate ChittyID format
    if (!this.isValidChittyId(chittyId)) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Invalid ChittyID format',
          received: chittyId,
          expected_format: 'CHITTY-{uuid-v4}'
        }
      };
    }

    // Test injection attempts
    if (this.containsSqlInjection(request.body) || this.containsXssAttempt(request.body)) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Invalid input detected',
          security_incident_id: this.generateIncidentId()
        }
      };
    }

    if (path === '/api/v1/schema/generate') {
      return this.handleSchemaGenerate(request);
    }

    if (path === '/api/v1/schema/validate') {
      return this.handleSchemaValidate(request);
    }

    if (path === '/api/v1/schema/deploy') {
      return this.handleSchemaDeploy(request);
    }

    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Schema endpoint not found' }
    };
  }

  private handleSessionEndpoint(method: string, path: string, request: RequestLog): MockResponse {
    if (path === '/session/create' && method === 'POST') {
      return {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          sessionId: this.generateSessionId(),
          vectorClock: { node1: 1, node2: 0, node3: 0 },
          expires: new Date(Date.now() + 3600000).toISOString(),
          trustLevel: request.body?.trustLevel || 'standard'
        }
      };
    }

    if (path.includes('/session/') && path.includes('/sync')) {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          conflict_resolution: 'vector_clock',
          merged_state: { last_updated: new Date().toISOString() },
          vectorClock: { node1: 2, node2: 1, node3: 0 }
        }
      };
    }

    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Session endpoint not found' }
    };
  }

  private handleNotionEndpoint(method: string, path: string, request: RequestLog): MockResponse {
    // Webhook signature verification simulation
    const signature = request.headers['x-notion-signature'];
    if (!signature || !this.verifyWebhookSignature(signature, request.body)) {
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Invalid webhook signature' }
      };
    }

    if (path === '/api/v1/notion/webhook') {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          processed: true,
          idempotency_key: request.headers['idempotency-key'] || this.generateIdempotencyKey(),
          dlq_count: 0
        }
      };
    }

    if (path === '/api/v1/notion/deploy') {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          deployment_id: this.generateDeploymentId(),
          status: 'deployed',
          notion_pages_updated: 3
        }
      };
    }

    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Notion endpoint not found' }
    };
  }

  private handleAdminEndpoint(method: string, path: string, request: RequestLog): MockResponse {
    // Always reject admin access attempts for security testing
    return {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Access denied',
        incident_logged: true,
        security_team_notified: true
      }
    };
  }

  private handleSchemaGenerate(request: RequestLog): MockResponse {
    const platform = request.body?.platform || 'postgresql';
    const entities = request.body?.entities || ['users'];

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        schema_id: this.generateSchemaId(),
        platform,
        entities: entities.map((entity: string) => ({
          name: entity,
          table_name: `${entity}_table`,
          fields: ['id', 'created_at', 'updated_at'],
          relations: []
        })),
        generated_at: new Date().toISOString(),
        version: '1.0.0'
      },
      delay: 150 // Simulate processing time
    };
  }

  private handleSchemaValidate(request: RequestLog): MockResponse {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        valid: true,
        validation_id: this.generateValidationId(),
        warnings: [],
        suggestions: ['Consider adding indexes for better performance']
      }
    };
  }

  private handleSchemaDeploy(request: RequestLog): MockResponse {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        deployment_id: this.generateDeploymentId(),
        status: 'deployed',
        migration_steps: 3,
        rollback_available: true
      },
      delay: 300 // Simulate deployment time
    };
  }

  // Utility methods
  private async readBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });
  }

  private sendResponse(res: ServerResponse, response: MockResponse) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Add CORS headers for testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Chitty-ID');

    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.statusCode = response.status;
    res.end(JSON.stringify(response.body, null, 2));
  }

  private isValidChittyId(chittyId: string): boolean {
    return /^CHITTY-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chittyId);
  }

  private containsSqlInjection(body: any): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
      /['"]\s*(OR|AND)\s+['"]\s*\w+['"]\s*=\s*['"]\w+['"]|/i,
      /;\s*(DROP|DELETE|UPDATE)/i
    ];

    const bodyStr = JSON.stringify(body);
    return sqlPatterns.some(pattern => pattern.test(bodyStr));
  }

  private containsXssAttempt(body: any): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i
    ];

    const bodyStr = JSON.stringify(body);
    return xssPatterns.some(pattern => pattern.test(bodyStr));
  }

  private isRateLimited(req: IncomingMessage): boolean {
    const clientIP = this.getClientIP(req);
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    if (!this.rateLimitStore.has(clientIP)) {
      this.rateLimitStore.set(clientIP, []);
    }

    const requests = this.rateLimitStore.get(clientIP)!;
    const windowStart = now - windowMs;

    // Remove old requests
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      return true;
    }

    recentRequests.push(now);
    this.rateLimitStore.set(clientIP, recentRequests);
    return false;
  }

  private getClientIP(req: IncomingMessage): string {
    return req.headers['x-forwarded-for'] as string ||
           req.headers['x-real-ip'] as string ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private verifyWebhookSignature(signature: string, body: any): boolean {
    // Simulate signature verification (always true for testing)
    return signature.startsWith('sha256=');
  }

  private generateSessionId(): string {
    return `sess_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSchemaId(): string {
    return `schema_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateValidationId(): string {
    return `valid_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateDeploymentId(): string {
    return `deploy_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateIncidentId(): string {
    return `incident_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateIdempotencyKey(): string {
    return `idem_${Math.random().toString(36).substring(2, 15)}`;
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Mock ChittyChain Schema Server running on http://localhost:${this.port}`);
        console.log(`📊 Health endpoint: http://localhost:${this.port}/health`);
        console.log(`🔧 Debug endpoint: http://localhost:${this.port}/debug/requests`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Mock server stopped');
        resolve();
      });
    });
  }
}

// Start server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MockChittySchemaServer();

  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down mock server...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch(console.error);
}

export { MockChittySchemaServer };