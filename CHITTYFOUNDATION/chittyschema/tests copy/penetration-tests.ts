/**
 * Penetration Testing Suite for ChittyChain Schema API
 * Comprehensive security testing including authentication bypass, injection attacks, and privilege escalation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const SCHEMA_URL = process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001';
const PIPELINE_URL = process.env.CHITTY_ID_PIPELINE_URL || 'http://localhost:3000/pipeline';

interface AttackVector {
  name: string;
  payload: any;
  expectedStatus: number[];
  shouldDetect: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityResult {
  vector: string;
  successful: boolean;
  response: any;
  detected: boolean;
  risk_level: string;
}

describe('ChittyChain Schema Penetration Tests', () => {
  let client: AxiosInstance;
  let attackResults: SecurityResult[] = [];

  beforeAll(async () => {
    client = axios.create({
      baseURL: SCHEMA_URL,
      timeout: 15000,
      validateStatus: () => true // Don't throw on any status
    });

    console.log(`🔒 Penetration testing against: ${SCHEMA_URL}`);
  });

  describe('Authentication Bypass Attempts', () => {
    const authBypassVectors: AttackVector[] = [
      {
        name: 'No Authorization Header',
        payload: {},
        expectedStatus: [401, 403],
        shouldDetect: true,
        severity: 'high'
      },
      {
        name: 'Invalid Token Format',
        payload: { headers: { 'Authorization': 'Bearer invalid-token' } },
        expectedStatus: [401, 403],
        shouldDetect: true,
        severity: 'high'
      },
      {
        name: 'SQL Injection in Auth Header',
        payload: { headers: { 'Authorization': "Bearer '; DROP TABLE users; --" } },
        expectedStatus: [401, 403, 400],
        shouldDetect: true,
        severity: 'critical'
      },
      {
        name: 'JWT None Algorithm Attack',
        payload: { headers: { 'Authorization': 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.' } },
        expectedStatus: [401, 403],
        shouldDetect: true,
        severity: 'critical'
      },
      {
        name: 'ChittyID Header Spoofing',
        payload: { headers: { 'X-ChittyID': 'CHITTY-ADMIN-001', 'Authorization': 'Bearer fake-token' } },
        expectedStatus: [401, 403],
        shouldDetect: true,
        severity: 'high'
      },
      {
        name: 'Session Token Replay',
        payload: { headers: { 'Authorization': 'Bearer expired-session-token-123' } },
        expectedStatus: [401, 403],
        shouldDetect: true,
        severity: 'medium'
      }
    ];

    authBypassVectors.forEach(vector => {
      it(`should prevent ${vector.name}`, async () => {
        const response = await client.get('/api/schemas', vector.payload);

        const result: SecurityResult = {
          vector: vector.name,
          successful: !vector.expectedStatus.includes(response.status),
          response: response.status,
          detected: vector.expectedStatus.includes(response.status),
          risk_level: vector.severity
        };

        attackResults.push(result);

        expect(vector.expectedStatus).toContain(response.status);

        if (response.data?.error) {
          expect(response.data.error).toMatch(/auth|unauthorized|forbidden|invalid/i);
        }
      });
    });

    it('should not leak sensitive information in auth errors', async () => {
      const response = await client.get('/api/admin/users');

      if (response.status >= 400) {
        const errorMessage = response.data?.error || response.data?.message || '';

        // Should not reveal internal paths, stack traces, or system info
        expect(errorMessage).not.toMatch(/\/[a-z]+\/[a-z]+\//); // No file paths
        expect(errorMessage).not.toMatch(/Error: .+ at .+:\d+/); // No stack traces
        expect(errorMessage).not.toMatch(/database|sql|mongodb|postgres/i); // No DB details
        expect(errorMessage).not.toMatch(/internal|system|server|node_modules/i); // No internal details
      }
    });
  });

  describe('Injection Attack Prevention', () => {
    const injectionVectors: AttackVector[] = [
      {
        name: 'SQL Injection in Query Parameters',
        payload: { params: { id: "1' OR '1'='1", search: "'; DROP TABLE schemas; --" } },
        expectedStatus: [400, 422, 200], // Should sanitize or reject
        shouldDetect: true,
        severity: 'critical'
      },
      {
        name: 'NoSQL Injection',
        payload: {
          data: {
            filter: { "$where": "function() { return true; }" },
            query: { "$gt": "" }
          }
        },
        expectedStatus: [400, 422],
        shouldDetect: true,
        severity: 'high'
      },
      {
        name: 'XSS in Request Body',
        payload: {
          data: {
            name: '<script>alert("XSS")</script>',
            description: 'javascript:alert(document.cookie)',
            content: '<img src=x onerror=alert(1)>',
            template: '<svg onload=alert("XSS")>'
          }
        },
        expectedStatus: [400, 422, 200], // Should sanitize
        shouldDetect: true,
        severity: 'high'
      },
      {
        name: 'Command Injection',
        payload: {
          data: {
            filename: 'test.txt; rm -rf /',
            command: '`whoami`',
            path: '../../../etc/passwd'
          }
        },
        expectedStatus: [400, 422],
        shouldDetect: true,
        severity: 'critical'
      },
      {
        name: 'LDAP Injection',
        payload: {
          data: {
            username: 'admin)(|(password=*))',
            filter: '(&(objectClass=user)(|(cn=*)(uid=*)))'
          }
        },
        expectedStatus: [400, 422],
        shouldDetect: true,
        severity: 'medium'
      },
      {
        name: 'Template Injection',
        payload: {
          data: {
            template: '{{constructor.constructor("alert(1)")()}}',
            expression: '${process.exit(1)}',
            ejs: '<%= global.process.mainModule.require("child_process").execSync("id") %>'
          }
        },
        expectedStatus: [400, 422],
        shouldDetect: true,
        severity: 'high'
      }
    ];

    injectionVectors.forEach(vector => {
      it(`should prevent ${vector.name}`, async () => {
        const response = await client.post('/api/schemas/validate', vector.payload.data, {
          params: vector.payload.params
        });

        const result: SecurityResult = {
          vector: vector.name,
          successful: !vector.expectedStatus.includes(response.status),
          response: response.status,
          detected: vector.expectedStatus.includes(response.status),
          risk_level: vector.severity
        };

        attackResults.push(result);

        if (response.status === 200 && response.data) {
          // If request succeeded, ensure dangerous content was sanitized
          const responseStr = JSON.stringify(response.data);
          expect(responseStr).not.toMatch(/<script|javascript:|onerror=|onload=/i);
          expect(responseStr).not.toMatch(/DROP TABLE|DELETE FROM|INSERT INTO/i);
          expect(responseStr).not.toMatch(/\$where|\$gt|\$lt|\$regex/);
        }

        expect(vector.expectedStatus).toContain(response.status);
      });
    });
  });

  describe('DoS and Resource Exhaustion Prevention', () => {
    it('should enforce request size limits', async () => {
      const largePayload = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB payload
        metadata: {
          description: 'a'.repeat(1024 * 1024) // 1MB description
        }
      };

      const response = await client.post('/api/schemas/create', largePayload);

      // Should reject or limit large payloads
      expect([400, 413, 422]).toContain(response.status);

      if (response.data?.error) {
        expect(response.data.error).toMatch(/size|limit|too large|payload/i);
      }
    });

    it('should prevent slow loris attacks', async () => {
      const slowRequests = Array(50).fill(null).map(() =>
        client.post('/api/schemas/slow-endpoint', {
          delay: 30000 // Request 30 second processing
        }, { timeout: 5000 })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(slowRequests);
      const duration = Date.now() - startTime;

      // Should timeout or reject excessive slow requests quickly
      expect(duration).toBeLessThan(10000); // Under 10 seconds

      const rejectedCount = responses.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0); // Some should be rejected/timeout
    });

    it('should handle zip bomb decompression', async () => {
      // Simulated zip bomb payload
      const zipBombPayload = {
        compressed_data: 'UEsDBBQAAAAIAA=='.repeat(1000), // Fake compressed data
        format: 'zip',
        extract: true
      };

      const response = await client.post('/api/schemas/import', zipBombPayload);

      // Should reject suspicious compression ratios
      expect([400, 413, 422]).toContain(response.status);
    });

    it('should rate limit excessive requests', async () => {
      const rapidRequests = Array(100).fill(null).map((_, i) =>
        client.get(`/api/schemas/template-${i % 5}`)
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should rate limit after reasonable threshold
      expect(rateLimited.length).toBeGreaterThan(0);

      if (rateLimited[0]?.headers) {
        expect(rateLimited[0].headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimited[0].headers['retry-after']).toBeDefined();
      }
    });
  });

  describe('Privilege Escalation Attempts', () => {
    it('should prevent horizontal privilege escalation', async () => {
      // Try to access another user's resources
      const response = await client.get('/api/schemas/user/other-user-id/private', {
        headers: {
          'Authorization': 'Bearer mock-user-token',
          'X-ChittyID': 'CHITTY-USER-001'
        }
      });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should prevent vertical privilege escalation', async () => {
      // Try to access admin endpoints with user token
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system/config',
        '/api/admin/schemas/all',
        '/api/admin/logs',
        '/api/admin/metrics'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await client.get(endpoint, {
          headers: {
            'Authorization': 'Bearer mock-user-token',
            'X-ChittyID': 'CHITTY-USER-001',
            'X-Admin-Override': 'true' // Attempt admin override
          }
        });

        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should validate trust level escalation', async () => {
      const escalationAttempts = [
        { 'X-Trust-Level': '100' },
        { 'X-Trust-Level': 'admin' },
        { 'X-Trust-Level': '-1' },
        { 'X-Privilege': 'elevated' },
        { 'X-Role': 'administrator' }
      ];

      for (const headers of escalationAttempts) {
        const response = await client.get('/api/schemas/restricted', {
          headers: {
            'Authorization': 'Bearer mock-user-token',
            ...headers
          }
        });

        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose system information', async () => {
      const response = await client.get('/api/system/info');

      if (response.status === 200 && response.data) {
        const infoStr = JSON.stringify(response.data);

        // Should not expose sensitive system details
        expect(infoStr).not.toMatch(/password|secret|key|token/i);
        expect(infoStr).not.toMatch(/\/home\/|\/usr\/|\/var\/|C:\\/);
        expect(infoStr).not.toMatch(/node_modules|package\.json|\.env/);
        expect(infoStr).not.toMatch(/database.*://|mongodb://|postgres://) ;
      }
    });

    it('should not leak debug information', async () => {
      const response = await client.get('/api/debug/status');

      if (response.status === 200) {
        expect(response.headers['x-debug']).toBeUndefined();
        expect(response.headers['x-powered-by']).toBeUndefined();

        if (response.data) {
          const debugStr = JSON.stringify(response.data);
          expect(debugStr).not.toMatch(/stack|trace|error|exception/i);
        }
      }
    });

    it('should prevent directory traversal', async () => {
      const traversalPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '/proc/version',
        '/var/log/apache2/access.log'
      ];

      for (const path of traversalPaths) {
        const response = await client.get('/api/files/' + encodeURIComponent(path));

        expect([400, 403, 404]).toContain(response.status);

        if (response.data) {
          const content = JSON.stringify(response.data);
          expect(content).not.toMatch(/root:|admin:|password/);
          expect(content).not.toMatch(/Linux|Windows|Microsoft/);
        }
      }
    });

    it('should protect against SSRF attacks', async () => {
      const ssrfTargets = [
        'http://localhost:22',
        'http://127.0.0.1:3306',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal-server/config'
      ];

      for (const target of ssrfTargets) {
        const response = await client.post('/api/webhooks/fetch', {
          url: target
        });

        expect([400, 403, 422]).toContain(response.status);
      }
    });
  });

  describe('Session Security Testing', () => {
    it('should prevent session fixation', async () => {
      const fixedSessionId = 'FIXED-SESSION-123';

      const response = await client.post('/api/auth/login', {
        username: 'testuser',
        password: 'testpass'
      }, {
        headers: {
          'Cookie': `sessionId=${fixedSessionId}`
        }
      });

      if (response.status === 200 && response.headers['set-cookie']) {
        const newSessionCookie = response.headers['set-cookie'][0];
        expect(newSessionCookie).not.toContain(fixedSessionId);
      }
    });

    it('should prevent session replay attacks', async () => {
      const oldSessionToken = 'Bearer old-session-token-123';

      // First request with old token
      const firstResponse = await client.get('/api/schemas', {
        headers: { 'Authorization': oldSessionToken }
      });

      // Simulate session invalidation
      await client.post('/api/auth/logout', {}, {
        headers: { 'Authorization': oldSessionToken }
      });

      // Try to reuse old token
      const replayResponse = await client.get('/api/schemas', {
        headers: { 'Authorization': oldSessionToken }
      });

      expect([401, 403]).toContain(replayResponse.status);
    });

    it('should validate concurrent session limits', async () => {
      const userToken = 'Bearer user-token-123';

      const concurrentSessions = Array(10).fill(null).map(() =>
        client.get('/api/session/create', {
          headers: { 'Authorization': userToken }
        })
      );

      const responses = await Promise.all(concurrentSessions);
      const successful = responses.filter(r => r.status === 200);

      // Should limit concurrent sessions
      expect(successful.length).toBeLessThan(10);
    });
  });

  describe('Cross-Service Attack Prevention', () => {
    it('should prevent webhook signature bypass', async () => {
      const maliciousWebhook = {
        id: 'malicious-event-123',
        type: 'admin.user.created',
        data: {
          userId: 'admin',
          permissions: ['all']
        }
      };

      const response = await client.post('/api/webhooks/notion', maliciousWebhook, {
        headers: {
          'X-Notion-Signature': 'invalid-signature',
          'Content-Type': 'application/json'
        }
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should validate CORS headers properly', async () => {
      const response = await client.options('/api/schemas', {
        headers: {
          'Origin': 'http://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Authorization'
        }
      });

      if (response.status === 200) {
        const corsOrigin = response.headers['access-control-allow-origin'];
        expect(corsOrigin).not.toBe('*');
        expect(corsOrigin).not.toBe('http://malicious-site.com');
      }
    });

    it('should prevent CSP bypass attempts', async () => {
      const response = await client.get('/api/schemas/template/preview');

      if (response.status === 200) {
        const csp = response.headers['content-security-policy'];
        if (csp) {
          expect(csp).toMatch(/script-src/);
          expect(csp).not.toContain("'unsafe-eval'");
          expect(csp).not.toContain("'unsafe-inline'");
        }
      }
    });
  });

  afterAll(async () => {
    // Generate penetration test report
    console.log('\n🔒 Penetration Test Results Summary:');
    console.log('=====================================');

    const totalTests = attackResults.length;
    const successfulAttacks = attackResults.filter(r => r.successful).length;
    const detectedAttacks = attackResults.filter(r => r.detected).length;

    console.log(`Total Attack Vectors Tested: ${totalTests}`);
    console.log(`Successful Attacks (Security Issues): ${successfulAttacks}`);
    console.log(`Detected/Blocked Attacks: ${detectedAttacks}`);
    console.log(`Security Score: ${Math.round((detectedAttacks / totalTests) * 100)}%`);

    // Group by severity
    const criticalIssues = attackResults.filter(r => r.successful && r.risk_level === 'critical');
    const highIssues = attackResults.filter(r => r.successful && r.risk_level === 'high');
    const mediumIssues = attackResults.filter(r => r.successful && r.risk_level === 'medium');

    if (criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL VULNERABILITIES: ${criticalIssues.length}`);
      criticalIssues.forEach(issue => console.log(`  - ${issue.vector}`));
    }

    if (highIssues.length > 0) {
      console.log(`\n⚠️  HIGH RISK VULNERABILITIES: ${highIssues.length}`);
      highIssues.forEach(issue => console.log(`  - ${issue.vector}`));
    }

    if (mediumIssues.length > 0) {
      console.log(`\n🟡 MEDIUM RISK VULNERABILITIES: ${mediumIssues.length}`);
      mediumIssues.forEach(issue => console.log(`  - ${issue.vector}`));
    }

    if (successfulAttacks === 0) {
      console.log('\n✅ No critical security vulnerabilities detected!');
    }
  });
});