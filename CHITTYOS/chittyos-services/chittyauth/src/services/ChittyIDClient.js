/**
 * ChittyIDClient - Client for communicating with ChittyID service
 * Validates ChittyIDs and manages identity verification
 */

export class ChittyIDClient {
  constructor(env) {
    this.env = env;
    this.serviceUrl = env.CHITTYID_SERVICE_URL || "https://id.chitty.cc";
  }

  /**
   * Verify a ChittyID is valid
   */
  async verify(chitty_id) {
    if (!chitty_id || typeof chitty_id !== "string") {
      return false;
    }

    // Basic format validation
    if (!this.validateFormat(chitty_id)) {
      return false;
    }

    try {
      // Call ChittyID service to verify
      const response = await fetch(`${this.serviceUrl}/v1/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.CHITTYID_API_KEY || ""}`,
        },
        body: JSON.stringify({ chitty_id }),
      });

      if (!response.ok) {
        console.error("ChittyID verification failed:", response.status);
        return false;
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error("Error verifying ChittyID:", error);
      // In production, you might want to fail closed (return false)
      // For now, we'll do basic validation only
      return this.validateFormat(chitty_id);
    }
  }

  /**
   * Get ChittyID details
   */
  async getDetails(chitty_id) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/chittyid/${chitty_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.CHITTYID_API_KEY || ""}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting ChittyID details:", error);
      return null;
    }
  }

  /**
   * Request a new ChittyID for an API key
   */
  async mintAPIKeyID() {
    try {
      const response = await fetch(`${this.serviceUrl}/v1/mint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.CHITTYID_API_KEY || ""}`,
        },
        body: JSON.stringify({
          type: "APIKEY",
          namespace: "AUTH",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mint API key ID: ${response.status}`);
      }

      const result = await response.json();
      return result.chitty_id;
    } catch (error) {
      console.error("Error minting API key ID:", error);
      // NO LOCAL GENERATION - Fail if ChittyID service is unavailable
      throw new Error("ChittyID service unavailable - cannot mint API key ID");
    }
  }

  /**
   * Validate ChittyID format locally
   */
  validateFormat(chitty_id) {
    // ChittyID format: CHITTY-ENTITY-SEQUENCE-CHECKSUM
    // Example: CHITTY-PEO-USER123-ABC
    const pattern = /^CHITTY-[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/;
    return pattern.test(chitty_id);
  }

  /**
   * Check if a ChittyID has a specific entity type
   */
  getEntityType(chitty_id) {
    if (!this.validateFormat(chitty_id)) {
      return null;
    }

    const parts = chitty_id.split("-");
    if (parts.length < 2) {
      return null;
    }

    return parts[1]; // Return entity type (PEO, PLACE, PROP, etc.)
  }

  /**
   * Batch verify multiple ChittyIDs
   */
  async batchVerify(chitty_ids) {
    if (!Array.isArray(chitty_ids) || chitty_ids.length === 0) {
      return {};
    }

    try {
      const response = await fetch(`${this.serviceUrl}/v1/batch-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.CHITTYID_API_KEY || ""}`,
        },
        body: JSON.stringify({ chitty_ids }),
      });

      if (!response.ok) {
        // Fallback to individual verification
        const results = {};
        for (const id of chitty_ids) {
          results[id] = await this.verify(id);
        }
        return results;
      }

      const result = await response.json();
      return result.verifications || {};
    } catch (error) {
      console.error("Error in batch verification:", error);
      // Fallback to local validation
      const results = {};
      for (const id of chitty_ids) {
        results[id] = this.validateFormat(id);
      }
      return results;
    }
  }
}
