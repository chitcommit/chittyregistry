/**
 * APIKeyService - Manages API key generation and validation
 * Uses Cloudflare's crypto for secure key generation
 */

export class APIKeyService {
  constructor(env) {
    this.env = env;
    this.kv = env.AUTH_TOKENS; // KV namespace for API keys
  }

  /**
   * Generate a new API key using ChittyID + Cloudflare randomness beacon
   */
  async generateKey({ chitty_id, name, scopes }) {
    // Use ChittyID + Cloudflare randomness beacon to generate API key
    const beacon = crypto.getRandomValues(new Uint8Array(32));
    const timestamp = Date.now();

    // Create deterministic yet secure API key from ChittyID + beacon
    const keyMaterial = new TextEncoder().encode(
      `${chitty_id}:${Array.from(beacon).join("")}:${timestamp}`,
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyMaterial);
    const hashArray = new Uint8Array(hashBuffer);

    const apiKey = `sk_live_${btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")}`;

    // No separate key ID - ChittyID is the identifier, API key is the secret

    // Store API key data in KV
    const keyData = {
      chitty_id,
      name,
      scopes,
      active: true,
      created_at: new Date().toISOString(),
      last_used: null,
    };

    // Store with API key as key for fast lookup
    await this.kv.put(apiKey, JSON.stringify(keyData), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year
    });

    // Also store by ChittyID for management
    await this.kv.put(`chitty:${chitty_id}`, apiKey, {
      expirationTtl: 60 * 60 * 24 * 365,
    });

    return {
      id: `key_${Date.now()}`,
      key: apiKey,
      chitty_id: chitty_id,
      name,
      scopes,
      created_at: keyData.created_at,
    };
  }

  /**
   * Validate an API key
   */
  async validateKey(apiKey) {
    if (!apiKey || !apiKey.startsWith("sk_live_")) {
      return {
        valid: false,
        error: "Invalid API key format",
      };
    }

    // Lookup key data in KV
    const keyDataStr = await this.kv.get(apiKey);

    if (!keyDataStr) {
      return {
        valid: false,
        error: "API key not found",
      };
    }

    const keyData = JSON.parse(keyDataStr);

    // Check if key is active
    if (!keyData.active) {
      return {
        valid: false,
        error: "API key is inactive",
      };
    }

    // Update last used timestamp
    keyData.last_used = new Date().toISOString();
    await this.kv.put(apiKey, JSON.stringify(keyData), {
      expirationTtl: 60 * 60 * 24 * 365,
    });

    return {
      valid: true,
      chitty_id: keyData.chitty_id,
      scopes: keyData.scopes,
      created_at: keyData.created_at,
    };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(apiKey) {
    const keyDataStr = await this.kv.get(apiKey);

    if (!keyDataStr) {
      return {
        success: false,
        error: "API key not found",
      };
    }

    const keyData = JSON.parse(keyDataStr);
    keyData.active = false;
    keyData.revoked_at = new Date().toISOString();

    await this.kv.put(apiKey, JSON.stringify(keyData), {
      expirationTtl: 60 * 60 * 24 * 30, // Keep for 30 days for audit
    });

    return {
      success: true,
      revoked_at: keyData.revoked_at,
    };
  }

  /**
   * List all API keys for a ChittyID
   */
  async listKeys(chitty_id) {
    const keyListStr = await this.kv.get(`chitty:${chitty_id}:keys`);

    if (!keyListStr) {
      return [];
    }

    const keyIds = JSON.parse(keyListStr);
    const keys = [];

    for (const keyId of keyIds) {
      const apiKey = await this.kv.get(`id:${keyId}`);
      if (apiKey) {
        const keyDataStr = await this.kv.get(apiKey);
        if (keyDataStr) {
          const keyData = JSON.parse(keyDataStr);
          keys.push({
            id: keyData.id,
            name: keyData.name,
            scopes: keyData.scopes,
            active: keyData.active,
            created_at: keyData.created_at,
            last_used: keyData.last_used,
          });
        }
      }
    }

    return keys;
  }

  /**
   * Helper: Add key to ChittyID's key list
   */
  async addKeyToChittyID(chitty_id, keyId) {
    const keyListStr = await this.kv.get(`chitty:${chitty_id}:keys`);
    const keyList = keyListStr ? JSON.parse(keyListStr) : [];

    if (!keyList.includes(keyId)) {
      keyList.push(keyId);
      await this.kv.put(`chitty:${chitty_id}:keys`, JSON.stringify(keyList));
    }
  }
}
