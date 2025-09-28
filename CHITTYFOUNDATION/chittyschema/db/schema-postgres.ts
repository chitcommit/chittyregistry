import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =====================================================
// USERS TABLE
// =====================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  name: text('name'),
  email: text('email').unique(),
  role: text('role'), // admin, litigator, witness, analyst, viewer
  barNumber: text('bar_number'),
  phone: text('phone'),
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0.0'),
  verified: boolean('verified').default(false),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  twoFAEnabled: boolean('two_fa_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// CASES TABLE
// =====================================================
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  docketNumber: text('docket_number').unique().notNull(),
  jurisdiction: text('jurisdiction'),
  title: text('title'),
  status: text('status'), // open, closed, appealed, stayed, settled
  createdBy: uuid('created_by').references(() => users.id),
  filingDate: date('filing_date'),
  judgeAssigned: text('judge_assigned'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// MASTER EVIDENCE TABLE
// =====================================================
export const masterEvidence = pgTable('master_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  submittedBy: uuid('submitted_by').references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  mediaUrl: text('media_url'),
  fileHash: text('file_hash').unique(),
  type: text('type'), // document, audio, video, image, financial_record, etc.
  tier: text('tier'), // GOVERNMENT, VERIFIED_THIRD_PARTY, WITNESS, etc.
  weight: numeric('weight', { precision: 3, scale: 2 }), // 0.00 to 1.00
  source: text('source'),
  sourceVerification: text('source_verification'),
  authenticationMethod: text('authentication_method'),
  isConfidential: boolean('is_confidential').default(false),
  dateReceived: timestamp('date_received', { withTimezone: true }),
  dateOfEvidence: timestamp('date_of_evidence', { withTimezone: true }),
  mintingStatus: text('minting_status'), // Pending, Minted, Failed
  blockNumber: text('block_number'),
  transactionHash: text('transaction_hash'),
  auditNotes: text('audit_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// ATOMIC FACTS TABLE
// =====================================================
export const atomicFacts = pgTable('atomic_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  evidenceId: uuid('evidence_id').references(() => masterEvidence.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => cases.id),
  assertedBy: uuid('asserted_by').references(() => users.id),
  text: text('text').notNull(),
  extractedFrom: text('extracted_from'),
  tags: text('tags').array(),
  factType: text('fact_type'), // STATUS, ACTION, RELATIONSHIP, TEMPORAL, FINANCIAL, LOCATION
  locationInDocument: text('location_in_document'),
  classificationLevel: text('classification_level'), // FACT, CLAIM, SPECULATION, OPINION
  weight: numeric('weight', { precision: 3, scale: 2 }), // 0.00 to 1.00
  credibilityFactors: text('credibility_factors').array(),
  timestampedAt: timestamp('timestamped_at', { withTimezone: true }),
  verified: boolean('verified').default(false),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  chittychainStatus: text('chittychain_status'), // Pending, Minted, Failed
  verificationMethod: text('verification_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// CONTRADICTIONS TABLE
// =====================================================
export const contradictions = pgTable('contradictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.id),
  factAId: uuid('fact_a_id').references(() => atomicFacts.id),
  factBId: uuid('fact_b_id').references(() => atomicFacts.id),
  conflictType: text('conflict_type'), // DIRECT, TEMPORAL, LOGICAL, PARTIAL
  resolutionMethod: text('resolution_method'),
  winningFact: uuid('winning_fact').references(() => atomicFacts.id),
  impactOnCase: text('impact_on_case'),
  detectedBy: uuid('detected_by').references(() => users.id),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow(),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true })
});

// =====================================================
// CHAIN OF CUSTODY TABLE
// =====================================================
export const chainOfCustody = pgTable('chain_of_custody', {
  id: uuid('id').primaryKey().defaultRandom(),
  evidenceId: uuid('evidence_id').references(() => masterEvidence.id, { onDelete: 'cascade' }),
  action: text('action'), // CREATED, VIEWED, MODIFIED, TRANSFERRED, etc.
  performedBy: uuid('performed_by').references(() => users.id),
  transferMethod: text('transfer_method'),
  integrityCheckMethod: text('integrity_check_method'),
  integrityVerified: boolean('integrity_verified').default(false),
  notes: text('notes'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// AUDIT LOG TABLE
// =====================================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  caseId: uuid('case_id').references(() => cases.id),
  entity: text('entity').notNull(), // evidence, fact, case, user, etc.
  entityId: uuid('entity_id'),
  action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE, etc.
  ipAddress: text('ip_address'),
  sessionId: text('session_id'),
  success: boolean('success').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// PROPERTY PINS TABLE (Cook County Integration)
// =====================================================
export const propertyPins = pgTable('property_pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  pin: text('pin').unique().notNull(),
  caseId: uuid('case_id').references(() => cases.id),
  address: text('address'),
  unit: text('unit'),
  ownerName: text('owner_name'),
  ownerType: text('owner_type'), // INDIVIDUAL, LLC, CORP, TRUST, OTHER
  acquisitionDate: date('acquisition_date'),
  acquisitionPrice: numeric('acquisition_price', { precision: 12, scale: 2 }),
  currentAssessedValue: numeric('current_assessed_value', { precision: 12, scale: 2 }),
  lastTaxAmount: numeric('last_tax_amount', { precision: 10, scale: 2 }),
  lastTaxYear: integer('last_tax_year'),
  metadata: jsonb('metadata'),
  lastSync: timestamp('last_sync', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// RELATIONS
// =====================================================
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
  contradictions: many(contradictions),
  properties: many(propertyPins)
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

// =====================================================
// TYPE EXPORTS
// =====================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Evidence = typeof masterEvidence.$inferSelect;
export type NewEvidence = typeof masterEvidence.$inferInsert;
export type Fact = typeof atomicFacts.$inferSelect;
export type NewFact = typeof atomicFacts.$inferInsert;
export type Contradiction = typeof contradictions.$inferSelect;
export type NewContradiction = typeof contradictions.$inferInsert;
export type ChainOfCustodyEntry = typeof chainOfCustody.$inferSelect;
export type NewChainOfCustodyEntry = typeof chainOfCustody.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type PropertyPin = typeof propertyPins.$inferSelect;
export type NewPropertyPin = typeof propertyPins.$inferInsert;