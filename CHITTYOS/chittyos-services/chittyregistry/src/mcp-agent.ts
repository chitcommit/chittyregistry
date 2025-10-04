// ChittyRegistry MCP Agent Integration
// Uses Cloudflare's MCP Agent API for stateful AI interactions

import { McpAgent } from '@cloudflare/mcp-agent-api';
import { RegistryService } from './services/RegistryService';
import { HealthMonitor } from './services/HealthMonitor';

export class ChittyRegistryMCPAgent extends McpAgent {
  private registry: RegistryService;
  private healthMonitor: HealthMonitor;

  constructor(registry: RegistryService, healthMonitor: HealthMonitor) {
    super();
    this.registry = registry;
    this.healthMonitor = healthMonitor;
  }

  async initialState() {
    return {
      lastQuery: null,
      favoriteServices: [],
      userPreferences: {
        includeUnhealthy: false,
        preferredCategories: ['ai-intelligence', 'core-infrastructure']
      },
      sessionStats: {
        queriesCount: 0,
        lastActiveTime: new Date().toISOString()
      }
    };
  }

  async getTools() {
    return [
      {
        name: "discover_chittyos_services",
        description: "Discover ChittyOS services by capability, category, or health status",
        inputSchema: {
          type: "object",
          properties: {
            capability: {
              type: "string",
              description: "Required capability (e.g., 'ai-integration', 'blockchain', 'identity-management')"
            },
            category: {
              type: "string",
              enum: [
                "core-infrastructure",
                "security-verification",
                "blockchain-infrastructure",
                "ai-intelligence",
                "document-evidence",
                "business-operations",
                "foundation-governance"
              ],
              description: "Service category filter"
            },
            healthStatus: {
              type: "string",
              enum: ["HEALTHY", "DEGRADED", "UNHEALTHY"],
              description: "Only return services with this health status"
            },
            includeUnhealthy: {
              type: "boolean",
              description: "Include unhealthy services in results",
              default: false
            }
          }
        }
      },
      {
        name: "get_service_details",
        description: "Get detailed information about a specific ChittyOS service",
        inputSchema: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description: "Name of the service (e.g., 'chittymcp', 'chittyid')",
              required: true
            }
          },
          required: ["serviceName"]
        }
      },
      {
        name: "check_ecosystem_health",
        description: "Get health overview of the entire ChittyOS ecosystem",
        inputSchema: {
          type: "object",
          properties: {
            detailed: {
              type: "boolean",
              description: "Include detailed health metrics for each service",
              default: false
            }
          }
        }
      },
      {
        name: "resolve_service_for_task",
        description: "Find the best ChittyOS service for a specific task or capability",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "Description of the task (e.g., 'generate identity token', 'store evidence', 'verify document')",
              required: true
            },
            requirements: {
              type: "object",
              properties: {
                authentication: { type: "boolean", description: "Requires authentication" },
                blockchain: { type: "boolean", description: "Requires blockchain verification" },
                realtime: { type: "boolean", description: "Requires real-time processing" }
              }
            }
          },
          required: ["task"]
        }
      },
      {
        name: "monitor_service_health",
        description: "Monitor health status of specific services over time",
        inputSchema: {
          type: "object",
          properties: {
            services: {
              type: "array",
              items: { type: "string" },
              description: "List of service names to monitor"
            },
            alertThreshold: {
              type: "string",
              enum: ["DEGRADED", "UNHEALTHY"],
              description: "Alert when service health drops below this level",
              default: "UNHEALTHY"
            }
          }
        }
      },
      {
        name: "get_registry_stats",
        description: "Get comprehensive statistics about the ChittyOS service registry",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ];
  }

  async callTool(name: string, args: any) {
    // Update session stats
    const currentState = await this.state;
    await this.setState({
      ...currentState,
      sessionStats: {
        queriesCount: currentState.sessionStats.queriesCount + 1,
        lastActiveTime: new Date().toISOString()
      },
      lastQuery: { tool: name, args, timestamp: new Date().toISOString() }
    });

    switch (name) {
      case "discover_chittyos_services":
        return await this.discoverServices(args);

      case "get_service_details":
        return await this.getServiceDetails(args.serviceName);

      case "check_ecosystem_health":
        return await this.checkEcosystemHealth(args.detailed);

      case "resolve_service_for_task":
        return await this.resolveServiceForTask(args.task, args.requirements);

      case "monitor_service_health":
        return await this.monitorServiceHealth(args.services, args.alertThreshold);

      case "get_registry_stats":
        return await this.getRegistryStats();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async discoverServices(query: any) {
    const services = await this.registry.discoverServices({
      capability: query.capability,
      category: query.category,
      healthStatus: query.healthStatus,
      includeUnhealthy: query.includeUnhealthy || false
    });

    return {
      success: true,
      count: services.length,
      services: services.map(s => ({
        name: s.serviceName,
        displayName: s.displayName,
        description: s.description,
        url: s.baseUrl,
        category: s.category,
        capabilities: s.capabilities,
        health: (s as any).currentHealth?.status || 'UNKNOWN'
      })),
      query: query
    };
  }

  private async getServiceDetails(serviceName: string) {
    const service = await this.registry.getService(serviceName);

    if (!service) {
      return {
        success: false,
        error: `Service '${serviceName}' not found in registry`
      };
    }

    return {
      success: true,
      service: {
        name: service.serviceName,
        displayName: service.displayName,
        description: service.description,
        version: service.version,
        url: service.baseUrl,
        category: service.category,
        capabilities: service.capabilities,
        endpoints: service.endpoints,
        health: (service as any).currentHealth,
        metadata: service.metadata
      }
    };
  }

  private async checkEcosystemHealth(detailed: boolean = false) {
    const stats = await this.registry.getRegistryStats();

    const healthSummary = {
      totalServices: stats.totalServices,
      healthyServices: stats.healthyServices,
      healthPercentage: Math.round((stats.healthyServices / stats.totalServices) * 100),
      servicesByCategory: stats.servicesByCategory,
      authorityHealth: stats.authorityHealth
    };

    if (detailed) {
      // Get detailed health for all services
      const services = await this.registry.discoverServices({ includeUnhealthy: true });
      return {
        ...healthSummary,
        detailedHealth: services.map(s => ({
          name: s.serviceName,
          status: (s as any).currentHealth?.status || 'UNKNOWN',
          responseTime: (s as any).currentHealth?.responseTime || 0,
          uptime: (s as any).currentHealth?.uptime || 0
        }))
      };
    }

    return healthSummary;
  }

  private async resolveServiceForTask(task: string, requirements: any = {}) {
    // AI-powered task-to-service mapping
    const taskMappings = {
      'generate identity token': ['chittyid'],
      'authenticate user': ['chittyauth', 'chittyid'],
      'store evidence': ['chittyassets', 'chittychain'],
      'verify document': ['chittyverify', 'chittytrust'],
      'blockchain verification': ['chittychain', 'chittyoracle'],
      'monitor services': ['chittybeacon', 'chittymonitor'],
      'ai integration': ['chittymcp', 'chittyrouter'],
      'legal analysis': ['chittyintel', 'chittyforce'],
      'case management': ['chittychronicle', 'chittyflow'],
      'payment processing': ['chittypay', 'chittyfinance']
    };

    const taskLower = task.toLowerCase();
    let candidateServices: string[] = [];

    // Find matching services
    for (const [taskKey, services] of Object.entries(taskMappings)) {
      if (taskLower.includes(taskKey)) {
        candidateServices.push(...services);
      }
    }

    // Filter by requirements
    if (requirements.blockchain && candidateServices.length === 0) {
      candidateServices = ['chittychain', 'chittyoracle'];
    }
    if (requirements.authentication && candidateServices.length === 0) {
      candidateServices = ['chittyauth', 'chittyid'];
    }

    // Get healthy services from candidates
    const healthyServices = [];
    for (const serviceName of candidateServices) {
      const service = await this.registry.getService(serviceName);
      if (service && (service as any).currentHealth?.status === 'HEALTHY') {
        healthyServices.push(service);
      }
    }

    return {
      task,
      requirements,
      recommendedServices: healthyServices.map(s => ({
        name: s.serviceName,
        displayName: s.displayName,
        url: s.baseUrl,
        reason: `Matches task requirements for: ${task}`
      })),
      alternativeServices: candidateServices.filter(name =>
        !healthyServices.some(s => s.serviceName === name)
      )
    };
  }

  private async monitorServiceHealth(services: string[], alertThreshold: string) {
    const results = [];

    for (const serviceName of services) {
      const health = await this.healthMonitor.checkServiceNow(serviceName);
      const shouldAlert = health && (
        (alertThreshold === 'DEGRADED' && ['DEGRADED', 'UNHEALTHY'].includes(health.status)) ||
        (alertThreshold === 'UNHEALTHY' && health.status === 'UNHEALTHY')
      );

      results.push({
        service: serviceName,
        status: health?.status || 'UNKNOWN',
        responseTime: health?.responseTime || 0,
        alert: shouldAlert,
        lastCheck: health?.lastCheck || new Date().toISOString()
      });
    }

    return {
      monitoredServices: results,
      alertCount: results.filter(r => r.alert).length,
      timestamp: new Date().toISOString()
    };
  }

  private async getRegistryStats() {
    const stats = await this.registry.getRegistryStats();
    const monitoringStats = this.healthMonitor.getMonitoringStats();

    return {
      ...stats,
      monitoring: monitoringStats,
      ecosystem: {
        name: 'ChittyOS',
        version: '1.0.0',
        totalServices: 35,
        architecture: 'microservices',
        deployment: 'distributed'
      }
    };
  }

  async onStateUpdate(newState: any) {
    // Called when state changes - can trigger webhooks, notifications, etc.
    console.log('ChittyRegistry MCP Agent state updated:', {
      queriesCount: newState.sessionStats?.queriesCount,
      lastActiveTime: newState.sessionStats?.lastActiveTime
    });
  }
}