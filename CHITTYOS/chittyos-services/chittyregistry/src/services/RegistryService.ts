// Core Registry Service - Manages service registration and discovery

import { Service, HealthStatus, ServiceRegistration, DiscoveryQuery, CHITTYOS_SERVICES } from '../types';
import { RedisService } from './RedisService';
import { AuthorityService } from './AuthorityService';
import { logger } from '../utils/logger';

export class RegistryService {
  private static readonly SERVICES_KEY = 'chittyregistry:services';
  private static readonly HEALTH_KEY = 'chittyregistry:health';
  private static readonly SERVICE_TTL = 3600; // 1 hour

  constructor(
    private redis: RedisService,
    private authority: AuthorityService
  ) {}

  /**
   * Register a new service with validation against authorities
   */
  async registerService(registration: ServiceRegistration): Promise<{ success: boolean; errors?: string[] }> {
    const { service, registrationToken } = registration;

    try {
      // 1. Validate registration token with ChittyID
      const tokenValidation = await this.authority.validateRegistrationToken(
        registrationToken,
        service.chittyId
      );

      if (!tokenValidation.valid) {
        return {
          success: false,
          errors: ['Invalid registration token']
        };
      }

      // 2. Validate service schema with ChittySchema
      const schemaValidation = await this.authority.validateServiceSchema(service);
      if (!schemaValidation.valid) {
        return {
          success: false,
          errors: schemaValidation.errors
        };
      }

      // 3. Check if service exists in canonical definitions
      const canonicalService = await this.authority.getCanonicalServiceDefinition(service.serviceName);
      if (canonicalService) {
        // Validate against canonical definition
        const compliance = await this.authority.validateDataStandards(
          service,
          'canonical-service-definition'
        );

        if (!compliance.compliant) {
          logger.warn('Service registration does not match canonical definition', {
            serviceName: service.serviceName,
            issues: compliance.issues
          });
        }
      }

      // 4. Get trust score
      const trustScore = await this.authority.getServiceTrustScore(service.chittyId);

      // 5. Store service registration
      const serviceWithMetadata = {
        ...service,
        registeredAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        trustScore: trustScore?.score || 0,
        trustLevel: trustScore?.level || 'UNVERIFIED',
        registeredBy: tokenValidation.chittyId
      };

      await this.redis.setJSON(
        `${RegistryService.SERVICES_KEY}:${service.serviceName}`,
        serviceWithMetadata,
        RegistryService.SERVICE_TTL
      );

      // 6. Add to service index
      await this.redis.sadd('chittyregistry:service-names', service.serviceName);
      await this.redis.sadd(`chittyregistry:services:${service.category}`, service.serviceName);

      // 7. Initialize health status
      await this.updateHealthStatus(service.serviceName, {
        serviceId: service.serviceName,
        status: 'UNKNOWN',
        lastCheck: new Date().toISOString(),
        responseTime: 0,
        uptime: 0
      });

      logger.info('Service registered successfully', {
        serviceName: service.serviceName,
        chittyId: service.chittyId,
        category: service.category
      });

      return { success: true };

    } catch (error) {
      logger.error('Service registration failed', {
        error: error.message,
        serviceName: service.serviceName
      });
      return {
        success: false,
        errors: ['Internal registration error']
      };
    }
  }

  /**
   * Discover services based on query parameters
   */
  async discoverServices(query: DiscoveryQuery): Promise<Service[]> {
    try {
      let serviceNames: string[] = [];

      if (query.serviceName) {
        // Direct service lookup
        const exists = await this.redis.exists(`${RegistryService.SERVICES_KEY}:${query.serviceName}`);
        serviceNames = exists ? [query.serviceName] : [];
      } else if (query.category) {
        // Category-based lookup
        serviceNames = await this.redis.smembers(`chittyregistry:services:${query.category}`);
      } else {
        // Get all services
        serviceNames = await this.redis.smembers('chittyregistry:service-names');
      }

      // Fetch service details
      const services = await Promise.all(
        serviceNames.map(async (name) => {
          const service = await this.redis.getJSON(`${RegistryService.SERVICES_KEY}:${name}`);
          if (!service) return null;

          // Get current health status
          const health = await this.getHealthStatus(name);

          return {
            ...service,
            currentHealth: health
          };
        })
      );

      let filteredServices = services.filter(Boolean) as Service[];

      // Apply filters
      if (query.capability) {
        filteredServices = filteredServices.filter(service =>
          service.capabilities?.includes(query.capability!)
        );
      }

      if (query.certificationLevel) {
        filteredServices = filteredServices.filter(service =>
          service.certificationLevel === query.certificationLevel
        );
      }

      if (query.healthStatus) {
        filteredServices = filteredServices.filter(service =>
          (service as any).currentHealth?.status === query.healthStatus
        );
      }

      if (!query.includeUnhealthy) {
        filteredServices = filteredServices.filter(service =>
          (service as any).currentHealth?.status === 'HEALTHY'
        );
      }

      return filteredServices;

    } catch (error) {
      logger.error('Service discovery failed', { error: error.message, query });
      return [];
    }
  }

  /**
   * Get a specific service by name
   */
  async getService(serviceName: string): Promise<Service | null> {
    try {
      const service = await this.redis.getJSON(`${RegistryService.SERVICES_KEY}:${serviceName}`);
      if (!service) return null;

      const health = await this.getHealthStatus(serviceName);
      return {
        ...service,
        currentHealth: health
      };
    } catch (error) {
      logger.error('Failed to get service', { error: error.message, serviceName });
      return null;
    }
  }

  /**
   * Update health status for a service
   */
  async updateHealthStatus(serviceName: string, health: HealthStatus): Promise<void> {
    try {
      await this.redis.setJSON(
        `${RegistryService.HEALTH_KEY}:${serviceName}`,
        health,
        300 // 5 minutes TTL
      );

      // Update trust score based on health metrics
      const service = await this.getService(serviceName);
      if (service?.chittyId) {
        await this.authority.updateServiceTrustScore(service.chittyId, {
          uptime: health.uptime || 0,
          responseTime: health.responseTime || 0,
          errorRate: health.details?.errors?.length || 0,
          complianceScore: 100 // TODO: Calculate based on compliance checks
        });
      }
    } catch (error) {
      logger.error('Failed to update health status', {
        error: error.message,
        serviceName,
        health
      });
    }
  }

  /**
   * Get health status for a service
   */
  async getHealthStatus(serviceName: string): Promise<HealthStatus | null> {
    try {
      return await this.redis.getJSON(`${RegistryService.HEALTH_KEY}:${serviceName}`);
    } catch (error) {
      logger.error('Failed to get health status', { error: error.message, serviceName });
      return null;
    }
  }

  /**
   * Deregister a service
   */
  async deregisterService(serviceName: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate deregistration token
      const service = await this.getService(serviceName);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      const tokenValidation = await this.authority.validateRegistrationToken(token, service.chittyId);
      if (!tokenValidation.valid) {
        return { success: false, error: 'Invalid deregistration token' };
      }

      // Remove service data
      await this.redis.del(`${RegistryService.SERVICES_KEY}:${serviceName}`);
      await this.redis.del(`${RegistryService.HEALTH_KEY}:${serviceName}`);

      // Remove from indexes
      await this.redis.srem('chittyregistry:service-names', serviceName);
      await this.redis.srem(`chittyregistry:services:${service.category}`, serviceName);

      logger.info('Service deregistered successfully', { serviceName });
      return { success: true };

    } catch (error) {
      logger.error('Service deregistration failed', { error: error.message, serviceName });
      return { success: false, error: 'Internal deregistration error' };
    }
  }

  /**
   * Bootstrap canonical ChittyOS services
   */
  async bootstrapCanonicalServices(): Promise<void> {
    logger.info('Bootstrapping canonical ChittyOS services...');

    for (const [serviceName, config] of Object.entries(CHITTYOS_SERVICES)) {
      try {
        const existingService = await this.getService(serviceName);
        if (existingService) {
          logger.debug('Service already registered', { serviceName });
          continue;
        }

        // Create canonical service registration
        const canonicalService: Service = {
          chittyId: `chittyos-${serviceName}`,
          serviceName,
          displayName: config.displayName,
          description: config.description,
          version: '1.0.0',
          baseUrl: config.baseUrl,
          endpoints: [],
          healthCheck: {
            path: '/health',
            method: 'GET',
            expectedStatus: 200,
            timeout: 5000
          },
          category: config.category,
          dependencies: [],
          capabilities: config.capabilities,
          metadata: {
            canonical: true,
            bootstrapped: true,
            bootstrappedAt: new Date().toISOString()
          }
        };

        // Store without validation for canonical services
        await this.redis.setJSON(
          `${RegistryService.SERVICES_KEY}:${serviceName}`,
          {
            ...canonicalService,
            registeredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            trustScore: 100, // Canonical services have maximum trust
            trustLevel: 'PLATINUM'
          },
          RegistryService.SERVICE_TTL
        );

        // Add to indexes
        await this.redis.sadd('chittyregistry:service-names', serviceName);
        await this.redis.sadd(`chittyregistry:services:${config.category}`, serviceName);

        logger.info('Canonical service bootstrapped', { serviceName });

      } catch (error) {
        logger.error('Failed to bootstrap canonical service', {
          error: error.message,
          serviceName
        });
      }
    }

    logger.info('Canonical services bootstrap completed');
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalServices: number;
    healthyServices: number;
    servicesByCategory: Record<string, number>;
    authorityHealth: Record<string, HealthStatus>;
  }> {
    try {
      const serviceNames = await this.redis.smembers('chittyregistry:service-names');
      const totalServices = serviceNames.length;

      // Count healthy services
      const healthChecks = await Promise.all(
        serviceNames.map(name => this.getHealthStatus(name))
      );
      const healthyServices = healthChecks.filter(h => h?.status === 'HEALTHY').length;

      // Count services by category
      const servicesByCategory: Record<string, number> = {};
      for (const serviceName of serviceNames) {
        const service = await this.getService(serviceName);
        if (service) {
          servicesByCategory[service.category] = (servicesByCategory[service.category] || 0) + 1;
        }
      }

      // Get authority health
      const authorityHealth = await this.authority.checkAuthorityHealth();

      return {
        totalServices,
        healthyServices,
        servicesByCategory,
        authorityHealth
      };

    } catch (error) {
      logger.error('Failed to get registry stats', { error: error.message });
      throw error;
    }
  }
}