/**
 * @chittychain/schema-client
 * Official Node.js client for ChittyChain Schema API
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// =====================================================
// TYPES AND SCHEMAS
// =====================================================

export interface SchemaClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
}

export const SchemaGenerationRequest = z.object({
  platform: z.enum(['postgresql', 'mysql', 'sqlite', 'notion', 'airtable', 'django', 'entityframework']),
  entities: z.array(z.string()).or(z.literal('all')),
  customizations: z.object({
    includeGDPR: z.boolean().optional(),
    includeFinancial: z.boolean().optional(),
    includeBlockchain: z.boolean().optional(),
    jurisdiction: z.string().optional(),
    auditTrail: z.enum(['basic', 'comprehensive']).optional(),
    dataRetention: z.enum(['standard', 'regulatory']).optional(),
    practiceAreas: z.array(z.string()).optional(),
    lawFirmSize: z.enum(['solo', 'small', 'medium', 'large', 'enterprise']).optional(),
  }).optional(),
});

export const SchemaValidationRequest = z.object({
  schema: z.string().optional(),
  connectionString: z.string().optional(),
  platform: z.string(),
  strictMode: z.boolean().optional(),
});

export const DeploymentRequest = z.object({
  schemaId: z.string(),
  target: z.object({
    connectionString: z.string(),
    platform: z.string().optional(),
    runMigrations: z.boolean().optional(),
    backupFirst: z.boolean().optional(),
  }),
});

export type SchemaGenerationOptions = z.infer<typeof SchemaGenerationRequest>;
export type SchemaValidationOptions = z.infer<typeof SchemaValidationRequest>;
export type DeploymentOptions = z.infer<typeof DeploymentRequest>;

export interface Schema {
  id: string;
  platform: string;
  entities: string[];
  sql?: string;
  json?: object;
  downloadUrl: string;
  previewUrl?: string;
  createdAt: string;
  metadata: {
    version: string;
    fileHash: string;
    totalTables: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    suggestion?: string;
  }>;
  recommendations: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  status: 'completed' | 'failed' | 'in_progress';
  message: string;
  migrationLog?: string[];
}

// =====================================================
// MAIN CLIENT CLASS
// =====================================================

export class ChittySchemaClient extends EventEmitter {
  private api: AxiosInstance;
  private config: Required<SchemaClientConfig>;
  private cache: Map<string, any> = new Map();
  private ws?: WebSocket;

  constructor(config: SchemaClientConfig) {
    super();

    this.config = {
      baseUrl: 'https://schema.chitty.cc/api',
      timeout: 30000,
      retryAttempts: 3,
      cacheEnabled: true,
      ...config,
    };

    this.api = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@chittychain/schema-client/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  // =====================================================
  // SCHEMA OPERATIONS
  // =====================================================

  /**
   * Generate a new schema
   */
  async generateSchema(options: SchemaGenerationOptions): Promise<Schema> {
    const validated = SchemaGenerationRequest.parse(options);
    const cacheKey = `schema:${JSON.stringify(validated)}`;

    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await this.api.post('/schema/generate', validated);
    const schema = response.data;

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, schema);
    }

    this.emit('schemaGenerated', schema);
    return schema;
  }

  /**
   * Get an existing schema by ID
   */
  async getSchema(schemaId: string): Promise<Schema> {
    const cacheKey = `schema:${schemaId}`;

    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await this.api.get(`/schema/${schemaId}`);
    const schema = response.data;

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, schema);
    }

    return schema;
  }

  /**
   * List available schema templates
   */
  async listTemplates(platform?: string): Promise<Array<{ id: string; name: string; description: string }>> {
    const params = platform ? { platform } : {};
    const response = await this.api.get('/schema/templates', { params });
    return response.data.templates;
  }

  /**
   * Validate a schema
   */
  async validateSchema(options: SchemaValidationOptions): Promise<ValidationResult> {
    const validated = SchemaValidationRequest.parse(options);
    const response = await this.api.post('/validate', validated);
    return response.data;
  }

  /**
   * Deploy schema to a database
   */
  async deploySchema(options: DeploymentOptions): Promise<DeploymentResult> {
    const validated = DeploymentRequest.parse(options);
    const response = await this.api.post('/deploy', validated);

    const deployment = response.data;
    this.emit('deploymentStarted', deployment);

    // Poll for completion if deployment is async
    if (deployment.status === 'in_progress') {
      return this.pollDeploymentStatus(deployment.deploymentId);
    }

    return deployment;
  }

  /**
   * Quick deploy - generate and deploy in one step
   */
  async quickDeploy(options: {
    platform: string;
    entities: string[] | 'all';
    target: {
      connectionString: string;
      runMigrations?: boolean;
      backupFirst?: boolean;
    };
    customizations?: SchemaGenerationOptions['customizations'];
  }): Promise<{ schema: Schema; deployment: DeploymentResult }> {
    // Generate schema
    const schema = await this.generateSchema({
      platform: options.platform as any,
      entities: options.entities,
      customizations: options.customizations,
    });

    // Deploy schema
    const deployment = await this.deploySchema({
      schemaId: schema.id,
      target: {
        connectionString: options.target.connectionString,
        platform: options.platform,
        runMigrations: options.target.runMigrations,
        backupFirst: options.target.backupFirst,
      },
    });

    this.emit('quickDeployCompleted', { schema, deployment });

    return { schema, deployment };
  }

  // =====================================================
  // NOTION OPERATIONS
  // =====================================================

  /**
   * Get Notion database templates
   */
  async getNotionTemplates(): Promise<Array<{ entity: string; template: object }>> {
    const response = await this.api.get('/notion/templates');
    return response.data.templates;
  }

  /**
   * Deploy to Notion workspace
   */
  async deployToNotion(options: {
    workspaceId: string;
    parentPageId: string;
    entities: string[];
    autoRelations?: boolean;
  }): Promise<{ success: boolean; databaseIds: Record<string, string> }> {
    const response = await this.api.post('/notion/deploy', options);
    return response.data;
  }

  // =====================================================
  // ADVANCED OPERATIONS
  // =====================================================

  /**
   * Generate API client code
   */
  async generateAPIClient(options: {
    schemaId: string;
    language: 'typescript' | 'javascript' | 'python' | 'php' | 'csharp';
    framework?: string;
  }): Promise<{ files: Array<{ name: string; content: string }> }> {
    const response = await this.api.post('/generate/api-client', options);
    return response.data;
  }

  /**
   * Generate TypeScript types
   */
  async generateTypes(schemaId: string): Promise<{ types: string; filename: string }> {
    const response = await this.api.post(`/generate/types/${schemaId}`, {
      language: 'typescript'
    });
    return response.data;
  }

  /**
   * Analyze schema for optimization opportunities
   */
  async analyzeSchema(schemaId: string): Promise<{
    score: number;
    performance: object;
    security: object;
    compliance: object;
    recommendations: string[];
  }> {
    const response = await this.api.post(`/analyze/${schemaId}`);
    return response.data;
  }

  /**
   * Plan migration from existing schema
   */
  async planMigration(options: {
    sourceSystem: string;
    sourceSchema?: string;
    targetPlatform: string;
    dataVolume: 'small' | 'medium' | 'large' | 'enterprise';
  }): Promise<{
    planId: string;
    steps: Array<{
      order: number;
      description: string;
      estimatedTime: string;
      risk: 'low' | 'medium' | 'high';
    }>;
    totalTime: string;
    complexity: string;
  }> {
    const response = await this.api.post('/migration/plan', options);
    return response.data;
  }

  // =====================================================
  // REAL-TIME FEATURES
  // =====================================================

  /**
   * Connect to real-time updates via WebSocket
   */
  connectRealTime(): void {
    const wsUrl = this.config.baseUrl.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    this.ws.on('open', () => {
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('message', message);

        // Emit specific events
        switch (message.type) {
          case 'schema_updated':
            this.emit('schemaUpdated', message.data);
            break;
          case 'deployment_completed':
            this.emit('deploymentCompleted', message.data);
            break;
          case 'validation_failed':
            this.emit('validationFailed', message.data);
            break;
        }
      } catch (error) {
        this.emit('error', error);
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      this.emit('disconnected');
    });
  }

  /**
   * Disconnect from real-time updates
   */
  disconnectRealTime(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; services: object }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get client version
   */
  getVersion(): string {
    return '1.0.0';
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  private setupInterceptors(): void {
    // Request interceptor for retry logic
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        if (config.retryCount < this.config.retryAttempts) {
          config.retryCount += 1;

          // Exponential backoff
          const delay = Math.pow(2, config.retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          return this.api.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private async pollDeploymentStatus(deploymentId: string): Promise<DeploymentResult> {
    const maxAttempts = 30; // 5 minutes with 10s intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await this.api.get(`/deployment/${deploymentId}/status`);
      const deployment = response.data;

      if (deployment.status === 'completed' || deployment.status === 'failed') {
        this.emit('deploymentCompleted', deployment);
        return deployment;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    }

    throw new Error('Deployment polling timeout');
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Quick schema generation function
 */
export async function generateSchema(
  apiKey: string,
  options: SchemaGenerationOptions
): Promise<Schema> {
  const client = new ChittySchemaClient({ apiKey });
  return client.generateSchema(options);
}

/**
 * Quick deployment function
 */
export async function quickDeploy(
  apiKey: string,
  options: {
    platform: string;
    entities: string[] | 'all';
    connectionString: string;
    customizations?: SchemaGenerationOptions['customizations'];
  }
): Promise<{ schema: Schema; deployment: DeploymentResult }> {
  const client = new ChittySchemaClient({ apiKey });
  return client.quickDeploy({
    platform: options.platform,
    entities: options.entities,
    target: { connectionString: options.connectionString },
    customizations: options.customizations,
  });
}

/**
 * Validate existing database
 */
export async function validateDatabase(
  apiKey: string,
  connectionString: string,
  platform: string
): Promise<ValidationResult> {
  const client = new ChittySchemaClient({ apiKey });
  return client.validateSchema({
    connectionString,
    platform,
  });
}

// =====================================================
// EXPORTS
// =====================================================

export default ChittySchemaClient;

// Export types
export type {
  SchemaClientConfig,
  SchemaGenerationOptions,
  SchemaValidationOptions,
  DeploymentOptions,
  Schema,
  ValidationResult,
  DeploymentResult,
};

// Export schemas for validation
export {
  SchemaGenerationRequest,
  SchemaValidationRequest,
  DeploymentRequest,
};