/**
 * Schema Propagation Service
 *
 * Monitors schema_propagation_log and automatically propagates registry changes
 * to other ChittyOS systems and components
 */

// import { ChittyRegistryClient } from './registry-client.js';
import pg from 'pg';

export interface PropagationTarget {
  targetSystem: string;
  endpoint: string;
  authToken?: string;
  propagationMethods: string[];
}

export interface PropagationEvent {
  id: string;
  targetSystem: string;
  propagationType: 'service_add' | 'service_update' | 'service_remove' | 'config_change';
  propagationStatus: 'pending' | 'in_progress' | 'success' | 'failure';
  serviceId?: string;
  changeSummary: string;
  changeDetails: any;
  retryCount: number;
  errorMessage?: string;
  initiatedAt: Date;
  completedAt?: Date;
}

export class SchemaPropagationService {
  private static instance: SchemaPropagationService;
  private isRunning = false;
  private propagationTargets = new Map<string, PropagationTarget>();
  private client: pg.Client;
  private pollIntervalMs = 5000; // Check for new propagation events every 5 seconds

  constructor() {
    this.client = new pg.Client({
      connectionString: process.env.DATABASE_URL
    });
  }

  static getInstance(): SchemaPropagationService {
    if (!SchemaPropagationService.instance) {
      SchemaPropagationService.instance = new SchemaPropagationService();
    }
    return SchemaPropagationService.instance;
  }

  /**
   * Initialize propagation service and register target systems
   */
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Schema Propagation Service...');

    await this.client.connect();

    // Register known ChittyOS systems
    await this.registerTargetSystems();

    console.log(`✅ Schema propagation initialized with ${this.propagationTargets.size} target systems`);
  }

  /**
   * Register target systems that should receive schema updates
   */
  private async registerTargetSystems(): Promise<void> {
    const targets: PropagationTarget[] = [
      {
        targetSystem: 'chitty-data-service',
        endpoint: process.env.CHITTY_DATA_SERVICE_URL || 'https://data.chitty.cc',
        authToken: process.env.CHITTY_DATA_SERVICE_TOKEN,
        propagationMethods: ['schema_sync', 'service_registry_update']
      },
      {
        targetSystem: 'chitty-auth-service',
        endpoint: process.env.CHITTY_AUTH_SERVICE_URL || 'https://auth.chitty.cc',
        authToken: process.env.CHITTY_AUTH_SERVICE_TOKEN,
        propagationMethods: ['service_registry_update']
      },
      {
        targetSystem: 'chitty-trust-service',
        endpoint: process.env.CHITTY_TRUST_SERVICE_URL || 'https://trust.chitty.cc',
        authToken: process.env.CHITTY_TRUST_SERVICE_TOKEN,
        propagationMethods: ['service_registry_update']
      },
      {
        targetSystem: 'chitty-monitoring',
        endpoint: process.env.CHITTY_MONITORING_URL || 'https://monitoring.chitty.cc',
        authToken: process.env.CHITTY_MONITORING_TOKEN,
        propagationMethods: ['health_config_update', 'service_registry_update']
      },
      {
        targetSystem: 'notion-extension',
        endpoint: 'internal://macos/extensions/notion',
        propagationMethods: ['schema_refresh', 'service_config_update']
      },
      {
        targetSystem: 'local-database',
        endpoint: 'internal://database',
        propagationMethods: ['schema_migration', 'config_update']
      }
    ];

    for (const target of targets) {
      this.propagationTargets.set(target.targetSystem, target);
      console.log(`📋 Registered propagation target: ${target.targetSystem}`);
    }
  }

  /**
   * Start monitoring for propagation events
   */
  async startPropagationMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Propagation monitoring already running');
      return;
    }

    console.log('🔍 Starting schema propagation monitoring...');
    this.isRunning = true;

    // Start polling for pending propagation events
    this.pollForPropagationEvents();

    console.log('✅ Schema propagation monitoring started');
  }

  /**
   * Poll for pending propagation events
   */
  private async pollForPropagationEvents(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processPendingPropagations();
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      } catch (error) {
        console.error('❌ Error in propagation polling:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs * 2)); // Back off on error
      }
    }
  }

  /**
   * Process all pending propagation events
   */
  private async processPendingPropagations(): Promise<void> {
    const pendingEvents = await this.getPendingPropagationEvents();

    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${pendingEvents.length} pending propagation events`);

    for (const event of pendingEvents) {
      await this.processPropagationEvent(event);
    }
  }

  /**
   * Get pending propagation events from database
   */
  private async getPendingPropagationEvents(): Promise<PropagationEvent[]> {
    const query = `
      SELECT
        id, target_system, propagation_type, propagation_status,
        service_id, change_summary, change_details, retry_count,
        error_message, initiated_at, completed_at
      FROM schema_propagation_log
      WHERE propagation_status IN ('pending', 'failure')
        AND retry_count < 3
      ORDER BY initiated_at ASC
      LIMIT 10
    `;

    const result = await this.client.query(query);

    return result.rows.map(row => ({
      id: row.id,
      targetSystem: row.target_system,
      propagationType: row.propagation_type,
      propagationStatus: row.propagation_status,
      serviceId: row.service_id,
      changeSummary: row.change_summary,
      changeDetails: row.change_details,
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      initiatedAt: new Date(row.initiated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    }));
  }

  /**
   * Process individual propagation event
   */
  private async processPropagationEvent(event: PropagationEvent): Promise<void> {
    console.log(`🔄 Processing propagation: ${event.propagationType} for ${event.targetSystem}`);

    // Mark as in progress
    await this.updatePropagationStatus(event.id, 'in_progress');

    try {
      const target = this.propagationTargets.get(event.targetSystem);
      if (!target) {
        throw new Error(`Unknown target system: ${event.targetSystem}`);
      }

      // Route to appropriate propagation method
      const success = await this.executePropagation(event, target);

      if (success) {
        await this.updatePropagationStatus(event.id, 'success');
        console.log(`✅ Propagation successful: ${event.propagationType} to ${event.targetSystem}`);
      } else {
        throw new Error('Propagation returned false');
      }

    } catch (error) {
      console.error(`❌ Propagation failed: ${event.propagationType} to ${event.targetSystem}:`, error);

      await this.updatePropagationStatus(
        event.id,
        'failure',
        error instanceof Error ? error.message : 'Unknown error',
        event.retryCount + 1
      );
    }
  }

  /**
   * Execute propagation based on event type and target capabilities
   */
  private async executePropagation(event: PropagationEvent, target: PropagationTarget): Promise<boolean> {
    switch (event.propagationType) {
      case 'service_add':
      case 'service_update':
      case 'service_remove':
        return await this.propagateServiceChange(event, target);

      case 'config_change':
        return await this.propagateConfigChange(event, target);

      default:
        throw new Error(`Unknown propagation type: ${event.propagationType}`);
    }
  }

  /**
   * Propagate service registry changes
   */
  private async propagateServiceChange(event: PropagationEvent, target: PropagationTarget): Promise<boolean> {
    if (target.endpoint.startsWith('internal://')) {
      return await this.propagateToInternalSystem(event, target);
    }

    // External service propagation via API
    if (!target.propagationMethods.includes('service_registry_update')) {
      console.log(`⚠️ Target ${target.targetSystem} does not support service registry updates`);
      return true; // Skip, not an error
    }

    try {
      const response = await fetch(`${target.endpoint}/api/v1/registry/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': target.authToken ? `Bearer ${target.authToken}` : '',
          'X-Propagation-Source': 'chittyschema',
          'X-Propagation-Type': event.propagationType
        },
        body: JSON.stringify({
          propagationType: event.propagationType,
          serviceId: event.serviceId,
          changeDetails: event.changeDetails,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📤 Propagated ${event.propagationType} to ${target.targetSystem}: ${result.status}`);

      return result.success === true;

    } catch (error) {
      console.error(`❌ Failed to propagate to ${target.targetSystem}:`, error);
      return false;
    }
  }

  /**
   * Propagate configuration changes
   */
  private async propagateConfigChange(event: PropagationEvent, target: PropagationTarget): Promise<boolean> {
    if (target.endpoint.startsWith('internal://')) {
      return await this.propagateToInternalSystem(event, target);
    }

    // External config propagation
    if (!target.propagationMethods.includes('health_config_update')) {
      return true; // Skip if not supported
    }

    try {
      const response = await fetch(`${target.endpoint}/api/v1/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': target.authToken ? `Bearer ${target.authToken}` : '',
          'X-Propagation-Source': 'chittyschema'
        },
        body: JSON.stringify({
          configChanges: event.changeDetails,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;

    } catch (error) {
      console.error(`❌ Failed to propagate config to ${target.targetSystem}:`, error);
      return false;
    }
  }

  /**
   * Propagate to internal systems (same process/database)
   */
  private async propagateToInternalSystem(event: PropagationEvent, target: PropagationTarget): Promise<boolean> {
    switch (target.targetSystem) {
      case 'notion-extension':
        return await this.propagateToNotionExtension(event);

      case 'local-database':
        return await this.propagateToLocalDatabase(event);

      default:
        console.log(`⚠️ Unknown internal system: ${target.targetSystem}`);
        return true;
    }
  }

  /**
   * Propagate changes to Notion extension
   */
  private async propagateToNotionExtension(_event: PropagationEvent): Promise<boolean> {
    try {
      // Trigger extension to refresh its service registry
      const { createValidatedExtension } = await import('../extensions/notion/index.js');
      const extension = createValidatedExtension();

      if (!extension) {
        throw new Error('Failed to create Notion extension');
      }

      // Refresh extension's knowledge of available services
      await extension.refreshServiceRegistry();

      console.log('📋 Notion extension service registry refreshed');
      return true;

    } catch (error) {
      console.error('❌ Failed to propagate to Notion extension:', error);
      return false;
    }
  }

  /**
   * Propagate changes to local database
   */
  private async propagateToLocalDatabase(event: PropagationEvent): Promise<boolean> {
    try {
      // For database propagation, we might need to update configurations
      // or refresh materialized views that depend on service registry

      if (event.propagationType === 'config_change') {
        // Update system configuration table if needed
        const updateQuery = `
          UPDATE system_configuration
          SET config_value = $1, updated_at = NOW()
          WHERE config_key = $2
        `;

        const changeDetails = event.changeDetails;
        if (changeDetails.configKey && changeDetails.configValue) {
          await this.client.query(updateQuery, [
            JSON.stringify(changeDetails.configValue),
            changeDetails.configKey
          ]);
        }
      }

      console.log('💾 Local database propagation completed');
      return true;

    } catch (error) {
      console.error('❌ Failed to propagate to local database:', error);
      return false;
    }
  }

  /**
   * Update propagation event status
   */
  private async updatePropagationStatus(
    eventId: string,
    status: 'pending' | 'in_progress' | 'success' | 'failure',
    errorMessage?: string,
    retryCount?: number
  ): Promise<void> {
    const query = `
      UPDATE schema_propagation_log
      SET
        propagation_status = $1,
        error_message = $2,
        retry_count = $3,
        completed_at = CASE WHEN $1 IN ('success', 'failure') THEN NOW() ELSE completed_at END
      WHERE id = $4
    `;

    await this.client.query(query, [
      status,
      errorMessage || null,
      retryCount || 0,
      eventId
    ]);
  }

  /**
   * Trigger manual propagation for specific service
   */
  async triggerManualPropagation(serviceId: string, propagationType: 'service_add' | 'service_update' | 'service_remove'): Promise<void> {
    console.log(`🔄 Triggering manual propagation: ${propagationType} for ${serviceId}`);

    // Get service details
    const serviceQuery = `
      SELECT service_id, service_name, version, primary_endpoint, pipeline_compliant
      FROM service_registry
      WHERE service_id = $1
    `;

    const serviceResult = await this.client.query(serviceQuery, [serviceId]);

    if (serviceResult.rows.length === 0) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const service = serviceResult.rows[0];

    // Create propagation events for all target systems
    for (const targetSystem of this.propagationTargets.keys()) {
      const insertQuery = `
        INSERT INTO schema_propagation_log
        (target_system, propagation_type, service_id, change_summary, change_details)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await this.client.query(insertQuery, [
        targetSystem,
        propagationType,
        serviceId,
        `Manual ${propagationType}: ${service.service_name}`,
        JSON.stringify({ service, manual: true })
      ]);
    }

    console.log(`✅ Manual propagation events created for ${serviceId}`);
  }

  /**
   * Get propagation statistics
   */
  async getPropagationStats(): Promise<any> {
    const query = `
      SELECT
        propagation_status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) as avg_duration_seconds
      FROM schema_propagation_log
      WHERE initiated_at > NOW() - INTERVAL '24 hours'
      GROUP BY propagation_status
    `;

    const result = await this.client.query(query);

    return {
      last24Hours: result.rows.reduce((acc, row) => {
        acc[row.propagation_status] = {
          count: parseInt(row.count),
          avgDuration: row.avg_duration_seconds ? parseFloat(row.avg_duration_seconds) : null
        };
        return acc;
      }, {}),
      targetSystems: Array.from(this.propagationTargets.keys()),
      isRunning: this.isRunning
    };
  }

  /**
   * Stop propagation monitoring
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping schema propagation monitoring...');
    this.isRunning = false;
    await this.client.end();
    console.log('✅ Schema propagation monitoring stopped');
  }
}

/**
 * Initialize and start schema propagation service
 */
export async function initializeSchemaPropagation(): Promise<void> {
  console.log('🔗 Initializing Schema Propagation System...');

  const propagationService = SchemaPropagationService.getInstance();

  // Initialize with target systems
  await propagationService.initialize();

  // Start monitoring for propagation events
  await propagationService.startPropagationMonitoring();

  console.log('✅ Schema propagation system initialized and monitoring started');
  console.log('🔄 Registry changes will now automatically propagate to all connected systems');
}