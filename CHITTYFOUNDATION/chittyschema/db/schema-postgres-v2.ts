import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =====================================================
// SYSTEM CONTEXT
// =====================================================

// Users (system access context - NOT legal entities)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // User's system identity
  email: text('email').unique().notNull(),
  role: text('role').notNull(), // admin, litigator, witness, analyst, viewer
  permissions: text('permissions').array(), // Granular permissions
  barNumber: text('bar_number'), // If attorney
  licenseState: text('license_state'), // Attorney license jurisdiction
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0.0'),
  verified: boolean('verified').default(false),
  lastActivity: timestamp('last_activity', { withTimezone: true }),
  twoFAEnabled: boolean('two_fa_enabled').default(false),
  sessionData: jsonb('session_data'), // Current session context
  preferences: jsonb('preferences'), // User interface preferences
  linkedEntityId: uuid('linked_entity_id'), // Reference to their legal entity (if any)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// LEGAL ENTITIES (The actual parties)
// =====================================================

// Legal Entities (people, organizations, trusts, etc. - the actual legal parties)
export const entities = pgTable('entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  name: text('name').notNull(),
  entityType: text('entity_type').notNull(), // INDIVIDUAL, LLC, CORP, TRUST, PARTNERSHIP, GOVERNMENT, OTHER
  subType: text('sub_type'), // Dynasty Trust, Medicare Trust, etc.
  ein: text('ein'), // Employer Identification Number
  ssn: text('ssn'), // For individuals
  address: jsonb('address'), // Full address object
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  incorporationState: text('incorporation_state'),
  incorporationDate: date('incorporation_date'),
  registeredAgent: text('registered_agent'),
  status: text('status').default('ACTIVE'), // ACTIVE, INACTIVE, DISSOLVED, SUSPENDED
  parentEntityId: uuid('parent_entity_id'), // For subsidiaries
  metadata: jsonb('metadata'), // Flexible additional data
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  verificationSource: text('verification_source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Cases (litigation matters)
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  docketNumber: text('docket_number').unique().notNull(),
  jurisdiction: text('jurisdiction'),
  title: text('title'),
  status: text('status'), // open, closed, appealed, stayed, settled
  caseType: text('case_type'), // civil, criminal, administrative, family, etc.
  createdBy: uuid('created_by').references(() => users.id),
  leadCounsel: uuid('lead_counsel').references(() => users.id),
  filingDate: date('filing_date'),
  trialDate: date('trial_date'),
  judgeAssigned: text('judge_assigned'),
  courtroom: text('courtroom'),
  estimatedValue: numeric('estimated_value', { precision: 15, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Case Parties (linking entities to cases with their roles)
export const caseParties = pgTable('case_parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  entityId: uuid('entity_id').references(() => entities.id).notNull(),
  role: text('role').notNull(), // PLAINTIFF, DEFENDANT, WITNESS, EXPERT, INTERVENOR, etc.
  status: text('status').default('ACTIVE'), // ACTIVE, DISMISSED, SETTLED
  retainedCounsel: uuid('retained_counsel').references(() => users.id),
  notes: text('notes'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// ASSETS & FINANCIAL TRACKING
// =====================================================

// Assets (real estate, financial accounts, investments, etc.)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  name: text('name').notNull(),
  assetType: text('asset_type').notNull(), // REAL_ESTATE, BANK_ACCOUNT, INVESTMENT, VEHICLE, INTELLECTUAL_PROPERTY, etc.
  subType: text('sub_type'), // Specific asset subtype
  ownerId: uuid('owner_id').references(() => entities.id), // Primary owner
  ownershipType: text('ownership_type'), // SOLE, JOINT, TRUST, CORPORATE
  ownershipPercentage: numeric('ownership_percentage', { precision: 5, scale: 2 }).default('100.00'),
  currentValue: numeric('current_value', { precision: 15, scale: 2 }),
  valuationDate: date('valuation_date'),
  valuationMethod: text('valuation_method'), // APPRAISAL, MARKET, ASSESSED, BOOK_VALUE
  acquisitionDate: date('acquisition_date'),
  acquisitionCost: numeric('acquisition_cost', { precision: 15, scale: 2 }),
  address: jsonb('address'), // For real estate
  accountNumber: text('account_number'), // For financial accounts
  institution: text('institution'), // Bank, brokerage, etc.
  metadata: jsonb('metadata'), // Asset-specific details
  relatedCaseId: uuid('related_case_id').references(() => cases.id), // If asset is subject of litigation
  status: text('status').default('ACTIVE'), // ACTIVE, SOLD, TRANSFERRED, FROZEN, DISPUTED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Financial Transactions
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  transactionType: text('transaction_type').notNull(), // DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT, RECEIPT, etc.
  fromEntityId: uuid('from_entity_id').references(() => entities.id),
  toEntityId: uuid('to_entity_id').references(() => entities.id),
  fromAssetId: uuid('from_asset_id').references(() => assets.id),
  toAssetId: uuid('to_asset_id').references(() => assets.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),
  description: text('description'),
  reference: text('reference'), // Check number, wire reference, etc.
  category: text('category'), // LEGAL_FEES, SETTLEMENT, INVESTMENT, OPERATING_EXPENSE, etc.
  relatedCaseId: uuid('related_case_id').references(() => cases.id),
  source: text('source'), // BANK_IMPORT, MANUAL_ENTRY, API_SYNC
  externalId: text('external_id'), // ID from source system
  metadata: jsonb('metadata'),
  verified: boolean('verified').default(false),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// EVIDENCE & DOCUMENTATION
// =====================================================

// Master Evidence (documents, recordings, physical evidence)
export const masterEvidence = pgTable('master_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
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

// Atomic Facts (granular factual assertions)
export const atomicFacts = pgTable('atomic_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
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

// Contradictions (conflicting facts)
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
// VERIFICATION & WORKFLOW
// =====================================================

// Verification Tasks (workflow for document/entity verification)
export const verificationTasks = pgTable('verification_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  taskType: text('task_type').notNull(), // ENTITY_VERIFICATION, DOCUMENT_AUTHENTICATION, FINANCIAL_VERIFICATION, etc.
  subjectType: text('subject_type').notNull(), // ENTITY, EVIDENCE, ASSET, TRANSACTION
  subjectId: uuid('subject_id').notNull(), // ID of the item being verified
  assignedTo: uuid('assigned_to').references(() => users.id),
  priority: text('priority').default('MEDIUM'), // LOW, MEDIUM, HIGH, URGENT
  status: text('status').default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
  dueDate: timestamp('due_date', { withTimezone: true }),
  instructions: text('instructions'),
  verificationMethod: text('verification_method'), // API_CHECK, MANUAL_REVIEW, THIRD_PARTY, etc.
  result: text('result'), // VERIFIED, REJECTED, INCONCLUSIVE
  resultDetails: jsonb('result_details'),
  notes: text('notes'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// AUDIT & ACTIVITY TRACKING
// =====================================================

// Comprehensive Audit Log (source of truth for all system activity)
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  userId: uuid('user_id').references(() => users.id),
  caseId: uuid('case_id').references(() => cases.id),
  entity: text('entity').notNull(), // evidence, fact, case, user, etc.
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE, TRANSFER, VERIFY, etc.
  actionDetails: jsonb('action_details'), // Specific details about what changed
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  integrityHash: text('integrity_hash'), // For chain of custody verification
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// PROPERTY & LOCATION DATA
// =====================================================

// Property PINs (Cook County Integration)
export const propertyPins = pgTable('property_pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  pin: text('pin').unique().notNull(),
  caseId: uuid('case_id').references(() => cases.id),
  ownerId: uuid('owner_id').references(() => entities.id),
  address: text('address'),
  unit: text('unit'),
  ownerName: text('owner_name'), // As recorded in county records
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
  verificationTasks: many(verificationTasks),
  auditLogs: many(auditLog)
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  parent: one(entities, {
    fields: [entities.parentEntityId],
    references: [entities.id]
  }),
  children: many(entities),
  assets: many(assets),
  caseParties: many(caseParties),
  properties: many(propertyPins),
  transactionsFrom: many(transactions, { relationName: "fromEntity" }),
  transactionsTo: many(transactions, { relationName: "toEntity" })
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id]
  }),
  leadCounsel: one(users, {
    fields: [cases.leadCounsel],
    references: [users.id]
  }),
  parties: many(caseParties),
  evidence: many(masterEvidence),
  facts: many(atomicFacts),
  contradictions: many(contradictions),
  properties: many(propertyPins),
  assets: many(assets),
  transactions: many(transactions)
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  owner: one(entities, {
    fields: [assets.ownerId],
    references: [entities.id]
  }),
  relatedCase: one(cases, {
    fields: [assets.relatedCaseId],
    references: [cases.id]
  }),
  transactionsFrom: many(transactions, { relationName: "fromAsset" }),
  transactionsTo: many(transactions, { relationName: "toAsset" })
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromEntity: one(entities, {
    fields: [transactions.fromEntityId],
    references: [entities.id],
    relationName: "fromEntity"
  }),
  toEntity: one(entities, {
    fields: [transactions.toEntityId],
    references: [entities.id],
    relationName: "toEntity"
  }),
  fromAsset: one(assets, {
    fields: [transactions.fromAssetId],
    references: [assets.id],
    relationName: "fromAsset"
  }),
  toAsset: one(assets, {
    fields: [transactions.toAssetId],
    references: [assets.id],
    relationName: "toAsset"
  }),
  relatedCase: one(cases, {
    fields: [transactions.relatedCaseId],
    references: [cases.id]
  }),
  verifier: one(users, {
    fields: [transactions.verifiedBy],
    references: [users.id]
  })
}));

// =====================================================
// CHAIN OF CUSTODY VIEW (derived from audit log)
// =====================================================
// This would be created as a PostgreSQL view:
/*
CREATE VIEW chain_of_custody AS
SELECT
  al.id,
  al.entity_id as evidence_id,
  al.action,
  al.user_id as performed_by,
  al.action_details->>'transferMethod' as transfer_method,
  al.action_details->>'integrityCheckMethod' as integrity_check_method,
  COALESCE((al.action_details->>'integrityVerified')::boolean, false) as integrity_verified,
  al.action_details->>'notes' as notes,
  al.created_at as timestamp
FROM audit_log al
WHERE al.entity = 'evidence'
  AND al.action IN ('CREATE', 'TRANSFER', 'VERIFY', 'MODIFY', 'ACCESS')
ORDER BY al.created_at;
*/

// =====================================================
// TYPE EXPORTS
// =====================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type CaseParty = typeof caseParties.$inferSelect;
export type NewCaseParty = typeof caseParties.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Evidence = typeof masterEvidence.$inferSelect;
export type NewEvidence = typeof masterEvidence.$inferInsert;
export type Fact = typeof atomicFacts.$inferSelect;
export type NewFact = typeof atomicFacts.$inferInsert;
export type Contradiction = typeof contradictions.$inferSelect;
export type NewContradiction = typeof contradictions.$inferInsert;
export type VerificationTask = typeof verificationTasks.$inferSelect;
export type NewVerificationTask = typeof verificationTasks.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type PropertyPin = typeof propertyPins.$inferSelect;
export type NewPropertyPin = typeof propertyPins.$inferInsert;