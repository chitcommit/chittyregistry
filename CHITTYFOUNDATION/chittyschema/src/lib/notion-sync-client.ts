/**
 * Notion Sync Client for AtomicFacts
 * Hardened sync with retry, idempotency, and observability
 */

import { Client } from '@notionhq/client';
import { PageObjectResponse, CreatePageParameters, UpdatePageParameters } from '@notionhq/client/build/src/api-endpoints';

export interface NotionConfig {
  integrationToken: string;
  databaseId: string;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  rateLimitDelay?: number;
}

export interface AtomicFactPayload {
  factId: string;
  parentArtifactId: string;
  factText: string;
  factType: 'DATE' | 'AMOUNT' | 'ADMISSION' | 'IDENTITY' | 'LOCATION' | 'RELATIONSHIP' | 'ACTION' | 'STATUS';
  locationRef?: string;
  classification: 'FACT' | 'SUPPORTED_CLAIM' | 'ASSERTION' | 'ALLEGATION' | 'CONTRADICTION';
  weight: number;
  credibility: string[];
  chainStatus: 'Minted' | 'Pending' | 'Rejected';
  verifiedAt?: Date;
  verificationMethod?: string;
}

export interface SyncMetrics {
  notion_ok: number;
  notion_429: number;
  notion_5xx: number;
  schema_mismatch: number;
  upsert_skipped: number;
  dlq_depth: number;
}

export interface DLQEntry {
  factId: string;
  payload: AtomicFactPayload;
  error: string;
  retryAt: Date;
  attempts: number;
}

export class NotionSyncClient {
  private client: Client;
  private config: Required<NotionConfig>;
  private metrics: SyncMetrics = {
    notion_ok: 0,
    notion_429: 0,
    notion_5xx: 0,
    schema_mismatch: 0,
    upsert_skipped: 0,
    dlq_depth: 0
  };
  private dlq: Map<string, DLQEntry> = new Map();

  constructor(config: NotionConfig) {
    this.config = {
      integrationToken: config.integrationToken,
      databaseId: config.databaseId,
      maxRetries: config.maxRetries ?? 5,
      retryDelay: config.retryDelay ?? 1000,
      batchSize: config.batchSize ?? 10,
      rateLimitDelay: config.rateLimitDelay ?? 200
    };

    this.client = new Client({
      auth: this.config.integrationToken,
      // Add retry logic with exponential backoff + jitter
      retry: {
        maxAttempts: this.config.maxRetries,
        calculateDelay: (attemptNumber) => {
          const baseDelay = this.config.retryDelay;
          const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
          const jitter = Math.random() * baseDelay;
          return Math.min(exponentialDelay + jitter, 30000); // Cap at 30s
        }
      }
    });
  }

  /**
   * Transform AtomicFact to Notion page properties
   */
  private transformToNotionPayload(fact: AtomicFactPayload): CreatePageParameters['properties'] {
    return {
      // Title property - Fact ID
      'Fact ID': {
        title: [{
          text: { content: fact.factId }
        }]
      },
      // Parent Document reference
      'Parent Document': {
        rich_text: [{
          text: { content: fact.parentArtifactId }
        }]
      },
      // Fact content
      'Fact Text': {
        rich_text: [{
          text: {
            content: fact.factText.substring(0, 2000) // Notion limit
          }
        }]
      },
      // Fact Type select
      'Fact Type': {
        select: { name: fact.factType }
      },
      // Location in document
      'Location in Document': {
        rich_text: [{
          text: { content: fact.locationRef || '' }
        }]
      },
      // Classification Level select
      'Classification Level': {
        select: { name: fact.classification }
      },
      // Weight number (0-1)
      'Weight': {
        number: fact.weight
      },
      // Credibility Factors multi-select
      'Credibility Factors': {
        multi_select: fact.credibility.map(factor => ({ name: factor }))
      },
      // ChittyChain Status select
      'ChittyChain Status': {
        select: { name: fact.chainStatus }
      },
      // Verification Date
      'Verification Date': fact.verifiedAt ? {
        date: { start: fact.verifiedAt.toISOString() }
      } : { date: null },
      // Verification Method
      'Verification Method': {
        rich_text: [{
          text: { content: fact.verificationMethod || '' }
        }]
      },
      // External ID for idempotency
      'External ID': {
        rich_text: [{
          text: { content: fact.factId }
        }]
      }
    };
  }

  /**
   * Find existing page by Fact ID
   */
  private async findExistingPage(factId: string): Promise<PageObjectResponse | null> {
    try {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: 'External ID',
          rich_text: { equals: factId }
        },
        page_size: 1
      });

      return response.results.length > 0 ? response.results[0] as PageObjectResponse : null;
    } catch (error) {
      console.error(`Error finding page for ${factId}:`, error);
      return null;
    }
  }

  /**
   * Upsert a single fact to Notion
   */
  private async upsertFact(fact: AtomicFactPayload): Promise<void> {
    const existingPage = await this.findExistingPage(fact.factId);

    try {
      if (existingPage) {
        // Update existing page
        await this.client.pages.update({
          page_id: existingPage.id,
          properties: this.transformToNotionPayload(fact)
        });
        console.log(`Updated fact ${fact.factId}`);
      } else {
        // Create new page
        await this.client.pages.create({
          parent: { database_id: this.config.databaseId },
          properties: this.transformToNotionPayload(fact)
        });
        console.log(`Created fact ${fact.factId}`);
      }

      this.metrics.notion_ok++;
    } catch (error: any) {
      if (error.status === 429) {
        this.metrics.notion_429++;
        throw error; // Let retry logic handle it
      } else if (error.status >= 500) {
        this.metrics.notion_5xx++;
        throw error;
      } else if (error.code === 'validation_error') {
        this.metrics.schema_mismatch++;
        console.error(`Schema mismatch for ${fact.factId}:`, error);
        this.addToDLQ(fact, `Schema validation error: ${error.message}`);
      } else {
        console.error(`Failed to upsert ${fact.factId}:`, error);
        this.addToDLQ(fact, error.message);
      }
    }
  }

  /**
   * Add failed item to DLQ
   */
  private addToDLQ(fact: AtomicFactPayload, error: string): void {
    const entry: DLQEntry = {
      factId: fact.factId,
      payload: fact,
      error,
      retryAt: new Date(Date.now() + 60000 * 5), // Retry after 5 minutes
      attempts: (this.dlq.get(fact.factId)?.attempts || 0) + 1
    };

    this.dlq.set(fact.factId, entry);
    this.metrics.dlq_depth = this.dlq.size;
  }

  /**
   * Sync batch of facts with rate limiting
   */
  async syncBatch(facts: AtomicFactPayload[]): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ factId: string; error: string }>;
  }> {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ factId: string; error: string }>
    };

    // Process in batches to respect rate limits
    for (let i = 0; i < facts.length; i += this.config.batchSize) {
      const batch = facts.slice(i, i + this.config.batchSize);

      for (const fact of batch) {
        try {
          const existing = await this.findExistingPage(fact.factId);
          await this.upsertFact(fact);

          if (existing) {
            results.updated++;
          } else {
            results.created++;
          }

          // Rate limit delay between requests
          await this.sleep(this.config.rateLimitDelay);
        } catch (error: any) {
          results.errors.push({
            factId: fact.factId,
            error: error.message
          });
        }
      }

      // Additional delay between batches
      if (i + this.config.batchSize < facts.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Process DLQ entries
   */
  async processDLQ(): Promise<void> {
    const now = new Date();
    const toProcess: AtomicFactPayload[] = [];

    for (const [factId, entry] of this.dlq.entries()) {
      if (entry.retryAt <= now && entry.attempts < this.config.maxRetries) {
        toProcess.push(entry.payload);
        this.dlq.delete(factId);
      }
    }

    if (toProcess.length > 0) {
      console.log(`Processing ${toProcess.length} items from DLQ`);
      await this.syncBatch(toProcess);
    }

    this.metrics.dlq_depth = this.dlq.size;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get DLQ contents
   */
  getDLQ(): DLQEntry[] {
    return Array.from(this.dlq.values());
  }

  /**
   * Clear DLQ
   */
  clearDLQ(): void {
    this.dlq.clear();
    this.metrics.dlq_depth = 0;
  }

  /**
   * Verify database connection and schema
   */
  async verifyDatabase(): Promise<boolean> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: this.config.databaseId
      });

      console.log('Connected to Notion database:', database.title);

      // Check required properties
      const requiredProps = [
        'Fact ID', 'Parent Document', 'Fact Text', 'Fact Type',
        'Classification Level', 'Weight', 'ChittyChain Status', 'External ID'
      ];

      const dbProps = Object.keys(database.properties);
      const missingProps = requiredProps.filter(prop => !dbProps.includes(prop));

      if (missingProps.length > 0) {
        console.warn('Missing Notion properties:', missingProps);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to verify Notion database:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton for convenience
export const notionSync = new NotionSyncClient({
  integrationToken: process.env.NOTION_INTEGRATION_TOKEN || '',
  databaseId: process.env.NOTION_DATABASE_ID_ATOMIC_FACTS || ''
});