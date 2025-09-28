#!/usr/bin/env node

/**
 * Direct Neon Schema Deployment Script
 * Deploys ChittyLedger production schema to Neon
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';

async function deploySchema() {
  console.log('🚀 Deploying ChittyLedger to Neon...\n');

  // Load environment variables
  config();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('📍 Database:', databaseUrl.split('@')[1]?.split('/')[0] || 'Neon PostgreSQL');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read the production schema
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const schemaPath = path.join(__dirname, 'schema', 'chittychain-production-schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Production schema file not found at:', schemaPath);
      process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔄 Applying ChittyLedger schema...');

    // Execute the schema
    await pool.query(schemaSql);

    console.log('✅ Schema deployed successfully!');

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\\n📊 Database tables created:');
    for (const row of tablesResult.rows) {
      console.log(`   ✓ ${row.table_name}`);
    }

    // Check schema version
    const versionResult = await pool.query('SELECT version, description FROM schema_versions ORDER BY applied_at DESC LIMIT 1');
    if (versionResult.rows.length > 0) {
      const { version, description } = versionResult.rows[0];
      console.log(`\\n🏷️  Schema version: ${version}`);
      console.log(`   Description: ${description}`);
    }

    console.log(`
🎉 ChittyLedger deployed successfully!

📋 Next steps:
--------------
1. Run seed data: npm run seed
2. Start API server: npm run dev
3. Test health: curl http://localhost:3000/health
4. Configure Notion sync: npm run setup:notion

🔗 Database ready for:
- Evidence chain management
- Legal case tracking
- Property data integration
- Notion workspace sync
    `);

    await pool.end();
  } catch (error) {
    console.error('❌ Schema deployment failed:', error.message);
    console.error('📍 Error details:', error.detail || error.hint || 'No additional details');
    await pool.end();
    process.exit(1);
  }
}

// Run deployment
deploySchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Deployment error:', error);
    process.exit(1);
  });