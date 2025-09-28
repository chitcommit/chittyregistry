/**
 * ChittyOS Mac Native - Notion Extension Types
 *
 * Type definitions for Mac native Notion extension with pipeline integration
 */

// =============================================================================
// SESSION CONTEXT TYPES
// =============================================================================

export interface SessionContext {
  sessionId: string;
  correlationId: string;
  projectId?: string;
  userId?: string;
  token: string;
  trustLevel: 'standard' | 'elevated' | 'restricted';
  authorization: {
    permissions: string[];
    scopes: string[];
    expiresAt: Date;
  };
  metadata: Record<string, any>;
}

export interface ExtensionConfig {
  apiKey: string;
  workspaceId?: string;
  chittyIdPipelineUrl: string;
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
  services: Record<string, string>;
  rateLimit: {
    requests: number;
    per: number;
  };
  sync: {
    enabled: boolean;
    intervalMs: number;
    batchSize: number;
  };
}

// =============================================================================
// CORE ENTITY TYPES (Universal Framework)
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

// =============================================================================
// SYNC AND PIPELINE TYPES
// =============================================================================

export interface SyncStats {
  totalRecords: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  conflicts: number;
  duration: number;
  startTime: Date;
  endTime: Date;
}

export interface VectorClock extends Map<string, number> {}

export interface PipelineRequest {
  namespace: string;
  identifier: string;
  sessionId: string;
  projectId?: string;
  trustLevel: string;
  authorization: {
    permissions: string[];
    scopes: string[];
  };
  metadata?: Record<string, any>;
}

export interface PipelineResponse {
  chittyId: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  pipeline: {
    router: { status: string; duration: number };
    intake: { status: string; duration: number };
    trust: { status: string; duration: number; level: string };
    authorization: { status: string; duration: number; permissions: string[] };
    generation: { status: string; duration: number };
  };
  metadata: Record<string, any>;
}

export interface SyncOperation {
  type: 'entity' | 'information' | 'fact' | 'context';
  action: 'create' | 'update' | 'delete';
  data: any;
  sessionId: string;
  correlationId: string;
  vectorClock: VectorClock;
  timestamp: Date;
  retry: {
    attempt: number;
    maxAttempts: number;
    lastError?: string;
  };
}

export interface ConflictRecord {
  id: string;
  type: string;
  candidates: Array<{
    source: string;
    data: any;
    timestamp: Date;
    vectorClock: VectorClock;
  }>;
  status: 'pending' | 'resolved' | 'manual';
  resolution?: {
    strategy: 'last-write-wins' | 'merge' | 'manual';
    winner: any;
    resolvedAt: Date;
    resolvedBy: string;
  };
}

// =============================================================================
// MAC NATIVE TYPES
// =============================================================================

export interface MacOSIntegration {
  bundleId: string;
  appName: string;
  version: string;
  sandboxed: boolean;
  entitlements: string[];
  preferences: {
    domain: string;
    keys: Record<string, any>;
  };
  notifications: {
    enabled: boolean;
    categories: string[];
  };
  shortcuts: {
    enabled: boolean;
    intents: string[];
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  category: string;
  userInfo: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface ShortcutIntent {
  name: string;
  description: string;
  parameters: Record<string, any>;
  suggestedPhrase: string;
}

// =============================================================================
// EXTENSION LIFECYCLE TYPES
// =============================================================================

export interface ExtensionState {
  status: 'initializing' | 'active' | 'syncing' | 'error' | 'shutdown';
  lastSync?: Date;
  sessionContext?: SessionContext;
  metrics: {
    operations: number;
    errors: number;
    syncConflicts: number;
    uptime: number;
  };
  health: {
    connector: boolean;
    sync: boolean;
    pipeline: boolean;
    services: Record<string, boolean>;
  };
}

export interface ExtensionEvent {
  type: 'initialized' | 'sync_started' | 'sync_completed' | 'error' | 'shutdown';
  timestamp: Date;
  sessionId: string;
  correlationId?: string;
  data?: any;
  error?: string;
}

export interface ExtensionMetrics {
  operations: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
  };
  reliability: {
    uptime: number;
    errorRate: number;
    circuitBreakerStatus: string;
  };
  sync: {
    lastSync: Date;
    syncFrequency: number;
    conflictRate: number;
    backlogSize: number;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionId?: string,
    public correlationId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public sessionId: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    public operation: SyncOperation,
    public details?: any
  ) {
    super(message);
    this.name = 'SyncError';
  }
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