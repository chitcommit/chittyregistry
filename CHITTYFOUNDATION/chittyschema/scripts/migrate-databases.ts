#!/usr/bin/env tsx
/**
 * Database Migration Script for ChittySchema
 * Migrates existing databases into the unified ChittySchema structure
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { chittyId } from '../src/lib/chittyid.js';
import chalk from 'chalk';
import ora from 'ora';
import 'dotenv/config';

// Database connections
const targetDb = drizzle(postgres(process.env.DATABASE_URL!));

interface MigrationConfig {
  sourceDbUrl?: string;
  sourceType: 'postgresql' | 'mysql' | 'sqlite' | 'json' | 'csv';
  targetSchema: string;
  preserveIds: boolean;
  batchSize: number;
  dryRun: boolean;
}

interface MigrationStats {
  tablesProcessed: number;
  recordsMigrated: number;
  errors: number;
  warnings: number;
  startTime: Date;
  endTime?: Date;
}

class DatabaseMigrator {
  private config: MigrationConfig;
  private stats: MigrationStats;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.stats = {
      tablesProcessed: 0,
      recordsMigrated: 0,
      errors: 0,
      warnings: 0,
      startTime: new Date()
    };
  }

  async migrate(): Promise<MigrationStats> {
    console.log(chalk.blue('🚀 Starting ChittySchema Database Migration'));
    console.log('='.repeat(50));
    console.log(chalk.blue('Source Type:'), this.config.sourceType);
    console.log(chalk.blue('Target Schema:'), this.config.targetSchema);
    console.log(chalk.blue('Preserve IDs:'), this.config.preserveIds ? '✓' : '✗');
    console.log(chalk.blue('Dry Run:'), this.config.dryRun ? '✓' : '✗');
    console.log('');

    try {
      switch (this.config.sourceType) {
        case 'postgresql':
          await this.migratePostgreSQL();
          break;
        case 'mysql':
          await this.migrateMySQL();
          break;
        case 'sqlite':
          await this.migrateSQLite();
          break;
        case 'json':
          await this.migrateJSON();
          break;
        case 'csv':
          await this.migrateCSV();
          break;
        default:
          throw new Error(`Unsupported source type: ${this.config.sourceType}`);
      }

      this.stats.endTime = new Date();
      this.printSummary();
      return this.stats;

    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error);
      throw error;
    }
  }

  private async migratePostgreSQL(): Promise<void> {
    if (!this.config.sourceDbUrl) {
      throw new Error('Source database URL required for PostgreSQL migration');
    }

    const sourceDb = drizzle(postgres(this.config.sourceDbUrl));
    const spinner = ora('Connecting to source PostgreSQL database...').start();

    try {
      // Get list of tables from source
      const tables = await sourceDb.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);

      spinner.succeed(`Found ${tables.length} tables in source database`);

      for (const table of tables) {
        await this.migrateTable(sourceDb, table.table_name);
      }

    } catch (error) {
      spinner.fail('Failed to connect to source database');
      throw error;
    }
  }

  private async migrateTable(sourceDb: any, tableName: string): Promise<void> {
    const spinner = ora(`Migrating table: ${tableName}`).start();

    try {
      // Map table names to ChittySchema equivalents
      const tableMapping = this.getTableMapping(tableName);

      if (!tableMapping) {
        spinner.warn(`Skipping unmapped table: ${tableName}`);
        this.stats.warnings++;
        return;
      }

      // Get data from source table
      const sourceData = await (sourceDb as any).execute(sql.raw(`SELECT * FROM ${tableName}`)) as any[];

      if (sourceData.length === 0) {
        spinner.succeed(`${tableName} (empty)`);
        return;
      }

      // Transform and insert data
      const transformedData = await this.transformTableData(sourceData, tableMapping);

      if (!this.config.dryRun) {
        await this.insertTransformedData(transformedData, tableMapping.target);
      }

      spinner.succeed(`${tableName} → ${tableMapping.target} (${sourceData.length} records)`);
      this.stats.recordsMigrated += sourceData.length;
      this.stats.tablesProcessed++;

    } catch (error) {
      spinner.fail(`Failed to migrate ${tableName}: ${error}`);
      this.stats.errors++;
    }
  }

  private getTableMapping(sourceTableName: string): { source: string; target: string; mapping: any } | null {
    const mappings: Record<string, any> = {
      // Evidence & Facts
      'evidence': { target: 'master_evidence', mapping: this.mapEvidence },
      'facts': { target: 'atomic_facts', mapping: this.mapFacts },
      'documents': { target: 'master_evidence', mapping: this.mapDocuments },

      // Legal Case Management
      'cases': { target: 'cases', mapping: this.mapCases },
      'legal_cases': { target: 'cases', mapping: this.mapCases },
      'matters': { target: 'cases', mapping: this.mapCases },

      // Users & Actors
      'users': { target: 'users', mapping: this.mapUsers },
      'people': { target: 'actors', mapping: this.mapActors },
      'persons': { target: 'actors', mapping: this.mapActors },
      'parties': { target: 'actors', mapping: this.mapActors },

      // Property & Assets
      'property': { target: 'property_pins', mapping: this.mapProperty },
      'properties': { target: 'property_pins', mapping: this.mapProperty },
      'real_estate': { target: 'property_pins', mapping: this.mapProperty },

      // Audit & Logs
      'audit_log': { target: 'audit_log', mapping: this.mapAuditLog },
      'activity_log': { target: 'activity_log', mapping: this.mapActivityLog },
      'event_log': { target: 'event_store', mapping: this.mapEventStore },

      // Relationships
      'relationships': { target: 'entity_relationships', mapping: this.mapRelationships },
      'connections': { target: 'entity_relationships', mapping: this.mapRelationships }
    };

    const mapping = mappings[sourceTableName.toLowerCase()];
    return mapping ? { source: sourceTableName, ...mapping } : null;
  }

  private async transformTableData(sourceData: any[], mapping: any): Promise<any[]> {
    return sourceData.map((record, index) => {
      try {
        return mapping.call(this, record);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Record ${index} transformation failed:`, error));
        this.stats.warnings++;
        return null;
      }
    }).filter(Boolean);
  }

  // Transformation functions for different table types
  private mapEvidence(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('EVID', record.title || record.name || record.id),
      title: record.title || record.name || 'Migrated Evidence',
      description: record.description || record.content || '',
      type: this.mapEvidenceType(record.type || record.evidence_type),
      tier: this.mapEvidenceTier(record.tier || record.reliability),
      fileHash: record.file_hash || record.hash || record.checksum,
      filePath: record.file_path || record.path || record.location,
      caseId: record.case_id || record.matter_id,
      submittedBy: record.submitted_by || record.created_by || record.user_id,
      submittedAt: new Date(record.submitted_at || record.created_at || Date.now()),
      chittychainStatus: 'Pending',
      lastModified: new Date(record.updated_at || record.modified_at || Date.now())
    };
  }

  private mapFacts(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('FACT', record.text || record.statement || record.id),
      text: record.text || record.statement || record.fact || '',
      factType: this.mapFactType(record.type || record.fact_type),
      evidenceId: record.evidence_id || record.source_id,
      locationInDocument: record.location || record.position,
      classificationLevel: this.mapFactClassification(record.classification || record.level),
      weight: parseFloat(record.weight || record.confidence || '0.5'),
      credibilityFactors: this.parseArray(record.credibility_factors || record.factors),
      verifiedAt: record.verified_at ? new Date(record.verified_at) : null,
      verificationMethod: record.verification_method || record.method,
      timestampedAt: new Date(record.created_at || Date.now()),
      chittychainStatus: 'Pending'
    };
  }

  private mapCases(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('CASE', record.docket_number || record.case_number || record.id),
      title: record.title || record.name || record.case_name || 'Migrated Case',
      description: record.description || record.summary || '',
      docketNumber: record.docket_number || record.case_number || `MIG-${Date.now()}`,
      courtName: record.court_name || record.court || '',
      status: this.mapCaseStatus(record.status),
      filingDate: record.filing_date ? new Date(record.filing_date) : null,
      lastActivityDate: record.last_activity || record.updated_at ? new Date(record.last_activity || record.updated_at) : null,
      assignedTo: record.assigned_to || record.attorney || record.user_id,
      createdAt: new Date(record.created_at || Date.now()),
      lastModified: new Date(record.updated_at || Date.now())
    };
  }

  private mapUsers(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('USER', record.email || record.username || record.id),
      email: record.email || record.username || `migrated-${record.id}@example.com`,
      name: record.name || record.full_name || record.display_name || 'Migrated User',
      role: this.mapUserRole(record.role || record.user_type),
      organization: record.organization || record.company || record.firm || '',
      isActive: record.is_active !== false && record.status !== 'inactive',
      createdAt: new Date(record.created_at || Date.now()),
      lastLogin: record.last_login ? new Date(record.last_login) : null
    };
  }

  // Helper functions for data transformation
  private mapEvidenceType(type: string): string {
    const typeMap: Record<string, string> = {
      'document': 'document',
      'doc': 'document',
      'file': 'document',
      'image': 'image',
      'photo': 'image',
      'video': 'video',
      'audio': 'audio',
      'financial': 'financial_record',
      'contract': 'contract',
      'email': 'communication',
      'communication': 'communication',
      'physical': 'physical_evidence',
      'testimony': 'testimony',
      'expert': 'expert_report'
    };
    return typeMap[type?.toLowerCase()] || 'document';
  }

  private mapEvidenceTier(tier: string): string {
    const tierMap: Record<string, string> = {
      'government': 'GOVERNMENT',
      'official': 'GOVERNMENT',
      'verified': 'VERIFIED_THIRD_PARTY',
      'third_party': 'VERIFIED_THIRD_PARTY',
      'witness': 'WITNESS',
      'unverified': 'UNVERIFIED',
      'contested': 'CONTESTED'
    };
    return tierMap[tier?.toLowerCase()] || 'UNVERIFIED';
  }

  private mapFactType(type: string): string {
    const typeMap: Record<string, string> = {
      'date': 'DATE',
      'time': 'DATE',
      'amount': 'AMOUNT',
      'money': 'AMOUNT',
      'admission': 'ADMISSION',
      'identity': 'IDENTITY',
      'location': 'LOCATION',
      'place': 'LOCATION',
      'relationship': 'RELATIONSHIP',
      'action': 'ACTION',
      'status': 'STATUS'
    };
    return typeMap[type?.toLowerCase()] || 'ACTION';
  }

  private mapFactClassification(classification: string): string {
    const classMap: Record<string, string> = {
      'fact': 'OBSERVATION',
      'observation': 'OBSERVATION',
      'measurement': 'MEASUREMENT',
      'claim': 'ASSERTION',
      'assertion': 'ASSERTION',
      'inference': 'INFERENCE',
      'derived': 'DERIVED',
      'opinion': 'OPINION',
      'hypothesis': 'HYPOTHESIS'
    };
    return classMap[classification?.toLowerCase()] || 'ASSERTION';
  }

  private mapCaseStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'open',
      'pending': 'open',
      'closed': 'closed',
      'complete': 'closed',
      'appealed': 'appealed',
      'stayed': 'stayed',
      'dismissed': 'closed'
    };
    return statusMap[status?.toLowerCase()] || 'open';
  }

  private mapUserRole(role: string): string {
    const roleMap: Record<string, string> = {
      'admin': 'admin',
      'administrator': 'admin',
      'lawyer': 'litigator',
      'attorney': 'litigator',
      'litigator': 'litigator',
      'paralegal': 'analyst',
      'analyst': 'analyst',
      'investigator': 'analyst',
      'witness': 'witness',
      'expert': 'witness',
      'client': 'viewer',
      'viewer': 'viewer'
    };
    return roleMap[role?.toLowerCase()] || 'viewer';
  }

  private parseArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  }

  // Additional mapper methods for missing table types
  private mapDocuments(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('EVID', record.filename || record.title || record.id),
      title: record.filename || record.title || record.name || 'Migrated Document',
      description: record.description || record.content || '',
      type: 'document',
      tier: this.mapEvidenceTier(record.tier || record.reliability || 'unverified'),
      fileHash: record.file_hash || record.hash || record.checksum,
      filePath: record.file_path || record.path || record.location,
      caseId: record.case_id || record.matter_id,
      submittedBy: record.submitted_by || record.created_by || record.user_id,
      submittedAt: new Date(record.submitted_at || record.created_at || Date.now()),
      chittychainStatus: 'Pending',
      lastModified: new Date(record.updated_at || record.modified_at || Date.now())
    };
  }

  private mapActors(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('PEO', record.name || record.full_name || record.id),
      name: record.name || record.full_name || record.display_name || 'Unknown Person',
      type: record.type || record.person_type || 'person',
      email: record.email || null,
      phone: record.phone || record.phone_number || null,
      address: record.address || null,
      organization: record.organization || record.company || null,
      role: record.role || record.party_type || 'other',
      isActive: record.is_active !== false,
      createdAt: new Date(record.created_at || Date.now()),
      lastModified: new Date(record.updated_at || Date.now())
    };
  }

  private mapProperty(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('PROP', record.pin || record.property_id || record.id),
      pin: record.pin || record.property_id || record.parcel_id,
      address: record.address || record.street_address || '',
      city: record.city || '',
      state: record.state || record.province || '',
      zipCode: record.zip_code || record.postal_code || '',
      county: record.county || 'Cook',
      propertyType: record.property_type || record.type || 'residential',
      assessedValue: parseFloat(record.assessed_value || record.value || '0'),
      lastSaleDate: record.last_sale_date ? new Date(record.last_sale_date) : null,
      lastSalePrice: parseFloat(record.last_sale_price || record.sale_price || '0'),
      owner: record.owner || record.owner_name || '',
      createdAt: new Date(record.created_at || Date.now()),
      lastModified: new Date(record.updated_at || Date.now())
    };
  }

  private mapAuditLog(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('FACT', record.action || record.event || record.id),
      userId: record.user_id || record.actor_id,
      action: record.action || record.event || record.operation || 'unknown',
      entityType: record.entity_type || record.table_name || 'unknown',
      entityId: record.entity_id || record.record_id,
      oldValues: record.old_values || record.before || {},
      newValues: record.new_values || record.after || {},
      ipAddress: record.ip_address || record.ip || null,
      userAgent: record.user_agent || null,
      timestamp: new Date(record.timestamp || record.created_at || Date.now())
    };
  }

  private mapActivityLog(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('FACT', record.activity || record.action || record.id),
      userId: record.user_id || record.actor_id,
      activity: record.activity || record.action || record.event || 'unknown',
      description: record.description || record.details || '',
      entityType: record.entity_type || record.subject_type || null,
      entityId: record.entity_id || record.subject_id || null,
      metadata: record.metadata || record.properties || {},
      timestamp: new Date(record.timestamp || record.created_at || Date.now())
    };
  }

  private mapEventStore(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('FACT', record.event_type || record.type || record.id),
      eventType: record.event_type || record.type || 'unknown',
      eventData: record.event_data || record.data || record.payload || {},
      aggregateId: record.aggregate_id || record.entity_id || null,
      aggregateType: record.aggregate_type || record.entity_type || null,
      version: parseInt(record.version || record.sequence || '1'),
      timestamp: new Date(record.timestamp || record.occurred_at || record.created_at || Date.now()),
      userId: record.user_id || record.actor_id || null
    };
  }

  private mapRelationships(record: any): any {
    return {
      id: this.config.preserveIds ? record.id : uuidv4(),
      chittyId: chittyId('FACT', `${record.from_entity || record.source}_${record.to_entity || record.target}`),
      fromEntityId: record.from_entity_id || record.source_id || record.parent_id,
      fromEntityType: record.from_entity_type || record.source_type || 'unknown',
      toEntityId: record.to_entity_id || record.target_id || record.child_id,
      toEntityType: record.to_entity_type || record.target_type || 'unknown',
      relationshipType: record.relationship_type || record.type || record.relation || 'related_to',
      strength: parseFloat(record.strength || record.weight || record.confidence || '1.0'),
      isActive: record.is_active !== false,
      metadata: record.metadata || record.properties || {},
      createdAt: new Date(record.created_at || Date.now()),
      lastModified: new Date(record.updated_at || Date.now())
    };
  }

  private async insertTransformedData(data: any[], targetTable: string): Promise<void> {
    if (data.length === 0) return;

    // Insert in batches
    const batchSize = this.config.batchSize;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        await targetDb.execute(sql.raw(`
          INSERT INTO ${targetTable}
          (${Object.keys(batch[0]).join(', ')})
          VALUES ${batch.map(record =>
            `(${Object.values(record).map(val =>
              val === null ? 'NULL' :
              typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` :
              typeof val === 'boolean' ? (val ? 'true' : 'false') :
              typeof val === 'object' && val instanceof Date ? `'${val.toISOString()}'` :
              typeof val === 'object' ? `'${JSON.stringify(val)}'` :
              val
            ).join(', ')})`
          ).join(', ')}
        `));
      } catch (error) {
        console.error(chalk.red(`Failed to insert batch for ${targetTable}:`), error);
        this.stats.errors++;
      }
    }
  }

  private async migrateMySQL(): Promise<void> {
    throw new Error('MySQL migration not yet implemented');
  }

  private async migrateSQLite(): Promise<void> {
    throw new Error('SQLite migration not yet implemented');
  }

  private async migrateJSON(): Promise<void> {
    throw new Error('JSON migration not yet implemented');
  }

  private async migrateCSV(): Promise<void> {
    throw new Error('CSV migration not yet implemented');
  }

  private printSummary(): void {
    const duration = this.stats.endTime!.getTime() - this.stats.startTime.getTime();

    console.log('\n' + '='.repeat(50));
    console.log(chalk.green('✅ Migration Complete!'));
    console.log('='.repeat(50));
    console.log(chalk.blue('Duration:'), `${(duration / 1000).toFixed(2)}s`);
    console.log(chalk.blue('Tables Processed:'), this.stats.tablesProcessed);
    console.log(chalk.blue('Records Migrated:'), this.stats.recordsMigrated);
    console.log(chalk.blue('Warnings:'), this.stats.warnings);
    console.log(chalk.blue('Errors:'), this.stats.errors);

    if (this.config.dryRun) {
      console.log(chalk.yellow('📋 This was a DRY RUN - no data was actually migrated'));
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const config: MigrationConfig = {
    sourceDbUrl: process.env.SOURCE_DATABASE_URL,
    sourceType: (args[0] as any) || 'postgresql',
    targetSchema: 'public',
    preserveIds: args.includes('--preserve-ids'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
    dryRun: args.includes('--dry-run')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ChittySchema Database Migration Tool

Usage:
  tsx scripts/migrate-databases.ts [source-type] [options]

Source Types:
  postgresql  Migrate from PostgreSQL database (default)
  mysql       Migrate from MySQL database
  sqlite      Migrate from SQLite database
  json        Migrate from JSON files
  csv         Migrate from CSV files

Options:
  --preserve-ids      Keep original IDs from source
  --batch-size=N      Set batch size for inserts (default: 100)
  --dry-run          Preview migration without making changes
  --help, -h         Show this help message

Environment Variables:
  SOURCE_DATABASE_URL  Connection string for source database
  DATABASE_URL         Target ChittySchema database (required)

Examples:
  tsx scripts/migrate-databases.ts postgresql --dry-run
  tsx scripts/migrate-databases.ts mysql --preserve-ids --batch-size=50
    `);
    process.exit(0);
  }

  const migrator = new DatabaseMigrator(config);
  await migrator.migrate();
}

if (process.argv[1] && process.argv[1].endsWith('migrate-databases.ts')) {
  main().catch(console.error);
}

export { DatabaseMigrator, type MigrationConfig, type MigrationStats };