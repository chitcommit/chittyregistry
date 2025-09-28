#!/usr/bin/env tsx
/**
 * Complete ChittyOS Service List for Dual-Access Architecture
 * Total: 35 Services across 13 categories
 */

export interface ChittyService {
  id: string;
  name: string;
  subdomain: string;
  workerName: string;
  gatewayPath: string;
  directAccess: boolean;
  partnerOnly?: boolean;
  category: string;
  status: "active" | "beta" | "development";
  version: string;
}

export const CHITTY_SERVICES: ChittyService[] = [
  // Core Services (2)
  {
    id: "chittyschema-core",
    name: "ChittySchema Core Service",
    subdomain: "schema",
    workerName: "chitty-schema",
    gatewayPath: "/api/schema",
    directAccess: true,
    category: "core",
    status: "active",
    version: "1.0.0",
  },
  {
    id: "schema-propagation",
    name: "Schema Propagation Service",
    subdomain: "propagate",
    workerName: "chitty-propagate",
    gatewayPath: "/api/propagate",
    directAccess: true,
    category: "core",
    status: "active",
    version: "1.0.0",
  },

  // Blockchain Services (3)
  {
    id: "chittyledger",
    name: "ChittyLedger",
    subdomain: "chain",
    workerName: "chitty-chain",
    gatewayPath: "/api/chain",
    directAccess: true,
    partnerOnly: true, // Direct access only for blockchain operations
    category: "blockchain",
    status: "active",
    version: "0.1.0",
  },
  {
    id: "ledger-api",
    name: "Ledger Query API",
    subdomain: "ledger",
    workerName: "chitty-ledger",
    gatewayPath: "/api/ledger",
    directAccess: true,
    category: "blockchain",
    status: "active",
    version: "1.0.0",
  },
  {
    id: "custody-tracker",
    name: "Chain of Custody Tracker",
    subdomain: "custody",
    workerName: "chitty-custody",
    gatewayPath: "/api/custody",
    directAccess: true,
    category: "blockchain",
    status: "active",
    version: "1.2.0",
  },

  // Infrastructure Services (5)
  {
    id: "chitty-registry",
    name: "ChittyOS Service Registry",
    subdomain: "registry",
    workerName: "chitty-registry",
    gatewayPath: "/api/registry",
    directAccess: true,
    category: "infrastructure",
    status: "active",
    version: "2.0.0",
  },
  {
    id: "chitty-router",
    name: "ChittyRouter API Gateway",
    subdomain: "router",
    workerName: "chitty-router",
    gatewayPath: "/api/router",
    directAccess: true,
    category: "infrastructure",
    status: "active",
    version: "1.8.0",
  },
  {
    id: "backup-service",
    name: "Backup & Recovery Service",
    subdomain: "backup",
    workerName: "chitty-backup",
    gatewayPath: "/api/backup",
    directAccess: true,
    category: "infrastructure",
    status: "active",
    version: "2.0.0",
  },
  {
    id: "cache-manager",
    name: "Distributed Cache Manager",
    subdomain: "cache",
    workerName: "chitty-cache",
    gatewayPath: "/api/cache",
    directAccess: true,
    category: "infrastructure",
    status: "active",
    version: "2.5.0",
  },
  {
    id: "queue-service",
    name: "Message Queue Service",
    subdomain: "queue",
    workerName: "chitty-queue",
    gatewayPath: "/api/queue",
    directAccess: true,
    category: "infrastructure",
    status: "active",
    version: "3.0.0",
  },

  // Integration Services (2)
  {
    id: "notion-sync",
    name: "Notion Sync Service",
    subdomain: "sync",
    workerName: "chitty-sync",
    gatewayPath: "/api/sync",
    directAccess: true,
    category: "integration",
    status: "active",
    version: "1.2.0",
  },
  {
    id: "mcp-sync",
    name: "MCP Context Sync",
    subdomain: "mcp",
    workerName: "chitty-mcp",
    gatewayPath: "/api/mcp",
    directAccess: true,
    category: "integration",
    status: "development",
    version: "0.1.0",
  },

  // Data Services (1)
  {
    id: "property-connector",
    name: "Cook County Property Connector",
    subdomain: "property",
    workerName: "chitty-property",
    gatewayPath: "/api/property",
    directAccess: true,
    category: "data-connector",
    status: "active",
    version: "1.0.0",
  },

  // AI Services (2)
  {
    id: "ai-evidence-analyzer",
    name: "AI Evidence Analysis Service",
    subdomain: "ai",
    workerName: "chitty-ai",
    gatewayPath: "/api/ai",
    directAccess: true,
    category: "ai",
    status: "beta",
    version: "0.5.0",
  },
  {
    id: "ml-classifier",
    name: "Machine Learning Classifier",
    subdomain: "ml",
    workerName: "chitty-ml",
    gatewayPath: "/api/ml",
    directAccess: true,
    category: "ai",
    status: "beta",
    version: "0.6.0",
  },

  // Security Services (3)
  {
    id: "chitty-auth",
    name: "ChittyOS Authentication Service",
    subdomain: "auth",
    workerName: "chitty-auth",
    gatewayPath: "/api/auth",
    directAccess: true,
    category: "security",
    status: "active",
    version: "3.0.0",
  },
  {
    id: "trust-verifier",
    name: "Trust & Verification Service",
    subdomain: "trust",
    workerName: "chitty-trust",
    gatewayPath: "/api/trust",
    directAccess: true,
    category: "security",
    status: "active",
    version: "1.5.0",
  },
  {
    id: "rate-limiter",
    name: "Rate Limiting Service",
    subdomain: "ratelimit",
    workerName: "chitty-ratelimit",
    gatewayPath: "/api/ratelimit",
    directAccess: true,
    category: "security",
    status: "active",
    version: "1.2.0",
  },

  // Identity Service (1)
  {
    id: "chitty-id",
    name: "ChittyID Management Service",
    subdomain: "id",
    workerName: "chitty-id",
    gatewayPath: "/api/id",
    directAccess: true,
    category: "identity",
    status: "active",
    version: "2.1.0",
  },

  // Verification Service (1)
  {
    id: "verify-service",
    name: "Document Verification Service",
    subdomain: "verify",
    workerName: "chitty-verify",
    gatewayPath: "/api/verify",
    directAccess: true,
    category: "verification",
    status: "active",
    version: "2.0.0",
  },

  // Analytics Service (1)
  {
    id: "contradiction-engine",
    name: "Contradiction Detection Engine",
    subdomain: "contradict",
    workerName: "chitty-contradict",
    gatewayPath: "/api/contradict",
    directAccess: true,
    category: "analytics",
    status: "beta",
    version: "0.8.0",
  },

  // Processing Services (3)
  {
    id: "fact-extractor",
    name: "Atomic Fact Extraction Service",
    subdomain: "facts",
    workerName: "chitty-facts",
    gatewayPath: "/api/facts",
    directAccess: true,
    category: "processing",
    status: "active",
    version: "1.3.0",
  },
  {
    id: "batch-processor",
    name: "Batch Processing Service",
    subdomain: "batch",
    workerName: "chitty-batch",
    gatewayPath: "/api/batch",
    directAccess: true,
    category: "processing",
    status: "active",
    version: "2.0.0",
  },
  {
    id: "ocr-service",
    name: "OCR Document Processing",
    subdomain: "ocr",
    workerName: "chitty-ocr",
    gatewayPath: "/api/ocr",
    directAccess: true,
    category: "processing",
    status: "active",
    version: "1.1.0",
  },

  // Legal Service (1)
  {
    id: "case-manager",
    name: "Case Management System",
    subdomain: "cases",
    workerName: "chitty-cases",
    gatewayPath: "/api/cases",
    directAccess: true,
    category: "legal",
    status: "active",
    version: "2.5.0",
  },

  // Compliance Service (1)
  {
    id: "audit-logger",
    name: "Audit Trail Service",
    subdomain: "audit",
    workerName: "chitty-audit",
    gatewayPath: "/api/audit",
    directAccess: true,
    category: "compliance",
    status: "active",
    version: "3.1.0",
  },

  // Events Service (1)
  {
    id: "webhook-dispatcher",
    name: "Webhook Event Dispatcher",
    subdomain: "webhooks",
    workerName: "chitty-webhooks",
    gatewayPath: "/api/webhooks",
    directAccess: true,
    category: "events",
    status: "active",
    version: "1.0.0",
  },

  // Search Service (1)
  {
    id: "search-indexer",
    name: "Search & Indexing Service",
    subdomain: "search",
    workerName: "chitty-search",
    gatewayPath: "/api/search",
    directAccess: true,
    category: "search",
    status: "active",
    version: "1.5.0",
  },

  // Communication Service (1)
  {
    id: "notification-hub",
    name: "Notification Hub",
    subdomain: "notify",
    workerName: "chitty-notify",
    gatewayPath: "/api/notify",
    directAccess: true,
    category: "communication",
    status: "active",
    version: "2.2.0",
  },

  // Reporting Service (1)
  {
    id: "report-generator",
    name: "Report Generation Service",
    subdomain: "reports",
    workerName: "chitty-reports",
    gatewayPath: "/api/reports",
    directAccess: true,
    category: "reporting",
    status: "active",
    version: "1.8.0",
  },

  // Automation Service (1)
  {
    id: "workflow-engine",
    name: "Workflow Automation Engine",
    subdomain: "workflow",
    workerName: "chitty-workflow",
    gatewayPath: "/api/workflow",
    directAccess: true,
    category: "automation",
    status: "beta",
    version: "1.0.0",
  },

  // Data Service (1)
  {
    id: "data-export",
    name: "Data Export Service",
    subdomain: "export",
    workerName: "chitty-export",
    gatewayPath: "/api/export",
    directAccess: true,
    category: "data",
    status: "active",
    version: "1.2.0",
  },

  // Monitoring Services (2)
  {
    id: "metrics-collector",
    name: "Metrics & Analytics Collector",
    subdomain: "metrics",
    workerName: "chitty-metrics",
    gatewayPath: "/api/metrics",
    directAccess: true,
    category: "monitoring",
    status: "active",
    version: "1.5.0",
  },
  {
    id: "health-monitor",
    name: "Health Monitoring Service",
    subdomain: "health",
    workerName: "chitty-health",
    gatewayPath: "/api/health",
    directAccess: true,
    category: "monitoring",
    status: "active",
    version: "1.0.0",
  },

  // Storage Service (1)
  {
    id: "storage-gateway",
    name: "Storage Gateway Service",
    subdomain: "storage",
    workerName: "chitty-storage",
    gatewayPath: "/api/storage",
    directAccess: true,
    category: "storage",
    status: "active",
    version: "1.8.0",
  },
];

// Service statistics
export const SERVICE_STATS = {
  total: 35,
  byStatus: {
    active: 29,
    beta: 4,
    development: 2,
  },
  byCategory: {
    core: 2,
    blockchain: 3,
    infrastructure: 5,
    integration: 2,
    "data-connector": 1,
    ai: 2,
    security: 3,
    identity: 1,
    verification: 1,
    analytics: 1,
    processing: 3,
    legal: 1,
    compliance: 1,
    events: 1,
    search: 1,
    communication: 1,
    reporting: 1,
    automation: 1,
    data: 1,
    monitoring: 2,
    storage: 1,
  },
};

// Export functions for service management
export function getServiceBySubdomain(
  subdomain: string,
): ChittyService | undefined {
  return CHITTY_SERVICES.find((s) => s.subdomain === subdomain);
}

export function getServicesByCategory(category: string): ChittyService[] {
  return CHITTY_SERVICES.filter((s) => s.category === category);
}

export function getActiveServices(): ChittyService[] {
  return CHITTY_SERVICES.filter((s) => s.status === "active");
}

export function getPartnerOnlyServices(): ChittyService[] {
  return CHITTY_SERVICES.filter((s) => s.partnerOnly === true);
}

export function getGatewayEnabledServices(): ChittyService[] {
  return CHITTY_SERVICES.filter((s) => !s.partnerOnly);
}

// Generate DNS records for all services
export function generateDNSRecords(): string[] {
  return CHITTY_SERVICES.map(
    (service) =>
      `${service.subdomain}.chitty.cc CNAME ${service.workerName}.workers.dev`,
  );
}

// Generate gateway routing configuration
export function generateGatewayRoutes() {
  return CHITTY_SERVICES.filter((s) => !s.partnerOnly).map((service) => ({
    path: service.gatewayPath,
    target: `https://${service.subdomain}.chitty.cc`,
    service: service.workerName,
    directAccessAllowed: service.directAccess,
  }));
}

if (require.main === module) {
  console.log("🚀 ChittyOS Complete Service List");
  console.log("==================================");
  console.log(`Total Services: ${SERVICE_STATS.total}`);
  console.log("\nServices by Status:");
  Object.entries(SERVICE_STATS.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log("\nServices by Category:");
  Object.entries(SERVICE_STATS.byCategory).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  console.log("\nAll Service URLs:");
  CHITTY_SERVICES.forEach((service) => {
    const access = service.partnerOnly ? " (Partner Only)" : "";
    console.log(
      `  https://${service.subdomain}.chitty.cc - ${service.name}${access}`,
    );
  });
}
