#!/usr/bin/env node

/**
 * Deploy 5-Entity System directly using SQL file
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function deploy() {
  console.log('🚀 Deploying 5-Entity System: people, places, things, events, authorities\n');

  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    // Read and execute the 5-entity SQL
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const sqlPath = path.join(__dirname, 'create-5-entities.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📦 Creating entity tables...');
    await client.query(sql);

    // Verify deployment
    const verification = await client.query(`
      SELECT
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'people') THEN '✅' ELSE '❌' END as people,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'places') THEN '✅' ELSE '❌' END as places,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'things') THEN '✅' ELSE '❌' END as things,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN '✅' ELSE '❌' END as events,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'authorities') THEN '✅' ELSE '❌' END as authorities
    `);

    const status = verification.rows[0];
    console.log('\\n🏗️  5-Entity System Status:');
    console.log(`   People: ${status.people}`);
    console.log(`   Places: ${status.places}`);
    console.log(`   Things: ${status.things}`);
    console.log(`   Events: ${status.events}`);
    console.log(`   Authorities: ${status.authorities}`);

    // Get final table count
    const tables = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    console.log(`\\n📊 Total database tables: ${tables.rows[0].count}`);

    client.release();
    await pool.end();

    console.log('\\n🎉 5-Entity System deployment complete!');
    console.log('\\n📋 ChittyChain now supports:');
    console.log('✅ People - Legal entities, individuals, organizations');
    console.log('✅ Places - Addresses, courts, jurisdictions');
    console.log('✅ Things - Property, evidence, assets, documents');
    console.log('✅ Events - Transactions, hearings, filings');
    console.log('✅ Authorities - Laws, regulations, case law');
    console.log('\\n🔗 Ready for legal case management with full entity relationships!');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

deploy();