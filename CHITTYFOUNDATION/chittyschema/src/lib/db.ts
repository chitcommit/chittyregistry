import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema-postgres';

// Database configuration - supports multiple PostgreSQL providers
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const databaseProvider = process.env.DATABASE_PROVIDER || 'postgres';

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or NEON_DATABASE_URL environment variable is required');
  console.error('');
  console.error('   For Neon (recommended):');
  console.error('   DATABASE_URL=postgres://user:pass@host.neon.tech:5432/dbname?sslmode=require');
  console.error('');
  console.error('   For local PostgreSQL:');
  console.error('   DATABASE_URL=postgres://user:pass@localhost:5432/chitty');
  console.error('');
  console.error('   For Docker:');
  console.error('   docker run -p 5432:5432 -e POSTGRES_DB=chitty -e POSTGRES_PASSWORD=chitty postgres');
  console.error('   DATABASE_URL=postgres://postgres:chitty@localhost:5432/chitty');
  process.exit(1);
}

// PostgreSQL connection with Neon/Cloudflare optimizations
const poolConfig: any = {
  connectionString: databaseUrl,
  // Neon serverless optimizations
  max: databaseProvider === 'neon' ? 1 : 10,
  idleTimeoutMillis: databaseProvider === 'neon' ? 10000 : 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

console.log(`✓ Connecting to PostgreSQL (${databaseProvider})...`);

// Verify connection
pool.query('SELECT NOW()').then(() => {
  console.log('✓ Database connection verified');
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
  if (err.message.includes('SSL')) {
    console.error('   Try adding ?sslmode=require to your DATABASE_URL');
  }
  process.exit(1);
});

// Export all table schemas
export * as tables from '../../db/schema-postgres';

// Export common queries
export const queries = {
  /**
   * Get case summary with counts
   */
  async getCaseSummary(caseId: string) {
    const [caseData] = await db
      .select()
      .from(schema.cases)
      .where(eq(schema.cases.id, caseId));

    const evidence = await db
      .select()
      .from(schema.masterEvidence)
      .where(eq(schema.masterEvidence.caseId, caseId));

    const facts = await db
      .select()
      .from(schema.atomicFacts)
      .where(eq(schema.atomicFacts.caseId, caseId));

    return {
      case: caseData,
      counts: {
        evidence: evidence.length,
        facts: facts.length
      },
      recentEvidence: evidence.slice(-5),
      recentFacts: facts.slice(-10)
    };
  },

  /**
   * Get chain of custody for evidence
   */
  async getChainOfCustody(evidenceId: string) {
    return db
      .select()
      .from(schema.chainOfCustody)
      .where(eq(schema.chainOfCustody.evidenceId, evidenceId));
  },

  /**
   * Get contradictions for a case
   */
  async getContradictions(caseId: string) {
    return db
      .select()
      .from(schema.contradictions)
      .where(eq(schema.contradictions.caseId, caseId));
  }
};