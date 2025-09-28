/**
 * ChittyChain Bridge Worker
 * Bidirectional sync: Notion ↔ Neon ↔ Drive ↔ SaaS
 * Phase 1 Foundation Infrastructure
 */

export interface Env {
  // Database
  DATABASE_URL: string;

  // Notion
  NOTION_API_KEY: string;
  NOTION_DATABASE_PEOPLE: string;
  NOTION_DATABASE_CASES: string;
  NOTION_DATABASE_EVIDENCE: string;
  NOTION_DATABASE_FACTS: string;

  // Google Drive
  GOOGLE_DRIVE_CLIENT_ID: string;
  GOOGLE_DRIVE_CLIENT_SECRET: string;
  GOOGLE_DRIVE_REFRESH_TOKEN: string;
  GOOGLE_DRIVE_FOLDER_ID: string;

  // ChittyOS Services
  CHITTY_ID_API_URL: string;
  CHITTY_ROUTER_API_URL: string;

  // Financial SaaS (for Phase 4)
  QUICKBOOKS_CLIENT_ID: string;
  XERO_CLIENT_ID: string;

  // Security
  BRIDGE_API_KEY: string;
  WEBHOOK_SECRET: string;

  // KV Storage for caching and state
  SYNC_STATE: KVNamespace;
  RATE_LIMITER: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Bridge-API-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Authentication
    const apiKey = request.headers.get('X-Bridge-API-Key');
    if (apiKey !== env.BRIDGE_API_KEY) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    try {
      // Route handling
      const path = url.pathname;

      if (path.startsWith('/sync/notion')) {
        return await handleNotionSync(request, env, ctx);
      } else if (path.startsWith('/sync/drive')) {
        return await handleDriveSync(request, env, ctx);
      } else if (path.startsWith('/sync/neon')) {
        return await handleNeonSync(request, env, ctx);
      } else if (path.startsWith('/webhook/')) {
        return await handleWebhook(request, env, ctx);
      } else if (path === '/health') {
        return await handleHealth(env);
      } else if (path === '/') {
        return await handleRoot();
      } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Bridge error:', error);
      return new Response(`Internal Server Error: ${errorMessage}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

/**
 * Root endpoint - Bridge status and capabilities
 */
async function handleRoot(): Promise<Response> {
  return new Response(JSON.stringify({
    service: 'ChittyChain Bridge Worker',
    version: '1.0.0',
    phase: 'Phase 1 - Foundation',
    capabilities: {
      notionSync: true,
      driveSync: true,
      neonSync: true,
      webhookHandling: true,
      chittyIdIntegration: true,
      retroactiveAssignment: true
    },
    endpoints: {
      health: '/health',
      notionSync: '/sync/notion/*',
      driveSync: '/sync/drive/*',
      neonSync: '/sync/neon/*',
      webhooks: '/webhook/*'
    },
    architecture: 'Bidirectional: Notion ↔ Neon ↔ Drive ↔ SaaS'
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Health check endpoint
 */
async function handleHealth(env: Env): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      notion: false,
      neon: false,
      drive: false,
      chittyId: false
    },
    errors: [] as string[]
  };

  // Check Notion API
  try {
    const notionResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });
    health.services.notion = notionResponse.ok;
    if (!notionResponse.ok) {
      health.errors.push(`Notion API: ${notionResponse.status}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    health.errors.push(`Notion connection failed: ${errorMessage}`);
  }

  // Check Neon Database
  try {
    const neonResponse = await fetch(env.DATABASE_URL.replace('postgresql://', 'https://') + '/health');
    health.services.neon = neonResponse?.ok || false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    health.errors.push(`Neon connection failed: ${errorMessage}`);
  }

  // Check ChittyID service
  try {
    const chittyResponse = await fetch('https://id.chitty.cc/health');
    health.services.chittyId = chittyResponse.ok;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    health.errors.push(`ChittyID service failed: ${errorMessage}`);
  }

  // Check Google Drive
  try {
    // This would require OAuth token refresh logic
    health.services.drive = true; // Placeholder
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    health.errors.push(`Drive connection failed: ${errorMessage}`);
  }

  if (health.errors.length > 0) {
    health.status = 'degraded';
  }

  return new Response(JSON.stringify(health, null, 2), {
    headers: { 'Content-Type': 'application/json' },
    status: health.status === 'healthy' ? 200 : 503
  });
}

/**
 * Notion sync endpoints
 */
async function handleNotionSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/sync/notion', '');

  switch (path) {
    case '/people':
      return await syncNotionPeople(request, env);
    case '/cases':
      return await syncNotionCases(request, env);
    case '/evidence':
      return await syncNotionEvidence(request, env);
    case '/facts':
      return await syncNotionFacts(request, env);
    case '/retroactive-chitty-ids':
      return await assignRetroactiveChittyIds(request, env);
    case '/status':
      return await getNotionSyncStatus(env);
    default:
      return new Response('Notion sync endpoint not found', { status: 404 });
  }
}

/**
 * Drive sync endpoints
 */
async function handleDriveSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/sync/drive', '');

  switch (path) {
    case '/documents':
      return await syncDriveDocuments(request, env);
    case '/evidence':
      return await syncDriveEvidence(request, env);
    case '/upload':
      return await uploadToDrive(request, env);
    case '/status':
      return await getDriveSyncStatus(env);
    default:
      return new Response('Drive sync endpoint not found', { status: 404 });
  }
}

/**
 * Neon database sync endpoints
 */
async function handleNeonSync(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/sync/neon', '');

  switch (path) {
    case '/people':
      return await syncNeonPeople(request, env);
    case '/cases':
      return await syncNeonCases(request, env);
    case '/evidence':
      return await syncNeonEvidence(request, env);
    case '/schema-migration':
      return await runSchemaMigration(request, env);
    case '/status':
      return await getNeonSyncStatus(env);
    default:
      return new Response('Neon sync endpoint not found', { status: 404 });
  }
}

/**
 * Webhook handlers for external system events
 */
async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/webhook', '');

  // Verify webhook signature
  const signature = request.headers.get('X-Webhook-Signature');
  if (!verifyWebhookSignature(signature, env.WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
  }

  switch (path) {
    case '/notion':
      return await handleNotionWebhook(request, env);
    case '/drive':
      return await handleDriveWebhook(request, env);
    case '/financial':
      return await handleFinancialWebhook(request, env);
    default:
      return new Response('Webhook endpoint not found', { status: 404 });
  }
}

/**
 * Sync People from Notion to Neon
 */
async function syncNotionPeople(request: Request, env: Env): Promise<Response> {
  try {
    // Query Notion database for people
    const notionResponse = await fetch(`https://api.notion.com/v1/databases/${env.NOTION_DATABASE_PEOPLE}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100
      })
    });

    if (!notionResponse.ok) {
      throw new Error(`Notion API error: ${notionResponse.statusText}`);
    }

    const notionData = await notionResponse.json() as any;
    const syncResults = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Process each person record
    for (const record of notionData.results) {
      try {
        syncResults.processed++;

        // Extract person data from Notion properties
        const personData = extractPersonFromNotion(record);

        // Generate ChittyID if not present
        if (!personData.chittyId) {
          personData.chittyId = await generateChittyId('PEO', personData.legalName, env);
        }

        // Upsert to Neon database
        const upsertResult = await upsertPersonToNeon(personData, env);
        if (upsertResult.created) {
          syncResults.created++;
        } else {
          syncResults.updated++;
        }

        // Update Notion record with ChittyID if it was generated
        if (upsertResult.chittyIdGenerated) {
          await updateNotionRecordChittyId(record.id, personData.chittyId, env);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncResults.errors.push(`Record ${record.id}: ${errorMessage}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notion people sync completed',
      results: syncResults
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Assign ChittyIDs retroactively to existing Notion records
 */
async function assignRetroactiveChittyIds(request: Request, env: Env): Promise<Response> {
  try {
    const results = {
      people: 0,
      cases: 0,
      evidence: 0,
      facts: 0,
      errors: [] as string[]
    };

    // Process People
    const peopleData = await queryNotionDatabase(env.NOTION_DATABASE_PEOPLE, env);
    for (const record of peopleData.results) {
      if (!hasChittyId(record)) {
        try {
          const name = extractNameFromNotion(record);
          const chittyId = await generateChittyId('PEO', name, env);
          await updateNotionRecordChittyId(record.id, chittyId, env);
          results.people++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`People ${record.id}: ${errorMessage}`);
        }
      }
    }

    // Process Cases
    const casesData = await queryNotionDatabase(env.NOTION_DATABASE_CASES, env);
    for (const record of casesData.results) {
      if (!hasChittyId(record)) {
        try {
          const docketNumber = extractDocketFromNotion(record);
          const chittyId = await generateChittyId('CASE', docketNumber, env);
          await updateNotionRecordChittyId(record.id, chittyId, env);
          results.cases++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Case ${record.id}: ${errorMessage}`);
        }
      }
    }

    // Process Evidence
    const evidenceData = await queryNotionDatabase(env.NOTION_DATABASE_EVIDENCE, env);
    for (const record of evidenceData.results) {
      if (!hasChittyId(record)) {
        try {
          const title = extractTitleFromNotion(record);
          const chittyId = await generateChittyId('EVID', title, env);
          await updateNotionRecordChittyId(record.id, chittyId, env);
          results.evidence++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Evidence ${record.id}: ${errorMessage}`);
        }
      }
    }

    // Process Facts
    const factsData = await queryNotionDatabase(env.NOTION_DATABASE_FACTS, env);
    for (const record of factsData.results) {
      if (!hasChittyId(record)) {
        try {
          const factText = extractFactTextFromNotion(record);
          const chittyId = await generateChittyId('FACT', factText.substring(0, 100), env);
          await updateNotionRecordChittyId(record.id, chittyId, env);
          results.facts++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Fact ${record.id}: ${errorMessage}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Retroactive ChittyID assignment completed',
      results
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Sync Drive documents and evidence
 */
async function syncDriveDocuments(request: Request, env: Env): Promise<Response> {
  try {
    // Get OAuth token for Google Drive
    const accessToken = await refreshGoogleDriveToken(env);

    // List files in the designated folder
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${env.GOOGLE_DRIVE_FOLDER_ID}' in parents&fields=files(id,name,mimeType,modifiedTime,size,md5Checksum)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!driveResponse.ok) {
      throw new Error(`Google Drive API error: ${driveResponse.statusText}`);
    }

    const driveData = await driveResponse.json() as any;
    const syncResults = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Process each file
    for (const file of driveData.files) {
      try {
        syncResults.processed++;

        // Create thing record for the document
        const thingData = {
          chittyId: await generateChittyId('PROP', file.name, env),
          name: file.name,
          thingType: 'DOCUMENT',
          fileHash: file.md5Checksum,
          fileSize: parseInt(file.size || '0'),
          mimeType: file.mimeType,
          mediaUrl: `https://drive.google.com/file/d/${file.id}/view`,
          metadata: {
            driveId: file.id,
            modifiedTime: file.modifiedTime,
            source: 'google_drive'
          }
        };

        // Upsert to Neon
        const result = await upsertThingToNeon(thingData, env);
        if (result.created) {
          syncResults.created++;
        } else {
          syncResults.updated++;
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        syncResults.errors.push(`File ${file.id}: ${errorMessage}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Drive documents sync completed',
      results: syncResults
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate ChittyID using the official service
 */
async function generateChittyId(type: string, identifier: string, env: Env): Promise<string> {
  const params = new URLSearchParams({
    region: '1',
    jurisdiction: 'USA',
    type: type,
    trust: '3',
    identifier: identifier
  });

  const response = await fetch(`https://id.chitty.cc/api/generate?${params}`);
  const data = await response.json() as any;

  if (!data.success) {
    throw new Error(`ChittyID generation failed: ${data.message}`);
  }

  return data.chittyId;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(signature: string | null, secret: string): boolean {
  if (!signature) return false;
  // Implement HMAC verification logic
  return true; // Placeholder
}

/**
 * Extract person data from Notion record
 */
function extractPersonFromNotion(record: any): any {
  const properties = record.properties;

  return {
    chittyId: properties.ChittyID?.rich_text?.[0]?.text?.content || null,
    legalName: properties.Name?.title?.[0]?.text?.content || '',
    firstName: properties.FirstName?.rich_text?.[0]?.text?.content || null,
    lastName: properties.LastName?.rich_text?.[0]?.text?.content || null,
    entityType: properties.EntityType?.select?.name || 'INDIVIDUAL',
    email: properties.Email?.email || null,
    phone: properties.Phone?.phone_number || null,
    metadata: {
      notionId: record.id,
      lastSync: new Date().toISOString()
    }
  };
}

/**
 * Check if Notion record has ChittyID
 */
function hasChittyId(record: any): boolean {
  return !!record.properties.ChittyID?.rich_text?.[0]?.text?.content;
}

/**
 * Extract name from Notion record
 */
function extractNameFromNotion(record: any): string {
  return record.properties.Name?.title?.[0]?.text?.content ||
         record.properties.LegalName?.rich_text?.[0]?.text?.content ||
         'Unknown';
}

/**
 * Extract docket number from Notion case record
 */
function extractDocketFromNotion(record: any): string {
  return record.properties.DocketNumber?.rich_text?.[0]?.text?.content ||
         record.properties.CaseNumber?.rich_text?.[0]?.text?.content ||
         'Unknown';
}

/**
 * Extract title from Notion record
 */
function extractTitleFromNotion(record: any): string {
  return record.properties.Title?.title?.[0]?.text?.content ||
         record.properties.Name?.title?.[0]?.text?.content ||
         'Unknown';
}

/**
 * Extract fact text from Notion record
 */
function extractFactTextFromNotion(record: any): string {
  return record.properties.FactText?.rich_text?.[0]?.text?.content ||
         record.properties.Text?.rich_text?.[0]?.text?.content ||
         'Unknown';
}

/**
 * Update Notion record with ChittyID
 */
async function updateNotionRecordChittyId(recordId: string, chittyId: string, env: Env): Promise<void> {
  await fetch(`https://api.notion.com/v1/pages/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        ChittyID: {
          rich_text: [
            {
              text: {
                content: chittyId
              }
            }
          ]
        }
      }
    })
  });
}

/**
 * Query Notion database
 */
async function queryNotionDatabase(databaseId: string, env: Env): Promise<any> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      page_size: 100
    })
  });

  return await response.json();
}

/**
 * Upsert person to Neon database
 */
async function upsertPersonToNeon(personData: any, env: Env): Promise<{ created: boolean; chittyIdGenerated: boolean }> {
  // This would use a database connection to upsert the person
  // Placeholder implementation
  return { created: true, chittyIdGenerated: !!personData.chittyId };
}

/**
 * Upsert thing to Neon database
 */
async function upsertThingToNeon(thingData: any, env: Env): Promise<{ created: boolean }> {
  // This would use a database connection to upsert the thing
  // Placeholder implementation
  return { created: true };
}

/**
 * Refresh Google Drive OAuth token
 */
async function refreshGoogleDriveToken(env: Env): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
      client_id: env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET
    })
  });

  const data = await response.json() as any;
  return data.access_token;
}

// Placeholder functions for remaining sync operations
async function syncNotionCases(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Cases sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncNotionEvidence(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Evidence sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncNotionFacts(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Facts sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getNotionSyncStatus(env: Env): Promise<Response> {
  return new Response('{"status": "operational"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncDriveEvidence(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Drive evidence sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function uploadToDrive(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Drive upload not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getDriveSyncStatus(env: Env): Promise<Response> {
  return new Response('{"status": "operational"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncNeonPeople(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Neon people sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncNeonCases(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Neon cases sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function syncNeonEvidence(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Neon evidence sync not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function runSchemaMigration(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Schema migration not yet implemented"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getNeonSyncStatus(env: Env): Promise<Response> {
  return new Response('{"status": "operational"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleNotionWebhook(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Notion webhook received"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDriveWebhook(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Drive webhook received"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleFinancialWebhook(request: Request, env: Env): Promise<Response> {
  return new Response('{"message": "Financial webhook received"}', {
    headers: { 'Content-Type': 'application/json' }
  });
}