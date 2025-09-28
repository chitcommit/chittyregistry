/**
 * ChittySchema Type Definitions
 */

export interface ChittySchemaConfig {
  namespace?: string;
  database?: DatabaseConfig;
  blockchain?: BlockchainConfig;
  vectorStore?: VectorStoreConfig;
  ai?: AIConfig;
  gateway?: GatewayConfig;
  mcp?: MCPConfig;
  security?: SecurityConfig;
  monitoring?: MonitoringConfig;
}

export interface DatabaseConfig {
  type: "sqlite" | "postgresql" | "neon";
  connectionString?: string;
  poolConfig?: {
    max?: number;
    min?: number;
    idle?: number;
  };
  migrations?: {
    autoRun?: boolean;
    directory?: string;
  };
}

export interface BlockchainConfig {
  enabled: boolean;
  network?: "mainnet" | "testnet" | "local";
  contractAddress?: string;
  privateKey?: string;
  rpcUrl?: string;
  mintThreshold?: number; // Percentage of evidence to hard mint
}

export interface VectorStoreConfig {
  provider: "cloudflare" | "pinecone" | "weaviate";
  apiKey?: string;
  indexName?: string;
  dimensions?: number;
  metric?: "cosine" | "euclidean" | "dotproduct";
}

export interface AIConfig {
  provider: "openai" | "anthropic" | "cloudflare";
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  embeddingModel?: string;
}

export interface GatewayConfig {
  port?: number;
  hostname?: string;
  cors?: {
    origins?: string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  auth?: {
    type: "jwt" | "apikey" | "oauth";
    secret?: string;
    issuer?: string;
  };
}

export interface MCPConfig {
  transport?: "stdio" | "websocket" | "http";
  serverUrl?: string;
  apiKey?: string;
  stateful?: boolean;
  durableObjectNamespace?: string;
}

export interface SecurityConfig {
  remoteOnly?: boolean;
  encryption?: {
    algorithm?: string;
    key?: string;
  };
  audit?: {
    enabled?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
  };
  pii?: {
    redaction?: boolean;
    tokenization?: boolean;
  };
}

export interface MonitoringConfig {
  enabled?: boolean;
  metrics?: {
    provider?: "cloudflare" | "datadog" | "prometheus";
    endpoint?: string;
  };
  tracing?: {
    enabled?: boolean;
    samplingRate?: number;
  };
  logging?: {
    level?: "debug" | "info" | "warn" | "error";
    format?: "json" | "text";
  };
}

// Evidence Types
export interface Evidence {
  id: string;
  content: string;
  type: EvidenceType;
  tier: number; // 0.0 - 1.0 weight
  status: EvidenceStatus;
  metadata: EvidenceMetadata;
  chainOfCustody: ChainOfCustody[];
  atomicFacts: AtomicFact[];
  contradictions: Contradiction[];
  createdAt: Date;
  updatedAt: Date;
  mintedAt?: Date;
  blockchainTx?: string;
}

export type EvidenceType =
  | "document"
  | "testimony"
  | "physical"
  | "digital"
  | "forensic"
  | "audio"
  | "video"
  | "image";

export type EvidenceStatus =
  | "pending"
  | "processing"
  | "validated"
  | "minted"
  | "archived"
  | "disputed";

export interface EvidenceMetadata {
  source?: string;
  author?: string;
  caseId?: string;
  tags?: string[];
  location?: {
    lat?: number;
    lon?: number;
    address?: string;
  };
  timestamp?: Date;
  hash?: string;
  size?: number;
  mimeType?: string;
}

export interface ChainOfCustody {
  id: string;
  evidenceId: string;
  action: "created" | "accessed" | "modified" | "transferred" | "validated";
  actor: string;
  timestamp: Date;
  details?: string;
  signature?: string;
}

export interface AtomicFact {
  id: string;
  evidenceId: string;
  fact: string;
  confidence: number; // 0.0 - 1.0
  source: string;
  extractedBy: "human" | "ai" | "system";
  timestamp: Date;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface Contradiction {
  id: string;
  factId1: string;
  factId2: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  resolvedAt?: Date;
  resolution?: string;
}

// ChittyID Types
export interface ChittyIDConfig {
  namespace: string;
  remoteOnly?: boolean;
  validationCache?: {
    enabled?: boolean;
    ttl?: number;
  };
  auditLog?: {
    enabled?: boolean;
    destination?: "database" | "file" | "cloudflare";
  };
}

export interface ChittyIDMetadata {
  id: string;
  namespace: string;
  createdAt: Date;
  validatedAt?: Date;
  mintedAt?: Date;
  lifecycle: "generated" | "validated" | "soft-minted" | "hard-minted";
  immutable: boolean;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// MCP Tool Types
export interface ChittyTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any) => Promise<any>;
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// Export all types
export type { ChittySchema } from "./index";
