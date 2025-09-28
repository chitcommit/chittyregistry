#!/usr/bin/env node

import { Pool } from 'pg';

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    // Check what tables exist
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('Existing tables:');
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Check for the 5 entity types
    const entityTypes = ['people', 'places', 'things', 'events', 'authorities'];
    console.log('\\n5-Entity System Status:');
    for (const entity of entityTypes) {
      const exists = tables.rows.some(row => row.table_name === entity);
      console.log(`${entity}: ${exists ? '✅' : '❌'}`);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

check();