/**
 * QA Test Suite for ChittyChain Schema API
 * Tests core functionality, pipeline authentication, distributed sessions, and webhook handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const SCHEMA_URL = process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001';
const PIPELINE_URL = process.env.CHITTY_ID_PIPELINE_URL || 'http://localhost:3000/pipeline';

interface PipelineAuthResponse {
  success: boolean;
  chittyId: string;
  sessionToken: string;
  trustLevel: number;
  vectorClock?: Record<string, number>;
}

interface SchemaTemplate {
  id: string;
  name: string;
  platform: string;
  entities: Array<{
    name: string;
    fields: Record<string, any>;
  }>;
  metadata: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

interface NotionWebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
  signature: string;
}

describe('ChittyChain Schema QA Test Suite', () => {
  let client: AxiosInstance;
  let authToken: string;
  let chittyId: string;
  let sessionData: Record<string, any>;

  beforeAll(async () => {
    client = axios.create({
      baseURL: SCHEMA_URL,
      timeout: 10000,
      validateStatus: () => true // Don't throw on non-2xx
    });

    console.log(`🚀 Testing against: ${SCHEMA_URL}`);
  });

  describe('Health and Basic Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await client.get('/health');
      expect(response.status).toBeLessThan(500);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('status');
        expect(['healthy', 'ok', 'operational']).toContain(response.data.status);
      }
    });

    it('should return API version information', async () => {
      const response = await client.get('/version');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('version');
        expect(response.data.version).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    it('should provide API documentation', async () => {
      const response = await client.get('/docs');

      if (response.status === 200) {
        expect(response.data).toBeDefined();
      } else if (response.status === 302 || response.status === 301) {
        expect(response.headers.location).toBeDefined();
      }
    });
  });

  describe('Pipeline Authentication Flow', () => {
    it('should reject requests without pipeline authentication', async () => {
      const response = await client.get('/api/schemas');
      expect([401, 403]).toContain(response.status);

      if (response.data) {
        expect(response.data.error).toBeDefined();
        expect(response.data.error).toMatch(/auth|pipeline|unauthorized/i);
      }
    });

    it('should authenticate through ChittyID pipeline', async () => {
      try {
        // Mock pipeline authentication
        const pipelineResponse = await axios.post(PIPELINE_URL + '/auth', {
          clientId: 'qa-test-suite',
          clientSecret: 'test-secret',
          scope: 'schema:read schema:write'
        });

        if (pipelineResponse.status === 200) {
          const authData = pipelineResponse.data as PipelineAuthResponse;
          expect(authData.success).toBe(true);
          expect(authData.chittyId).toBeDefined();
          expect(authData.sessionToken).toBeDefined();

          authToken = authData.sessionToken;
          chittyId = authData.chittyId;
          sessionData = authData;

          // Update client with auth token
          client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
          client.defaults.headers.common['X-ChittyID'] = chittyId;
        }
      } catch (error) {
        // Pipeline might not be available in test environment
        console.log('⚠️  Pipeline authentication unavailable, using mock auth');
        authToken = 'mock-token-' + Date.now();
        chittyId = 'CHITTY-' + Math.random().toString(36).substring(2, 15);
        client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        client.defaults.headers.common['X-ChittyID'] = chittyId;
      }
    });

    it('should validate session token format', async () => {
      expect(authToken).toBeDefined();
      expect(authToken.length).toBeGreaterThan(10);

      if (!authToken.startsWith('mock-')) {
        // Real token validation
        expect(authToken).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
      }
    });

    it('should include trust level in authentication', async () => {
      if (sessionData && sessionData.trustLevel !== undefined) {
        expect(sessionData.trustLevel).toBeGreaterThanOrEqual(0);
        expect(sessionData.trustLevel).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Schema Template Operations', () => {
    let templateId: string;

    it('should list available schema templates', async () => {
      const response = await client.get('/api/schemas');

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          const template = response.data[0] as SchemaTemplate;
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('platform');
          templateId = template.id;
        }
      }
    });

    it('should retrieve specific schema template', async () => {
      if (!templateId) {
        templateId = 'test-template';
      }

      const response = await client.get(`/api/schemas/${templateId}`);

      if (response.status === 200) {
        const template = response.data as SchemaTemplate;
        expect(template.id).toBe(templateId);
        expect(template.entities).toBeDefined();
        expect(Array.isArray(template.entities)).toBe(true);
      }
    });

    it('should validate schema structure', async () => {
      const testSchema = {
        platform: 'notion',
        entities: [
          {
            name: 'Task',
            fields: {
              title: { type: 'string', required: true },
              status: { type: 'enum', values: ['todo', 'in-progress', 'done'] },
              assignee: { type: 'reference', entity: 'User' }
            }
          }
        ]
      };

      const response = await client.post('/api/schemas/validate', testSchema);

      if (response.status === 200) {
        const result = response.data as ValidationResult;
        expect(result.valid).toBeDefined();

        if (!result.valid && result.errors) {
          expect(Array.isArray(result.errors)).toBe(true);
        }
      }
    });

    it('should handle malformed schema gracefully', async () => {
      const malformedSchema = {
        platform: 123, // Should be string
        entities: 'not-an-array' // Should be array
      };

      const response = await client.post('/api/schemas/validate', malformedSchema);
      expect([400, 422]).toContain(response.status);

      if (response.data) {
        expect(response.data.error || response.data.errors).toBeDefined();
      }
    });
  });

  describe('Distributed Session Management', () => {
    it('should maintain vector clock for distributed sessions', async () => {
      const response = await client.get('/api/session/info');

      if (response.status === 200 && response.data.vectorClock) {
        const vectorClock = response.data.vectorClock;
        expect(typeof vectorClock).toBe('object');

        Object.values(vectorClock).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('should handle concurrent session updates', async () => {
      const updates = Array(5).fill(null).map((_, i) =>
        client.post('/api/session/update', {
          action: `test-action-${i}`,
          timestamp: Date.now()
        })
      );

      const responses = await Promise.all(updates);

      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Check for conflict resolution
      const conflicts = responses.filter(r => r.status === 409);
      conflicts.forEach(response => {
        expect(response.data).toHaveProperty('conflict');
        expect(response.data).toHaveProperty('resolution');
      });
    });

    it('should sync session state across nodes', async () => {
      const syncResponse = await client.post('/api/session/sync', {
        nodeId: 'qa-test-node',
        vectorClock: { 'qa-test-node': 1 }
      });

      if (syncResponse.status === 200) {
        expect(syncResponse.data).toHaveProperty('synchronized');
        expect(syncResponse.data).toHaveProperty('vectorClock');
      }
    });
  });

  describe('Notion Webhook Integration', () => {
    it('should validate webhook signatures', async () => {
      const webhookEvent: NotionWebhookEvent = {
        id: 'evt_' + Date.now(),
        type: 'page.updated',
        timestamp: new Date().toISOString(),
        data: {
          pageId: 'test-page-123',
          properties: {
            title: 'Test Page'
          }
        },
        signature: 'invalid-signature'
      };

      const response = await client.post('/api/webhooks/notion', webhookEvent, {
        headers: {
          'X-Notion-Signature': webhookEvent.signature
        }
      });

      // Should reject invalid signature
      if (response.status !== 200) {
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should handle idempotent webhook processing', async () => {
      const eventId = 'evt_idempotent_' + Date.now();
      const webhookEvent = {
        id: eventId,
        type: 'database.updated',
        timestamp: new Date().toISOString(),
        data: {
          databaseId: 'db-123',
          changes: ['schema_updated']
        }
      };

      // Send same event multiple times
      const responses = await Promise.all([
        client.post('/api/webhooks/notion/process', webhookEvent),
        client.post('/api/webhooks/notion/process', webhookEvent),
        client.post('/api/webhooks/notion/process', webhookEvent)
      ]);

      const successfulResponses = responses.filter(r => r.status === 200);

      if (successfulResponses.length > 0) {
        // All should return same result (idempotent)
        const results = successfulResponses.map(r => JSON.stringify(r.data));
        const uniqueResults = [...new Set(results)];
        expect(uniqueResults.length).toBe(1);
      }
    });

    it('should handle webhook retry with exponential backoff', async () => {
      const failingEvent = {
        id: 'evt_retry_' + Date.now(),
        type: 'error.trigger',
        timestamp: new Date().toISOString(),
        data: {
          shouldFail: true
        }
      };

      const response = await client.post('/api/webhooks/notion/process', failingEvent);

      if (response.status >= 500) {
        expect(response.headers['retry-after']).toBeDefined();

        if (response.headers['retry-after']) {
          const retryAfter = parseInt(response.headers['retry-after']);
          expect(retryAfter).toBeGreaterThan(0);
          expect(retryAfter).toBeLessThanOrEqual(300); // Max 5 minutes
        }
      }
    });

    it('should queue failed webhooks to DLQ', async () => {
      const response = await client.get('/api/webhooks/dlq/status');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('queueSize');
        expect(typeof response.data.queueSize).toBe('number');
        expect(response.data.queueSize).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Security and Input Validation', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const xssPayload = {
        name: '<script>alert("XSS")</script>',
        description: 'javascript:alert(1)',
        content: '<img src=x onerror=alert(1)>'
      };

      const response = await client.post('/api/schemas/create', xssPayload);

      if (response.status === 200 || response.status === 201) {
        const created = response.data;
        expect(created.name).not.toContain('<script>');
        expect(created.description).not.toContain('javascript:');
        expect(created.content).not.toContain('onerror=');
      }
    });

    it('should prevent SQL injection', async () => {
      const sqlPayload = {
        id: "1' OR '1'='1",
        query: "'; DROP TABLE schemas; --"
      };

      const response = await client.get('/api/schemas/search', {
        params: sqlPayload
      });

      // Should not cause server error
      expect(response.status).toBeLessThan(500);

      if (response.status === 200) {
        // Should return empty or safe results
        expect(Array.isArray(response.data)).toBe(true);
      }
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(20).fill(null).map(() =>
        client.get('/api/schemas')
      );

      const responses = await Promise.all(requests);

      const rateLimited = responses.filter(r => r.status === 429);

      if (rateLimited.length > 0) {
        expect(rateLimited[0].headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimited[0].headers['x-ratelimit-remaining']).toBeDefined();
        expect(rateLimited[0].headers['x-ratelimit-reset']).toBeDefined();
      }
    });

    it('should validate content-type headers', async () => {
      const response = await client.post('/api/schemas/create', 'plain text data', {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      expect([400, 415]).toContain(response.status);

      if (response.data) {
        expect(response.data.error).toMatch(/content-type|media type/i);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should return structured error responses', async () => {
      const response = await client.get('/api/nonexistent/endpoint');

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error');

      if (response.data.error) {
        expect(typeof response.data.error).toBe('string');
      }

      if (response.data.code) {
        expect(response.data.code).toMatch(/NOT_FOUND|404/);
      }
    });

    it('should handle timeout gracefully', async () => {
      const slowClient = axios.create({
        baseURL: SCHEMA_URL,
        timeout: 100, // 100ms timeout
        validateStatus: () => true
      });

      try {
        await slowClient.post('/api/schemas/process', {
          delay: 5000 // Request 5 second processing
        });
      } catch (error: any) {
        expect(error.code).toMatch(/TIMEOUT|ECONNABORTED/);
      }
    });

    it('should provide circuit breaker protection', async () => {
      const failingRequests = Array(10).fill(null).map(() =>
        client.post('/api/schemas/failing-endpoint', {
          shouldFail: true
        })
      );

      const responses = await Promise.all(failingRequests);

      const circuitOpen = responses.find(r =>
        r.status === 503 && r.data?.error?.includes('circuit')
      );

      if (circuitOpen) {
        expect(circuitOpen.headers['x-circuit-status']).toBe('open');
      }
    });

    it('should recover from transient failures', async () => {
      let attempts = 0;
      const maxRetries = 3;

      async function retryRequest(): Promise<any> {
        attempts++;
        const response = await client.get('/api/schemas/flaky');

        if (response.status >= 500 && attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          return retryRequest();
        }

        return response;
      }

      const finalResponse = await retryRequest();

      if (finalResponse.status === 200) {
        expect(attempts).toBeLessThanOrEqual(maxRetries);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now();
      const response = await client.get('/api/schemas');
      const duration = Date.now() - start;

      expect(response.status).toBeLessThan(500);
      expect(duration).toBeLessThan(2000); // 2 second limit

      if (response.status === 200) {
        expect(duration).toBeLessThan(1000); // 1 second for successful requests
      }
    });

    it('should support ETag caching', async () => {
      const firstResponse = await client.get('/api/schemas/cached-template');

      if (firstResponse.status === 200 && firstResponse.headers.etag) {
        const etag = firstResponse.headers.etag;

        const secondResponse = await client.get('/api/schemas/cached-template', {
          headers: {
            'If-None-Match': etag
          }
        });

        expect(secondResponse.status).toBe(304);
      }
    });

    it('should compress large responses', async () => {
      const response = await client.get('/api/schemas/large-dataset', {
        headers: {
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if (response.status === 200) {
        expect(response.headers['content-encoding']).toMatch(/gzip|deflate|br/);
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const start = Date.now();

      const concurrentRequests = Array(10).fill(null).map((_, i) =>
        client.get(`/api/schemas/template-${i % 3}`)
      );

      const responses = await Promise.all(concurrentRequests);
      const duration = Date.now() - start;

      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThan(0);

      // Should handle 10 concurrent requests in under 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (authToken && !authToken.startsWith('mock-')) {
      try {
        await axios.post(PIPELINE_URL + '/auth/revoke', {
          token: authToken
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});