// Authority Service Integration - Connects to schema.chitty.cc, canon.chitty.cc, etc.

import axios, { AxiosInstance } from 'axios';
import { Service, HealthStatus, AuthorityServices } from '../types';
import { logger } from '../utils/logger';

export class AuthorityService {
  private schemaClient: AxiosInstance;
  private canonClient: AxiosInstance;
  private idClient: AxiosInstance;
  private trustClient: AxiosInstance;

  constructor(private authorities: AuthorityServices) {
    this.schemaClient = axios.create({
      baseURL: authorities.chittySchema.url,
      timeout: 5000,
      headers: { 'User-Agent': 'ChittyRegistry/1.0' }
    });

    this.canonClient = axios.create({
      baseURL: authorities.chittyCanon.url,
      timeout: 5000,
      headers: { 'User-Agent': 'ChittyRegistry/1.0' }
    });

    this.idClient = axios.create({
      baseURL: authorities.chittyId.url,
      timeout: 5000,
      headers: { 'User-Agent': 'ChittyRegistry/1.0' }
    });

    this.trustClient = axios.create({
      baseURL: authorities.chittyTrust.url,
      timeout: 5000,
      headers: { 'User-Agent': 'ChittyRegistry/1.0' }
    });
  }

  /**
   * Validate service registration against ChittySchema
   */
  async validateServiceSchema(service: Service): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await this.schemaClient.post(
        this.authorities.chittySchema.endpoints.validateSchema,
        {
          schemaType: 'service-registration',
          data: service
        }
      );

      return {
        valid: response.data.valid,
        errors: response.data.errors
      };
    } catch (error) {
      logger.error('Schema validation failed', { error: error.message, service: service.serviceName });
      return {
        valid: false,
        errors: ['Schema validation service unavailable']
      };
    }
  }

  /**
   * Get canonical service definitions from ChittyCanon
   */
  async getCanonicalServiceDefinition(serviceName: string): Promise<Service | null> {
    try {
      const response = await this.canonClient.get(
        `${this.authorities.chittyCanon.endpoints.getCanonical}/services/${serviceName}`
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('Failed to get canonical service definition', {
        error: error.message,
        serviceName
      });
      throw error;
    }
  }

  /**
   * Validate registration token with ChittyID
   */
  async validateRegistrationToken(token: string, serviceId: string): Promise<{ valid: boolean; chittyId?: string }> {
    try {
      const response = await this.idClient.post(
        this.authorities.chittyId.endpoints.validateToken,
        {
          token,
          context: {
            service: 'chittyregistry',
            action: 'service-registration',
            resourceId: serviceId
          }
        }
      );

      return {
        valid: response.data.valid,
        chittyId: response.data.chittyId
      };
    } catch (error) {
      logger.error('Token validation failed', { error: error.message, serviceId });
      return { valid: false };
    }
  }

  /**
   * Get trust score for a service from ChittyTrust
   */
  async getServiceTrustScore(chittyId: string): Promise<{ score: number; level: string } | null> {
    try {
      const response = await this.trustClient.get(
        `${this.authorities.chittyTrust.endpoints.getTrustScore}/${chittyId}`
      );

      return {
        score: response.data.score,
        level: response.data.level
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('Failed to get trust score', { error: error.message, chittyId });
      return null;
    }
  }

  /**
   * Validate canonical data standards compliance
   */
  async validateDataStandards(data: any, standardType: string): Promise<{ compliant: boolean; issues?: string[] }> {
    try {
      const response = await this.canonClient.post(
        this.authorities.chittyCanon.endpoints.validateData,
        {
          standardType,
          data
        }
      );

      return {
        compliant: response.data.compliant,
        issues: response.data.issues
      };
    } catch (error) {
      logger.error('Data standards validation failed', {
        error: error.message,
        standardType
      });
      return {
        compliant: false,
        issues: ['Data standards validation service unavailable']
      };
    }
  }

  /**
   * Get schema definition for a specific type
   */
  async getSchemaDefinition(schemaType: string, version?: string): Promise<any> {
    try {
      const params = version ? { version } : {};
      const response = await this.schemaClient.get(
        `${this.authorities.chittySchema.endpoints.getSchema}/${schemaType}`,
        { params }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get schema definition', {
        error: error.message,
        schemaType,
        version
      });
      throw error;
    }
  }

  /**
   * Update trust score based on service performance
   */
  async updateServiceTrustScore(
    chittyId: string,
    metrics: {
      uptime: number;
      responseTime: number;
      errorRate: number;
      complianceScore: number;
    }
  ): Promise<void> {
    try {
      await this.trustClient.post(
        this.authorities.chittyTrust.endpoints.updateScore,
        {
          chittyId,
          metrics,
          source: 'chittyregistry',
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('Failed to update trust score', {
        error: error.message,
        chittyId,
        metrics
      });
      // Don't throw - this is not critical for registry operation
    }
  }

  /**
   * Check if all authority services are healthy
   */
  async checkAuthorityHealth(): Promise<{ [key: string]: HealthStatus }> {
    const authorities = {
      schema: this.schemaClient,
      canon: this.canonClient,
      id: this.idClient,
      trust: this.trustClient
    };

    const healthChecks = Object.entries(authorities).map(async ([name, client]) => {
      try {
        const start = Date.now();
        await client.get('/health');
        const responseTime = Date.now() - start;

        return [name, {
          serviceId: `chitty${name}`,
          status: 'HEALTHY' as const,
          lastCheck: new Date().toISOString(),
          responseTime,
          uptime: 100 // Authority services should have high uptime
        }];
      } catch (error) {
        return [name, {
          serviceId: `chitty${name}`,
          status: 'UNHEALTHY' as const,
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          uptime: 0,
          details: {
            errors: [error.message]
          }
        }];
      }
    });

    const results = await Promise.all(healthChecks);
    return Object.fromEntries(results);
  }
}