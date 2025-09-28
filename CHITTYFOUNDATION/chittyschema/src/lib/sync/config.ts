/**
 * Project Sync Configuration
 * Manages synchronization settings and state for ChittySchema projects
 */

export interface SyncConfig {
  enabled: boolean;
  syncInterval: number; // milliseconds
  endpoints: {
    registry: string;
    schema: string;
    chain: string;
  };
  sessionId: string;
  projectId: string;
  authentication?: {
    type: 'oauth' | 'api_key' | 'jwt';
    token?: string;
    refreshToken?: string;
  };
}

export interface SyncStatus {
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'error' | 'paused';
  error?: string;
  conflicts: number;
  pendingChanges: number;
}

export interface ProjectState {
  sessionId: string;
  projectId: string;
  schema: {
    version: string;
    lastModified: Date;
    checksum: string;
  };
  database: {
    url: string;
    lastBackup: Date | null;
  };
  services: {
    registry: boolean;
    propagation: boolean;
    api: boolean;
  };
}

export const defaultSyncConfig: Partial<SyncConfig> = {
  enabled: true,
  syncInterval: 30000, // 30 seconds
  endpoints: {
    registry: process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc',
    schema: process.env.CHITTY_SCHEMA_URL || 'https://schema.chitty.cc',
    chain: process.env.CHITTY_CHAIN_URL || 'https://chain.chitty.cc'
  }
};

export function createSyncConfig(sessionId: string, projectId: string): SyncConfig {
  return {
    ...defaultSyncConfig,
    sessionId,
    projectId,
    enabled: true,
    syncInterval: 30000,
    endpoints: defaultSyncConfig.endpoints!
  };
}