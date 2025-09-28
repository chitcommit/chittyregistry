/**
 * Notion Connector Configuration - Neutral Universal Framework
 *
 * Configuration and constants for the ChittyChain Notion connector
 */

import { NotionConnectorConfig, DatabaseSetupOptions } from './types';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONNECTOR_CONFIG: Partial<NotionConnectorConfig> = {
  syncOptions: {
    batchSize: 50,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000
  }
};

export const DEFAULT_SETUP_OPTIONS: DatabaseSetupOptions = {
  createNew: true,
  overwriteExisting: false,
  setupRelationships: true,
  createSampleData: false,
  validateSchema: true
};

// =============================================================================
// NEUTRAL DATABASE CONFIGURATION
// =============================================================================

export const NEUTRAL_DATABASE_CONFIG = {
  entities: {
    name: 'Entities - Universal Objects',
    description: 'All entities across any domain - people, organizations, systems, objects',
    icon: '🌐',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Name': { type: 'title' },
      'Entity Type': {
        type: 'select',
        options: ['PEO', 'PLACE', 'PROP', 'EVNT', 'AUTH']
      },
      'Entity Subtype': { type: 'rich_text' },
      'Description': { type: 'rich_text' },
      'Status': {
        type: 'select',
        options: ['Active', 'Inactive', 'Archived', 'Deleted']
      },
      'Visibility': {
        type: 'select',
        options: ['Public', 'Restricted', 'Private']
      },
      'Classification': { type: 'rich_text' },
      'Context Tags': { type: 'multi_select' },
      'Verification Status': {
        type: 'select',
        options: ['Unverified', 'Pending', 'Verified', 'Disputed', 'Rejected']
      },
      'Access Level': {
        type: 'select',
        options: ['Standard', 'Elevated', 'Restricted']
      },
      'Created': { type: 'created_time' },
      'Modified': { type: 'last_edited_time' },
      'Created By': { type: 'created_by' },
      'Metadata': { type: 'rich_text' }
    }
  },

  information: {
    name: 'Information Items - Universal Repository',
    description: 'All information items regardless of type or domain',
    icon: '📁',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Title': { type: 'title' },
      'Content Type': {
        type: 'select',
        options: ['Document', 'Image', 'Audio', 'Video', 'Data', 'Communication', 'Physical', 'Other']
      },
      'Content Format': { type: 'rich_text' },
      'Content Summary': { type: 'rich_text' },
      'Information Tier': {
        type: 'select',
        options: ['PRIMARY_SOURCE', 'OFFICIAL_RECORD', 'INSTITUTIONAL', 'THIRD_PARTY', 'DERIVED', 'REPORTED', 'UNVERIFIED']
      },
      'Authenticity Status': {
        type: 'select',
        options: ['Authentic', 'Unverified', 'Disputed', 'Fabricated']
      },
      'Source Entity': { type: 'relation', relation_database: 'entities' },
      'Content Hash': { type: 'rich_text' },
      'Content Size': { type: 'number' },
      'Content Location': { type: 'url' },
      'Sensitivity Level': {
        type: 'select',
        options: ['Public', 'Standard', 'Sensitive', 'Restricted', 'Confidential']
      },
      'Verification Status': {
        type: 'select',
        options: ['Pending', 'Verified', 'Disputed', 'Rejected']
      },
      'Tags': { type: 'multi_select' },
      'Created': { type: 'created_time' },
      'Modified': { type: 'last_edited_time' },
      'Content Date': { type: 'date' },
      'Received Date': { type: 'date' }
    }
  },

  facts: {
    name: 'Atomic Facts - Universal Knowledge',
    description: 'Atomic units of knowledge extracted from information',
    icon: '💡',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Fact Statement': { type: 'title' },
      'Fact Type': { type: 'rich_text' },
      'Classification': {
        type: 'select',
        options: ['OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE', 'DERIVED', 'OPINION', 'HYPOTHESIS']
      },
      'Subject Entity': { type: 'relation', relation_database: 'entities' },
      'Predicate': { type: 'rich_text' },
      'Object Value': { type: 'rich_text' },
      'Object Entity': { type: 'relation', relation_database: 'entities' },
      'Source Information': { type: 'relation', relation_database: 'information' },
      'Certainty Level': { type: 'number', format: 'percent' },
      'Confidence Score': { type: 'number', format: 'percent' },
      'Weight': { type: 'number', format: 'percent' },
      'Extracted By': {
        type: 'select',
        options: ['Human', 'AI', 'System']
      },
      'Extraction Method': { type: 'rich_text' },
      'Extraction Confidence': { type: 'number', format: 'percent' },
      'Fact Timestamp': { type: 'date' },
      'Observed At': { type: 'date' },
      'Recorded At': { type: 'created_time' },
      'Verification Status': {
        type: 'select',
        options: ['Pending', 'Verified', 'Disputed', 'Rejected']
      },
      'Related Facts': { type: 'relation', relation_database: 'facts' },
      'Contradicts': { type: 'relation', relation_database: 'facts' },
      'Supports': { type: 'relation', relation_database: 'facts' },
      'Sensitivity Level': {
        type: 'select',
        options: ['Public', 'Standard', 'Sensitive', 'Restricted', 'Confidential']
      },
      'Context': { type: 'rich_text' }
    }
  },

  contexts: {
    name: 'Contexts - Universal Projects',
    description: 'Organize work into contexts/projects/investigations',
    icon: '📂',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Context Name': { type: 'title' },
      'Context Type': {
        type: 'select',
        options: ['PROJECT', 'INVESTIGATION', 'ANALYSIS', 'RESEARCH', 'MONITORING', 'ARCHIVE']
      },
      'Context Subtype': { type: 'rich_text' },
      'Description': { type: 'rich_text' },
      'Purpose': { type: 'rich_text' },
      'Scope': { type: 'rich_text' },
      'Objectives': { type: 'multi_select' },
      'Status': {
        type: 'select',
        options: ['Planning', 'Active', 'Paused', 'Completed', 'Cancelled', 'Archived']
      },
      'Progress': { type: 'number', format: 'percent' },
      'Start Date': { type: 'date' },
      'Target End Date': { type: 'date' },
      'Actual End Date': { type: 'date' },
      'Owner': { type: 'people' },
      'Participants': { type: 'people' },
      'Related Entities': { type: 'relation', relation_database: 'entities' },
      'Information Items': { type: 'relation', relation_database: 'information' },
      'Facts': { type: 'relation', relation_database: 'facts' },
      'Parent Context': { type: 'relation', relation_database: 'contexts' },
      'Sub-Contexts': { type: 'relation', relation_database: 'contexts' },
      'Access Level': {
        type: 'select',
        options: ['Standard', 'Restricted', 'Confidential']
      },
      'Visibility': {
        type: 'select',
        options: ['Public', 'Restricted', 'Private']
      },
      'Tags': { type: 'multi_select' },
      'Created': { type: 'created_time' },
      'Modified': { type: 'last_edited_time' }
    }
  },

  relationships: {
    name: 'Relationships - Universal Connections',
    description: 'Track relationships between any entities',
    icon: '🔗',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Relationship Name': { type: 'title' },
      'Source Entity': { type: 'relation', relation_database: 'entities' },
      'Target Entity': { type: 'relation', relation_database: 'entities' },
      'Relationship Type': {
        type: 'select',
        options: ['ASSOCIATION', 'CONTAINMENT', 'SEQUENCE', 'DERIVATION', 'SIMILARITY', 'OPPOSITION', 'DEPENDENCY', 'TRANSFORMATION']
      },
      'Relationship Subtype': { type: 'rich_text' },
      'Direction': {
        type: 'select',
        options: ['Unidirectional', 'Bidirectional']
      },
      'Strength Score': { type: 'number', format: 'percent' },
      'Confidence Score': { type: 'number', format: 'percent' },
      'Supporting Information': { type: 'relation', relation_database: 'information' },
      'Relationship Start': { type: 'date' },
      'Relationship End': { type: 'date' },
      'Is Current': { type: 'checkbox' },
      'Context': { type: 'rich_text' },
      'Created': { type: 'created_time' },
      'Modified': { type: 'last_edited_time' }
    }
  },

  conflicts: {
    name: 'Conflicts - Contradiction Tracking',
    description: 'Track conflicts between facts or information',
    icon: '⚠️',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Conflict Description': { type: 'title' },
      'Conflict Type': {
        type: 'select',
        options: ['DIRECT', 'TEMPORAL', 'LOGICAL', 'SOURCE', 'MEASUREMENT', 'INTERPRETATION']
      },
      'Conflict Severity': {
        type: 'select',
        options: ['Low', 'Moderate', 'High', 'Critical']
      },
      'Primary Fact': { type: 'relation', relation_database: 'facts' },
      'Conflicting Fact': { type: 'relation', relation_database: 'facts' },
      'Conflict Category': { type: 'rich_text' },
      'Conflict Basis': { type: 'rich_text' },
      'Resolution Method': { type: 'rich_text' },
      'Resolution Status': {
        type: 'select',
        options: ['Unresolved', 'Pending', 'Resolved', 'Permanent']
      },
      'Resolved At': { type: 'date' },
      'Resolved By': { type: 'people' },
      'Resolution Rationale': { type: 'rich_text' },
      'Authoritative Fact': { type: 'relation', relation_database: 'facts' },
      'Impact Score': { type: 'number', format: 'percent' },
      'Affected Entities': { type: 'relation', relation_database: 'entities' },
      'Detected At': { type: 'created_time' },
      'Detected By': {
        type: 'select',
        options: ['System', 'Human', 'AI']
      }
    }
  },

  activities: {
    name: 'Activities - Universal Audit Trail',
    description: 'Track all system activities and changes',
    icon: '📝',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Activity': { type: 'title' },
      'Activity Type': {
        type: 'select',
        options: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'AUTHENTICATE', 'AUTHORIZE']
      },
      'Activity Category': { type: 'rich_text' },
      'Resource Type': { type: 'rich_text' },
      'Resource ID': { type: 'rich_text' },
      'Actor': { type: 'relation', relation_database: 'actors' },
      'Actor Type': {
        type: 'select',
        options: ['HUMAN', 'SYSTEM', 'ORGANIZATION', 'AI', 'BOT', 'SERVICE']
      },
      'Context': { type: 'relation', relation_database: 'contexts' },
      'Status Code': { type: 'number' },
      'Started At': { type: 'created_time' },
      'Completed At': { type: 'date' },
      'Duration (ms)': { type: 'number' },
      'Session ID': { type: 'rich_text' },
      'IP Address': { type: 'rich_text' },
      'Source System': { type: 'rich_text' },
      'Risk Score': { type: 'number', format: 'percent' },
      'Anomaly Detected': { type: 'checkbox' }
    }
  },

  actors: {
    name: 'Actors - Universal User Registry',
    description: 'Track all actors in the system',
    icon: '👤',
    properties: {
      'ChittyID': { type: 'rich_text' },
      'Display Name': { type: 'title' },
      'Actor Type': {
        type: 'select',
        options: ['HUMAN', 'SYSTEM', 'ORGANIZATION', 'AI', 'BOT', 'SERVICE']
      },
      'Actor Subtype': { type: 'rich_text' },
      'Identifier': { type: 'rich_text' },
      'Description': { type: 'rich_text' },
      'Contact Info': { type: 'rich_text' },
      'Status': {
        type: 'select',
        options: ['Active', 'Inactive', 'Suspended', 'Deleted']
      },
      'Access Level': {
        type: 'select',
        options: ['Restricted', 'Standard', 'Elevated', 'Administrative', 'System']
      },
      'Permissions': { type: 'multi_select' },
      'Security Clearance': { type: 'rich_text' },
      'Risk Level': {
        type: 'select',
        options: ['Standard', 'Elevated', 'High']
      },
      'Authentication Methods': { type: 'multi_select' },
      'Last Active': { type: 'date' },
      'Created': { type: 'created_time' },
      'Deactivated At': { type: 'date' }
    }
  }
};

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

export const ENVIRONMENT_VARIABLES = {
  NOTION_API_KEY: 'NOTION_API_KEY',
  NOTION_WORKSPACE_ID: 'NOTION_WORKSPACE_ID',
  NOTION_DATABASE_ENTITIES: 'NOTION_DATABASE_ENTITIES',
  NOTION_DATABASE_INFORMATION: 'NOTION_DATABASE_INFORMATION',
  NOTION_DATABASE_FACTS: 'NOTION_DATABASE_FACTS',
  NOTION_DATABASE_CONTEXTS: 'NOTION_DATABASE_CONTEXTS',
  NOTION_DATABASE_RELATIONSHIPS: 'NOTION_DATABASE_RELATIONSHIPS',
  NOTION_DATABASE_CONFLICTS: 'NOTION_DATABASE_CONFLICTS',
  NOTION_DATABASE_ACTIVITIES: 'NOTION_DATABASE_ACTIVITIES',
  NOTION_DATABASE_ACTORS: 'NOTION_DATABASE_ACTORS'
};

// =============================================================================
// VALIDATION RULES
// =============================================================================

export const VALIDATION_RULES = {
  chittyId: {
    pattern: /^[A-Z0-9-]+$/,
    minLength: 10,
    maxLength: 50
  },
  name: {
    minLength: 1,
    maxLength: 255
  },
  description: {
    maxLength: 2000
  },
  confidenceScore: {
    min: 0,
    max: 1
  },
  certaintyLevel: {
    min: 0,
    max: 1
  },
  weight: {
    min: 0,
    max: 1
  },
  riskScore: {
    min: 0,
    max: 1
  }
};

// =============================================================================
// API LIMITS AND CONSTRAINTS
// =============================================================================

export const API_LIMITS = {
  NOTION_RATE_LIMIT: 3, // requests per second
  MAX_BATCH_SIZE: 100,
  MAX_QUERY_SIZE: 100,
  DEFAULT_PAGE_SIZE: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getNotionConnectorConfig(): NotionConnectorConfig {
  const requiredEnvVars = [
    'NOTION_API_KEY',
    'NOTION_DATABASE_ENTITIES',
    'NOTION_DATABASE_INFORMATION',
    'NOTION_DATABASE_FACTS',
    'NOTION_DATABASE_CONTEXTS',
    'NOTION_DATABASE_RELATIONSHIPS',
    'NOTION_DATABASE_CONFLICTS',
    'NOTION_DATABASE_ACTIVITIES',
    'NOTION_DATABASE_ACTORS'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    apiKey: process.env.NOTION_API_KEY!,
    workspaceId: process.env.NOTION_WORKSPACE_ID,
    databaseIds: {
      entities: process.env.NOTION_DATABASE_ENTITIES!,
      information: process.env.NOTION_DATABASE_INFORMATION!,
      facts: process.env.NOTION_DATABASE_FACTS!,
      contexts: process.env.NOTION_DATABASE_CONTEXTS!,
      relationships: process.env.NOTION_DATABASE_RELATIONSHIPS!,
      conflicts: process.env.NOTION_DATABASE_CONFLICTS!,
      activities: process.env.NOTION_DATABASE_ACTIVITIES!,
      actors: process.env.NOTION_DATABASE_ACTORS!
    },
    syncOptions: DEFAULT_CONNECTOR_CONFIG.syncOptions!
  };
}

export function validateDatabaseId(databaseId: string): boolean {
  // Notion database IDs are 32 character UUIDs without dashes
  const pattern = /^[a-f0-9]{32}$/i;
  return pattern.test(databaseId.replace(/-/g, ''));
}

export function formatChittyId(namespace: string, identifier: string): string {
  // Basic format validation for ChittyID
  const cleanNamespace = namespace.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `CHITTY-${cleanNamespace}-${cleanIdentifier}`;
}