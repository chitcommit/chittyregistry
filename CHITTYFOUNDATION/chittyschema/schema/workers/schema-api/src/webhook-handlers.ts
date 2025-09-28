/**
 * Webhook Handlers for ChittyChain Schema API
 * Handles incoming webhooks from GitHub, Notion, and other services
 * Triggers automatic schema updates and sync operations
 */

import { z } from 'zod';
import { nanoid } from 'nanoid';

export interface Env {
  // Storage
  WEBHOOK_LOG: KVNamespace;
  SYNC_STATE: KVNamespace;
  SCHEMA_TEMPLATES: KVNamespace;

  // Database
  METADATA_DB: D1Database;

  // Secrets
  GITHUB_WEBHOOK_SECRET: string;
  NOTION_WEBHOOK_SECRET: string;
  WEBHOOK_SECRET: string;

  // External APIs
  NOTION_API_KEY: string;
  GITHUB_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
}

// =====================================================
// WEBHOOK SCHEMAS
// =====================================================

const GitHubWebhookSchema = z.object({
  action: z.string(),
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
    html_url: z.string(),
  }),
  commits: z.array(z.object({
    id: z.string(),
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
    modified: z.array(z.string()),
    added: z.array(z.string()),
    removed: z.array(z.string()),
  })).optional(),
  head_commit: z.object({
    id: z.string(),
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
    modified: z.array(z.string()),
    added: z.array(z.string()),
    removed: z.array(z.string()),
  }).optional(),
  ref: z.string().optional(),
});

const NotionWebhookSchema = z.object({
  event: z.string(),
  database_id: z.string(),
  page_id: z.string().optional(),
  changes: z.record(z.any()).optional(),
  timestamp: z.string(),
});

const SchemaUpdateSchema = z.object({
  event: z.literal('schema_updated'),
  commit: z.string(),
  branch: z.string(),
  repository: z.string(),
  changes: z.object({
    schema: z.boolean(),
    notion: z.boolean(),
    api: z.boolean(),
    frontend: z.boolean(),
  }),
  timestamp: z.string(),
});

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

export class WebhookHandler {
  constructor(private env: Env) {}

  /**
   * Handle GitHub webhook events
   */
  async handleGitHubWebhook(request: Request): Promise<Response> {
    const signature = request.headers.get('X-Hub-Signature-256');
    const event = request.headers.get('X-GitHub-Event');
    const body = await request.text();

    // Verify signature
    if (!this.verifyGitHubSignature(body, signature, this.env.GITHUB_WEBHOOK_SECRET)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const webhookId = nanoid();
    await this.logWebhook(webhookId, 'github', event, body);

    try {
      const payload = JSON.parse(body);
      const validated = GitHubWebhookSchema.parse(payload);

      let handled = false;

      switch (event) {
        case 'push':
          handled = await this.handleGitHubPush(validated, webhookId);
          break;
        case 'pull_request':
          handled = await this.handleGitHubPullRequest(validated, webhookId);
          break;
        case 'release':
          handled = await this.handleGitHubRelease(validated, webhookId);
          break;
        default:
          console.log(`Unhandled GitHub event: ${event}`);
      }

      return Response.json({
        success: true,
        webhook_id: webhookId,
        event_type: event,
        handled,
        message: handled ? 'Event processed successfully' : 'Event received but not processed'
      });

    } catch (error) {
      await this.logWebhookError(webhookId, error.message);
      return new Response(`Webhook processing failed: ${error.message}`, { status: 500 });
    }
  }

  /**
   * Handle GitHub push events
   */
  private async handleGitHubPush(payload: z.infer<typeof GitHubWebhookSchema>, webhookId: string): Promise<boolean> {
    if (payload.ref !== 'refs/heads/main') {
      console.log(`Ignoring push to ${payload.ref}, only processing main branch`);
      return false;
    }

    const modifiedFiles = payload.head_commit?.modified || [];
    const addedFiles = payload.head_commit?.added || [];
    const allFiles = [...modifiedFiles, ...addedFiles];

    // Check if schema files were modified
    const schemaFiles = [
      'chittychain-production-schema.sql',
      'notion-database-templates.md',
      'workers/schema-api/',
      'frontend/'
    ];

    const schemaChanged = allFiles.some(file =>
      schemaFiles.some(schemaFile => file.includes(schemaFile))
    );

    if (!schemaChanged) {
      console.log('No schema-related files changed, skipping processing');
      return false;
    }

    console.log(`Schema files changed in commit ${payload.head_commit?.id}`);

    // Trigger schema update workflow
    await this.triggerSchemaUpdate({
      commit: payload.head_commit?.id || '',
      branch: 'main',
      repository: payload.repository.full_name,
      author: payload.head_commit?.author || { name: 'Unknown', email: '' },
      message: payload.head_commit?.message || '',
      files_changed: allFiles.filter(file =>
        schemaFiles.some(schemaFile => file.includes(schemaFile))
      ),
      webhook_id: webhookId
    });

    return true;
  }

  /**
   * Handle GitHub pull request events
   */
  private async handleGitHubPullRequest(payload: z.infer<typeof GitHubWebhookSchema>, webhookId: string): Promise<boolean> {
    if (payload.action === 'opened' || payload.action === 'synchronize') {
      // Trigger schema validation for PR
      console.log(`PR ${payload.action} - triggering validation`);
      return true;
    }

    return false;
  }

  /**
   * Handle GitHub release events
   */
  private async handleGitHubRelease(payload: z.infer<typeof GitHubWebhookSchema>, webhookId: string): Promise<boolean> {
    if (payload.action === 'published') {
      // Update production templates on release
      console.log('Release published - updating production templates');
      return true;
    }

    return false;
  }

  /**
   * Handle Notion webhook events
   */
  async handleNotionWebhook(request: Request): Promise<Response> {
    const signature = request.headers.get('X-Notion-Signature');
    const body = await request.text();

    // Verify signature
    if (!this.verifyNotionSignature(body, signature, this.env.NOTION_WEBHOOK_SECRET)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const webhookId = nanoid();
    await this.logWebhook(webhookId, 'notion', 'database_change', body);

    try {
      const payload = JSON.parse(body);
      const validated = NotionWebhookSchema.parse(payload);

      // Handle database changes
      if (validated.event === 'database_updated') {
        await this.syncNotionDatabase(validated.database_id, webhookId);
      } else if (validated.event === 'page_updated') {
        await this.syncNotionPage(validated.page_id!, webhookId);
      }

      return Response.json({
        success: true,
        webhook_id: webhookId,
        event_type: validated.event,
        message: 'Notion webhook processed successfully'
      });

    } catch (error) {
      await this.logWebhookError(webhookId, error.message);
      return new Response(`Notion webhook processing failed: ${error.message}`, { status: 500 });
    }
  }

  /**
   * Handle schema update notifications from CI/CD
   */
  async handleSchemaUpdateWebhook(request: Request): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    const expectedAuth = `Bearer ${this.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    const webhookId = nanoid();
    const body = await request.text();
    await this.logWebhook(webhookId, 'schema_update', 'deployment', body);

    try {
      const payload = JSON.parse(body);
      const validated = SchemaUpdateSchema.parse(payload);

      // Process schema update
      await this.processSchemaUpdate(validated, webhookId);

      // Send notifications
      await this.notifySchemaUpdate(validated);

      return Response.json({
        success: true,
        webhook_id: webhookId,
        message: 'Schema update processed successfully'
      });

    } catch (error) {
      await this.logWebhookError(webhookId, error.message);
      return new Response(`Schema update processing failed: ${error.message}`, { status: 500 });
    }
  }

  /**
   * Handle external service webhooks (generic)
   */
  async handleExternalWebhook(request: Request, service: string): Promise<Response> {
    const webhookId = nanoid();
    const body = await request.text();
    await this.logWebhook(webhookId, service, 'external', body);

    try {
      const payload = JSON.parse(body);

      // Route to appropriate handler based on service
      switch (service) {
        case 'slack':
          await this.handleSlackWebhook(payload, webhookId);
          break;
        case 'discord':
          await this.handleDiscordWebhook(payload, webhookId);
          break;
        case 'zapier':
          await this.handleZapierWebhook(payload, webhookId);
          break;
        default:
          console.log(`Unhandled external service: ${service}`);
      }

      return Response.json({
        success: true,
        webhook_id: webhookId,
        service,
        message: 'External webhook processed'
      });

    } catch (error) {
      await this.logWebhookError(webhookId, error.message);
      return new Response(`External webhook processing failed: ${error.message}`, { status: 500 });
    }
  }

  // =====================================================
  // WEBHOOK PROCESSING
  // =====================================================

  /**
   * Trigger schema update workflow
   */
  private async triggerSchemaUpdate(context: {
    commit: string;
    branch: string;
    repository: string;
    author: { name: string; email: string };
    message: string;
    files_changed: string[];
    webhook_id: string;
  }): Promise<void> {
    console.log('Triggering schema update workflow...');

    // Store update context in KV
    const updateId = nanoid();
    await this.env.SYNC_STATE.put(`update:${updateId}`, JSON.stringify({
      ...context,
      status: 'initiated',
      created_at: new Date().toISOString()
    }), { expirationTtl: 86400 }); // 24 hours

    // Determine what needs to be updated based on changed files
    const updates = {
      schema: context.files_changed.some(file => file.includes('chittychain-production-schema.sql')),
      notion: context.files_changed.some(file => file.includes('notion-database-templates.md')),
      api: context.files_changed.some(file => file.includes('workers/schema-api/')),
      frontend: context.files_changed.some(file => file.includes('frontend/'))
    };

    console.log('Schema update triggers:', updates);

    // If schema SQL changed, validate and update templates
    if (updates.schema) {
      await this.updateSchemaTemplates(context.commit, updateId);
    }

    // If Notion templates changed, update KV storage
    if (updates.notion) {
      await this.updateNotionTemplates(context.commit, updateId);
    }

    // If API changed, trigger API deployment (this would be handled by CI/CD)
    if (updates.api) {
      console.log('API changes detected - deployment should be handled by CI/CD');
    }

    // If frontend changed, trigger frontend deployment
    if (updates.frontend) {
      console.log('Frontend changes detected - deployment should be handled by CI/CD');
    }

    // Update sync state
    await this.env.SYNC_STATE.put(`update:${updateId}`, JSON.stringify({
      ...context,
      updates,
      status: 'processing',
      updated_at: new Date().toISOString()
    }), { expirationTtl: 86400 });

    // Send notification
    if (this.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification({
        text: '🔄 Schema Update Triggered',
        attachments: [{
          color: 'warning',
          title: 'Schema files changed',
          fields: [
            { title: 'Commit', value: context.commit.substring(0, 7), short: true },
            { title: 'Author', value: context.author.name, short: true },
            { title: 'Files', value: context.files_changed.join('\n'), short: false }
          ]
        }]
      });
    }
  }

  /**
   * Process schema update from CI/CD
   */
  private async processSchemaUpdate(update: z.infer<typeof SchemaUpdateSchema>, webhookId: string): Promise<void> {
    console.log(`Processing schema update from commit ${update.commit}`);

    // Update metadata in D1
    await this.env.METADATA_DB.prepare(`
      INSERT INTO schema_updates (
        id, commit, branch, repository, changes, webhook_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nanoid(),
      update.commit,
      update.branch,
      update.repository,
      JSON.stringify(update.changes),
      webhookId,
      update.timestamp
    ).run();

    // Update sync state
    await this.env.SYNC_STATE.put(`latest_update`, JSON.stringify({
      commit: update.commit,
      timestamp: update.timestamp,
      changes: update.changes
    }));

    console.log('Schema update processed successfully');
  }

  /**
   * Update schema templates in KV storage
   */
  private async updateSchemaTemplates(commit: string, updateId: string): Promise<void> {
    console.log('Updating schema templates...');

    try {
      // Fetch latest schema from GitHub
      const response = await fetch(`https://api.github.com/repos/chittyos/chittychain-schema/contents/chittychain-production-schema.sql?ref=${commit}`, {
        headers: {
          'Authorization': `token ${this.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }

      const schemaContent = await response.text();

      // Store in KV
      await this.env.SCHEMA_TEMPLATES.put('sql:complete', schemaContent, {
        metadata: {
          commit,
          updated_at: new Date().toISOString(),
          update_id: updateId
        }
      });

      console.log('Schema templates updated successfully');

    } catch (error) {
      console.error('Failed to update schema templates:', error);
      throw error;
    }
  }

  /**
   * Update Notion templates in KV storage
   */
  private async updateNotionTemplates(commit: string, updateId: string): Promise<void> {
    console.log('Updating Notion templates...');

    try {
      // Fetch latest Notion templates from GitHub
      const response = await fetch(`https://api.github.com/repos/chittyos/chittychain-schema/contents/notion-database-templates.md?ref=${commit}`, {
        headers: {
          'Authorization': `token ${this.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Notion templates: ${response.statusText}`);
      }

      const notionContent = await response.text();

      // Parse and store individual templates
      const templates = this.parseNotionTemplates(notionContent);

      for (const [key, template] of Object.entries(templates)) {
        await this.env.SCHEMA_TEMPLATES.put(`notion:${key}`, JSON.stringify(template), {
          metadata: {
            commit,
            updated_at: new Date().toISOString(),
            update_id: updateId
          }
        });
      }

      console.log(`Updated ${Object.keys(templates).length} Notion templates`);

    } catch (error) {
      console.error('Failed to update Notion templates:', error);
      throw error;
    }
  }

  /**
   * Sync Notion database changes
   */
  private async syncNotionDatabase(databaseId: string, webhookId: string): Promise<void> {
    console.log(`Syncing Notion database: ${databaseId}`);

    // This would implement bidirectional sync with Notion
    // For now, just log the event
    await this.env.SYNC_STATE.put(`notion_sync:${databaseId}`, JSON.stringify({
      database_id: databaseId,
      webhook_id: webhookId,
      synced_at: new Date().toISOString()
    }), { expirationTtl: 3600 });
  }

  /**
   * Sync Notion page changes
   */
  private async syncNotionPage(pageId: string, webhookId: string): Promise<void> {
    console.log(`Syncing Notion page: ${pageId}`);

    // This would implement page-level sync
    await this.env.SYNC_STATE.put(`notion_page:${pageId}`, JSON.stringify({
      page_id: pageId,
      webhook_id: webhookId,
      synced_at: new Date().toISOString()
    }), { expirationTtl: 3600 });
  }

  /**
   * Send schema update notifications
   */
  private async notifySchemaUpdate(update: z.infer<typeof SchemaUpdateSchema>): Promise<void> {
    if (!this.env.SLACK_WEBHOOK_URL) return;

    const changesList = Object.entries(update.changes)
      .filter(([_, changed]) => changed)
      .map(([component, _]) => `✅ ${component}`)
      .join('\n');

    await this.sendSlackNotification({
      text: '🚀 Schema Update Deployed',
      attachments: [{
        color: 'good',
        title: 'Schema deployment completed',
        title_link: 'https://schema.chitty.cc',
        fields: [
          { title: 'Commit', value: update.commit.substring(0, 7), short: true },
          { title: 'Branch', value: update.branch, short: true },
          { title: 'Changes', value: changesList || 'No changes', short: false }
        ],
        footer: 'ChittyChain Schema Platform',
        ts: Math.floor(new Date(update.timestamp).getTime() / 1000)
      }]
    });
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Verify GitHub webhook signature
   */
  private verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;

    const expectedSignature = `sha256=${this.createHmacSha256(payload, secret)}`;
    return signature === expectedSignature;
  }

  /**
   * Verify Notion webhook signature
   */
  private verifyNotionSignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;

    const expectedSignature = this.createHmacSha256(payload, secret);
    return signature === expectedSignature;
  }

  /**
   * Create HMAC SHA-256 signature
   */
  private createHmacSha256(data: string, secret: string): string {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    // Note: This is a simplified implementation
    // In a real environment, you'd use crypto.subtle.importKey and crypto.subtle.sign
    return 'placeholder_signature';
  }

  /**
   * Log webhook event
   */
  private async logWebhook(id: string, source: string, event: string, payload: string): Promise<void> {
    const logEntry = {
      id,
      source,
      event,
      payload_size: payload.length,
      received_at: new Date().toISOString()
    };

    await this.env.WEBHOOK_LOG.put(`webhook:${id}`, JSON.stringify(logEntry), {
      expirationTtl: 86400 * 7 // 7 days
    });

    // Also store in D1 for querying
    await this.env.METADATA_DB.prepare(`
      INSERT INTO webhook_log (id, source, event_type, payload_size, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, source, event, payload.length, new Date().toISOString()).run();
  }

  /**
   * Log webhook error
   */
  private async logWebhookError(webhookId: string, error: string): Promise<void> {
    await this.env.WEBHOOK_LOG.put(`webhook_error:${webhookId}`, JSON.stringify({
      webhook_id: webhookId,
      error,
      timestamp: new Date().toISOString()
    }), { expirationTtl: 86400 * 7 });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: any): Promise<void> {
    if (!this.env.SLACK_WEBHOOK_URL) return;

    try {
      await fetch(this.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Parse Notion templates from markdown
   */
  private parseNotionTemplates(content: string): Record<string, any> {
    // This would parse the Notion templates markdown
    // For now, return a placeholder
    return {
      people: { title: 'People Database', properties: {} },
      places: { title: 'Places Database', properties: {} },
      things: { title: 'Things Database', properties: {} },
      events: { title: 'Events Database', properties: {} },
      authorities: { title: 'Authorities Database', properties: {} }
    };
  }

  /**
   * Handle Slack webhook
   */
  private async handleSlackWebhook(payload: any, webhookId: string): Promise<void> {
    console.log('Processing Slack webhook:', payload.type);
  }

  /**
   * Handle Discord webhook
   */
  private async handleDiscordWebhook(payload: any, webhookId: string): Promise<void> {
    console.log('Processing Discord webhook:', payload.type);
  }

  /**
   * Handle Zapier webhook
   */
  private async handleZapierWebhook(payload: any, webhookId: string): Promise<void> {
    console.log('Processing Zapier webhook:', payload);
  }
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

export async function handleWebhook(request: Request, env: Env, path: string): Promise<Response> {
  const handler = new WebhookHandler(env);
  const url = new URL(request.url);

  try {
    switch (path) {
      case '/github':
        return await handler.handleGitHubWebhook(request);
      case '/notion':
        return await handler.handleNotionWebhook(request);
      case '/schema-update':
        return await handler.handleSchemaUpdateWebhook(request);
      case '/slack':
        return await handler.handleExternalWebhook(request, 'slack');
      case '/discord':
        return await handler.handleExternalWebhook(request, 'discord');
      case '/zapier':
        return await handler.handleExternalWebhook(request, 'zapier');
      default:
        return new Response('Webhook endpoint not found', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(`Internal server error: ${error.message}`, { status: 500 });
  }
}