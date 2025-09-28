import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { pgTable, uuid, text as pgText, timestamp, jsonb, numeric, boolean, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// SQLite Schema (for development)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                      // UUID string
  chittyId: text('chitty_id').unique().notNull(),
  name: text('name'),
  email: text('email').unique(),
  role: text('role'),                               // admin, litigator, witness, analyst, viewer
  barNumber: text('bar_number'),
  phone: text('phone'),
  trustScore: real('trust_score').default(0),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  lastActivity: integer('last_activity'),           // epoch ms
  twoFAEnabled: integer('two_fa_enabled', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at')
});

export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),                      // UUID string
  docketNumber: text('docket_number').unique().notNull(),
  jurisdiction: text('jurisdiction'),
  title: text('title'),
  status: text('status'),                           // open, closed, appealed, stayed
  createdBy: text('created_by').references(() => users.id),
  filingDate: text('filing_date'),                  // ISO string
  judgeAssigned: text('judge_assigned'),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at')
});

export const masterEvidence = sqliteTable('master_evidence', {
  id: text('id').primaryKey(),                      // UUID string
  caseId: text('case_id').references(() => cases.id),
  submittedBy: text('submitted_by').references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  metadata: text('metadata'),                       // JSON string
  mediaUrl: text('media_url'),
  fileHash: text('file_hash').unique(),
  type: text('type'),                              // document, audio, video, image, financial_record, etc.
  tier: text('tier'),                              // GOVERNMENT, VERIFIED_THIRD_PARTY, WITNESS, etc.
  weight: real('weight'),                          // 0.0 to 1.0
  source: text('source'),
  sourceVerification: text('source_verification'),
  authenticationMethod: text('authentication_method'),
  isConfidential: integer('is_confidential', { mode: 'boolean' }).default(false),
  dateReceived: text('date_received'),             // ISO string
  dateOfEvidence: text('date_of_evidence'),        // ISO string
  mintingStatus: text('minting_status'),           // Pending, Minted, Failed
  blockNumber: text('block_number'),
  transactionHash: text('transaction_hash'),
  auditNotes: text('audit_notes'),
  createdAt: integer('created_at')
});

export const atomicFacts = sqliteTable('atomic_facts', {
  id: text('id').primaryKey(),                      // UUID string
  evidenceId: text('evidence_id').references(() => masterEvidence.id),
  caseId: text('case_id').references(() => cases.id),
  assertedBy: text('asserted_by').references(() => users.id),
  text: text('text').notNull(),
  extractedFrom: text('extracted_from'),
  tags: text('tags'),                               // CSV for SQLite
  factType: text('fact_type'),                      // STATUS, ACTION, RELATIONSHIP, etc.
  locationInDocument: text('location_in_document'),
  classificationLevel: text('classification_level'), // FACT, CLAIM, SPECULATION
  weight: real('weight'),                           // 0.0 to 1.0
  credibilityFactors: text('credibility_factors'),  // CSV
  timestampedAt: text('timestamped_at'),            // ISO string
  verified: integer('verified', { mode: 'boolean' }).default(false),
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: text('verified_at'),                  // ISO string
  chittychainStatus: text('chittychain_status'),    // Pending, Minted, Failed
  verificationMethod: text('verification_method'),
  createdAt: integer('created_at')
});

export const contradictions = sqliteTable('contradictions', {
  id: text('id').primaryKey(),                      // UUID string
  caseId: text('case_id').references(() => cases.id),
  factAId: text('fact_a_id').references(() => atomicFacts.id),
  factBId: text('fact_b_id').references(() => atomicFacts.id),
  conflictType: text('conflict_type'),              // DIRECT, TEMPORAL, LOGICAL
  resolutionMethod: text('resolution_method'),
  winningFact: text('winning_fact').references(() => atomicFacts.id),
  impactOnCase: text('impact_on_case'),
  detectedBy: text('detected_by').references(() => users.id),
  detectedAt: text('detected_at'),                  // ISO string
  resolution: text('resolution'),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: text('resolved_at')                   // ISO string
});

export const chainOfCustody = sqliteTable('chain_of_custody', {
  id: text('id').primaryKey(),                      // UUID string
  evidenceId: text('evidence_id').references(() => masterEvidence.id),
  action: text('action'),                           // CREATED, VIEWED, MODIFIED, TRANSFERRED, etc.
  performedBy: text('performed_by').references(() => users.id),
  transferMethod: text('transfer_method'),
  integrityCheckMethod: text('integrity_check_method'),
  integrityVerified: integer('integrity_verified', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  timestamp: text('timestamp'),                     // ISO string
  createdAt: integer('created_at')
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),                      // UUID string
  userId: text('user_id').references(() => users.id),
  caseId: text('case_id').references(() => cases.id),
  entity: text('entity'),                           // evidence, fact, case, user, etc.
  entityId: text('entity_id'),
  action: text('action'),                           // CREATE, READ, UPDATE, DELETE, etc.
  ipAddress: text('ip_address'),
  sessionId: text('session_id'),
  success: text('success'),                         // true/false as string
  metadata: text('metadata'),                       // JSON string
  createdAt: integer('created_at')
});

// Relations (for Drizzle ORM query builder)
export const usersRelations = relations(users, ({ many }) => ({
  casesCreated: many(cases),
  evidenceSubmitted: many(masterEvidence),
  factsAsserted: many(atomicFacts),
  chainOfCustodyActions: many(chainOfCustody),
  auditLogs: many(auditLog)
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id]
  }),
  evidence: many(masterEvidence),
  facts: many(atomicFacts),
  contradictions: many(contradictions)
}));

export const masterEvidenceRelations = relations(masterEvidence, ({ one, many }) => ({
  case: one(cases, {
    fields: [masterEvidence.caseId],
    references: [cases.id]
  }),
  submitter: one(users, {
    fields: [masterEvidence.submittedBy],
    references: [users.id]
  }),
  facts: many(atomicFacts),
  chainOfCustody: many(chainOfCustody)
}));

export const atomicFactsRelations = relations(atomicFacts, ({ one }) => ({
  evidence: one(masterEvidence, {
    fields: [atomicFacts.evidenceId],
    references: [masterEvidence.id]
  }),
  case: one(cases, {
    fields: [atomicFacts.caseId],
    references: [cases.id]
  }),
  asserter: one(users, {
    fields: [atomicFacts.assertedBy],
    references: [users.id]
  }),
  verifier: one(users, {
    fields: [atomicFacts.verifiedBy],
    references: [users.id]
  })
}));

// PostgreSQL Schema exports (for production)
export const pgUsers = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: pgText('chitty_id').unique().notNull(),
  name: pgText('name'),
  email: pgText('email').unique(),
  role: pgText('role'),
  barNumber: pgText('bar_number'),
  phone: pgText('phone'),
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0.0'),
  verified: boolean('verified').default(false),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  twoFAEnabled: boolean('two_fa_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const pgCases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  docketNumber: pgText('docket_number').unique().notNull(),
  jurisdiction: pgText('jurisdiction'),
  title: pgText('title'),
  status: pgText('status'),
  createdBy: uuid('created_by').references(() => pgUsers.id),
  filingDate: date('filing_date'),
  judgeAssigned: pgText('judge_assigned'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const pgMasterEvidence = pgTable('master_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => pgCases.id, { onDelete: 'cascade' }),
  submittedBy: uuid('submitted_by').references(() => pgUsers.id),
  title: pgText('title').notNull(),
  content: pgText('content'),
  metadata: jsonb('metadata'),
  mediaUrl: pgText('media_url'),
  fileHash: pgText('file_hash').unique(),
  type: pgText('type'),
  tier: pgText('tier'),
  weight: numeric('weight', { precision: 3, scale: 2 }),
  source: pgText('source'),
  sourceVerification: pgText('source_verification'),
  authenticationMethod: pgText('authentication_method'),
  isConfidential: boolean('is_confidential').default(false),
  dateReceived: timestamp('date_received', { withTimezone: true }),
  dateOfEvidence: timestamp('date_of_evidence', { withTimezone: true }),
  mintingStatus: pgText('minting_status'),
  blockNumber: pgText('block_number'),
  transactionHash: pgText('transaction_hash'),
  auditNotes: pgText('audit_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Type exports for TypeScript consumers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Evidence = typeof masterEvidence.$inferSelect;
export type NewEvidence = typeof masterEvidence.$inferInsert;
export type Fact = typeof atomicFacts.$inferSelect;
export type NewFact = typeof atomicFacts.$inferInsert;
export type Contradiction = typeof contradictions.$inferSelect;
export type ChainOfCustodyEntry = typeof chainOfCustody.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;