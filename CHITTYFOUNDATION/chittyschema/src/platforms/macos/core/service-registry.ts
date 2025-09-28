/**
 * ChittyOS Service Registry - Pipeline Compliance Management
 *
 * Centralizes service registration and ensures pipeline compliance
 * across all ChittyOS modules and extensions
 */

import { validateServiceCompliance, PipelineEnforcement } from './pipeline-enforcement.js';
import { ChittyRegistryClient, initializeRegistryClient, type RegistryService } from './registry-client.js';

export interface ServiceConfig {
  serviceId: string;
  serviceName: string;
  version: string;
  endpoints: string[];
  pipelineCompliant: boolean;
  authToken: string;
  capabilities: string[];
  dependencies: string[];
  enforcement: {
    level: 'strict' | 'monitor' | 'disabled';
    interceptChittyId: boolean;
    requirePipelineToken: boolean;
  };
}

export class ChittyOSServiceRegistry {
  private static instance: ChittyOSServiceRegistry;
  private services = new Map<string, ServiceConfig>();
  private complianceMonitor = new Map<string, ComplianceStatus>();
  private registryClient: ChittyRegistryClient | null = null;

  static getInstance(): ChittyOSServiceRegistry {
    if (!ChittyOSServiceRegistry.instance) {
      ChittyOSServiceRegistry.instance = new ChittyOSServiceRegistry();
    }
    return ChittyOSServiceRegistry.instance;
  }

  /**
   * Initialize with central registry client
   */
  async initializeWithRegistry(): Promise<void> {
    console.log('🔗 Connecting to central tool registry at registry.chitty.cc...');

    this.registryClient = await initializeRegistryClient();

    // Sync with central registry
    await this.syncWithCentralRegistry();

    console.log('✅ Service registry synchronized with central registry');
  }

  /**
   * Register service with mandatory pipeline compliance check
   */
  async registerService(config: ServiceConfig): Promise<boolean> {
    console.log(`📋 Registering service: ${config.serviceName}`);

    // 1. Validate pipeline compliance
    if (!validateServiceCompliance(config)) {
      console.error(`❌ Service ${config.serviceId} failed compliance validation`);
      return false;
    }

    // 2. Check pipeline enforcement capability
    if (!config.pipelineCompliant) {
      console.error(`❌ Service ${config.serviceId} is not pipeline compliant`);
      return false;
    }

    // 3. Validate service token
    if (!this.validateServiceToken(config.authToken)) {
      console.error(`❌ Service ${config.serviceId} has invalid auth token`);
      return false;
    }

    // 4. Test pipeline endpoints
    const pipelineTestResult = await this.testPipelineEndpoints(config);
    if (!pipelineTestResult.success) {
      console.error(`❌ Service ${config.serviceId} failed pipeline endpoint test:`, pipelineTestResult.errors);
      return false;
    }

    // 5. Register with enforcement system
    PipelineEnforcement.getInstance().registerService(config.serviceId, config.authToken);

    // 6. Store service configuration
    this.services.set(config.serviceId, config);

    // 7. Initialize compliance monitoring
    this.complianceMonitor.set(config.serviceId, {
      serviceId: config.serviceId,
      compliant: true,
      lastCheck: new Date(),
      violations: 0,
      status: 'active'
    });

    console.log(`✅ Service ${config.serviceName} registered successfully`);
    return true;
  }

  /**
   * Sync with central registry at registry.chitty.cc
   */
  private async syncWithCentralRegistry(): Promise<void> {
    if (!this.registryClient) {
      console.warn('⚠️ Registry client not initialized');
      return;
    }

    try {
      console.log('🔄 Syncing with central registry...');

      // Fetch all 36 registered services
      const registryServices = await this.registryClient.fetchRegisteredServices();

      console.log(`📥 Retrieved ${registryServices.length} services from central registry`);

      // Convert registry services to local service configs
      for (const registryService of registryServices) {
        const localConfig = this.convertRegistryServiceToLocal(registryService);

        // Register the service
        await this.registerService(localConfig);
      }

      console.log(`✅ Synchronized ${registryServices.length} services from central registry`);

    } catch (error) {
      console.error('❌ Failed to sync with central registry:', error);
      console.log('🔄 Falling back to default services...');

      // Register default core services as fallback
      await this.registerDefaultServices();
    }
  }

  /**
   * Convert registry service to local config
   */
  private convertRegistryServiceToLocal(registryService: RegistryService): ServiceConfig {
    return {
      serviceId: registryService.id,
      serviceName: registryService.name,
      version: registryService.version,
      endpoints: [registryService.endpoints.primary],
      pipelineCompliant: registryService.pipelineCompliant,
      authToken: process.env[`${registryService.id.toUpperCase().replace(/-/g, '_')}_TOKEN`] || 'default_token',
      capabilities: registryService.capabilities,
      dependencies: registryService.dependencies,
      enforcement: registryService.enforcement
    };
  }

  /**
   * Register default core services as fallback
   */
  private async registerDefaultServices(): Promise<void> {
    const defaultServices = [
      {
        serviceId: 'chitty-id-service',
        serviceName: 'ChittyID Generation Service',
        version: '1.0.0',
        endpoints: [process.env.CHITTY_ID_SERVICE_URL || 'https://id.chitty.cc'],
        pipelineCompliant: true,
        authToken: process.env.CHITTY_ID_SERVICE_TOKEN || 'default_token',
        capabilities: ['id-generation', 'namespace-management'],
        dependencies: [],
        enforcement: { level: 'strict' as const, interceptChittyId: true, requirePipelineToken: true }
      },
      {
        serviceId: 'chitty-trust-service',
        serviceName: 'ChittyTrust Evaluation Service',
        version: '1.0.0',
        endpoints: [process.env.CHITTY_TRUST_SERVICE_URL || 'https://trust.chitty.cc'],
        pipelineCompliant: true,
        authToken: process.env.CHITTY_TRUST_SERVICE_TOKEN || 'default_token',
        capabilities: ['trust-scoring', 'reputation-management'],
        dependencies: ['chitty-id-service'],
        enforcement: { level: 'strict' as const, interceptChittyId: false, requirePipelineToken: true }
      },
      {
        serviceId: 'chitty-auth-service',
        serviceName: 'ChittyAuth Authorization Service',
        version: '1.0.0',
        endpoints: [process.env.CHITTY_AUTH_SERVICE_URL || 'https://auth.chitty.cc'],
        pipelineCompliant: true,
        authToken: process.env.CHITTY_AUTH_SERVICE_TOKEN || 'default_token',
        capabilities: ['authentication', 'authorization', 'session-management'],
        dependencies: ['chitty-trust-service'],
        enforcement: { level: 'strict' as const, interceptChittyId: false, requirePipelineToken: true }
      },
      {
        serviceId: 'chitty-data-service',
        serviceName: 'ChittyData Management Service',
        version: '1.0.0',
        endpoints: [process.env.CHITTY_DATA_SERVICE_URL || 'https://data.chitty.cc'],
        pipelineCompliant: true,
        authToken: process.env.CHITTY_DATA_SERVICE_TOKEN || 'default_token',
        capabilities: ['data-storage', 'entity-management', 'relationships'],
        dependencies: ['chitty-id-service', 'chitty-auth-service'],
        enforcement: { level: 'strict' as const, interceptChittyId: true, requirePipelineToken: true }
      }
    ];

    for (const service of defaultServices) {
      await this.registerService(service);
    }

    console.log(`✅ Registered ${defaultServices.length} default services`);
  }

  /**
   * Get all registered services
   */
  getServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  /**
   * Get compliance status for all services
   */
  getComplianceStatus(): ComplianceReport {
    const services = Array.from(this.complianceMonitor.values());
    const compliant = services.filter(s => s.compliant).length;
    const nonCompliant = services.filter(s => !s.compliant).length;

    return {
      totalServices: services.length,
      compliantServices: compliant,
      nonCompliantServices: nonCompliant,
      complianceRate: services.length > 0 ? (compliant / services.length) * 100 : 0,
      services: services,
      lastUpdate: new Date()
    };
  }

  /**
   * Test pipeline endpoints for a service
   */
  private async testPipelineEndpoints(config: ServiceConfig): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const endpoint of config.endpoints) {
      try {
        // Test if endpoint properly routes through pipeline
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${endpoint}/health`, {
          headers: {
            'X-Pipeline-Test': 'true',
            'Authorization': `Bearer ${config.authToken}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          errors.push(`Endpoint ${endpoint} health check failed: ${response.status}`);
        }

        // Check for pipeline compliance headers
        const pipelineHeader = response.headers.get('X-Pipeline-Compliant');
        if (pipelineHeader !== 'true') {
          errors.push(`Endpoint ${endpoint} missing pipeline compliance header`);
        }

      } catch (error) {
        errors.push(`Endpoint ${endpoint} unreachable: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validate service authentication token
   */
  private validateServiceToken(token: string): boolean {
    // Service tokens must follow specific format
    if (!token.startsWith('svc_chitty_')) {
      return false;
    }

    if (token.length < 32) {
      return false;
    }

    // Additional validation logic
    return true;
  }

  /**
   * Monitor service compliance continuously
   */
  async startComplianceMonitoring(intervalMs: number = 60000): Promise<void> {
    console.log('🔍 Starting service compliance monitoring...');

    setInterval(async () => {
      for (const [serviceId] of this.services.entries()) {
        try {
          const compliance = await this.checkServiceCompliance(serviceId);
          this.updateComplianceStatus(serviceId, compliance);
        } catch (error) {
          console.error(`Failed to check compliance for ${serviceId}:`, error);
        }
      }
    }, intervalMs);
  }

  /**
   * Check individual service compliance
   */
  private async checkServiceCompliance(serviceId: string): Promise<boolean> {
    const config = this.services.get(serviceId);
    if (!config) return false;

    try {
      // Test pipeline compliance
      const testResult = await this.testPipelineEndpoints(config);
      return testResult.success;

    } catch (error) {
      console.error(`Compliance check failed for ${serviceId}:`, error);
      return false;
    }
  }

  /**
   * Update compliance status
   */
  private updateComplianceStatus(serviceId: string, compliant: boolean): void {
    const current = this.complianceMonitor.get(serviceId);
    if (!current) return;

    if (!compliant && current.compliant) {
      console.warn(`⚠️ Service ${serviceId} is no longer compliant`);
    }

    this.complianceMonitor.set(serviceId, {
      ...current,
      compliant,
      lastCheck: new Date(),
      violations: compliant ? current.violations : current.violations + 1,
      status: compliant ? 'active' : 'violation'
    });
  }

  /**
   * Generate service registry configuration for deployment
   */
  generateDeploymentConfig(): ServiceRegistryConfig {
    const services = this.getServices();

    return {
      registry: {
        version: '1.0.0',
        enforcementLevel: 'strict',
        pipelineRequired: true
      },
      services: services.map(service => ({
        id: service.serviceId,
        name: service.serviceName,
        version: service.version,
        endpoints: service.endpoints,
        enforcement: service.enforcement,
        healthCheck: `${service.endpoints[0]}/health`,
        pipelineCompliant: service.pipelineCompliant
      })),
      monitoring: {
        complianceCheckInterval: 60000,
        alertThreshold: 0.95,
        autoRemediation: true
      }
    };
  }
}

// =============================================================================
// STANDARD CHITTYOS SERVICE CONFIGURATIONS
// =============================================================================

export const CHITTYOS_CORE_SERVICES: Partial<ServiceConfig>[] = [
  {
    serviceId: 'chitty-id-service',
    serviceName: 'ChittyID Generation Service',
    capabilities: ['id-generation', 'namespace-management'],
    pipelineCompliant: true,
    enforcement: {
      level: 'strict',
      interceptChittyId: true,
      requirePipelineToken: true
    }
  },
  {
    serviceId: 'chitty-trust-service',
    serviceName: 'ChittyTrust Evaluation Service',
    capabilities: ['trust-scoring', 'reputation-management'],
    pipelineCompliant: true,
    enforcement: {
      level: 'strict',
      interceptChittyId: false,
      requirePipelineToken: true
    }
  },
  {
    serviceId: 'chitty-auth-service',
    serviceName: 'ChittyAuth Authorization Service',
    capabilities: ['authentication', 'authorization', 'session-management'],
    pipelineCompliant: true,
    enforcement: {
      level: 'strict',
      interceptChittyId: false,
      requirePipelineToken: true
    }
  },
  {
    serviceId: 'chitty-data-service',
    serviceName: 'ChittyData Management Service',
    capabilities: ['data-storage', 'entity-management', 'relationships'],
    pipelineCompliant: true,
    enforcement: {
      level: 'strict',
      interceptChittyId: true,
      requirePipelineToken: true
    }
  }
];

// =============================================================================
// TYPES
// =============================================================================

interface ComplianceStatus {
  serviceId: string;
  compliant: boolean;
  lastCheck: Date;
  violations: number;
  status: 'active' | 'violation' | 'suspended';
}

interface ComplianceReport {
  totalServices: number;
  compliantServices: number;
  nonCompliantServices: number;
  complianceRate: number;
  services: ComplianceStatus[];
  lastUpdate: Date;
}

interface ServiceRegistryConfig {
  registry: {
    version: string;
    enforcementLevel: string;
    pipelineRequired: boolean;
  };
  services: Array<{
    id: string;
    name: string;
    version: string;
    endpoints: string[];
    enforcement: any;
    healthCheck: string;
    pipelineCompliant: boolean;
  }>;
  monitoring: {
    complianceCheckInterval: number;
    alertThreshold: number;
    autoRemediation: boolean;
  };
}

/**
 * Initialize service registry with central registry integration
 */
export async function initializeServiceRegistry(): Promise<void> {
  console.log('🏗️ Initializing ChittyOS Service Registry...');

  const registry = ChittyOSServiceRegistry.getInstance();

  // Initialize with central registry at registry.chitty.cc
  await registry.initializeWithRegistry();

  // Start compliance monitoring
  await registry.startComplianceMonitoring();

  console.log('✅ Service registry initialized with central registry integration');
  console.log(`📊 Total services: ${registry.getServices().length}`);
  console.log(`🔗 Connected to: ${process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc'}`);
}