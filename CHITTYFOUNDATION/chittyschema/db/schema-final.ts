import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean, date, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =====================================================
// SYSTEM CONTEXT (Non-entity system access)
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
// FUNDAMENTAL ENTITY TYPES (The 5 Categories)
// =====================================================

// PEOPLE (PEO) - Individuals, legal persons, parties
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // PEO namespace
  firstName: text('first_name'),
  middleName: text('middle_name'),
  lastName: text('last_name'),
  legalName: text('legal_name').notNull(), // Official legal name
  aliases: text('aliases').array(), // Known aliases, DBA names
  entityType: text('entity_type').notNull(), // INDIVIDUAL, LLC, CORP, TRUST, PARTNERSHIP, GOVERNMENT
  subType: text('sub_type'), // Dynasty Trust, S-Corp, etc.
  ssn: text('ssn'), // For individuals
  ein: text('ein'), // For entities
  dateOfBirth: date('date_of_birth'), // For individuals
  dateOfIncorporation: date('date_of_incorporation'), // For entities
  placeOfBirth: uuid('place_of_birth'), // Reference to places table
  incorporationPlace: uuid('incorporation_place'), // Reference to places table
  registeredAgent: text('registered_agent'),
  parentEntityId: uuid('parent_entity_id'), // For subsidiaries
  status: text('status').default('ACTIVE'), // ACTIVE, INACTIVE, DISSOLVED, DECEASED
  metadata: jsonb('metadata'),
  verificationStatus: text('verification_status').default('PENDING'),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// PLACES (PLACE) - Locations, venues, jurisdictions
export const places = pgTable('places', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // PLACE namespace
  name: text('name').notNull(),
  placeType: text('place_type').notNull(), // ADDRESS, VENUE, JURISDICTION, CRIME_SCENE, COURT, etc.
  subType: text('sub_type'), // Specific subtype
  streetAddress: text('street_address'),
  unit: text('unit'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country').default('USA'),
  coordinates: jsonb('coordinates'), // lat/lng
  parentPlaceId: uuid('parent_place_id'), // For hierarchical places
  jurisdictionLevel: text('jurisdiction_level'), // FEDERAL, STATE, COUNTY, MUNICIPAL
  jurisdictionCode: text('jurisdiction_code'), // Court codes, etc.
  timezone: text('timezone'),
  metadata: jsonb('metadata'),
  verificationStatus: text('verification_status').default('PENDING'),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// THINGS (PROP) - Property, assets, objects, evidence items
export const things = pgTable('things', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // PROP namespace
  name: text('name').notNull(),
  thingType: text('thing_type').notNull(), // REAL_ESTATE, FINANCIAL_ACCOUNT, VEHICLE, DOCUMENT, EVIDENCE, etc.
  subType: text('sub_type'), // Specific subtype
  description: text('description'),
  serialNumber: text('serial_number'),
  modelNumber: text('model_number'),
  manufacturer: text('manufacturer'),
  currentOwnerId: uuid('current_owner_id').references(() => people.id),
  ownershipType: text('ownership_type'), // SOLE, JOINT, TRUST, CORPORATE
  ownershipPercentage: numeric('ownership_percentage', { precision: 5, scale: 2 }).default('100.00'),
  currentValue: numeric('current_value', { precision: 15, scale: 2 }),
  valuationDate: date('valuation_date'),
  valuationMethod: text('valuation_method'), // APPRAISAL, MARKET, ASSESSED, BOOK_VALUE
  acquisitionDate: date('acquisition_date'),
  acquisitionCost: numeric('acquisition_cost', { precision: 15, scale: 2 }),
  currentLocationId: uuid('current_location_id').references(() => places.id),
  accountNumber: text('account_number'), // For financial accounts
  institution: text('institution'), // Bank, brokerage, etc.
  fileHash: text('file_hash'), // For digital evidence
  mediaUrl: text('media_url'), // For digital files
  physicalCondition: text('physical_condition'), // For physical evidence
  chainOfCustodyRequired: boolean('chain_of_custody_required').default(false),
  isConfidential: boolean('is_confidential').default(false),
  status: text('status').default('ACTIVE'), // ACTIVE, TRANSFERRED, DESTROYED, LOST, SEIZED
  metadata: jsonb('metadata'),
  verificationStatus: text('verification_status').default('PENDING'),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// EVENTS (EVNT) - Actions, transactions, incidents, occurrences
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // EVNT namespace
  name: text('name').notNull(),
  eventType: text('event_type').notNull(), // TRANSACTION, INCIDENT, HEARING, FILING, MEETING, etc.
  subType: text('sub_type'), // Specific subtype
  description: text('description'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  duration: integer('duration'), // in minutes
  locationId: uuid('location_id').references(() => places.id),
  primaryPersonId: uuid('primary_person_id').references(() => people.id), // Main actor
  secondaryPersonId: uuid('secondary_person_id').references(() => people.id), // Secondary party
  relatedThingId: uuid('related_thing_id').references(() => things.id), // Related object/asset
  parentEventId: uuid('parent_event_id'), // For event sequences
  amount: numeric('amount', { precision: 15, scale: 2 }), // For financial events
  currency: text('currency').default('USD'),
  status: text('status').default('SCHEDULED'), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
  outcome: text('outcome'), // Result of the event
  witnessIds: uuid('witness_ids').array(), // References to people table
  evidenceIds: uuid('evidence_ids').array(), // References to things table
  authorityIds: uuid('authority_ids').array(), // References to authorities table
  isConfidential: boolean('is_confidential').default(false),
  metadata: jsonb('metadata'),
  verificationStatus: text('verification_status').default('PENDING'),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// AUTHORITIES (AUTH) - Laws, regulations, precedents, rulings, powers
export const authorities = pgTable('authorities', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // AUTH namespace
  title: text('title').notNull(),
  authorityType: text('authority_type').notNull(), // STATUTE, REGULATION, CASE_LAW, COURT_ORDER, CONSTITUTION, etc.
  subType: text('sub_type'), // Specific subtype
  citation: text('citation'), // Legal citation (USC 42 § 1983, etc.)
  jurisdiction: uuid('jurisdiction').references(() => places.id), // Governing jurisdiction
  issuingAuthority: text('issuing_authority'), // Court, agency, legislature
  effectiveDate: date('effective_date'),
  expirationDate: date('expiration_date'),
  status: text('status').default('ACTIVE'), // ACTIVE, SUPERSEDED, REPEALED, EXPIRED
  precedentialValue: text('precedential_value'), // BINDING, PERSUASIVE, INFORMATIONAL
  hierarchyLevel: integer('hierarchy_level'), // Constitutional=1, Statute=2, Regulation=3, etc.
  parentAuthorityId: uuid('parent_authority_id'), // Parent law/regulation
  fullText: text('full_text'), // Complete text if available
  summary: text('summary'), // Brief summary
  keyHoldings: text('key_holdings').array(), // For case law
  applicableParties: uuid('applicable_parties').array(), // Who this applies to
  relatedCases: uuid('related_cases').array(), // Cases that cite this authority
  amendedBy: uuid('amended_by').array(), // References to other authorities
  supersededBy: uuid('superseded_by'), // Reference to superseding authority
  url: text('url'), // Link to official source
  metadata: jsonb('metadata'),
  verificationStatus: text('verification_status').default('PENDING'),
  lastVerified: timestamp('last_verified', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// CASES & LITIGATION MANAGEMENT
// =====================================================

// Cases (litigation matters that connect all the fundamental entities)
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // CASE namespace
  docketNumber: text('docket_number').unique().notNull(),
  title: text('title').notNull(),
  caseType: text('case_type').notNull(), // CIVIL, CRIMINAL, ADMINISTRATIVE, FAMILY, etc.
  subType: text('sub_type'), // CONTRACT, TORT, FAMILY, etc.
  status: text('status').default('ACTIVE'), // ACTIVE, CLOSED, APPEALED, STAYED, SETTLED
  jurisdiction: uuid('jurisdiction').references(() => places.id), // Court jurisdiction
  venueId: uuid('venue_id').references(() => places.id), // Specific courthouse
  judgeName: text('judge_name'),
  courtroomNumber: text('courtroom_number'),
  leadCounselId: uuid('lead_counsel_id').references(() => people.id),
  filingDate: date('filing_date'),
  trialDate: date('trial_date'),
  statusConferenceDate: date('status_conference_date'),
  discoveryDeadline: date('discovery_deadline'),
  motionDeadline: date('motion_deadline'),
  estimatedValue: numeric('estimated_value', { precision: 15, scale: 2 }),
  actualValue: numeric('actual_value', { precision: 15, scale: 2 }),
  isConfidential: boolean('is_confidential').default(false),
  sealedPortion: jsonb('sealed_portion'), // What parts are under seal
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Case Parties (linking people to cases with their roles)
export const caseParties = pgTable('case_parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  personId: uuid('person_id').references(() => people.id).notNull(),
  role: text('role').notNull(), // PLAINTIFF, DEFENDANT, WITNESS, EXPERT, INTERVENOR, COUNSEL, etc.
  partyType: text('party_type'), // INDIVIDUAL, ENTITY, CLASS_REPRESENTATIVE
  status: text('status').default('ACTIVE'), // ACTIVE, DISMISSED, SETTLED, DECEASED
  retainedCounselId: uuid('retained_counsel_id').references(() => people.id),
  serviceAddress: uuid('service_address').references(() => places.id),
  notes: text('notes'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  removedAt: timestamp('removed_at', { withTimezone: true })
});

// =====================================================
// EVIDENCE & FACT MANAGEMENT
// =====================================================

// Evidence Items (references to things that are evidence in cases)
export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  thingId: uuid('thing_id').references(() => things.id).notNull(), // The actual evidence object
  submittedById: uuid('submitted_by_id').references(() => people.id),
  evidenceNumber: text('evidence_number'), // Exhibit A, B, etc.
  title: text('title').notNull(),
  tier: text('tier').notNull(), // GOVERNMENT, VERIFIED_THIRD_PARTY, WITNESS, UNVERIFIED, CONTESTED
  weight: numeric('weight', { precision: 3, scale: 2 }), // 0.00 to 1.00 admissibility weight
  authenticationMethod: text('authentication_method'),
  authenticatedBy: uuid('authenticated_by').references(() => people.id),
  dateReceived: timestamp('date_received', { withTimezone: true }),
  dateOfEvidence: timestamp('date_of_evidence', { withTimezone: true }),
  chain_of_custody_verified: boolean('chain_of_custody_verified').default(false),
  mintingStatus: text('minting_status').default('PENDING'), // PENDING, MINTED, FAILED
  blockNumber: text('block_number'),
  transactionHash: text('transaction_hash'),
  admissibilityRuling: text('admissibility_ruling'), // ADMITTED, EXCLUDED, PENDING
  authorityBasis: uuid('authority_basis').array(), // Legal authorities supporting admissibility
  objections: text('objections').array(), // Objections raised
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// Atomic Facts (granular factual assertions)
export const atomicFacts = pgTable('atomic_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(), // FACT namespace
  evidenceId: uuid('evidence_id').references(() => evidence.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => cases.id).notNull(),
  assertedById: uuid('asserted_by_id').references(() => people.id),
  text: text('text').notNull(),
  factType: text('fact_type').notNull(), // WHO, WHAT, WHEN, WHERE, WHY, HOW, AMOUNT
  relatedPersonId: uuid('related_person_id').references(() => people.id),
  relatedPlaceId: uuid('related_place_id').references(() => places.id),
  relatedThingId: uuid('related_thing_id').references(() => things.id),
  relatedEventId: uuid('related_event_id').references(() => events.id),
  relatedAuthorityId: uuid('related_authority_id').references(() => authorities.id),
  locationInDocument: text('location_in_document'),
  classificationLevel: text('classification_level').notNull(), // FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION, CONTRADICTION
  weight: numeric('weight', { precision: 3, scale: 2 }), // 0.00 to 1.00
  credibilityFactors: text('credibility_factors').array(),
  contradictedBy: uuid('contradicted_by').array(), // References to other facts
  supportedBy: uuid('supported_by').array(), // References to supporting facts
  temporalSequence: integer('temporal_sequence'), // Order in sequence of events
  verified: boolean('verified').default(false),
  verifiedBy: uuid('verified_by').references(() => people.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationMethod: text('verification_method'),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
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
  entityType: text('entity_type').notNull(), // people, places, things, events, authorities, cases, evidence, facts
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // CREATE, READ, UPDATE, DELETE, TRANSFER, VERIFY, ACCESS, etc.
  actionDetails: jsonb('action_details'), // Specific details about what changed
  beforeState: jsonb('before_state'), // State before action
  afterState: jsonb('after_state'), // State after action
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  integrityHash: text('integrity_hash'), // For chain of custody verification
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// VERIFICATION & WORKFLOW
// =====================================================

// Verification Tasks (workflow for verifying entities and evidence)
export const verificationTasks = pgTable('verification_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  taskType: text('task_type').notNull(), // ENTITY_VERIFICATION, DOCUMENT_AUTHENTICATION, AUTHORITY_VALIDATION, etc.
  subjectType: text('subject_type').notNull(), // people, places, things, events, authorities
  subjectId: uuid('subject_id').notNull(),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  priority: text('priority').default('MEDIUM'), // LOW, MEDIUM, HIGH, URGENT
  status: text('status').default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
  dueDate: timestamp('due_date', { withTimezone: true }),
  instructions: text('instructions'),
  verificationMethod: text('verification_method'), // API_CHECK, MANUAL_REVIEW, THIRD_PARTY, etc.
  result: text('result'), // VERIFIED, REJECTED, INCONCLUSIVE
  resultDetails: jsonb('result_details'),
  authorityBasis: uuid('authority_basis').array(), // Legal authorities supporting verification
  notes: text('notes'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// =====================================================
// LEGACY COMPATIBILITY (for migration)
// =====================================================

// Property PINs (Cook County Integration - maps to things table)
export const propertyPins = pgTable('property_pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  chittyId: text('chitty_id').unique().notNull(),
  pin: text('pin').unique().notNull(),
  thingId: uuid('thing_id').references(() => things.id), // Links to the property as a "thing"
  placeId: uuid('place_id').references(() => places.id), // Links to the address as a "place"
  currentOwnerId: uuid('current_owner_id').references(() => people.id),
  caseId: uuid('case_id').references(() => cases.id),
  // County-specific data
  ownerName: text('owner_name'), // As recorded in county records
  ownerType: text('owner_type'),
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

export const usersRelations = relations(users, ({ one, many }) => ({
  linkedEntity: one(people, {
    fields: [users.linkedEntityId],
    references: [people.id]
  }),
  auditLogs: many(auditLog),
  verificationTasks: many(verificationTasks)
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  parent: one(people, {
    fields: [people.parentEntityId],
    references: [people.id],
    relationName: 'parentEntity'
  }),
  children: many(people, { relationName: 'parentEntity' }),
  birthPlace: one(places, {
    fields: [people.placeOfBirth],
    references: [places.id]
  }),
  incorporationPlace: one(places, {
    fields: [people.incorporationPlace],
    references: [places.id]
  }),
  ownedThings: many(things),
  caseParties: many(caseParties),
  primaryEvents: many(events, { relationName: "primaryPerson" }),
  secondaryEvents: many(events, { relationName: "secondaryPerson" }),
  submittedEvidence: many(evidence),
  assertedFacts: many(atomicFacts)
}));

export const placesRelations = relations(places, ({ one, many }) => ({
  parent: one(places, {
    fields: [places.parentPlaceId],
    references: [places.id],
    relationName: 'parentPlace'
  }),
  children: many(places, { relationName: 'parentPlace' }),
  authorities: many(authorities),
  cases: many(cases),
  events: many(events),
  things: many(things),
  people: many(people, { relationName: "birthPlace" }),
  incorporatedEntities: many(people, { relationName: "incorporationPlace" })
}));

export const thingsRelations = relations(things, ({ one, many }) => ({
  owner: one(people, {
    fields: [things.currentOwnerId],
    references: [people.id]
  }),
  location: one(places, {
    fields: [things.currentLocationId],
    references: [places.id]
  }),
  evidence: many(evidence),
  relatedEvents: many(events),
  relatedFacts: many(atomicFacts),
  propertyPin: one(propertyPins, {
    fields: [things.id],
    references: [propertyPins.thingId]
  })
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  location: one(places, {
    fields: [events.locationId],
    references: [places.id]
  }),
  primaryPerson: one(people, {
    fields: [events.primaryPersonId],
    references: [people.id],
    relationName: "primaryPerson"
  }),
  secondaryPerson: one(people, {
    fields: [events.secondaryPersonId],
    references: [people.id],
    relationName: "secondaryPerson"
  }),
  relatedThing: one(things, {
    fields: [events.relatedThingId],
    references: [things.id]
  }),
  parentEvent: one(events, {
    fields: [events.parentEventId],
    references: [events.id],
    relationName: 'parentEvent'
  }),
  childEvents: many(events, { relationName: 'parentEvent' }),
  relatedFacts: many(atomicFacts)
}));

export const authoritiesRelations = relations(authorities, ({ one, many }) => ({
  jurisdiction: one(places, {
    fields: [authorities.jurisdiction],
    references: [places.id]
  }),
  parent: one(authorities, {
    fields: [authorities.parentAuthorityId],
    references: [authorities.id],
    relationName: 'parentAuthority'
  }),
  children: many(authorities, { relationName: 'parentAuthority' }),
  superseding: one(authorities, {
    fields: [authorities.supersededBy],
    references: [authorities.id],
    relationName: 'superseding'
  }),
  relatedFacts: many(atomicFacts)
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  jurisdiction: one(places, {
    fields: [cases.jurisdiction],
    references: [places.id]
  }),
  venue: one(places, {
    fields: [cases.venueId],
    references: [places.id]
  }),
  leadCounsel: one(people, {
    fields: [cases.leadCounselId],
    references: [people.id]
  }),
  parties: many(caseParties),
  evidence: many(evidence),
  facts: many(atomicFacts),
  properties: many(propertyPins)
}));

// =====================================================
// TYPE EXPORTS
// =====================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type Thing = typeof things.$inferSelect;
export type NewThing = typeof things.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Authority = typeof authorities.$inferSelect;
export type NewAuthority = typeof authorities.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type CaseParty = typeof caseParties.$inferSelect;
export type NewCaseParty = typeof caseParties.$inferInsert;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
export type Fact = typeof atomicFacts.$inferSelect;
export type NewFact = typeof atomicFacts.$inferInsert;
export type VerificationTask = typeof verificationTasks.$inferSelect;
export type NewVerificationTask = typeof verificationTasks.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type PropertyPin = typeof propertyPins.$inferSelect;
export type NewPropertyPin = typeof propertyPins.$inferInsert;