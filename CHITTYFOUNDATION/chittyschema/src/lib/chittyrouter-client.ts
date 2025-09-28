/**
 * ChittyRouter AI Gateway Client
 * Integrates Evidence Ledger with AI orchestration system
 */

export interface AIAnalysisRequest {
  documentType: 'evidence' | 'fact' | 'legal_filing' | 'deposition' | 'contract';
  content: string;
  caseId: string;
  chittyId: string;
  metadata?: Record<string, any>;
}

export interface AIAnalysisResponse {
  analysisId: string;
  extractedFacts: Array<{
    text: string;
    confidence: number;
    factType: string;
    classificationLevel: string;
    credibilityFactors: string[];
  }>;
  contradictions: Array<{
    factA: string;
    factB: string;
    conflictType: string;
    resolution: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    significance: string;
  }>;
  riskAssessment: {
    score: number;
    factors: string[];
    recommendations: string[];
  };
  compliance: {
    jurisdictionChecks: Record<string, boolean>;
    requiredActions: string[];
  };
}

export class ChittyRouterClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl = 'https://router.chitty.cc', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.CHITTY_ROUTER_API_KEY;
  }

  /**
   * Analyze legal document through AI pipeline
   */
  async analyzeDocument(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        ...request,
        agentPipeline: this.getAgentPipeline(request.documentType)
      })
    });

    if (!response.ok) {
      throw new Error(`ChittyRouter analysis failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Extract facts from evidence using AI
   */
  async extractFacts(evidenceId: string, content: string, caseId: string): Promise<Array<{
    text: string;
    factType: string;
    weight: number;
    credibilityFactors: string[];
  }>> {
    const analysis = await this.analyzeDocument({
      documentType: 'evidence',
      content,
      caseId,
      chittyId: evidenceId,
      metadata: { evidenceId }
    });

    return analysis.extractedFacts.map(fact => ({
      text: fact.text,
      factType: fact.factType,
      weight: fact.confidence,
      credibilityFactors: fact.credibilityFactors
    }));
  }

  /**
   * Process deposition audio/transcript
   */
  async processDeposition(audioUrl: string, caseId: string): Promise<{
    transcript: string;
    keyStatements: string[];
    contradictions: string[];
    timeline: Array<{ time: string; statement: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/api/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        audioUrl,
        caseId,
        pipeline: ['whisper', 'legal_analyzer', 'timeline_builder']
      })
    });

    return await response.json();
  }

  /**
   * Verify document authenticity using AI
   */
  async verifyDocument(imageUrl: string, expectedType: string): Promise<{
    authentic: boolean;
    confidence: number;
    signatures: Array<{ detected: boolean; confidence: number }>;
    alterations: Array<{ type: string; location: string; confidence: number }>;
  }> {
    const response = await fetch(`${this.baseUrl}/api/verify-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        imageUrl,
        expectedType,
        models: ['@cf/microsoft/resnet-50']
      })
    });

    return await response.json();
  }

  /**
   * Get appropriate agent pipeline for document type
   */
  private getAgentPipeline(documentType: string): string[] {
    const pipelines = {
      evidence: ['evidence_analyzer', 'chain_builder', 'verification_agent'],
      fact: ['legal_analyzer', 'document_processor', 'timeline_builder'],
      legal_filing: ['document_analyzer', 'compliance_checker', 'risk_assessor'],
      deposition: ['document_analyzer', 'timeline_builder', 'contradiction_detector'],
      contract: ['contract_analyzer', 'compliance_checker', 'risk_assessor']
    };

    return pipelines[documentType] || ['legal_analyzer', 'document_processor'];
  }

  /**
   * Health check for ChittyRouter service
   */
  async healthCheck(): Promise<{ status: string; models: string[]; agents: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'unavailable', models: [], agents: [] };
    }
  }
}

// Export singleton instance
export const chittyRouter = new ChittyRouterClient();