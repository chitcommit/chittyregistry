/**
 * Neutral API Routes - Domain-agnostic endpoints
 * Provides universal access to the neutralized data framework
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';

const router = Router();

// =============================================================================
// NEUTRAL ENTITY ENDPOINTS
// =============================================================================

// Get entities by type (neutral endpoint)
router.get('/entities/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50, offset = 0, status = 'active' } = req.query;

    // Validate entity type
    const validTypes = ['PEO', 'PLACE', 'PROP', 'EVNT', 'AUTH'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid entity type',
        validTypes
      });
    }

    const result = await db.execute(sql`
      SELECT
        id,
        chitty_id,
        entity_type,
        entity_subtype,
        name,
        description,
        metadata,
        status,
        visibility,
        classification,
        context_tags,
        verification_status,
        created_at,
        updated_at
      FROM entities
      WHERE entity_type = ${type}
        AND status = ${status}
        AND valid_to = 'infinity'
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `);

    res.json({
      entities: result.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: result.rows.length
      }
    });
    return;

  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
    return;
  }
});

// Search entities (neutral)
router.get('/entities/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { types, limit = 20 } = req.query;

    let query = sql`
      SELECT
        id,
        chitty_id,
        entity_type,
        name,
        description,
        classification,
        verification_status,
        created_at
      FROM entities
      WHERE (
        name ILIKE ${`%${term}%`} OR
        description ILIKE ${`%${term}%`} OR
        chitty_id ILIKE ${`%${term}%`}
      ) AND status = 'active'
    `;

    if (types) {
      const typeArray = Array.isArray(types) ? types : [types];
      query = sql`${query} AND entity_type = ANY(${typeArray})`;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${Number(limit)}`;

    const result = await db.execute(query);

    res.json({
      entities: result.rows,
      searchTerm: term,
      resultCount: result.rows.length
    });
    return;

  } catch (error) {
    console.error('Error searching entities:', error);
    res.status(500).json({ error: 'Failed to search entities' });
    return;
  }
});

// Create entity (neutral)
router.post('/entities', async (req, res) => {
  try {
    const schema = z.object({
      entityType: z.enum(['PEO', 'PLACE', 'PROP', 'EVNT', 'AUTH']),
      entitySubtype: z.string().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      metadata: z.record(z.any()).default({}),
      classification: z.string().optional(),
      contextTags: z.array(z.string()).default([]),
      visibility: z.enum(['public', 'restricted', 'private']).default('public')
    });

    const data = schema.parse(req.body);

    // Generate ChittyID
    const chittyIdResponse = await fetch('https://id.chitty.cc/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: data.entityType,
        identifier: data.name
      })
    });

    if (!chittyIdResponse.ok) {
      throw new Error('Failed to generate ChittyID');
    }

    const { chittyId } = await chittyIdResponse.json();

    const result = await db.execute(sql`
      INSERT INTO entities (
        chitty_id, entity_type, entity_subtype, name, description,
        metadata, status, visibility, classification, context_tags,
        verification_status, access_level
      ) VALUES (
        ${chittyId}, ${data.entityType}, ${data.entitySubtype || null},
        ${data.name}, ${data.description || null}, ${JSON.stringify(data.metadata)},
        'active', ${data.visibility}, ${data.classification || null},
        ${data.contextTags}, 'unverified', 'standard'
      ) RETURNING *
    `);

    res.status(201).json({
      entity: result.rows[0],
      message: 'Entity created successfully'
    });
    return;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating entity:', error);
    res.status(500).json({ error: 'Failed to create entity' });
    return;
  }
});

// =============================================================================
// NEUTRAL INFORMATION ENDPOINTS
// =============================================================================

// Get information by tier
router.get('/information/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const { limit = 50, contentType } = req.query;

    const validTiers = [
      'PRIMARY_SOURCE', 'OFFICIAL_RECORD', 'INSTITUTIONAL',
      'THIRD_PARTY', 'DERIVED', 'REPORTED', 'UNVERIFIED'
    ];

    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        error: 'Invalid information tier',
        validTiers
      });
    }

    let query = sql`
      SELECT
        id,
        chitty_id,
        title,
        content_type,
        information_tier,
        authenticity_status,
        verification_status,
        content_size,
        created_at,
        content_date
      FROM information_items
      WHERE information_tier = ${tier}
    `;

    if (contentType) {
      query = sql`${query} AND content_type = ${contentType}`;
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${Number(limit)}`;

    const result = await db.execute(query);

    res.json({
      information: result.rows,
      tier,
      count: result.rows.length
    });
    return;

  } catch (error) {
    console.error('Error fetching information by tier:', error);
    res.status(500).json({ error: 'Failed to fetch information' });
    return;
  }
});

// Create information item (neutral)
router.post('/information', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      contentType: z.enum(['document', 'image', 'audio', 'video', 'data', 'communication', 'physical', 'other']),
      contentFormat: z.string().optional(),
      contentSummary: z.string().optional(),
      informationTier: z.enum(['PRIMARY_SOURCE', 'OFFICIAL_RECORD', 'INSTITUTIONAL', 'THIRD_PARTY', 'DERIVED', 'REPORTED', 'UNVERIFIED']),
      sourceEntityId: z.string().uuid().optional(),
      contentHash: z.string().optional(),
      contentSize: z.number().optional(),
      contentLocation: z.string().optional(),
      sensitivityLevel: z.enum(['public', 'standard', 'sensitive', 'restricted', 'confidential']).default('standard')
    });

    const data = schema.parse(req.body);

    // Generate ChittyID
    const chittyIdResponse = await fetch('https://id.chitty.cc/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: 'INFO',
        identifier: data.title
      })
    });

    if (!chittyIdResponse.ok) {
      throw new Error('Failed to generate ChittyID');
    }

    const { chittyId } = await chittyIdResponse.json();

    const result = await db.execute(sql`
      INSERT INTO information_items (
        chitty_id, title, content_type, content_format, content_summary,
        information_tier, authenticity_status, source_entity_id,
        content_hash, content_size, content_location, sensitivity_level,
        verification_status
      ) VALUES (
        ${chittyId}, ${data.title}, ${data.contentType},
        ${data.contentFormat || null}, ${data.contentSummary || null},
        ${data.informationTier}, 'unverified', ${data.sourceEntityId || null},
        ${data.contentHash || null}, ${data.contentSize || null},
        ${data.contentLocation || null}, ${data.sensitivityLevel}, 'pending'
      ) RETURNING *
    `);

    res.status(201).json({
      information: result.rows[0],
      message: 'Information item created successfully'
    });
    return;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating information:', error);
    res.status(500).json({ error: 'Failed to create information item' });
    return;
  }
});

// =============================================================================
// NEUTRAL FACT ENDPOINTS
// =============================================================================

// Get facts by classification
router.get('/facts/classification/:classification', async (req, res) => {
  try {
    const { classification } = req.params;
    const { limit = 50, minCertainty = 0, minConfidence = 0 } = req.query;

    const validClassifications = [
      'OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE',
      'DERIVED', 'OPINION', 'HYPOTHESIS'
    ];

    if (!validClassifications.includes(classification)) {
      return res.status(400).json({
        error: 'Invalid fact classification',
        validClassifications
      });
    }

    const result = await db.execute(sql`
      SELECT
        af.id,
        af.fact_statement,
        af.classification,
        af.certainty_level,
        af.confidence_score,
        af.recorded_at,
        ii.title as source_title,
        ii.information_tier as source_tier
      FROM atomic_facts af
      LEFT JOIN information_items ii ON af.source_information_id = ii.id
      WHERE af.classification = ${classification}
        AND af.certainty_level >= ${Number(minCertainty)}
        AND af.confidence_score >= ${Number(minConfidence)}
      ORDER BY af.certainty_level DESC, af.confidence_score DESC
      LIMIT ${Number(limit)}
    `);

    res.json({
      facts: result.rows,
      classification,
      count: result.rows.length,
      filters: {
        minCertainty: Number(minCertainty),
        minConfidence: Number(minConfidence)
      }
    });
    return;

  } catch (error) {
    console.error('Error fetching facts by classification:', error);
    res.status(500).json({ error: 'Failed to fetch facts' });
    return;
  }
});

// Create fact (neutral)
router.post('/facts', async (req, res) => {
  try {
    const schema = z.object({
      factStatement: z.string().min(1),
      factType: z.string().default('assertion'),
      classification: z.enum(['OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE', 'DERIVED', 'OPINION', 'HYPOTHESIS']),
      subjectEntityId: z.string().uuid().optional(),
      predicate: z.string().min(1),
      objectValue: z.string().optional(),
      objectEntityId: z.string().uuid().optional(),
      sourceInformationId: z.string().uuid(),
      certaintyLevel: z.number().min(0).max(1).default(0.5),
      confidenceScore: z.number().min(0).max(1).default(0.5),
      extractedBy: z.enum(['human', 'ai', 'system']).default('human'),
      extractionMethod: z.string().optional(),
      factTimestamp: z.string().datetime().optional(),
      sensitivityLevel: z.enum(['public', 'standard', 'sensitive', 'restricted', 'confidential']).default('standard')
    });

    const data = schema.parse(req.body);

    // Generate ChittyID
    const chittyIdResponse = await fetch('https://id.chitty.cc/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        namespace: 'FACT',
        identifier: data.factStatement.substring(0, 50)
      })
    });

    if (!chittyIdResponse.ok) {
      throw new Error('Failed to generate ChittyID');
    }

    const { chittyId } = await chittyIdResponse.json();

    const result = await db.execute(sql`
      INSERT INTO atomic_facts (
        chitty_id, fact_statement, fact_type, classification,
        subject_entity_id, predicate, object_value, object_entity_id,
        source_information_id, certainty_level, confidence_score,
        extracted_by, extraction_method, fact_timestamp, sensitivity_level
      ) VALUES (
        ${chittyId}, ${data.factStatement}, ${data.factType}, ${data.classification},
        ${data.subjectEntityId || null}, ${data.predicate}, ${data.objectValue || null},
        ${data.objectEntityId || null}, ${data.sourceInformationId},
        ${data.certaintyLevel}, ${data.confidenceScore}, ${data.extractedBy},
        ${data.extractionMethod || null}, ${data.factTimestamp || null},
        ${data.sensitivityLevel}
      ) RETURNING *
    `);

    res.status(201).json({
      fact: result.rows[0],
      message: 'Fact created successfully'
    });
    return;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fact:', error);
    res.status(500).json({ error: 'Failed to create fact' });
    return;
  }
});

// =============================================================================
// NEUTRAL ANALYTICS ENDPOINTS
// =============================================================================

// Get neutral analytics summary
router.get('/analytics/summary', async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        'entities' as category,
        COUNT(*) as total,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM entities
      UNION ALL
      SELECT
        'information' as category,
        COUNT(*) as total,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified,
        COUNT(CASE WHEN information_tier IN ('PRIMARY_SOURCE', 'OFFICIAL_RECORD') THEN 1 END) as high_tier
      FROM information_items
      UNION ALL
      SELECT
        'facts' as category,
        COUNT(*) as total,
        COUNT(CASE WHEN certainty_level >= 0.8 THEN 1 END) as high_certainty,
        COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence
      FROM atomic_facts
    `);

    res.json({
      summary: result.rows,
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
    return;
  }
});

// Get entity relationship graph (neutral)
router.get('/relationships/graph/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { depth = 1, minStrength = 0 } = req.query;

    const result = await db.execute(sql`
      SELECT
        er.id,
        er.source_entity_id,
        es.name as source_name,
        es.entity_type as source_type,
        er.target_entity_id,
        et.name as target_name,
        et.entity_type as target_type,
        er.relationship_type,
        er.strength_score,
        er.confidence_score
      FROM entity_relationships er
      JOIN entities es ON er.source_entity_id = es.id
      JOIN entities et ON er.target_entity_id = et.id
      WHERE (er.source_entity_id = ${entityId} OR er.target_entity_id = ${entityId})
        AND er.is_current = true
        AND er.strength_score >= ${Number(minStrength)}
      ORDER BY er.strength_score DESC
    `);

    res.json({
      entityId,
      relationships: result.rows,
      count: result.rows.length,
      filters: {
        depth: Number(depth),
        minStrength: Number(minStrength)
      }
    });
    return;

  } catch (error) {
    console.error('Error fetching relationship graph:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
    return;
  }
});

export default router;