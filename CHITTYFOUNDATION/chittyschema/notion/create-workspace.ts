#!/usr/bin/env tsx
/**
 * Create ChittyOS Notion Workspace
 *
 * Automatically creates all databases and views for the ChittyOS universal data framework
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseSchema {
  name: string;
  icon: string;
  properties: Record<string, any>;
  description?: string;
}

class NotionWorkspaceCreator {
  private notion: Client;
  private workspaceId: string;
  private createdDatabases: Map<string, string> = new Map();

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notion = new Client({
      auth: process.env.NOTION_API_KEY
    });

    this.workspaceId = process.env.NOTION_WORKSPACE_ID || '';
  }

  /**
   * Create the complete ChittyOS workspace
   */
  async createWorkspace(): Promise<void> {
    console.log('🚀 Creating ChittyOS Notion Workspace');
    console.log('=' .repeat(60));

    try {
      // 1. Create Core Databases
      console.log('\n📊 Creating Core Databases...');
      await this.createCoreDatabases();

      // 2. Create Service Registry Databases
      console.log('\n🔧 Creating Service Registry Databases...');
      await this.createServiceRegistryDatabases();

      // 3. Create Analytics Databases
      console.log('\n📈 Creating Analytics Databases...');
      await this.createAnalyticsDatabases();

      // 4. Create Dashboard Pages
      console.log('\n🎨 Creating Dashboard Pages...');
      await this.createDashboards();

      // 5. Set up Relations
      console.log('\n🔗 Setting up Database Relations...');
      await this.setupRelations();

      // 6. Create Templates
      console.log('\n📝 Creating Templates...');
      await this.createTemplates();

      // 7. Export Configuration
      console.log('\n💾 Exporting Configuration...');
      await this.exportConfiguration();

      console.log('\n' + '=' .repeat(60));
      console.log('✅ ChittyOS Notion Workspace created successfully!');
      console.log('=' .repeat(60));

      this.printSummary();

    } catch (error) {
      console.error('❌ Failed to create workspace:', error);
      throw error;
    }
  }

  /**
   * Create core databases
   */
  private async createCoreDatabases(): Promise<void> {
    const databases: DatabaseSchema[] = [
      {
        name: 'Entities',
        icon: '🗂️',
        description: 'Central registry of all entities in the system',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Name': {
            rich_text: {}
          },
          'Type': {
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
          'Status': {
            select: {
              options: [
                { name: 'Active', color: 'green' },
                { name: 'Inactive', color: 'gray' },
                { name: 'Archived', color: 'red' }
              ]
            }
          },
          'Trust Score': {
            number: {
              format: 'percent'
            }
          },
          'Registry Sync': {
            checkbox: {}
          },
          'Pipeline Token': {
            rich_text: {}
          },
          'Created': {
            created_time: {}
          },
          'Updated': {
            last_edited_time: {}
          }
        }
      },
      {
        name: 'Information Items',
        icon: '📄',
        description: 'Universal information container for all data',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Title': {
            rich_text: {}
          },
          'Type': {
            select: {
              options: [
                { name: 'Document', color: 'blue' },
                { name: 'Image', color: 'green' },
                { name: 'Communication', color: 'yellow' },
                { name: 'Data', color: 'purple' },
                { name: 'Record', color: 'orange' }
              ]
            }
          },
          'Tier': {
            select: {
              options: [
                { name: 'PRIMARY_SOURCE', color: 'purple' },
                { name: 'OFFICIAL_RECORD', color: 'blue' },
                { name: 'INSTITUTIONAL', color: 'green' },
                { name: 'THIRD_PARTY', color: 'yellow' },
                { name: 'DERIVED', color: 'orange' },
                { name: 'REPORTED', color: 'pink' },
                { name: 'UNVERIFIED', color: 'gray' }
              ]
            }
          },
          'Content': {
            files: {}
          },
          'Hash': {
            rich_text: {}
          },
          'Verification Status': {
            select: {
              options: [
                { name: 'Verified', color: 'green' },
                { name: 'Pending', color: 'yellow' },
                { name: 'Failed', color: 'red' }
              ]
            }
          },
          'Trust Weight': {
            number: {
              format: 'percent'
            }
          },
          'Created': {
            created_time: {}
          }
        }
      },
      {
        name: 'Atomic Facts',
        icon: '⚛️',
        description: 'Granular facts extracted from information items',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Statement': {
            rich_text: {}
          },
          'Classification': {
            select: {
              options: [
                { name: 'OBSERVATION', color: 'blue' },
                { name: 'MEASUREMENT', color: 'green' },
                { name: 'ASSERTION', color: 'yellow' },
                { name: 'INFERENCE', color: 'orange' },
                { name: 'DERIVED', color: 'purple' },
                { name: 'OPINION', color: 'pink' },
                { name: 'HYPOTHESIS', color: 'gray' }
              ]
            }
          },
          'Confidence': {
            number: {
              format: 'percent'
            }
          },
          'Temporal': {
            date: {}
          },
          'Spatial': {
            rich_text: {}
          },
          'Pipeline Validated': {
            checkbox: {}
          },
          'Created': {
            created_time: {}
          }
        }
      },
      {
        name: 'Contexts',
        icon: '📁',
        description: 'Grouping container for related information',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Name': {
            rich_text: {}
          },
          'Type': {
            select: {
              options: [
                { name: 'Project', color: 'blue' },
                { name: 'Investigation', color: 'red' },
                { name: 'Analysis', color: 'green' },
                { name: 'Collection', color: 'yellow' }
              ]
            }
          },
          'Status': {
            select: {
              options: [
                { name: 'Active', color: 'green' },
                { name: 'Closed', color: 'gray' },
                { name: 'Archived', color: 'red' }
              ]
            }
          },
          'Start Date': {
            date: {}
          },
          'End Date': {
            date: {}
          },
          'Objectives': {
            rich_text: {}
          },
          'Access Level': {
            select: {
              options: [
                { name: 'Public', color: 'green' },
                { name: 'Restricted', color: 'yellow' },
                { name: 'Confidential', color: 'red' }
              ]
            }
          },
          'Created': {
            created_time: {}
          }
        }
      },
      {
        name: 'Relationships',
        icon: '🔗',
        description: 'Connections between entities',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Type': {
            select: {
              options: [
                { name: 'Owns', color: 'blue' },
                { name: 'Controls', color: 'purple' },
                { name: 'Related', color: 'green' },
                { name: 'Depends', color: 'yellow' },
                { name: 'Conflicts', color: 'red' }
              ]
            }
          },
          'Strength': {
            number: {
              format: 'percent'
            }
          },
          'Direction': {
            select: {
              options: [
                { name: 'Unidirectional', color: 'blue' },
                { name: 'Bidirectional', color: 'green' }
              ]
            }
          },
          'Start Date': {
            date: {}
          },
          'End Date': {
            date: {}
          },
          'Trust Level': {
            number: {
              format: 'percent'
            }
          },
          'Created': {
            created_time: {}
          }
        }
      },
      {
        name: 'Conflicts',
        icon: '⚠️',
        description: 'Track and resolve contradictions',
        properties: {
          'ChittyID': {
            title: {}
          },
          'Conflict Type': {
            select: {
              options: [
                { name: 'DIRECT', color: 'red' },
                { name: 'TEMPORAL', color: 'orange' },
                { name: 'LOGICAL', color: 'yellow' },
                { name: 'PARTIAL', color: 'blue' }
              ]
            }
          },
          'Severity': {
            select: {
              options: [
                { name: 'Critical', color: 'red' },
                { name: 'High', color: 'orange' },
                { name: 'Medium', color: 'yellow' },
                { name: 'Low', color: 'green' }
              ]
            }
          },
          'Resolution Status': {
            select: {
              options: [
                { name: 'Unresolved', color: 'red' },
                { name: 'In Review', color: 'yellow' },
                { name: 'Resolved', color: 'green' }
              ]
            }
          },
          'Resolution Method': {
            select: {
              options: [
                { name: 'HIERARCHY_RULE', color: 'blue' },
                { name: 'TEMPORAL_PRIORITY', color: 'green' },
                { name: 'AUTHENTICATION_SUPERIORITY', color: 'purple' },
                { name: 'EXPERT_REVIEW', color: 'orange' }
              ]
            }
          },
          'Resolution': {
            rich_text: {}
          },
          'Created': {
            created_time: {}
          }
        }
      }
    ];

    for (const db of databases) {
      const dbId = await this.createDatabase(db);
      this.createdDatabases.set(db.name, dbId);
      console.log(`  ✅ Created: ${db.icon} ${db.name}`);
    }
  }

  /**
   * Create service registry databases
   */
  private async createServiceRegistryDatabases(): Promise<void> {
    const databases: DatabaseSchema[] = [
      {
        name: 'Registered Services',
        icon: '🔧',
        description: 'All 36 registered ChittyOS services',
        properties: {
          'Service ID': {
            title: {}
          },
          'Service Name': {
            rich_text: {}
          },
          'Version': {
            rich_text: {}
          },
          'Category': {
            select: {
              options: [
                { name: 'Core', color: 'blue' },
                { name: 'Platform', color: 'green' },
                { name: 'Extension', color: 'yellow' },
                { name: 'Utility', color: 'purple' },
                { name: 'Integration', color: 'orange' }
              ]
            }
          },
          'Status': {
            select: {
              options: [
                { name: 'Active', color: 'green' },
                { name: 'Deprecated', color: 'gray' },
                { name: 'Beta', color: 'yellow' },
                { name: 'Experimental', color: 'orange' }
              ]
            }
          },
          'Primary Endpoint': {
            url: {}
          },
          'Health Endpoint': {
            url: {}
          },
          'Pipeline Compliant': {
            checkbox: {}
          },
          'Auth Type': {
            select: {
              options: [
                { name: 'Bearer', color: 'blue' },
                { name: 'API-Key', color: 'green' },
                { name: 'OAuth', color: 'yellow' },
                { name: 'Service-Token', color: 'purple' }
              ]
            }
          },
          'Last Sync': {
            date: {}
          },
          'Documentation': {
            url: {}
          }
        }
      },
      {
        name: 'Service Health',
        icon: '💓',
        description: 'Monitor service health and compliance',
        properties: {
          'Service': {
            title: {}
          },
          'Timestamp': {
            date: {}
          },
          'Is Healthy': {
            checkbox: {}
          },
          'Response Time': {
            number: {
              format: 'number'
            }
          },
          'Status Code': {
            number: {
              format: 'number'
            }
          },
          'Pipeline Compliant': {
            checkbox: {}
          },
          'Violations': {
            number: {
              format: 'number'
            }
          },
          'Error Message': {
            rich_text: {}
          },
          'Consecutive Failures': {
            number: {
              format: 'number'
            }
          }
        }
      }
    ];

    for (const db of databases) {
      const dbId = await this.createDatabase(db);
      this.createdDatabases.set(db.name, dbId);
      console.log(`  ✅ Created: ${db.icon} ${db.name}`);
    }
  }

  /**
   * Create analytics databases
   */
  private async createAnalyticsDatabases(): Promise<void> {
    const databases: DatabaseSchema[] = [
      {
        name: 'Trust Scores',
        icon: '📈',
        description: 'Track trust evaluations',
        properties: {
          'Entity': {
            title: {}
          },
          'Score': {
            number: {
              format: 'percent'
            }
          },
          'Evaluator': {
            select: {
              options: [
                { name: 'ChittyTrust Service', color: 'blue' }
              ]
            }
          },
          'Timestamp': {
            date: {}
          },
          'Confidence': {
            number: {
              format: 'percent'
            }
          }
        }
      },
      {
        name: 'Schema Propagation Log',
        icon: '🔄',
        description: 'Track schema changes propagation',
        properties: {
          'Propagation ID': {
            title: {}
          },
          'Target System': {
            select: {
              options: [
                { name: 'Data', color: 'blue' },
                { name: 'Auth', color: 'green' },
                { name: 'Trust', color: 'yellow' },
                { name: 'Monitoring', color: 'purple' },
                { name: 'Notion', color: 'orange' },
                { name: 'Database', color: 'pink' }
              ]
            }
          },
          'Type': {
            select: {
              options: [
                { name: 'service_add', color: 'green' },
                { name: 'service_update', color: 'yellow' },
                { name: 'service_remove', color: 'red' },
                { name: 'config_change', color: 'blue' }
              ]
            }
          },
          'Status': {
            select: {
              options: [
                { name: 'Pending', color: 'gray' },
                { name: 'In Progress', color: 'yellow' },
                { name: 'Success', color: 'green' },
                { name: 'Failure', color: 'red' }
              ]
            }
          },
          'Service ID': {
            rich_text: {}
          },
          'Change Summary': {
            rich_text: {}
          },
          'Started': {
            date: {}
          },
          'Completed': {
            date: {}
          },
          'Retry Count': {
            number: {
              format: 'number'
            }
          },
          'Error': {
            rich_text: {}
          }
        }
      }
    ];

    for (const db of databases) {
      const dbId = await this.createDatabase(db);
      this.createdDatabases.set(db.name, dbId);
      console.log(`  ✅ Created: ${db.icon} ${db.name}`);
    }
  }

  /**
   * Create a database in Notion
   */
  private async createDatabase(schema: DatabaseSchema): Promise<string> {
    const response = await this.notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: this.workspaceId || 'root'
      },
      icon: {
        type: 'emoji',
        emoji: schema.icon
      },
      title: [
        {
          type: 'text',
          text: {
            content: schema.name
          }
        }
      ],
      description: [
        {
          type: 'text',
          text: {
            content: schema.description || ''
          }
        }
      ],
      properties: schema.properties
    });

    return response.id;
  }

  /**
   * Create dashboard pages
   */
  private async createDashboards(): Promise<void> {
    const dashboards = [
      {
        name: 'System Health Monitor',
        icon: '📊',
        content: 'Real-time monitoring of all ChittyOS services and components'
      },
      {
        name: 'Registry Services Status',
        icon: '🔧',
        content: 'Status of all 36 registered services'
      },
      {
        name: 'Pipeline Compliance Tracker',
        icon: '✅',
        content: 'ChittyID generation and pipeline compliance monitoring'
      },
      {
        name: 'Information Flow Dashboard',
        icon: '📈',
        content: 'Analytics on information items, facts, and trust scores'
      },
      {
        name: 'Conflict Resolution Queue',
        icon: '⚠️',
        content: 'Pending conflicts requiring resolution'
      }
    ];

    for (const dashboard of dashboards) {
      await this.createPage(dashboard.name, dashboard.icon, dashboard.content);
      console.log(`  ✅ Created: ${dashboard.icon} ${dashboard.name}`);
    }
  }

  /**
   * Create a page in Notion
   */
  private async createPage(title: string, icon: string, content: string): Promise<void> {
    await this.notion.pages.create({
      parent: {
        type: 'page_id',
        page_id: this.workspaceId || 'root'
      },
      icon: {
        type: 'emoji',
        emoji: icon
      },
      properties: {
        title: {
          title: [
            {
              type: 'text',
              text: {
                content: title
              }
            }
          ]
        }
      },
      children: [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content
                }
              }
            ]
          }
        }
      ]
    });
  }

  /**
   * Set up relations between databases
   */
  private async setupRelations(): Promise<void> {
    // This would update databases to add relation properties
    // Notion API requires updating existing databases to add relations
    console.log('  ℹ️  Relations need to be configured manually in Notion');
  }

  /**
   * Create templates for common operations
   */
  private async createTemplates(): Promise<void> {
    console.log('  ℹ️  Templates can be created from the Notion interface');
  }

  /**
   * Export configuration to .env file
   */
  private async exportConfiguration(): Promise<void> {
    const envContent = Array.from(this.createdDatabases.entries())
      .map(([name, id]) => {
        const envKey = `NOTION_DATABASE_${name.toUpperCase().replace(/\s+/g, '_')}`;
        return `${envKey}="${id}"`;
      })
      .join('\n');

    console.log('\n📝 Add these to your .env file:');
    console.log(envContent);
  }

  /**
   * Print creation summary
   */
  private printSummary(): void {
    console.log('\n📋 Created Databases:');
    for (const [name, id] of this.createdDatabases) {
      console.log(`  - ${name}: ${id}`);
    }

    console.log('\n🚀 Next Steps:');
    console.log('  1. Configure database relations in Notion');
    console.log('  2. Create custom views for each database');
    console.log('  3. Set up templates for common operations');
    console.log('  4. Configure sync with ChittyOS services');
    console.log('  5. Import the 36 registered services');
    console.log('  6. Test ChittyID generation pipeline');

    console.log('\n💡 Tips:');
    console.log('  - Use filtered views for different use cases');
    console.log('  - Set up automations for common workflows');
    console.log('  - Create linked database views in dashboards');
    console.log('  - Configure permissions for team members');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const creator = new NotionWorkspaceCreator();
    await creator.createWorkspace();
  } catch (error) {
    console.error('Failed to create workspace:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { NotionWorkspaceCreator };