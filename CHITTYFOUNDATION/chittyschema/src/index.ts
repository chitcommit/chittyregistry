import express from "express";
import "dotenv/config";
import propertyRoutes from "./routes/property";
import casesRoutes from "./routes/cases";
import evidenceRoutes from "./routes/evidence";
import factsRoutes from "./routes/facts";
import aiEvidenceRoutes from "./routes/ai-evidence";
import syncRoutes from "./routes/sync";
import topicsRoutes from "./routes/topics";
import neutralRoutes from "./routes/neutral";
import serviceOrchestratedEvidenceRoutes from "./routes/service-orchestrated-evidence";
import { chittyos } from "./lib/chittyos/integration.js";
import { analytics, analyticsMiddleware } from "./lib/monitoring/analytics.js";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ChittyOS Integration
app.use(chittyos.middleware());

// Analytics tracking
app.use(analyticsMiddleware());

// CORS headers (configure as needed for production)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
  return;
});

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (_req, res) => {
  const statusReport = chittyos.getStatusReport();
  res.json({
    ok: true,
    service: "ChittyChain Universal Data Framework",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: process.env.DATABASE_URL
      ? "PostgreSQL (Neutral Schema)"
      : "SQLite",
    framework: "Neutralized and Domain-Agnostic",
    chittyos: statusReport,
  });
});

// ChittyOS status endpoint
app.get("/chittyos/status", (_req, res) => {
  res.json(chittyos.getStatusReport());
});

// Analytics endpoints
app.get("/analytics/metrics", (_req, res) => {
  res.json(analytics.getMetrics());
});

app.get("/analytics/summary", (_req, res) => {
  res.json(analytics.getSummary());
});

app.get("/analytics/report", (_req, res) => {
  res.json(analytics.generateReport());
});

// API routes
app.use("/api/v1/property", propertyRoutes);
app.use("/api/v1/cases", casesRoutes);
app.use("/api/v1/evidence", evidenceRoutes);
app.use("/api/v1/evidence/service", serviceOrchestratedEvidenceRoutes);
app.use("/api/v1/facts", factsRoutes);
app.use("/api/v1/ai-evidence", aiEvidenceRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/topics", topicsRoutes);
app.use("/api/v1/neutral", neutralRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    service: "ChittyChain Universal Data Framework",
    version: "0.1.0",
    schema: "Neutralized - Universal Domain Support",
    endpoints: {
      health: "/health",
      cases: "/api/v1/cases",
      evidence: "/api/v1/evidence",
      evidenceServiceOrchestrated: "/api/v1/evidence/service/ingest",
      facts: "/api/v1/facts",
      property: "/api/v1/property",
      aiEvidence: "/api/v1/ai-evidence",
      sync: "/api/v1/sync",
      topics: "/api/v1/topics",
      neutral: "/api/v1/neutral",
    },
    documentation: "See README.md and NEUTRAL_FOUNDATIONS.md",
    neutralFramework: "Universal data management across all domains",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

// Error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message || "An unexpected error occurred",
    });
  },
);

// Start server
app.listen(port, async () => {
  const dbProvider = process.env.DATABASE_PROVIDER || "postgres";
  const dbHost =
    process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "Not configured";

  console.log(`
╔════════════════════════════════════════════════════╗
║   ChittyChain Universal Data Framework - Neutral   ║
╠════════════════════════════════════════════════════╣
║  Service:    Running on http://localhost:${port}      ║
║  Database:   PostgreSQL (${dbProvider})                  ║
║  Host:       ${dbHost}              ║
║  Environment: ${process.env.NODE_ENV || "development"}                             ║
║  ChittyOS:   Framework v1.0.1 (Session: ${chittyos.getSessionId().slice(0, 8)})   ║
╚════════════════════════════════════════════════════╝

Ready for universal data management with ChittyID namespaces:
- PEO (People/Entities)  - PLACE (Locations)    - PROP (Objects/Assets)
- EVNT (Events/Actions)  - AUTH (Authorities)   - INFO (Information)
- FACT (Atomic Facts)    - CONTEXT (Projects)   - ACTOR (System Users)

Endpoints available:
- GET  /health                          - System health check
- GET  /api/v1/cases/:id/summary        - Case summary with counts
- POST /api/v1/evidence                 - Submit new evidence
- POST /api/v1/facts                    - Create atomic fact
- GET  /api/v1/property/pin/:pin/ownership - Property ownership data
- GET  /api/v1/property/pin/:pin/tax-trend - Tax assessment history
- POST /api/v1/ai-evidence/analyze - AI-powered evidence analysis
- POST /api/v1/ai-evidence/process-deposition - AI deposition processing
- POST /api/v1/ai-evidence/verify-document - AI document verification
- POST /api/v1/sync/session/start - Start evidence sync session
- POST /api/v1/sync/notion/facts - Direct Notion sync
- POST /api/v1/topics/extract/evidence/:id - Extract topics from evidence
- POST /api/v1/topics/extract/facts - Extract topics from facts
- GET  /api/v1/neutral/entities/:type - Get entities by type (neutral)
- GET  /api/v1/neutral/information/tier/:tier - Get information by tier
- GET  /api/v1/neutral/facts/classification/:class - Get facts by classification
- GET  /api/v1/neutral/analytics/summary - Universal analytics summary

Press Ctrl+C to stop the server
`);

  // Register with ChittyOS ecosystem
  try {
    await chittyos.registerWithRegistry();

    // Start heartbeat to maintain registry presence
    chittyos.startHeartbeat(60000); // Every minute
  } catch (error) {
    console.warn("⚠️  ChittyOS registration failed:", error);
  }
});
