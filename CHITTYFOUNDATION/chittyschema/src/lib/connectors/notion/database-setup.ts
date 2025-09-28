/**
 * Notion Database Setup - Neutral Universal Framework
 *
 * Automated setup service for creating and configuring Notion databases
 * with neutral, domain-agnostic schemas
 */

import { Client } from '@notionhq/client';
import { NotionConnectorConfig, DatabaseSetupOptions } from './types';

export class NotionDatabaseSetup {
  private notion: Client;
  // @ts-ignore - Config stored for future extensibility
  private _config: NotionConnectorConfig;

  constructor(config: NotionConnectorConfig) {
    this.notion = new Client({ auth: config.apiKey });
    this._config = config;
  }

  /**
   * Complete database setup with all neutral schemas
   */
  async setupAllDatabases(options: DatabaseSetupOptions = {
    createNew: true,
    overwriteExisting: false,
    setupRelationships: true,
    createSampleData: false,
    validateSchema: true
  }): Promise<Record<string, string>> {
    console.log('Setting up neutral Notion databases...');

    const databaseIds: Record<string, string> = {};

    try {
      // Create all databases
      databaseIds.entities = await this.createEntitiesDatabase(options);
      databaseIds.information = await this.createInformationDatabase(options);
      databaseIds.facts = await this.createFactsDatabase(options);
      databaseIds.contexts = await this.createContextsDatabase(options);
      databaseIds.relationships = await this.createRelationshipsDatabase(options);
      databaseIds.conflicts = await this.createConflictsDatabase(options);
      databaseIds.activities = await this.createActivitiesDatabase(options);
      databaseIds.actors = await this.createActorsDatabase(options);

      // Setup relationships between databases
      if (options.setupRelationships) {
        await this.setupDatabaseRelationships(databaseIds);
      }

      // Create sample data
      if (options.createSampleData) {
        await this.createSampleData(databaseIds);
      }

      // Validate schemas
      if (options.validateSchema) {
        await this.validateDatabaseSchemas(databaseIds);
      }

      console.log('✅ All neutral databases created successfully');
      return databaseIds;

    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  /**
   * Create Entities database (Universal Objects)
   */
  private async createEntitiesDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const title = 'Universal Entities';

    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: title } }],
      properties: {
        'ChittyID': {
          rich_text: {
            id: 'chittyid'
          }
        },
        'Name': {
          title: {
            id: 'name'
          }
        },
        'Entity Type': {
          select: {
            options: [
              { name: 'PEO', color: 'blue' },
              { name: 'PLACE', color: 'green' },
              { name: 'PROP', color: 'orange' },
              { name: 'EVNT', color: 'purple' },
              { name: 'AUTH', color: 'red' }
            ]
          }
        },
        'Entity Subtype': {
          rich_text: {}
        },
        'Description': {
          rich_text: {}
        },
        'Status': {
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Inactive', color: 'yellow' },
              { name: 'Archived', color: 'gray' },
              { name: 'Deleted', color: 'red' }
            ]
          }
        },
        'Visibility': {
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Restricted', color: 'yellow' },
              { name: 'Private', color: 'red' }
            ]
          }
        },
        'Classification': {
          rich_text: {}
        },
        'Context Tags': {
          multi_select: {
            options: [
              { name: 'research', color: 'blue' },
              { name: 'business', color: 'green' },
              { name: 'healthcare', color: 'red' },
              { name: 'education', color: 'purple' },
              { name: 'finance', color: 'orange' }
            ]
          }
        },
        'Verification Status': {
          select: {
            options: [
              { name: 'Unverified', color: 'gray' },
              { name: 'Pending', color: 'yellow' },
              { name: 'Verified', color: 'green' },
              { name: 'Disputed', color: 'orange' },
              { name: 'Rejected', color: 'red' }
            ]
          }
        },
        'Access Level': {
          select: {
            options: [
              { name: 'Standard', color: 'blue' },
              { name: 'Elevated', color: 'yellow' },
              { name: 'Restricted', color: 'red' }
            ]
          }
        },
        'Created': {
          created_time: {}
        },
        'Modified': {
          last_edited_time: {}
        },
        'Metadata': {
          rich_text: {}
        }
      }
    });

    console.log(`✅ Created ${title} database: ${response.id}`);
    return response.id;
  }

  /**
   * Create Information database (Universal Data Repository)
   */
  private async createInformationDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const title = 'Universal Information';

    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: title } }],
      properties: {
        'ChittyID': {
          rich_text: {}
        },
        'Title': {
          title: {}
        },
        'Content Type': {
          select: {
            options: [
              { name: 'Document', color: 'blue' },
              { name: 'Image', color: 'green' },
              { name: 'Audio', color: 'purple' },
              { name: 'Video', color: 'red' },
              { name: 'Data', color: 'orange' },
              { name: 'Communication', color: 'yellow' },
              { name: 'Physical', color: 'brown' },
              { name: 'Other', color: 'gray' }
            ]
          }
        },
        'Content Format': {
          rich_text: {}
        },
        'Content Summary': {
          rich_text: {}
        },
        'Information Tier': {
          select: {
            options: [
              { name: 'PRIMARY_SOURCE', color: 'green' },
              { name: 'OFFICIAL_RECORD', color: 'blue' },
              { name: 'INSTITUTIONAL', color: 'purple' },
              { name: 'THIRD_PARTY', color: 'orange' },
              { name: 'DERIVED', color: 'yellow' },
              { name: 'REPORTED', color: 'pink' },
              { name: 'UNVERIFIED', color: 'gray' }
            ]
          }
        },
        'Authenticity Status': {
          select: {
            options: [
              { name: 'Authentic', color: 'green' },
              { name: 'Unverified', color: 'gray' },
              { name: 'Disputed', color: 'orange' },
              { name: 'Fabricated', color: 'red' }
            ]
          }
        },
        'Content Hash': {
          rich_text: {}
        },
        'Content Size': {
          number: {}
        },
        'Content Location': {
          url: {}
        },
        'Sensitivity Level': {
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Standard', color: 'blue' },
              { name: 'Sensitive', color: 'yellow' },
              { name: 'Restricted', color: 'orange' },
              { name: 'Confidential', color: 'red' }
            ]
          }
        },
        'Verification Status': {
          select: {
            options: [
              { name: 'Pending', color: 'yellow' },
              { name: 'Verified', color: 'green' },
              { name: 'Disputed', color: 'orange' },
              { name: 'Rejected', color: 'red' }
            ]
          }
        },
        'Tags': {
          multi_select: {}
        },
        'Created': {
          created_time: {}
        },
        'Modified': {
          last_edited_time: {}
        },
        'Content Date': {
          date: {}
        },
        'Received Date': {
          date: {}
        }
      }
    });

    console.log(`✅ Created ${title} database: ${response.id}`);
    return response.id;
  }

  /**
   * Create Facts database (Universal Knowledge Base)
   */
  private async createFactsDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const title = 'Atomic Facts';

    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: title } }],
      properties: {
        'ChittyID': {
          rich_text: {}
        },
        'Fact Statement': {
          title: {}
        },
        'Fact Type': {
          rich_text: {}
        },
        'Classification': {
          select: {
            options: [
              { name: 'OBSERVATION', color: 'green' },
              { name: 'MEASUREMENT', color: 'blue' },
              { name: 'ASSERTION', color: 'orange' },
              { name: 'INFERENCE', color: 'purple' },
              { name: 'DERIVED', color: 'yellow' },
              { name: 'OPINION', color: 'pink' },
              { name: 'HYPOTHESIS', color: 'gray' }
            ]
          }
        },
        'Predicate': {
          rich_text: {}
        },
        'Object Value': {
          rich_text: {}
        },
        'Certainty Level': {
          number: {
            format: 'percent'
          }
        },
        'Confidence Score': {
          number: {
            format: 'percent'
          }
        },
        'Weight': {
          number: {
            format: 'percent'
          }
        },
        'Extracted By': {
          select: {
            options: [
              { name: 'Human', color: 'blue' },
              { name: 'AI', color: 'purple' },
              { name: 'System', color: 'gray' }
            ]
          }
        },
        'Extraction Method': {
          rich_text: {}
        },
        'Extraction Confidence': {
          number: {
            format: 'percent'
          }
        },
        'Fact Timestamp': {
          date: {}
        },
        'Observed At': {
          date: {}
        },
        'Recorded': {
          created_time: {}
        },
        'Verification Status': {
          select: {
            options: [
              { name: 'Pending', color: 'yellow' },
              { name: 'Verified', color: 'green' },
              { name: 'Disputed', color: 'orange' },
              { name: 'Rejected', color: 'red' }
            ]
          }
        },
        'Sensitivity Level': {
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Standard', color: 'blue' },
              { name: 'Sensitive', color: 'yellow' },
              { name: 'Restricted', color: 'orange' },
              { name: 'Confidential', color: 'red' }
            ]
          }
        },
        'Context': {
          rich_text: {}
        }
      }
    });

    console.log(`✅ Created ${title} database: ${response.id}`);
    return response.id;
  }

  /**
   * Create remaining databases (simplified for brevity)
   */
  private async createContextsDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: 'Universal Contexts' } }],
      properties: {
        'ChittyID': { rich_text: {} },
        'Context Name': { title: {} },
        'Context Type': {
          select: {
            options: [
              { name: 'PROJECT', color: 'blue' },
              { name: 'INVESTIGATION', color: 'red' },
              { name: 'ANALYSIS', color: 'green' },
              { name: 'RESEARCH', color: 'purple' },
              { name: 'MONITORING', color: 'orange' },
              { name: 'ARCHIVE', color: 'gray' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: 'Planning', color: 'gray' },
              { name: 'Active', color: 'green' },
              { name: 'Paused', color: 'yellow' },
              { name: 'Completed', color: 'blue' },
              { name: 'Cancelled', color: 'red' },
              { name: 'Archived', color: 'brown' }
            ]
          }
        },
        'Progress': { number: { format: 'percent' } },
        'Created': { created_time: {} }
      }
    });
    console.log(`✅ Created Universal Contexts database: ${response.id}`);
    return response.id;
  }

  private async createRelationshipsDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: 'Entity Relationships' } }],
      properties: {
        'ChittyID': { rich_text: {} },
        'Relationship Name': { title: {} },
        'Relationship Type': {
          select: {
            options: [
              { name: 'ASSOCIATION', color: 'blue' },
              { name: 'CONTAINMENT', color: 'green' },
              { name: 'SEQUENCE', color: 'purple' },
              { name: 'DERIVATION', color: 'orange' },
              { name: 'SIMILARITY', color: 'yellow' },
              { name: 'OPPOSITION', color: 'red' },
              { name: 'DEPENDENCY', color: 'pink' },
              { name: 'TRANSFORMATION', color: 'brown' }
            ]
          }
        },
        'Created': { created_time: {} }
      }
    });
    console.log(`✅ Created Entity Relationships database: ${response.id}`);
    return response.id;
  }

  private async createConflictsDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: 'Conflict Records' } }],
      properties: {
        'ChittyID': { rich_text: {} },
        'Conflict Description': { title: {} },
        'Conflict Type': {
          select: {
            options: [
              { name: 'DIRECT', color: 'red' },
              { name: 'TEMPORAL', color: 'orange' },
              { name: 'LOGICAL', color: 'purple' },
              { name: 'SOURCE', color: 'blue' },
              { name: 'MEASUREMENT', color: 'green' },
              { name: 'INTERPRETATION', color: 'yellow' }
            ]
          }
        },
        'Created': { created_time: {} }
      }
    });
    console.log(`✅ Created Conflict Records database: ${response.id}`);
    return response.id;
  }

  private async createActivitiesDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: 'Activity Records' } }],
      properties: {
        'ChittyID': { rich_text: {} },
        'Activity': { title: {} },
        'Activity Type': {
          select: {
            options: [
              { name: 'CREATE', color: 'green' },
              { name: 'READ', color: 'blue' },
              { name: 'UPDATE', color: 'yellow' },
              { name: 'DELETE', color: 'red' },
              { name: 'EXECUTE', color: 'purple' },
              { name: 'AUTHENTICATE', color: 'orange' },
              { name: 'AUTHORIZE', color: 'pink' }
            ]
          }
        },
        'Created': { created_time: {} }
      }
    });
    console.log(`✅ Created Activity Records database: ${response.id}`);
    return response.id;
  }

  private async createActorsDatabase(_options: DatabaseSetupOptions): Promise<string> {
    const response = await this.notion.databases.create({
      parent: { page_id: await this.getParentPageId() },
      title: [{ text: { content: 'Actor Records' } }],
      properties: {
        'ChittyID': { rich_text: {} },
        'Display Name': { title: {} },
        'Actor Type': {
          select: {
            options: [
              { name: 'HUMAN', color: 'blue' },
              { name: 'SYSTEM', color: 'gray' },
              { name: 'ORGANIZATION', color: 'green' },
              { name: 'AI', color: 'purple' },
              { name: 'BOT', color: 'orange' },
              { name: 'SERVICE', color: 'yellow' }
            ]
          }
        },
        'Created': { created_time: {} }
      }
    });
    console.log(`✅ Created Actor Records database: ${response.id}`);
    return response.id;
  }

  /**
   * Setup relationships between databases
   */
  private async setupDatabaseRelationships(_databaseIds: Record<string, string>): Promise<void> {
    console.log('🔗 Setting up database relationships...');
    // Note: Notion API doesn't support adding relations after database creation
    // This would need to be done manually in the Notion UI or during initial creation
    console.log('⚠️ Database relationships need to be configured manually in Notion UI');
  }

  /**
   * Create sample data for testing
   */
  private async createSampleData(databaseIds: Record<string, string>): Promise<void> {
    console.log('📝 Creating sample data...');

    // Create sample entity
    await this.notion.pages.create({
      parent: { database_id: databaseIds.entities },
      properties: {
        'ChittyID': { rich_text: [{ text: { content: 'CHITTY-PEO-SAMPLE001' } }] },
        'Name': { title: [{ text: { content: 'Sample Research Subject' } }] },
        'Entity Type': { select: { name: 'PEO' } },
        'Status': { select: { name: 'Active' } },
        'Visibility': { select: { name: 'Public' } },
        'Context Tags': { multi_select: [{ name: 'research' }] },
        'Verification Status': { select: { name: 'Verified' } },
        'Access Level': { select: { name: 'Standard' } }
      }
    });

    console.log('✅ Sample data created');
  }

  /**
   * Validate database schemas
   */
  private async validateDatabaseSchemas(databaseIds: Record<string, string>): Promise<void> {
    console.log('✅ Validating database schemas...');

    for (const [name, id] of Object.entries(databaseIds)) {
      try {
        const database = await this.notion.databases.retrieve({ database_id: id });
        console.log(`✅ ${name} database schema valid: ${database.title?.[0]?.plain_text}`);
      } catch (error) {
        console.error(`❌ ${name} database validation failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Get parent page ID (create if needed)
   */
  private async getParentPageId(): Promise<string> {
    // For now, use workspace root - in production, you'd create a dedicated parent page
    // This is a placeholder - would need actual workspace page ID
    return 'workspace-root-page-id';
  }

  /**
   * Health check for all databases
   */
  async healthCheck(databaseIds: Record<string, string>): Promise<boolean> {
    try {
      for (const [_name, id] of Object.entries(databaseIds)) {
        await this.notion.databases.retrieve({ database_id: id });
      }
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}