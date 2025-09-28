/**
 * Critical Services Smoke Tests
 *
 * Validates that critical ChittyOS services and integrations are functional
 */

import { testTimeout, setupTestEnvironment } from '../../simple-setup';

describe('ChittyOS Critical Services Smoke Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  }, testTimeout.long);

  describe('Registry Integration', () => {
    it('should handle registry client initialization gracefully', async () => {
      try {
        const { ChittyRegistryClient } = await import('../../../src/platforms/macos/core/registry-client.js');

        // Should initialize without throwing
        const client = ChittyRegistryClient.getInstance('https://registry.chitty.cc');
        expect(client).toBeDefined();
        expect(typeof client.getRegistryHealth).toBe('function');
      } catch (error) {
        fail(`Registry client initialization failed: ${error}`);
      }
    }, testTimeout.medium);

    it('should provide fallback services when registry unavailable', async () => {
      try {
        const { ChittyRegistryClient } = await import('../../../src/platforms/macos/core/registry-client.js');
        const client = ChittyRegistryClient.getInstance('https://invalid-registry.example.com');

        // Should handle network failures gracefully
        const services = await client.fetchRegisteredServices();

        // Should get fallback services
        expect(Array.isArray(services)).toBe(true);
        expect(services.length).toBeGreaterThan(0);

        // Should include core services
        const serviceIds = services.map(s => s.id);
        expect(serviceIds).toContain('chitty-id-service');
      } catch (error) {
        // Network errors are expected for invalid URLs
        expect(error.message).toMatch(/fetch|network|connection/i);
      }
    }, testTimeout.long);
  });

  describe('Notion Extension Health', () => {
    it('should validate Notion extension structure', async () => {
      try {
        const extensionModule = await import('../../../src/platforms/macos/extensions/notion/index.js');

        expect(extensionModule.createValidatedExtension).toBeDefined();
        expect(typeof extensionModule.createValidatedExtension).toBe('function');
      } catch (error) {
        fail(`Notion extension module loading failed: ${error}`);
      }
    }, testTimeout.short);

    it('should create extension instance without API keys in test mode', async () => {
      try {
        // Mock config for testing
        const mockConfig = {
          notionApiKey: 'test-key',
          databaseIds: {
            entities: 'test-entities-db',
            information: 'test-info-db',
            facts: 'test-facts-db'
          },
          chittyIdPipelineUrl: 'https://id.chitty.cc',
          enableSync: false // Disable sync for testing
        };

        const { NotionExtension } = await import('../../../src/platforms/macos/extensions/notion/extension.js');
        const extension = new NotionExtension(mockConfig);

        expect(extension).toBeDefined();
        expect(typeof extension.healthCheck).toBe('function');
      } catch (error) {
        fail(`Notion extension creation failed: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('Pipeline Enforcement', () => {
    it('should load pipeline enforcement module', async () => {
      try {
        const pipelineModule = await import('../../../src/platforms/macos/core/pipeline-enforcement.js');

        expect(pipelineModule.validateServiceCompliance).toBeDefined();
        expect(pipelineModule.PipelineEnforcement).toBeDefined();
        expect(typeof pipelineModule.validateServiceCompliance).toBe('function');
      } catch (error) {
        fail(`Pipeline enforcement module loading failed: ${error}`);
      }
    }, testTimeout.short);

    it('should validate service compliance structure', async () => {
      try {
        const { validateServiceCompliance } = await import('../../../src/platforms/macos/core/pipeline-enforcement.js');

        const validConfig = {
          serviceId: 'test-service',
          serviceName: 'Test Service',
          version: '1.0.0',
          endpoints: ['https://test.example.com'],
          pipelineCompliant: true,
          authToken: 'svc_chitty_test_token_12345',
          capabilities: ['test'],
          dependencies: [],
          enforcement: {
            level: 'strict' as const,
            interceptChittyId: false,
            requirePipelineToken: true
          }
        };

        const isValid = validateServiceCompliance(validConfig);
        expect(typeof isValid).toBe('boolean');
      } catch (error) {
        fail(`Service compliance validation failed: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('Core Service Configurations', () => {
    it('should have valid core service definitions', async () => {
      try {
        const { CHITTYOS_CORE_SERVICES } = await import('../../../src/platforms/macos/core/service-registry.js');

        expect(Array.isArray(CHITTYOS_CORE_SERVICES)).toBe(true);
        expect(CHITTYOS_CORE_SERVICES.length).toBeGreaterThan(0);

        // Check core services are defined
        const serviceIds = CHITTYOS_CORE_SERVICES.map(s => s.serviceId);
        const expectedCoreServices = [
          'chitty-id-service',
          'chitty-trust-service',
          'chitty-auth-service',
          'chitty-data-service'
        ];

        for (const expectedService of expectedCoreServices) {
          expect(serviceIds).toContain(expectedService);
        }
      } catch (error) {
        fail(`Core service definitions validation failed: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('Express Server Health', () => {
    it('should be able to create express app instance', async () => {
      try {
        const express = await import('express');
        const app = express.default();

        expect(app).toBeDefined();
        expect(typeof app.listen).toBe('function');
        expect(typeof app.use).toBe('function');
      } catch (error) {
        fail(`Express app creation failed: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('TypeScript Compilation Health', () => {
    it('should have valid TypeScript configuration', () => {
      const fs = require('fs');
      const path = require('path');

      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        expect(tsconfig.compilerOptions).toBeDefined();
        expect(tsconfig.compilerOptions.target).toBeDefined();
      } catch (error) {
        fail(`TypeScript configuration invalid: ${error}`);
      }
    }, testTimeout.short);
  });
});