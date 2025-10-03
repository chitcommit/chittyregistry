/**
 * @chittyos/chittyid-client
 *
 * Official ChittyOS client for ChittyID minting
 * Implements SERVICE OR FAIL principle - no local generation allowed
 *
 * All IDs must be minted from id.chitty.cc service
 */

export interface ChittyIDClientConfig {
  serviceUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface ChittyIDRequest {
  entity:
    | "PEO"
    | "PLACE"
    | "PROP"
    | "EVNT"
    | "AUTH"
    | "INFO"
    | "FACT"
    | "CONTEXT"
    | "ACTOR";
  name?: string;
  metadata?: Record<string, any>;
}

export interface ChittyIDResponse {
  chittyId: string;
  entity: string;
  timestamp: string;
  version: string;
}

export interface ValidationResult {
  valid: boolean;
  chittyId?: string;
  entity?: string;
  error?: string;
}

export class ChittyIDClient {
  private serviceUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: ChittyIDClientConfig = {}) {
    this.serviceUrl = config.serviceUrl || "https://id.chitty.cc/v1";
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 10000;
  }

  /**
   * Request ChittyID minting from service
   * SERVICE OR FAIL - Throws error if service unavailable
   */
  async mint(request: ChittyIDRequest): Promise<string> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.serviceUrl}/mint`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `ChittyID service error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ChittyIDResponse;
      return data.chittyId;
    } catch (error) {
      if (error instanceof Error) {
        // SERVICE OR FAIL - Never generate locally
        throw new Error(
          `ChittyID service unavailable - cannot mint ${request.entity} ID: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate ChittyID format
   * Official Format: VV-G-LLL-SSSS-T-YM-C-X
   */
  validateFormat(chittyId: string): boolean {
    // VV = 2-letter version, G = generation, LLL = 3-letter location
    // SSSS = 4-digit sequence, T = type, YM = year-month, C = category, X = checksum
    const pattern =
      /^[A-Z]{2}-[A-Z]-[A-Z]{3}-[0-9]{4}-[A-Z]-[0-9]{2}-[A-Z]-[0-9A-Z]$/;
    return pattern.test(chittyId);
  }

  /**
   * Validate ChittyID with service
   */
  async validate(chittyId: string): Promise<ValidationResult> {
    try {
      const response = await fetch(
        `${this.serviceUrl}/validate/${encodeURIComponent(chittyId)}`,
        {
          headers: this.apiKey
            ? { Authorization: `Bearer ${this.apiKey}` }
            : {},
        },
      );

      if (!response.ok) {
        return { valid: false, error: `Service error: ${response.status}` };
      }

      const data = (await response.json()) as {
        valid: boolean;
        chittyId?: string;
        entity?: string;
      };
      return {
        valid: data.valid === true,
        chittyId: data.chittyId,
        entity: data.entity,
      };
    } catch (error) {
      // Fallback to format validation only
      return {
        valid: this.validateFormat(chittyId),
        error: error instanceof Error ? error.message : "Validation failed",
      };
    }
  }

  /**
   * Batch mint multiple ChittyIDs
   * SERVICE OR FAIL - Throws error if service unavailable
   */
  async mintBatch(requests: ChittyIDRequest[]): Promise<string[]> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.serviceUrl}/mint/batch`, {
        method: "POST",
        headers,
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`ChittyID service error: ${response.status}`);
      }

      const data = (await response.json()) as { chittyIds: string[] };
      return data.chittyIds;
    } catch (error) {
      // SERVICE OR FAIL - Never generate locally
      throw new Error(
        `ChittyID service unavailable - cannot batch mint IDs: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export convenience functions
export async function mintChittyID(
  request: ChittyIDRequest,
  config?: ChittyIDClientConfig,
): Promise<string> {
  const client = new ChittyIDClient(config);
  return client.mint(request);
}

export async function validateChittyID(
  chittyId: string,
  config?: ChittyIDClientConfig,
): Promise<ValidationResult> {
  const client = new ChittyIDClient(config);
  return client.validate(chittyId);
}

export default ChittyIDClient;
