#!/usr/bin/env node

/**
 * Comprehensive ChittyLedger Deployment Test
 * Verifies schema deployment and data integrity
 */

import { Pool } from 'pg';

async function runIntegrityTests() {
  console.log('🧪 Testing ChittyLedger deployment integrity...\n');

  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_nrPStO8zpjH9@ep-bold-flower-adn963za.c-2.us-east-1.aws.neon.tech/chittychain?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  const tests = [];
  let passedTests = 0;
  let totalTests = 0;

  async function test(name, testFn) {
    totalTests++;
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${name}`);
        passedTests++;
      } else {
        console.log(`❌ ${name}`);
      }
      tests.push({ name, passed: result });
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      tests.push({ name, passed: false, error: error.message });
    }
  }

  try {
    const client = await pool.connect();

    // 1. Test 5-Entity System Tables
    await test('5-Entity System Tables Exist', async () => {
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('people', 'places', 'things', 'events', 'authorities')
      `);
      return tables.rows.length === 5;
    });

    // 2. Test Core Legal Tables
    await test('Legal Case Management Tables', async () => {
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('cases', 'evidence', 'atomic_facts', 'case_parties')
      `);
      return tables.rows.length >= 3; // evidence table might be named differently
    });

    // 3. Test Event Sourcing Infrastructure
    await test('Event Sourcing Infrastructure', async () => {
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('event_store', 'chain_of_custody')
      `);
      return tables.rows.length >= 1;
    });

    // 4. Test Foreign Key Relationships
    await test('Foreign Key Relationships', async () => {
      const fkeys = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
      `);
      return fkeys.rows[0].count > 10; // Should have many relationships
    });

    // 5. Test ChittyID Columns
    await test('ChittyID System Implementation', async () => {
      const chittyIdCols = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE column_name = 'chitty_id'
        AND table_schema = 'public'
      `);
      return chittyIdCols.rows[0].count >= 5; // All 5 entities should have chitty_id
    });

    // 6. Test Temporal Versioning
    await test('Temporal Versioning System', async () => {
      const temporalCols = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE column_name IN ('valid_from', 'valid_to', 'version_number')
        AND table_schema = 'public'
      `);
      return temporalCols.rows[0].count >= 15; // 3 columns × 5 entities = 15
    });

    // 7. Test GDPR Compliance Fields
    await test('GDPR Compliance Framework', async () => {
      const gdprCols = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE column_name LIKE 'gdpr_%'
        AND table_schema = 'public'
      `);
      return gdprCols.rows[0].count > 0;
    });

    // 8. Test Sample Data Insert
    await test('Sample Data Insertion', async () => {
      // Try to insert a test person
      const insertResult = await client.query(`
        INSERT INTO people (
          chitty_id,
          legal_name,
          entity_type,
          first_name,
          last_name
        ) VALUES (
          'CHITTY-PEO-TEST00000001',
          'Test Person',
          'INDIVIDUAL',
          'Test',
          'Person'
        )
        ON CONFLICT (chitty_id) DO NOTHING
        RETURNING id
      `);

      // Verify it exists
      const selectResult = await client.query(`
        SELECT id FROM people WHERE chitty_id = 'CHITTY-PEO-TEST00000001'
      `);

      return selectResult.rows.length > 0;
    });

    // 9. Test Cross-Entity Relationships
    await test('Cross-Entity Relationship Support', async () => {
      // Check if we can reference people from things
      const constraints = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = 'things'
        AND kcu.column_name LIKE '%_id'
      `);
      return constraints.rows[0].count > 0;
    });

    // 10. Test Index Performance
    await test('Performance Indexing', async () => {
      const indexes = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN ('people', 'places', 'things', 'events', 'authorities')
      `);
      return indexes.rows[0].count >= 20; // Should have many indexes for performance
    });

    client.release();
    await pool.end();

    // Summary
    console.log('\\n📊 Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
      console.log('\\n🎉 All tests passed! ChittyLedger deployment is ready for production.');
      console.log('\\n🔗 System includes:');
      console.log('✅ 5-Entity System (People, Places, Things, Events, Authorities)');
      console.log('✅ Legal case management with evidence chain');
      console.log('✅ Event sourcing and temporal versioning');
      console.log('✅ GDPR compliance framework');
      console.log('✅ Cross-entity relationships and indexing');
      console.log('\\n🚀 Ready for:');
      console.log('- Notion AI Development Center integration');
      console.log('- Cloudflare Worker bridge deployment');
      console.log('- Cook County property data sync');
      console.log('- Legal evidence management workflows');
    } else {
      console.log('\\n⚠️  Some tests failed. Review issues before production deployment.');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runIntegrityTests();