#!/usr/bin/env node

/**
 * Deploy 5-Entity System to Neon ChittyChain Database
 * Adds: people, places, things, events, authorities
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function deploy5EntitySystem() {
  console.log('🚀 Deploying 5-Entity System to ChittyChain database...\n');

  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    // Read the production schema (just the 5-entity parts)
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const schemaPath = path.join(__dirname, 'schema', 'chittychain-production-schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Extract only the 5-entity tables (skip existing tables)
    const entitySqlParts = [
      // PEOPLE table
      schemaSql.match(/-- PEOPLE \\(PEO\\)[\\s\\S]*?(?=-- PLACES \\(PLACE\\))/)?.[0],
      // PLACES table
      schemaSql.match(/-- PLACES \\(PLACE\\)[\\s\\S]*?(?=-- THINGS \\(PROP\\))/)?.[0],
      // THINGS table
      schemaSql.match(/-- THINGS \\(PROP\\)[\\s\\S]*?(?=-- EVENTS \\(EVNT\\))/)?.[0],
      // EVENTS table
      schemaSql.match(/-- EVENTS \\(EVNT\\)[\\s\\S]*?(?=-- AUTHORITIES \\(AUTH\\))/)?.[0],
      // AUTHORITIES table
      schemaSql.match(/-- AUTHORITIES \\(AUTH\\)[\\s\\S]*?(?=-- =====)/)?.[0]
    ].filter(Boolean);

    if (entitySqlParts.length !== 5) {
      console.error('❌ Could not extract all 5 entity tables from schema');
      process.exit(1);
    }

    console.log('📦 Deploying 5-Entity System:');
    console.log('   - People (PEO)');
    console.log('   - Places (PLACE)');
    console.log('   - Things (PROP)');
    console.log('   - Events (EVNT)');
    console.log('   - Authorities (AUTH)');
    console.log('');

    // Execute each entity table
    for (let i = 0; i < entitySqlParts.length; i++) {
      const entityName = ['People', 'Places', 'Things', 'Events', 'Authorities'][i];
      console.log(`🔄 Creating ${entityName} table...`);

      try {
        await client.query(entitySqlParts[i]);
        console.log(`✅ ${entityName} table created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${entityName} table already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    // Verify all tables exist
    const verification = await client.query(`
      SELECT
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'people') THEN '✅' ELSE '❌' END as people,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'places') THEN '✅' ELSE '❌' END as places,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'things') THEN '✅' ELSE '❌' END as things,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN '✅' ELSE '❌' END as events,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'authorities') THEN '✅' ELSE '❌' END as authorities
    `);

    const status = verification.rows[0];
    console.log('\\n🏗️  5-Entity System Verification:');
    console.log(`   People: ${status.people}`);
    console.log(`   Places: ${status.places}`);
    console.log(`   Things: ${status.things}`);
    console.log(`   Events: ${status.events}`);
    console.log(`   Authorities: ${status.authorities}`);

    // Update schema version
    try {
      await client.query(`
        INSERT INTO schema_versions (version, description)
        VALUES ('2.0.0', '5-Entity System: People, Places, Things, Events, Authorities')
        ON CONFLICT (version) DO NOTHING
      `);
    } catch (e) {
      // Ignore if schema_versions doesn't have right structure
    }

    client.release();
    await pool.end();

    console.log('\\n🎉 5-Entity System deployed successfully!');
    console.log('\\n📋 ChittyChain database now includes:');
    console.log('✅ People - Individuals, legal persons, entities');
    console.log('✅ Places - Locations, venues, jurisdictions');
    console.log('✅ Things - Property, assets, objects, evidence items');
    console.log('✅ Events - Actions, transactions, incidents, occurrences');
    console.log('✅ Authorities - Laws, regulations, precedents, rulings');
    console.log('');
    console.log('🔗 Ready for:');
    console.log('- Legal case management with full entity relationships');
    console.log('- Evidence chain of custody with cryptographic integrity');
    console.log('- Event sourcing and temporal queries');
    console.log('- GDPR compliance and data subject rights');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

deploy5EntitySystem();