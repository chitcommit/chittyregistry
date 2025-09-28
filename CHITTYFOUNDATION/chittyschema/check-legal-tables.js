#!/usr/bin/env node

import { Pool } from 'pg';

async function checkLegalTables() {
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    // Check all legal-related tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%case%' OR
        table_name LIKE '%evidence%' OR
        table_name LIKE '%fact%' OR
        table_name LIKE '%legal%'
      )
      ORDER BY table_name
    `);

    console.log('Legal-related tables:');
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));

    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkLegalTables();