/**
 * RegistryClient - Client for communicating with ChittyRegistry service
 * Validates resources and retrieves service information
 */

export class RegistryClient {
  constructor(env) {
    this.env = env;
    this.serviceUrl = env.REGISTRY_SERVICE_URL || "https://registry.chitty.cc";
  }

  /**
   * Check if a resource exists in the registry
   */
  async resourceExists(resource) {
    if (!resource || typeof resource !== "string") {
      return false;
    }

    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services/${resource}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error checking resource existence:", error);
      // In production, fail closed for security
      return false;
    }
  }

  /**
   * Get resource details from registry
   */
  async getResourceDetails(resource) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services/${resource}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting resource details:", error);
      return null;
    }
  }

  /**
   * Get resource access requirements
   */
  async getAccessRequirements(resource) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services/${resource}/access-requirements`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
        },
      );

      if (!response.ok) {
        // Default to basic read permission if not specified
        return {
          default_permissions: ["read"],
          required_trust_level: 0,
        };
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting access requirements:", error);
      return {
        default_permissions: ["read"],
        required_trust_level: 0,
      };
    }
  }

  /**
   * List all available resources
   */
  async listResources() {
    try {
      const response = await fetch(`${this.serviceUrl}/v1/services`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.services || [];
    } catch (error) {
      console.error("Error listing resources:", error);
      return [];
    }
  }

  /**
   * Get resources by category
   */
  async getResourcesByCategory(category) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services?category=${category}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.services || [];
    } catch (error) {
      console.error("Error getting resources by category:", error);
      return [];
    }
  }

  /**
   * Register a new resource (for services to self-register)
   */
  async registerResource(resourceData) {
    try {
      const response = await fetch(`${this.serviceUrl}/v1/services/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
        },
        body: JSON.stringify(resourceData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registration failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error registering resource:", error);
      throw error;
    }
  }

  /**
   * Get health status of a resource
   */
  async getResourceHealth(resource) {
    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services/${resource}/health`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
        },
      );

      if (!response.ok) {
        return {
          healthy: false,
          status: "unknown",
        };
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting resource health:", error);
      return {
        healthy: false,
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Batch check multiple resources
   */
  async batchResourceCheck(resources) {
    if (!Array.isArray(resources) || resources.length === 0) {
      return {};
    }

    try {
      const response = await fetch(
        `${this.serviceUrl}/v1/services/batch-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.env.REGISTRY_API_KEY || ""}`,
          },
          body: JSON.stringify({ resources }),
        },
      );

      if (!response.ok) {
        // Fallback to individual checks
        const results = {};
        for (const resource of resources) {
          results[resource] = await this.resourceExists(resource);
        }
        return results;
      }

      const result = await response.json();
      return result.resources || {};
    } catch (error) {
      console.error("Error in batch resource check:", error);
      // Fallback to individual checks
      const results = {};
      for (const resource of resources) {
        results[resource] = false; // Fail closed on error
      }
      return results;
    }
  }
}
