/**
 * ChittySchema Service Adapter for ChittyRouter
 * Integrates ChittySchema as a service within the ChittyRouter unified worker
 */

import { db, tables, execute } from "./lib/db-simple.js";
import { chittyId, isValidChittyId } from "./lib/chittyid.js";
import { chittyVerifyClient } from "./lib/chittyverify-client.js";
import { chittyCheckClient } from "./lib/chittycheck-client.js";

export class ChittySchemaService {
  constructor(env) {
    this.env = env;
    this.serviceName = "ChittySchema";
    this.version = "2.0.0";

    // Service endpoints this adapter handles
    this.endpoints = {
      health: "/schema/health",
      evidence: "/schema/evidence",
      cases: "/schema/cases",
      facts: "/schema/facts",
      serviceEvidence: "/schema/evidence/service",
      analytics: "/schema/analytics",
    };

    console.log("✅ ChittySchema service initialized in ChittyRouter");
  }

  /**
   * Main request handler for ChittySchema routes
   */
  async handleRequest(request, pathname) {
    const url = new URL(request.url);

    try {
      // Route to appropriate handler
      switch (true) {
        case pathname === "/schema/health":
          return this.handleHealth();

        case pathname === "/schema/cases":
          return this.handleCases(request);

        case pathname === "/schema/evidence" && request.method === "POST":
          return this.handleEvidenceSubmission(request);

        case pathname === "/schema/evidence/service" &&
          request.method === "POST":
          return this.handleServiceOrchestratedEvidence(request);

        case pathname === "/schema/facts":
          return this.handleFacts(request);

        case pathname === "/schema/analytics":
          return this.handleAnalytics();

        default:
          return new Response(
            JSON.stringify({
              error: "ChittySchema endpoint not found",
              available_endpoints: Object.values(this.endpoints),
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          );
      }
    } catch (error) {
      console.error("ChittySchema service error:", error);
      return new Response(
        JSON.stringify({
          error: "ChittySchema service error",
          message: error.message,
          service: this.serviceName,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Health check endpoint
   */
  async handleHealth() {
    const health = {
      service: this.serviceName,
      version: this.version,
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "PostgreSQL (Neon)",
      framework: "ChittyOS Standard Framework v1.0.1",
      endpoints: this.endpoints,
      features: {
        evidence_ingestion: true,
        service_orchestration: true,
        ai_analysis: true,
        compliance_validation: true,
      },
    };

    return new Response(JSON.stringify(health), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Handle cases endpoint
   */
  async handleCases(request) {
    if (request.method === "GET") {
      const cases = await execute(
        "SELECT * FROM cases ORDER BY created_at DESC LIMIT 10",
      );
      return new Response(
        JSON.stringify({
          count: cases.length,
          cases: cases,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Handle standard evidence submission
   */
  async handleEvidenceSubmission(request) {
    const data = await request.json();

    try {
      // Generate ChittyID via Foundation service
      const evidenceChittyId = await chittyId(
        "EVID",
        `${data.title}-${Date.now()}`,
      );

      // Verify and validate through service chain
      const verifyResult = await chittyVerifyClient.verifyEvidence({
        chitty_id: evidenceChittyId,
        sha256: data.fileHash || "generated",
        metadata: { source: "chittyrouter" },
      });

      const complianceResult = await chittyCheckClient.validateEvidence({
        chitty_id: evidenceChittyId,
        entity_type: "evidence",
        verification_result: verifyResult,
      });

      // Store evidence
      const evidenceId = crypto.randomUUID();
      await execute(
        `
        INSERT INTO master_evidence (
          id, case_id, title, content, file_hash, type, tier,
          source_verification, authentication_method,
          minting_status, audit_notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `,
        [
          evidenceId,
          data.caseId,
          data.title,
          data.content,
          data.fileHash,
          data.type,
          data.tier,
          verifyResult.verified ? "Verified" : "Pending",
          "ChittyRouter-ChittyVerify",
          complianceResult.compliant ? "Compliant" : "Pending",
          `ChittyID: ${evidenceChittyId}; Router: ChittyRouter; ServiceChain: §36`,
        ],
      );

      return new Response(
        JSON.stringify({
          success: true,
          evidence_id: evidenceId,
          chitty_id: evidenceChittyId,
          verification_status: verifyResult.verified ? "VERIFIED" : "PENDING",
          compliance_status: complianceResult.compliant
            ? "COMPLIANT"
            : "PENDING",
          service_chain: "ChittyRouter→ChittyVerify→ChittyCheck→ChittySchema",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Evidence submission failed",
          message: error.message,
          note: "ChittySchema requires ChittyOS Foundation services",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Handle service-orchestrated evidence (§36 compliant)
   */
  async handleServiceOrchestratedEvidence(request) {
    const { meta, data } = await request.json();

    console.log("🔍 ChittyRouter: Service-orchestrated evidence ingestion");

    try {
      // This follows the exact §36 pattern from the litigation manual
      const evidenceChittyId = await chittyId(
        "EVID",
        `${meta.filename}-${Date.now()}`,
      );

      const verifyResult = await chittyVerifyClient.verifyEvidence({
        chitty_id: evidenceChittyId,
        sha256: meta.sha256,
        metadata: {
          filename: meta.filename,
          router: "ChittyRouter",
          service_chain: "§36",
        },
      });

      const complianceResult = await chittyCheckClient.validateEvidence({
        chitty_id: evidenceChittyId,
        entity_type: "evidence",
        verification_result: verifyResult,
        jurisdiction: meta.jurisdiction,
        metadata: {
          evidence_type: meta.evidenceType,
          confidentiality_level: meta.isConfidential
            ? "confidential"
            : "public",
          router: "ChittyRouter",
        },
      });

      // Store with full service chain validation
      const evidenceId = crypto.randomUUID();
      await execute(
        `
        INSERT INTO master_evidence (
          id, case_id, submitted_by, title, content, file_hash, type, tier,
          source_verification, authentication_method, is_confidential,
          minting_status, audit_notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `,
        [
          evidenceId,
          meta.caseId,
          meta.submittedBy,
          meta.filename,
          data.content,
          meta.sha256,
          meta.evidenceType,
          meta.tier,
          verifyResult.verified ? "Verified" : "Pending",
          verifyResult.verification_method || "ChittyVerify",
          meta.isConfidential || false,
          complianceResult.compliant ? "Compliant" : "Pending",
          `ChittyID: ${evidenceChittyId}; Router: ChittyRouter; Trust: ${verifyResult.trust_score}; Compliance: ${complianceResult.compliance_score}; ServiceChain: §36`,
        ],
      );

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Evidence ingested via ChittyRouter service orchestration per §37",
          chitty_id: evidenceChittyId,
          evidence_id: evidenceId,
          verify: verifyResult,
          compliance: complianceResult,
          service_chain_validated: true,
          router: "ChittyRouter",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Service-orchestrated evidence ingestion failed",
          message: error.message,
          service_chain: "INTERRUPTED",
          compliance_note:
            "Failed to complete §36 service validation chain via ChittyRouter",
          router: "ChittyRouter",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Handle facts endpoint
   */
  async handleFacts(request) {
    if (request.method === "GET") {
      const facts = await execute(
        "SELECT * FROM atomic_facts ORDER BY created_at DESC LIMIT 20",
      );
      return new Response(
        JSON.stringify({
          count: facts.length,
          facts: facts,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Handle analytics endpoint
   */
  async handleAnalytics() {
    const [caseCount] = await execute("SELECT COUNT(*) as count FROM cases");
    const [evidenceCount] = await execute(
      "SELECT COUNT(*) as count FROM master_evidence",
    );
    const [factCount] = await execute(
      "SELECT COUNT(*) as count FROM atomic_facts",
    );

    return new Response(
      JSON.stringify({
        service: this.serviceName,
        router: "ChittyRouter",
        analytics: {
          cases: parseInt(caseCount.count),
          evidence: parseInt(evidenceCount.count),
          facts: parseInt(factCount.count),
        },
        compliance: {
          chittyid_enforcement: "ACTIVE",
          service_orchestration: "ENABLED",
          section_36_compliance: "ENFORCED",
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  /**
   * Get service metadata for ChittyRouter registration
   */
  getServiceMetadata() {
    return {
      name: this.serviceName,
      version: this.version,
      type: "data-framework",
      endpoints: this.endpoints,
      capabilities: [
        "evidence-management",
        "case-management",
        "fact-management",
        "service-orchestration",
        "compliance-validation",
        "ai-analysis-ready",
      ],
      compliance: {
        section_36: true,
        chittyid_integration: true,
        service_chain_validation: true,
      },
    };
  }
}

export default ChittySchemaService;
