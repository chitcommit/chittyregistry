/**
 * Simplified Database Connection
 * Basic PostgreSQL connection that actually works
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

// Simple schema that works
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  chittyId: text("chitty_id").unique().notNull(),
  name: text("name"),
  email: text("email").unique(),
  role: text("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  docketNumber: text("docket_number").unique().notNull(),
  title: text("title"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const masterEvidence = pgTable("master_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id"),
  submittedBy: uuid("submitted_by"),
  title: text("title").notNull(),
  content: text("content"),
  fileHash: text("file_hash"),
  type: text("type"),
  tier: text("tier"),
  weight: numeric("weight"),
  sourceVerification: text("source_verification"),
  authenticationMethod: text("authentication_method"),
  isConfidential: boolean("is_confidential").default(false),
  dateReceived: timestamp("date_received", { withTimezone: true }),
  dateOfEvidence: timestamp("date_of_evidence", { withTimezone: true }),
  mintingStatus: text("minting_status"),
  auditNotes: text("audit_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const atomicFacts = pgTable("atomic_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  evidenceId: uuid("evidence_id"),
  caseId: uuid("case_id"),
  assertedBy: uuid("asserted_by"),
  text: text("text").notNull(),
  factType: text("fact_type"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const chainOfCustody = pgTable("chain_of_custody", {
  id: uuid("id").primaryKey().defaultRandom(),
  evidenceId: uuid("evidence_id"),
  action: text("action"),
  performedBy: uuid("performed_by"),
  transferMethod: text("transfer_method"),
  integrityCheckMethod: text("integrity_check_method"),
  integrityVerified: boolean("integrity_verified").default(false),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Database connection
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/chittyschema";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  connectionTimeoutMillis: 10000,
});

const schema = {
  users,
  cases,
  masterEvidence,
  atomicFacts,
  chainOfCustody,
};

export const db = drizzle(pool, { schema });

// Export tables for import
export const tables = {
  users,
  cases,
  masterEvidence,
  atomicFacts,
  chainOfCustody,
};

// Simple execute function for raw queries
export const execute = async (query: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};
