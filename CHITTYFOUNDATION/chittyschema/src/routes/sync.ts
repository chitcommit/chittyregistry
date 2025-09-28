/**
 * Enhanced Sync Routes with MCP Integration
 * Session-aware synchronization with real-time updates + ChittySync MCP
 */

import { Router } from 'express';
import { z } from 'zod';
import { db, tables } from '../lib/db';
import { notionSync, AtomicFactPayload } from '../lib/notion-sync-client';
import { eq, gte, and, or, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { ChittySyncClient, createSyncClient } from '../mcp/sync-client.js';
import syncApiRouter from '../api/sync.js';

const router = Router();

// Session tracking
interface SyncSession {
  sessionId: string;
  startedAt: Date;
  lastSyncAt: Date;
  factsProcessed: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  cursor?: string;
  errors: Array<{ factId: string; error: string; timestamp: Date }>;
  metrics: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

// Active sessions map
const activeSessions = new Map<string, SyncSession>();

// Sync queue for background processing
const syncQueue: AtomicFactPayload[] = [];
let isProcessing = false;

// MCP Sync Client
let mcpSyncClient: ChittySyncClient;

const initializeMCPSync = async () => {
  if (!mcpSyncClient) {
    mcpSyncClient = await createSyncClient({
      mcpEndpoint: process.env.CHITTY_SYNC_MCP_ENDPOINT || 'http://localhost:8787',
      authentication: {
        type: 'api_key',
        credentials: {
          apiKey: process.env.CHITTY_SYNC_API_KEY
        }
      }
    });
  }
  return mcpSyncClient;
};

/**
 * Transform database fact to Notion payload
 */
function transformFactToPayload(fact: any): AtomicFactPayload {
  // Parse credibility factors - handle both string and array formats
  let credibilityFactors: string[] = [];
  if (fact.credibilityFactors) {
    if (typeof fact.credibilityFactors === 'string') {
      try {
        credibilityFactors = JSON.parse(fact.credibilityFactors);
      } catch {
        credibilityFactors = fact.credibilityFactors.split(',').map((s: string) => s.trim());
      }
    } else if (Array.isArray(fact.credibilityFactors)) {
      credibilityFactors = fact.credibilityFactors;
    }
  }

  // Parse tags if needed
  let tags: string[] = [];
  if (fact.tags) {
    if (typeof fact.tags === 'string') {
      try {
        tags = JSON.parse(fact.tags);
      } catch {
        tags = fact.tags.split(',').map((s: string) => s.trim());
      }
    } else if (Array.isArray(fact.tags)) {
      tags = fact.tags;
    }
  }

  // Normalize fact type
  const factTypeMap: Record<string, AtomicFactPayload['factType']> = {
    'DATE': 'DATE',
    'AMOUNT': 'AMOUNT',
    'ADMISSION': 'ADMISSION',
    'IDENTITY': 'IDENTITY',
    'LOCATION': 'LOCATION',
    'RELATIONSHIP': 'RELATIONSHIP',
    'ACTION': 'ACTION',
    'STATUS': 'STATUS'
  };

  // Normalize classification
  const classificationMap: Record<string, AtomicFactPayload['classification']> = {
    'FACT': 'FACT',
    'SUPPORTED_CLAIM': 'SUPPORTED_CLAIM',
    'ASSERTION': 'ASSERTION',
    'ALLEGATION': 'ALLEGATION',
    'CONTRADICTION': 'CONTRADICTION'
  };

  // Normalize chain status
  const chainStatusMap: Record<string, AtomicFactPayload['chainStatus']> = {
    'Minted': 'Minted',
    'Pending': 'Pending',
    'Rejected': 'Rejected'
  };

  return {
    factId: fact.id,
    parentArtifactId: fact.evidenceId || 'UNKNOWN',
    factText: fact.text || '',
    factType: factTypeMap[fact.factType] || 'ACTION',
    locationRef: fact.locationInDocument || undefined,
    classification: classificationMap[fact.classificationLevel] || 'ASSERTION',
    weight: parseFloat(fact.weight) || 0.5,
    credibility: [...credibilityFactors, ...tags].filter(Boolean),
    chainStatus: chainStatusMap[fact.chittychainStatus] || 'Pending',
    verifiedAt: fact.verifiedAt ? new Date(fact.verifiedAt) : undefined,
    verificationMethod: fact.verificationMethod || undefined
  };
}

/**
 * POST /sync/session/start
 * Start a new sync session
 */
const StartSessionSchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).optional(),
  continuous: z.boolean().optional()
});

router.post('/session/start', async (req, res) => {
  try {
    const parsed = StartSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { since, limit = 100, continuous = false } = parsed.data;
    const sessionId = crypto.randomUUID();

    // Create session
    const session: SyncSession = {
      sessionId,
      startedAt: new Date(),
      lastSyncAt: new Date(),
      factsProcessed: 0,
      status: 'active',
      errors: [],
      metrics: {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      }
    };

    activeSessions.set(sessionId, session);

    // Start initial sync
    const facts = await fetchFactsForSync(since, limit, session.cursor);

    if (facts.length > 0) {
      // Add to queue for background processing
      const payloads = facts.map(transformFactToPayload);
      syncQueue.push(...payloads);

      // Start background processing if not already running
      if (!isProcessing) {
        processQueueBackground(sessionId);
      }
    }

    res.json({
      sessionId,
      status: 'started',
      continuous,
      factsQueued: facts.length,
      message: 'Sync session started successfully'
    });
    return;

  } catch (error) {
    console.error('Failed to start sync session:', error);
    res.status(500).json({
      error: 'Failed to start sync session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /sync/session/:sessionId/status
 * Get session status and metrics
 */
router.get('/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'Session not found'
    });
  }

  // Get current Notion sync metrics
  const notionMetrics = notionSync.getMetrics();
  const dlqContents = notionSync.getDLQ();

  res.json({
    sessionId,
    status: session.status,
    startedAt: session.startedAt,
    lastSyncAt: session.lastSyncAt,
    factsProcessed: session.factsProcessed,
    metrics: session.metrics,
    notionMetrics,
    dlq: {
      depth: dlqContents.length,
      items: dlqContents.slice(0, 5) // First 5 items
    },
    recentErrors: session.errors.slice(-5), // Last 5 errors
    queueDepth: syncQueue.length
  });
  return;
});

/**
 * POST /sync/session/:sessionId/pause
 * Pause a sync session
 */
router.post('/session/:sessionId/pause', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'paused';
  res.json({
    sessionId,
    status: 'paused',
    message: 'Sync session paused'
  });
  return;
});

/**
 * POST /sync/session/:sessionId/resume
 * Resume a paused session
 */
router.post('/session/:sessionId/resume', async (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'active';

  // Resume processing if queue has items
  if (syncQueue.length > 0 && !isProcessing) {
    processQueueBackground(sessionId);
  }

  res.json({
    sessionId,
    status: 'resumed',
    queueDepth: syncQueue.length,
    message: 'Sync session resumed'
  });
  return;
});

/**
 * POST /sync/notion/facts
 * Direct sync endpoint (fallback)
 */
const DirectSyncSchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(10),
  factIds: z.array(z.string().uuid()).optional()
});

router.post('/notion/facts', async (req, res) => {
  try {
    const parsed = DirectSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { since, limit, factIds } = parsed.data;

    // Fetch facts to sync
    let facts;
    if (factIds && factIds.length > 0) {
      // Sync specific facts
      facts = await db
        .select()
        .from(tables.atomicFacts)
        .where(
          or(...factIds.map(id => eq(tables.atomicFacts.id, id)))
        );
    } else {
      // Sync by time range
      facts = await fetchFactsForSync(since, limit);
    }

    if (facts.length === 0) {
      return res.json({
        message: 'No facts to sync',
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      });
    }

    // Transform and sync
    const payloads = facts.map(transformFactToPayload);
    const results = await notionSync.syncBatch(payloads);

    res.json({
      ...results,
      message: `Synced ${facts.length} facts to Notion`
    });
    return;

  } catch (error) {
    console.error('Direct sync failed:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /sync/notion/dlq
 * Get DLQ contents
 */
router.get('/notion/dlq', (_req, res) => {
  const dlq = notionSync.getDLQ();
  const metrics = notionSync.getMetrics();

  res.json({
    depth: dlq.length,
    items: dlq,
    metrics,
    message: `${dlq.length} items in DLQ`
  });
  return;
});

/**
 * POST /sync/notion/dlq/process
 * Process DLQ items
 */
router.post('/notion/dlq/process', async (_req, res) => {
  try {
    await notionSync.processDLQ();
    const dlq = notionSync.getDLQ();

    res.json({
      remaining: dlq.length,
      message: 'DLQ processing initiated'
    });
    return;
  } catch (error) {
    console.error('DLQ processing failed:', error);
    res.status(500).json({
      error: 'DLQ processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * DELETE /sync/notion/dlq
 * Clear DLQ
 */
router.delete('/notion/dlq', (_req, res) => {
  notionSync.clearDLQ();
  res.json({
    message: 'DLQ cleared successfully'
  });
  return;
});

/**
 * GET /sync/health
 * Health check with Notion and MCP connectivity
 */
router.get('/health', async (_req, res) => {
  try {
    const isConnected = await notionSync.verifyDatabase();
    const metrics = notionSync.getMetrics();
    const dlq = notionSync.getDLQ();

    // Check MCP connection
    let mcpStatus = 'disconnected';
    let mcpCurrentProject = null;
    try {
      const mcp = await initializeMCPSync();
      mcpCurrentProject = mcp.getCurrentProject();
      mcpStatus = 'connected';
    } catch (error) {
      mcpStatus = 'error';
    }

    res.json({
      status: isConnected ? 'healthy' : 'degraded',
      notion: {
        connected: isConnected,
        metrics,
        dlq_depth: dlq.length
      },
      mcp: {
        status: mcpStatus,
        currentProject: mcpCurrentProject
      },
      sessions: {
        active: Array.from(activeSessions.values()).filter(s => s.status === 'active').length,
        total: activeSessions.size
      },
      queue: {
        depth: syncQueue.length,
        processing: isProcessing
      }
    });
    return;
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

// =====================================================
// MCP ENHANCED SYNC ENDPOINTS
// =====================================================

/**
 * POST /sync/mcp/project/create
 * Create MCP sync project with context tracking
 */
const MCPProjectSchema = z.object({
  name: z.string(),
  caseId: z.string().optional(),
  participants: z.array(z.string()).default([])
});

router.post('/mcp/project/create', async (req, res) => {
  try {
    const parsed = MCPProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error });
    }

    const mcp = await initializeMCPSync();
    const projectId = await mcp.createProject(
      parsed.data.name,
      parsed.data.caseId,
      parsed.data.participants
    );

    res.json({
      status: 'success',
      projectId,
      message: 'MCP sync project created successfully'
    });
    return;

  } catch (error) {
    console.error('Error creating MCP project:', error);
    res.status(500).json({
      error: 'Failed to create MCP project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /sync/mcp/project/:projectId/activate
 * Set active MCP project for context capture
 */
router.post('/mcp/project/:projectId/activate', async (req, res) => {
  try {
    const { projectId } = req.params;
    const mcp = await initializeMCPSync();

    await mcp.setActiveProject(projectId);

    res.json({
      status: 'success',
      activeProject: projectId,
      message: 'MCP project activated successfully'
    });
    return;

  } catch (error) {
    console.error('Error activating MCP project:', error);
    res.status(500).json({
      error: 'Failed to activate MCP project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /sync/session/:sessionId/capture-context
 * Enhanced session with MCP context capture
 */
router.post('/session/:sessionId/capture-context', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const mcp = await initializeMCPSync();

    // Capture session context in MCP
    const contextResult = await mcp.captureAnalysisContext({
      sessionId,
      sessionMetrics: session.metrics,
      factsProcessed: session.factsProcessed,
      status: session.status,
      timestamp: new Date().toISOString()
    }, 'medium');

    res.json({
      status: 'success',
      sessionId,
      contextCapture: contextResult,
      message: 'Session context captured in MCP'
    });
    return;

  } catch (error) {
    console.error('Error capturing session context:', error);
    res.status(500).json({
      error: 'Failed to capture session context',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /sync/facts/:factId/capture-evidence
 * Capture fact as evidence context in MCP
 */
router.post('/facts/:factId/capture-evidence', async (req, res) => {
  try {
    const { factId } = req.params;
    const { priority = 'medium' } = req.body;

    // Get fact from database
    const [fact] = await db
      .select()
      .from(tables.atomicFacts)
      .where(eq(tables.atomicFacts.id, factId));

    if (!fact) {
      return res.status(404).json({ error: 'Fact not found' });
    }

    const mcp = await initializeMCPSync();

    // Capture as evidence context
    const contextResult = await mcp.captureEvidenceContext(
      {
        factId: fact.id,
        text: fact.text,
        factType: fact.factType,
        weight: fact.weight,
        classification: fact.classificationLevel
      },
      priority,
      [fact.id].filter(Boolean)
    );

    res.json({
      status: 'success',
      factId,
      contextCapture: contextResult,
      message: 'Fact captured as evidence context in MCP'
    });
    return;

  } catch (error) {
    console.error('Error capturing fact context:', error);
    res.status(500).json({
      error: 'Failed to capture fact context',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /sync/mcp/context/top
 * Get top contexts from MCP for current project
 */
router.get('/mcp/context/top', async (req, res) => {
  try {
    const {
      limit = '10',
      contextType
    } = req.query;

    const mcp = await initializeMCPSync();
    const result = await mcp.getTopContexts(
      parseInt(limit as string),
      contextType as string
    );

    res.json({
      status: 'success',
      topContexts: result
    });
    return;

  } catch (error) {
    console.error('Error getting top contexts:', error);
    res.status(500).json({
      error: 'Failed to get top contexts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /sync/mcp/context/contradictions
 * Get contradiction contexts from MCP
 */
router.get('/mcp/context/contradictions', async (req, res) => {
  try {
    const { limit = '5' } = req.query;

    const mcp = await initializeMCPSync();
    const result = await mcp.getTopContradictions(parseInt(limit as string));

    res.json({
      status: 'success',
      contradictionContexts: result
    });
    return;

  } catch (error) {
    console.error('Error getting contradiction contexts:', error);
    res.status(500).json({
      error: 'Failed to get contradiction contexts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /sync/mcp/analysis/relevance
 * Analyze context relevance for current project
 */
router.post('/mcp/analysis/relevance', async (req, res) => {
  try {
    const { contextIds } = req.body;

    const mcp = await initializeMCPSync();
    const result = await mcp.analyzeProjectRelevance(contextIds);

    res.json({
      status: 'success',
      relevanceAnalysis: result
    });
    return;

  } catch (error) {
    console.error('Error analyzing relevance:', error);
    res.status(500).json({
      error: 'Failed to analyze relevance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * Helper: Fetch facts for sync
 */
async function fetchFactsForSync(since?: string, limit = 100, _cursor?: string) {
  const conditions = [];

  // Only sync unsynced facts or recently updated
  if (since) {
    conditions.push(gte(tables.atomicFacts.timestampedAt, new Date(since)));
  }

  // Skip already verified facts unless recently updated
  conditions.push(
    or(
      isNull(tables.atomicFacts.verifiedAt),
      gte(tables.atomicFacts.timestampedAt, new Date(Date.now() - 3600000)) // Last hour
    )
  );

  const query = db
    .select()
    .from(tables.atomicFacts)
    .limit(limit);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query;
}

/**
 * Background queue processor
 */
async function processQueueBackground(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session || session.status !== 'active') {
    isProcessing = false;
    return;
  }

  isProcessing = true;

  while (syncQueue.length > 0 && session.status === 'active') {
    const batch = syncQueue.splice(0, 10); // Process in batches of 10

    try {
      const results = await notionSync.syncBatch(batch);

      // Update session metrics
      session.metrics.created += results.created;
      session.metrics.updated += results.updated;
      session.metrics.skipped += results.skipped;
      session.factsProcessed += batch.length;
      session.lastSyncAt = new Date();

      // Log errors
      for (const error of results.errors) {
        session.errors.push({
          factId: error.factId,
          error: error.error,
          timestamp: new Date()
        });
        session.metrics.failed++;
      }

      // Keep only last 100 errors
      if (session.errors.length > 100) {
        session.errors = session.errors.slice(-100);
      }

    } catch (error) {
      console.error('Batch processing failed:', error);
      session.status = 'failed';
      break;
    }

    // Rate limit between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Mark session as completed if queue is empty
  if (syncQueue.length === 0 && session) {
    session.status = 'completed';
  }

  isProcessing = false;
}

// =====================================================
// PROJECT SYNC API INTEGRATION
// =====================================================

// Mount the project sync API under /project namespace
router.use('/project', syncApiRouter);

export default router;