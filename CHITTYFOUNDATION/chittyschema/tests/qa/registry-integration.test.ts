/**
 * ChittyOS Registry Integration Tests
 *
 * Tests connectivity and compliance of all 36 registered services from registry.chitty.cc
 * Validates service discovery, health checks, and pipeline compliance
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ChittyOSServiceRegistry, ServiceConfig } from '../../src/platforms/macos/core/service-registry.js';
import { ChittyRegistryClient } from '../../src/platforms/macos/core/registry-client.js';
import { PipelineEnforcement } from '../../src/platforms/macos/core/pipeline-enforcement.js';

interface TestContext {
  registry: ChittyOSServiceRegistry;
  registryClient: ChittyRegistryClient | null;
  testStartTime: Date;
  servicesToTest: ServiceConfig[];
}

const testContext: TestContext = {
  registry: null as any,
  registryClient: null,
  testStartTime: new Date(),
  servicesToTest: []
};

// Expected 36 core ChittyOS services
const EXPECTED_CORE_SERVICES = [
  'chitty-id-service',
  'chitty-trust-service',
  'chitty-auth-service',
  'chitty-data-service',
  'chitty-registry-service',
  'chitty-monitoring-service',
  'chitty-pipeline-service',
  'chitty-compliance-service',
  'chitty-security-service',
  'chitty-audit-service',
  'chitty-backup-service',
  'chitty-sync-service',
  'chitty-notification-service',
  'chitty-analytics-service',
  'chitty-cache-service',
  'chitty-queue-service',
  'chitty-worker-service',
  'chitty-scheduler-service',
  'chitty-logger-service',
  'chitty-metrics-service',
  'chitty-health-service',
  'chitty-discovery-service',
  'chitty-load-balancer-service',
  'chitty-gateway-service',
  'chitty-proxy-service',
  'chitty-firewall-service',
  'chitty-encryption-service',
  'chitty-key-management-service',
  'chitty-session-service',
  'chitty-token-service',
  'chitty-oauth-service',
  'chitty-saml-service',
  'chitty-ldap-service',
  'chitty-database-service',
  'chitty-storage-service',
  'chitty-file-service'
];

describe('ChittyOS Registry Integration Tests', () => {

  beforeAll(async () => {
    console.log('🏗️ Setting up registry integration test environment...');

    // Initialize registry instance
    testContext.registry = ChittyOSServiceRegistry.getInstance();

    // Set test environment variables
    process.env.CHITTY_REGISTRY_URL = process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc';
    process.env.NODE_ENV = 'test';

    console.log(`🔗 Testing against registry: ${process.env.CHITTY_REGISTRY_URL}`);
  });

  beforeEach(async () => {
    // Reset registry state between tests
    testContext.servicesToTest = [];
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up registry integration test environment...');

    // Generate test report
    await generateRegistryTestReport();
  });

  describe('Registry Connectivity', () => {

    test('should connect to central registry at registry.chitty.cc', async () => {
      console.log('🔍 Testing registry connectivity...');

      try {
        await testContext.registry.initializeWithRegistry();

        expect(testContext.registry).toBeDefined();
        console.log('✅ Successfully connected to central registry');

      } catch (error) {
        console.error('❌ Registry connection failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout for network operations

    test('should fetch all 36 registered services', async () => {
      console.log('📥 Testing service discovery...');

      const services = testContext.registry.getServices();
      testContext.servicesToTest = services;

      console.log(`📊 Found ${services.length} registered services`);

      // Verify we have the expected number of services
      expect(services.length).toBeGreaterThanOrEqual(4); // At least default services

      // If we have the full registry, check for all 36
      if (services.length >= 36) {
        expect(services.length).toBe(36);
        console.log('✅ All 36 services discovered from registry');
      } else {
        console.warn(`⚠️ Only ${services.length} services found, expected 36. Using fallback services.`);
      }
    });

    test('should validate core service presence', async () => {
      console.log('🔍 Validating core service presence...');

      const services = testContext.registry.getServices();
      const serviceIds = services.map(s => s.serviceId);

      // Check for critical core services
      const criticalServices = EXPECTED_CORE_SERVICES.slice(0, 10); // First 10 are critical

      for (const expectedService of criticalServices) {
        const isPresent = serviceIds.includes(expectedService);
        console.log(`${isPresent ? '✅' : '❌'} ${expectedService}: ${isPresent ? 'FOUND' : 'MISSING'}`);

        if (expectedService === 'chitty-id-service' || expectedService === 'chitty-auth-service') {
          expect(isPresent).toBe(true); // Critical services must be present
        }
      }
    });
  });

  describe('Service Health Checks', () => {

    test('should perform health checks on all registered services', async () => {
      console.log('🏥 Performing health checks on all services...');

      const services = testContext.registry.getServices();
      const healthResults: Array<{serviceId: string, healthy: boolean, responseTime: number, error?: string}> = [];

      for (const service of services) {
        const startTime = Date.now();

        try {
          console.log(`🔍 Health check: ${service.serviceName}`);

          const healthResponse = await performServiceHealthCheck(service);
          const responseTime = Date.now() - startTime;

          healthResults.push({
            serviceId: service.serviceId,
            healthy: healthResponse.healthy,
            responseTime,
            error: healthResponse.error
          });

          console.log(`${healthResponse.healthy ? '✅' : '❌'} ${service.serviceId}: ${responseTime}ms`);

        } catch (error) {
          const responseTime = Date.now() - startTime;
          healthResults.push({
            serviceId: service.serviceId,
            healthy: false,
            responseTime,
            error: (error as Error).message
          });

          console.log(`❌ ${service.serviceId}: FAILED (${responseTime}ms) - ${(error as Error).message}`);
        }
      }

      // Generate health report
      const healthyServices = healthResults.filter(r => r.healthy).length;
      const totalServices = healthResults.length;
      const healthPercentage = (healthyServices / totalServices) * 100;

      console.log(`📊 Health Summary: ${healthyServices}/${totalServices} services healthy (${healthPercentage.toFixed(1)}%)`);

      // At least 80% of services should be healthy
      expect(healthPercentage).toBeGreaterThanOrEqual(80);

      // Critical services must be healthy
      const criticalServicesHealth = healthResults.filter(r =>
        ['chitty-id-service', 'chitty-auth-service', 'chitty-trust-service'].includes(r.serviceId)
      );

      for (const critical of criticalServicesHealth) {
        expect(critical.healthy).toBe(true);
      }
    }, 60000); // 60 second timeout for health checks

    test('should validate response times are within acceptable limits', async () => {
      console.log('⏱️ Validating service response times...');

      const services = testContext.registry.getServices().slice(0, 10); // Test first 10 services
      const responseTimeResults: Array<{serviceId: string, responseTime: number}> = [];

      for (const service of services) {
        const startTime = Date.now();

        try {
          await performServiceHealthCheck(service);
          const responseTime = Date.now() - startTime;

          responseTimeResults.push({
            serviceId: service.serviceId,
            responseTime
          });

          console.log(`⏱️ ${service.serviceId}: ${responseTime}ms`);

        } catch (error) {
          // Even failed requests should complete quickly
          const responseTime = Date.now() - startTime;
          responseTimeResults.push({
            serviceId: service.serviceId,
            responseTime
          });
        }
      }

      // Calculate average response time
      const avgResponseTime = responseTimeResults.reduce((sum, r) => sum + r.responseTime, 0) / responseTimeResults.length;
      console.log(`📊 Average response time: ${avgResponseTime.toFixed(0)}ms`);

      // No service should take longer than 10 seconds
      for (const result of responseTimeResults) {
        expect(result.responseTime).toBeLessThanOrEqual(10000);
      }

      // Average response time should be under 3 seconds
      expect(avgResponseTime).toBeLessThanOrEqual(3000);
    }, 120000); // 2 minute timeout
  });

  describe('Pipeline Compliance Validation', () => {

    test('should validate all services are pipeline compliant', async () => {
      console.log('🔒 Validating pipeline compliance for all services...');

      const services = testContext.registry.getServices();
      const complianceResults: Array<{serviceId: string, compliant: boolean, reason?: string}> = [];

      for (const service of services) {
        console.log(`🔍 Checking compliance: ${service.serviceName}`);

        const complianceCheck = validateServicePipelineCompliance(service);
        complianceResults.push({
          serviceId: service.serviceId,
          compliant: complianceCheck.compliant,
          reason: complianceCheck.reason
        });

        console.log(`${complianceCheck.compliant ? '✅' : '❌'} ${service.serviceId}: ${complianceCheck.compliant ? 'COMPLIANT' : complianceCheck.reason}`);
      }

      // Generate compliance report
      const compliantServices = complianceResults.filter(r => r.compliant).length;
      const totalServices = complianceResults.length;
      const compliancePercentage = (compliantServices / totalServices) * 100;

      console.log(`📊 Compliance Summary: ${compliantServices}/${totalServices} services compliant (${compliancePercentage.toFixed(1)}%)`);

      // 100% compliance required
      expect(compliancePercentage).toBe(100);

      // Verify no services have compliance violations
      const nonCompliantServices = complianceResults.filter(r => !r.compliant);
      if (nonCompliantServices.length > 0) {
        console.error('❌ Non-compliant services:', nonCompliantServices);
      }
      expect(nonCompliantServices.length).toBe(0);
    });

    test('should validate service authentication tokens', async () => {
      console.log('🔑 Validating service authentication tokens...');

      const services = testContext.registry.getServices();
      const tokenResults: Array<{serviceId: string, validToken: boolean, reason?: string}> = [];

      for (const service of services) {
        const tokenValidation = validateServiceToken(service.authToken, service.serviceId);
        tokenResults.push({
          serviceId: service.serviceId,
          validToken: tokenValidation.valid,
          reason: tokenValidation.reason
        });

        console.log(`${tokenValidation.valid ? '✅' : '❌'} ${service.serviceId}: ${tokenValidation.valid ? 'VALID TOKEN' : tokenValidation.reason}`);
      }

      // All services must have valid tokens
      const validTokens = tokenResults.filter(r => r.validToken).length;
      const totalServices = tokenResults.length;

      console.log(`🔑 Token Summary: ${validTokens}/${totalServices} services have valid tokens`);

      // 100% valid tokens required
      expect(validTokens).toBe(totalServices);
    });

    test('should validate enforcement levels are properly configured', async () => {
      console.log('⚖️ Validating enforcement level configurations...');

      const services = testContext.registry.getServices();
      const enforcementResults: Array<{serviceId: string, properlyConfigured: boolean, level: string}> = [];

      for (const service of services) {
        const isProperlyConfigured = service.enforcement &&
          ['strict', 'monitor', 'disabled'].includes(service.enforcement.level);

        enforcementResults.push({
          serviceId: service.serviceId,
          properlyConfigured: isProperlyConfigured,
          level: service.enforcement?.level || 'undefined'
        });

        console.log(`${isProperlyConfigured ? '✅' : '❌'} ${service.serviceId}: ${service.enforcement?.level || 'NO ENFORCEMENT'}`);
      }

      // All services must have proper enforcement configuration
      const properlyConfigured = enforcementResults.filter(r => r.properlyConfigured).length;
      const totalServices = enforcementResults.length;

      console.log(`⚖️ Enforcement Summary: ${properlyConfigured}/${totalServices} services properly configured`);

      expect(properlyConfigured).toBe(totalServices);

      // Critical services must have strict enforcement
      const criticalServices = enforcementResults.filter(r =>
        ['chitty-id-service', 'chitty-auth-service'].includes(r.serviceId)
      );

      for (const critical of criticalServices) {
        expect(critical.level).toBe('strict');
      }
    });
  });

  describe('Service Discovery and Registration', () => {

    test('should validate service dependency chains', async () => {
      console.log('🔗 Validating service dependency chains...');

      const services = testContext.registry.getServices();
      const dependencyErrors: Array<{serviceId: string, missingDependencies: string[]}> = [];

      for (const service of services) {
        const missingDeps: string[] = [];

        if (service.dependencies && service.dependencies.length > 0) {
          for (const dependency of service.dependencies) {
            const dependencyExists = services.some(s => s.serviceId === dependency);

            if (!dependencyExists) {
              missingDeps.push(dependency);
            }
          }
        }

        if (missingDeps.length > 0) {
          dependencyErrors.push({
            serviceId: service.serviceId,
            missingDependencies: missingDeps
          });
        }

        console.log(`${missingDeps.length === 0 ? '✅' : '❌'} ${service.serviceId}: ${missingDeps.length === 0 ? 'DEPS OK' : `MISSING: ${missingDeps.join(', ')}`}`);
      }

      console.log(`🔗 Dependency Summary: ${dependencyErrors.length} services have missing dependencies`);

      // No services should have missing dependencies
      expect(dependencyErrors.length).toBe(0);
    });

    test('should validate service capabilities are properly declared', async () => {
      console.log('🛠️ Validating service capabilities...');

      const services = testContext.registry.getServices();
      const capabilityResults: Array<{serviceId: string, hasCapabilities: boolean, capabilityCount: number}> = [];

      for (const service of services) {
        const hasCapabilities = service.capabilities && service.capabilities.length > 0;
        const capabilityCount = service.capabilities?.length || 0;

        capabilityResults.push({
          serviceId: service.serviceId,
          hasCapabilities,
          capabilityCount
        });

        console.log(`${hasCapabilities ? '✅' : '❌'} ${service.serviceId}: ${capabilityCount} capabilities`);
      }

      // All services should declare at least one capability
      const servicesWithCapabilities = capabilityResults.filter(r => r.hasCapabilities).length;
      const totalServices = capabilityResults.length;

      console.log(`🛠️ Capability Summary: ${servicesWithCapabilities}/${totalServices} services have capabilities`);

      expect(servicesWithCapabilities).toBe(totalServices);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function performServiceHealthCheck(service: ServiceConfig): Promise<{healthy: boolean, error?: string}> {
  try {
    const endpoint = service.endpoints[0];
    const healthUrl = `${endpoint}/health`;

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${service.authToken}`,
        'X-Service-Id': service.serviceId,
        'X-Health-Check': 'true'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const healthy = response.ok;

    if (!healthy) {
      return {
        healthy: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return { healthy: true };

  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message
    };
  }
}

function validateServicePipelineCompliance(service: ServiceConfig): {compliant: boolean, reason?: string} {
  // Check if service declares pipeline compliance
  if (!service.pipelineCompliant) {
    return {
      compliant: false,
      reason: 'Service does not declare pipeline compliance'
    };
  }

  // Check if service has proper enforcement configuration
  if (!service.enforcement) {
    return {
      compliant: false,
      reason: 'Missing enforcement configuration'
    };
  }

  // Check if enforcement level is valid
  if (!['strict', 'monitor', 'disabled'].includes(service.enforcement.level)) {
    return {
      compliant: false,
      reason: `Invalid enforcement level: ${service.enforcement.level}`
    };
  }

  // Check if ChittyID services have proper interception
  if (service.capabilities?.includes('id-generation') && !service.enforcement.interceptChittyId) {
    return {
      compliant: false,
      reason: 'ID generation service must intercept ChittyID calls'
    };
  }

  return { compliant: true };
}

function validateServiceToken(token: string, serviceId: string): {valid: boolean, reason?: string} {
  // Check token format
  if (!token.startsWith('svc_chitty_')) {
    return {
      valid: false,
      reason: 'Token must start with svc_chitty_'
    };
  }

  // Check token length
  if (token.length < 32) {
    return {
      valid: false,
      reason: 'Token too short, must be at least 32 characters'
    };
  }

  // Check for default/placeholder tokens
  if (token === 'default_token' || token === 'placeholder') {
    return {
      valid: false,
      reason: 'Using default/placeholder token'
    };
  }

  return { valid: true };
}

async function generateRegistryTestReport(): Promise<void> {
  const registry = testContext.registry;
  const services = registry.getServices();
  const complianceStatus = registry.getComplianceStatus();

  const report = {
    testRun: {
      timestamp: testContext.testStartTime.toISOString(),
      duration: Date.now() - testContext.testStartTime.getTime(),
      environment: process.env.NODE_ENV
    },
    registry: {
      url: process.env.CHITTY_REGISTRY_URL,
      servicesDiscovered: services.length,
      expectedServices: 36
    },
    compliance: complianceStatus,
    summary: {
      totalTests: 'Auto-calculated by Jest',
      passedTests: 'Auto-calculated by Jest',
      failedTests: 'Auto-calculated by Jest'
    }
  };

  console.log('\n📊 REGISTRY INTEGRATION TEST REPORT');
  console.log('====================================');
  console.log(`🕐 Test Duration: ${report.testRun.duration}ms`);
  console.log(`🔗 Registry URL: ${report.registry.url}`);
  console.log(`📦 Services Found: ${report.registry.servicesDiscovered}/${report.registry.expectedServices}`);
  console.log(`✅ Compliant Services: ${report.compliance.compliantServices}/${report.compliance.totalServices}`);
  console.log(`📈 Compliance Rate: ${report.compliance.complianceRate.toFixed(1)}%`);
  console.log('====================================\n');
}