/**
 * ChittyVerify Service Client
 * Handles evidence integrity, authenticity, and trust verification
 * Per §36: All verification must go through ChittyVerify service
 */

export interface VerificationRequest {
  chitty_id: string;
  sha256: string;
  metadata?: {
    filename?: string;
    source?: string;
    timestamp?: string;
    custody_chain?: string[];
  };
}

export interface VerificationResult {
  chitty_id: string;
  verified: boolean;
  trust_score: number; // 0.0 to 1.0
  verification_method: string;
  verification_timestamp: string;
  integrity_check: {
    hash_verified: boolean;
    chain_of_custody_valid: boolean;
    source_authenticated: boolean;
  };
  trust_factors: {
    source_reputation: number;
    authentication_strength: number;
    custody_integrity: number;
    temporal_consistency: number;
  };
  warnings: string[];
  compliance_flags: string[];
}

export class ChittyVerifyClient {
  private baseUrl?: string;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CHITTY_VERIFY_TOKEN;
  }

  /**
   * Resolve ChittyVerify service URL from registry
   */
  private async resolve(): Promise<string> {
    if (this.baseUrl) return this.baseUrl;

    const registryUrl =
      process.env.CHITTY_REGISTRY_URL ||
      process.env.REGISTRY_URL ||
      "https://registry.chitty.cc";
    const registryToken = process.env.CHITTY_REGISTRY_TOKEN;

    const response = await fetch(`${registryUrl}/api/v1/resolve/chittyverify`, {
      headers: {
        Authorization: `Bearer ${registryToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ChittyVerify service resolution failed: ${response.status}`,
      );
    }

    const result = await response.json();
    this.baseUrl = result.base_url;
    return this.baseUrl;
  }

  /**
   * Verify evidence integrity and authenticity
   */
  async verifyEvidence(
    request: VerificationRequest,
  ): Promise<VerificationResult> {
    if (!this.apiKey) {
      throw new Error("CHITTY_VERIFY_TOKEN required for ChittyVerify service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/evidence/verify`, {
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
        `ChittyVerify evidence verification failed: ${response.status} - ${error}`,
      );
    }

    return response.json();
  }

  /**
   * Verify attorney credentials and authorization
   */
  async verifyAttorney(
    barNumber: string,
    jurisdiction: string,
  ): Promise<{
    verified: boolean;
    attorney_info: {
      name: string;
      bar_number: string;
      jurisdiction: string;
      status: string;
      admission_date: string;
    };
    trust_score: number;
    authorization_level: string;
  }> {
    if (!this.apiKey) {
      throw new Error("CHITTY_VERIFY_TOKEN required for ChittyVerify service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/attorney/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bar_number: barNumber,
        jurisdiction,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ChittyVerify attorney verification failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Verify document authenticity and chain of custody
   */
  async verifyDocumentCustody(
    chittyId: string,
    custodyChain: Array<{
      action: string;
      performed_by: string;
      timestamp: string;
      method: string;
      signature?: string;
    }>,
  ): Promise<{
    custody_valid: boolean;
    chain_integrity_score: number;
    custody_gaps: string[];
    recommendations: string[];
  }> {
    if (!this.apiKey) {
      throw new Error("CHITTY_VERIFY_TOKEN required for ChittyVerify service");
    }

    const baseUrl = await this.resolve();

    const response = await fetch(`${baseUrl}/api/v1/custody/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chitty_id: chittyId,
        custody_chain: custodyChain,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ChittyVerify custody verification failed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Health check for ChittyVerify service
   */
  async healthCheck(): Promise<{
    status: string;
    version: string;
    capabilities: string[];
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
      throw new Error(`ChittyVerify service unavailable: ${error}`);
    }
  }
}

// Export singleton instance
export const chittyVerifyClient = new ChittyVerifyClient();
