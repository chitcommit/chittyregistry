/**
 * Basic Functionality Test
 * Validates core ChittySchema functionality without external dependencies
 */

import { describe, it, expect } from "@jest/globals";
import { isValidChittyId, extractNamespace } from "../src/lib/chittyid";
import { tables } from "../src/lib/db-simple";

describe("ChittySchema Basic Functionality", () => {
  describe("ChittyID Module", () => {
    it("should validate ChittyID format", async () => {
      // Test valid formats
      const validSimple = "CHITTY-PROP-123456-ABCD1234";
      const validOfficial = "CP-A-ABC-2024-P-0001-A-01";

      expect(await isValidChittyId(validSimple)).toBe(true);
      expect(await isValidChittyId(validOfficial)).toBe(true);
    });

    it("should reject invalid ChittyID format", async () => {
      const invalid = "INVALID-ID-FORMAT";
      expect(await isValidChittyId(invalid)).toBe(false);
    });

    it("should extract namespace from ChittyID", () => {
      const propId = "CHITTY-PROP-123456-ABCD1234";
      const peoId = "CHITTY-PEO-654321-DCBA4321";

      expect(extractNamespace(propId)).toBe("PROP");
      expect(extractNamespace(peoId)).toBe("PEO");
    });

    it("should throw error for synchronous ChittyID generation", () => {
      expect(() => {
        const { chittyIdSync } = require("../src/lib/chittyid");
        chittyIdSync("PROP", "test");
      }).toThrow("Synchronous ChittyID generation is prohibited");
    });
  });

  describe("Database Schema", () => {
    it("should have required table definitions", () => {
      expect(tables.users).toBeDefined();
      expect(tables.cases).toBeDefined();
      expect(tables.masterEvidence).toBeDefined();
      expect(tables.atomicFacts).toBeDefined();
      expect(tables.chainOfCustody).toBeDefined();
    });

    it("should have correct table structure", () => {
      // Check users table has required fields
      const usersConfig = (tables.users as any).config;
      expect(usersConfig).toBeDefined();

      // Check cases table has required fields
      const casesConfig = (tables.cases as any).config;
      expect(casesConfig).toBeDefined();
    });
  });

  describe("Service Client Architecture", () => {
    it("should have ChittyVerify client available", () => {
      const { chittyVerifyClient } = require("../src/lib/chittyverify-client");
      expect(chittyVerifyClient).toBeDefined();
      expect(typeof chittyVerifyClient.verifyEvidence).toBe("function");
      expect(typeof chittyVerifyClient.healthCheck).toBe("function");
    });

    it("should have ChittyCheck client available", () => {
      const { chittyCheckClient } = require("../src/lib/chittycheck-client");
      expect(chittyCheckClient).toBeDefined();
      expect(typeof chittyCheckClient.validateEvidence).toBe("function");
      expect(typeof chittyCheckClient.validateChittyID).toBe("function");
    });

    it("should have ChittyRouter client available", () => {
      const { ChittyRouterClient } = require("../src/lib/chittyrouter-client");
      expect(ChittyRouterClient).toBeDefined();

      const client = new ChittyRouterClient();
      expect(typeof client.analyzeDocument).toBe("function");
    });
  });

  describe("§36 Compliance", () => {
    it("should enforce no local ChittyID generation", async () => {
      // Attempting to generate ChittyID should require Foundation service
      const { chittyId } = require("../src/lib/chittyid");

      // Without proper token, this should fail
      if (!process.env.CHITTY_ID_TOKEN) {
        await expect(chittyId("PROP", "test")).rejects.toThrow(
          "ChittyID generation requires Foundation service",
        );
      }
    });

    it("should have service resolution pattern", () => {
      // Check that service-orchestrated evidence route exists
      const fs = require("fs");
      const path = require("path");

      const routePath = path.join(
        __dirname,
        "../src/routes/service-orchestrated-evidence.ts",
      );
      expect(fs.existsSync(routePath)).toBe(true);

      // Check it contains the resolve function
      const content = fs.readFileSync(routePath, "utf8");
      expect(content).toContain("async function resolve(service: string)");
      expect(content).toContain("CHITTY_REGISTRY_URL");
    });

    it("should have complete service chain validation", () => {
      // Check for all required service clients
      const verifyClientPath = require.resolve(
        "../src/lib/chittyverify-client",
      );
      const checkClientPath = require.resolve("../src/lib/chittycheck-client");
      const routerClientPath = require.resolve(
        "../src/lib/chittyrouter-client",
      );

      expect(verifyClientPath).toBeDefined();
      expect(checkClientPath).toBeDefined();
      expect(routerClientPath).toBeDefined();
    });
  });
});

describe("ChittySchema Integration Points", () => {
  it("should export required modules", () => {
    // Test that main exports are available
    const dbSimple = require("../src/lib/db-simple");
    expect(dbSimple.db).toBeDefined();
    expect(dbSimple.tables).toBeDefined();
    expect(dbSimple.execute).toBeDefined();
  });

  it("should have AI analysis migration ready", () => {
    const fs = require("fs");
    const path = require("path");

    const migrationPath = path.join(
      __dirname,
      "../db/migrations/add-ai-analysis-tables.sql",
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const content = fs.readFileSync(migrationPath, "utf8");
    expect(content).toContain("ai_analysis_sessions");
    expect(content).toContain("ai_comparative_analysis");
    expect(content).toContain("ai_model_performance");
    expect(content).toContain("routing_method TEXT DEFAULT 'CHITTYROUTER'");
  });
});
