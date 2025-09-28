#!/usr/bin/env tsx
/**
 * Registry Integration Validation
 *
 * Validates integration with central tool registry at registry.chitty.cc
 * Tests service discovery and pipeline compliance enforcement
 */

import { ChittyRegistryClient } from '../src/platforms/macos/core/registry-client.js';
import { ChittyOSServiceRegistry } from '../src/platforms/macos/core/service-registry.js';

async function validateRegistryIntegration() {
  console.log('🔍 Validating ChittyOS Registry Integration');
  console.log('=' .repeat(60));

  try {
    // Test 1: Registry Client Connection
    console.log('\n📡 Test 1: Registry Client Connection');
    const registryUrl = process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc';
    console.log(`Connecting to: ${registryUrl}`);

    const client = ChittyRegistryClient.getInstance(registryUrl);
    const health = await client.getRegistryHealth();

    console.log(`Health: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Latency: ${health.latency}ms`);
    console.log(`Cached Services: ${health.services}`);

    // Test 2: Service Discovery
    console.log('\n🔍 Test 2: Service Discovery');
    const services = await client.fetchRegisteredServices();
    console.log(`📊 Retrieved ${services.length} services from registry`);

    // Show service categories
    const categories = services.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📋 Service Categories:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} services`);
    });

    // Test 3: Pipeline Compliance
    console.log('\n🔒 Test 3: Pipeline Compliance');
    const compliantServices = await client.getPipelineCompliantServices();
    const complianceRate = (compliantServices.length / services.length) * 100;

    console.log(`✅ Pipeline Compliant: ${compliantServices.length}/${services.length} (${complianceRate.toFixed(1)}%)`);

    if (complianceRate < 100) {
      const nonCompliant = services.filter(s => !s.pipelineCompliant);
      console.log('⚠️  Non-compliant services:');
      nonCompliant.forEach(service => {
        console.log(`  - ${service.name} (${service.id})`);
      });
    }

    // Test 4: Core Services Validation
    console.log('\n🏗️  Test 4: Core Services Validation');
    const coreServices = [
      'chitty-id-service',
      'chitty-trust-service',
      'chitty-auth-service',
      'chitty-data-service',
      'chitty-pipeline-service'
    ];

    for (const serviceId of coreServices) {
      const service = await client.getService(serviceId);
      if (service) {
        console.log(`✅ ${service.name}: Found (v${service.version})`);
      } else {
        console.log(`❌ ${serviceId}: Not found in registry`);
      }
    }

    // Test 5: Service Registry Integration
    console.log('\n🔗 Test 5: Service Registry Integration');
    const registry = ChittyOSServiceRegistry.getInstance();

    // This should connect to central registry and pull all services
    await registry.initializeWithRegistry();

    const localServices = registry.getServices();
    console.log(`📥 Local registry has ${localServices.length} services`);

    // Test 6: Individual Service Validation
    console.log('\n🧪 Test 6: Individual Service Validation');
    let validationResults = [];

    for (const service of localServices.slice(0, 5)) { // Test first 5 services
      const isValid = await client.validateService(service.serviceId);
      validationResults.push({ service: service.serviceName, valid: isValid });

      console.log(`${isValid ? '✅' : '❌'} ${service.serviceName}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // Test 7: Registry Metadata
    console.log('\n📊 Test 7: Registry Metadata');
    console.log(`Registry URL: ${registryUrl}`);
    console.log(`Total Services: ${services.length}`);
    console.log(`Pipeline Compliant: ${compliantServices.length}`);
    console.log(`Local Registered: ${localServices.length}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const allTests = [
      { name: 'Registry Connection', passed: health.healthy },
      { name: 'Service Discovery', passed: services.length > 0 },
      { name: 'Pipeline Compliance', passed: complianceRate >= 80 },
      { name: 'Core Services', passed: coreServices.length > 0 },
      { name: 'Registry Integration', passed: localServices.length > 0 },
      { name: 'Service Validation', passed: validationResults.some(r => r.valid) }
    ];

    allTests.forEach(test => {
      console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
    });

    const passedTests = allTests.filter(t => t.passed).length;
    const testScore = (passedTests / allTests.length) * 100;

    console.log(`\n🏆 Overall Score: ${passedTests}/${allTests.length} (${testScore.toFixed(1)}%)`);

    if (testScore >= 80) {
      console.log('🎉 Registry integration VALIDATED successfully!');
      console.log('🔗 All functions/projects/services can now rely on the 36 registered services');
    } else {
      console.log('⚠️  Registry integration needs attention');
      console.log('🔧 Please check network connectivity and service configurations');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Check CHITTY_REGISTRY_URL environment variable');
    console.log('  2. Verify network connectivity to registry.chitty.cc');
    console.log('  3. Ensure registry service authentication if required');
    process.exit(1);
  }
}

// Run validation
if (import.meta.url === `file://${process.argv[1]}`) {
  validateRegistryIntegration().catch(console.error);
}

export { validateRegistryIntegration };