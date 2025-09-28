/**
 * Hardened Notion Webhook Integration with Dead Letter Queue and Idempotent Sync
 * Enhanced for ChittyChain schema system with reliable data consistency
 */

import { z } from 'zod';

export interface Env {
  NOTION_WEBHOOK_SECRET: string;
  NOTION_SYNC_QUEUE: KVNamespace;
  NOTION_DLQ: KVNamespace;
  CHITTY_ID_PIPELINE_URL: string;
  SCHEMA_SERVICE_ID: string;
}

// =====================================================
// NOTION WEBHOOK SCHEMAS
// =====================================================

const NotionWebhookEventSchema = z.object({
  object: z.literal('event'),
  id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  type: z.enum(['page.content_updated', 'data_source.schema_updated', 'database.schema_updated', 'comment.created']),
  parent: z.object({
    type: z.enum(['database_id', 'page_id', 'workspace']),
    database_id: z.string().optional(),
    page_id: z.string().optional(),
  }),
  data: z.object({
    object: z.enum(['page', 'database', 'comment']),
    id: z.string(),
    last_edited_time: z.string(),
    properties: z.record(z.any()).optional(),
    schema: z.record(z.any()).optional(),
  }),
});

const SyncOperationSchema = z.object({
  operation_id: z.string(),
  notion_event_id: z.string(),
  sync_type: z.enum(['schema_update', 'content_update', 'structure_change']),
  database_id: z.string(),
  chitty_id: z.string(),
  timestamp: z.string(),
  payload: z.record(z.any()),
  retry_count: z.number().default(0),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'dlq']),
  error_details: z.string().optional(),
});

export type NotionWebhookEvent = z.infer<typeof NotionWebhookEventSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

// =====================================================
// NOTION WEBHOOK SYNC MANAGER
// =====================================================

export class NotionWebhookSyncManager {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds

  constructor(private env: Env) {}

  /**
   * Process incoming Notion webhook with signature verification
   */
  async processWebhook(request: Request): Promise<Response> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(request);
      if (!isValid) {
        return new Response('Invalid signature', { status: 401 });
      }

      // Parse webhook event
      const body = await request.json();
      const event = NotionWebhookEventSchema.parse(body);

      // Create sync operation with idempotency
      const operation = await this.createSyncOperation(event);

      if (!operation) {
        // Duplicate event - already processed
        return new Response('OK - Already processed', { status: 200 });
      }

      // Queue for async processing
      await this.queueSyncOperation(operation);

      return new Response('OK', { status: 200 });

    } catch (error) {
      console.error('Webhook processing failed:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * Verify Notion webhook signature using HMAC-SHA256
   */
  private async verifyWebhookSignature(request: Request): Promise<boolean> {
    const signature = request.headers.get('X-Notion-Signature');
    if (!signature) return false;

    const body = await request.clone().text();
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const key = encoder.encode(this.env.NOTION_WEBHOOK_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expectedSignature = signature.replace('sha256=', '');
    return computedSignature === expectedSignature;
  }

  /**
   * Create sync operation with idempotency check
   */
  private async createSyncOperation(event: NotionWebhookEvent): Promise<SyncOperation | null> {
    const operationId = this.generateOperationId(event);

    // Check if operation already exists (idempotency)
    const existing = await this.env.NOTION_SYNC_QUEUE.get(operationId);
    if (existing) {
      return null; // Already processed or in progress
    }

    // Determine sync type and extract relevant data
    const syncType = this.determineSyncType(event);
    const databaseId = event.parent.database_id || event.data.id;

    // Extract ChittyID from database properties or metadata
    const chittyId = await this.extractChittyId(databaseId);
    if (!chittyId) {
      console.warn('No ChittyID found for database:', databaseId);
      return null;
    }

    const operation: SyncOperation = {
      operation_id: operationId,
      notion_event_id: event.id,
      sync_type: syncType,
      database_id: databaseId,
      chitty_id: chittyId,
      timestamp: new Date().toISOString(),
      payload: {
        event_type: event.type,
        data: event.data,
        parent: event.parent,
      },
      retry_count: 0,
      status: 'pending',
    };

    return operation;
  }

  /**
   * Queue sync operation for async processing
   */
  private async queueSyncOperation(operation: SyncOperation): Promise<void> {
    // Store operation in queue
    await this.env.NOTION_SYNC_QUEUE.put(
      operation.operation_id,
      JSON.stringify(operation),
      { expirationTtl: 24 * 60 * 60 } // 24 hours
    );

    // Trigger async processing (in real implementation, this would use a queue worker)
    this.processSyncOperationAsync(operation);
  }

  /**
   * Process sync operation with retry and DLQ handling
   */
  private async processSyncOperationAsync(operation: SyncOperation): Promise<void> {
    try {
      operation.status = 'processing';
      await this.storeSyncOperation(operation);

      // Apply rate limiting with jitter
      await this.applyRateLimit();

      // Process based on sync type
      switch (operation.sync_type) {
        case 'schema_update':
          await this.handleSchemaUpdate(operation);
          break;
        case 'content_update':
          await this.handleContentUpdate(operation);
          break;
        case 'structure_change':
          await this.handleStructureChange(operation);
          break;
      }

      // Mark as completed
      operation.status = 'completed';
      await this.storeSyncOperation(operation);

    } catch (error) {
      console.error('Sync operation failed:', error);
      await this.handleSyncFailure(operation, error as Error);
    }
  }

  /**
   * Handle sync operation failure with retry and DLQ
   */
  private async handleSyncFailure(operation: SyncOperation, error: Error): Promise<void> {
    operation.retry_count++;
    operation.error_details = error.message;

    if (operation.retry_count <= this.maxRetries) {
      // Schedule retry with exponential backoff
      operation.status = 'pending';
      await this.storeSyncOperation(operation);

      const delay = this.calculateRetryDelay(operation.retry_count);
      setTimeout(() => {
        this.processSyncOperationAsync(operation);
      }, delay);

    } else {
      // Move to Dead Letter Queue
      operation.status = 'dlq';
      await this.moveToDLQ(operation);
    }
  }

  /**
   * Handle schema updates - sync with ChittyChain schema system
   */
  private async handleSchemaUpdate(operation: SyncOperation): Promise<void> {
    const { database_id, chitty_id, payload } = operation;

    // Fetch current database schema from Notion
    const notionSchema = await this.fetchNotionDatabaseSchema(database_id);

    // Convert to ChittyChain schema format
    const chittySchema = await this.convertNotionToChittySchema(notionSchema);

    // Update ChittyChain schema via pipeline
    await this.updateChittyChainSchema(chitty_id, chittySchema, operation);

    // Validate consistency
    await this.validateSchemaConsistency(database_id, chitty_id);
  }

  /**
   * Handle content updates - sync data changes
   */
  private async handleContentUpdate(operation: SyncOperation): Promise<void> {
    const { database_id, chitty_id, payload } = operation;

    // Extract changed properties
    const changes = this.extractContentChanges(payload);

    // Apply validation rules
    await this.validateContentChanges(changes, chitty_id);

    // Sync changes to ChittyChain system
    await this.syncContentChanges(database_id, chitty_id, changes);
  }

  /**
   * Handle structure changes - database schema modifications
   */
  private async handleStructureChange(operation: SyncOperation): Promise<void> {
    const { database_id, chitty_id, payload } = operation;

    // Analyze structure changes
    const structureChanges = await this.analyzeStructureChanges(payload);

    // Validate against legal schema requirements
    await this.validateStructureChanges(structureChanges, chitty_id);

    // Update ChittyChain schema structure
    await this.updateSchemaStructure(database_id, chitty_id, structureChanges);
  }

  /**
   * Apply rate limiting with jitter to prevent API throttling
   */
  private async applyRateLimit(): Promise<void> {
    const baseDelay = 100; // 100ms base delay
    const jitter = Math.random() * 50; // Up to 50ms jitter
    await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), this.maxDelay);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return delay + jitter;
  }

  /**
   * Move failed operation to Dead Letter Queue
   */
  private async moveToDLQ(operation: SyncOperation): Promise<void> {
    const dlqKey = `dlq:${operation.operation_id}:${Date.now()}`;
    await this.env.NOTION_DLQ.put(
      dlqKey,
      JSON.stringify(operation),
      { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
    );

    // Remove from main queue
    await this.env.NOTION_SYNC_QUEUE.delete(operation.operation_id);

    // Log for monitoring
    console.error('Operation moved to DLQ:', {
      operation_id: operation.operation_id,
      chitty_id: operation.chitty_id,
      error: operation.error_details,
      retry_count: operation.retry_count
    });
  }

  /**
   * Store sync operation state
   */
  private async storeSyncOperation(operation: SyncOperation): Promise<void> {
    await this.env.NOTION_SYNC_QUEUE.put(
      operation.operation_id,
      JSON.stringify(operation),
      { expirationTtl: 24 * 60 * 60 }
    );
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private generateOperationId(event: NotionWebhookEvent): string {
    return `${event.id}-${event.type}-${event.last_edited_time}`;
  }

  private determineSyncType(event: NotionWebhookEvent): SyncOperation['sync_type'] {
    switch (event.type) {
      case 'data_source.schema_updated':
      case 'database.schema_updated':
        return 'schema_update';
      case 'page.content_updated':
        return 'content_update';
      default:
        return 'content_update';
    }
  }

  private async extractChittyId(databaseId: string): Promise<string | null> {
    // Implementation would fetch database metadata and extract ChittyID
    // This could be stored in database description, properties, or separate mapping
    return 'PEO-1234567890123456'; // Placeholder
  }

  private async fetchNotionDatabaseSchema(databaseId: string): Promise<any> {
    // Implementation would call Notion API to get database schema
    return {};
  }

  private async convertNotionToChittySchema(notionSchema: any): Promise<any> {
    // Implementation would convert Notion database schema to ChittyChain format
    return {};
  }

  private async updateChittyChainSchema(chittyId: string, schema: any, operation: SyncOperation): Promise<void> {
    // Implementation would call ChittyChain pipeline to update schema
  }

  private async validateSchemaConsistency(databaseId: string, chittyId: string): Promise<void> {
    // Implementation would validate that Notion and ChittyChain schemas are consistent
  }

  private extractContentChanges(payload: any): any {
    // Implementation would extract specific property changes from webhook payload
    return {};
  }

  private async validateContentChanges(changes: any, chittyId: string): Promise<void> {
    // Implementation would validate changes against legal schema rules
  }

  private async syncContentChanges(databaseId: string, chittyId: string, changes: any): Promise<void> {
    // Implementation would sync content changes to ChittyChain system
  }

  private async analyzeStructureChanges(payload: any): Promise<any> {
    // Implementation would analyze database structure changes
    return {};
  }

  private async validateStructureChanges(changes: any, chittyId: string): Promise<void> {
    // Implementation would validate structure changes against legal requirements
  }

  private async updateSchemaStructure(databaseId: string, chittyId: string, changes: any): Promise<void> {
    // Implementation would update ChittyChain schema structure
  }
}

// =====================================================
// DLQ PROCESSOR FOR FAILED OPERATIONS
// =====================================================

export class NotionDLQProcessor {
  constructor(private env: Env) {}

  /**
   * Process failed operations from DLQ
   */
  async processDLQ(): Promise<void> {
    const list = await this.env.NOTION_DLQ.list();

    for (const key of list.keys) {
      try {
        const operationData = await this.env.NOTION_DLQ.get(key.name);
        if (!operationData) continue;

        const operation: SyncOperation = JSON.parse(operationData);

        // Attempt manual recovery or escalation
        await this.attemptRecovery(operation);

        // Remove from DLQ if successful
        await this.env.NOTION_DLQ.delete(key.name);

      } catch (error) {
        console.error('DLQ processing failed for key:', key.name, error);
      }
    }
  }

  private async attemptRecovery(operation: SyncOperation): Promise<void> {
    // Implementation would attempt to recover failed operations
    // This might involve:
    // - Manual data reconciliation
    // - Schema rollback
    // - Alert escalation to administrators
    console.log('Attempting recovery for operation:', operation.operation_id);
  }
}

// =====================================================
// WEBHOOK ENDPOINT HANDLER
// =====================================================

export async function handleNotionWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const syncManager = new NotionWebhookSyncManager(env);
  return syncManager.processWebhook(request);
}

// =====================================================
// DLQ SCHEDULED PROCESSOR
// =====================================================

export async function processNotionDLQ(env: Env): Promise<void> {
  const processor = new NotionDLQProcessor(env);
  await processor.processDLQ();
}