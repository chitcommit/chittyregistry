// ChittyOS Schema Authority Integration Service
// Connects registry to schema.chitty.cc and canon.chitty.cc

import fetch from 'node-fetch';

interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemaVersion: string;
  authoritySignature?: string;
}

interface CanonicalService {
  id: string;
  name: string;
  subdomain: string;
  type: 'core' | 'extension' | 'integration';
  schema: string;
  version: string;
  authority: string;
  endpoints: {
    primary: string;
    health: string;
    discovery: string;
  };
  dependencies: string[];
  features: string[];
  status: 'active' | 'deprecated' | 'beta';
}

export class SchemaService {
  private schemaAuthority = 'https://schema.chitty.cc';
  private canonAuthority = 'https://canon.chitty.cc';
  private schemasCache: Map<string, any> = new Map();
  private canonicalServices: Map<string, CanonicalService> = new Map();

  constructor() {
    this.initializeSchemas();
  }

  private async initializeSchemas() {
    try {
      await Promise.all([
        this.loadCanonicalServices(),
        this.loadCoreSchemas()
      ]);
    } catch (error) {
      console.error('Failed to initialize schemas:', error);
    }
  }

  private async loadCanonicalServices() {
    try {
      const response = await fetch(`${this.canonAuthority}/services.json`, {
        headers: {
          'User-Agent': 'ChittyOS-Registry/1.0.0',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const services: CanonicalService[] = await response.json();
        services.forEach(service => {
          this.canonicalServices.set(service.id, service);
        });
        console.log(`Loaded ${services.length} canonical services from authority`);
      } else {
        console.warn('Could not load canonical services, using fallback');
        this.loadFallbackServices();
      }
    } catch (error) {
      console.warn('Schema authority not accessible, using fallback services');
      this.loadFallbackServices();
    }
  }

  private loadFallbackServices() {
    // ChittyOS canonical services as fallback
    const fallbackServices: CanonicalService[] = [
      {
        id: 'chittyregistry',
        name: 'ChittyRegistry',
        subdomain: 'registry.chitty.cc',
        type: 'core',
        schema: 'registry-v1',
        version: '1.0.0',
        authority: 'schema.chitty.cc',
        endpoints: {
          primary: 'https://registry.chitty.cc',
          health: 'https://registry.chitty.cc/health',
          discovery: 'https://registry.chitty.cc/services'
        },
        dependencies: [],
        features: ['service-discovery', 'health-monitoring', 'ai-orchestration'],
        status: 'active'
      },
      {
        id: 'chittymcp',
        name: 'ChittyMCP',
        subdomain: 'mcp.chitty.cc',
        type: 'core',
        schema: 'mcp-agent-v1',
        version: '1.0.0',
        authority: 'schema.chitty.cc',
        endpoints: {
          primary: 'https://mcp.chitty.cc',
          health: 'https://mcp.chitty.cc/health',
          discovery: 'https://mcp.chitty.cc/tools'
        },
        dependencies: ['chittyregistry'],
        features: ['ai-orchestration', 'tool-execution', 'cloudflare-integration'],
        status: 'active'
      },
      {
        id: 'chittybridge',
        name: 'ChittyBridge',
        subdomain: 'bridge.chitty.cc',
        type: 'core',
        schema: 'context-bridge-v1',
        version: '1.0.0',
        authority: 'schema.chitty.cc',
        endpoints: {
          primary: 'https://bridge.chitty.cc',
          health: 'https://bridge.chitty.cc/health',
          discovery: 'https://bridge.chitty.cc/sessions'
        },
        dependencies: ['chittyregistry'],
        features: ['session-sync', 'vector-clocks', 'distributed-context'],
        status: 'active'
      },
      {
        id: 'chittyassets',
        name: 'ChittyAssets',
        subdomain: 'assets.chitty.cc',
        type: 'core',
        schema: 'asset-management-v1',
        version: '1.0.0',
        authority: 'schema.chitty.cc',
        endpoints: {
          primary: 'https://assets.chitty.cc',
          health: 'https://assets.chitty.cc/health',
          discovery: 'https://assets.chitty.cc/mcp'
        },
        dependencies: ['chittyregistry'],
        features: ['mcp-authorization', 'oauth21', 'trust-levels'],
        status: 'active'
      }
    ];

    fallbackServices.forEach(service => {
      this.canonicalServices.set(service.id, service);
    });
  }

  private async loadCoreSchemas() {
    const schemaTypes = [
      'registry-v1',
      'mcp-agent-v1',
      'context-bridge-v1',
      'asset-management-v1',
      'service-health-v1'
    ];

    for (const schemaType of schemaTypes) {
      try {
        const response = await fetch(`${this.schemaAuthority}/schemas/${schemaType}.json`);
        if (response.ok) {
          const schema = await response.json();
          this.schemasCache.set(schemaType, schema);
        }
      } catch (error) {
        console.warn(`Could not load schema ${schemaType}:`, error.message);
      }
    }
  }

  public async validateServiceRegistration(serviceData: any): Promise<SchemaValidationResult> {
    const serviceId = serviceData.id || serviceData.name?.toLowerCase();
    const canonical = this.canonicalServices.get(serviceId);

    if (!canonical) {
      return {
        valid: false,
        errors: [`Service ${serviceId} is not in canonical registry`],
        warnings: ['Consider registering with schema.chitty.cc'],
        schemaVersion: 'unknown'
      };
    }

    const schema = this.schemasCache.get(canonical.schema);
    if (!schema) {
      return {
        valid: true,
        errors: [],
        warnings: [`Schema ${canonical.schema} not available for validation`],
        schemaVersion: canonical.version
      };
    }

    // Basic validation against canonical service definition
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!serviceData.baseUrl && !serviceData.endpoints?.primary) {
      errors.push('Service must have baseUrl or primary endpoint');
    }

    if (!serviceData.healthEndpoint && !serviceData.endpoints?.health) {
      warnings.push('Health endpoint recommended for monitoring');
    }

    // Validate subdomain matches canonical
    const providedUrl = serviceData.baseUrl || serviceData.endpoints?.primary;
    if (providedUrl && !providedUrl.includes(canonical.subdomain)) {
      warnings.push(`Expected subdomain ${canonical.subdomain}, got ${providedUrl}`);
    }

    // Validate dependencies
    if (canonical.dependencies.length > 0) {
      canonical.dependencies.forEach(dep => {
        if (!serviceData.dependencies?.includes(dep)) {
          warnings.push(`Missing canonical dependency: ${dep}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schemaVersion: canonical.version,
      authoritySignature: canonical.authority
    };
  }

  public getCanonicalService(serviceId: string): CanonicalService | undefined {
    return this.canonicalServices.get(serviceId);
  }

  public getAllCanonicalServices(): CanonicalService[] {
    return Array.from(this.canonicalServices.values());
  }

  public async refreshSchemas(): Promise<void> {
    this.schemasCache.clear();
    this.canonicalServices.clear();
    await this.initializeSchemas();
  }

  public getSchemaValidationInfo() {
    return {
      schemaAuthority: this.schemaAuthority,
      canonAuthority: this.canonAuthority,
      loadedSchemas: Array.from(this.schemasCache.keys()),
      canonicalServices: Array.from(this.canonicalServices.keys()),
      lastRefresh: new Date().toISOString()
    };
  }

  // Method for registry to register itself with the authority
  public async registerWithAuthority(registryInfo: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.canonAuthority}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ChittyOS-Registry/1.0.0'
        },
        body: JSON.stringify({
          ...registryInfo,
          timestamp: new Date().toISOString(),
          schema: 'registry-v1'
        })
      });

      return response.ok;
    } catch (error) {
      console.warn('Could not register with schema authority:', error.message);
      return false;
    }
  }
}