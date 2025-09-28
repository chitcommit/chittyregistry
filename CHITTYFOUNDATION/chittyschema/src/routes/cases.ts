import { Router } from 'express';
import { z } from 'zod';
import { db, tables, queries } from '../lib/db';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Case creation schema
 */
const CreateCaseSchema = z.object({
  docketNumber: z.string().min(1),
  jurisdiction: z.string().optional(),
  title: z.string().min(1),
  status: z.enum(['open', 'closed', 'appealed', 'stayed']).optional(),
  createdBy: z.string().uuid().optional(),
  filingDate: z.string().optional(),
  judgeAssigned: z.string().optional()
});

/**
 * POST /cases
 * Create a new case
 */
router.post('/', async (req, res) => {
  try {
    const parsed = CreateCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const data = parsed.data;
    const id = crypto.randomUUID();

    // Generate official ChittyID for the case
    const chittyResponse = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=D&trust=3&identifier=${data.docketNumber}`);
    const chittyData = await chittyResponse.json();
    const caseChittyId = chittyData.chittyId;

    await db.insert(tables.cases).values({
      docketNumber: data.docketNumber,
      jurisdiction: data.jurisdiction || null,
      title: data.title,
      status: data.status || 'open',
      createdBy: data.createdBy || null,
      filingDate: data.filingDate || null,
      judgeAssigned: data.judgeAssigned || null
    });

    // Log to audit trail
    await db.insert(tables.auditLog).values({
      id: crypto.randomUUID(),
      userId: data.createdBy || null,
      caseId: id,
      entity: 'case',
      entityId: id,
      action: 'CREATE',
      ipAddress: req.ip || null,
      sessionId: null,
      success: true,
      metadata: {
        chittyId: caseChittyId,
        docketNumber: data.docketNumber
      }
    });

    res.status(201).json({
      id,
      chittyId: caseChittyId,
      docketNumber: data.docketNumber,
      message: 'Case created successfully'
    });
    return;
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({
      error: 'Failed to create case',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /cases/:id
 * Get case details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [caseData] = await db
      .select()
      .from(tables.cases)
      .where(eq(tables.cases.id, id));

    if (!caseData) {
      return res.status(404).json({
        error: 'Case not found'
      });
    }

    res.json(caseData);
    return;
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      error: 'Failed to fetch case',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /cases/:id/summary
 * Get comprehensive case summary with counts
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await queries.getCaseSummary(id);

    if (!summary.case) {
      return res.status(404).json({
        error: 'Case not found'
      });
    }

    res.json(summary);
    return;
  } catch (error) {
    console.error('Error fetching case summary:', error);
    res.status(500).json({
      error: 'Failed to fetch case summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /cases/:id/contradictions
 * Get all contradictions for a case
 */
router.get('/:id/contradictions', async (req, res) => {
  try {
    const { id } = req.params;
    const contradictions = await queries.getContradictions(id);

    res.json({
      count: contradictions.length,
      contradictions
    });
    return;
  } catch (error) {
    console.error('Error fetching contradictions:', error);
    res.status(500).json({
      error: 'Failed to fetch contradictions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * PATCH /cases/:id
 * Update case details
 */
const UpdateCaseSchema = z.object({
  jurisdiction: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['open', 'closed', 'appealed', 'stayed']).optional(),
  judgeAssigned: z.string().optional()
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = UpdateCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const updates = {
      ...parsed.data,
      updatedAt: new Date()
    };

    await db
      .update(tables.cases)
      .set(updates)
      .where(eq(tables.cases.id, id));

    // Log to audit trail
    await db.insert(tables.auditLog).values({
      id: crypto.randomUUID(),
      userId: null,
      caseId: id,
      entity: 'case',
      entityId: id,
      action: 'UPDATE',
      ipAddress: req.ip || null,
      sessionId: null,
      success: true,
      metadata: updates
    });

    res.json({
      message: 'Case updated successfully',
      caseId: id
    });
    return;
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      error: 'Failed to update case',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * GET /cases
 * List all cases with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, jurisdiction, limit = '50', offset = '0' } = req.query;

    let query = db.select().from(tables.cases);

    if (status) {
      query = query.where(eq(tables.cases.status, status as string));
    }

    if (jurisdiction) {
      query = query.where(eq(tables.cases.jurisdiction, jurisdiction as string));
    }

    const cases = await query
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      count: cases.length,
      cases
    });
    return;
  } catch (error) {
    console.error('Error listing cases:', error);
    res.status(500).json({
      error: 'Failed to list cases',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export default router;