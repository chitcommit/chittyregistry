/**
 * ChittyChain Schema Agent
 * Built with Cloudflare Agents Framework
 * AI-powered schema management and legal database operations
 */

import { Agent, AgentContext, Tool, ToolInput, ToolOutput } from '@cloudflare/agents';
import { z } from 'zod';
import { Client as NotionClient } from '@notionhq/client';
import { nanoid } from 'nanoid';

// =====================================================
// AGENT CONFIGURATION
// =====================================================

export interface Env {
  // KV Namespaces
  SCHEMA_TEMPLATES: KVNamespace;
  CACHE: KVNamespace;

  // D1 Database
  METADATA_DB: D1Database;

  // R2 Storage
  SCHEMA_EXPORTS: R2Bucket;

  // AI Gateway
  AI: Ai;

  // Secrets
  NOTION_API_KEY: string;
  GITHUB_TOKEN: string;
  OPENAI_API_KEY: string;
  WEBHOOK_SECRET: string;
}

// =====================================================
// SCHEMA TOOLS
// =====================================================

/**
 * Tool: Generate ChittyChain Schema
 */
class GenerateSchemaToolOutput implements ToolOutput {
  schema: string;
  platform: string;
  entities: string[];
  downloadUrl?: string;

  constructor(data: Partial<GenerateSchemaToolOutput>) {
    Object.assign(this, data);
  }
}

class GenerateSchemaTool extends Tool<GenerateSchemaToolOutput> {
  name = 'generate_schema';
  description = 'Generate a ChittyChain database schema for the specified platform';

  inputSchema = z.object({
    platform: z.enum(['notion', 'postgresql', 'airtable', 'mysql']),
    entities: z.array(z.enum(['people', 'places', 'things', 'events', 'authorities', 'cases', 'evidence', 'facts'])),
    customizations: z.object({
      includeGDPR: z.boolean().optional(),
      includeBlockchain: z.boolean().optional(),
      includeFinancial: z.boolean().optional(),
      jurisdiction: z.string().optional(),
    }).optional(),
  });

  async execute(input: ToolInput, ctx: AgentContext<Env>): Promise<GenerateSchemaToolOutput> {
    const { platform, entities, customizations } = this.inputSchema.parse(input);

    // Load base templates from KV
    const templates = await Promise.all(
      entities.map(entity =>
        ctx.env.SCHEMA_TEMPLATES.get(`${platform}:${entity}`, 'text')
      )
    );

    // Combine templates with customizations
    let schema = templates.filter(t => t).join('\n\n');

    // Apply customizations using AI
    if (customizations) {
      const aiPrompt = `
        Modify this ${platform} database schema with these customizations:
        - GDPR Compliance: ${customizations.includeGDPR ? 'Required' : 'Not needed'}
        - Blockchain Integration: ${customizations.includeBlockchain ? 'Required' : 'Not needed'}
        - Financial Tracking: ${customizations.includeFinancial ? 'Required' : 'Not needed'}
        - Jurisdiction: ${customizations.jurisdiction || 'USA'}

        Current schema:
        ${schema}

        Return only the modified schema without explanations.
      `;

      const aiResponse = await ctx.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: aiPrompt }],
      });

      schema = aiResponse.response;
    }

    // Store in R2 for download
    const exportId = `schema-${nanoid()}`;
    await ctx.env.SCHEMA_EXPORTS.put(
      `${exportId}.${platform === 'postgresql' ? 'sql' : 'json'}`,
      schema
    );

    return new GenerateSchemaToolOutput({
      schema,
      platform,
      entities,
      downloadUrl: `https://schema.chitty.cc/api/download/${exportId}`,
    });
  }
}

/**
 * Tool: Validate Schema
 */
class ValidateSchemaToolOutput implements ToolOutput {
  isValid: boolean;
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    suggestion?: string;
  }>;
  recommendations: string[];

  constructor(data: Partial<ValidateSchemaToolOutput>) {
    Object.assign(this, data);
  }
}

class ValidateSchemaTool extends Tool<ValidateSchemaToolOutput> {
  name = 'validate_schema';
  description = 'Validate a database schema against ChittyChain standards';

  inputSchema = z.object({
    schema: z.string(),
    format: z.enum(['sql', 'json', 'notion']),
    strictMode: z.boolean().optional(),
  });

  async execute(input: ToolInput, ctx: AgentContext<Env>): Promise<ValidateSchemaToolOutput> {
    const { schema, format, strictMode } = this.inputSchema.parse(input);

    const issues: ValidateSchemaToolOutput['issues'] = [];
    const recommendations: string[] = [];
    let score = 100;

    // AI-powered validation
    const validationPrompt = `
      Analyze this ${format} database schema for:
      1. Security vulnerabilities
      2. Performance issues
      3. Compliance requirements (GDPR, HIPAA)
      4. Best practices
      5. ChittyChain standard compliance

      Schema:
      ${schema.substring(0, 10000)} // Truncate for context limits

      Return a JSON object with:
      {
        "issues": [{"type": "error|warning|info", "message": "...", "line": 1, "suggestion": "..."}],
        "recommendations": ["..."],
        "score": 0-100
      }
    `;

    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: 'You are a database schema expert. Respond only with valid JSON.' },
        { role: 'user', content: validationPrompt }
      ],
    });

    try {
      const analysis = JSON.parse(aiResponse.response);
      issues.push(...(analysis.issues || []));
      recommendations.push(...(analysis.recommendations || []));
      score = analysis.score || 85;
    } catch (e) {
      // Fallback to basic validation
      if (!schema.includes('chitty_id')) {
        issues.push({
          type: 'warning',
          message: 'Missing ChittyID field - required for entity identification',
          suggestion: 'Add a chitty_id TEXT UNIQUE NOT NULL field',
        });
        score -= 10;
      }

      if (!schema.toLowerCase().includes('created_at')) {
        issues.push({
          type: 'warning',
          message: 'Missing audit timestamps',
          suggestion: 'Add created_at and updated_at TIMESTAMPTZ fields',
        });
        score -= 5;
      }
    }

    return new ValidateSchemaToolOutput({
      isValid: issues.filter(i => i.type === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      recommendations,
    });
  }
}

/**
 * Tool: Deploy to Notion
 */
class DeployToNotionToolOutput implements ToolOutput {
  success: boolean;
  databaseIds: Record<string, string>;
  message: string;

  constructor(data: Partial<DeployToNotionToolOutput>) {
    Object.assign(this, data);
  }
}

class DeployToNotionTool extends Tool<DeployToNotionToolOutput> {
  name = 'deploy_to_notion';
  description = 'Deploy ChittyChain schema to a Notion workspace';

  inputSchema = z.object({
    workspaceId: z.string(),
    parentPageId: z.string(),
    entities: z.array(z.string()),
    autoRelations: z.boolean().optional(),
  });

  async execute(input: ToolInput, ctx: AgentContext<Env>): Promise<DeployToNotionToolOutput> {
    const { parentPageId, entities, autoRelations } = this.inputSchema.parse(input);

    const notion = new NotionClient({
      auth: ctx.env.NOTION_API_KEY,
    });

    const databaseIds: Record<string, string> = {};

    try {
      // Create databases for each entity
      for (const entity of entities) {
        const template = await ctx.env.SCHEMA_TEMPLATES.get(`notion:${entity}`, 'json');
        if (!template) continue;

        const config = JSON.parse(template);

        const database = await notion.databases.create({
          parent: { page_id: parentPageId },
          title: [{ text: { content: config.title } }],
          properties: config.properties,
        });

        databaseIds[entity] = database.id;
      }

      // Set up relations if requested
      if (autoRelations) {
        // Configure cross-database relations
        // This would involve updating the database properties
      }

      return new DeployToNotionToolOutput({
        success: true,
        databaseIds,
        message: `Successfully deployed ${entities.length} databases to Notion`,
      });

    } catch (error) {
      return new DeployToNotionToolOutput({
        success: false,
        databaseIds,
        message: `Deployment failed: ${error.message}`,
      });
    }
  }
}

/**
 * Tool: Generate ChittyID
 */
class GenerateChittyIDToolOutput implements ToolOutput {
  chittyId: string;
  entityType: string;
  timestamp: string;

  constructor(data: Partial<GenerateChittyIDToolOutput>) {
    Object.assign(this, data);
  }
}

class GenerateChittyIDTool extends Tool<GenerateChittyIDToolOutput> {
  name = 'generate_chitty_id';
  description = 'Generate a unique ChittyID for an entity';

  inputSchema = z.object({
    entityType: z.enum(['PEO', 'PLACE', 'PROP', 'EVNT', 'AUTH', 'CASE', 'EVID', 'FACT']),
    identifier: z.string(),
    region: z.string().optional(),
    trust: z.number().min(0).max(10).optional(),
  });

  async execute(input: ToolInput, ctx: AgentContext<Env>): Promise<GenerateChittyIDToolOutput> {
    const { entityType, identifier, region = '1', trust = 3 } = this.inputSchema.parse(input);

    // Generate ChittyID with proper format
    const timestamp = Date.now().toString(36).toUpperCase();
    const hash = await this.hashIdentifier(identifier);
    const random = nanoid(8).toUpperCase();

    const chittyId = `${entityType}-${region}${trust}${timestamp}${hash}${random}`;

    // Store in metadata DB for tracking
    await ctx.env.METADATA_DB.prepare(
      'INSERT INTO chitty_ids (id, entity_type, identifier, created_at) VALUES (?, ?, ?, ?)'
    ).bind(chittyId, entityType, identifier, new Date().toISOString()).run();

    return new GenerateChittyIDToolOutput({
      chittyId,
      entityType,
      timestamp: new Date().toISOString(),
    });
  }

  private async hashIdentifier(identifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(identifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 8).toUpperCase();
  }
}

/**
 * Tool: Migration Planning
 */
class PlanMigrationToolOutput implements ToolOutput {
  plan: {
    steps: Array<{
      order: number;
      description: string;
      estimatedTime: string;
      risk: 'low' | 'medium' | 'high';
      automationLevel: number;
    }>;
    totalTime: string;
    complexity: 'simple' | 'moderate' | 'complex';
    recommendations: string[];
  };

  constructor(data: Partial<PlanMigrationToolOutput>) {
    Object.assign(this, data);
  }
}

class PlanMigrationTool extends Tool<PlanMigrationToolOutput> {
  name = 'plan_migration';
  description = 'Create a migration plan from existing system to ChittyChain';

  inputSchema = z.object({
    sourceSystem: z.string(),
    sourceSchema: z.string().optional(),
    dataVolume: z.enum(['small', 'medium', 'large', 'enterprise']),
    targetPlatform: z.enum(['notion', 'postgresql', 'hybrid']),
    requirements: z.array(z.string()).optional(),
  });

  async execute(input: ToolInput, ctx: AgentContext<Env>): Promise<PlanMigrationToolOutput> {
    const parsed = this.inputSchema.parse(input);

    // Use AI to analyze and create migration plan
    const planPrompt = `
      Create a detailed migration plan from ${parsed.sourceSystem} to ChittyChain ${parsed.targetPlatform}.
      Data volume: ${parsed.dataVolume}
      Special requirements: ${parsed.requirements?.join(', ') || 'None'}

      ${parsed.sourceSchema ? `Source schema:\n${parsed.sourceSchema}` : ''}

      Provide a step-by-step plan with time estimates and risk assessments.
    `;

    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: 'You are a database migration expert.' },
        { role: 'user', content: planPrompt }
      ],
    });

    // Parse AI response and structure the plan
    // This is simplified - real implementation would parse the AI response properly

    return new PlanMigrationToolOutput({
      plan: {
        steps: [
          {
            order: 1,
            description: 'Backup existing data',
            estimatedTime: '1 hour',
            risk: 'low',
            automationLevel: 100,
          },
          {
            order: 2,
            description: 'Schema mapping and transformation',
            estimatedTime: '2-4 hours',
            risk: 'medium',
            automationLevel: 80,
          },
          {
            order: 3,
            description: 'Data validation and cleansing',
            estimatedTime: '2-3 hours',
            risk: 'medium',
            automationLevel: 70,
          },
          {
            order: 4,
            description: 'Initial data migration',
            estimatedTime: '4-8 hours',
            risk: 'high',
            automationLevel: 90,
          },
          {
            order: 5,
            description: 'Verification and testing',
            estimatedTime: '2 hours',
            risk: 'low',
            automationLevel: 60,
          },
        ],
        totalTime: '11-18 hours',
        complexity: parsed.dataVolume === 'enterprise' ? 'complex' : 'moderate',
        recommendations: [
          'Run migration during off-peak hours',
          'Create rollback plan before starting',
          'Test with subset of data first',
          'Monitor for data integrity issues',
        ],
      },
    });
  }
}

// =====================================================
// MAIN AGENT
// =====================================================

export class ChittyChainSchemaAgent extends Agent<Env> {
  name = 'ChittyChain Schema Assistant';
  description = 'AI-powered legal database schema management and migration assistant';
  version = '1.0.0';

  tools = [
    new GenerateSchemaTool(),
    new ValidateSchemaTool(),
    new DeployToNotionTool(),
    new GenerateChittyIDTool(),
    new PlanMigrationTool(),
  ];

  systemPrompt = `
    You are the ChittyChain Schema Assistant, an expert in legal database architecture and evidence management systems.

    Your expertise includes:
    - The 5-entity ChittyChain architecture (People, Places, Things, Events, Authorities)
    - Legal compliance requirements (GDPR, attorney-client privilege, chain of custody)
    - Database best practices and optimization
    - Multi-platform deployment (Notion, PostgreSQL, cloud databases)
    - Data migration and integration strategies

    Always prioritize:
    1. Data integrity and security
    2. Legal compliance and audit trails
    3. Performance and scalability
    4. User-friendly implementation

    Use the available tools to help users design, validate, and deploy their legal database schemas.
  `;

  async handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle different endpoints
    if (url.pathname === '/api/chat') {
      return this.handleChat(request, env, ctx);
    } else if (url.pathname === '/api/tools') {
      return this.listTools();
    } else if (url.pathname === '/api/download') {
      return this.handleDownload(request, env, url);
    }

    return new Response('ChittyChain Schema Agent API', {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  private async handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const body = await request.json();
    const { message, context } = body;

    // Process message with agent
    const response = await this.processMessage(message, context, env);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private listTools(): Response {
    const toolList = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return new Response(JSON.stringify({ tools: toolList }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleDownload(request: Request, env: Env, url: URL): Promise<Response> {
    const pathParts = url.pathname.split('/');
    const exportId = pathParts[pathParts.length - 1];

    // Retrieve from R2
    const object = await env.SCHEMA_EXPORTS.get(exportId);
    if (!object) {
      return new Response('Export not found', { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': exportId.endsWith('.sql') ? 'text/plain' : 'application/json',
        'Content-Disposition': `attachment; filename="${exportId}"`,
      },
    });
  }
}

// =====================================================
// WORKER EXPORT
// =====================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const agent = new ChittyChainSchemaAgent();
    return agent.handleRequest(request, env, ctx);
  },
};