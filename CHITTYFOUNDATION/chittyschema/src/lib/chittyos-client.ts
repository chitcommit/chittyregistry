/**
 * ChittyOS Ecosystem Client
 * Integrates with all ChittyOS platform services
 */

interface ChittyOSConfig {
  idApi: string;
  schemaApi: string;
  chainApi: string;
  ledgerApi: string;
  trustApi: string;
  verifyApi: string;
  region: number;
  jurisdiction: string;
  trustLevel: number;
}

const config: ChittyOSConfig = {
  idApi: process.env.CHITTY_ID_API || 'https://id.chitty.cc',
  schemaApi: process.env.CHITTY_SCHEMA_API || 'https://schema.chitty.cc',
  chainApi: process.env.CHITTY_CHAIN_API || 'https://chain.chitty.cc',
  ledgerApi: process.env.CHITTY_LEDGER_API || 'https://ledger.chitty.cc',
  trustApi: process.env.CHITTY_TRUST_API || 'https://trust.chitty.cc',
  verifyApi: process.env.CHITTY_VERIFY_API || 'https://verify.chitty.cc',
  region: parseInt(process.env.CHITTY_REGION || '1'),
  jurisdiction: process.env.CHITTY_JURISDICTION || 'USA',
  trustLevel: parseInt(process.env.CHITTY_TRUST_LEVEL || '3')
};

export class ChittyOSClient {
  private config: ChittyOSConfig;

  constructor(customConfig?: Partial<ChittyOSConfig>) {
    this.config = { ...config, ...customConfig };
  }

  /**
   * Generate ChittyID using official service
   */
  async generateId(type: string, identifier: string): Promise<string> {
    const params = new URLSearchParams({
      region: this.config.region.toString(),
      jurisdiction: this.config.jurisdiction,
      type,
      trust: this.config.trustLevel.toString(),
      identifier
    });

    const response = await fetch(`${this.config.idApi}/api/generate?${params}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`ChittyID generation failed: ${data.message}`);
    }

    return data.chittyId;
  }

  /**
   * Validate schema using ChittySchema service
   */
  async validateSchema(schemaType: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.schemaApi}/api/validate/${schemaType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.warn('ChittySchema service unavailable, skipping validation');
      return true; // Graceful degradation
    }
  }

  /**
   * Mint evidence to ChittyChain
   */
  async mintToChain(evidenceId: string, data: any): Promise<{ blockNumber?: string; transactionHash?: string }> {
    try {
      const response = await fetch(`${this.config.chainApi}/api/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, data })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('ChittyChain service unavailable, evidence stored locally only');
    }

    return {}; // Graceful degradation
  }

  /**
   * Register with ChittyLedger distributed network
   */
  async registerEvidence(evidenceId: string, chittyId: string, metadata: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.ledgerApi}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, chittyId, metadata })
      });
      return response.ok;
    } catch (error) {
      console.warn('ChittyLedger service unavailable, using local storage only');
      return false;
    }
  }

  /**
   * Get trust score from ChittyTrust
   */
  async getTrustScore(chittyId: string): Promise<number> {
    try {
      const response = await fetch(`${this.config.trustApi}/api/trust/${chittyId}`);
      const data = await response.json();
      return data.score || 0;
    } catch (error) {
      console.warn('ChittyTrust service unavailable, using default trust score');
      return this.config.trustLevel / 5; // Convert to 0-1 scale
    }
  }

  /**
   * Verify evidence using ChittyVerify
   */
  async verifyEvidence(evidenceId: string, chittyId: string): Promise<{ verified: boolean; method?: string }> {
    try {
      const response = await fetch(`${this.config.verifyApi}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, chittyId })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('ChittyVerify service unavailable, using local verification');
    }

    return { verified: false, method: 'local_fallback' };
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const services = {
      id: this.config.idApi,
      schema: this.config.schemaApi,
      chain: this.config.chainApi,
      ledger: this.config.ledgerApi,
      trust: this.config.trustApi,
      verify: this.config.verifyApi
    };

    const results: Record<string, boolean> = {};

    for (const [name, url] of Object.entries(services)) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        results[name] = response.ok;
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }
}

// Export singleton instance
export const chittyOS = new ChittyOSClient();