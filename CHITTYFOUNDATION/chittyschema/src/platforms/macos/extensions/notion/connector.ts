/**
 * ChittyOS Mac Native - Notion Connector
 *
 * Core connector for Notion API with pipeline integration and circuit breakers
 * Implements hardened sync with rate limiting and DLQ processing
 */

import { Client } from '@notionhq/client';
import { NeutralEntity, UniversalInformation, AtomicFact, SessionContext } from './types.js';

export class NotionConnector {
  private notion: Client;
  private config: any;
  private sessionContext?: SessionContext;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private deadLetterQueue: DeadLetterQueue;

  constructor(config: any) {
    this.config = config;
    this.notion = new Client({ auth: config.apiKey });
    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter(config.rateLimit || { requests: 3, per: 1000 });
    this.deadLetterQueue = new DeadLetterQueue();
  }

  async initialize(sessionContext: SessionContext): Promise<void> {
    this.sessionContext = sessionContext;
    console.log(`🔗 Notion Connector initialized for session ${sessionContext.sessionId}`);
  }

  /**
   * Create entity with idempotent upsert and deduplication
   */
  async createEntity(entity: Omit<NeutralEntity, 'id' | 'created' | 'modified'>): Promise<NeutralEntity> {
    return this.withCircuitBreaker(async () => {
      await this.rateLimiter.waitForToken();

      // Check for existing entity by ChittyID (deduplication)
      const existing = await this.findEntityByChittyId(entity.chittyId);
      if (existing) {
        console.log(`📋 Entity ${entity.chittyId} already exists, returning existing`);
        return existing;
      }

      // Validate schema before creation
      this.validateEntitySchema(entity);

      const response = await this.notion.pages.create({
        parent: { database_id: this.config.databaseIds.entities },
        properties: this.mapEntityToNotionProperties(entity)
      });

      const created = this.mapNotionToEntity(response);

      // Log with correlation ID
      this.logOperation('entity_created', {
        chittyId: entity.chittyId,
        correlationId: this.sessionContext?.correlationId
      });

      return created;
    });
  }

  /**
   * Create information with proper validation
   */
  async createInformation(info: Omit<UniversalInformation, 'id' | 'created' | 'modified'>): Promise<UniversalInformation> {
    return this.withCircuitBreaker(async () => {
      await this.rateLimiter.waitForToken();

      const existing = await this.findInformationByChittyId(info.chittyId);
      if (existing) {
        return existing;
      }

      this.validateInformationSchema(info);

      const response = await this.notion.pages.create({
        parent: { database_id: this.config.databaseIds.information },
        properties: this.mapInformationToNotionProperties(info)
      });

      const created = this.mapNotionToInformation(response);

      this.logOperation('information_created', {
        chittyId: info.chittyId,
        correlationId: this.sessionContext?.correlationId
      });

      return created;
    });
  }

  /**
   * Create fact with validation
   */
  async createFact(fact: Omit<AtomicFact, 'id' | 'recorded'>): Promise<AtomicFact> {
    return this.withCircuitBreaker(async () => {
      await this.rateLimiter.waitForToken();

      const existing = await this.findFactByChittyId(fact.chittyId);
      if (existing) {
        return existing;
      }

      this.validateFactSchema(fact);

      const response = await this.notion.pages.create({
        parent: { database_id: this.config.databaseIds.facts },
        properties: this.mapFactToNotionProperties(fact)
      });

      const created = this.mapNotionToFact(response);

      this.logOperation('fact_created', {
        chittyId: fact.chittyId,
        correlationId: this.sessionContext?.correlationId
      });

      return created;
    });
  }

  /**
   * Circuit breaker wrapper
   */
  private async withCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open - service unavailable');
    }

    try {
      const result = await operation();
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();

      // Add to DLQ for retry
      await this.deadLetterQueue.add({
        operation: operation.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        sessionId: this.sessionContext?.sessionId,
        correlationId: this.sessionContext?.correlationId
      });

      throw error;
    }
  }

  /**
   * Find entity by ChittyID with caching
   */
  private async findEntityByChittyId(chittyId: string): Promise<NeutralEntity | null> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.config.databaseIds.entities,
        filter: {
          property: 'ChittyID',
          rich_text: { equals: chittyId }
        }
      });

      return response.results.length > 0 ? this.mapNotionToEntity(response.results[0]) : null;
    } catch (error) {
      console.error('Error finding entity by ChittyID:', error);
      return null;
    }
  }

  private async findInformationByChittyId(chittyId: string): Promise<UniversalInformation | null> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.config.databaseIds.information,
        filter: {
          property: 'ChittyID',
          rich_text: { equals: chittyId }
        }
      });

      return response.results.length > 0 ? this.mapNotionToInformation(response.results[0]) : null;
    } catch (error) {
      console.error('Error finding information by ChittyID:', error);
      return null;
    }
  }

  private async findFactByChittyId(chittyId: string): Promise<AtomicFact | null> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.config.databaseIds.facts,
        filter: {
          property: 'ChittyID',
          rich_text: { equals: chittyId }
        }
      });

      return response.results.length > 0 ? this.mapNotionToFact(response.results[0]) : null;
    } catch (error) {
      console.error('Error finding fact by ChittyID:', error);
      return null;
    }
  }

  // Schema validation methods
  private validateEntitySchema(entity: any): void {
    if (!entity.chittyId || !entity.name || !entity.entityType) {
      throw new Error('Invalid entity schema: missing required fields');
    }
  }

  private validateInformationSchema(info: any): void {
    if (!info.chittyId || !info.title || !info.contentType || !info.informationTier) {
      throw new Error('Invalid information schema: missing required fields');
    }
  }

  private validateFactSchema(fact: any): void {
    if (!fact.chittyId || !fact.factStatement || !fact.classification) {
      throw new Error('Invalid fact schema: missing required fields');
    }
  }

  // Property mapping methods (simplified for brevity)
  private mapEntityToNotionProperties(entity: any): any {
    return {
      'ChittyID': { rich_text: [{ text: { content: entity.chittyId } }] },
      'Name': { title: [{ text: { content: entity.name } }] },
      'Entity Type': { select: { name: entity.entityType } },
      'Status': { select: { name: entity.status || 'Active' } },
      'Verification Status': { select: { name: entity.verificationStatus || 'Unverified' } }
    };
  }

  private mapInformationToNotionProperties(info: any): any {
    return {
      'ChittyID': { rich_text: [{ text: { content: info.chittyId } }] },
      'Title': { title: [{ text: { content: info.title } }] },
      'Content Type': { select: { name: info.contentType } },
      'Information Tier': { select: { name: info.informationTier } },
      'Verification Status': { select: { name: info.verificationStatus || 'Pending' } }
    };
  }

  private mapFactToNotionProperties(fact: any): any {
    return {
      'ChittyID': { rich_text: [{ text: { content: fact.chittyId } }] },
      'Fact Statement': { title: [{ text: { content: fact.factStatement } }] },
      'Classification': { select: { name: fact.classification } },
      'Certainty Level': { number: fact.certaintyLevel || 0.5 },
      'Confidence Score': { number: fact.confidenceScore || 0.5 }
    };
  }

  // Reverse mapping methods (simplified)
  private mapNotionToEntity(page: any): NeutralEntity {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      name: this.extractTitle(props.Name),
      entityType: this.extractSelect(props['Entity Type']) as any,
      status: this.extractSelect(props.Status) as any || 'Active',
      visibility: 'Public' as any,
      contextTags: [],
      verificationStatus: this.extractSelect(props['Verification Status']) as any || 'Unverified',
      accessLevel: 'Standard' as any,
      created: new Date(page.created_time),
      modified: new Date(page.last_edited_time),
      metadata: {}
    };
  }

  private mapNotionToInformation(page: any): UniversalInformation {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      title: this.extractTitle(props.Title),
      contentType: this.extractSelect(props['Content Type']) as any,
      informationTier: this.extractSelect(props['Information Tier']) as any,
      authenticityStatus: 'Unverified' as any,
      sensitivityLevel: 'Standard' as any,
      verificationStatus: this.extractSelect(props['Verification Status']) as any || 'Pending',
      tags: [],
      created: new Date(page.created_time),
      modified: new Date(page.last_edited_time)
    };
  }

  private mapNotionToFact(page: any): AtomicFact {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      factStatement: this.extractTitle(props['Fact Statement']),
      classification: this.extractSelect(props.Classification) as any,
      certaintyLevel: this.extractNumber(props['Certainty Level']) || 0.5,
      confidenceScore: this.extractNumber(props['Confidence Score']) || 0.5,
      weight: 0.5,
      extractedBy: 'Human' as any,
      recorded: new Date(page.created_time),
      verificationStatus: 'Pending' as any,
      sensitivityLevel: 'Standard' as any,
      context: {}
    };
  }

  // Helper methods
  private extractTitle(prop: any): string {
    return prop?.title?.[0]?.text?.content || '';
  }

  private extractRichText(prop: any): string {
    return prop?.rich_text?.[0]?.text?.content || '';
  }

  private extractSelect(prop: any): string {
    return prop?.select?.name || '';
  }

  private extractNumber(prop: any): number | undefined {
    return prop?.number ?? undefined;
  }

  private logOperation(operation: string, data: any): void {
    console.log(`📊 [${operation}]`, {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionContext?.sessionId,
      ...data
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.notion.users.me();
      return true;
    } catch (error) {
      return false;
    }
  }

  getMetrics(): any {
    return {
      circuitBreaker: this.circuitBreaker.getStats(),
      rateLimiter: this.rateLimiter.getStats(),
      deadLetterQueue: this.deadLetterQueue.getStats()
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Notion Connector shutdown');
  }
}

// Supporting classes (simplified implementations)
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  isOpen(): boolean {
    return this.failures >= this.threshold && (Date.now() - this.lastFailureTime) < this.timeout;
  }

  getStats(): any {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      lastFailureTime: this.lastFailureTime
    };
  }
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(config: { requests: number; per: number }) {
    this.maxTokens = config.requests;
    this.tokens = config.requests;
    this.refillRate = config.requests / (config.per / 1000); // tokens per ms
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait with jitter
    const delay = (1000 / this.refillRate) + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.waitForToken();
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStats(): any {
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate
    };
  }
}

class DeadLetterQueue {
  private queue: any[] = [];

  async add(item: any): Promise<void> {
    this.queue.push(item);
    console.log(`💀 Added to DLQ: ${item.operation}`);
  }

  getStats(): any {
    return {
      queueSize: this.queue.length,
      items: this.queue.slice(0, 5) // Show first 5 for debugging
    };
  }
}