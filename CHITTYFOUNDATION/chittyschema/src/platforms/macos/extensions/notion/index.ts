/**
 * ChittyOS Mac Native - Notion Extension Entry Point
 *
 * Main export for Mac native Notion extension with pipeline integration
 */

export { NotionExtension } from './extension.js';
export { NotionConnector } from './connector.js';
export { NotionSync } from './sync.js';

// Types
export type {
  SessionContext,
  ExtensionConfig,
  NeutralEntity,
  UniversalInformation,
  AtomicFact,
  SyncStats,
  ExtensionState,
  ExtensionMetrics,
  MacOSIntegration,
  NotificationPayload,
  ShortcutIntent
} from './types.js';

// Errors
export {
  ExtensionError,
  PipelineError,
  SyncError
} from './types.js';

// Default configuration for Mac native app
export const DEFAULT_MAC_CONFIG: Partial<ExtensionConfig> = {
  rateLimit: {
    requests: 3,
    per: 1000
  },
  sync: {
    enabled: true,
    intervalMs: 30000,
    batchSize: 50
  }
};

/**
 * Factory function to create Notion extension for Mac native app
 */
export function createNotionExtension(config: ExtensionConfig): NotionExtension {
  const mergedConfig = {
    ...DEFAULT_MAC_CONFIG,
    ...config
  } as ExtensionConfig;

  return new NotionExtension(mergedConfig);
}

/**
 * Utility to validate Mac native environment
 */
export function validateMacEnvironment(): boolean {
  // Check if running on macOS
  if (process.platform !== 'darwin') {
    console.warn('⚠️  Notion extension optimized for macOS');
    return false;
  }

  // Check for required environment variables
  const requiredVars = [
    'NOTION_API_KEY',
    'CHITTY_PIPELINE_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }

  console.log('✅ Mac native environment validated');
  return true;
}

/**
 * Create extension with environment validation
 */
export function createValidatedExtension(): NotionExtension | null {
  if (!validateMacEnvironment()) {
    return null;
  }

  const config: ExtensionConfig = {
    apiKey: process.env.NOTION_API_KEY!,
    chittyIdPipelineUrl: process.env.CHITTY_PIPELINE_URL!,
    workspaceId: process.env.NOTION_WORKSPACE_ID,
    databaseIds: {
      entities: process.env.NOTION_DATABASE_ENTITIES || '',
      information: process.env.NOTION_DATABASE_INFORMATION || '',
      facts: process.env.NOTION_DATABASE_FACTS || '',
      contexts: process.env.NOTION_DATABASE_CONTEXTS || '',
      relationships: process.env.NOTION_DATABASE_RELATIONSHIPS || '',
      conflicts: process.env.NOTION_DATABASE_CONFLICTS || '',
      activities: process.env.NOTION_DATABASE_ACTIVITIES || '',
      actors: process.env.NOTION_DATABASE_ACTORS || ''
    },
    services: {
      'chitty-id-service': process.env.CHITTY_ID_SERVICE_URL || '',
      'chitty-trust-service': process.env.CHITTY_TRUST_SERVICE_URL || '',
      'chitty-auth-service': process.env.CHITTY_AUTH_SERVICE_URL || '',
      'chitty-data-service': process.env.CHITTY_DATA_SERVICE_URL || ''
    },
    rateLimit: {
      requests: parseInt(process.env.NOTION_RATE_LIMIT_REQUESTS || '3'),
      per: parseInt(process.env.NOTION_RATE_LIMIT_PER || '1000')
    },
    sync: {
      enabled: process.env.NOTION_SYNC_ENABLED !== 'false',
      intervalMs: parseInt(process.env.NOTION_SYNC_INTERVAL || '30000'),
      batchSize: parseInt(process.env.NOTION_SYNC_BATCH_SIZE || '50')
    }
  };

  return createNotionExtension(config);
}