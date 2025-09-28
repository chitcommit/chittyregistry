/**
 * Neutral Notion Connector
 *
 * Domain-agnostic connector for the ChittyChain Universal Data Framework
 * Provides CRUD operations without legal bias or terminology
 */

import { Client } from '@notionhq/client';
import { NeutralEntity, UniversalInformation, AtomicFact } from './types';

export class NeutralNotionConnector {
  private notion: Client;
  private databaseIds: Record<string, string>;

  constructor(apiKey: string, databaseIds: Record<string, string>) {
    this.notion = new Client({ auth: apiKey });
    this.databaseIds = databaseIds;
  }

  // =============================================================================
  // ENTITY OPERATIONS (Universal Objects)
  // =============================================================================

  async createEntity(entity: Omit<NeutralEntity, 'id' | 'chittyId' | 'created' | 'modified'>): Promise<NeutralEntity> {
    const chittyId = await this.generateChittyId(entity.entityType, entity.name);

    const response = await this.notion.pages.create({
      parent: { database_id: this.databaseIds.entities },
      properties: {
        'ChittyID': { rich_text: [{ text: { content: chittyId } }] },
        'Name': { title: [{ text: { content: entity.name } }] },
        'Entity Type': { select: { name: entity.entityType } },
        'Entity Subtype': entity.entitySubtype ? { rich_text: [{ text: { content: entity.entitySubtype } }] } : { rich_text: [] },
        'Description': entity.description ? { rich_text: [{ text: { content: entity.description } }] } : { rich_text: [] },
        'Status': { select: { name: entity.status || 'Active' } },
        'Visibility': { select: { name: entity.visibility || 'Public' } },
        'Classification': entity.classification ? { rich_text: [{ text: { content: entity.classification } }] } : { rich_text: [] },
        'Context Tags': {
          multi_select: entity.contextTags?.map(tag => ({ name: tag })) || []
        },
        'Verification Status': { select: { name: entity.verificationStatus || 'Unverified' } },
        'Access Level': { select: { name: entity.accessLevel || 'Standard' } },
        'Metadata': entity.metadata ? { rich_text: [{ text: { content: JSON.stringify(entity.metadata) } }] } : { rich_text: [] }
      }
    });

    return this.mapNotionToEntity(response);
  }

  async getEntity(entityId: string): Promise<NeutralEntity | null> {
    try {
      const response = await this.notion.pages.retrieve({ page_id: entityId });
      return this.mapNotionToEntity(response);
    } catch (error) {
      console.error('Error retrieving entity:', error);
      return null;
    }
  }

  async getEntitiesByType(entityType: string, options: {
    limit?: number;
    status?: string;
    classification?: string;
  } = {}): Promise<NeutralEntity[]> {
    const { limit = 50, status, classification } = options;

    let filter: any = {
      property: 'Entity Type',
      select: { equals: entityType }
    };

    // Add additional filters
    if (status || classification) {
      const filters = [filter];

      if (status) {
        filters.push({
          property: 'Status',
          select: { equals: status }
        });
      }

      if (classification) {
        filters.push({
          property: 'Classification',
          rich_text: { contains: classification }
        });
      }

      filter = { and: filters };
    }

    const response = await this.notion.databases.query({
      database_id: this.databaseIds.entities,
      filter,
      page_size: limit,
      sorts: [{ property: 'Created', direction: 'descending' }]
    });

    return response.results.map(page => this.mapNotionToEntity(page));
  }

  async searchEntities(searchTerm: string, entityTypes?: string[]): Promise<NeutralEntity[]> {
    let filter: any;

    if (entityTypes && entityTypes.length > 0) {
      filter = {
        and: [
          {
            or: [
              { property: 'Name', title: { contains: searchTerm } },
              { property: 'Description', rich_text: { contains: searchTerm } },
              { property: 'ChittyID', rich_text: { contains: searchTerm } }
            ]
          },
          {
            property: 'Entity Type',
            select: { equals: entityTypes[0] } // Notion doesn't support OR on selects easily
          }
        ]
      };
    } else {
      filter = {
        or: [
          { property: 'Name', title: { contains: searchTerm } },
          { property: 'Description', rich_text: { contains: searchTerm } },
          { property: 'ChittyID', rich_text: { contains: searchTerm } }
        ]
      };
    }

    const response = await this.notion.databases.query({
      database_id: this.databaseIds.entities,
      filter,
      page_size: 20
    });

    return response.results.map(page => this.mapNotionToEntity(page));
  }

  // =============================================================================
  // INFORMATION OPERATIONS (Universal Data Repository)
  // =============================================================================

  async createInformation(info: Omit<UniversalInformation, 'id' | 'chittyId' | 'created' | 'modified'>): Promise<UniversalInformation> {
    const chittyId = await this.generateChittyId('INFO', info.title);

    const response = await this.notion.pages.create({
      parent: { database_id: this.databaseIds.information },
      properties: {
        'ChittyID': { rich_text: [{ text: { content: chittyId } }] },
        'Title': { title: [{ text: { content: info.title } }] },
        'Content Type': { select: { name: info.contentType } },
        'Content Format': info.contentFormat ? { rich_text: [{ text: { content: info.contentFormat } }] } : { rich_text: [] },
        'Content Summary': info.contentSummary ? { rich_text: [{ text: { content: info.contentSummary } }] } : { rich_text: [] },
        'Information Tier': { select: { name: info.informationTier } },
        'Authenticity Status': { select: { name: info.authenticityStatus || 'Unverified' } },
        'Content Hash': info.contentHash ? { rich_text: [{ text: { content: info.contentHash } }] } : { rich_text: [] },
        'Content Size': info.contentSize ? { number: info.contentSize } : { number: null },
        'Content Location': info.contentLocation ? { url: info.contentLocation } : { url: null },
        'Sensitivity Level': { select: { name: info.sensitivityLevel || 'Standard' } },
        'Verification Status': { select: { name: info.verificationStatus || 'Pending' } },
        'Tags': {
          multi_select: info.tags?.map(tag => ({ name: tag })) || []
        },
        'Content Date': info.contentDate ? { date: { start: info.contentDate.toISOString().split('T')[0] } } : { date: null },
        'Received Date': info.receivedDate ? { date: { start: info.receivedDate.toISOString().split('T')[0] } } : { date: null }
      }
    });

    return this.mapNotionToInformation(response);
  }

  async getInformationByTier(tier: string, options: {
    limit?: number;
    contentType?: string;
  } = {}): Promise<UniversalInformation[]> {
    const { limit = 50, contentType } = options;

    let filter: any = {
      property: 'Information Tier',
      select: { equals: tier }
    };

    if (contentType) {
      filter = {
        and: [
          filter,
          { property: 'Content Type', select: { equals: contentType } }
        ]
      };
    }

    const response = await this.notion.databases.query({
      database_id: this.databaseIds.information,
      filter,
      page_size: limit,
      sorts: [{ property: 'Created', direction: 'descending' }]
    });

    return response.results.map(page => this.mapNotionToInformation(page));
  }

  // =============================================================================
  // FACT OPERATIONS (Universal Knowledge Base)
  // =============================================================================

  async createFact(fact: Omit<AtomicFact, 'id' | 'chittyId' | 'recorded'>): Promise<AtomicFact> {
    const chittyId = await this.generateChittyId('FACT', fact.factStatement.substring(0, 50));

    const response = await this.notion.pages.create({
      parent: { database_id: this.databaseIds.facts },
      properties: {
        'ChittyID': { rich_text: [{ text: { content: chittyId } }] },
        'Fact Statement': { title: [{ text: { content: fact.factStatement } }] },
        'Fact Type': fact.factType ? { rich_text: [{ text: { content: fact.factType } }] } : { rich_text: [] },
        'Classification': { select: { name: fact.classification } },
        'Predicate': fact.predicate ? { rich_text: [{ text: { content: fact.predicate } }] } : { rich_text: [] },
        'Object Value': fact.objectValue ? { rich_text: [{ text: { content: fact.objectValue } }] } : { rich_text: [] },
        'Certainty Level': fact.certaintyLevel ? { number: fact.certaintyLevel } : { number: 0.5 },
        'Confidence Score': fact.confidenceScore ? { number: fact.confidenceScore } : { number: 0.5 },
        'Weight': fact.weight ? { number: fact.weight } : { number: 0.5 },
        'Extracted By': { select: { name: fact.extractedBy || 'Human' } },
        'Extraction Method': fact.extractionMethod ? { rich_text: [{ text: { content: fact.extractionMethod } }] } : { rich_text: [] },
        'Extraction Confidence': fact.extractionConfidence ? { number: fact.extractionConfidence } : { number: null },
        'Fact Timestamp': fact.factTimestamp ? { date: { start: fact.factTimestamp.toISOString() } } : { date: null },
        'Observed At': fact.observedAt ? { date: { start: fact.observedAt.toISOString() } } : { date: null },
        'Verification Status': { select: { name: fact.verificationStatus || 'Pending' } },
        'Sensitivity Level': { select: { name: fact.sensitivityLevel || 'Standard' } },
        'Context': fact.context ? { rich_text: [{ text: { content: JSON.stringify(fact.context) } }] } : { rich_text: [] }
      }
    });

    return this.mapNotionToFact(response);
  }

  async getFactsByClassification(classification: string, options: {
    limit?: number;
    minCertainty?: number;
    minConfidence?: number;
  } = {}): Promise<AtomicFact[]> {
    const { limit = 50, minCertainty = 0, minConfidence = 0 } = options;

    const response = await this.notion.databases.query({
      database_id: this.databaseIds.facts,
      filter: {
        property: 'Classification',
        select: { equals: classification }
      },
      page_size: limit,
      sorts: [
        { property: 'Certainty Level', direction: 'descending' },
        { property: 'Confidence Score', direction: 'descending' }
      ]
    });

    return response.results
      .map(page => this.mapNotionToFact(page))
      .filter(fact =>
        (fact.certaintyLevel || 0) >= minCertainty &&
        (fact.confidenceScore || 0) >= minConfidence
      );
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async generateChittyId(namespace: string, identifier: string): Promise<string> {
    try {
      const response = await fetch('https://id.chitty.cc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace, identifier })
      });

      if (!response.ok) {
        throw new Error('ChittyID service unavailable');
      }

      const { chittyId } = await response.json();
      return chittyId;
    } catch (error) {
      // Fallback to local generation if service is unavailable
      console.warn('ChittyID service unavailable, using fallback');
      const hash = await this.hashString(identifier);
      return `CHITTY-${namespace}-${hash.substring(0, 16).toUpperCase()}`;
    }
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private mapNotionToEntity(page: any): NeutralEntity {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      name: this.extractTitle(props.Name),
      entityType: this.extractSelect(props['Entity Type']),
      entitySubtype: this.extractRichText(props['Entity Subtype']),
      description: this.extractRichText(props.Description),
      status: this.extractSelect(props.Status) || 'Active',
      visibility: this.extractSelect(props.Visibility) || 'Public',
      classification: this.extractRichText(props.Classification),
      contextTags: this.extractMultiSelect(props['Context Tags']),
      verificationStatus: this.extractSelect(props['Verification Status']) || 'Unverified',
      accessLevel: this.extractSelect(props['Access Level']) || 'Standard',
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
      contentType: this.extractSelect(props['Content Type']),
      contentFormat: this.extractRichText(props['Content Format']),
      contentSummary: this.extractRichText(props['Content Summary']),
      informationTier: this.extractSelect(props['Information Tier']),
      authenticityStatus: this.extractSelect(props['Authenticity Status']) || 'Unverified',
      contentHash: this.extractRichText(props['Content Hash']),
      contentSize: this.extractNumber(props['Content Size']),
      contentLocation: this.extractUrl(props['Content Location']),
      sensitivityLevel: this.extractSelect(props['Sensitivity Level']) || 'Standard',
      verificationStatus: this.extractSelect(props['Verification Status']) || 'Pending',
      tags: this.extractMultiSelect(props.Tags),
      created: new Date(page.created_time),
      modified: new Date(page.last_edited_time),
      contentDate: this.extractDate(props['Content Date']),
      receivedDate: this.extractDate(props['Received Date'])
    };
  }

  private mapNotionToFact(page: any): AtomicFact {
    const props = page.properties;
    return {
      id: page.id,
      chittyId: this.extractRichText(props.ChittyID),
      factStatement: this.extractTitle(props['Fact Statement']),
      factType: this.extractRichText(props['Fact Type']),
      classification: this.extractSelect(props.Classification),
      predicate: this.extractRichText(props.Predicate),
      objectValue: this.extractRichText(props['Object Value']),
      certaintyLevel: this.extractNumber(props['Certainty Level']) || 0.5,
      confidenceScore: this.extractNumber(props['Confidence Score']) || 0.5,
      weight: this.extractNumber(props.Weight) || 0.5,
      extractedBy: this.extractSelect(props['Extracted By']) || 'Human',
      extractionMethod: this.extractRichText(props['Extraction Method']),
      extractionConfidence: this.extractNumber(props['Extraction Confidence']),
      factTimestamp: this.extractDate(props['Fact Timestamp']),
      observedAt: this.extractDate(props['Observed At']),
      recorded: new Date(page.created_time),
      verificationStatus: this.extractSelect(props['Verification Status']) || 'Pending',
      sensitivityLevel: this.extractSelect(props['Sensitivity Level']) || 'Standard',
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

  private extractUrl(prop: any): string | undefined {
    return prop?.url || undefined;
  }

  private extractDate(prop: any): Date | undefined {
    return prop?.date?.start ? new Date(prop.date.start) : undefined;
  }

  private parseJsonOrDefault(str: string, defaultValue: any): any {
    try {
      return str ? JSON.parse(str) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}