/**
 * Mock Server for ChittyChain Schema Testing Framework
 * Provides realistic API responses for testing without external dependencies
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  delay?: number;
}

interface MockEndpoint {
  method: string;
  path: string;
  response: MockResponse | ((req: IncomingMessage, url: URL) => MockResponse);
  description: string;
}

interface MockServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  enableLogging: boolean;
  simulateLatency: boolean;
  maxLatency: number;
}

export class MockChittySchemaServer {
  private server: any;
  private config: MockServerConfig;
  private endpoints: MockEndpoint[] = [];
  private requestLog: any[] = [];

  constructor(config?: Partial<MockServerConfig>) {
    this.config = {
      port: 3001,
      host: 'localhost',
      enableCors: true,
      enableLogging: true,
      simulateLatency: true,
      maxLatency: 500,
      ...config
    };

    this.setupDefaultEndpoints();
  }

  private setupDefaultEndpoints(): void {
    // Health endpoints
    this.addEndpoint({
      method: 'GET',
      path: '/health',
      description: 'Health check endpoint',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0'
        }
      }
    });

    this.addEndpoint({
      method: 'GET',
      path: '/version',
      description: 'API version information',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          version: '1.2.3',
          api_version: 'v1',
          build: 'mock-build-123',
          environment: 'test'
        }
      }
    });

    // Authentication endpoints
    this.addEndpoint({
      method: 'POST',
      path: '/api/auth/validate',
      description: 'Validate authentication token',
      response: (req, url) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Missing or invalid authorization header' }
          };
        }

        const token = authHeader.substring(7);
        if (token === 'invalid-token') {
          return {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Invalid token' }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            valid: true,
            chittyId: 'CHITTY-MOCK-001',
            trustLevel: 75,
            permissions: ['read', 'write']
          }
        };
      }
    });

    // Session endpoints
    this.addEndpoint({
      method: 'GET',
      path: '/api/session/info',
      description: 'Get session information',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          sessionId: 'sess_' + Math.random().toString(36).substring(2),
          chittyId: 'CHITTY-MOCK-001',
          vectorClock: { 'node1': 5, 'node2': 3, 'node3': 8 },
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      }
    });

    this.addEndpoint({
      method: 'POST',
      path: '/api/session/update',
      description: 'Update session state',
      response: (req, url) => {
        // Simulate occasional conflicts
        if (Math.random() < 0.1) {
          return {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
            body: {
              conflict: true,
              resolution: 'last_write_wins',
              vectorClock: { 'node1': 6, 'node2': 4, 'node3': 9 }
            }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            updated: true,
            vectorClock: { 'node1': 6, 'node2': 4, 'node3': 9 },
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    // Schema endpoints
    this.addEndpoint({
      method: 'GET',
      path: '/api/schemas',
      description: 'List available schemas',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: [
          {
            id: 'schema_001',
            name: 'Legal Matter Schema',
            platform: 'notion',
            entities: [
              { name: 'Matter', fields: { title: 'string', status: 'enum' } },
              { name: 'Client', fields: { name: 'string', email: 'email' } }
            ],
            version: '1.0.0',
            created: '2024-01-01T00:00:00Z'
          },
          {
            id: 'schema_002',
            name: 'Contract Management Schema',
            platform: 'airtable',
            entities: [
              { name: 'Contract', fields: { title: 'string', value: 'number' } },
              { name: 'Vendor', fields: { name: 'string', contact: 'string' } }
            ],
            version: '1.1.0',
            created: '2024-01-15T00:00:00Z'
          }
        ]
      }
    });

    this.addEndpoint({
      method: 'GET',
      path: '/api/schemas/:id',
      description: 'Get specific schema',
      response: (req, url) => {
        const pathParts = url.pathname.split('/');
        const schemaId = pathParts[pathParts.length - 1];

        if (schemaId === 'nonexistent') {
          return {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Schema not found' }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: schemaId,
            name: `Mock Schema ${schemaId}`,
            platform: 'notion',
            entities: [
              {
                name: 'TestEntity',
                fields: {
                  id: { type: 'string', required: true },
                  title: { type: 'string', required: true },
                  status: { type: 'enum', values: ['draft', 'active', 'archived'] },
                  created_date: { type: 'date', required: true }
                }
              }
            ],
            metadata: {
              version: '1.0.0',
              created: '2024-01-01T00:00:00Z',
              compliance: ['GDPR', 'SOC2']
            }
          }
        };
      }
    });

    this.addEndpoint({
      method: 'POST',
      path: '/api/schemas/validate',
      description: 'Validate schema definition',
      response: (req, url) => {
        // Simulate validation logic
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for malicious content (simplified)
        const body = this.parseRequestBody(req);
        const bodyStr = JSON.stringify(body);

        if (bodyStr.includes('<script>') || bodyStr.includes('javascript:')) {
          errors.push('XSS content detected in schema definition');
        }

        if (bodyStr.includes('DROP TABLE') || bodyStr.includes('UNION SELECT')) {
          errors.push('SQL injection pattern detected');
        }

        if (bodyStr.includes('..') || bodyStr.includes('/etc/passwd')) {
          errors.push('Path traversal pattern detected');
        }

        if (errors.length > 0) {
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: {
              valid: false,
              errors,
              warnings
            }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            valid: true,
            errors: [],
            warnings: []
          }
        };
      }
    });

    this.addEndpoint({
      method: 'POST',
      path: '/api/schemas/create',
      description: 'Create new schema',
      response: (req, url) => {
        const body = this.parseRequestBody(req);

        // Sanitize malicious content
        if (body.name) {
          body.name = body.name.replace(/<script.*?>.*?<\/script>/gi, '');
          body.name = body.name.replace(/javascript:/gi, '');
        }

        return {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: 'schema_' + Math.random().toString(36).substring(2),
            ...body,
            created: new Date().toISOString(),
            version: '1.0.0'
          }
        };
      }
    });

    // Search endpoints
    this.addEndpoint({
      method: 'GET',
      path: '/api/schemas/search',
      description: 'Search schemas',
      response: (req, url) => {
        const query = url.searchParams.get('q') || '';

        // Detect SQL injection attempts
        const sqlPatterns = [
          /union\s+select/i,
          /drop\s+table/i,
          /'\s+or\s+'1'\s*=\s*'1/i,
          /--/,
          /;.*delete/i
        ];

        const hasSqlInjection = sqlPatterns.some(pattern => pattern.test(query));

        if (hasSqlInjection) {
          return {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Invalid search query' }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            results: [],
            total: 0,
            query: query.substring(0, 100) // Limit query length in response
          }
        };
      }
    });

    // Webhook endpoints
    this.addEndpoint({
      method: 'POST',
      path: '/api/webhooks/notion/process',
      description: 'Process Notion webhook',
      response: (req, url) => {
        const body = this.parseRequestBody(req);

        // Simulate idempotent processing
        if (body.id && this.isProcessedEvent(body.id)) {
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
              processed: true,
              duplicate: true,
              eventId: body.id
            }
          };
        }

        // Simulate occasional failures for retry testing
        if (body.data?.shouldFail || Math.random() < 0.05) {
          return {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '5'
            },
            body: { error: 'Temporary processing error' }
          };
        }

        this.markEventAsProcessed(body.id);

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            processed: true,
            eventId: body.id,
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    this.addEndpoint({
      method: 'GET',
      path: '/api/webhooks/dlq/status',
      description: 'Get dead letter queue status',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          queueSize: Math.floor(Math.random() * 10),
          oldestEvent: new Date(Date.now() - 3600000).toISOString(),
          processingRate: 15.5
        }
      }
    });

    // Rate limiting test endpoint
    this.addEndpoint({
      method: 'GET',
      path: '/api/test/rate-limit',
      description: 'Endpoint for testing rate limiting',
      response: (req, url) => {
        // Simulate rate limiting after 10 requests
        const userAgent = req.headers['user-agent'] || '';
        const requestCount = this.getRequestCount(userAgent);

        if (requestCount > 10) {
          return {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
              'Retry-After': '60'
            },
            body: { error: 'Rate limit exceeded' }
          };
        }

        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(10 - requestCount),
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
          },
          body: { message: 'OK', requestCount }
        };
      }
    });

    // Admin endpoints (should be protected)
    this.addEndpoint({
      method: 'GET',
      path: '/api/admin/users',
      description: 'Admin endpoint - get all users',
      response: (req, url) => {
        const authHeader = req.headers.authorization;
        const chittyId = req.headers['x-chittyid'];

        if (!authHeader || !chittyId || !chittyId.includes('ADMIN')) {
          return {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Insufficient privileges' }
          };
        }

        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            users: [
              { id: 1, username: 'admin', role: 'administrator' },
              { id: 2, username: 'user1', role: 'user' }
            ]
          }
        };
      }
    });

    // File endpoints for path traversal testing
    this.addEndpoint({
      method: 'GET',
      path: '/api/files/:path',
      description: 'File access endpoint (for security testing)',
      response: (req, url) => {
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(3).join('/'); // Remove /api/files/

        // Check for path traversal attempts
        if (filePath.includes('..') || filePath.includes('/etc/') || filePath.includes('passwd')) {
          return {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Access denied' }
          };
        }

        return {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'File not found' }
        };
      }
    });

    // Slow endpoint for timeout testing
    this.addEndpoint({
      method: 'POST',
      path: '/api/test/slow',
      description: 'Slow endpoint for timeout testing',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'Slow response' },
        delay: 10000 // 10 second delay
      }
    });
  }

  private processedEvents = new Set<string>();
  private requestCounts = new Map<string, number>();

  private isProcessedEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  private markEventAsProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }

  private getRequestCount(userAgent: string): number {
    const count = this.requestCounts.get(userAgent) || 0;
    this.requestCounts.set(userAgent, count + 1);
    return count + 1;
  }

  addEndpoint(endpoint: MockEndpoint): void {
    this.endpoints.push(endpoint);
  }

  private parseRequestBody(req: IncomingMessage): any {
    // In a real implementation, this would properly parse the request body
    // For now, return a mock body
    return { mockBody: true };
  }

  private findMatchingEndpoint(method: string, path: string): MockEndpoint | null {
    return this.endpoints.find(endpoint => {
      if (endpoint.method !== method) return false;

      // Simple path matching (including parameters)
      const endpointParts = endpoint.path.split('/');
      const requestParts = path.split('/');

      if (endpointParts.length !== requestParts.length) return false;

      return endpointParts.every((part, index) => {
        return part.startsWith(':') || part === requestParts[index];
      });
    }) || null;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    // Add CORS headers if enabled
    if (this.config.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ChittyID');

      if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
    }

    // Log request if enabled
    if (this.config.enableLogging) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: req.headers,
        userAgent: req.headers['user-agent']
      };
      this.requestLog.push(logEntry);
      console.log(`📥 ${method} ${url.pathname}`);
    }

    // Find matching endpoint
    const endpoint = this.findMatchingEndpoint(method, url.pathname);

    if (!endpoint) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }

    // Get response
    const mockResponse = typeof endpoint.response === 'function'
      ? endpoint.response(req, url)
      : endpoint.response;

    // Simulate latency if enabled
    const delay = mockResponse.delay ||
      (this.config.simulateLatency ? Math.random() * this.config.maxLatency : 0);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Send response
    res.writeHead(mockResponse.status, mockResponse.headers);
    res.end(typeof mockResponse.body === 'string'
      ? mockResponse.body
      : JSON.stringify(mockResponse.body));
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch(error => {
          console.error('Error handling request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        });
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`🔧 Mock ChittyChain Schema server running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getRequestLog(): any[] {
    return [...this.requestLog];
  }

  clearRequestLog(): void {
    this.requestLog = [];
  }

  getStats(): any {
    const requestsByMethod = this.requestLog.reduce((acc, req) => {
      acc[req.method] = (acc[req.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByPath = this.requestLog.reduce((acc, req) => {
      acc[req.path] = (acc[req.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: this.requestLog.length,
      requestsByMethod,
      requestsByPath,
      endpoints: this.endpoints.length,
      uptime: process.uptime()
    };
  }
}

// CLI interface for running the mock server standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  const mockServer = new MockChittySchemaServer();

  mockServer.start().then(() => {
    console.log('Mock server started. Press Ctrl+C to stop.');

    process.on('SIGINT', () => {
      console.log('\nShutting down mock server...');
      mockServer.stop().then(() => {
        process.exit(0);
      });
    });
  }).catch(error => {
    console.error('Failed to start mock server:', error);
    process.exit(1);
  });
}

export { MockChittySchemaServer };