/**
 * ChittyOS Mac Native - Notion Extension
 *
 * Mac native extension for Notion integration with ChittyOS Universal Data Framework
 * Integrates with pipeline-only ChittyID generation and distributed session sync
 */

import { NotionConnector } from './connector.js';
import { NotionSync } from './sync.js';
import { ExtensionConfig, SessionContext } from './types.js';

export class NotionExtension {
  private connector: NotionConnector;
  private sync: NotionSync;
  private config: ExtensionConfig;
  private sessionContext?: SessionContext;

  constructor(config: ExtensionConfig) {
    this.config = config;
    this.connector = new NotionConnector(config);
    this.sync = new NotionSync(config);
  }

  /**
   * Initialize extension with session context
   */
  async initialize(sessionContext: SessionContext): Promise<void> {
    this.sessionContext = sessionContext;

    // Initialize connector with session
    await this.connector.initialize(sessionContext);

    // Initialize sync with distributed session
    await this.sync.initialize(sessionContext);

    console.log('✅ Notion Extension initialized for ChittyOS Mac Native');
  }

  /**
   * Create entity through pipeline-only generation
   */
  async createEntity(entityData: any): Promise<any> {
    if (!this.sessionContext) {
      throw new Error('Extension not initialized with session context');
    }

    // Route through ChittyID pipeline: Router → Intake → Trust → Authorization → Generation
    const chittyId = await this.requestChittyIdFromPipeline(
      entityData.entityType,
      entityData.name,
      this.sessionContext
    );

    // Create entity with pipeline-generated ID
    const entity = await this.connector.createEntity({
      ...entityData,
      chittyId
    });

    // Trigger distributed session sync
    await this.sync.syncEntity(entity, this.sessionContext);

    return entity;
  }

  /**
   * Create information through pipeline
   */
  async createInformation(infoData: any): Promise<any> {
    if (!this.sessionContext) {
      throw new Error('Extension not initialized with session context');
    }

    const chittyId = await this.requestChittyIdFromPipeline(
      'INFO',
      infoData.title,
      this.sessionContext
    );

    const information = await this.connector.createInformation({
      ...infoData,
      chittyId
    });

    await this.sync.syncInformation(information, this.sessionContext);

    return information;
  }

  /**
   * Create fact through pipeline
   */
  async createFact(factData: any): Promise<any> {
    if (!this.sessionContext) {
      throw new Error('Extension not initialized with session context');
    }

    const chittyId = await this.requestChittyIdFromPipeline(
      'FACT',
      factData.factStatement.substring(0, 50),
      this.sessionContext
    );

    const fact = await this.connector.createFact({
      ...factData,
      chittyId
    });

    await this.sync.syncFact(fact, this.sessionContext);

    return fact;
  }

  /**
   * Request ChittyID through proper pipeline
   */
  private async requestChittyIdFromPipeline(
    namespace: string,
    identifier: string,
    sessionContext: SessionContext
  ): Promise<string> {
    const pipelineRequest = {
      namespace,
      identifier,
      sessionId: sessionContext.sessionId,
      projectId: sessionContext.projectId,
      trustLevel: sessionContext.trustLevel,
      authorization: sessionContext.authorization
    };

    try {
      // Route through Router → Intake → Trust → Authorization → Generation
      const response = await fetch(`${this.config.chittyIdPipelineUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionContext.token}`,
          'X-Session-ID': sessionContext.sessionId,
          'X-Correlation-ID': sessionContext.correlationId
        },
        body: JSON.stringify(pipelineRequest)
      });

      if (!response.ok) {
        throw new Error(`Pipeline generation failed: ${response.status}`);
      }

      const { chittyId } = await response.json();
      return chittyId;

    } catch (error) {
      console.error('ChittyID pipeline request failed:', error);

      // No fallback - pipeline-only generation enforced
      throw new Error('ChittyID generation requires proper pipeline authentication');
    }
  }

  /**
   * Sync all data with exponential backoff
   */
  async fullSync(): Promise<void> {
    if (!this.sessionContext) {
      throw new Error('Extension not initialized with session context');
    }

    await this.sync.fullSync(this.sessionContext);
  }

  /**
   * Refresh service registry knowledge (called by propagation system)
   */
  async refreshServiceRegistry(): Promise<void> {
    try {
      const { ChittyOSServiceRegistry } = await import('../../core/service-registry.js');
      const registry = ChittyOSServiceRegistry.getInstance();

      // Get updated list of services
      const services = registry.getServices();
      console.log(`🔄 Refreshed service registry: ${services.length} services available`);

      // Update internal service endpoints if needed
      this.updateServiceEndpoints(services);

    } catch (error) {
      console.error('❌ Failed to refresh service registry:', error);
    }
  }

  /**
   * Update internal service endpoints based on registry
   */
  private updateServiceEndpoints(services: any[]): void {
    // Update known service endpoints for pipeline communication
    const idService = services.find(s => s.serviceId === 'chitty-id-service');
    if (idService && idService.endpoints.length > 0) {
      // Update ChittyID service endpoint
      this.config.chittyIdPipelineUrl = idService.endpoints[0];
      console.log(`📋 Updated ChittyID service endpoint: ${idService.endpoints[0]}`);
    }

    const trustService = services.find(s => s.serviceId === 'chitty-trust-service');
    if (trustService && trustService.endpoints.length > 0) {
      // Update trust service endpoint if we track it
      console.log(`📋 Updated Trust service endpoint: ${trustService.endpoints[0]}`);
    }
  }

  /**
   * Health check for extension
   */
  async healthCheck(): Promise<boolean> {
    try {
      const connectorHealth = await this.connector.healthCheck();
      const syncHealth = await this.sync.healthCheck();

      return connectorHealth && syncHealth;
    } catch (error) {
      console.error('Notion extension health check failed:', error);
      return false;
    }
  }

  /**
   * Get extension metrics
   */
  getMetrics(): any {
    return {
      connector: this.connector.getMetrics(),
      sync: this.sync.getMetrics(),
      session: {
        sessionId: this.sessionContext?.sessionId,
        correlationId: this.sessionContext?.correlationId,
        trustLevel: this.sessionContext?.trustLevel
      }
    };
  }

  /**
   * Shutdown extension
   */
  async shutdown(): Promise<void> {
    await this.sync.stop();
    await this.connector.shutdown();
    console.log('🛑 Notion Extension shutdown');
  }
}