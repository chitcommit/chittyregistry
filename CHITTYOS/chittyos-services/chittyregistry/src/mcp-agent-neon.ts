// ChittyRegistry MCP Agent with Neon Database Integration
// Provides persistent, stateful AI interactions backed by Neon PostgreSQL

import { McpAgent } from '@cloudflare/mcp-agent-api';
import { NeonService } from './services/NeonService';
import { RegistryService } from './services/RegistryService';
import { HealthMonitor } from './services/HealthMonitor';

export class ChittyRegistryNeonMCPAgent extends McpAgent {
  private neon: NeonService;
  private registry: RegistryService;
  private healthMonitor: HealthMonitor;
  private sessionId: string;
  private userId: string;

  constructor(
    neon: NeonService,
    registry: RegistryService,
    healthMonitor: HealthMonitor,
    sessionId: string,
    userId: string = 'anonymous'
  ) {
    super();
    this.neon = neon;
    this.registry = registry;
    this.healthMonitor = healthMonitor;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async initialState() {
    // Try to load existing session from Neon
    const existingSession = await this.neon.getMCPSession(this.sessionId);

    if (existingSession) {
      return {
        ...existingSession.state,
        sessionRestored: true,
        restoredAt: new Date().toISOString()
      };
    }

    // Create new session state
    const initialState = {
      sessionId: this.sessionId,
      userId: this.userId,
      createdAt: new Date().toISOString(),
      lastQuery: null,
      favoriteServices: [],
      queryHistory: [],
      userPreferences: {
        includeUnhealthy: false,
        preferredCategories: ['ai-intelligence', 'core-infrastructure'],
        alertThresholds: {
          responseTime: 5000,
          healthStatus: 'DEGRADED'
        },
        analyticsEnabled: true
      },
      sessionStats: {
        queriesCount: 0,
        lastActiveTime: new Date().toISOString(),
        servicesQueried: new Set(),
        mostUsedTools: {}
      },
      insights: {
        recommendedServices: [],
        healthTrends: {},
        usagePatterns: {}
      }
    };

    // Save to Neon
    await this.neon.upsertMCPSession(
      this.sessionId,
      this.userId,
      initialState,
      initialState.userPreferences
    );

    return initialState;
  }

  async setState(newState: any) {
    // Persist state to Neon database
    await this.neon.upsertMCPSession(
      this.sessionId,
      this.userId,
      newState,
      newState.userPreferences || {}
    );

    return super.setState(newState);
  }

  async getTools() {
    return [
      {
        name: "discover_chittyos_services",
        description: "Discover ChittyOS services with intelligent filtering and personalized recommendations",
        inputSchema: {
          type: "object",
          properties: {
            capability: { type: "string", description: "Required capability" },
            category: {
              type: "string",
              enum: [
                "core-infrastructure", "security-verification", "blockchain-infrastructure",
                "ai-intelligence", "document-evidence", "business-operations", "foundation-governance"
              ]
            },
            healthStatus: { type: "string", enum: ["HEALTHY", "DEGRADED", "UNHEALTHY"] },
            includeUnhealthy: { type: "boolean", default: false },
            includeRecommendations: { type: "boolean", default: true, description: "Include personalized recommendations" }
          }
        }
      },
      {
        name: "get_service_analytics",
        description: "Get comprehensive analytics for ChittyOS services including usage trends and health history",
        inputSchema: {
          type: "object",
          properties: {
            serviceName: { type: "string", description: "Specific service to analyze" },
            timeframe: {
              type: "string",
              enum: ["1h", "24h", "7d", "30d"],
              default: "24h",
              description: "Analysis timeframe"
            },
            includeHealthTrends: { type: "boolean", default: true },
            includeUsageMetrics: { type: "boolean", default: true }
          }
        }
      },
      {
        name: "intelligent_service_recommendation",
        description: "Get AI-powered service recommendations based on user behavior and task requirements",
        inputSchema: {
          type: "object",
          properties: {
            task: { type: "string", required: true, description: "Task description" },
            context: {
              type: "object",
              properties: {
                urgency: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
                complexity: { type: "string", enum: ["simple", "moderate", "complex"], default: "moderate" },
                securityLevel: { type: "string", enum: ["public", "internal", "confidential"], default: "internal" }
              }
            },
            learningEnabled: { type: "boolean", default: true, description: "Learn from this interaction" }
          },
          required: ["task"]
        }
      },
      {
        name: "ecosystem_health_insights",
        description: "Get comprehensive ecosystem health insights with predictive analytics",
        inputSchema: {
          type: "object",
          properties: {
            depth: {
              type: "string",
              enum: ["summary", "detailed", "comprehensive"],
              default: "detailed"
            },
            includePredictions: { type: "boolean", default: true },
            includeAlerts: { type: "boolean", default: true }
          }
        }
      },
      {
        name: "personalized_dashboard",
        description: "Generate a personalized dashboard based on user preferences and activity",
        inputSchema: {
          type: "object",
          properties: {
            widgets: {
              type: "array",
              items: {
                type: "string",
                enum: ["favorites", "recent", "health", "analytics", "recommendations", "alerts"]
              },
              default: ["favorites", "health", "recent"]
            }
          }
        }
      },
      {
        name: "advanced_monitoring",
        description: "Set up advanced monitoring with custom alerts and thresholds",
        inputSchema: {
          type: "object",
          properties: {
            services: { type: "array", items: { type: "string" } },
            alertRules: {
              type: "object",
              properties: {
                responseTimeThreshold: { type: "number", default: 5000 },
                uptimeThreshold: { type: "number", default: 95 },
                errorRateThreshold: { type: "number", default: 5 }
              }
            },
            notificationChannels: {
              type: "array",
              items: {
                type: "string",
                enum: ["email", "webhook", "dashboard", "mcp"]
              },
              default: ["mcp"]
            }
          }
        }
      },
      {
        name: "export_registry_data",
        description: "Export registry data in various formats with filtering options",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["json", "csv", "yaml", "pdf"],
              default: "json"
            },
            includeHealthData: { type: "boolean", default: true },
            includeAnalytics: { type: "boolean", default: false },
            services: { type: "array", items: { type: "string" }, description: "Specific services to export" }
          }
        }
      }
    ];
  }

  async callTool(name: string, args: any) {
    const startTime = Date.now();
    let success = true;
    let result: any;

    try {
      // Update session activity
      const currentState = await this.state;
      const updatedStats = {
        ...currentState.sessionStats,
        queriesCount: currentState.sessionStats.queriesCount + 1,
        lastActiveTime: new Date().toISOString(),
        mostUsedTools: {
          ...currentState.sessionStats.mostUsedTools,
          [name]: (currentState.sessionStats.mostUsedTools[name] || 0) + 1
        }
      };

      await this.setState({
        ...currentState,
        sessionStats: updatedStats,
        lastQuery: { tool: name, args, timestamp: new Date().toISOString() }
      });

      // Execute tool
      switch (name) {
        case "discover_chittyos_services":
          result = await this.discoverServicesWithNeon(args);
          break;
        case "get_service_analytics":
          result = await this.getServiceAnalytics(args);
          break;
        case "intelligent_service_recommendation":
          result = await this.getIntelligentRecommendations(args);
          break;
        case "ecosystem_health_insights":
          result = await this.getEcosystemInsights(args);
          break;
        case "personalized_dashboard":
          result = await this.generatePersonalizedDashboard(args);
          break;
        case "advanced_monitoring":
          result = await this.setupAdvancedMonitoring(args);
          break;
        case "export_registry_data":
          result = await this.exportRegistryData(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

    } catch (error) {
      success = false;
      result = { error: error.message };
    }

    // Record usage analytics in Neon
    const responseTime = Date.now() - startTime;
    await this.neon.recordServiceUsage(
      'chittyregistry-mcp',
      this.userId,
      this.sessionId,
      name,
      args,
      responseTime,
      success
    );

    return result;
  }

  private async discoverServicesWithNeon(args: any) {
    // Get services from Neon with enhanced filtering
    const neonServices = await this.neon.getServices({
      category: args.category,
      capability: args.capability
    });

    // Get real-time health data
    const servicesWithHealth = await Promise.all(
      neonServices.map(async (service) => {
        const health = await this.registry.getHealthStatus(service.service_name);
        const healthHistory = await this.neon.getHealthHistory(service.service_name, 24);

        return {
          ...service,
          currentHealth: health,
          healthTrend: this.calculateHealthTrend(healthHistory),
          reliability: this.calculateReliability(healthHistory)
        };
      })
    );

    // Apply health filtering
    let filteredServices = servicesWithHealth;
    if (args.healthStatus && !args.includeUnhealthy) {
      filteredServices = servicesWithHealth.filter(s =>
        s.currentHealth?.status === args.healthStatus
      );
    }

    // Add personalized recommendations if requested
    if (args.includeRecommendations) {
      const currentState = await this.state;
      const recommendations = await this.generateRecommendations(
        filteredServices,
        currentState.queryHistory,
        currentState.favoriteServices
      );

      return {
        success: true,
        count: filteredServices.length,
        services: filteredServices,
        recommendations,
        personalizedInsights: {
          basedOnHistory: currentState.queryHistory.length > 0,
          favoriteMatches: recommendations.favoriteMatches || 0,
          newSuggestions: recommendations.newSuggestions || []
        }
      };
    }

    return {
      success: true,
      count: filteredServices.length,
      services: filteredServices
    };
  }

  private async getServiceAnalytics(args: any) {
    const timeframeDays = this.parseTimeframe(args.timeframe);

    // Get usage analytics from Neon
    const usageData = await this.neon.getUsageAnalytics(args.serviceName, timeframeDays);

    // Get health history if requested
    let healthData = null;
    if (args.includeHealthTrends && args.serviceName) {
      const healthHistory = await this.neon.getHealthHistory(
        args.serviceName,
        timeframeDays * 24
      );
      healthData = this.analyzeHealthTrends(healthHistory);
    }

    return {
      service: args.serviceName || 'all',
      timeframe: args.timeframe,
      usage: {
        totalRequests: usageData.reduce((sum, d) => sum + parseInt(d.total_requests), 0),
        avgResponseTime: this.calculateAverage(usageData, 'avg_response_time'),
        successRate: this.calculateSuccessRate(usageData),
        uniqueUsers: new Set(usageData.map(d => d.unique_users)).size,
        trends: usageData
      },
      health: healthData,
      insights: this.generateAnalyticsInsights(usageData, healthData)
    };
  }

  private async getIntelligentRecommendations(args: any) {
    const { task, context = {}, learningEnabled = true } = args;

    // Analyze task using NLP-like keyword matching
    const taskKeywords = task.toLowerCase().split(' ');
    const serviceScores = new Map();

    // Get all services from Neon
    const allServices = await this.neon.getServices();

    // Score services based on task relevance
    for (const service of allServices) {
      let score = 0;

      // Check description and capabilities
      const serviceText = `${service.description} ${JSON.stringify(service.capabilities)}`.toLowerCase();

      for (const keyword of taskKeywords) {
        if (serviceText.includes(keyword)) {
          score += 10;
        }
      }

      // Context-based scoring
      if (context.securityLevel === 'confidential' && service.category === 'security-verification') {
        score += 20;
      }
      if (context.urgency === 'high' && service.service_name.includes('force')) {
        score += 15;
      }

      if (score > 0) {
        serviceScores.set(service.service_name, { service, score });
      }
    }

    // Sort by score and get top recommendations
    const recommendations = Array.from(serviceScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ service, score }) => ({
        ...service,
        recommendationScore: score,
        reasoning: this.generateRecommendationReasoning(service, task, context)
      }));

    // Learn from interaction if enabled
    if (learningEnabled) {
      const currentState = await this.state;
      await this.setState({
        ...currentState,
        queryHistory: [
          ...currentState.queryHistory.slice(-19), // Keep last 20
          {
            task,
            context,
            recommendations: recommendations.map(r => r.service_name),
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    return {
      task,
      context,
      recommendations,
      confidence: recommendations.length > 0 ? recommendations[0].recommendationScore / 100 : 0,
      alternativeApproaches: this.suggestAlternativeApproaches(task, allServices)
    };
  }

  private async getEcosystemInsights(args: any) {
    const { depth = 'detailed', includePredictions = true, includeAlerts = true } = args;

    // Get comprehensive ecosystem data
    const stats = await this.registry.getRegistryStats();
    const authorityStatus = await this.neon.getLatestAuthorityStatus();
    const recentUsage = await this.neon.getUsageAnalytics(undefined, 7);

    const insights = {
      overview: {
        totalServices: stats.totalServices,
        healthyServices: stats.healthyServices,
        healthPercentage: Math.round((stats.healthyServices / stats.totalServices) * 100),
        authorityHealth: authorityStatus.length
      },
      trends: this.analyzeEcosystemTrends(recentUsage),
      categoriesHealth: stats.servicesByCategory
    };

    if (depth === 'comprehensive') {
      insights['detailedMetrics'] = await this.getDetailedEcosystemMetrics();
      insights['networkAnalysis'] = await this.analyzeServiceDependencies();
    }

    if (includePredictions) {
      insights['predictions'] = this.generateEcosystemPredictions(recentUsage);
    }

    if (includeAlerts) {
      insights['alerts'] = await this.generateSystemAlerts();
    }

    return insights;
  }

  // Helper methods for analytics and insights
  private calculateHealthTrend(healthHistory: any[]): string {
    if (healthHistory.length < 2) return 'insufficient_data';

    const recent = healthHistory.slice(0, 5);
    const older = healthHistory.slice(-5);

    const recentHealthy = recent.filter(h => h.status === 'HEALTHY').length;
    const olderHealthy = older.filter(h => h.status === 'HEALTHY').length;

    if (recentHealthy > olderHealthy) return 'improving';
    if (recentHealthy < olderHealthy) return 'declining';
    return 'stable';
  }

  private calculateReliability(healthHistory: any[]): number {
    if (healthHistory.length === 0) return 0;

    const healthyCount = healthHistory.filter(h => h.status === 'HEALTHY').length;
    return Math.round((healthyCount / healthHistory.length) * 100);
  }

  private parseTimeframe(timeframe: string): number {
    const timeframes = { '1h': 1/24, '24h': 1, '7d': 7, '30d': 30 };
    return timeframes[timeframe] || 1;
  }

  private generateRecommendationReasoning(service: any, task: string, context: any): string {
    return `Recommended for "${task}" based on ${service.category} capabilities and ${context.urgency || 'standard'} urgency requirements.`;
  }

  async onStateUpdate(newState: any) {
    // Automatically sync state to Neon on updates
    await this.neon.upsertMCPSession(
      this.sessionId,
      this.userId,
      newState,
      newState.userPreferences || {}
    );

    logger.info('ChittyRegistry Neon MCP Agent state updated', {
      sessionId: this.sessionId,
      queriesCount: newState.sessionStats?.queriesCount
    });
  }
}