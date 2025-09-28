/**
 * Notion Connector Types - Neutral Universal Framework
 *
 * Domain-agnostic type definitions for the ChittyChain Universal Data Framework
 */

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

export type EntityType = 'PEO' | 'PLACE' | 'PROP' | 'EVNT' | 'AUTH';

export type InformationTier =
  | 'PRIMARY_SOURCE'
  | 'OFFICIAL_RECORD'
  | 'INSTITUTIONAL'
  | 'THIRD_PARTY'
  | 'DERIVED'
  | 'REPORTED'
  | 'UNVERIFIED';

export type FactClassification =
  | 'OBSERVATION'
  | 'MEASUREMENT'
  | 'ASSERTION'
  | 'INFERENCE'
  | 'DERIVED'
  | 'OPINION'
  | 'HYPOTHESIS';

export type RelationshipType =
  | 'ASSOCIATION'
  | 'CONTAINMENT'
  | 'SEQUENCE'
  | 'DERIVATION'
  | 'SIMILARITY'
  | 'OPPOSITION'
  | 'DEPENDENCY'
  | 'TRANSFORMATION';

export type ConflictType =
  | 'DIRECT'
  | 'TEMPORAL'
  | 'LOGICAL'
  | 'SOURCE'
  | 'MEASUREMENT'
  | 'INTERPRETATION';

export type ActivityType =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'EXECUTE'
  | 'AUTHENTICATE'
  | 'AUTHORIZE';

export type ActorType =
  | 'HUMAN'
  | 'SYSTEM'
  | 'ORGANIZATION'
  | 'AI'
  | 'BOT'
  | 'SERVICE';

export type ContextType =
  | 'PROJECT'
  | 'INVESTIGATION'
  | 'ANALYSIS'
  | 'RESEARCH'
  | 'MONITORING'
  | 'ARCHIVE';

// =============================================================================
// MAIN INTERFACES
// =============================================================================

export interface NeutralEntity {
  id: string;
  chittyId: string;
  name: string;
  entityType: EntityType;
  entitySubtype?: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Archived' | 'Deleted';
  visibility: 'Public' | 'Restricted' | 'Private';
  classification?: string;
  contextTags: string[];
  verificationStatus: 'Unverified' | 'Pending' | 'Verified' | 'Disputed' | 'Rejected';
  accessLevel: 'Standard' | 'Elevated' | 'Restricted';
  created: Date;
  modified: Date;
  createdBy?: string;
  metadata: Record<string, any>;
}

export interface UniversalInformation {
  id: string;
  chittyId: string;
  title: string;
  contentType: 'Document' | 'Image' | 'Audio' | 'Video' | 'Data' | 'Communication' | 'Physical' | 'Other';
  contentFormat?: string;
  contentSummary?: string;
  informationTier: InformationTier;
  authenticityStatus: 'Authentic' | 'Unverified' | 'Disputed' | 'Fabricated';
  sourceEntityId?: string;
  contentHash?: string;
  contentSize?: number;
  contentLocation?: string;
  sensitivityLevel: 'Public' | 'Standard' | 'Sensitive' | 'Restricted' | 'Confidential';
  verificationStatus: 'Pending' | 'Verified' | 'Disputed' | 'Rejected';
  tags: string[];
  created: Date;
  modified: Date;
  contentDate?: Date;
  receivedDate?: Date;
}

export interface AtomicFact {
  id: string;
  chittyId: string;
  factStatement: string;
  factType?: string;
  classification: FactClassification;
  subjectEntityId?: string;
  predicate?: string;
  objectValue?: string;
  objectEntityId?: string;
  sourceInformationId?: string;
  certaintyLevel: number; // 0-1
  confidenceScore: number; // 0-1
  weight: number; // 0-1
  extractedBy: 'Human' | 'AI' | 'System';
  extractionMethod?: string;
  extractionConfidence?: number;
  factTimestamp?: Date;
  observedAt?: Date;
  recorded: Date;
  verificationStatus: 'Pending' | 'Verified' | 'Disputed' | 'Rejected';
  relatedFacts?: string[];
  contradictsFacts?: string[];
  supportsFacts?: string[];
  sensitivityLevel: 'Public' | 'Standard' | 'Sensitive' | 'Restricted' | 'Confidential';
  context: Record<string, any>;
}

export interface UniversalContext {
  id: string;
  chittyId: string;
  contextName: string;
  contextType: ContextType;
  contextSubtype?: string;
  description?: string;
  purpose?: string;
  scope?: string;
  objectives: string[];
  status: 'Planning' | 'Active' | 'Paused' | 'Completed' | 'Cancelled' | 'Archived';
  progress: number; // 0-100
  startDate?: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  ownerId?: string;
  participantIds: string[];
  relatedEntityIds: string[];
  informationItemIds: string[];
  factIds: string[];
  parentContextId?: string;
  subContextIds: string[];
  accessLevel: 'Standard' | 'Restricted' | 'Confidential';
  visibility: 'Public' | 'Restricted' | 'Private';
  tags: string[];
  created: Date;
  modified: Date;
}

export interface EntityRelationship {
  id: string;
  chittyId: string;
  relationshipName: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  relationshipSubtype?: string;
  direction: 'Unidirectional' | 'Bidirectional';
  strengthScore: number; // 0-1
  confidenceScore: number; // 0-1
  supportingInformationIds: string[];
  relationshipStart?: Date;
  relationshipEnd?: Date;
  isCurrent: boolean;
  context: Record<string, any>;
  created: Date;
  modified: Date;
}

export interface ConflictRecord {
  id: string;
  chittyId: string;
  conflictDescription: string;
  conflictType: ConflictType;
  conflictSeverity: 'Low' | 'Moderate' | 'High' | 'Critical';
  primaryFactId: string;
  conflictingFactId: string;
  conflictCategory?: string;
  conflictBasis?: string;
  resolutionMethod?: string;
  resolutionStatus: 'Unresolved' | 'Pending' | 'Resolved' | 'Permanent';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionRationale?: string;
  authoritativeFactId?: string;
  impactScore: number; // 0-1
  affectedEntityIds: string[];
  detectedAt: Date;
  detectedBy: 'System' | 'Human' | 'AI';
}

export interface ActivityRecord {
  id: string;
  chittyId: string;
  activity: string;
  activityType: ActivityType;
  activityCategory?: string;
  resourceType: string;
  resourceId: string;
  actorId?: string;
  actorType: ActorType;
  contextId?: string;
  statusCode?: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  sessionId?: string;
  ipAddress?: string;
  sourceSystem?: string;
  riskScore?: number;
  anomalyDetected: boolean;
}

export interface ActorRecord {
  id: string;
  chittyId: string;
  displayName: string;
  actorType: ActorType;
  actorSubtype?: string;
  identifier?: string;
  description?: string;
  contactInfo: Record<string, any>;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Deleted';
  accessLevel: 'Restricted' | 'Standard' | 'Elevated' | 'Administrative' | 'System';
  permissions: string[];
  securityClearance?: string;
  riskLevel: 'Standard' | 'Elevated' | 'High';
  authenticationMethods: string[];
  lastActive?: Date;
  created: Date;
  deactivatedAt?: Date;
}

// =============================================================================
// CONNECTOR CONFIGURATION
// =============================================================================

export interface NotionConnectorConfig {
  apiKey: string;
  workspaceId?: string;
  databaseIds: {
    entities: string;
    information: string;
    facts: string;
    contexts: string;
    relationships: string;
    conflicts: string;
    activities: string;
    actors: string;
  };
  syncOptions: {
    batchSize: number;
    retryAttempts: number;
    retryDelay: number;
    timeout: number;
  };
}

export interface DatabaseSetupOptions {
  createNew: boolean;
  overwriteExisting: boolean;
  setupRelationships: boolean;
  createSampleData: boolean;
  validateSchema: boolean;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface NotionQueryResponse<T> {
  results: T[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

export interface NotionSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    id: string;
    error: string;
    data?: any;
  }>;
  duration: number;
}

export interface ConnectorHealthCheck {
  connected: boolean;
  databasesAccessible: number;
  totalDatabases: number;
  lastSync?: Date;
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
  errors: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type NeutralCreateInput<T> = Omit<T, 'id' | 'chittyId' | 'created' | 'modified'>;
export type NeutralUpdateInput<T> = Partial<Omit<T, 'id' | 'chittyId' | 'created'>>;

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface FilterOptions {
  entityType?: EntityType | EntityType[];
  status?: string | string[];
  verificationStatus?: string | string[];
  sensitivityLevel?: string | string[];
  dateRange?: {
    start: Date;
    end: Date;
    field: string;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class NotionConnectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'NotionConnectorError';
  }
}

export class ChittyIdError extends Error {
  constructor(message: string, public namespace?: string, public identifier?: string) {
    super(message);
    this.name = 'ChittyIdError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}