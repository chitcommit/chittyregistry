/**
 * Basic Health Smoke Tests
 *
 * Quick health checks to verify core ChittyOS components are operational
 */

import { testTimeout, setupTestEnvironment } from '../../simple-setup';

describe('ChittyOS Basic Health Smoke Tests', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  }, testTimeout.long);

  describe('Database Health', () => {
    it('should connect to PostgreSQL database', async () => {
      const pg = await import('pg');
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/test'
      });

      try {
        await client.connect();
        const result = await client.query('SELECT 1 as health');
        expect(result.rows[0].health).toBe(1);
      } finally {
        await client.end();
      }
    }, testTimeout.medium);

    it('should have required registry integration tables', async () => {
      const pg = await import('pg');
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/test'
      });

      try {
        await client.connect();

        const tables = [
          'service_registry',
          'service_health',
          'registry_sync_log',
          'schema_propagation_log',
          'system_configuration'
        ];

        for (const table of tables) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_name = $1
            )
          `, [table]);

          expect(result.rows[0].exists).toBe(true);
        }
      } finally {
        await client.end();
      }
    }, testTimeout.medium);
  });

  describe('Service Registry Health', () => {
    it('should initialize service registry without errors', async () => {
      try {
        const { ChittyOSServiceRegistry } = await import('../../../src/platforms/macos/core/service-registry.js');
        const registry = ChittyOSServiceRegistry.getInstance();

        // Should not throw
        expect(registry).toBeDefined();
        expect(typeof registry.getServices).toBe('function');
      } catch (error) {
        throw new Error(`Service registry initialization failed: ${error}`);
      }
    }, testTimeout.short);

    it('should get services list (even if empty)', async () => {
      try {
        const { ChittyOSServiceRegistry } = await import('../../../src/platforms/macos/core/service-registry.js');
        const registry = ChittyOSServiceRegistry.getInstance();

        const services = registry.getServices();
        expect(Array.isArray(services)).toBe(true);
      } catch (error) {
        throw new Error(`Failed to get services list: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('Schema Propagation Health', () => {
    it('should initialize propagation service without errors', async () => {
      try {
        const { SchemaPropagationService } = await import('../../../src/platforms/macos/core/schema-propagation.js');
        const service = SchemaPropagationService.getInstance();

        expect(service).toBeDefined();
        expect(typeof service.getPropagationStats).toBe('function');
      } catch (error) {
        throw new Error(`Schema propagation service initialization failed: ${error}`);
      }
    }, testTimeout.short);
  });

  describe('Environment Configuration', () => {
    it('should have basic environment variables available', () => {
      // Should have DATABASE_URL for tests
      expect(process.env.DATABASE_URL || process.env.NODE_ENV === 'test').toBeTruthy();
    });

    it('should default registry URL when not configured', () => {
      const registryUrl = process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc';
      expect(registryUrl).toMatch(/^https?:\/\//);
    });
  });

  describe('Module Loading Health', () => {
    it('should load core modules without syntax errors', async () => {
      const modules = [
        '../../../src/platforms/macos/core/service-registry.js',
        '../../../src/platforms/macos/core/schema-propagation.js',
        '../../../src/platforms/macos/core/registry-client.js'
      ];

      for (const modulePath of modules) {
        try {
          await import(modulePath);
        } catch (error) {
          throw new Error(`Failed to load module ${modulePath}: ${error}`);
        }
      }
    }, testTimeout.medium);
  });
});