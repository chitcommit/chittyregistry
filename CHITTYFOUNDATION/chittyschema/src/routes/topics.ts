/**
 * Topic Routes
 * Extract, sync, and manage topics from evidence and facts
 */

import { Router } from 'express';
import { z } from 'zod';
import { db, tables } from '../lib/db';
import { topicSync, TopicExtraction, Topic, TopicCluster } from '../lib/topic-sync-client';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /topics/extract/evidence/:evidenceId
 * Extract topics from specific evidence
 */
router.post('/extract/evidence/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;

    // Verify evidence exists
    const [evidence] = await db
      .select()
      .from(tables.masterEvidence)
      .where(eq(tables.masterEvidence.id, evidenceId));

    if (!evidence) {
      return res.status(404).json({
        error: 'Evidence not found'
      });
    }

    // Extract topics
    const extraction = await topicSync.extractTopicsFromEvidence(evidenceId);

    // Sync to case
    await topicSync.syncTopicsToCase(evidence.caseId!, extraction);

    res.json({
      evidenceId,
      caseId: evidence.caseId,
      extraction: {
        topics: extraction.topics.length,
        relationships: extraction.relationships.length,
        clusters: extraction.clusters.length
      },
      topicsByCategory: extraction.topics.reduce((acc, topic) => {
        acc[topic.category] = (acc[topic.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topTopics: extraction.topics
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5)
        .map(t => ({
          name: t.name,
          category: t.category,
          relevanceScore: t.relevanceScore,
          chittyId: t.chittyId
        })),
      message: 'Topics extracted successfully'
    });
    return;

  } catch (error) {
    console.error('Topic extraction failed:', error);
    res.status(500).json({
      error: 'Topic extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /topics/extract/facts
 * Extract topics from atomic facts
 */
const ExtractFactTopicsSchema = z.object({
  caseId: z.string().uuid(),
  factIds: z.array(z.string().uuid()).optional(),
  since: z.string().datetime().optional()
});

router.post('/extract/facts', async (req, res) => {
  try {
    const parsed = ExtractFactTopicsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { caseId, factIds, since: _since } = parsed.data;

    // Verify case exists
    const [caseRecord] = await db
      .select()
      .from(tables.cases)
      .where(eq(tables.cases.id, caseId));

    if (!caseRecord) {
      return res.status(404).json({
        error: 'Case not found'
      });
    }

    // Extract topics from facts
    const extraction = await topicSync.extractTopicsFromFacts(caseId, factIds);

    // Sync to case
    await topicSync.syncTopicsToCase(caseId, extraction);

    res.json({
      caseId,
      factIds: factIds || 'all',
      extraction: {
        topics: extraction.topics.length,
        relationships: extraction.relationships.length,
        clusters: extraction.clusters.length
      },
      topicsByCategory: extraction.topics.reduce((acc, topic) => {
        acc[topic.category] = (acc[topic.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      clusters: extraction.clusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        topicCount: cluster.topicIds.length,
        coherenceScore: cluster.coherenceScore
      })),
      message: 'Topics extracted from facts successfully'
    });
    return;

  } catch (error) {
    console.error('Fact topic extraction failed:', error);
    res.status(500).json({
      error: 'Fact topic extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /topics/extract/case/:caseId/bulk
 * Extract topics from entire case (all evidence and facts)
 */
router.post('/extract/case/:caseId/bulk', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Verify case exists
    const [caseRecord] = await db
      .select()
      .from(tables.cases)
      .where(eq(tables.cases.id, caseId));

    if (!caseRecord) {
      return res.status(404).json({
        error: 'Case not found'
      });
    }

    // Get all evidence for the case
    const evidence = await db
      .select()
      .from(tables.masterEvidence)
      .where(eq(tables.masterEvidence.caseId, caseId));

    // Extract topics from all evidence
    const allExtractions: TopicExtraction[] = [];

    for (const evidenceItem of evidence) {
      if (evidenceItem.content && evidenceItem.content.trim().length > 0) {
        try {
          const extraction = await topicSync.extractTopicsFromEvidence(evidenceItem.id);
          allExtractions.push(extraction);
        } catch (error) {
          console.warn(`Failed to extract topics from evidence ${evidenceItem.id}:`, error);
        }
      }
    }

    // Extract topics from facts
    const factExtraction = await topicSync.extractTopicsFromFacts(caseId);
    allExtractions.push(factExtraction);

    // Merge all extractions
    const mergedExtraction = mergeExtractions(allExtractions);

    // Sync to case
    await topicSync.syncTopicsToCase(caseId, mergedExtraction);

    res.json({
      caseId,
      evidenceProcessed: evidence.length,
      extraction: {
        topics: mergedExtraction.topics.length,
        relationships: mergedExtraction.relationships.length,
        clusters: mergedExtraction.clusters.length
      },
      topicsByCategory: mergedExtraction.topics.reduce((acc, topic) => {
        acc[topic.category] = (acc[topic.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topClusters: mergedExtraction.clusters
        .sort((a, b) => b.coherenceScore - a.coherenceScore)
        .slice(0, 3)
        .map(cluster => ({
          name: cluster.name,
          topicCount: cluster.topicIds.length,
          coherenceScore: cluster.coherenceScore
        })),
      message: 'Bulk topic extraction completed successfully'
    });
    return;

  } catch (error) {
    console.error('Bulk topic extraction failed:', error);
    res.status(500).json({
      error: 'Bulk topic extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /topics/case/:caseId
 * Get all topics for a case
 */
const TopicsQuerySchema = z.object({
  category: z.string().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  limit: z.number().min(1).max(100).default(50)
});

router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const parsed = TopicsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.issues
      });
    }

    const { category, minRelevance, limit: _limit } = parsed.data;

    // For now, return a synthetic response since we don't have a topics table yet
    // In production, this would query a dedicated topics table

    res.json({
      caseId,
      filters: { category, minRelevance },
      topics: [],
      summary: {
        totalTopics: 0,
        categories: {},
        avgRelevance: 0
      },
      message: 'Topic storage table not yet implemented - topics are currently stored in case metadata'
    });
    return;

  } catch (error) {
    console.error('Failed to fetch case topics:', error);
    res.status(500).json({
      error: 'Failed to fetch case topics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /topics/relationships/:caseId
 * Get topic relationships for a case
 */
router.get('/relationships/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Placeholder for topic relationships
    res.json({
      caseId,
      relationships: [],
      summary: {
        totalRelationships: 0,
        relationshipTypes: {},
        strongestConnections: []
      },
      message: 'Topic relationships storage not yet implemented'
    });
    return;

  } catch (error) {
    console.error('Failed to fetch topic relationships:', error);
    res.status(500).json({
      error: 'Failed to fetch topic relationships',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /topics/clusters/:caseId
 * Get topic clusters for a case
 */
router.get('/clusters/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;

    res.json({
      caseId,
      clusters: [],
      summary: {
        totalClusters: 0,
        avgCoherence: 0,
        largestCluster: null
      },
      message: 'Topic clusters storage not yet implemented'
    });
    return;

  } catch (error) {
    console.error('Failed to fetch topic clusters:', error);
    res.status(500).json({
      error: 'Failed to fetch topic clusters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /topics/health
 * Topic sync health check
 */
router.get('/health', async (_req, res) => {
  try {
    const metrics = topicSync.getMetrics();

    res.json({
      status: 'healthy',
      metrics,
      capabilities: {
        evidenceTopicExtraction: true,
        factTopicExtraction: true,
        bulkExtraction: true,
        topicRelationships: true,
        topicClusters: true,
        chittyIdIntegration: true
      },
      message: 'Topic sync system operational'
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

/**
 * POST /topics/sync/reset
 * Reset topic sync metrics
 */
router.post('/sync/reset', (_req, res) => {
  topicSync.resetMetrics();

  res.json({
    message: 'Topic sync metrics reset successfully',
    metrics: topicSync.getMetrics()
  });
  return;
});

/**
 * Helper function to merge multiple topic extractions
 */
function mergeExtractions(extractions: TopicExtraction[]): TopicExtraction {
  const allTopics: Topic[] = [];
  const allRelationships = [];
  const allClusters: TopicCluster[] = [];

  for (const extraction of extractions) {
    allTopics.push(...extraction.topics);
    allRelationships.push(...extraction.relationships);
    allClusters.push(...extraction.clusters);
  }

  // Deduplicate topics by name and category
  const uniqueTopics = new Map<string, Topic>();

  for (const topic of allTopics) {
    const key = `${topic.category}:${topic.name.toLowerCase()}`;
    const existing = uniqueTopics.get(key);

    if (existing) {
      // Merge topics
      existing.extractedFrom = [...new Set([...existing.extractedFrom, ...topic.extractedFrom])];
      existing.keywords = [...new Set([...existing.keywords, ...topic.keywords])];
      existing.relevanceScore = Math.max(existing.relevanceScore, topic.relevanceScore);
      existing.updatedAt = new Date();
    } else {
      uniqueTopics.set(key, topic);
    }
  }

  return {
    topics: Array.from(uniqueTopics.values()),
    relationships: allRelationships,
    clusters: allClusters
  };
}

export default router;