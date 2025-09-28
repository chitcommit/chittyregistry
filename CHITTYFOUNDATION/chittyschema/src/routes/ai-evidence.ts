import { Router } from 'express';
import { z } from 'zod';
import { db, tables } from '../lib/db';
import { chittyRouter } from '../lib/chittyrouter-client';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /ai-evidence/analyze
 * AI-powered evidence analysis with automatic fact extraction
 */
const AnalyzeEvidenceSchema = z.object({
  evidenceId: z.string().uuid(),
  extractFacts: z.boolean().default(true),
  detectContradictions: z.boolean().default(true),
  buildTimeline: z.boolean().default(true)
});

router.post('/analyze', async (req, res) => {
  try {
    const parsed = AnalyzeEvidenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { evidenceId, extractFacts, detectContradictions, buildTimeline } = parsed.data;

    // Get evidence from database
    const [evidence] = await db
      .select()
      .from(tables.masterEvidence)
      .where(eq(tables.masterEvidence.id, evidenceId));

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Analyze with ChittyRouter AI Gateway
    const analysis = await chittyRouter.analyzeDocument({
      documentType: 'evidence',
      content: evidence.content || '',
      caseId: evidence.caseId!,
      chittyId: evidence.auditNotes?.match(/ChittyID: ([^;]+)/)?.[1] || '',
      metadata: {
        evidenceId,
        type: evidence.type,
        tier: evidence.tier,
        source: evidence.source
      }
    });

    let extractedFactsCount = 0;
    let contradictionsCount = 0;

    // Extract and store facts if requested
    if (extractFacts && analysis.extractedFacts.length > 0) {
      for (const fact of analysis.extractedFacts) {
        const factId = crypto.randomUUID();

        // Generate ChittyID for the fact
        const chittyResponse = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=D&trust=3&identifier=${factId}:${fact.text}`);
        const _chittyData = await chittyResponse.json();

        await db.insert(tables.atomicFacts).values({
          id: factId,
          evidenceId,
          caseId: evidence.caseId!,
          assertedBy: null, // AI-extracted
          text: fact.text,
          extractedFrom: 'ChittyRouter AI Analysis',
          tags: fact.credibilityFactors,
          factType: fact.factType,
          locationInDocument: null,
          classificationLevel: fact.classificationLevel,
          weight: fact.confidence.toString(),
          credibilityFactors: fact.credibilityFactors,
          timestampedAt: new Date(),
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
          chittychainStatus: 'Pending',
          verificationMethod: 'AI_EXTRACTED'
        });

        extractedFactsCount++;
      }
    }

    // Detect and store contradictions if requested
    if (detectContradictions && analysis.contradictions.length > 0) {
      for (const contradiction of analysis.contradictions) {
        // Find the conflicting facts in our database
        const factA = await db
          .select()
          .from(tables.atomicFacts)
          .where(eq(tables.atomicFacts.text, contradiction.factA))
          .limit(1);

        const factB = await db
          .select()
          .from(tables.atomicFacts)
          .where(eq(tables.atomicFacts.text, contradiction.factB))
          .limit(1);

        if (factA.length > 0 && factB.length > 0) {
          await db.insert(tables.contradictions).values({
            id: crypto.randomUUID(),
            caseId: evidence.caseId!,
            factAId: factA[0].id,
            factBId: factB[0].id,
            conflictType: contradiction.conflictType,
            resolutionMethod: contradiction.resolution,
            winningFact: null,
            impactOnCase: 'AI_DETECTED_CONTRADICTION',
            detectedBy: null, // AI-detected
            detectedAt: new Date(),
            resolution: contradiction.resolution,
            resolvedBy: null,
            resolvedAt: null
          });

          contradictionsCount++;
        }
      }
    }

    // Update evidence with AI analysis results
    await db
      .update(tables.masterEvidence)
      .set({
        auditNotes: `${evidence.auditNotes || ''}\n\nAI Analysis Complete:\n- Facts extracted: ${extractedFactsCount}\n- Contradictions detected: ${contradictionsCount}\n- Risk score: ${analysis.riskAssessment.score}\n- Analysis ID: ${analysis.analysisId}`
      })
      .where(eq(tables.masterEvidence.id, evidenceId));

    res.json({
      analysisId: analysis.analysisId,
      evidenceId,
      extractedFacts: extractedFactsCount,
      contradictions: contradictionsCount,
      timeline: buildTimeline ? analysis.timeline : [],
      riskAssessment: analysis.riskAssessment,
      compliance: analysis.compliance,
      message: 'AI analysis completed successfully'
    });
    return;

  } catch (error) {
    console.error('AI evidence analysis error:', error);
    res.status(500).json({
      error: 'AI analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /ai-evidence/process-deposition
 * Process deposition audio with AI transcription and analysis
 */
const ProcessDepositionSchema = z.object({
  caseId: z.string().uuid(),
  audioUrl: z.string().url(),
  deponentName: z.string(),
  date: z.string()
});

router.post('/process-deposition', async (req, res) => {
  try {
    const parsed = ProcessDepositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { caseId, audioUrl, deponentName, date } = parsed.data;

    // Process deposition through ChittyRouter AI
    const result = await chittyRouter.processDeposition(audioUrl, caseId);

    // Create evidence record for the deposition
    const evidenceId = crypto.randomUUID();
    const fileHash = crypto
      .createHash('sha256')
      .update(`${evidenceId}:${audioUrl}:${Date.now()}`)
      .digest('hex');

    // Generate ChittyID for deposition evidence
    const chittyResponse = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=D&trust=3&identifier=${fileHash}`);
    const chittyData = await chittyResponse.json();

    await db.insert(tables.masterEvidence).values({
      id: evidenceId,
      caseId,
      submittedBy: null,
      title: `Deposition - ${deponentName} (${date})`,
      content: result.transcript,
      metadata: {
        deponentName,
        date,
        audioUrl,
        keyStatements: result.keyStatements,
        timeline: result.timeline
      },
      mediaUrl: audioUrl,
      fileHash,
      type: 'testimony',
      tier: 'WITNESS',
      weight: '0.70',
      source: 'Deposition Recording',
      sourceVerification: 'AI_TRANSCRIBED',
      authenticationMethod: 'Audio Analysis',
      isConfidential: true,
      dateReceived: new Date(),
      dateOfEvidence: new Date(date),
      mintingStatus: 'Pending',
      blockNumber: null,
      transactionHash: null,
      auditNotes: `ChittyID: ${chittyData.chittyId}\nAI Transcribed: ${result.keyStatements.length} key statements identified`
    });

    // Extract facts from key statements
    let factsCreated = 0;
    for (const statement of result.keyStatements) {
      const factId = crypto.randomUUID();

      await db.insert(tables.atomicFacts).values({
        id: factId,
        evidenceId,
        caseId,
        assertedBy: null,
        text: statement,
        extractedFrom: `Deposition - ${deponentName}`,
        tags: ['deposition', 'testimony', 'ai_extracted'],
        factType: 'ACTION',
        locationInDocument: null,
        classificationLevel: 'ASSERTION',
        weight: '0.65',
        credibilityFactors: ['witness_testimony', 'ai_verified'],
        timestampedAt: new Date(),
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
        chittychainStatus: 'Pending',
        verificationMethod: 'AI_EXTRACTED_DEPOSITION'
      });

      factsCreated++;
    }

    res.json({
      evidenceId,
      chittyId: chittyData.chittyId,
      transcript: result.transcript,
      keyStatements: result.keyStatements.length,
      contradictions: result.contradictions.length,
      factsExtracted: factsCreated,
      timeline: result.timeline,
      message: 'Deposition processed and analyzed successfully'
    });
    return;

  } catch (error) {
    console.error('Deposition processing error:', error);
    res.status(500).json({
      error: 'Deposition processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

/**
 * POST /ai-evidence/verify-document
 * AI-powered document verification using image analysis
 */
const VerifyDocumentSchema = z.object({
  evidenceId: z.string().uuid(),
  imageUrl: z.string().url(),
  expectedType: z.string()
});

router.post('/verify-document', async (req, res) => {
  try {
    const parsed = VerifyDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues
      });
    }

    const { evidenceId, imageUrl, expectedType } = parsed.data;

    // Verify document authenticity through ChittyRouter AI
    const verification = await chittyRouter.verifyDocument(imageUrl, expectedType);

    // Update evidence with verification results
    await db
      .update(tables.masterEvidence)
      .set({
        sourceVerification: verification.authentic ? 'AI_VERIFIED' : 'AI_QUESTIONED',
        authenticationMethod: 'AI_IMAGE_ANALYSIS',
        auditNotes: `AI Verification: ${verification.authentic ? 'AUTHENTIC' : 'QUESTIONABLE'}\nConfidence: ${verification.confidence}\nSignatures detected: ${verification.signatures.length}\nAlterations: ${verification.alterations.length}`
      })
      .where(eq(tables.masterEvidence.id, evidenceId));

    // Create chain of custody entry
    await db.insert(tables.chainOfCustody).values({
      id: crypto.randomUUID(),
      evidenceId,
      action: 'AI_VERIFIED',
      performedBy: null,
      transferMethod: null,
      integrityCheckMethod: 'AI_IMAGE_ANALYSIS',
      integrityVerified: verification.authentic,
      notes: `AI verification complete. Confidence: ${verification.confidence}`,
      timestamp: new Date()
    });

    res.json({
      evidenceId,
      authentic: verification.authentic,
      confidence: verification.confidence,
      signatures: verification.signatures,
      alterations: verification.alterations,
      verified: verification.authentic && verification.confidence > 0.8,
      message: 'Document verification completed'
    });
    return;

  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({
      error: 'Document verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export default router;