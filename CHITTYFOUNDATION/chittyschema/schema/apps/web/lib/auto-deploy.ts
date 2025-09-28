/**
 * Automatic platform detection and deployment utilities
 * Detects database connections and deploys schemas automatically
 */

export interface DeploymentTarget {
  platform: string;
  provider: string;
  connectionString?: string;
  apiKey?: string;
  workspaceId?: string;
  detected: boolean;
  confidence: number;
}

export interface DeploymentResult {
  success: boolean;
  target: DeploymentTarget;
  deploymentId?: string;
  message: string;
  migrationLog?: string[];
  nextSteps?: string[];
}

export class AutoDeploymentDetector {
  /**
   * Detect available deployment targets from environment
   */
  static async detectTargets(): Promise<DeploymentTarget[]> {
    const targets: DeploymentTarget[] = [];

    // Check for common database environment variables
    const envVars = [
      'DATABASE_URL',
      'POSTGRES_URL',
      'POSTGRESQL_URL',
      'MYSQL_URL',
      'SQLITE_URL',
      'NEON_DATABASE_URL',
      'SUPABASE_DB_URL',
      'PLANETSCALE_DATABASE_URL',
      'TURSO_DATABASE_URL'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        const target = this.parseConnectionString(envVar, value);
        if (target) {
          targets.push(target);
        }
      }
    }

    // Check for Notion API keys
    if (process.env.NOTION_API_KEY || process.env.NOTION_TOKEN) {
      targets.push({
        platform: 'notion',
        provider: 'notion',
        apiKey: process.env.NOTION_API_KEY || process.env.NOTION_TOKEN,
        detected: true,
        confidence: 0.9
      });
    }

    // Check for Airtable API keys
    if (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN) {
      targets.push({
        platform: 'airtable',
        provider: 'airtable',
        apiKey: process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN,
        detected: true,
        confidence: 0.9
      });
    }

    // Sort by confidence
    return targets.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Parse connection string to determine platform and provider
   */
  private static parseConnectionString(envVar: string, connectionString: string): DeploymentTarget | null {
    try {
      const url = new URL(connectionString);

      let platform = 'postgresql'; // default
      let provider = 'generic';
      let confidence = 0.7;

      // Determine platform from protocol
      switch (url.protocol) {
        case 'postgresql:':
        case 'postgres:':
          platform = 'postgresql';
          break;
        case 'mysql:':
          platform = 'mysql';
          break;
        case 'sqlite:':
          platform = 'sqlite';
          break;
      }

      // Determine provider from hostname
      if (url.hostname.includes('neon.tech')) {
        provider = 'neon';
        confidence = 0.95;
      } else if (url.hostname.includes('supabase.co')) {
        provider = 'supabase';
        confidence = 0.95;
      } else if (url.hostname.includes('planetscale.com')) {
        provider = 'planetscale';
        platform = 'mysql';
        confidence = 0.95;
      } else if (url.hostname.includes('turso.tech')) {
        provider = 'turso';
        platform = 'sqlite';
        confidence = 0.95;
      } else if (url.hostname.includes('amazonaws.com')) {
        provider = 'aws-rds';
        confidence = 0.9;
      } else if (url.hostname.includes('googleusercontent.com')) {
        provider = 'gcp-sql';
        confidence = 0.9;
      } else if (url.hostname.includes('database.windows.net')) {
        provider = 'azure-sql';
        confidence = 0.9;
      }

      // Higher confidence if environment variable name matches provider
      if (envVar.toLowerCase().includes(provider.toLowerCase())) {
        confidence += 0.1;
      }

      return {
        platform,
        provider,
        connectionString,
        detected: true,
        confidence: Math.min(1.0, confidence)
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Smart deployment - automatically choose best target and deploy
   */
  static async smartDeploy(schema: any, preferredPlatform?: string): Promise<DeploymentResult> {
    const targets = await this.detectTargets();

    if (targets.length === 0) {
      return {
        success: false,
        target: { platform: 'unknown', provider: 'none', detected: false, confidence: 0 },
        message: 'No deployment targets detected. Please configure database connection or API keys.',
        nextSteps: [
          'Set DATABASE_URL environment variable',
          'Configure Notion API key for Notion deployment',
          'Or manually download and deploy schema files'
        ]
      };
    }

    // Choose target
    let selectedTarget = targets[0]; // Highest confidence by default

    // If user specified platform preference, try to honor it
    if (preferredPlatform) {
      const preferredTarget = targets.find(t => t.platform === preferredPlatform);
      if (preferredTarget) {
        selectedTarget = preferredTarget;
      }
    }

    // Deploy to selected target
    try {
      const deploymentResult = await this.deployToTarget(schema, selectedTarget);
      return deploymentResult;
    } catch (error) {
      return {
        success: false,
        target: selectedTarget,
        message: `Deployment failed: ${error.message}`,
        nextSteps: [
          'Check database connection and permissions',
          'Verify API keys are valid',
          'Try manual deployment instead'
        ]
      };
    }
  }

  /**
   * Deploy schema to specific target
   */
  private static async deployToTarget(schema: any, target: DeploymentTarget): Promise<DeploymentResult> {
    switch (target.platform) {
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
        return this.deployToDatabase(schema, target);

      case 'notion':
        return this.deployToNotion(schema, target);

      case 'airtable':
        return this.deployToAirtable(schema, target);

      default:
        throw new Error(`Unsupported platform: ${target.platform}`);
    }
  }

  /**
   * Deploy to SQL database
   */
  private static async deployToDatabase(schema: any, target: DeploymentTarget): Promise<DeploymentResult> {
    // Call ChittyChain API to deploy
    const response = await fetch('https://schema.chitty.cc/api/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer auto-detect'
      },
      body: JSON.stringify({
        schemaId: schema.id,
        target: {
          connectionString: target.connectionString,
          platform: target.platform,
          provider: target.provider,
          runMigrations: true,
          backupFirst: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API deployment failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: result.success,
      target,
      deploymentId: result.deploymentId,
      message: result.success
        ? `Successfully deployed to ${target.provider} ${target.platform} database`
        : result.message,
      migrationLog: result.migrationLog,
      nextSteps: result.success ? [
        'Schema deployed and ready to use',
        'Run your application to verify connectivity',
        'Check migration log for any warnings'
      ] : [
        'Check database connection',
        'Verify permissions for schema changes',
        'Try manual SQL execution'
      ]
    };
  }

  /**
   * Deploy to Notion workspace
   */
  private static async deployToNotion(schema: any, target: DeploymentTarget): Promise<DeploymentResult> {
    // Auto-detect Notion workspace
    const workspaceResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${target.apiKey}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!workspaceResponse.ok) {
      throw new Error('Invalid Notion API key');
    }

    const userData = await workspaceResponse.json();

    // Deploy via ChittyChain API
    const response = await fetch('https://schema.chitty.cc/api/notion/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer auto-detect'
      },
      body: JSON.stringify({
        schemaId: schema.id,
        notionApiKey: target.apiKey,
        autoCreateParentPage: true,
        setupTemplates: true
      })
    });

    if (!response.ok) {
      throw new Error(`Notion deployment failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: result.success,
      target,
      deploymentId: result.deploymentId,
      message: result.success
        ? 'Notion databases created and configured'
        : result.message,
      nextSteps: result.success ? [
        `Open your Notion workspace to see new databases`,
        'Templates and automations are configured',
        'Invite team members to collaborate'
      ] : [
        'Check Notion API key permissions',
        'Verify workspace access',
        'Try manual template import'
      ]
    };
  }

  /**
   * Deploy to Airtable
   */
  private static async deployToAirtable(schema: any, target: DeploymentTarget): Promise<DeploymentResult> {
    // Deploy via ChittyChain API
    const response = await fetch('https://schema.chitty.cc/api/airtable/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer auto-detect'
      },
      body: JSON.stringify({
        schemaId: schema.id,
        airtableApiKey: target.apiKey,
        autoCreateBase: true
      })
    });

    if (!response.ok) {
      throw new Error(`Airtable deployment failed: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: result.success,
      target,
      deploymentId: result.deploymentId,
      message: result.success
        ? 'Airtable base created with schema tables'
        : result.message,
      nextSteps: result.success ? [
        'Open Airtable to see new base',
        'Configure views and automations',
        'Share base with team members'
      ] : [
        'Check Airtable API key',
        'Verify base creation permissions',
        'Try manual base setup'
      ]
    };
  }

  /**
   * Get deployment recommendations
   */
  static async getRecommendations(entities: string[]): Promise<{
    platform: string;
    reasoning: string;
    confidence: number;
  }[]> {
    const recommendations = [];

    // Analyze entity types to recommend platforms
    const hasFinancial = entities.includes('financial_transactions');
    const hasEvidence = entities.includes('evidence');
    const hasCompliance = entities.some(e => ['authorities', 'events'].includes(e));

    if (hasFinancial || hasEvidence) {
      recommendations.push({
        platform: 'postgresql',
        reasoning: 'PostgreSQL recommended for financial and evidence data due to ACID compliance and advanced security features',
        confidence: 0.9
      });
    }

    if (entities.length <= 3 && !hasFinancial) {
      recommendations.push({
        platform: 'notion',
        reasoning: 'Notion ideal for small legal teams with simple collaboration needs',
        confidence: 0.8
      });
    }

    if (entities.includes('people') && entities.length <= 4) {
      recommendations.push({
        platform: 'airtable',
        reasoning: 'Airtable great for contact management and simple legal workflows',
        confidence: 0.7
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}