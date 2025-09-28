/**
 * ChittyCheck Service Client
 * Handles compliance validation and regulatory checks
 * Per §36: All compliance validation must go through ChittyCheck service
 */

export interface ComplianceRequest {
  chitty_id: string;
  entity_type: "evidence" | "case" | "attorney" | "document" | "fact";
  verification_result?: any; // Result from ChittyVerify
  jurisdiction?: string;
  metadata?: {
    case_type?: string;
    evidence_type?: string;
    confidentiality_level?: string;
    retention_requirements?: string[];
  };
}

export interface ComplianceResult {
  chitty_id: string;
  compliant: boolean;
  compliance_score: number; // 0.0 to 1.0
  validation_timestamp: string;
  jurisdiction_checks: {
    [jurisdiction: string]: {
      compliant: boolean;
      requirements_met: string[];
      violations: string[];
      recommendations: string[];
    };
  };
  regulatory_flags: Array<{
    flag_type: "warning" | "violation" | "requirement";
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    remediation: string;
  }>;
  required_actions: Array<{
    action: string;
    deadline?: string;
    priority: "low" | "medium" | "high" | "urgent";
    responsible_party: string;
  }>;
  retention_policy: {
    minimum_retention_years: number;
    destruction_method: string;
    compliance_requirements: string[];
  };
  audit_trail: {
    validation_method: string;
    validator_id: string;
    validation_rules_version: string;
  };
}

export interface ChittyIDComplianceCheck {
  chitty_id: string;
  valid_format: boolean;
  proper_namespace: boolean;
  foundation_verified: boolean;
  violations: string[];
}

export class ChittyCheckClient {
  private baseUrl?: string;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CHITTY_CHECK_TOKEN;
  }

  /**
   * Resolve ChittyCheck service URL from registry
   */
  private async resolve(): Promise<string> {
    if (this.baseUrl) return this.baseUrl;

    const registryUrl =
      process.env.CHITTY_REGISTRY_URL ||
      process.env.REGISTRY_URL ||
      "https://registry.chitty.cc";
    const registryToken = process.env.CHITTY_REGISTRY_TOKEN;

    const response = await fetch(`${registryUrl}/api/v1/resolve/chittycheck`, {
      headers: {
        Authorization: `Bearer ${registryToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ChittyCheck service resolution failed: ${response.status}`,
      );
    }

    const result = await response.json();
    this.baseUrl = result.base_url;
    return this.baseUrl;
  }

  /**
   * Validate evidence compliance across jurisdictions
   */
  async validateEvidence(
    request: ComplianceRequest,
  ): Promise<ComplianceResult> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/validate/evidence`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "ChittySchema/2.0.0",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `ChittyCheck evidence validation failed: ${response.status} - ${error}`,
      );
    }

    return response.json();
  }

  /**
   * Validate ChittyID compliance and format
   */
  async validateChittyID(chittyId: string): Promise<ChittyIDComplianceCheck> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/validate/chittyid`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chitty_id: chittyId }),
    });

    if (!response.ok) {
      throw new Error(
        `ChittyCheck ChittyID validation failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Validate case compliance and jurisdiction requirements
   */
  async validateCase(
    caseId: string,
    jurisdiction: string,
    caseType: string,
  ): Promise<ComplianceResult> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/validate/case`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        case_id: caseId,
        jurisdiction,
        case_type: caseType,
      }),
    });

    if (!response.ok) {
      throw new Error(`ChittyCheck case validation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate attorney authorization and standing
   */
  async validateAttorneyAuthorization(
    barNumber: string,
    jurisdiction: string,
    caseId?: string,
  ): Promise<{
    authorized: boolean;
    authorization_level: string;
    restrictions: string[];
    expiration_date?: string;
    compliance_notes: string[];
  }> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/validate/attorney`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bar_number: barNumber,
        jurisdiction,
        case_id: caseId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ChittyCheck attorney authorization failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Run comprehensive compliance audit
   */
  async runComplianceAudit(auditScope: {
    entity_ids: string[];
    entity_types: string[];
    jurisdictions: string[];
    audit_level: "basic" | "standard" | "comprehensive";
  }): Promise<{
    audit_id: string;
    overall_compliance_score: number;
    critical_violations: number;
    warnings: number;
    passed_checks: number;
    detailed_results: ComplianceResult[];
    recommendations: Array<{
      priority: string;
      action: string;
      timeline: string;
    }>;
  }> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/audit/comprehensive`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(auditScope),
    });

    if (!response.ok) {
      throw new Error(
        `ChittyCheck compliance audit failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Get compliance requirements for jurisdiction
   */
  async getJurisdictionRequirements(
    jurisdiction: string,
    entityType: string,
  ): Promise<{
    jurisdiction: string;
    entity_type: string;
    requirements: Array<{
      requirement_id: string;
      description: string;
      mandatory: boolean;
      deadline_type: string;
      penalties: string[];
    }>;
    documentation_requirements: string[];
    retention_policies: {
      minimum_years: number;
      destruction_method: string;
    };
  }> {
    if (!this.apiKey) {
      throw new Error("CHITTY_CHECK_TOKEN required for ChittyCheck service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(
      `${baseUrl}/api/v1/requirements/${jurisdiction}/${entityType}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `ChittyCheck requirements lookup failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Health check for ChittyCheck service
   */
  async healthCheck(): Promise<{
    status: string;
    version: string;
    supported_jurisdictions: string[];
  }> {
    try {
      const baseUrl = await this.resolve();

      const response = await fetch(`${baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`ChittyCheck service unavailable: ${error}`);
    }
  }
}

// Export singleton instance
export const chittyCheckClient = new ChittyCheckClient();
