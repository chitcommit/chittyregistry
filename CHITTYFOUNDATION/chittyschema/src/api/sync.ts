/**
 * Project Sync API Endpoints
 * RESTful endpoints for managing project synchronization
 */

import { Router } from 'express';
import { z } from 'zod';
import { SyncConfig, SyncStatus, ProjectState, createSyncConfig } from '../lib/sync/config.js';
import { chittyId } from '../lib/chittyid.js';

const router = Router();

// In-memory sync state (would be Redis/database in production)
const syncStates = new Map<string, { config: SyncConfig; status: SyncStatus; state: ProjectState }>();

// Validation schemas
const SyncConfigSchema = z.object({
  enabled: z.boolean(),
  syncInterval: z.number().min(5000).max(300000),
  endpoints: z.object({
    registry: z.string().url(),
    schema: z.string().url(),
    chain: z.string().url()
  }),
  sessionId: z.string(),
  projectId: z.string()
});

const ProjectStateSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  schema: z.object({
    version: z.string(),
    lastModified: z.string().transform(str => new Date(str)),
    checksum: z.string()
  }),
  database: z.object({
    url: z.string(),
    lastBackup: z.string().nullable().transform(str => str ? new Date(str) : null)
  }),
  services: z.object({
    registry: z.boolean(),
    propagation: z.boolean(),
    api: z.boolean()
  })
});

/**
 * GET /api/v1/sync/status/:sessionId
 * Get sync status for a session
 */
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const syncData = syncStates.get(sessionId);
  if (!syncData) {
    return res.status(404).json({
      error: 'Session not found',
      sessionId
    });
  }

  res.json({
    sessionId,
    status: syncData.status,
    config: syncData.config,
    lastSync: syncData.status.lastSync?.toISOString() || null
  });
  return;
});

/**
 * POST /api/v1/sync/initialize
 * Initialize sync for a new session
 */
router.post('/initialize', (req, res) => {
  try {
    const { sessionId, projectName = 'chittyschema' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const projectId = chittyId('CASE', `${projectName}-${sessionId.slice(0, 8)}`);
    const config = createSyncConfig(sessionId, projectId);

    const status: SyncStatus = {
      lastSync: null,
      status: 'idle',
      conflicts: 0,
      pendingChanges: 0
    };

    const state: ProjectState = {
      sessionId,
      projectId,
      schema: {
        version: '1.0.0',
        lastModified: new Date(),
        checksum: 'pending'
      },
      database: {
        url: process.env.DATABASE_URL || '',
        lastBackup: null
      },
      services: {
        registry: true,
        propagation: true,
        api: true
      }
    };

    syncStates.set(sessionId, { config, status, state });

    res.json({
      message: 'Sync initialized successfully',
      sessionId,
      projectId,
      config
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * PUT /api/v1/sync/config/:sessionId
 * Update sync configuration
 */
router.put('/config/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const configData = SyncConfigSchema.parse(req.body);

    const syncData = syncStates.get(sessionId);
    if (!syncData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    syncData.config = { ...syncData.config, ...configData };
    syncStates.set(sessionId, syncData);

    res.json({
      message: 'Sync configuration updated',
      config: syncData.config
    });
    return;
  } catch (error) {
    res.status(400).json({
      error: 'Invalid configuration',
      details: error instanceof Error ? error.message : 'Validation failed'
    });
    return;
  }
});

/**
 * POST /api/v1/sync/trigger/:sessionId
 * Manually trigger sync
 */
router.post('/trigger/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const syncData = syncStates.get(sessionId);
    if (!syncData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (syncData.status.status === 'syncing') {
      return res.status(409).json({ error: 'Sync already in progress' });
    }

    // Update status to syncing
    syncData.status.status = 'syncing';
    syncData.status.error = undefined;
    syncStates.set(sessionId, syncData);

    // Simulate sync process
    setTimeout(() => {
      const updatedData = syncStates.get(sessionId);
      if (updatedData) {
        updatedData.status = {
          lastSync: new Date(),
          status: 'idle',
          conflicts: 0,
          pendingChanges: 0
        };
        syncStates.set(sessionId, updatedData);
      }
    }, 2000);

    res.json({
      message: 'Sync triggered successfully',
      sessionId,
      status: 'syncing'
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /api/v1/sync/state/:sessionId
 * Get project state
 */
router.get('/state/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const syncData = syncStates.get(sessionId);
  if (!syncData) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    state: syncData.state,
    lastUpdated: new Date().toISOString()
  });
  return;
});

/**
 * PUT /api/v1/sync/state/:sessionId
 * Update project state
 */
router.put('/state/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const stateData = ProjectStateSchema.parse(req.body);

    const syncData = syncStates.get(sessionId);
    if (!syncData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    syncData.state = { ...syncData.state, ...stateData };
    syncData.status.pendingChanges += 1;
    syncStates.set(sessionId, syncData);

    res.json({
      message: 'Project state updated',
      state: syncData.state
    });
    return;
  } catch (error) {
    res.status(400).json({
      error: 'Invalid state data',
      details: error instanceof Error ? error.message : 'Validation failed'
    });
    return;
  }
});

/**
 * DELETE /api/v1/sync/:sessionId
 * Clean up sync data for session
 */
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const existed = syncStates.delete(sessionId);

  res.json({
    message: existed ? 'Sync data cleaned up' : 'Session not found',
    sessionId,
    existed
  });
  return;
});

export default router;