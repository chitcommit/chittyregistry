#!/usr/bin/env node

/**
 * Check current status of Neon database
 */

import { Pool } from 'pg';
import { config } from 'dotenv';

async function checkStatus() {
  console.log('🔍 Checking Neon database status...\n');

  config();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('📊 Current database tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   (No tables found)');
    } else {
      for (const row of tablesResult.rows) {
        console.log(`   ✓ ${row.table_name}`);
      }
    }

    // Check schema version if table exists
    try {
      const versionResult = await pool.query('SELECT version, description, applied_at FROM schema_versions ORDER BY applied_at DESC LIMIT 1');
      if (versionResult.rows.length > 0) {
        const { version, description, applied_at } = versionResult.rows[0];
        console.log(`\\n🏷️  Current schema version: ${version}`);
        console.log(`   Description: ${description}`);
        console.log(`   Applied: ${applied_at}`);
      }
    } catch (e) {
      console.log('\\n📝 No schema version tracking found');
    }

    // Check extensions
    const extensionsResult = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pgcrypto', 'btree_gin')
      ORDER BY extname;
    `);

    console.log('\\n🔌 Extensions:');
    for (const row of extensionsResult.rows) {
      console.log(`   ✓ ${row.extname} v${row.extversion}`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Check error:', error);
    process.exit(1);
  });