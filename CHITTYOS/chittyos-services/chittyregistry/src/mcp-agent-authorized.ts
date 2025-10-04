// ChittyRegistry MCP Agent with Cloudflare-style Authorization
// Implements Trust Operating System security patterns

import { McpAgent } from '@cloudflare/mcp-agent-api';
import { NeonService } from './services/NeonService';
import { RegistryService } from './services/RegistryService';
import { HealthMonitor } from './services/HealthMonitor';

interface ChittyAuthContext {
  chittyId: string;
  trustScore: number;
  trustLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  permissions: string[];
  serviceScopes: string[];
  projectAccess: string[];
  complianceLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
}

interface ChittyOSAuthProps {
  user: {
    chittyId: string;
    email?: string;
    name?: string;
  };
  auth: ChittyAuthContext;
  session: {
    sessionId: string;
    expiresAt: string;
    trustVerified: boolean;
  };
}

export class ChittyRegistryAuthorizedMCPAgent extends McpAgent {
  private neon: NeonService;
  private registry: RegistryService;
  private healthMonitor: HealthMonitor;
  private authContext: ChittyAuthContext;

  constructor(
    neon: NeonService,
    registry: RegistryService,
    healthMonitor: HealthMonitor,
    authProps: ChittyOSAuthProps
  ) {
    super();
    this.neon = neon;
    this.registry = registry;
    this.healthMonitor = healthMonitor;
    this.authContext = authProps.auth;
  }

  async initialState() {
    // Load personalized state based on ChittyID and trust level
    const existingSession = await this.neon.getMCPSession(this.authContext.chittyId);

    const baseState = {
      chittyId: this.authContext.chittyId,
      trustLevel: this.authContext.trustLevel,
      trustScore: this.authContext.trustScore,
      permissions: this.authContext.permissions,
      createdAt: new Date().toISOString(),
      securityContext: {
        complianceLevel: this.authContext.complianceLevel,
        serviceScopes: this.authContext.serviceScopes,
        projectAccess: this.authContext.projectAccess
      }
    };

    if (existingSession) {
      return {
        ...existingSession.state,
        ...baseState,
        sessionRestored: true,
        lastTrustUpdate: new Date().toISOString()
      };
    }

    return {
      ...baseState,
      userPreferences: this.getTrustBasedPreferences(),
      queryHistory: [],
      favoriteServices: [],
      sessionStats: {
        queriesCount: 0,
        securityChecksPassed: 0,
        lastActiveTime: new Date().toISOString()
      }
    };
  }

  async getTools() {
    // Dynamically expose tools based on trust level and permissions
    const baseTool = {
      name: "discover_chittyos_services",
      description: "Discover ChittyOS services including AI Gateway, LangChain Agents, and MCP orchestration patterns (access level based on trust score)",
      inputSchema: {
        type: "object",
        properties: {
          capability: { type: "string" },
          category: {
            type: "string",
            enum: this.getAllowedCategories()
          },
          includeSecure: {
            type: "boolean",
            description: `Include secure services (requires ${this.getMinimumTrustForSecure()}+ trust)`
          }
        }
      }
    };

    const tools = [baseTool];

    // Trust-level based tool exposure
    if (this.hasTrustLevel('SILVER')) {
      tools.push({
        name: "access_service_analytics",
        description: "Access service analytics and usage data",
        inputSchema: {
          type: "object",
          properties: {
            serviceName: { type: "string" },
            timeframe: { type: "string", enum: ["1h", "24h", "7d"] },
            includeUserData: {
              type: "boolean",
              description: "Include user-level analytics (GOLD+ required)"
            }
          }
        }
      });
    }

    if (this.hasTrustLevel('GOLD')) {
      tools.push({
        name: "manage_service_registration",
        description: "Register and manage services in the ecosystem",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["register", "update", "deregister"] },
            serviceName: { type: "string" },
            serviceData: { type: "object" }
          }
        }
      });

      tools.push({
        name: "access_trust_analytics",
        description: "Access trust scoring and compliance analytics",
        inputSchema: {
          type: "object",
          properties: {
            scope: { type: "string", enum: ["self", "services", "ecosystem"] },
            includePredictions: { type: "boolean" }
          }
        }
      });
    }

    if (this.hasTrustLevel('PLATINUM')) {
      tools.push({
        name: "ecosystem_administration",
        description: "Administrative control over the ChittyOS ecosystem",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["bootstrap", "emergency_shutdown", "trust_override", "compliance_audit"]
            },
            target: { type: "string" },
            reason: { type: "string", required: true }
          }
        }
      });

      tools.push({
        name: "security_audit_tools",
        description: "Security auditing and compliance monitoring",
        inputSchema: {
          type: "object",
          properties: {
            auditType: {
              type: "string",
              enum: ["trust_verification", "access_patterns", "data_integrity", "compliance_check"]
            },
            scope: { type: "string" }
          }
        }
      });

      tools.push({
        name: "cloudflare_ai_orchestration",
        description: "Access Cloudflare AI infrastructure including AI Gateway, LangChain Agents, MCP orchestration, Vectorize, and Workflows",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              enum: ["chaining", "routing", "parallelization", "orchestration", "evaluation"],
              description: "MCP agent orchestration pattern"
            },
            aiService: {
              type: "string",
              enum: ["ai-gateway", "langchain-agent", "mcp-agent", "vectorize", "workflows"],
              description: "Cloudflare AI service to access"
            },
            operation: {
              type: "string",
              enum: ["deploy", "test", "monitor", "scale", "configure"],
              description: "Operation to perform"
            },
            environment: {
              type: "string",
              enum: ["ai.chitty.cc", "langchain.chitty.cc", "mcp.chitty.cc"],
              description: "Target deployment environment"
            }
          }
        }
      });
    }

    // Project-specific tools based on access
    if (this.authContext.projectAccess.includes('ARIAS-v-BIANCHI')) {
      tools.push({
        name: "arias_case_services",
        description: "Access ARIAS v. BIANCHI case-specific services",
        inputSchema: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["evidence_query", "timeline_access", "document_verification"]
            },
            caseId: { type: "string", default: "2024D007847" }
          }
        }
      });
    }

    return tools;
  }

  async callTool(name: string, args: any) {
    // Pre-authorization security checks
    const securityCheck = await this.performSecurityCheck(name, args);
    if (!securityCheck.authorized) {
      return {
        success: false,
        error: securityCheck.reason,
        requiresElevation: securityCheck.requiresElevation,
        currentTrustLevel: this.authContext.trustLevel,
        requiredTrustLevel: securityCheck.requiredTrustLevel
      };
    }

    // Increment security checks passed
    const currentState = await this.state;
    await this.setState({
      ...currentState,
      sessionStats: {
        ...currentState.sessionStats,
        securityChecksPassed: currentState.sessionStats.securityChecksPassed + 1
      }
    });

    // Execute tool with authorization context
    const startTime = Date.now();
    try {
      const result = await this.executeAuthorizedTool(name, args);

      // Record successful authorized operation
      await this.neon.recordServiceUsage(
        'chittyregistry-mcp-authorized',
        this.authContext.chittyId,
        currentState.sessionId,
        name,
        { ...args, trustLevel: this.authContext.trustLevel },
        Date.now() - startTime,
        true
      );

      return result;

    } catch (error) {
      // Record failed operation
      await this.neon.recordServiceUsage(
        'chittyregistry-mcp-authorized',
        this.authContext.chittyId,
        currentState.sessionId,
        name,
        args,
        Date.now() - startTime,
        false
      );

      throw error;
    }
  }

  private async performSecurityCheck(toolName: string, args: any): Promise<{
    authorized: boolean;
    reason?: string;
    requiresElevation?: boolean;
    requiredTrustLevel?: string;
  }> {
    // Tool-specific authorization rules
    const authRules = {
      'discover_chittyos_services': { minTrust: 0, permissions: [] },
      'access_service_analytics': { minTrust: 60, permissions: ['analytics:read'] },
      'manage_service_registration': { minTrust: 80, permissions: ['services:write'] },
      'access_trust_analytics': { minTrust: 80, permissions: ['trust:read'] },
      'ecosystem_administration': { minTrust: 95, permissions: ['admin:write'] },
      'security_audit_tools': { minTrust: 95, permissions: ['security:audit'] },
      'cloudflare_ai_orchestration': { minTrust: 95, permissions: ['ai:orchestrate', 'cloudflare:deploy'] },
      'arias_case_services': { minTrust: 40, permissions: [], projects: ['ARIAS-v-BIANCHI'] }
    };

    const rule = authRules[toolName];
    if (!rule) {
      return { authorized: false, reason: 'Unknown tool' };
    }

    // Trust score check
    if (this.authContext.trustScore < rule.minTrust) {
      return {
        authorized: false,
        reason: `Insufficient trust score. Required: ${rule.minTrust}, Current: ${this.authContext.trustScore}`,
        requiresElevation: true,
        requiredTrustLevel: this.getTrustLevelForScore(rule.minTrust)
      };
    }

    // Permission check
    for (const permission of rule.permissions) {
      if (!this.authContext.permissions.includes(permission)) {
        return {
          authorized: false,
          reason: `Missing required permission: ${permission}`,
          requiresElevation: true
        };
      }
    }

    // Project access check
    if (rule.projects) {
      for (const project of rule.projects) {
        if (!this.authContext.projectAccess.includes(project)) {
          return {
            authorized: false,
            reason: `No access to project: ${project}`,
            requiresElevation: false
          };
        }
      }
    }

    // Compliance level check for secure operations
    if (args.includeSecure && this.authContext.complianceLevel === 'PUBLIC') {
      return {
        authorized: false,
        reason: 'Secure operations require INTERNAL+ compliance level',
        requiresElevation: true
      };
    }

    return { authorized: true };
  }

  private async executeAuthorizedTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'discover_chittyos_services':
        return await this.authorizedServiceDiscovery(args);
      case 'access_service_analytics':
        return await this.authorizedAnalytics(args);
      case 'manage_service_registration':
        return await this.authorizedServiceManagement(args);
      case 'access_trust_analytics':
        return await this.authorizedTrustAnalytics(args);
      case 'ecosystem_administration':
        return await this.authorizedAdministration(args);
      case 'arias_case_services':
        return await this.authorizedCaseServices(args);
      case 'cloudflare_ai_orchestration':
        return await this.authorizedCloudflareAI(args);
      default:
        throw new Error(`Authorized execution not implemented for: ${name}`);
    }
  }

  private async authorizedServiceDiscovery(args: any) {
    // Filter services based on trust level and compliance
    const allServices = await this.neon.getServices(args);

    const filteredServices = allServices.filter(service => {
      // Hide high-security services from low-trust users
      if (service.metadata?.securityLevel === 'HIGH' && this.authContext.trustScore < 80) {
        return false;
      }

      // Filter by compliance level
      if (service.metadata?.complianceRequired === 'CONFIDENTIAL' &&
          this.authContext.complianceLevel !== 'CONFIDENTIAL') {
        return false;
      }

      return true;
    });

    return {
      success: true,
      services: filteredServices,
      filteredByTrust: allServices.length - filteredServices.length,
      userTrustLevel: this.authContext.trustLevel,
      accessContext: {
        canAccessSecure: this.authContext.trustScore >= 80,
        complianceLevel: this.authContext.complianceLevel
      }
    };
  }

  private async authorizedAnalytics(args: any) {
    // Limit analytics depth based on trust level
    const includeUserData = args.includeUserData && this.hasTrustLevel('GOLD');

    const analytics = await this.neon.getUsageAnalytics(
      args.serviceName,
      this.parseTimeframe(args.timeframe)
    );

    if (!includeUserData) {
      // Anonymize user data for lower trust levels
      analytics.forEach(record => {
        delete record.user_details;
        delete record.session_data;
      });
    }

    return {
      success: true,
      analytics,
      dataLevel: includeUserData ? 'detailed' : 'anonymized',
      trustLevel: this.authContext.trustLevel
    };
  }

  private async authorizedCaseServices(args: any) {
    // Case-specific service access with audit trail
    const caseServices = await this.registry.discoverServices({
      capability: 'legal-case-management',
      includeUnhealthy: false
    });

    // Log case access for audit trail
    await this.neon.recordServiceUsage(
      'case-access-audit',
      this.authContext.chittyId,
      args.caseId,
      args.operation,
      { case: 'ARIAS-v-BIANCHI', trustLevel: this.authContext.trustLevel },
      0,
      true
    );

    return {
      success: true,
      caseId: args.caseId,
      operation: args.operation,
      availableServices: caseServices,
      auditTrail: {
        accessedBy: this.authContext.chittyId,
        accessTime: new Date().toISOString(),
        trustLevel: this.authContext.trustLevel
      }
    };
  }

  private async authorizedCloudflareAI(args: any) {
    // Cloudflare AI infrastructure orchestration with ChittyChat integration
    const { pattern, aiService, operation, environment } = args;

    // Simulate Cloudflare AI operations based on ChittyChat deployment patterns
    const aiInfrastructure = {
      'ai-gateway': {
        endpoint: 'ai.chitty.cc',
        capabilities: ['observability', 'caching', 'rate-limiting', 'fallback-models'],
        deployment: 'edge-computing'
      },
      'langchain-agent': {
        endpoint: 'langchain.chitty.cc',
        capabilities: ['react-agents', 'rag-queries', 'multi-agent-orchestration'],
        deployment: 'edge-computing'
      },
      'mcp-agent': {
        endpoint: 'mcp.chitty.cc',
        patterns: ['chaining', 'routing', 'parallelization', 'orchestration', 'evaluation'],
        deployment: 'edge-computing'
      },
      'vectorize': {
        endpoint: 'vectorize.chitty.cc',
        capabilities: ['vector-search', 'embeddings', 'similarity-matching'],
        deployment: 'edge-computing'
      },
      'workflows': {
        endpoint: 'workflows.chitty.cc',
        capabilities: ['task-orchestration', 'agent-coordination', 'pipeline-management'],
        deployment: 'edge-computing'
      }
    };

    const service = aiInfrastructure[aiService];
    if (!service) {
      return {
        success: false,
        error: `Unknown AI service: ${aiService}`,
        availableServices: Object.keys(aiInfrastructure)
      };
    }

    // Log AI infrastructure access
    await this.neon.recordServiceUsage(
      'cloudflare-ai-orchestration',
      this.authContext.chittyId,
      'ai-session',
      operation,
      { service: aiService, pattern, environment, trustLevel: this.authContext.trustLevel },
      0,
      true
    );

    return {
      success: true,
      operation,
      aiService,
      pattern,
      environment,
      serviceInfo: service,
      deploymentStatus: 'ready-for-production',
      infrastructure: {
        edgeComputing: true,
        costEffective: true,
        lowLatency: true,
        scalable: true,
        observability: true
      },
      auditTrail: {
        accessedBy: this.authContext.chittyId,
        accessTime: new Date().toISOString(),
        trustLevel: this.authContext.trustLevel,
        operation: `${operation} on ${aiService} using ${pattern || 'default'} pattern`
      }
    };
  }

  // Trust level utilities
  private hasTrustLevel(level: string): boolean {
    const levels = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const userLevel = levels.indexOf(this.authContext.trustLevel);
    const requiredLevel = levels.indexOf(level);
    return userLevel >= requiredLevel;
  }

  private getTrustLevelForScore(score: number): string {
    if (score >= 95) return 'PLATINUM';
    if (score >= 80) return 'GOLD';
    if (score >= 60) return 'SILVER';
    return 'BRONZE';
  }

  private getAllowedCategories(): string[] {
    const allCategories = [
      'core-infrastructure', 'security-verification', 'blockchain-infrastructure',
      'ai-intelligence', 'document-evidence', 'business-operations', 'foundation-governance'
    ];

    // Restrict sensitive categories for low trust users
    if (this.authContext.trustScore < 60) {
      return allCategories.filter(cat =>
        !['security-verification', 'foundation-governance'].includes(cat)
      );
    }

    return allCategories;
  }

  private getTrustBasedPreferences() {
    return {
      includeUnhealthy: this.authContext.trustScore >= 80,
      preferredCategories: this.getAllowedCategories(),
      alertThresholds: {
        responseTime: this.authContext.trustScore >= 80 ? 2000 : 5000,
        healthStatus: this.authContext.trustScore >= 60 ? 'DEGRADED' : 'UNHEALTHY'
      },
      securityLevel: this.authContext.complianceLevel,
      analyticsEnabled: this.authContext.trustScore >= 60
    };
  }

  private getMinimumTrustForSecure(): number {
    return 80; // GOLD level required for secure operations
  }

  private parseTimeframe(timeframe: string): number {
    const timeframes = { '1h': 1/24, '24h': 1, '7d': 7 };
    return timeframes[timeframe] || 1;
  }
}