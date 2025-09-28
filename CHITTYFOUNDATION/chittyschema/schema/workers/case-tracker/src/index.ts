/**
 * ChittyCases Tracker Worker
 * Easy case tracking with automatic Notion sync
 * No login required - token-based public tracking
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Client as NotionClient } from '@notionhq/client';

export interface Env {
  // KV Storage
  TRACKING_TOKENS: KVNamespace;
  CASE_CACHE: KVNamespace;

  // D1 Database
  TRACKER_DB: D1Database;

  // Durable Objects
  SCRAPER: DurableObjectNamespace;
  NOTIFIER: DurableObjectNamespace;

  // Secrets
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  SLACK_WEBHOOK_URL: string;
  SENDGRID_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  COOK_COUNTY_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for widget embedding
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// =====================================================
// SCHEMAS
// =====================================================

const TrackingRequestSchema = z.object({
  case_number: z.string().regex(/^\d{4}[A-Z]\d{6}$/, 'Invalid Cook County case number format'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  webhook_url: z.string().url().optional(),
  slack_channel: z.string().optional(),
  notion_page_id: z.string().optional(),
  name: z.string().optional(),
});

const CaseUpdateSchema = z.object({
  case_number: z.string(),
  docket_entries: z.array(z.object({
    date: z.string(),
    description: z.string(),
    judge: z.string().optional(),
    courtroom: z.string().optional(),
  })),
  next_court_date: z.string().optional(),
  case_status: z.string(),
  parties: z.array(z.object({
    name: z.string(),
    role: z.string(),
    attorney: z.string().optional(),
  })),
  last_updated: z.string(),
});

// =====================================================
// ROUTES
// =====================================================

// Home page with tracking form
app.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ChittyCases - Easy Cook County Case Tracking</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Track Your Cook County Case
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              No signup required. Just enter your case number.
            </p>
          </div>
          <form class="mt-8 space-y-6" action="/track/quick" method="POST">
            <div class="rounded-md shadow-sm -space-y-px">
              <div>
                <label for="case_number" class="sr-only">Case Number</label>
                <input id="case_number" name="case_number" type="text" required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Case Number (e.g., 2024D007847)">
              </div>
              <div>
                <label for="email" class="sr-only">Email</label>
                <input id="email" name="email" type="email"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email (optional)">
              </div>
              <div>
                <label for="phone" class="sr-only">Phone</label>
                <input id="phone" name="phone" type="tel"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Phone (optional)">
              </div>
            </div>

            <div>
              <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Start Tracking
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-50 text-gray-500">Other tracking methods</span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <a href="/api/docs" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                API
              </a>
              <a href="/widget" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Widget
              </a>
              <a href="/bookmarklet" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Bookmarklet
              </a>
              <a href="/slack" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Slack
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Quick tracking form submission
app.post('/track/quick', async (c) => {
  const formData = await c.req.formData();
  const case_number = formData.get('case_number') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  try {
    // Create tracking record
    const tracking = await createTracking(c.env, {
      case_number,
      email: email || undefined,
      phone: phone || undefined,
    });

    // Redirect to tracking page
    return c.redirect(`/track/${tracking.token}`);
  } catch (error) {
    return c.html(`
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600">Error</h1>
          <p class="mt-2">${error.message}</p>
          <a href="/" class="mt-4 inline-block text-blue-600 hover:underline">Try again</a>
        </div>
      </div>
    `);
  }
});

// API endpoint for adding tracking
app.post('/track/api/add', async (c) => {
  try {
    const body = await c.req.json();
    const validated = TrackingRequestSchema.parse(body);

    // Create tracking record
    const tracking = await createTracking(c.env, validated);

    // Trigger initial scrape
    await triggerScrape(c.env, validated.case_number);

    return c.json({
      success: true,
      tracking_token: tracking.token,
      tracking_url: `https://chitty.cc/track/${tracking.token}`,
      case_number: validated.case_number,
      message: 'Case tracking activated',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, errors: error.errors }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

// View tracking status
app.get('/track/:token', async (c) => {
  const token = c.req.param('token');

  // Get tracking record
  const tracking = await c.env.TRACKING_TOKENS.get(token, 'json') as any;
  if (!tracking) {
    return c.text('Invalid tracking token', 404);
  }

  // Get case data from cache
  const caseData = await c.env.CASE_CACHE.get(tracking.case_number, 'json') as any;

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Case ${tracking.case_number} - ChittyCases</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
      <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Case ${tracking.case_number}
              </h3>
              <p class="mt-1 max-w-2xl text-sm text-gray-500">
                ${caseData ? `Last updated: ${new Date(caseData.last_updated).toLocaleString()}` : 'Loading...'}
              </p>
            </div>

            ${caseData ? `
              <div class="border-t border-gray-200">
                <dl>
                  <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt class="text-sm font-medium text-gray-500">Status</dt>
                    <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${caseData.case_status}</dd>
                  </div>

                  ${caseData.next_court_date ? `
                    <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt class="text-sm font-medium text-gray-500">Next Court Date</dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        ${new Date(caseData.next_court_date).toLocaleDateString()}
                        <a href="/track/${token}/calendar" class="ml-4 text-indigo-600 hover:text-indigo-900">
                          Add to Calendar
                        </a>
                      </dd>
                    </div>
                  ` : ''}

                  <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt class="text-sm font-medium text-gray-500">Parties</dt>
                    <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      ${caseData.parties.map(p => `
                        <div class="mb-2">
                          <span class="font-semibold">${p.name}</span> - ${p.role}
                          ${p.attorney ? `<br>Attorney: ${p.attorney}` : ''}
                        </div>
                      `).join('')}
                    </dd>
                  </div>
                </dl>
              </div>

              <div class="px-4 py-5 sm:px-6">
                <h4 class="text-lg font-medium text-gray-900 mb-4">Recent Docket Entries</h4>
                <div class="space-y-2">
                  ${caseData.docket_entries.slice(0, 10).map(entry => `
                    <div class="border-l-4 border-indigo-500 pl-4 py-2">
                      <div class="text-sm font-medium text-gray-900">${entry.date}</div>
                      <div class="text-sm text-gray-500">${entry.description}</div>
                      ${entry.judge ? `<div class="text-xs text-gray-400">Judge: ${entry.judge}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : '<div class="px-4 py-5">Loading case data...</div>'}

            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button onclick="navigator.share({url: window.location.href})" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                Share Tracking Link
              </button>
              <a href="/track/${token}/settings" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// JavaScript widget for embedding
app.get('/widget.js', async (c) => {
  return c.text(`
    (function() {
      // ChittyCases Tracking Widget
      window.ChittyCasesWidget = {
        init: function(options) {
          const defaultOptions = {
            containerId: 'chitty-cases-widget',
            buttonText: 'Track Case',
            buttonClass: 'chitty-track-btn',
            theme: 'light'
          };

          const config = Object.assign({}, defaultOptions, options);
          const container = document.getElementById(config.containerId);

          if (!container) return;

          // Create form HTML
          const formHTML = \`
            <div class="chitty-widget" style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Track Your Case</h3>
              <form id="chitty-track-form">
                <input type="text" id="chitty-case-number" placeholder="Case Number (e.g., 2024D007847)"
                  style="width: 100%; padding: 8px 12px; margin-bottom: 12px; border: 1px solid #d1d5db; border-radius: 4px;">
                <input type="email" id="chitty-email" placeholder="Email (optional)"
                  style="width: 100%; padding: 8px 12px; margin-bottom: 12px; border: 1px solid #d1d5db; border-radius: 4px;">
                <button type="submit" style="width: 100%; padding: 10px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                  \${config.buttonText}
                </button>
              </form>
              <div id="chitty-result" style="margin-top: 12px; display: none;"></div>
            </div>
          \`;

          container.innerHTML = formHTML;

          // Handle form submission
          document.getElementById('chitty-track-form').addEventListener('submit', async function(e) {
            e.preventDefault();

            const caseNumber = document.getElementById('chitty-case-number').value;
            const email = document.getElementById('chitty-email').value;
            const resultDiv = document.getElementById('chitty-result');

            try {
              const response = await fetch('https://chitty.cc/track/api/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ case_number: caseNumber, email: email || undefined })
              });

              const data = await response.json();

              if (data.success) {
                resultDiv.innerHTML = \`
                  <div style="padding: 12px; background: #10b981; color: white; border-radius: 4px;">
                    ✓ Tracking activated!
                    <a href="\${data.tracking_url}" target="_blank" style="color: white; text-decoration: underline;">View status</a>
                  </div>
                \`;
              } else {
                resultDiv.innerHTML = \`
                  <div style="padding: 12px; background: #ef4444; color: white; border-radius: 4px;">
                    Error: \${data.error || 'Failed to activate tracking'}
                  </div>
                \`;
              }

              resultDiv.style.display = 'block';

            } catch (error) {
              resultDiv.innerHTML = \`
                <div style="padding: 12px; background: #ef4444; color: white; border-radius: 4px;">
                  Error: Unable to connect to tracking service
                </div>
              \`;
              resultDiv.style.display = 'block';
            }
          });
        }
      };
    })();
  `, {
    headers: { 'Content-Type': 'application/javascript' }
  });
});

// Bookmarklet code
app.get('/bookmarklet', async (c) => {
  const bookmarkletCode = `javascript:(function(){var c=prompt('Enter Cook County case number:');if(c){window.open('https://chitty.cc/track/quick?case_number='+encodeURIComponent(c),'_blank');}})();`;

  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ChittyCases Bookmarklet</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 p-8">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">ChittyCases Bookmarklet</h1>
        <p class="mb-6">Drag this button to your bookmarks bar to track cases from anywhere:</p>
        <div class="bg-white p-6 rounded-lg shadow">
          <a href="${bookmarkletCode}" class="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">
            Track Case
          </a>
        </div>
        <div class="mt-6 text-sm text-gray-600">
          <h2 class="font-semibold mb-2">How to use:</h2>
          <ol class="list-decimal list-inside space-y-1">
            <li>Drag the button above to your bookmarks bar</li>
            <li>Click it from any webpage</li>
            <li>Enter a case number when prompted</li>
            <li>View tracking page that opens</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Slack slash command handler
app.post('/slack/command', async (c) => {
  const formData = await c.req.formData();
  const text = formData.get('text') as string;
  const response_url = formData.get('response_url') as string;
  const channel_id = formData.get('channel_id') as string;
  const user_name = formData.get('user_name') as string;

  if (!text) {
    return c.json({
      response_type: 'ephemeral',
      text: 'Please provide a case number. Usage: `/track-case 2024D007847`'
    });
  }

  try {
    // Create tracking
    const tracking = await createTracking(c.env, {
      case_number: text.trim(),
      slack_channel: channel_id,
    });

    // Send response to Slack
    await fetch(response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: `Case tracking activated by @${user_name}`,
        attachments: [{
          color: 'good',
          title: `Case ${text.trim()}`,
          title_link: `https://chitty.cc/track/${tracking.token}`,
          text: 'Updates will be posted to this channel',
          footer: 'ChittyCases',
          footer_icon: 'https://chitty.cc/favicon.ico',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });

    return c.text(''); // Slack expects empty response for slash commands

  } catch (error) {
    return c.json({
      response_type: 'ephemeral',
      text: `Error: ${error.message}`
    });
  }
});

// Calendar file generation
app.get('/track/:token/calendar', async (c) => {
  const token = c.req.param('token');

  const tracking = await c.env.TRACKING_TOKENS.get(token, 'json') as any;
  if (!tracking) {
    return c.text('Invalid tracking token', 404);
  }

  const caseData = await c.env.CASE_CACHE.get(tracking.case_number, 'json') as any;
  if (!caseData || !caseData.next_court_date) {
    return c.text('No upcoming court date', 404);
  }

  // Generate ICS file
  const eventDate = new Date(caseData.next_court_date);
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ChittyCases//Court Date//EN
BEGIN:VEVENT
UID:${tracking.case_number}-${Date.now()}@chitty.cc
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(eventDate)}
DTEND:${formatICSDate(new Date(eventDate.getTime() + 3600000))}
SUMMARY:Court Date - Case ${tracking.case_number}
DESCRIPTION:Case ${tracking.case_number} court appearance
LOCATION:Cook County Courthouse
URL:https://chitty.cc/track/${token}
END:VEVENT
END:VCALENDAR`;

  return c.text(icsContent, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="court-date-${tracking.case_number}.ics"`
    }
  });
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function createTracking(env: Env, data: z.infer<typeof TrackingRequestSchema>) {
  const token = nanoid(32);
  const tracking = {
    token,
    case_number: data.case_number,
    email: data.email,
    phone: data.phone,
    webhook_url: data.webhook_url,
    slack_channel: data.slack_channel,
    notion_page_id: data.notion_page_id,
    created_at: new Date().toISOString(),
    notifications_sent: 0,
  };

  // Store in KV
  await env.TRACKING_TOKENS.put(token, JSON.stringify(tracking), {
    expirationTtl: 60 * 60 * 24 * 365 // 1 year
  });

  // Store reverse lookup
  const existingTokens = await env.TRACKING_TOKENS.get(`case:${data.case_number}`, 'json') as string[] || [];
  existingTokens.push(token);
  await env.TRACKING_TOKENS.put(`case:${data.case_number}`, JSON.stringify(existingTokens));

  // Create Notion record if configured
  if (env.NOTION_API_KEY && env.NOTION_DATABASE_ID) {
    await createNotionRecord(env, tracking);
  }

  // Send confirmation email if provided
  if (data.email) {
    await sendEmail(env, {
      to: data.email,
      subject: `Case ${data.case_number} Tracking Activated`,
      text: `Your case tracking has been activated. View status at: https://chitty.cc/track/${token}`,
      html: `
        <h2>Case Tracking Activated</h2>
        <p>You're now tracking case ${data.case_number}</p>
        <p><a href="https://chitty.cc/track/${token}">View Case Status</a></p>
      `
    });
  }

  return tracking;
}

async function triggerScrape(env: Env, caseNumber: string) {
  const id = env.SCRAPER.idFromName(caseNumber);
  const scraper = env.SCRAPER.get(id);

  const response = await scraper.fetch(new Request('https://scraper/scrape', {
    method: 'POST',
    body: JSON.stringify({ case_number: caseNumber })
  }));

  return response.json();
}

async function createNotionRecord(env: Env, tracking: any) {
  const notion = new NotionClient({ auth: env.NOTION_API_KEY });

  try {
    await notion.pages.create({
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties: {
        'Case Number': {
          title: [{ text: { content: tracking.case_number } }]
        },
        'Tracking Token': {
          rich_text: [{ text: { content: tracking.token } }]
        },
        'Email': tracking.email ? {
          email: tracking.email
        } : undefined,
        'Phone': tracking.phone ? {
          phone_number: tracking.phone
        } : undefined,
        'Status': {
          select: { name: 'Active' }
        },
        'Created': {
          date: { start: tracking.created_at }
        },
        'Tracking URL': {
          url: `https://chitty.cc/track/${tracking.token}`
        }
      }
    });
  } catch (error) {
    console.error('Failed to create Notion record:', error);
  }
}

async function sendEmail(env: Env, options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!env.SENDGRID_API_KEY) return;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: 'track@chitty.cc', name: 'ChittyCases' },
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.text },
        { type: 'text/html', value: options.html }
      ]
    })
  });
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// =====================================================
// DURABLE OBJECTS
// =====================================================

export class CaseScraper {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/scrape' && request.method === 'POST') {
      const { case_number } = await request.json();

      // Scrape Cook County website
      // This would use Puppeteer or direct API if available
      const caseData = await this.scrapeCookCounty(case_number);

      // Store in cache
      await this.env.CASE_CACHE.put(case_number, JSON.stringify(caseData), {
        expirationTtl: 3600 // Cache for 1 hour
      });

      // Check for changes and notify
      await this.checkAndNotify(case_number, caseData);

      return Response.json({ success: true, data: caseData });
    }

    return new Response('Not found', { status: 404 });
  }

  private async scrapeCookCounty(caseNumber: string) {
    // Implementation would scrape actual Cook County website
    // For now, return mock data
    return {
      case_number: caseNumber,
      case_status: 'Active',
      next_court_date: '2024-12-15T09:00:00',
      parties: [
        { name: 'John Doe', role: 'Petitioner', attorney: 'Smith & Associates' },
        { name: 'Jane Doe', role: 'Respondent', attorney: 'Johnson Law Firm' }
      ],
      docket_entries: [
        {
          date: '2024-11-01',
          description: 'Motion filed',
          judge: 'Judge Smith',
          courtroom: '2401'
        }
      ],
      last_updated: new Date().toISOString()
    };
  }

  private async checkAndNotify(caseNumber: string, newData: any) {
    // Get all tracking tokens for this case
    const tokens = await this.env.TRACKING_TOKENS.get(`case:${caseNumber}`, 'json') as string[] || [];

    for (const token of tokens) {
      const tracking = await this.env.TRACKING_TOKENS.get(token, 'json') as any;
      if (!tracking) continue;

      // Send notifications based on preferences
      if (tracking.email) {
        await sendEmail(this.env, {
          to: tracking.email,
          subject: `Update: Case ${caseNumber}`,
          text: `There's an update to your case. View at: https://chitty.cc/track/${token}`,
          html: `<h2>Case Update</h2><p>View details at <a href="https://chitty.cc/track/${token}">ChittyCases</a></p>`
        });
      }

      if (tracking.webhook_url) {
        await fetch(tracking.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_number: caseNumber, data: newData, timestamp: new Date().toISOString() })
        });
      }

      if (tracking.slack_channel && this.env.SLACK_WEBHOOK_URL) {
        await fetch(this.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: tracking.slack_channel,
            text: `Case ${caseNumber} has been updated`,
            attachments: [{
              color: 'warning',
              title: 'View Case Update',
              title_link: `https://chitty.cc/track/${token}`,
              text: newData.case_status,
              footer: 'ChittyCases'
            }]
          })
        });
      }
    }
  }
}

// =====================================================
// EXPORT
// =====================================================

export default app;