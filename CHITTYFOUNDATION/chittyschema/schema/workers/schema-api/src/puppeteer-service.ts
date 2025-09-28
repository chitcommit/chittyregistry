/**
 * Puppeteer Service for ChittyChain Schema
 * Generates PDFs, screenshots, and visual documentation
 * Using Cloudflare Browser Rendering API
 */

import puppeteer from '@cloudflare/puppeteer';

export interface Env {
  BROWSER: Fetcher;
  SCHEMA_EXPORTS: R2Bucket;
}

export class PuppeteerService {
  constructor(private env: Env) {}

  /**
   * Generate PDF documentation from schema
   */
  async generateSchemaPDF(schema: {
    title: string;
    platform: string;
    entities: string[];
    content: string;
    metadata?: any;
  }): Promise<{ pdfUrl: string; pdfId: string }> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    try {
      // Generate HTML content for the schema documentation
      const html = this.generateSchemaHTML(schema);

      // Set content and wait for rendering
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Add custom styling for PDF
      await page.addStyleTag({
        content: `
          @page {
            margin: 1in;
            size: letter;
          }
          @media print {
            .no-print { display: none; }
            .page-break { page-break-after: always; }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 {
            color: #1a202c;
            margin-top: 1.5em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 0.75em;
            text-align: left;
          }
          th {
            background-color: #f7fafc;
            font-weight: 600;
          }
          code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          .schema-block {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1.5em;
            margin: 1em 0;
          }
        `
      });

      // Generate PDF with options
      const pdf = await page.pdf({
        format: 'letter',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            <span>ChittyChain Schema Documentation - ${schema.title}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      // Save to R2
      const pdfId = `schema-pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.env.SCHEMA_EXPORTS.put(`pdfs/${pdfId}.pdf`, pdf, {
        httpMetadata: {
          contentType: 'application/pdf',
          contentDisposition: `attachment; filename="${schema.title.replace(/[^a-z0-9]/gi, '_')}_schema.pdf"`,
        },
        customMetadata: {
          schemaTitle: schema.title,
          platform: schema.platform,
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        pdfUrl: `https://schema.chitty.cc/api/download/pdf/${pdfId}`,
        pdfId,
      };

    } finally {
      await browser.close();
    }
  }

  /**
   * Generate visual schema diagram
   */
  async generateSchemaDiagram(schema: {
    entities: Array<{
      name: string;
      fields: Array<{ name: string; type: string; required?: boolean }>;
      relationships?: Array<{ target: string; type: string }>;
    }>;
  }): Promise<{ imageUrl: string; imageId: string }> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    try {
      // Generate diagram HTML using D3.js or similar
      const html = this.generateDiagramHTML(schema);

      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 1920, height: 1080 });

      // Wait for diagram to render
      await page.waitForSelector('#schema-diagram', { visible: true });

      // Take screenshot of the diagram
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: await page.evaluate(() => {
          const element = document.querySelector('#schema-diagram') as HTMLElement;
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      });

      // Save to R2
      const imageId = `schema-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.env.SCHEMA_EXPORTS.put(`diagrams/${imageId}.png`, screenshot, {
        httpMetadata: {
          contentType: 'image/png',
        },
        customMetadata: {
          entities: JSON.stringify(schema.entities.map(e => e.name)),
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        imageUrl: `https://schema.chitty.cc/api/download/diagram/${imageId}`,
        imageId,
      };

    } finally {
      await browser.close();
    }
  }

  /**
   * Generate Notion template preview
   */
  async generateNotionPreview(notionConfig: {
    databases: Array<{
      name: string;
      icon: string;
      properties: Record<string, any>;
    }>;
  }): Promise<{ previewUrl: string; previewId: string }> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    try {
      // Create Notion-style preview HTML
      const html = this.generateNotionPreviewHTML(notionConfig);

      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: 1440, height: 900 });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      // Save to R2
      const previewId = `notion-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.env.SCHEMA_EXPORTS.put(`previews/${previewId}.png`, screenshot, {
        httpMetadata: {
          contentType: 'image/png',
        },
      });

      return {
        previewUrl: `https://schema.chitty.cc/api/download/preview/${previewId}`,
        previewId,
      };

    } finally {
      await browser.close();
    }
  }

  /**
   * Generate migration report PDF
   */
  async generateMigrationReport(migration: {
    sourceSystem: string;
    targetSystem: string;
    plan: any;
    analysis: any;
  }): Promise<{ reportUrl: string; reportId: string }> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    try {
      const html = this.generateMigrationReportHTML(migration);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF report
      const pdf = await page.pdf({
        format: 'letter',
        printBackground: true,
        margin: { top: '1in', bottom: '1in', left: '0.75in', right: '0.75in' },
      });

      // Save to R2
      const reportId = `migration-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.env.SCHEMA_EXPORTS.put(`reports/${reportId}.pdf`, pdf, {
        httpMetadata: {
          contentType: 'application/pdf',
        },
      });

      return {
        reportUrl: `https://schema.chitty.cc/api/download/report/${reportId}`,
        reportId,
      };

    } finally {
      await browser.close();
    }
  }

  /**
   * Generate interactive schema explorer
   */
  async generateInteractiveExplorer(schema: any): Promise<{ explorerUrl: string }> {
    const browser = await puppeteer.launch(this.env.BROWSER);
    const page = await browser.newPage();

    try {
      // Generate interactive HTML with search, filtering, etc.
      const html = this.generateInteractiveExplorerHTML(schema);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Save as standalone HTML
      const htmlContent = await page.content();
      const explorerId = `explorer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await this.env.SCHEMA_EXPORTS.put(`explorers/${explorerId}.html`, htmlContent, {
        httpMetadata: {
          contentType: 'text/html',
        },
      });

      return {
        explorerUrl: `https://schema.chitty.cc/explorer/${explorerId}`,
      };

    } finally {
      await browser.close();
    }
  }

  // =====================================================
  // HTML GENERATORS
  // =====================================================

  private generateSchemaHTML(schema: any): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${schema.title} - ChittyChain Schema Documentation</title>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>${schema.title}</h1>
            <p class="subtitle">ChittyChain Schema for ${schema.platform}</p>
            <p class="date">Generated: ${new Date().toLocaleDateString()}</p>
          </header>

          <section>
            <h2>Overview</h2>
            <p>This schema includes ${schema.entities.length} entities optimized for legal evidence management.</p>

            <h3>Included Entities</h3>
            <ul>
              ${schema.entities.map(entity => `<li>${entity}</li>`).join('')}
            </ul>
          </section>

          <section class="page-break">
            <h2>Schema Definition</h2>
            <div class="schema-block">
              <pre><code>${this.escapeHtml(schema.content)}</code></pre>
            </div>
          </section>

          <section>
            <h2>Entity Details</h2>
            ${this.generateEntityTables(schema.entities)}
          </section>

          <section>
            <h2>Implementation Guide</h2>
            ${this.generateImplementationGuide(schema.platform)}
          </section>

          <footer>
            <p>© ${new Date().getFullYear()} ChittyChain - ChittyOS Framework</p>
            <p>Documentation generated by ChittyChain Schema Platform</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  private generateDiagramHTML(schema: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
        <style>
          body { margin: 0; padding: 20px; background: #f5f5f5; }
          #schema-diagram { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .entity { fill: #4a5568; stroke: #2d3748; stroke-width: 2; }
          .entity-label { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
          .field { fill: #f7fafc; stroke: #e2e8f0; stroke-width: 1; }
          .field-text { fill: #2d3748; font-family: Arial, sans-serif; font-size: 12px; }
          .relationship { stroke: #4299e1; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
          .relationship-label { fill: #4299e1; font-size: 11px; }
        </style>
      </head>
      <body>
        <div id="schema-diagram"></div>
        <script>
          const data = ${JSON.stringify(schema)};

          // D3.js code to render entity relationship diagram
          const width = 1600;
          const height = 900;

          const svg = d3.select('#schema-diagram')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

          // Define arrow marker
          svg.append('defs')
            .append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 9)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 10 3, 0 6');

          // Layout entities
          const entityWidth = 200;
          const entityHeight = 40;
          const fieldHeight = 25;

          // Draw entities
          data.entities.forEach((entity, i) => {
            const x = 100 + (i % 4) * 350;
            const y = 100 + Math.floor(i / 4) * 300;
            const totalHeight = entityHeight + entity.fields.length * fieldHeight;

            // Entity container
            const g = svg.append('g')
              .attr('transform', 'translate(' + x + ',' + y + ')');

            // Entity header
            g.append('rect')
              .attr('class', 'entity')
              .attr('width', entityWidth)
              .attr('height', entityHeight)
              .attr('rx', 4);

            g.append('text')
              .attr('class', 'entity-label')
              .attr('x', entityWidth / 2)
              .attr('y', entityHeight / 2 + 5)
              .attr('text-anchor', 'middle')
              .text(entity.name);

            // Fields
            entity.fields.forEach((field, j) => {
              const fieldY = entityHeight + j * fieldHeight;

              g.append('rect')
                .attr('class', 'field')
                .attr('y', fieldY)
                .attr('width', entityWidth)
                .attr('height', fieldHeight);

              g.append('text')
                .attr('class', 'field-text')
                .attr('x', 10)
                .attr('y', fieldY + fieldHeight / 2 + 4)
                .text(field.name + ': ' + field.type);
            });
          });

          // Draw relationships
          // (Simplified - would need proper path calculation for production)
        </script>
      </body>
      </html>
    `;
  }

  private generateNotionPreviewHTML(notionConfig: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: white;
            padding: 40px;
          }
          .notion-page {
            max-width: 1200px;
            margin: 0 auto;
          }
          .notion-header {
            margin-bottom: 40px;
          }
          .notion-title {
            font-size: 40px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .notion-description {
            font-size: 16px;
            color: #787774;
          }
          .notion-databases {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
          }
          .notion-database {
            border: 1px solid #e9e9e7;
            border-radius: 8px;
            padding: 20px;
            transition: box-shadow 0.2s;
          }
          .notion-database:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          .database-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
          }
          .database-icon {
            font-size: 24px;
            margin-right: 12px;
          }
          .database-title {
            font-size: 18px;
            font-weight: 600;
          }
          .database-properties {
            border-top: 1px solid #e9e9e7;
            padding-top: 12px;
            margin-top: 12px;
          }
          .property {
            display: flex;
            align-items: center;
            padding: 4px 0;
            font-size: 14px;
          }
          .property-name {
            font-weight: 500;
            margin-right: 8px;
            min-width: 100px;
          }
          .property-type {
            color: #787774;
            background: #f1f1ef;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="notion-page">
          <div class="notion-header">
            <h1 class="notion-title">ChittyChain Workspace</h1>
            <p class="notion-description">Legal Evidence Management System</p>
          </div>
          <div class="notion-databases">
            ${notionConfig.databases.map((db: any) => `
              <div class="notion-database">
                <div class="database-header">
                  <div class="database-icon">${db.icon}</div>
                  <div class="database-title">${db.name}</div>
                </div>
                <div class="database-properties">
                  ${Object.entries(db.properties).slice(0, 5).map(([name, prop]: [string, any]) => `
                    <div class="property">
                      <span class="property-name">${name}</span>
                      <span class="property-type">${prop.type || 'text'}</span>
                    </div>
                  `).join('')}
                  ${Object.keys(db.properties).length > 5 ? `
                    <div class="property">
                      <span class="property-name">... and ${Object.keys(db.properties).length - 5} more</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateMigrationReportHTML(migration: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 40px;
          }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .summary-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #3498db;
          }
          .summary-label {
            font-weight: 600;
            color: #6c757d;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-top: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
          }
          th {
            background: #f8f9fa;
            font-weight: 600;
          }
          .risk-high { color: #dc3545; font-weight: 600; }
          .risk-medium { color: #ffc107; font-weight: 600; }
          .risk-low { color: #28a745; font-weight: 600; }
          .timeline {
            background: linear-gradient(to right, #3498db 0%, #2ecc71 100%);
            height: 4px;
            margin: 40px 0;
            position: relative;
          }
        </style>
      </head>
      <body>
        <h1>ChittyChain Migration Report</h1>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Source System</div>
            <div class="summary-value">${migration.sourceSystem}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Target System</div>
            <div class="summary-value">${migration.targetSystem}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Estimated Duration</div>
            <div class="summary-value">${migration.plan.totalTime}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Complexity</div>
            <div class="summary-value">${migration.plan.complexity}</div>
          </div>
        </div>

        <h2>Migration Steps</h2>
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Risk Level</th>
              <th>Automation</th>
            </tr>
          </thead>
          <tbody>
            ${migration.plan.steps.map((step: any) => `
              <tr>
                <td>${step.order}</td>
                <td>${step.description}</td>
                <td>${step.estimatedTime}</td>
                <td class="risk-${step.risk}">${step.risk.toUpperCase()}</td>
                <td>${step.automationLevel}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recommendations</h2>
        <ul>
          ${migration.plan.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>

        <div class="timeline"></div>

        <p style="text-align: center; color: #6c757d; margin-top: 60px;">
          Generated by ChittyChain Schema Platform • ${new Date().toLocaleDateString()}
        </p>
      </body>
      </html>
    `;
  }

  private generateInteractiveExplorerHTML(schema: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ChittyChain Schema Explorer</title>
        <style>
          /* Styles for interactive explorer */
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
          .explorer-container { display: flex; height: 100vh; }
          .sidebar { width: 250px; background: #f8f9fa; border-right: 1px solid #dee2e6; overflow-y: auto; }
          .main-content { flex: 1; padding: 20px; overflow-y: auto; }
          .search-box { padding: 10px; background: white; border-bottom: 1px solid #dee2e6; }
          .search-input { width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px; }
          .entity-list { list-style: none; padding: 0; margin: 0; }
          .entity-item { padding: 12px 16px; cursor: pointer; transition: background 0.2s; }
          .entity-item:hover { background: #e9ecef; }
          .entity-item.active { background: #007bff; color: white; }
          .entity-details { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .field-grid { display: grid; gap: 10px; margin-top: 20px; }
          .field-card { border: 1px solid #dee2e6; border-radius: 4px; padding: 12px; }
          .field-name { font-weight: 600; }
          .field-type { color: #6c757d; font-size: 14px; }
          .relationships { margin-top: 30px; }
          .relationship-badge { display: inline-block; background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; margin: 4px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="explorer-container">
          <div class="sidebar">
            <div class="search-box">
              <input type="text" class="search-input" placeholder="Search entities..." id="searchInput">
            </div>
            <ul class="entity-list" id="entityList">
              <!-- Entity list will be populated here -->
            </ul>
          </div>
          <div class="main-content" id="mainContent">
            <div class="entity-details">
              <h1>ChittyChain Schema Explorer</h1>
              <p>Select an entity from the sidebar to view details.</p>
            </div>
          </div>
        </div>

        <script>
          const schemaData = ${JSON.stringify(schema)};

          // Initialize explorer
          function initExplorer() {
            const entityList = document.getElementById('entityList');
            const searchInput = document.getElementById('searchInput');
            const mainContent = document.getElementById('mainContent');

            // Populate entity list
            schemaData.entities.forEach(entity => {
              const li = document.createElement('li');
              li.className = 'entity-item';
              li.textContent = entity.name;
              li.onclick = () => showEntity(entity);
              entityList.appendChild(li);
            });

            // Search functionality
            searchInput.addEventListener('input', (e) => {
              const searchTerm = e.target.value.toLowerCase();
              const items = entityList.querySelectorAll('.entity-item');
              items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'block' : 'none';
              });
            });
          }

          function showEntity(entity) {
            const mainContent = document.getElementById('mainContent');

            // Update active state
            document.querySelectorAll('.entity-item').forEach(item => {
              item.classList.remove('active');
              if (item.textContent === entity.name) {
                item.classList.add('active');
              }
            });

            // Display entity details
            mainContent.innerHTML = \`
              <div class="entity-details">
                <h1>\${entity.name}</h1>
                <p>\${entity.description || 'Entity in the ChittyChain schema'}</p>

                <h2>Fields</h2>
                <div class="field-grid">
                  \${entity.fields.map(field => \`
                    <div class="field-card">
                      <div class="field-name">\${field.name}</div>
                      <div class="field-type">\${field.type} \${field.required ? '(required)' : ''}</div>
                    </div>
                  \`).join('')}
                </div>

                \${entity.relationships ? \`
                  <div class="relationships">
                    <h2>Relationships</h2>
                    \${entity.relationships.map(rel => \`
                      <span class="relationship-badge">\${rel.type} → \${rel.target}</span>
                    \`).join('')}
                  </div>
                \` : ''}
              </div>
            \`;
          }

          // Initialize on load
          initExplorer();
        </script>
      </body>
      </html>
    `;
  }

  private generateEntityTables(entities: string[]): string {
    // Generate detailed tables for each entity
    return entities.map(entity => `
      <div class="entity-section">
        <h3>${entity}</h3>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Description</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            <!-- Field details would be populated here -->
          </tbody>
        </table>
      </div>
    `).join('');
  }

  private generateImplementationGuide(platform: string): string {
    const guides: Record<string, string> = {
      postgresql: `
        <ol>
          <li>Create a new PostgreSQL database</li>
          <li>Run the provided SQL schema script</li>
          <li>Configure user permissions and roles</li>
          <li>Set up connection pooling and monitoring</li>
          <li>Implement backup and recovery procedures</li>
        </ol>
      `,
      notion: `
        <ol>
          <li>Create a new Notion workspace or use existing</li>
          <li>Import each database template</li>
          <li>Configure relations between databases</li>
          <li>Set up views and filters</li>
          <li>Invite team members and set permissions</li>
        </ol>
      `,
      mysql: `
        <ol>
          <li>Create a new MySQL database</li>
          <li>Adjust schema syntax for MySQL compatibility</li>
          <li>Run the schema creation scripts</li>
          <li>Configure indexing and optimization</li>
          <li>Set up replication if needed</li>
        </ol>
      `,
    };

    return guides[platform] || '<p>Custom implementation guide for this platform.</p>';
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}