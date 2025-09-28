/**
 * ChittyID Generator
 * Deterministic ID generation with namespace prefixes
 * Format: CHITTY-{NAMESPACE}-{16_CHAR_HEX}
 */

import { createHash, randomBytes } from "crypto";
import type { ChittyIDConfig, ChittyIDMetadata } from "../types";

export class ChittyID {
  private namespace: string;
  private remoteOnly: boolean;
  private cache: Map<string, ChittyIDMetadata>;
  private auditLog: ChittyIDMetadata[];
  private config: ChittyIDConfig;

  constructor(config: ChittyIDConfig) {
    this.config = config;
    this.namespace = config.namespace.toUpperCase();
    this.remoteOnly = config.remoteOnly ?? true;
    this.cache = new Map();
    this.auditLog = [];
  }

  /**
   * Generate a new ChittyID
   */
  async generate(type?: string): Promise<string> {
    if (this.remoteOnly) {
      return this.generateRemote(type);
    }
    return this.generateLocal(type);
  }

  /**
   * Generate ID locally (development only)
   */
  private generateLocal(type?: string): string {
    const timestamp = Date.now().toString();
    const random = randomBytes(8).toString("hex");
    const namespace = type || this.namespace;

    const hash = createHash("sha256")
      .update(timestamp)
      .update(random)
      .update(namespace)
      .digest("hex")
      .substring(0, 16)
      .toUpperCase();

    const id = `CHITTY-${namespace}-${hash}`;

    const metadata: ChittyIDMetadata = {
      id,
      namespace,
      createdAt: new Date(),
      lifecycle: "generated",
      immutable: false,
    };

    this.cache.set(id, metadata);
    this.auditLog.push(metadata);

    return id;
  }

  /**
   * Generate ID via remote service (production)
   */
  private async generateRemote(type?: string): Promise<string> {
    const namespace = type || this.namespace;

    // In production, this would call the ChittyGateway API
    const response = await fetch(
      "https://gateway.chitty.cc/api/v1/id/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Chitty-Namespace": namespace,
        },
        body: JSON.stringify({
          namespace,
          type,
          metadata: {
            timestamp: new Date().toISOString(),
            source: "chittyschema",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to generate ChittyID: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Validate a ChittyID format
   */
  validate(id: string): boolean {
    const pattern = /^CHITTY-[A-Z0-9]+-[A-F0-9]{16}$/;
    return pattern.test(id);
  }

  /**
   * Validate and verify ID against remote service
   */
  async verify(id: string): Promise<boolean> {
    if (!this.validate(id)) {
      return false;
    }

    // Check cache first
    if (this.cache.has(id)) {
      const cached = this.cache.get(id)!;
      if (
        cached.validatedAt &&
        Date.now() - cached.validatedAt.getTime() < 300000
      ) {
        // 5 min cache
        return true;
      }
    }

    if (this.remoteOnly) {
      return this.verifyRemote(id);
    }

    return true;
  }

  /**
   * Verify ID with remote service
   */
  private async verifyRemote(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://gateway.chitty.cc/api/v1/id/verify/${id}`,
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.valid) {
        const metadata = this.cache.get(id) || {
          id,
          namespace: this.extractNamespace(id),
          createdAt: new Date(data.createdAt),
          lifecycle: data.lifecycle,
          immutable: data.immutable,
        };

        metadata.validatedAt = new Date();
        this.cache.set(id, metadata);
      }

      return data.valid;
    } catch {
      return false;
    }
  }

  /**
   * Extract namespace from ChittyID
   */
  extractNamespace(id: string): string {
    const parts = id.split("-");
    return parts[1] || "";
  }

  /**
   * Extract hash from ChittyID
   */
  extractHash(id: string): string {
    const parts = id.split("-");
    return parts[2] || "";
  }

  /**
   * Parse ChittyID into components
   */
  parse(id: string): {
    valid: boolean;
    prefix: string;
    namespace: string;
    hash: string;
  } | null {
    if (!this.validate(id)) {
      return null;
    }

    const parts = id.split("-");
    return {
      valid: true,
      prefix: parts[0],
      namespace: parts[1],
      hash: parts[2],
    };
  }

  /**
   * Soft mint an ID (database only)
   */
  async softMint(id: string): Promise<boolean> {
    if (!(await this.verify(id))) {
      throw new Error("Invalid ChittyID");
    }

    const metadata = this.cache.get(id) || {
      id,
      namespace: this.extractNamespace(id),
      createdAt: new Date(),
      lifecycle: "validated",
      immutable: false,
    };

    metadata.mintedAt = new Date();
    metadata.lifecycle = "soft-minted";

    this.cache.set(id, metadata);
    this.auditLog.push({ ...metadata });

    return true;
  }

  /**
   * Hard mint an ID (blockchain)
   */
  async hardMint(id: string): Promise<string> {
    if (!(await this.verify(id))) {
      throw new Error("Invalid ChittyID");
    }

    // In production, this would interact with blockchain
    const response = await fetch("https://gateway.chitty.cc/api/v1/id/mint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        type: "hard",
        blockchain: {
          network: "mainnet",
          confirmation: "required",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to hard mint ChittyID: ${response.statusText}`);
    }

    const data = await response.json();

    const metadata = this.cache.get(id) || {
      id,
      namespace: this.extractNamespace(id),
      createdAt: new Date(),
      lifecycle: "hard-minted",
      immutable: true,
    };

    metadata.mintedAt = new Date();
    metadata.lifecycle = "hard-minted";
    metadata.immutable = true;

    this.cache.set(id, metadata);
    this.auditLog.push({ ...metadata });

    return data.transactionHash;
  }

  /**
   * Get metadata for an ID
   */
  getMetadata(id: string): ChittyIDMetadata | null {
    return this.cache.get(id) || null;
  }

  /**
   * Get audit log
   */
  getAuditLog(): ChittyIDMetadata[] {
    return [...this.auditLog];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Batch generate IDs
   */
  async generateBatch(count: number, type?: string): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const id = await this.generate(type);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Batch validate IDs
   */
  validateBatch(ids: string[]): Map<string, boolean> {
    const results = new Map<string, boolean>();

    for (const id of ids) {
      results.set(id, this.validate(id));
    }

    return results;
  }
}
