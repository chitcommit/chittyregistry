/**
 * Notion Connector - Neutral Universal Framework
 *
 * Main connector interface for the ChittyChain Universal Data Framework
 * Provides domain-agnostic integration with Notion
 */

export { NeutralNotionConnector } from './neutral-connector';
export { NotionDatabaseSetup } from './database-setup';
export { NotionSyncService } from './sync-service';
export { NotionTestSuite } from './test-suite';

// Types and interfaces
export type {
  NeutralEntity,
  UniversalInformation,
  AtomicFact,
  UniversalContext,
  EntityRelationship,
  ConflictRecord,
  ActivityRecord,
  ActorRecord
} from './types';

// Configuration
export { NEUTRAL_DATABASE_CONFIG } from './config';

// Utilities
export {
  mapLegalToNeutral,
  mapNeutralToNotion,
  validateNeutralData
} from './utils';