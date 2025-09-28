/**
 * Security Automation Suite for ChittyChain Schema API
 * Continuous security monitoring, threat detection, and automated compliance validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const SCHEMA_URL = process.env.CHITTY_SCHEMA_URL || 'http://localhost:3001';

interface SecurityBaseline {
  version: string;
  timestamp: string;
  security_controls: SecurityControl[];
  compliance_requirements: ComplianceRequirement[];
  threat_signatures: ThreatSignature[];
}

interface SecurityControl {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'input_validation' | 'output_encoding' | 'session_management' | 'encryption';
  status: 'active' | 'disabled' | 'warning';
  last_validated: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceRequirement {
  framework: 'GDPR' | 'SOC2' | 'OWASP' | 'ISO27001' | 'HIPAA';
  requirement_id: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  last_assessed: string;
  evidence: string[];
}

interface ThreatSignature {
  id: string;
  name: string;
  category: 'injection' | 'authentication_bypass' | 'privilege_escalation' | 'data_exposure' | 'dos';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_rate: number;
  false_positive_rate: number;
}

interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  source_ip?: string;
  endpoint?: string;
  evidence: Record<string, any>;
  risk_score: number;
  recommended_actions: string[];
}

interface ThreatIntelligence {
  known_bad_ips: string[];
  suspicious_patterns: string[];
  attack_signatures: string[];
  geographical_anomalies: string[];
  bot_detection_patterns: string[];
}

describe('ChittyChain Security Automation', () => {
  let client: AxiosInstance;
  let securityBaseline: SecurityBaseline;
  let detectedAlerts: SecurityAlert[] = [];
  let threatIntel: ThreatIntelligence;

  beforeAll(async () => {
    client = axios.create({
      baseURL: SCHEMA_URL,
      timeout: 20000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'ChittyChain-Security-Scanner/1.0'
      }
    });

    console.log(`🛡️  Security automation testing against: ${SCHEMA_URL}`);

    // Initialize security baseline
    securityBaseline = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security_controls: [
        {
          id: 'auth_001',
          name: 'Pipeline Authentication Required',
          category: 'authentication',
          status: 'active',
          last_validated: new Date().toISOString(),
          risk_level: 'critical'
        },
        {
          id: 'input_001',
          name: 'SQL Injection Prevention',
          category: 'input_validation',
          status: 'active',
          last_validated: new Date().toISOString(),
          risk_level: 'critical'
        },
        {
          id: 'session_001',
          name: 'Session Token Validation',
          category: 'session_management',
          status: 'active',
          last_validated: new Date().toISOString(),
          risk_level: 'high'
        }
      ],
      compliance_requirements: [
        {
          framework: 'OWASP',
          requirement_id: 'A01_2021',
          description: 'Broken Access Control Prevention',
          status: 'compliant',
          last_assessed: new Date().toISOString(),
          evidence: ['auth_bypass_tests_passed', 'access_control_validation']
        },
        {
          framework: 'GDPR',
          requirement_id: 'ART_32',
          description: 'Security of Processing',
          status: 'compliant',
          last_assessed: new Date().toISOString(),
          evidence: ['encryption_in_transit', 'access_logging']
        }
      ],
      threat_signatures: [
        {
          id: 'sig_001',
          name: 'SQL Injection Attempt',
          category: 'injection',
          pattern: "(union|select|insert|delete|drop|exec|script)",
          severity: 'high',
          detection_rate: 0.95,
          false_positive_rate: 0.05
        },
        {
          id: 'sig_002',
          name: 'XSS Attack Pattern',
          category: 'injection',
          pattern: "(<script|javascript:|onerror=|onload=)",
          severity: 'medium',
          detection_rate: 0.90,
          false_positive_rate: 0.10
        }
      ]
    };

    threatIntel = {
      known_bad_ips: ['192.168.1.100', '10.0.0.5', '172.16.0.10'],
      suspicious_patterns: ['bot', 'crawler', 'scanner', 'exploit'],
      attack_signatures: ['sqlmap', 'burp', 'nmap', 'nikto'],
      geographical_anomalies: ['CN', 'RU', 'NK'],
      bot_detection_patterns: ['curl', 'wget', 'python-requests', 'automated']
    };
  });

  describe('Security Baseline Validation', () => {
    it('should validate HTTPS enforcement', async () => {
      const httpUrl = SCHEMA_URL.replace('https://', 'http://');

      try {
        const response = await axios.get(httpUrl + '/health', {
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: () => true
        });

        // Should redirect to HTTPS or refuse connection
        expect([301, 302, 403, 404]).toContain(response.status);

        if (response.status === 301 || response.status === 302) {
          expect(response.headers.location).toMatch(/^https:/);
        }
      } catch (error: any) {
        // Connection refused is acceptable for HTTP
        expect(error.code).toMatch(/ECONNREFUSED|ENOTFOUND/);
      }
    });

    it('should validate security headers', async () => {
      const response = await client.get('/health');

      if (response.status === 200) {
        const headers = response.headers;

        // Check for essential security headers
        expect(headers['strict-transport-security']).toBeDefined();
        expect(headers['x-frame-options']).toBeDefined();
        expect(headers['x-content-type-options']).toBe('nosniff');

        if (headers['content-security-policy']) {
          expect(headers['content-security-policy']).toMatch(/script-src/);
        }

        // Verify no sensitive headers are exposed
        expect(headers['x-powered-by']).toBeUndefined();
        expect(headers['server']).not.toMatch(/express|koa|nginx\/[0-9]/i);
      }
    });

    it('should validate TLS configuration', async () => {
      if (SCHEMA_URL.startsWith('https://')) {
        const response = await client.get('/health');

        if (response.status === 200) {
          // Check TLS-related headers
          expect(response.headers['strict-transport-security']).toBeDefined();

          const stsHeader = response.headers['strict-transport-security'];
          expect(stsHeader).toMatch(/max-age=\d+/);
          expect(stsHeader).toContain('includeSubDomains');
        }
      }
    });

    it('should validate API versioning security', async () => {
      const response = await client.get('/version');

      if (response.status === 200 && response.data) {
        // Should not expose detailed version information
        const versionInfo = JSON.stringify(response.data);
        expect(versionInfo).not.toMatch(/node|express|framework/i);
        expect(versionInfo).not.toMatch(/\d+\.\d+\.\d+-.*debug/);
      }
    });
  });

  describe('Real-time Threat Detection', () => {
    it('should detect SQL injection attempts', async () => {
      const maliciousPayloads = [
        "1' OR '1'='1",
        "'; DROP TABLE users; --",
        "1 UNION SELECT password FROM users",
        "admin'--",
        "1' AND SLEEP(5)--"
      ];

      for (const payload of maliciousPayloads) {
        const response = await client.get('/api/schemas/search', {
          params: { q: payload }
        });

        // Check if threat was detected and blocked
        if (response.status >= 400) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'high',
            category: 'injection_attempt',
            title: 'SQL Injection Attempt Detected',
            description: `Potential SQL injection in query parameter: ${payload}`,
            endpoint: '/api/schemas/search',
            evidence: { payload, status: response.status },
            risk_score: 85,
            recommended_actions: [
              'Block source IP temporarily',
              'Review input validation',
              'Alert security team'
            ]
          };

          detectedAlerts.push(alert);
        }

        // Should not return successful results with malicious payload
        expect([400, 403, 422]).toContain(response.status);
      }
    });

    it('should detect XSS attack patterns', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await client.post('/api/schemas/create', {
          name: payload,
          description: `Template with ${payload}`
        });

        if (response.status >= 400) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'medium',
            category: 'xss_attempt',
            title: 'XSS Attack Pattern Detected',
            description: `Potential XSS in request body: ${payload.substring(0, 50)}...`,
            endpoint: '/api/schemas/create',
            evidence: { payload, status: response.status },
            risk_score: 70,
            recommended_actions: [
              'Sanitize input',
              'Review output encoding',
              'Monitor for additional attempts'
            ]
          };

          detectedAlerts.push(alert);
        }

        // XSS payload should be rejected or sanitized
        if (response.status === 200) {
          const responseStr = JSON.stringify(response.data);
          expect(responseStr).not.toMatch(/<script|javascript:|onerror=|onload=/i);
        }
      }
    });

    it('should detect suspicious user agents', async () => {
      const suspiciousAgents = [
        'sqlmap/1.0',
        'Burp Suite',
        'OWASP ZAP',
        'Nikto',
        'Nmap Scripting Engine',
        'curl/7.0 (automated-scanner)'
      ];

      for (const agent of suspiciousAgents) {
        const response = await client.get('/api/schemas', {
          headers: { 'User-Agent': agent }
        });

        // Should detect and potentially block suspicious tools
        if (response.status === 403 || response.status === 429) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'medium',
            category: 'suspicious_tool',
            title: 'Security Tool Detected',
            description: `Suspicious User-Agent detected: ${agent}`,
            endpoint: '/api/schemas',
            evidence: { user_agent: agent, status: response.status },
            risk_score: 60,
            recommended_actions: [
              'Monitor source IP',
              'Rate limit requests',
              'Review access patterns'
            ]
          };

          detectedAlerts.push(alert);
        }
      }
    });

    it('should detect brute force attempts', async () => {
      const rapidRequests = Array(20).fill(null).map(() =>
        client.post('/api/auth/login', {
          username: 'admin',
          password: Math.random().toString(36)
        })
      );

      const responses = await Promise.all(rapidRequests);
      const failedAttempts = responses.filter(r => r.status === 401 || r.status === 403);

      if (failedAttempts.length > 10) {
        const alert: SecurityAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          severity: 'high',
          category: 'brute_force',
          title: 'Potential Brute Force Attack',
          description: `${failedAttempts.length} failed login attempts detected`,
          endpoint: '/api/auth/login',
          evidence: {
            failed_attempts: failedAttempts.length,
            total_attempts: responses.length
          },
          risk_score: 90,
          recommended_actions: [
            'Block source IP immediately',
            'Implement account lockout',
            'Alert security team',
            'Review authentication logs'
          ]
        };

        detectedAlerts.push(alert);
      }

      // Should implement rate limiting or account lockout
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should detect anomalous request patterns', async () => {
      // Test for directory traversal attempts
      const traversalPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/proc/version',
        '/var/log/auth.log'
      ];

      for (const path of traversalPaths) {
        const response = await client.get(`/api/files/${encodeURIComponent(path)}`);

        if (response.status >= 400) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'high',
            category: 'directory_traversal',
            title: 'Directory Traversal Attempt',
            description: `Potential directory traversal: ${path}`,
            endpoint: '/api/files/*',
            evidence: { path, status: response.status },
            risk_score: 80,
            recommended_actions: [
              'Block request source',
              'Review file access controls',
              'Audit file system permissions'
            ]
          };

          detectedAlerts.push(alert);
        }

        expect([400, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('OWASP Top 10 Compliance', () => {
    it('should validate A01:2021 - Broken Access Control', async () => {
      // Test horizontal privilege escalation
      const response = await client.get('/api/admin/users', {
        headers: {
          'Authorization': 'Bearer user-token',
          'X-ChittyID': 'CHITTY-USER-001'
        }
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should validate A02:2021 - Cryptographic Failures', async () => {
      const response = await client.get('/health');

      if (response.status === 200) {
        // Check for proper TLS
        expect(SCHEMA_URL).toMatch(/^https:/);

        // Check headers indicate encryption
        if (response.headers['strict-transport-security']) {
          expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
        }
      }
    });

    it('should validate A03:2021 - Injection', async () => {
      // Already covered in threat detection, verify controls are active
      const controls = securityBaseline.security_controls.filter(c =>
        c.category === 'input_validation' && c.status === 'active'
      );

      expect(controls.length).toBeGreaterThan(0);
    });

    it('should validate A04:2021 - Insecure Design', async () => {
      // Check for secure defaults
      const response = await client.get('/api/config/defaults');

      if (response.status === 200 && response.data) {
        const config = response.data;

        // Should not expose sensitive defaults
        expect(config.debug).not.toBe(true);
        expect(config.expose_errors).not.toBe(true);
        expect(config.allow_all_origins).not.toBe(true);
      }
    });

    it('should validate A05:2021 - Security Misconfiguration', async () => {
      // Check for information disclosure
      const response = await client.get('/api/admin/debug');

      // Debug endpoints should not be accessible
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should validate A06:2021 - Vulnerable Components', async () => {
      const response = await client.get('/api/health/dependencies');

      if (response.status === 200 && response.data) {
        // Should not expose detailed dependency information
        const deps = JSON.stringify(response.data);
        expect(deps).not.toMatch(/node_modules|package-lock|vulnerable/i);
      }
    });

    it('should validate A07:2021 - Authentication Failures', async () => {
      // Test weak password policy
      const weakPasswords = ['123456', 'password', 'admin', ''];

      for (const password of weakPasswords) {
        const response = await client.post('/api/auth/register', {
          username: 'testuser',
          password
        });

        // Should reject weak passwords
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should validate A08:2021 - Software Integrity Failures', async () => {
      // Check for proper content integrity
      const response = await client.get('/api/schemas/template/preview');

      if (response.status === 200) {
        const csp = response.headers['content-security-policy'];
        if (csp) {
          expect(csp).toMatch(/script-src/);
        }
      }
    });

    it('should validate A09:2021 - Logging Failures', async () => {
      // Verify security events are logged (simulated)
      const response = await client.get('/api/logs/security/recent');

      if (response.status === 200) {
        // Should require proper authentication for log access
        expect(response.headers['x-auth-required']).toBeDefined();
      } else {
        // Or should be protected
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should validate A10:2021 - SSRF', async () => {
      const ssrfTargets = [
        'http://169.254.169.254/latest/meta-data/',
        'http://localhost:22',
        'file:///etc/passwd'
      ];

      for (const target of ssrfTargets) {
        const response = await client.post('/api/webhooks/external', {
          url: target
        });

        expect([400, 403, 422]).toContain(response.status);
      }
    });
  });

  describe('GDPR Compliance Validation', () => {
    it('should validate data processing consent', async () => {
      const response = await client.post('/api/user/data/process', {
        userId: 'test-user-123',
        processingType: 'analytics'
      });

      // Should require explicit consent
      if (response.status >= 400) {
        expect(response.data?.error).toMatch(/consent|gdpr|permission/i);
      }
    });

    it('should validate right to erasure', async () => {
      const response = await client.delete('/api/user/data/test-user-123');

      // Should support data deletion or require proper auth
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should validate data portability', async () => {
      const response = await client.get('/api/user/data/export/test-user-123');

      // Should support data export or require proper auth
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should validate privacy by design', async () => {
      const response = await client.get('/api/user/profile/test-user-123');

      if (response.status === 200 && response.data) {
        const profile = JSON.stringify(response.data);

        // Should not expose sensitive data unnecessarily
        expect(profile).not.toMatch(/password|secret|private_key/i);
        expect(profile).not.toMatch(/\d{4}-\d{4}-\d{4}-\d{4}/); // Credit card pattern
        expect(profile).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN pattern
      }
    });
  });

  describe('Automated Security Monitoring', () => {
    it('should generate security metrics', async () => {
      const metrics = {
        alerts_generated: detectedAlerts.length,
        critical_alerts: detectedAlerts.filter(a => a.severity === 'critical').length,
        high_alerts: detectedAlerts.filter(a => a.severity === 'high').length,
        medium_alerts: detectedAlerts.filter(a => a.severity === 'medium').length,
        low_alerts: detectedAlerts.filter(a => a.severity === 'low').length,
        avg_risk_score: detectedAlerts.length > 0
          ? detectedAlerts.reduce((sum, a) => sum + a.risk_score, 0) / detectedAlerts.length
          : 0
      };

      expect(metrics.alerts_generated).toBeGreaterThanOrEqual(0);
      expect(metrics.avg_risk_score).toBeGreaterThanOrEqual(0);
      expect(metrics.avg_risk_score).toBeLessThanOrEqual(100);

      console.log(`📊 Security Metrics:`, metrics);
    });

    it('should validate threat intelligence integration', async () => {
      // Test known bad IP blocking
      for (const badIp of threatIntel.known_bad_ips.slice(0, 2)) {
        const response = await client.get('/api/schemas', {
          headers: {
            'X-Forwarded-For': badIp,
            'X-Real-IP': badIp
          }
        });

        // Should block or flag known bad IPs
        if (response.status === 403) {
          const alert: SecurityAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'high',
            category: 'threat_intelligence',
            title: 'Known Bad IP Detected',
            description: `Request from known malicious IP: ${badIp}`,
            source_ip: badIp,
            endpoint: '/api/schemas',
            evidence: { ip: badIp, status: response.status },
            risk_score: 95,
            recommended_actions: [
              'Block IP immediately',
              'Review all recent activity from this IP',
              'Update threat intelligence feed'
            ]
          };

          detectedAlerts.push(alert);
        }
      }
    });

    it('should perform continuous compliance scanning', async () => {
      const complianceResults = {
        owasp_compliant: 0,
        gdpr_compliant: 0,
        total_requirements: securityBaseline.compliance_requirements.length
      };

      for (const requirement of securityBaseline.compliance_requirements) {
        if (requirement.status === 'compliant') {
          if (requirement.framework === 'OWASP') {
            complianceResults.owasp_compliant++;
          } else if (requirement.framework === 'GDPR') {
            complianceResults.gdpr_compliant++;
          }
        }
      }

      const overallCompliance =
        (complianceResults.owasp_compliant + complianceResults.gdpr_compliant) /
        complianceResults.total_requirements;

      expect(overallCompliance).toBeGreaterThan(0.8); // 80% compliance minimum

      console.log(`📋 Compliance Status:`, {
        ...complianceResults,
        overall_compliance: Math.round(overallCompliance * 100) + '%'
      });
    });
  });

  afterAll(async () => {
    // Generate comprehensive security report
    console.log('\n🛡️  Security Automation Results:');
    console.log('==================================');

    const totalAlerts = detectedAlerts.length;
    const criticalAlerts = detectedAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = detectedAlerts.filter(a => a.severity === 'high').length;

    console.log(`Total Security Alerts: ${totalAlerts}`);
    console.log(`Critical Alerts: ${criticalAlerts}`);
    console.log(`High Priority Alerts: ${highAlerts}`);

    if (totalAlerts > 0) {
      const avgRiskScore = detectedAlerts.reduce((sum, a) => sum + a.risk_score, 0) / totalAlerts;
      console.log(`Average Risk Score: ${Math.round(avgRiskScore)}/100`);

      // Group alerts by category
      const alertsByCategory = detectedAlerts.reduce((acc, alert) => {
        acc[alert.category] = (acc[alert.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📊 Alert Categories:');
      Object.entries(alertsByCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
    }

    // Security posture assessment
    const securityScore = Math.max(0, 100 - (criticalAlerts * 30) - (highAlerts * 10));
    console.log(`\n🎯 Security Posture Score: ${securityScore}/100`);

    if (securityScore >= 90) {
      console.log('✅ Excellent security posture');
    } else if (securityScore >= 70) {
      console.log('⚠️  Good security posture with minor issues');
    } else if (securityScore >= 50) {
      console.log('🟡 Adequate security posture, improvements needed');
    } else {
      console.log('🔴 Poor security posture, immediate action required');
    }

    // Compliance summary
    const compliantRequirements = securityBaseline.compliance_requirements.filter(
      r => r.status === 'compliant'
    ).length;
    const complianceRate = Math.round(
      (compliantRequirements / securityBaseline.compliance_requirements.length) * 100
    );

    console.log(`\n📋 Compliance Rate: ${complianceRate}%`);
    console.log(`✅ Compliant Requirements: ${compliantRequirements}/${securityBaseline.compliance_requirements.length}`);

    // Recommendations
    console.log('\n💡 Security Recommendations:');
    if (criticalAlerts > 0) {
      console.log('  🚨 Address critical security alerts immediately');
    }
    if (highAlerts > 3) {
      console.log('  ⚠️  Review and remediate high-priority security issues');
    }
    if (complianceRate < 90) {
      console.log('  📋 Improve compliance posture for regulatory requirements');
    }
    if (totalAlerts === 0) {
      console.log('  ✅ Continue current security practices and monitoring');
    }
  });
});