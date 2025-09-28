import { db, tables } from '../src/lib/db';

async function pushSchema() {
  console.log('📦 Initializing database schema...\n');

  // Check if using PostgreSQL (this script is for SQLite only)
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (databaseUrl && databaseUrl.includes('postgres')) {
    console.log('⚠️  PostgreSQL detected. Please apply schema using:');
    console.log('    psql $DATABASE_URL < db/sql/postgres_schema.sql\n');
    console.log('This script is for SQLite development only.');
    process.exit(0);
  }

  try {
    // Touch all tables to ensure they're created in SQLite
    // Drizzle with better-sqlite3 creates tables on first access

    console.log('Creating users table...');
    await db.select().from(tables.users).limit(1);
    console.log('✓ users table ready');

    console.log('Creating cases table...');
    await db.select().from(tables.cases).limit(1);
    console.log('✓ cases table ready');

    console.log('Creating master_evidence table...');
    await db.select().from(tables.masterEvidence).limit(1);
    console.log('✓ master_evidence table ready');

    console.log('Creating atomic_facts table...');
    await db.select().from(tables.atomicFacts).limit(1);
    console.log('✓ atomic_facts table ready');

    console.log('Creating contradictions table...');
    await db.select().from(tables.contradictions).limit(1);
    console.log('✓ contradictions table ready');

    console.log('Creating chain_of_custody table...');
    await db.select().from(tables.chainOfCustody).limit(1);
    console.log('✓ chain_of_custody table ready');

    console.log('Creating audit_log table...');
    await db.select().from(tables.auditLog).limit(1);
    console.log('✓ audit_log table ready');

    console.log('\n✅ SQLite schema initialized successfully!');
    console.log(`
Database location: ./.data/chitty.db

Next steps:
-----------
1. Run the seed script to add sample data:
   npm run seed

2. Start the development server:
   npm run dev

3. Test the API:
   curl http://localhost:3000/health
    `);
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    process.exit(1);
  }
}

// Run schema push
pushSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Schema push error:', error);
    process.exit(1);
  });