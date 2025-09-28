#!/usr/bin/env tsx
/**
 * Notion Command Center Sync Script
 * Syncs distributed AI data to Notion databases
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

// Load Notion database configuration
const configPath = path.join(process.cwd(), 'config', 'notion-databases.json');
const notionConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

interface SyncResult {
  success: boolean;
  database: string;
  message: string;
  pageId?: string;
}

/**
 * Main sync function
 */
async function syncToNotionCommand(): Promise<void> {
  console.log('🚀 Starting Notion Command Center Sync...');
  console.log(`📋 Workspace: ${notionConfig.workspace.name}`);

  const results: SyncResult[] = [];

  try {
    // Test API connection first
    const me = await notion.users.me({});
    console.log(`✅ Connected as: ${me.name || 'Integration'}`);

    // Get the primary ChittyLedger database
    const primaryDb = notionConfig.databases[notionConfig.primary_database];
    console.log(`\n📊 Primary Database: ${primaryDb.name}`);
    console.log(`   ID: ${primaryDb.database_id}`);

    // Sync to each target database
    for (const targetKey of notionConfig.sync_targets) {
      const target = notionConfig.databases[targetKey];
      console.log(`\n🔄 Syncing to: ${target.name}`);

      try {
        const result = await syncToDatabase(target);
        results.push(result);

        if (result.success) {
          console.log(`   ✅ ${result.message}`);
          if (result.pageId) {
            console.log(`   📄 Page ID: ${result.pageId}`);
          }
        } else {
          console.log(`   ❌ ${result.message}`);
        }
      } catch (error: any) {
        results.push({
          success: false,
          database: target.name,
          message: error.message
        });
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📈 Sync Summary:');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n⚠️ Some syncs failed. Details:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.database}: ${r.message}`);
      });
      process.exit(1);
    }

    console.log('\n✨ All syncs completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Sync failed with error:', error.message);

    if (error.code === 'unauthorized') {
      console.error('\n🔑 Authentication Error:');
      console.error('   1. Check NOTION_API_KEY is set correctly');
      console.error('   2. Ensure the integration has access to the databases');
      console.error('   3. Verify the API key is valid and not expired');
    } else if (error.code === 'object_not_found') {
      console.error('\n📍 Database Not Found:');
      console.error('   1. Check database IDs in config/notion-databases.json');
      console.error('   2. Ensure the integration is added to each database');
      console.error('   3. Verify you have the correct workspace');
    }

    process.exit(1);
  }
}

/**
 * Sync data to a specific database
 */
async function syncToDatabase(database: any): Promise<SyncResult> {
  try {
    // Check if database exists and is accessible
    const db = await notion.databases.retrieve({
      database_id: database.database_id
    });

    // Create a sync entry
    const response = await notion.pages.create({
      parent: { database_id: database.database_id },
      properties: createSyncProperties(database.name)
    });

    return {
      success: true,
      database: database.name,
      message: `Synced successfully`,
      pageId: response.id
    };

  } catch (error: any) {
    if (error.code === 'object_not_found') {
      throw new Error(`Database not found or no access: ${database.database_id}`);
    } else if (error.code === 'validation_error') {
      // Database exists but properties might be different
      // Try a simpler sync
      return attemptSimpleSync(database);
    }
    throw error;
  }
}

/**
 * Attempt a simple sync with minimal properties
 */
async function attemptSimpleSync(database: any): Promise<SyncResult> {
  try {
    const response = await notion.pages.create({
      parent: { database_id: database.database_id },
      properties: {
        "Name": {
          title: [
            {
              text: {
                content: `Sync #${process.env.GITHUB_RUN_NUMBER || Date.now()}`
              }
            }
          ]
        }
      }
    });

    return {
      success: true,
      database: database.name,
      message: `Simple sync completed`,
      pageId: response.id
    };
  } catch (error: any) {
    return {
      success: false,
      database: database.name,
      message: `Failed to sync: ${error.message}`
    };
  }
}

/**
 * Create properties for sync entry based on database type
 */
function createSyncProperties(databaseName: string): any {
  const timestamp = new Date().toISOString();
  const runNumber = process.env.GITHUB_RUN_NUMBER || 'manual';
  const commit = process.env.GITHUB_SHA || 'local';

  // Base properties that should work for most databases
  const baseProperties: any = {
    "Name": {
      title: [
        {
          text: {
            content: `AI Data Sync #${runNumber}`
          }
        }
      ]
    }
  };

  // Try to add additional properties based on database type
  if (databaseName.includes('ChittyLedger')) {
    // ChittyLedger specific properties
    baseProperties["Status"] = {
      select: { name: "Synced" }
    };
    baseProperties["Timestamp"] = {
      date: { start: timestamp }
    };
  } else if (databaseName.includes('Evidence')) {
    // Evidence database properties
    baseProperties["Type"] = {
      select: { name: "System Sync" }
    };
    baseProperties["Date"] = {
      date: { start: timestamp }
    };
  } else if (databaseName.includes('Case Management')) {
    // Case management properties
    baseProperties["Action"] = {
      select: { name: "Data Sync" }
    };
    baseProperties["Date"] = {
      date: { start: timestamp }
    };
  }

  // Try to add source information if possible
  try {
    baseProperties["Source"] = {
      rich_text: [
        {
          text: {
            content: `GitHub Actions - ${commit.substring(0, 7)}`
          }
        }
      ]
    };
  } catch {
    // Some databases might not have a Source field
  }

  return baseProperties;
}

// Run the sync
if (require.main === module) {
  syncToNotionCommand().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { syncToNotionCommand };