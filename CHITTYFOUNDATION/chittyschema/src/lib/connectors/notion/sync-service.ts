/**
 * Notion Sync Service - Neutral Universal Framework
 *
 * Bidirectional synchronization service between local database and Notion
 * Provides real-time sync capabilities for neutral data framework
 */

import { Client } from '@notionhq/client';
import {
  NotionConnectorConfig,
  NotionSyncResult,
  NeutralEntity,
  UniversalInformation,
  AtomicFact,
  NeutralUpdateInput
} from './types';
import { NeutralNotionConnector } from './neutral-connector';

export interface SyncOptions {
  direction: 'push' | 'pull' | 'bidirectional';
  batchSize?: number;
  conflictResolution?: 'local' | 'remote' | 'timestamp' | 'manual';
  deltaSync?: boolean;
  dryRun?: boolean;
}

export interface SyncStats {
  totalRecords: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  conflicts: number;
  duration: number;
  startTime: Date;
  endTime: Date;
}

export class NotionSyncService {
  private notion: Client;
  private connector: NeutralNotionConnector;
  private config: NotionConnectorConfig;
  private syncInProgress: boolean = false;

  constructor(config: NotionConnectorConfig) {
    this.config = config;
    this.notion = new Client({ auth: config.apiKey });
    this.connector = new NeutralNotionConnector(config.apiKey, config.databaseIds);
  }

  /**
   * Full bidirectional synchronization
   */
  async fullSync(options: SyncOptions = { direction: 'bidirectional' }): Promise<SyncStats> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const startTime = new Date();

    try {
      console.log(`🔄 Starting ${options.direction} sync...`);

      const stats: SyncStats = {
        totalRecords: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        conflicts: 0,
        duration: 0,
        startTime,
        endTime: new Date()
      };

      // Sync entities
      const entityStats = await this.syncEntities(options);
      this.mergeStats(stats, entityStats);

      // Sync information
      const infoStats = await this.syncInformation(options);
      this.mergeStats(stats, infoStats);

      // Sync facts
      const factStats = await this.syncFacts(options);
      this.mergeStats(stats, factStats);

      const endTime = new Date();
      stats.endTime = endTime;
      stats.duration = endTime.getTime() - startTime.getTime();

      console.log(`✅ Sync completed in ${stats.duration}ms`);
      console.log(`📊 Stats: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);

      return stats;

    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync entities between local and Notion
   */
  async syncEntities(options: SyncOptions): Promise<NotionSyncResult> {
    console.log('🔄 Syncing entities...');

    const startTime = Date.now();
    const result: NotionSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration: 0
    };

    try {
      if (options.direction === 'push' || options.direction === 'bidirectional') {
        // Push local entities to Notion
        const localEntities = await this.getLocalEntities();

        for (const entity of localEntities) {
          try {
            if (options.dryRun) {
              console.log(`[DRY RUN] Would sync entity: ${entity.name}`);
              continue;
            }

            const existingEntity = await this.findNotionEntityByChittyId(entity.chittyId);

            if (existingEntity) {
              // Update existing
              if (this.shouldUpdate(entity, existingEntity, options)) {
                await this.updateNotionEntity(existingEntity.id, entity);
                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              // Create new
              await this.connector.createEntity(entity);
              result.created++;
            }
          } catch (error) {
            console.error(`Error syncing entity ${entity.name}:`, error);
            result.errors.push({
              id: entity.chittyId,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: entity
            });
          }
        }
      }

      if (options.direction === 'pull' || options.direction === 'bidirectional') {
        // Pull Notion entities to local
        const notionEntities = await this.getAllNotionEntities();

        for (const entity of notionEntities) {
          try {
            if (options.dryRun) {
              console.log(`[DRY RUN] Would pull entity: ${entity.name}`);
              continue;
            }

            const existingLocal = await this.findLocalEntityByChittyId(entity.chittyId);

            if (existingLocal) {
              // Update existing local
              if (this.shouldUpdate(entity, existingLocal, options)) {
                await this.updateLocalEntity(existingLocal.id, entity);
                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              // Create new local
              await this.createLocalEntity(entity);
              result.created++;
            }
          } catch (error) {
            console.error(`Error pulling entity ${entity.name}:`, error);
            result.errors.push({
              id: entity.chittyId,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: entity
            });
          }
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`✅ Entity sync completed: ${result.created} created, ${result.updated} updated`);

      return result;

    } catch (error) {
      console.error('❌ Entity sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync information items
   */
  async syncInformation(options: SyncOptions): Promise<NotionSyncResult> {
    console.log('🔄 Syncing information items...');

    const startTime = Date.now();
    const result: NotionSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration: 0
    };

    try {
      // Similar logic to syncEntities but for information items
      if (options.direction === 'push' || options.direction === 'bidirectional') {
        const localInfo = await this.getLocalInformation();

        for (const info of localInfo) {
          try {
            if (options.dryRun) {
              console.log(`[DRY RUN] Would sync information: ${info.title}`);
              continue;
            }

            const existing = await this.findNotionInformationByChittyId(info.chittyId);

            if (existing) {
              if (this.shouldUpdate(info, existing, options)) {
                await this.updateNotionInformation(existing.id, info);
                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              await this.connector.createInformation(info);
              result.created++;
            }
          } catch (error) {
            result.errors.push({
              id: info.chittyId,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: info
            });
          }
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`✅ Information sync completed: ${result.created} created, ${result.updated} updated`);

      return result;

    } catch (error) {
      console.error('❌ Information sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync atomic facts
   */
  async syncFacts(options: SyncOptions): Promise<NotionSyncResult> {
    console.log('🔄 Syncing atomic facts...');

    const startTime = Date.now();
    const result: NotionSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration: 0
    };

    try {
      if (options.direction === 'push' || options.direction === 'bidirectional') {
        const localFacts = await this.getLocalFacts();

        for (const fact of localFacts) {
          try {
            if (options.dryRun) {
              console.log(`[DRY RUN] Would sync fact: ${fact.factStatement.substring(0, 50)}...`);
              continue;
            }

            const existing = await this.findNotionFactByChittyId(fact.chittyId);

            if (existing) {
              if (this.shouldUpdate(fact, existing, options)) {
                await this.updateNotionFact(existing.id, fact);
                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              await this.connector.createFact(fact);
              result.created++;
            }
          } catch (error) {
            result.errors.push({
              id: fact.chittyId,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: fact
            });
          }
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`✅ Facts sync completed: ${result.created} created, ${result.updated} updated`);

      return result;

    } catch (error) {
      console.error('❌ Facts sync failed:', error);
      throw error;
    }
  }

  /**
   * Real-time sync monitoring
   */
  async startRealTimeSync(intervalMs: number = 30000): Promise<void> {
    console.log(`🔄 Starting real-time sync (${intervalMs}ms interval)...`);

    const syncInterval = setInterval(async () => {
      try {
        if (!this.syncInProgress) {
          await this.fullSync({
            direction: 'bidirectional',
            deltaSync: true,
            conflictResolution: 'timestamp'
          });
        }
      } catch (error) {
        console.error('Real-time sync error:', error);
      }
    }, intervalMs);

    // Store interval ID for cleanup
    (this as any).realTimeSyncInterval = syncInterval;
  }

  /**
   * Stop real-time sync
   */
  stopRealTimeSync(): void {
    if ((this as any).realTimeSyncInterval) {
      clearInterval((this as any).realTimeSyncInterval);
      delete (this as any).realTimeSyncInterval;
      console.log('🛑 Real-time sync stopped');
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private mergeStats(target: SyncStats, source: NotionSyncResult): void {
    target.created += source.created;
    target.updated += source.updated;
    target.skipped += source.skipped;
    target.errors += source.errors.length;
  }

  private shouldUpdate(local: any, remote: any, options: SyncOptions): boolean {
    if (options.conflictResolution === 'local') return false;
    if (options.conflictResolution === 'remote') return true;

    // Timestamp-based resolution
    const localModified = new Date(local.modified || local.created);
    const remoteModified = new Date(remote.modified || remote.created);

    return remoteModified > localModified;
  }

  // Placeholder methods for local database operations
  // These would integrate with your actual local database
  private async getLocalEntities(): Promise<NeutralEntity[]> {
    // TODO: Implement local database query
    return [];
  }

  private async getLocalInformation(): Promise<UniversalInformation[]> {
    // TODO: Implement local database query
    return [];
  }

  private async getLocalFacts(): Promise<AtomicFact[]> {
    // TODO: Implement local database query
    return [];
  }

  private async findLocalEntityByChittyId(chittyId: string): Promise<NeutralEntity | null> {
    // TODO: Implement local database query
    return null;
  }

  private async createLocalEntity(entity: NeutralEntity): Promise<void> {
    // TODO: Implement local database insert
  }

  private async updateLocalEntity(id: string, entity: NeutralEntity): Promise<void> {
    // TODO: Implement local database update
  }

  // Notion database operations
  private async getAllNotionEntities(): Promise<NeutralEntity[]> {
    const response = await this.notion.databases.query({
      database_id: this.config.databaseIds.entities,
      page_size: 100
    });

    return response.results.map(page => this.mapNotionToEntity(page));
  }

  private async findNotionEntityByChittyId(chittyId: string): Promise<NeutralEntity | null> {
    const response = await this.notion.databases.query({
      database_id: this.config.databaseIds.entities,
      filter: {
        property: 'ChittyID',
        rich_text: { equals: chittyId }
      }
    });

    return response.results.length > 0 ? this.mapNotionToEntity(response.results[0]) : null;
  }

  private async findNotionInformationByChittyId(chittyId: string): Promise<UniversalInformation | null> {
    const response = await this.notion.databases.query({
      database_id: this.config.databaseIds.information,
      filter: {
        property: 'ChittyID',
        rich_text: { equals: chittyId }
      }
    });

    return response.results.length > 0 ? this.mapNotionToInformation(response.results[0]) : null;
  }

  private async findNotionFactByChittyId(chittyId: string): Promise<AtomicFact | null> {
    const response = await this.notion.databases.query({
      database_id: this.config.databaseIds.facts,
      filter: {
        property: 'ChittyID',
        rich_text: { equals: chittyId }
      }
    });

    return response.results.length > 0 ? this.mapNotionToFact(response.results[0]) : null;
  }

  private async updateNotionEntity(id: string, entity: NeutralEntity): Promise<void> {
    await this.notion.pages.update({
      page_id: id,
      properties: {
        'Name': { title: [{ text: { content: entity.name } }] },
        'Description': entity.description ? { rich_text: [{ text: { content: entity.description } }] } : { rich_text: [] },
        'Status': { select: { name: entity.status } },
        'Verification Status': { select: { name: entity.verificationStatus } }
      }
    });
  }

  private async updateNotionInformation(id: string, info: UniversalInformation): Promise<void> {
    await this.notion.pages.update({
      page_id: id,
      properties: {
        'Title': { title: [{ text: { content: info.title } }] },
        'Content Summary': info.contentSummary ? { rich_text: [{ text: { content: info.contentSummary } }] } : { rich_text: [] },
        'Verification Status': { select: { name: info.verificationStatus } }
      }
    });
  }

  private async updateNotionFact(id: string, fact: AtomicFact): Promise<void> {
    await this.notion.pages.update({
      page_id: id,
      properties: {
        'Fact Statement': { title: [{ text: { content: fact.factStatement } }] },
        'Certainty Level': { number: fact.certaintyLevel },
        'Confidence Score': { number: fact.confidenceScore },
        'Verification Status': { select: { name: fact.verificationStatus } }
      }
    });
  }

  // Mapping methods (reuse from neutral-connector.ts)
  private mapNotionToEntity(page: any): NeutralEntity {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      name: this.extractTitle(props.Name),
      entityType: this.extractSelect(props['Entity Type']) as any,
      description: this.extractRichText(props.Description),
      status: this.extractSelect(props.Status) as any || 'Active',
      visibility: this.extractSelect(props.Visibility) as any || 'Public',
      classification: this.extractRichText(props.Classification),
      contextTags: this.extractMultiSelect(props['Context Tags']),
      verificationStatus: this.extractSelect(props['Verification Status']) as any || 'Unverified',
      accessLevel: this.extractSelect(props['Access Level']) as any || 'Standard',
      created: new Date(page.created_time),
      modified: new Date(page.last_edited_time),
      createdBy: page.created_by?.id,
      metadata: this.parseJsonOrDefault(this.extractRichText(props.Metadata), {})
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
      authenticityStatus: this.extractSelect(props['Authenticity Status']) as any || 'Unverified',
      sensitivityLevel: this.extractSelect(props['Sensitivity Level']) as any || 'Standard',
      verificationStatus: this.extractSelect(props['Verification Status']) as any || 'Pending',
      tags: this.extractMultiSelect(props.Tags),
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
      weight: this.extractNumber(props.Weight) || 0.5,
      extractedBy: this.extractSelect(props['Extracted By']) as any || 'Human',
      recorded: new Date(page.created_time),
      verificationStatus: this.extractSelect(props['Verification Status']) as any || 'Pending',
      sensitivityLevel: this.extractSelect(props['Sensitivity Level']) as any || 'Standard',
      context: this.parseJsonOrDefault(this.extractRichText(props.Context), {})
    };
  }

  // Property extraction helpers
  private extractTitle(prop: any): string {
    return prop?.title?.[0]?.text?.content || '';
  }

  private extractRichText(prop: any): string {
    return prop?.rich_text?.[0]?.text?.content || '';
  }

  private extractSelect(prop: any): string {
    return prop?.select?.name || '';
  }

  private extractMultiSelect(prop: any): string[] {
    return prop?.multi_select?.map((item: any) => item.name) || [];
  }

  private extractNumber(prop: any): number | undefined {
    return prop?.number ?? undefined;
  }

  private parseJsonOrDefault(str: string, defaultValue: any): any {
    try {
      return str ? JSON.parse(str) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get sync status and statistics
   */
  getSyncStatus(): { inProgress: boolean; lastSync?: Date } {
    return {
      inProgress: this.syncInProgress,
      lastSync: (this as any).lastSyncTime
    };
  }
}