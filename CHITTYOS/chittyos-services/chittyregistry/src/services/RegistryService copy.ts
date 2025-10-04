// ChittyOS Registry Service with Schema Authority Integration
// Main service registry with canon.chitty.cc validation

import { NeonService } from './NeonService';
import { SchemaService } from './SchemaService';

interface ServiceRegistration {
  id: string;
  name: string;
  baseUrl: string;
  healthEndpoint?: string;
  version: string;
  type: 'core' | 'extension' | 'integration';
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  endpoints?: {
    primary: string;
    health?: string;
    discovery?: string;
  };
  dependencies?: string[];
  features?: string[];
  metadata?: any;
  registeredAt: string;
  lastSeen?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  schemaValidation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    authoritySignature?: string;
  };
}

interface RegistryStats {
  totalServices: number;
  activeServices: number;
  coreServices: number;
  extensions: number;
  integrations: number;
  healthyServices: number;
  schemaCompliant: number;
  lastUpdate: string;
}

export class RegistryService {
  private neon: NeonService;
  private schema: SchemaService;
  private services: Map<string, ServiceRegistration> = new Map();
  private initialized = false;

  constructor(neon: NeonService) {
    this.neon = neon;
    this.schema = new SchemaService();
    this.initialize();
  }

  private async initialize() {
    try {
      await this.loadServicesFromDatabase();
      await this.registerSelfWithAuthority();
      this.initialized = true;
      console.log('RegistryService initialized with schema authority integration');
    } catch (error) {
      console.error('Failed to initialize RegistryService:', error);
    }
  }

  private async loadServicesFromDatabase() {
    try {
      const result = await this.neon.query(`
        SELECT * FROM services
        WHERE status IN ('active', 'maintenance')
        ORDER BY registered_at DESC
      `);

      result.rows.forEach(row => {
        const service: ServiceRegistration = {
          id: row.id,
          name: row.name,
          baseUrl: row.base_url,
          healthEndpoint: row.health_endpoint,
          version: row.version,
          type: row.type,
          status: row.status,
          registeredAt: row.registered_at,
          lastSeen: row.last_seen,
          healthStatus: row.health_status,
          endpoints: row.endpoints ? JSON.parse(row.endpoints) : undefined,
          dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
          features: row.features ? JSON.parse(row.features) : [],
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        };

        this.services.set(service.id, service);
      });

      console.log(`Loaded ${this.services.size} services from database`);
    } catch (error) {
      console.error('Failed to load services from database:', error);
    }
  }

  private async registerSelfWithAuthority() {
    const registryInfo = {
      id: 'chittyregistry',
      name: 'ChittyRegistry',
      baseUrl: process.env.REGISTRY_BASE_URL || 'http://localhost:3001',
      version: '1.0.0',
      type: 'core',
      features: ['service-discovery', 'health-monitoring', 'schema-validation'],
      endpoints: {
        primary: process.env.REGISTRY_BASE_URL || 'http://localhost:3001',
        health: `${process.env.REGISTRY_BASE_URL || 'http://localhost:3001'}/health`,
        discovery: `${process.env.REGISTRY_BASE_URL || 'http://localhost:3001'}/services`
      }
    };

    const registered = await this.schema.registerWithAuthority(registryInfo);
    if (registered) {
      console.log('✅ Registered with ChittyOS schema authority');
    } else {
      console.log('⚠️  Could not register with schema authority (offline mode)');
    }
  }

  public async registerService(serviceData: any): Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> {
    if (!this.initialized) {
      return { success: false, errors: ['Registry not initialized'] };
    }

    try {
      // Validate against ChittyOS schema authority
      const validation = await this.schema.validateServiceRegistration(serviceData);

      const service: ServiceRegistration = {
        id: serviceData.id || `service_${Date.now()}`,
        name: serviceData.name,
        baseUrl: serviceData.baseUrl,
        healthEndpoint: serviceData.healthEndpoint,
        version: serviceData.version || '1.0.0',
        type: serviceData.type || 'integration',
        status: 'active',
        endpoints: serviceData.endpoints,
        dependencies: serviceData.dependencies || [],
        features: serviceData.features || [],
        metadata: serviceData.metadata || {},
        registeredAt: new Date().toISOString(),
        schemaValidation: validation
      };

      // Save to database
      await this.neon.query(`
        INSERT INTO services (
          id, name, base_url, health_endpoint, version, type, status,
          endpoints, dependencies, features, metadata, registered_at,
          schema_validation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = $2, base_url = $3, health_endpoint = $4, version = $5,
          type = $6, endpoints = $8, dependencies = $9, features = $10,
          metadata = $11, schema_validation = $13, updated_at = NOW()
      `, [
        service.id, service.name, service.baseUrl, service.healthEndpoint,
        service.version, service.type, service.status,
        JSON.stringify(service.endpoints), JSON.stringify(service.dependencies),
        JSON.stringify(service.features), JSON.stringify(service.metadata),
        service.registeredAt, JSON.stringify(validation)
      ]);

      this.services.set(service.id, service);

      return {
        success: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('Failed to register service:', error);
      return { success: false, errors: [error.message] };
    }
  }

  public async getServices(): Promise<ServiceRegistration[]> {
    return Array.from(this.services.values());
  }

  public async getService(id: string): Promise<ServiceRegistration | undefined> {
    return this.services.get(id);
  }

  public async getCanonicalServices() {
    return this.schema.getAllCanonicalServices();
  }

  public async updateServiceHealth(serviceId: string, healthStatus: 'healthy' | 'unhealthy' | 'unknown') {
    const service = this.services.get(serviceId);
    if (service) {
      service.healthStatus = healthStatus;
      service.lastSeen = new Date().toISOString();

      await this.neon.query(`
        UPDATE services
        SET health_status = $1, last_seen = $2
        WHERE id = $3
      `, [healthStatus, service.lastSeen, serviceId]);

      this.services.set(serviceId, service);
    }
  }

  public async getRegistryStats(): Promise<RegistryStats> {
    const services = Array.from(this.services.values());

    return {
      totalServices: services.length,
      activeServices: services.filter(s => s.status === 'active').length,
      coreServices: services.filter(s => s.type === 'core').length,
      extensions: services.filter(s => s.type === 'extension').length,
      integrations: services.filter(s => s.type === 'integration').length,
      healthyServices: services.filter(s => s.healthStatus === 'healthy').length,
      schemaCompliant: services.filter(s => s.schemaValidation?.valid).length,
      lastUpdate: new Date().toISOString()
    };
  }

  public async getSchemaInfo() {
    return this.schema.getSchemaValidationInfo();
  }

  public async refreshSchemas() {
    await this.schema.refreshSchemas();

    // Re-validate all services against updated schemas
    for (const [serviceId, service] of this.services) {
      const validation = await this.schema.validateServiceRegistration(service);
      service.schemaValidation = validation;

      await this.neon.query(`
        UPDATE services
        SET schema_validation = $1
        WHERE id = $2
      `, [JSON.stringify(validation), serviceId]);
    }
  }

  public async validateService(serviceId: string) {
    const service = this.services.get(serviceId);
    if (!service) {
      return { error: 'Service not found' };
    }

    return await this.schema.validateServiceRegistration(service);
  }

  // Health check for the registry itself
  public getHealth() {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      services: this.services.size,
      schemaAuthority: this.schema.getSchemaValidationInfo().schemaAuthority,
      database: this.neon.isConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  }
}