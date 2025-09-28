import { Router } from 'express';
import { z } from 'zod';
import { db, tables } from '../lib/db';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * Atomic fact submission schema
 */
const CreateFactSchema = z.object({
  caseId: z.string().uuid(),
  evidenceId: z.string().uuid().optional(),
  assertedBy: z.string().uuid().optional(),
  text: z.string().min(1).max(5000),
  extractedFrom: z.string().optional(),
  tags: z.array(z.string()).optional(),
  factType: z.enum([
    'STATUS', 'ACTION', 'RELATIONSHIP',
    'TEMPORAL', 'FINANCIAL', 'LOCATION'
  ]).optional(),
  locationInDocument: z.string().optional(),
  classificationLevel: z.enum([
    'FACT', 'CLAIM', 'SPECULATION', 'OPINION'
  ]).optional(),
  weight: z.number().min(0).max(1).optional(),
  credibilityFactors: z.array(z.string()).optional()
});

/**
 * POST /facts
 * Create a new atomic fact
 */
router.post('/', async (req, res) => {
  try {
    const parsed = CreateFactSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const data = parsed.data;
    const id = crypto.randomUUID();

    // Generate official ChittyID for the fact
    const chittyResponse = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=D&trust=3&identifier=${data.caseId}:${data.text}`);
    const chittyData = await chittyResponse.json();
    const factChittyId = chittyData.chittyId;

    // Create the fact
    const fact = {
      id,
      caseId: data.caseId,
      evidenceId: data.evidenceId || null,
      assertedBy: data.assertedBy || null,
      text: data.text,
      extractedFrom: data.extractedFrom || null,
      tags: data.tags || null,
      factType: data.factType || null,
      locationInDocument: data.locationInDocument || null,
      classificationLevel: data.classificationLevel || 'FACT',
      weight: data.weight?.toString() || null,
      credibilityFactors: data.credibilityFactors || null,
      timestampedAt: new Date(),
      verified: false,
      verifiedBy: null,
      verifiedAt: null,
      chittychainStatus: 'Pending',
      verificationMethod: null
    };

    await db.insert(tables.atomicFacts).values(fact);

    // Log to audit trail
    await db.insert(tables.auditLog).values({
      id: crypto.randomUUID(),
      userId: data.assertedBy || null,
      caseId: data.caseId,
      entity: 'fact',
      entityId: id,
      action: 'CREATE',
      ipAddress: req.ip || null,
      sessionId: null,
      success: true,
      metadata: {
        chittyId: factChittyId,
        factType: data.factType,
        classificationLevel: data.classificationLevel
      }
    });

    res.status(201).json({
      id,
      chittyId: factChittyId,
      message: 'Fact created successfully'
    });
    return;
  } catch (error) {
    console.error('Error creating fact:', error);
    res.status(500).json({
      error: 'Failed to create fact',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /facts/:id
 * Get a specific fact by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [fact] = await db
      .select()
      .from(tables.atomicFacts)
      .where(eq(tables.atomicFacts.id, id));

    if (!fact) {
      return res.status(404).json({
        error: 'Fact not found'
      });
    }

    // Tags and credibilityFactors are already arrays in PostgreSQL
    res.json(fact);
    return;
  } catch (error) {
    console.error('Error fetching fact:', error);
    res.status(500).json({
      error: 'Failed to fetch fact',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /facts/case/:caseId
 * Get all facts for a case
 */
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { verified, factType, classificationLevel } = req.query;

    // Build query
    let query = db.select().from(tables.atomicFacts);
    const conditions = [eq(tables.atomicFacts.caseId, caseId)];

    if (verified !== undefined) {
      conditions.push(eq(tables.atomicFacts.verified, verified === 'true'));
    }

    if (factType) {
      conditions.push(eq(tables.atomicFacts.factType, factType as string));
    }

    if (classificationLevel) {
      conditions.push(eq(tables.atomicFacts.classificationLevel, classificationLevel as string));
    }

    const facts = await query.where(and(...conditions));

    // Tags and credibilityFactors are already arrays in PostgreSQL
    res.json({
      count: facts.length,
      facts: facts
    });
    return;
  } catch (error) {
    console.error('Error fetching case facts:', error);
    res.status(500).json({
      error: 'Failed to fetch case facts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /facts/:id/verify
 * Verify an atomic fact
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy, verificationMethod } = req.body;

    await db
      .update(tables.atomicFacts)
      .set({
        verified: true,
        verifiedBy,
        verifiedAt: new Date(),
        chittychainStatus: 'Minted',
        verificationMethod: verificationMethod || 'Manual Review'
      })
      .where(eq(tables.atomicFacts.id, id));

    // Log to audit trail
    await db.insert(tables.auditLog).values({
      id: crypto.randomUUID(),
      userId: verifiedBy || null,
      caseId: null,
      entity: 'fact',
      entityId: id,
      action: 'VERIFY',
      ipAddress: req.ip || null,
      sessionId: null,
      success: true,
      metadata: {
        verificationMethod: verificationMethod || 'Manual Review'
      }
    });

    res.json({
      message: 'Fact verified successfully',
      factId: id
    });
    return;
  } catch (error) {
    console.error('Error verifying fact:', error);
    res.status(500).json({
      error: 'Failed to verify fact',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /facts/contradictions
 * Detect contradictions between facts
 */
const ContradictionSchema = z.object({
  caseId: z.string().uuid(),
  factAId: z.string().uuid(),
  factBId: z.string().uuid(),
  conflictType: z.enum(['DIRECT', 'TEMPORAL', 'LOGICAL', 'PARTIAL']),
  impactOnCase: z.string().optional(),
  detectedBy: z.string().uuid().optional()
});

router.post('/contradictions', async (req, res) => {
  try {
    const parsed = ContradictionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const data = parsed.data;
    const id = crypto.randomUUID();

    await db.insert(tables.contradictions).values({
      id,
      caseId: data.caseId,
      factAId: data.factAId,
      factBId: data.factBId,
      conflictType: data.conflictType,
      resolutionMethod: null,
      winningFact: null,
      impactOnCase: data.impactOnCase || null,
      detectedBy: data.detectedBy || null,
      detectedAt: new Date(),
      resolution: null,
      resolvedBy: null,
      resolvedAt: null
    });

    res.status(201).json({
      id,
      message: 'Contradiction recorded successfully'
    });
    return;
  } catch (error) {
    console.error('Error recording contradiction:', error);
    res.status(500).json({
      error: 'Failed to record contradiction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export default router;