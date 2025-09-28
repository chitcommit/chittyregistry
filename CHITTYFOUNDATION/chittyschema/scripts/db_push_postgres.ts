import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function pushSchema() {
  console.log('📦 Applying PostgreSQL schema...\n');

  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or NEON_DATABASE_URL environment variable is required');
    console.error('   Set it in your .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'db', 'sql', 'postgres_schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Applying schema to database...');
    console.log('Database:', databaseUrl.split('@')[1]?.split('/')[0] || 'PostgreSQL');

    // Execute the schema
    await pool.query(schemaSql);

    console.log('✓ Schema applied successfully');

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n✅ Database tables created:');
    for (const row of tablesResult.rows) {
      console.log(`   - ${row.table_name}`);
    }

    console.log(`
Next steps:
-----------
1. Run the seed script to add sample data:
   npm run seed

2. Start the development server:
   npm run dev

3. Test the API:
   curl http://localhost:3000/health
    `);

    await pool.end();
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    await pool.end();
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