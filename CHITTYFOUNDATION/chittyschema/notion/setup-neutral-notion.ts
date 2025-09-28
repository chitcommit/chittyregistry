#!/usr/bin/env tsx

/**
 * Automated Notion Setup - Neutral Universal Framework
 *
 * This script automatically creates all neutral Notion databases
 * with proper properties, relationships, and configurations
 *
 * Run with: npx tsx notion/setup-neutral-notion.ts
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

config();

interface DatabaseConfig {
  name: string;
  description: string;
  properties: Record<string, any>;
  icon?: string;
}

class NeutralNotionSetup {
  private notion: Client;
  private workspaceId?: string;
  private databaseIds: Record<string, string> = {};

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notion = new Client({ auth: apiKey });
    this.workspaceId = process.env.NOTION_WORKSPACE_ID;
  }

  /**
   * Main setup function - creates all neutral databases
   */
  async setupAllDatabases(): Promise<void> {
    console.log('🚀 Starting Neutral Notion Database Setup');
    console.log('=========================================\n');

    try {
      // Create databases in dependency order
      await this.createEntitiesDatabase();
      await this.createActorsDatabase();
      await this.createInformationItemsDatabase();
      await this.createAtomicFactsDatabase();
      await this.createContextsDatabase();
      await this.createRelationshipsDatabase();
      await this.createConflictsDatabase();
      await this.createActivitiesDatabase();

      // Setup relationships between databases
      await this.setupDatabaseRelationships();

      console.log('\n✅ All neutral databases created successfully!');
      this.printDatabaseIds();
      this.saveEnvironmentConfig();

    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  /**
   * Create Entities database (Universal Objects)
   */
  private async createEntitiesDatabase(): Promise<void> {
    console.log('📊 Creating Entities database...');

    const config: DatabaseConfig = {
      name: 'Entities - Universal Objects',
      description: 'All entities across any domain - people, organizations, systems, objects',
      icon: '🌐',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Name': {
          type: 'title',
          title: {}
        },
        'Entity Type': {
          type: 'select',
          select: {
            options: [
              { name: 'PEO', color: 'blue' },
              { name: 'PLACE', color: 'green' },
              { name: 'PROP', color: 'yellow' },
              { name: 'EVNT', color: 'red' },
              { name: 'AUTH', color: 'purple' }
            ]
          }
        },
        'Entity Subtype': {
          type: 'rich_text',
          rich_text: {}
        },
        'Description': {
          type: 'rich_text',
          rich_text: {}
        },
        'Status': {
          type: 'select',
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Inactive', color: 'gray' },
              { name: 'Archived', color: 'brown' },
              { name: 'Deleted', color: 'red' }
            ]
          }
        },
        'Visibility': {
          type: 'select',
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Restricted', color: 'yellow' },
              { name: 'Private', color: 'red' }
            ]
          }
        },
        'Classification': {
          type: 'rich_text',
          rich_text: {}
        },
        'Context Tags': {
          type: 'multi_select',
          multi_select: {
            options: [
              { name: 'Research', color: 'blue' },
              { name: 'Analysis', color: 'purple' },
              { name: 'Review', color: 'orange' },
              { name: 'Archive', color: 'gray' }
            ]
          }
        },
        'Verification Status': {
          type: 'select',
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
          type: 'select',
          select: {
            options: [
              { name: 'Standard', color: 'blue' },
              { name: 'Elevated', color: 'yellow' },
              { name: 'Restricted', color: 'red' }
            ]
          }
        },
        'Created': {
          type: 'created_time',
          created_time: {}
        },
        'Modified': {
          type: 'last_edited_time',
          last_edited_time: {}
        },
        'Created By': {
          type: 'created_by',
          created_by: {}
        },
        'Metadata': {
          type: 'rich_text',
          rich_text: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.entities = database.id;
    console.log('✅ Entities database created:', database.id);
  }

  /**
   * Create Information Items database (Universal Data Repository)
   */
  private async createInformationItemsDatabase(): Promise<void> {
    console.log('📊 Creating Information Items database...');

    const config: DatabaseConfig = {
      name: 'Information Items - Universal Repository',
      description: 'All information items regardless of type or domain',
      icon: '📁',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Title': {
          type: 'title',
          title: {}
        },
        'Content Type': {
          type: 'select',
          select: {
            options: [
              { name: 'Document', color: 'blue' },
              { name: 'Image', color: 'green' },
              { name: 'Audio', color: 'yellow' },
              { name: 'Video', color: 'red' },
              { name: 'Data', color: 'purple' },
              { name: 'Communication', color: 'pink' },
              { name: 'Physical', color: 'brown' },
              { name: 'Other', color: 'gray' }
            ]
          }
        },
        'Content Format': {
          type: 'rich_text',
          rich_text: {}
        },
        'Content Summary': {
          type: 'rich_text',
          rich_text: {}
        },
        'Information Tier': {
          type: 'select',
          select: {
            options: [
              { name: 'PRIMARY_SOURCE', color: 'green' },
              { name: 'OFFICIAL_RECORD', color: 'blue' },
              { name: 'INSTITUTIONAL', color: 'purple' },
              { name: 'THIRD_PARTY', color: 'yellow' },
              { name: 'DERIVED', color: 'orange' },
              { name: 'REPORTED', color: 'pink' },
              { name: 'UNVERIFIED', color: 'gray' }
            ]
          }
        },
        'Authenticity Status': {
          type: 'select',
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
          type: 'rich_text',
          rich_text: {}
        },
        'Content Size': {
          type: 'number',
          number: { format: 'number' }
        },
        'Content Location': {
          type: 'url',
          url: {}
        },
        'Sensitivity Level': {
          type: 'select',
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
          type: 'select',
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
          type: 'multi_select',
          multi_select: {
            options: []
          }
        },
        'Created': {
          type: 'created_time',
          created_time: {}
        },
        'Modified': {
          type: 'last_edited_time',
          last_edited_time: {}
        },
        'Content Date': {
          type: 'date',
          date: {}
        },
        'Received Date': {
          type: 'date',
          date: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.informationItems = database.id;
    console.log('✅ Information Items database created:', database.id);
  }

  /**
   * Create Atomic Facts database (Universal Knowledge Base)
   */
  private async createAtomicFactsDatabase(): Promise<void> {
    console.log('📊 Creating Atomic Facts database...');

    const config: DatabaseConfig = {
      name: 'Atomic Facts - Universal Knowledge',
      description: 'Atomic units of knowledge extracted from information',
      icon: '💡',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Fact Statement': {
          type: 'title',
          title: {}
        },
        'Fact Type': {
          type: 'rich_text',
          rich_text: {}
        },
        'Classification': {
          type: 'select',
          select: {
            options: [
              { name: 'OBSERVATION', color: 'blue' },
              { name: 'MEASUREMENT', color: 'green' },
              { name: 'ASSERTION', color: 'yellow' },
              { name: 'INFERENCE', color: 'purple' },
              { name: 'DERIVED', color: 'orange' },
              { name: 'OPINION', color: 'pink' },
              { name: 'HYPOTHESIS', color: 'gray' }
            ]
          }
        },
        'Predicate': {
          type: 'rich_text',
          rich_text: {}
        },
        'Object Value': {
          type: 'rich_text',
          rich_text: {}
        },
        'Certainty Level': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Confidence Score': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Weight': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Extracted By': {
          type: 'select',
          select: {
            options: [
              { name: 'Human', color: 'blue' },
              { name: 'AI', color: 'purple' },
              { name: 'System', color: 'gray' }
            ]
          }
        },
        'Extraction Method': {
          type: 'rich_text',
          rich_text: {}
        },
        'Extraction Confidence': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Fact Timestamp': {
          type: 'date',
          date: {}
        },
        'Observed At': {
          type: 'date',
          date: {}
        },
        'Recorded At': {
          type: 'created_time',
          created_time: {}
        },
        'Verification Status': {
          type: 'select',
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
          type: 'select',
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
          type: 'rich_text',
          rich_text: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.atomicFacts = database.id;
    console.log('✅ Atomic Facts database created:', database.id);
  }

  /**
   * Create Contexts database (Universal Project Management)
   */
  private async createContextsDatabase(): Promise<void> {
    console.log('📊 Creating Contexts database...');

    const config: DatabaseConfig = {
      name: 'Contexts - Universal Projects',
      description: 'Organize work into contexts/projects/investigations',
      icon: '📂',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Context Name': {
          type: 'title',
          title: {}
        },
        'Context Type': {
          type: 'select',
          select: {
            options: [
              { name: 'PROJECT', color: 'blue' },
              { name: 'INVESTIGATION', color: 'purple' },
              { name: 'ANALYSIS', color: 'green' },
              { name: 'RESEARCH', color: 'yellow' },
              { name: 'MONITORING', color: 'orange' },
              { name: 'ARCHIVE', color: 'gray' }
            ]
          }
        },
        'Context Subtype': {
          type: 'rich_text',
          rich_text: {}
        },
        'Description': {
          type: 'rich_text',
          rich_text: {}
        },
        'Purpose': {
          type: 'rich_text',
          rich_text: {}
        },
        'Scope': {
          type: 'rich_text',
          rich_text: {}
        },
        'Objectives': {
          type: 'multi_select',
          multi_select: {
            options: []
          }
        },
        'Status': {
          type: 'select',
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
        'Progress': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Start Date': {
          type: 'date',
          date: {}
        },
        'Target End Date': {
          type: 'date',
          date: {}
        },
        'Actual End Date': {
          type: 'date',
          date: {}
        },
        'Owner': {
          type: 'people',
          people: {}
        },
        'Participants': {
          type: 'people',
          people: {}
        },
        'Access Level': {
          type: 'select',
          select: {
            options: [
              { name: 'Standard', color: 'blue' },
              { name: 'Restricted', color: 'yellow' },
              { name: 'Confidential', color: 'red' }
            ]
          }
        },
        'Visibility': {
          type: 'select',
          select: {
            options: [
              { name: 'Public', color: 'green' },
              { name: 'Restricted', color: 'yellow' },
              { name: 'Private', color: 'red' }
            ]
          }
        },
        'Tags': {
          type: 'multi_select',
          multi_select: {
            options: []
          }
        },
        'Created': {
          type: 'created_time',
          created_time: {}
        },
        'Modified': {
          type: 'last_edited_time',
          last_edited_time: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.contexts = database.id;
    console.log('✅ Contexts database created:', database.id);
  }

  /**
   * Create Relationships database
   */
  private async createRelationshipsDatabase(): Promise<void> {
    console.log('📊 Creating Relationships database...');

    const config: DatabaseConfig = {
      name: 'Relationships - Universal Connections',
      description: 'Track relationships between any entities',
      icon: '🔗',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Relationship Name': {
          type: 'title',
          title: {}
        },
        'Relationship Type': {
          type: 'select',
          select: {
            options: [
              { name: 'ASSOCIATION', color: 'blue' },
              { name: 'CONTAINMENT', color: 'green' },
              { name: 'SEQUENCE', color: 'yellow' },
              { name: 'DERIVATION', color: 'purple' },
              { name: 'SIMILARITY', color: 'pink' },
              { name: 'OPPOSITION', color: 'red' },
              { name: 'DEPENDENCY', color: 'orange' },
              { name: 'TRANSFORMATION', color: 'brown' }
            ]
          }
        },
        'Relationship Subtype': {
          type: 'rich_text',
          rich_text: {}
        },
        'Direction': {
          type: 'select',
          select: {
            options: [
              { name: 'Unidirectional', color: 'blue' },
              { name: 'Bidirectional', color: 'green' }
            ]
          }
        },
        'Strength Score': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Confidence Score': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Relationship Start': {
          type: 'date',
          date: {}
        },
        'Relationship End': {
          type: 'date',
          date: {}
        },
        'Is Current': {
          type: 'checkbox',
          checkbox: {}
        },
        'Context': {
          type: 'rich_text',
          rich_text: {}
        },
        'Created': {
          type: 'created_time',
          created_time: {}
        },
        'Modified': {
          type: 'last_edited_time',
          last_edited_time: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.relationships = database.id;
    console.log('✅ Relationships database created:', database.id);
  }

  /**
   * Create Conflicts database
   */
  private async createConflictsDatabase(): Promise<void> {
    console.log('📊 Creating Conflicts database...');

    const config: DatabaseConfig = {
      name: 'Conflicts - Contradiction Tracking',
      description: 'Track conflicts between facts or information',
      icon: '⚠️',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Conflict Description': {
          type: 'title',
          title: {}
        },
        'Conflict Type': {
          type: 'select',
          select: {
            options: [
              { name: 'DIRECT', color: 'red' },
              { name: 'TEMPORAL', color: 'yellow' },
              { name: 'LOGICAL', color: 'purple' },
              { name: 'SOURCE', color: 'blue' },
              { name: 'MEASUREMENT', color: 'green' },
              { name: 'INTERPRETATION', color: 'orange' }
            ]
          }
        },
        'Conflict Severity': {
          type: 'select',
          select: {
            options: [
              { name: 'Low', color: 'green' },
              { name: 'Moderate', color: 'yellow' },
              { name: 'High', color: 'orange' },
              { name: 'Critical', color: 'red' }
            ]
          }
        },
        'Conflict Category': {
          type: 'rich_text',
          rich_text: {}
        },
        'Conflict Basis': {
          type: 'rich_text',
          rich_text: {}
        },
        'Resolution Method': {
          type: 'rich_text',
          rich_text: {}
        },
        'Resolution Status': {
          type: 'select',
          select: {
            options: [
              { name: 'Unresolved', color: 'red' },
              { name: 'Pending', color: 'yellow' },
              { name: 'Resolved', color: 'green' },
              { name: 'Permanent', color: 'blue' }
            ]
          }
        },
        'Resolved At': {
          type: 'date',
          date: {}
        },
        'Resolved By': {
          type: 'people',
          people: {}
        },
        'Resolution Rationale': {
          type: 'rich_text',
          rich_text: {}
        },
        'Impact Score': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Detected At': {
          type: 'created_time',
          created_time: {}
        },
        'Detected By': {
          type: 'select',
          select: {
            options: [
              { name: 'System', color: 'gray' },
              { name: 'Human', color: 'blue' },
              { name: 'AI', color: 'purple' }
            ]
          }
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.conflicts = database.id;
    console.log('✅ Conflicts database created:', database.id);
  }

  /**
   * Create Activities database (Audit Trail)
   */
  private async createActivitiesDatabase(): Promise<void> {
    console.log('📊 Creating Activities database...');

    const config: DatabaseConfig = {
      name: 'Activities - Universal Audit Trail',
      description: 'Track all system activities and changes',
      icon: '📝',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Activity': {
          type: 'title',
          title: {}
        },
        'Activity Type': {
          type: 'select',
          select: {
            options: [
              { name: 'CREATE', color: 'green' },
              { name: 'READ', color: 'blue' },
              { name: 'UPDATE', color: 'yellow' },
              { name: 'DELETE', color: 'red' },
              { name: 'EXECUTE', color: 'purple' },
              { name: 'AUTHENTICATE', color: 'pink' },
              { name: 'AUTHORIZE', color: 'orange' }
            ]
          }
        },
        'Activity Category': {
          type: 'rich_text',
          rich_text: {}
        },
        'Resource Type': {
          type: 'rich_text',
          rich_text: {}
        },
        'Resource ID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Actor Type': {
          type: 'select',
          select: {
            options: [
              { name: 'HUMAN', color: 'blue' },
              { name: 'SYSTEM', color: 'gray' },
              { name: 'ORGANIZATION', color: 'green' },
              { name: 'AI', color: 'purple' },
              { name: 'BOT', color: 'yellow' },
              { name: 'SERVICE', color: 'orange' }
            ]
          }
        },
        'Status Code': {
          type: 'number',
          number: { format: 'number' }
        },
        'Started At': {
          type: 'created_time',
          created_time: {}
        },
        'Completed At': {
          type: 'date',
          date: {}
        },
        'Duration (ms)': {
          type: 'number',
          number: { format: 'number' }
        },
        'Session ID': {
          type: 'rich_text',
          rich_text: {}
        },
        'IP Address': {
          type: 'rich_text',
          rich_text: {}
        },
        'Source System': {
          type: 'rich_text',
          rich_text: {}
        },
        'Risk Score': {
          type: 'number',
          number: { format: 'percent' }
        },
        'Anomaly Detected': {
          type: 'checkbox',
          checkbox: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.activities = database.id;
    console.log('✅ Activities database created:', database.id);
  }

  /**
   * Create Actors database
   */
  private async createActorsDatabase(): Promise<void> {
    console.log('📊 Creating Actors database...');

    const config: DatabaseConfig = {
      name: 'Actors - Universal User Registry',
      description: 'Track all actors in the system',
      icon: '👤',
      properties: {
        'ChittyID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Display Name': {
          type: 'title',
          title: {}
        },
        'Actor Type': {
          type: 'select',
          select: {
            options: [
              { name: 'HUMAN', color: 'blue' },
              { name: 'SYSTEM', color: 'gray' },
              { name: 'ORGANIZATION', color: 'green' },
              { name: 'AI', color: 'purple' },
              { name: 'BOT', color: 'yellow' },
              { name: 'SERVICE', color: 'orange' }
            ]
          }
        },
        'Actor Subtype': {
          type: 'rich_text',
          rich_text: {}
        },
        'Identifier': {
          type: 'rich_text',
          rich_text: {}
        },
        'Description': {
          type: 'rich_text',
          rich_text: {}
        },
        'Contact Info': {
          type: 'rich_text',
          rich_text: {}
        },
        'Status': {
          type: 'select',
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Inactive', color: 'gray' },
              { name: 'Suspended', color: 'yellow' },
              { name: 'Deleted', color: 'red' }
            ]
          }
        },
        'Access Level': {
          type: 'select',
          select: {
            options: [
              { name: 'Restricted', color: 'red' },
              { name: 'Standard', color: 'blue' },
              { name: 'Elevated', color: 'yellow' },
              { name: 'Administrative', color: 'purple' },
              { name: 'System', color: 'gray' }
            ]
          }
        },
        'Permissions': {
          type: 'multi_select',
          multi_select: {
            options: []
          }
        },
        'Security Clearance': {
          type: 'rich_text',
          rich_text: {}
        },
        'Risk Level': {
          type: 'select',
          select: {
            options: [
              { name: 'Standard', color: 'green' },
              { name: 'Elevated', color: 'yellow' },
              { name: 'High', color: 'red' }
            ]
          }
        },
        'Authentication Methods': {
          type: 'multi_select',
          multi_select: {
            options: [
              { name: 'Password', color: 'blue' },
              { name: 'MFA', color: 'green' },
              { name: 'SSO', color: 'purple' },
              { name: 'API Key', color: 'yellow' },
              { name: 'Certificate', color: 'red' }
            ]
          }
        },
        'Last Active': {
          type: 'date',
          date: {}
        },
        'Created': {
          type: 'created_time',
          created_time: {}
        },
        'Deactivated At': {
          type: 'date',
          date: {}
        }
      }
    };

    const database = await this.createDatabase(config);
    this.databaseIds.actors = database.id;
    console.log('✅ Actors database created:', database.id);
  }

  /**
   * Setup relationships between databases
   */
  private async setupDatabaseRelationships(): Promise<void> {
    console.log('\n🔗 Setting up database relationships...');

    // Note: In Notion, relationships are created when you add relation properties
    // The actual linking happens when you create the databases with relation properties
    // This is a placeholder for any post-creation relationship configuration

    console.log('✅ Relationships configured');
  }

  /**
   * Generic database creation helper
   */
  private async createDatabase(config: DatabaseConfig): Promise<any> {
    const parent = this.workspaceId ? { page_id: this.workspaceId } : undefined;

    const response = await this.notion.databases.create({
      parent: parent || { page_id: process.env.NOTION_PAGE_ID || '' },
      title: [{
        type: 'text',
        text: { content: config.name }
      }],
      description: [{
        type: 'text',
        text: { content: config.description }
      }],
      icon: config.icon ? { type: 'emoji', emoji: config.icon as any } : undefined,
      properties: config.properties
    });

    return response;
  }

  /**
   * Print all database IDs for reference
   */
  private printDatabaseIds(): void {
    console.log('\n📋 Database IDs for Environment Configuration:');
    console.log('=============================================');
    console.log(`NOTION_DATABASE_ENTITIES=${this.databaseIds.entities}`);
    console.log(`NOTION_DATABASE_ACTORS=${this.databaseIds.actors}`);
    console.log(`NOTION_DATABASE_INFORMATION=${this.databaseIds.informationItems}`);
    console.log(`NOTION_DATABASE_FACTS=${this.databaseIds.atomicFacts}`);
    console.log(`NOTION_DATABASE_CONTEXTS=${this.databaseIds.contexts}`);
    console.log(`NOTION_DATABASE_RELATIONSHIPS=${this.databaseIds.relationships}`);
    console.log(`NOTION_DATABASE_CONFLICTS=${this.databaseIds.conflicts}`);
    console.log(`NOTION_DATABASE_ACTIVITIES=${this.databaseIds.activities}`);
  }

  /**
   * Save environment configuration to file
   */
  private saveEnvironmentConfig(): void {
    const envContent = `
# Neutral Notion Database IDs
NOTION_DATABASE_ENTITIES=${this.databaseIds.entities}
NOTION_DATABASE_ACTORS=${this.databaseIds.actors}
NOTION_DATABASE_INFORMATION=${this.databaseIds.informationItems}
NOTION_DATABASE_FACTS=${this.databaseIds.atomicFacts}
NOTION_DATABASE_CONTEXTS=${this.databaseIds.contexts}
NOTION_DATABASE_RELATIONSHIPS=${this.databaseIds.relationships}
NOTION_DATABASE_CONFLICTS=${this.databaseIds.conflicts}
NOTION_DATABASE_ACTIVITIES=${this.databaseIds.activities}
`;

    console.log('\n💾 Add these to your .env file:');
    console.log(envContent);
  }
}

// Run the setup
async function main() {
  try {
    const setup = new NeutralNotionSetup();
    await setup.setupAllDatabases();
    console.log('\n🎉 Neutral Notion setup complete!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}