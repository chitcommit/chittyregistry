/**
 * ChittySchema - Advanced Legal Evidence Management Platform
 * Core exports and initialization
 */

export * from "./lib/chitty-id";
export * from "./lib/chitty-ledger";
export * from "./lib/evidence-chain";
export * from "./db/schema";
export * from "./mcp/client";
export * from "./api/gateway";

import { ChittyLedger } from "./lib/chitty-ledger";
import { ChittyID } from "./lib/chitty-id";
import { EvidenceChain } from "./lib/evidence-chain";
import { ChittyGateway } from "./api/gateway";
import { ChittyMCPClient } from "./mcp/client";
import { initializeDatabase } from "./db/client";
import type { ChittySchemaConfig } from "./types";

export class ChittySchema {
  private ledger: ChittyLedger;
  private idGenerator: ChittyID;
  private evidenceChain: EvidenceChain;
  private gateway?: ChittyGateway;
  private mcpClient?: ChittyMCPClient;
  private config: ChittySchemaConfig;

  constructor(config: ChittySchemaConfig) {
    this.config = config;
    this.idGenerator = new ChittyID({
      namespace: config.namespace || "SCHEMA",
      remoteOnly: config.security?.remoteOnly ?? true,
    });

    this.ledger = new ChittyLedger({
      database: config.database,
      blockchain: config.blockchain,
      idGenerator: this.idGenerator,
    });

    this.evidenceChain = new EvidenceChain({
      ledger: this.ledger,
      vectorStore: config.vectorStore,
      aiConfig: config.ai,
    });

    if (config.gateway) {
      this.gateway = new ChittyGateway({
        ...config.gateway,
        ledger: this.ledger,
        evidenceChain: this.evidenceChain,
      });
    }

    if (config.mcp) {
      this.mcpClient = new ChittyMCPClient({
        ...config.mcp,
        schema: this,
      });
    }
  }

  async initialize(): Promise<void> {
    // Initialize database
    if (this.config.database) {
      await initializeDatabase(this.config.database);
    }

    // Initialize gateway
    if (this.gateway) {
      await this.gateway.start();
    }

    // Initialize MCP client
    if (this.mcpClient) {
      await this.mcpClient.connect();
    }

    // Run startup checks
    await this.performHealthCheck();
  }

  async performHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const services: Record<string, boolean> = {
      database: false,
      blockchain: false,
      vectorStore: false,
      gateway: false,
      mcp: false,
    };

    // Check database
    try {
      await this.ledger.ping();
      services.database = true;
    } catch {}

    // Check blockchain
    if (this.config.blockchain?.enabled) {
      try {
        await this.ledger.checkBlockchainConnection();
        services.blockchain = true;
      } catch {}
    }

    // Check vector store
    if (this.config.vectorStore) {
      try {
        await this.evidenceChain.checkVectorStore();
        services.vectorStore = true;
      } catch {}
    }

    // Check gateway
    if (this.gateway) {
      services.gateway = await this.gateway.isHealthy();
    }

    // Check MCP
    if (this.mcpClient) {
      services.mcp = this.mcpClient.isConnected();
    }

    const healthyCount = Object.values(services).filter(Boolean).length;
    const totalCount = Object.keys(services).length;

    let status: "healthy" | "degraded" | "unhealthy";
    if (healthyCount === totalCount) {
      status = "healthy";
    } else if (healthyCount >= totalCount / 2) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  // Core API methods
  async createEvidence(data: {
    content: string;
    type: "document" | "testimony" | "physical" | "digital" | "forensic";
    metadata?: Record<string, any>;
    tier?: number; // 0.0 - 1.0
  }) {
    const evidenceId = await this.idGenerator.generate("EVIDENCE");
    return this.ledger.createEvidence({
      ...data,
      id: evidenceId,
    });
  }

  async processEvidence(evidenceId: string) {
    return this.evidenceChain.process(evidenceId);
  }

  async mintEvidence(evidenceId: string, hard = false) {
    if (hard && this.config.blockchain?.enabled) {
      return this.ledger.hardMint(evidenceId);
    }
    return this.ledger.softMint(evidenceId);
  }

  async searchEvidence(
    query: string,
    options?: {
      limit?: number;
      filters?: Record<string, any>;
      includeEmbeddings?: boolean;
    },
  ) {
    return this.evidenceChain.search(query, options);
  }

  // Getters
  getLedger() {
    return this.ledger;
  }
  getIDGenerator() {
    return this.idGenerator;
  }
  getEvidenceChain() {
    return this.evidenceChain;
  }
  getGateway() {
    return this.gateway;
  }
  getMCPClient() {
    return this.mcpClient;
  }
}

// Default export for convenience
export default ChittySchema;
