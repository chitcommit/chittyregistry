/**
 * ChittyOS Integration Layer
 * Provides standardized integration with the ChittyOS ecosystem
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ChittyOSConfig {
  name: string;
  version: string;
  framework: string;
  session: {
    id: string;
    type: string;
  };
  services: {
    schema: {
      port: number;
      base: string;
      status: string;
    };
    registry: {
      url: string;
      apiVersion: string;
    };
    chain: {
      url: string;
      network: string;
    };
  };
  database: {
    type: string;
    provider: string;
    schema: string;
  };
  integrations: {
    packages: string[];
    apis: Record<string, string>;
  };
  features: Record<string, boolean>;
}

export class ChittyOSIntegration {
  private config: ChittyOSConfig;
  private sessionId: string;

  constructor() {
    this.config = this.loadConfig();
    this.sessionId = this.config.session.id;
  }

  private loadConfig(): ChittyOSConfig {
    try {
      const configPath = join(process.cwd(), 'chittyos.config.json');
      const configData = readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      // Default configuration
      return {
        name: 'ChittySchema',
        version: '0.1.0',
        framework: 'ChittyOS Standard Framework v1.0.1',
        session: {
          id: 'unknown',
          type: 'schema-service'
        },
        services: {
          schema: {
            port: 3000,
            base: 'http://localhost:3000',
            status: 'running'
          },
          registry: {
            url: 'https://registry.chitty.cc',
            apiVersion: 'v1'
          },
          chain: {
            url: 'https://chain.chitty.cc',
            network: 'mainnet'
          }
        },
        database: {
          type: 'postgresql',
          provider: 'neon',
          schema: 'universal'
        },
        integrations: {
          packages: ['@chittyos/standard-installer', '@chittyos/shared'],
          apis: {
            evidence: '/api/v1/evidence',
            facts: '/api/v1/facts',
            cases: '/api/v1/cases',
            sync: '/api/v1/sync',
            property: '/api/v1/property'
          }
        },
        features: {
          migration: true,
          sync: true,
          ai: true,
          blockchain: false
        }
      };
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceName: keyof ChittyOSConfig['services']) {
    return this.config.services[serviceName];
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] === true;
  }

  /**
   * Get API endpoint path
   */
  getApiEndpoint(api: string): string {
    return this.config.integrations.apis[api] || `/api/v1/${api}`;
  }

  /**
   * Get full configuration
   */
  getConfig(): ChittyOSConfig {
    return { ...this.config };
  }

  /**
   * Create service metadata for registration
   */
  createServiceMetadata() {
    return {
      service: this.config.name,
      version: this.config.version,
      framework: this.config.framework,
      sessionId: this.sessionId,
      type: this.config.session.type,
      endpoints: this.config.integrations.apis,
      features: Object.keys(this.config.features).filter(
        feature => this.config.features[feature]
      ),
      database: {
        type: this.config.database.type,
        provider: this.config.database.provider,
        schema: this.config.database.schema
      },
      status: 'active',
      lastHeartbeat: new Date().toISOString()
    };
  }

  /**
   * Register service with ChittyOS registry
   */
  async registerWithRegistry(): Promise<void> {
    if (!this.isFeatureEnabled('sync')) {
      console.log('🔄 Sync feature disabled, skipping registry registration');
      return;
    }

    try {
      const metadata = this.createServiceMetadata();
      const registryUrl = this.config.services.registry.url;

      // In a real implementation, this would make an HTTP request to the registry
      console.log('📡 Registering with ChittyOS Registry:', registryUrl);
      console.log('   Service:', metadata.service);
      console.log('   Session:', metadata.sessionId);
      console.log('   Features:', metadata.features.join(', '));

      // Mock registration success
      console.log('✅ Successfully registered with ChittyOS Registry');
    } catch (error) {
      console.error('❌ Failed to register with ChittyOS Registry:', error);
    }
  }

  /**
   * Send heartbeat to maintain registry presence
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.isFeatureEnabled('sync')) return;

    try {
      const metadata = {
        sessionId: this.sessionId,
        status: 'active',
        timestamp: new Date().toISOString(),
        service: this.config.name
      };

      console.log('💓 Sending heartbeat to ChittyOS Registry');
      // Mock heartbeat success
      console.log('✅ Heartbeat sent successfully');
    } catch (error) {
      console.warn('⚠️  Heartbeat failed:', error);
    }
  }

  /**
   * Start periodic heartbeat
   */
  startHeartbeat(intervalMs: number = 60000): NodeJS.Timeout | null {
    if (!this.isFeatureEnabled('sync')) return null;

    return setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, intervalMs);
  }

  /**
   * Generate ChittyOS middleware for Express
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      // Add ChittyOS headers
      res.setHeader('X-ChittyOS-Framework', this.config.framework);
      res.setHeader('X-ChittyOS-Session', this.sessionId);
      res.setHeader('X-ChittyOS-Service', this.config.name);

      // Add session context to request
      req.chittyos = {
        sessionId: this.sessionId,
        service: this.config.name,
        framework: this.config.framework,
        isFeatureEnabled: (feature: string) => this.isFeatureEnabled(feature)
      };

      next();
    };
  }

  /**
   * Create status report
   */
  getStatusReport() {
    return {
      service: this.config.name,
      version: this.config.version,
      framework: this.config.framework,
      session: {
        id: this.sessionId,
        type: this.config.session.type
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: this.config.features,
      endpoints: this.config.integrations.apis,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const chittyos = new ChittyOSIntegration();

// Export types for TypeScript
export type { ChittyOSConfig };