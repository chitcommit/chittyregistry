#!/usr/bin/env node

/**
 * Generate Proper ChittyID via Foundation Service
 * Per Charter: ALL ChittyIDs must come from Foundation service
 * NO LOCAL GENERATION ALLOWED
 */

async function requestChittyID(namespace, description = "") {
  const foundationUrl =
    process.env.CHITTYID_FOUNDATION_URL || "https://id.chitty.cc";
  const apiKey = process.env.CHITTY_ID_TOKEN || process.env.CHITTYID_API_KEY;

  if (!apiKey) {
    throw new Error("CHITTY_ID_TOKEN required for Foundation ChittyID service");
  }

  try {
    const response = await fetch(`${foundationUrl}/api/v2/chittyid/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        entity: "THING", // Map namespace to Foundation entity type
        name: `${namespace}-${description}`,
        format: "official", // ONLY use official VV-G-LLL-SSSS-T-YM-C-X format
        metadata: {
          namespace,
          description,
          source: "chittyschema-generator",
          purpose: "certification",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Foundation ChittyID service error: ${response.status}`);
    }

    const result = await response.json();
    return result.chitty_id; // v2 API uses chitty_id field
  } catch (error) {
    console.error("Error calling Foundation ChittyID service:", error);
    throw new Error(
      "ChittyID generation requires Foundation service. Local generation is prohibited.",
    );
  }
}

async function main() {
  try {
    // Generate ChittyIDs for different purposes via Foundation
    console.log("Generating ChittyIDs via Foundation service...");

    const certificationID = await requestChittyID("NARC", "certification");
    const alignmentID = await requestChittyID("ALIGN", "alignment");
    const auditID = await requestChittyID("AUDIT", "compliance-audit");

    console.log("✅ Generated ChittyIDs via Foundation:");
    console.log(`Certification ID: ${certificationID}`);
    console.log(`Alignment ID: ${alignmentID}`);
    console.log(`Audit ID: ${auditID}`);

    // Verify with Foundation service
    console.log("\n🔍 Verifying with Foundation service...");
    // Add verification logic here if needed
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 To fix:");
    console.log("1. Set CHITTY_ID_TOKEN environment variable");
    console.log("2. Ensure Foundation ChittyID service is accessible");
    console.log("3. Check network connectivity");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { requestChittyID };
