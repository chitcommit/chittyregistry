#!/usr/bin/env node
/**
 * ChittyChain Schema Export Script
 * Generates and uploads schema artifacts to schema.chitty.cc
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SchemaExporter {
  constructor(options = {}) {
    this.options = {
      schemaFile: options.schemaFile || 'chittychain-production-schema.sql',
      notionFile: options.notionFile || 'notion-database-templates.md',
      outputDir: options.outputDir || 'dist',
      apiUrl: options.apiUrl || 'https://schema.chitty.cc/api',
      apiKey: options.apiKey || process.env.SCHEMA_API_KEY,
      ...options
    };
  }

  async export() {
    console.log('🚀 Starting ChittyChain Schema Export...\n');

    try {
      // Create output directory
      await fs.mkdir(this.options.outputDir, { recursive: true });

      // Parse schema
      const schemaData = await this.parseSchema();

      // Generate exports
      const exports = await this.generateExports(schemaData);

      // Upload to API
      if (this.options.apiKey) {
        await this.uploadToAPI(exports);
      }

      // Generate manifest
      await this.generateManifest(exports);

      console.log('✅ Schema export completed successfully!\n');
      console.log(`📁 Output directory: ${this.options.outputDir}`);
      console.log(`🌐 API URL: ${this.options.apiUrl}`);

    } catch (error) {
      console.error('❌ Schema export failed:', error.message);
      process.exit(1);
    }
  }

  async parseSchema() {
    console.log('📖 Parsing schema files...');

    const schemaContent = await fs.readFile(this.options.schemaFile, 'utf8');
    const notionContent = await fs.readFile(this.options.notionFile, 'utf8');

    // Extract tables from SQL
    const tables = this.extractTables(schemaContent);

    // Extract Notion templates
    const notionTemplates = this.extractNotionTemplates(notionContent);

    // Extract functions and triggers
    const functions = this.extractFunctions(schemaContent);
    const triggers = this.extractTriggers(schemaContent);
    const indexes = this.extractIndexes(schemaContent);

    console.log(`  📋 Found ${tables.length} tables`);
    console.log(`  📄 Found ${notionTemplates.length} Notion templates`);
    console.log(`  ⚙️ Found ${functions.length} functions`);
    console.log(`  🔗 Found ${triggers.length} triggers`);
    console.log(`  📊 Found ${indexes.length} indexes`);

    return {
      sql: schemaContent,
      tables,
      notionTemplates,
      functions,
      triggers,
      indexes,
      metadata: {
        version: this.extractVersion(schemaContent),
        generated_at: new Date().toISOString(),
        file_hash: crypto.createHash('sha256').update(schemaContent).digest('hex').substring(0, 16),
        total_lines: schemaContent.split('\n').length,
        entities: ['people', 'places', 'things', 'events', 'authorities', 'cases', 'evidence', 'facts']
      }
    };
  }

  extractTables(sql) {
    const tableRegex = /CREATE TABLE (\w+) \(\s*([\s\S]*?)\s*\);/gi;
    const tables = [];
    let match;

    while ((match = tableRegex.exec(sql)) !== null) {
      const [, tableName, columnsText] = match;

      const columns = this.parseColumns(columnsText);
      const constraints = this.parseConstraints(columnsText);

      tables.push({
        name: tableName,
        columns,
        constraints,
        entity_type: this.mapTableToEntity(tableName),
        description: this.extractTableComment(sql, tableName)
      });
    }

    return tables;
  }

  parseColumns(columnsText) {
    const lines = columnsText.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('--') && !line.startsWith('CONSTRAINT'));

    return lines
      .filter(line => !line.includes('PRIMARY KEY') && !line.includes('FOREIGN KEY') && !line.includes('CHECK'))
      .map(line => {
        // Remove trailing comma
        line = line.replace(/,$/, '');

        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const type = parts[1];
          const modifiers = parts.slice(2);

          return {
            name,
            type,
            nullable: !modifiers.includes('NOT NULL'),
            default: this.extractDefault(modifiers),
            references: this.extractReferences(line),
            description: this.extractColumnComment(line)
          };
        }
      })
      .filter(Boolean);
  }

  parseConstraints(columnsText) {
    const constraints = [];
    const lines = columnsText.split('\n').map(line => line.trim());

    for (const line of lines) {
      if (line.includes('PRIMARY KEY')) {
        constraints.push({
          type: 'PRIMARY_KEY',
          columns: this.extractConstraintColumns(line)
        });
      }

      if (line.includes('FOREIGN KEY') || line.includes('REFERENCES')) {
        constraints.push({
          type: 'FOREIGN_KEY',
          columns: this.extractConstraintColumns(line),
          references: this.extractReferences(line)
        });
      }

      if (line.includes('UNIQUE')) {
        constraints.push({
          type: 'UNIQUE',
          columns: this.extractConstraintColumns(line)
        });
      }

      if (line.includes('CHECK')) {
        constraints.push({
          type: 'CHECK',
          condition: this.extractCheckCondition(line)
        });
      }
    }

    return constraints;
  }

  extractNotionTemplates(content) {
    const templateRegex = /## 🏛️ Database \d+: (\w+) \((\w+)\)[\s\S]*?(?=##|$)/g;
    const templates = [];
    let match;

    while ((match = templateRegex.exec(content)) !== null) {
      const [sectionContent, name, code] = match;

      const properties = this.parseNotionProperties(sectionContent);
      const selectOptions = this.parseNotionSelectOptions(sectionContent);

      templates.push({
        name,
        entity_code: code,
        properties,
        selectOptions,
        description: `${name} database for ChittyChain legal management`,
        icon: this.getEntityIcon(name)
      });
    }

    return templates;
  }

  parseNotionProperties(section) {
    const properties = {};
    const tableRegex = /\| Property \| Type \| Description \|[\s\S]*?\n\n/;
    const match = section.match(tableRegex);

    if (match) {
      const tableContent = match[0];
      const rows = tableContent.split('\n')
        .filter(line => line.startsWith('|') && !line.includes('Property | Type | Description') && !line.includes('---'))
        .map(line => line.split('|').map(cell => cell.trim()).filter(cell => cell));

      for (const row of rows) {
        if (row.length >= 3) {
          const [name, type, description] = row;
          properties[name] = {
            type: this.mapNotionPropertyType(type),
            description
          };
        }
      }
    }

    return properties;
  }

  parseNotionSelectOptions(section) {
    const optionsRegex = /### Select Options:\s*([\s\S]*?)(?=---|$)/;
    const match = section.match(optionsRegex);
    const options = {};

    if (match) {
      const optionsText = match[1];
      const optionLines = optionsText.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim());

      let currentProperty = null;
      for (const line of optionLines) {
        if (line.includes('**') && line.includes('**:')) {
          currentProperty = line.match(/\*\*(.*?)\*\*:/)?.[1];
          if (currentProperty) {
            options[currentProperty] = [];
          }
        } else if (currentProperty && line.includes(',')) {
          const values = line.replace(/^-\s*/, '').split(',').map(v => v.trim());
          options[currentProperty].push(...values);
        }
      }
    }

    return options;
  }

  extractFunctions(sql) {
    const functionRegex = /CREATE OR REPLACE FUNCTION (\w+)\((.*?)\)\s*RETURNS (.*?)\s+AS \$\$([\s\S]*?)\$\$ LANGUAGE (\w+);/gi;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(sql)) !== null) {
      const [, name, parameters, returnType, body, language] = match;

      functions.push({
        name,
        parameters: parameters.trim(),
        return_type: returnType.trim(),
        language,
        body: body.trim(),
        description: this.extractFunctionComment(sql, name)
      });
    }

    return functions;
  }

  extractTriggers(sql) {
    const triggerRegex = /CREATE TRIGGER (\w+)\s+(BEFORE|AFTER|INSTEAD OF)\s+(\w+(?:\s+OR\s+\w+)*)\s+ON\s+(\w+)[\s\S]*?EXECUTE (?:FUNCTION|PROCEDURE) (\w+)\(\);/gi;
    const triggers = [];
    let match;

    while ((match = triggerRegex.exec(sql)) !== null) {
      const [, name, timing, events, table, functionName] = match;

      triggers.push({
        name,
        timing,
        events: events.split(/\s+OR\s+/),
        table,
        function: functionName,
        description: this.extractTriggerComment(sql, name)
      });
    }

    return triggers;
  }

  extractIndexes(sql) {
    const indexRegex = /CREATE (?:UNIQUE )?INDEX (\w+) ON (\w+)(?:\s+USING\s+(\w+))?\s*\((.*?)\);/gi;
    const indexes = [];
    let match;

    while ((match = indexRegex.exec(sql)) !== null) {
      const [fullMatch, name, table, method, columns] = match;

      indexes.push({
        name,
        table,
        method: method || 'btree',
        columns: columns.split(',').map(col => col.trim()),
        unique: fullMatch.includes('UNIQUE'),
        description: `Index on ${table}(${columns})`
      });
    }

    return indexes;
  }

  async generateExports(schemaData) {
    console.log('🏗️ Generating export files...');

    const exports = {
      sql: await this.generateSQLExports(schemaData),
      json: await this.generateJSONExports(schemaData),
      notion: await this.generateNotionExports(schemaData),
      documentation: await this.generateDocumentation(schemaData)
    };

    console.log('  📄 Generated SQL exports');
    console.log('  📋 Generated JSON schema');
    console.log('  📝 Generated Notion templates');
    console.log('  📚 Generated documentation');

    return exports;
  }

  async generateSQLExports(schemaData) {
    const exports = {};

    // Complete schema
    exports.complete = {
      filename: 'chittychain-complete-schema.sql',
      content: schemaData.sql,
      description: 'Complete production schema with all features'
    };

    // Core tables only
    const coreTableNames = ['people', 'places', 'things', 'events', 'authorities', 'cases', 'evidence', 'atomic_facts'];
    const coreTables = schemaData.tables.filter(t => coreTableNames.includes(t.name));

    exports.core = {
      filename: 'chittychain-core-schema.sql',
      content: this.generateTableSQL(coreTables),
      description: 'Core entities only - minimal deployment'
    };

    // Entity-specific exports
    for (const entityName of ['people', 'places', 'things', 'events', 'authorities']) {
      const entityTable = schemaData.tables.find(t => t.name === entityName);
      if (entityTable) {
        exports[entityName] = {
          filename: `chittychain-${entityName}-schema.sql`,
          content: this.generateTableSQL([entityTable]),
          description: `${entityName} entity schema`
        };
      }
    }

    // Write files
    for (const [key, export_] of Object.entries(exports)) {
      const filepath = path.join(this.options.outputDir, 'sql', export_.filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, export_.content);
    }

    return exports;
  }

  async generateJSONExports(schemaData) {
    const jsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'ChittyChain Database Schema',
      description: 'JSON Schema for ChittyChain legal database',
      version: schemaData.metadata.version,
      generated_at: schemaData.metadata.generated_at,

      definitions: {},
      properties: {},

      metadata: schemaData.metadata,
      tables: schemaData.tables,
      functions: schemaData.functions,
      triggers: schemaData.triggers,
      indexes: schemaData.indexes
    };

    // Generate JSON Schema definitions for each table
    for (const table of schemaData.tables) {
      jsonSchema.definitions[table.name] = {
        type: 'object',
        title: table.name,
        description: table.description,
        properties: {}
      };

      const required = [];

      for (const column of table.columns) {
        const property = {
          type: this.mapSQLTypeToJSON(column.type),
          description: column.description
        };

        if (column.default) {
          property.default = column.default;
        }

        jsonSchema.definitions[table.name].properties[column.name] = property;

        if (!column.nullable && !column.default) {
          required.push(column.name);
        }
      }

      if (required.length > 0) {
        jsonSchema.definitions[table.name].required = required;
      }
    }

    // Write files
    const exports = {
      complete: {
        filename: 'chittychain-schema.json',
        content: JSON.stringify(jsonSchema, null, 2),
        description: 'Complete JSON schema definition'
      },

      openapi: {
        filename: 'chittychain-openapi.json',
        content: JSON.stringify(this.generateOpenAPISchema(schemaData), null, 2),
        description: 'OpenAPI schema for REST API'
      }
    };

    for (const [key, export_] of Object.entries(exports)) {
      const filepath = path.join(this.options.outputDir, 'json', export_.filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, export_.content);
    }

    return exports;
  }

  async generateNotionExports(schemaData) {
    const exports = {};

    // Individual templates
    for (const template of schemaData.notionTemplates) {
      const notionConfig = {
        title: template.name,
        icon: { emoji: template.icon },
        properties: {}
      };

      // Convert properties to Notion format
      for (const [propName, prop] of Object.entries(template.properties)) {
        notionConfig.properties[propName] = {
          [prop.type]: {}
        };

        // Add select options if available
        if (prop.type === 'select' && template.selectOptions[propName]) {
          notionConfig.properties[propName].select = {
            options: template.selectOptions[propName].map(value => ({ name: value }))
          };
        }
      }

      exports[template.entity_code.toLowerCase()] = {
        filename: `notion-${template.entity_code.toLowerCase()}-template.json`,
        content: JSON.stringify(notionConfig, null, 2),
        description: `Notion template for ${template.name}`
      };
    }

    // Complete package
    exports.package = {
      filename: 'notion-complete-package.json',
      content: JSON.stringify({
        package_name: 'ChittyChain Notion Templates',
        version: schemaData.metadata.version,
        templates: Object.values(exports).map(e => ({
          name: e.filename,
          description: e.description
        })),
        installation_guide: 'See README.md for setup instructions'
      }, null, 2),
      description: 'Complete Notion template package'
    };

    // Write files
    for (const [key, export_] of Object.entries(exports)) {
      const filepath = path.join(this.options.outputDir, 'notion', export_.filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, export_.content);
    }

    return exports;
  }

  async generateDocumentation(schemaData) {
    const docs = {};

    // Schema overview
    docs.overview = {
      filename: 'schema-overview.md',
      content: this.generateSchemaOverview(schemaData),
      description: 'Complete schema documentation'
    };

    // Entity relationship diagram (Mermaid)
    docs.erd = {
      filename: 'entity-relationships.mmd',
      content: this.generateERDiagram(schemaData),
      description: 'Entity relationship diagram in Mermaid format'
    };

    // API documentation
    docs.api = {
      filename: 'api-reference.md',
      content: this.generateAPIDocumentation(schemaData),
      description: 'API endpoint documentation'
    };

    // Migration guide
    docs.migration = {
      filename: 'migration-guide.md',
      content: this.generateMigrationGuide(schemaData),
      description: 'Database migration and deployment guide'
    };

    // Write files
    for (const [key, doc] of Object.entries(docs)) {
      const filepath = path.join(this.options.outputDir, 'docs', doc.filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, doc.content);
    }

    return docs;
  }

  async uploadToAPI(exports) {
    if (!this.options.apiKey) {
      console.log('⚠️ No API key provided, skipping upload');
      return;
    }

    console.log('🌐 Uploading to schema.chitty.cc...');

    const uploadPromises = [];

    // Upload SQL files
    for (const [key, export_] of Object.entries(exports.sql)) {
      uploadPromises.push(this.uploadFile('sql', key, export_));
    }

    // Upload JSON files
    for (const [key, export_] of Object.entries(exports.json)) {
      uploadPromises.push(this.uploadFile('json', key, export_));
    }

    // Upload Notion templates
    for (const [key, export_] of Object.entries(exports.notion)) {
      uploadPromises.push(this.uploadFile('notion', key, export_));
    }

    // Upload documentation
    for (const [key, doc] of Object.entries(exports.documentation)) {
      uploadPromises.push(this.uploadFile('docs', key, doc));
    }

    try {
      await Promise.all(uploadPromises);
      console.log('  ✅ All files uploaded successfully');
    } catch (error) {
      console.error('  ❌ Upload failed:', error.message);
      throw error;
    }
  }

  async uploadFile(category, key, file) {
    const response = await fetch(`${this.options.apiUrl}/upload/${category}/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/octet-stream',
        'X-Filename': file.filename,
        'X-Description': file.description
      },
      body: file.content
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${file.filename}: ${response.statusText}`);
    }

    console.log(`    📤 Uploaded ${file.filename}`);
  }

  async generateManifest(exports) {
    const manifest = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      exports: {
        sql: Object.keys(exports.sql),
        json: Object.keys(exports.json),
        notion: Object.keys(exports.notion),
        documentation: Object.keys(exports.documentation)
      },
      total_files: Object.keys(exports.sql).length +
                   Object.keys(exports.json).length +
                   Object.keys(exports.notion).length +
                   Object.keys(exports.documentation).length,
      api_url: this.options.apiUrl,
      download_base_url: `${this.options.apiUrl}/download`
    };

    const manifestPath = path.join(this.options.outputDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`📋 Generated manifest: ${manifestPath}`);
  }

  // Helper methods
  extractVersion(sql) {
    const match = sql.match(/VALUES \('([\d.]+)',/);
    return match ? match[1] : '1.0.0';
  }

  mapTableToEntity(tableName) {
    const mapping = {
      'people': 'PEO',
      'places': 'PLACE',
      'things': 'PROP',
      'events': 'EVNT',
      'authorities': 'AUTH',
      'cases': 'CASE',
      'evidence': 'EVID',
      'atomic_facts': 'FACT'
    };
    return mapping[tableName] || 'UNKNOWN';
  }

  getEntityIcon(name) {
    const icons = {
      'People': '🏛️',
      'Places': '📍',
      'Things': '🏠',
      'Events': '⚡',
      'Authorities': '⚖️',
      'Cases': '📋',
      'Evidence': '🔍',
      'Facts': '💭'
    };
    return icons[name] || '📄';
  }

  mapNotionPropertyType(type) {
    const mapping = {
      'Title': 'title',
      'Rich Text': 'rich_text',
      'Number': 'number',
      'Select': 'select',
      'Multi-select': 'multi_select',
      'Date': 'date',
      'Checkbox': 'checkbox',
      'URL': 'url',
      'Email': 'email',
      'Phone': 'phone_number',
      'Relation': 'relation',
      'Created time': 'created_time',
      'Last edited time': 'last_edited_time'
    };
    return mapping[type] || 'rich_text';
  }

  mapSQLTypeToJSON(sqlType) {
    if (sqlType.includes('INT') || sqlType.includes('NUMERIC')) return 'number';
    if (sqlType.includes('BOOL')) return 'boolean';
    if (sqlType.includes('DATE') || sqlType.includes('TIME')) return 'string';
    if (sqlType.includes('JSONB') || sqlType.includes('JSON')) return 'object';
    if (sqlType.includes('[]')) return 'array';
    return 'string';
  }

  extractDefault(modifiers) {
    const defaultIndex = modifiers.findIndex(m => m.toUpperCase() === 'DEFAULT');
    return defaultIndex !== -1 && defaultIndex + 1 < modifiers.length ? modifiers[defaultIndex + 1] : null;
  }

  extractReferences(line) {
    const match = line.match(/REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)/i);
    return match ? { table: match[1], column: match[2] } : null;
  }

  extractConstraintColumns(line) {
    const match = line.match(/\(\s*(.*?)\s*\)/);
    return match ? match[1].split(',').map(col => col.trim()) : [];
  }

  extractCheckCondition(line) {
    const match = line.match(/CHECK\s*\(\s*(.*?)\s*\)/i);
    return match ? match[1] : null;
  }

  extractTableComment(sql, tableName) {
    // Look for comment above table definition
    const lines = sql.split('\n');
    const tableIndex = lines.findIndex(line => line.includes(`CREATE TABLE ${tableName}`));

    for (let i = tableIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('--')) {
        return line.replace(/^--\s*/, '');
      }
      if (line && !line.startsWith('--')) break;
    }

    return `${tableName} table`;
  }

  extractColumnComment(line) {
    const match = line.match(/--\s*(.+)$/);
    return match ? match[1].trim() : '';
  }

  extractFunctionComment(sql, functionName) {
    return `Function: ${functionName}`;
  }

  extractTriggerComment(sql, triggerName) {
    return `Trigger: ${triggerName}`;
  }

  generateTableSQL(tables) {
    return tables.map(table => `-- ${table.description}\nCREATE TABLE ${table.name} (\n  -- Table definition\n);`).join('\n\n');
  }

  generateOpenAPISchema(schemaData) {
    return {
      openapi: '3.1.0',
      info: {
        title: 'ChittyChain Schema API',
        version: schemaData.metadata.version,
        description: 'Generated from database schema'
      },
      components: {
        schemas: schemaData.tables.reduce((acc, table) => {
          acc[table.name] = {
            type: 'object',
            properties: table.columns.reduce((props, col) => {
              props[col.name] = { type: this.mapSQLTypeToJSON(col.type) };
              return props;
            }, {})
          };
          return acc;
        }, {})
      }
    };
  }

  generateSchemaOverview(schemaData) {
    return `# ChittyChain Schema Overview

Generated: ${schemaData.metadata.generated_at}
Version: ${schemaData.metadata.version}

## Tables (${schemaData.tables.length})

${schemaData.tables.map(table => `### ${table.name}
- **Entity Type**: ${table.entity_type}
- **Columns**: ${table.columns.length}
- **Description**: ${table.description}
`).join('\n')}

## Functions (${schemaData.functions.length})

${schemaData.functions.map(fn => `- **${fn.name}**: ${fn.description}`).join('\n')}

## Indexes (${schemaData.indexes.length})

${schemaData.indexes.map(idx => `- **${idx.name}**: ${idx.description}`).join('\n')}
`;
  }

  generateERDiagram(schemaData) {
    return `erDiagram
${schemaData.tables.map(table =>
  `  ${table.name.toUpperCase()} {\n${table.columns.slice(0, 5).map(col =>
    `    ${col.type} ${col.name}`).join('\n')}\n  }`
).join('\n')}

${schemaData.tables.map(table => {
  const refs = table.columns.filter(col => col.references);
  return refs.map(col => `  ${table.name.toUpperCase()} ||--o{ ${col.references.table.toUpperCase()} : ${col.name}`);
}).flat().join('\n')}
`;
  }

  generateAPIDocumentation(schemaData) {
    return `# ChittyChain Schema API

Base URL: ${this.options.apiUrl}

## Endpoints

### GET /templates
List all available schema templates

### POST /generate
Generate custom schema

### POST /validate
Validate schema against standards
`;
  }

  generateMigrationGuide(schemaData) {
    return `# Migration Guide

## Prerequisites
- PostgreSQL 13+
- Required extensions: uuid-ossp, pgcrypto

## Steps
1. Create database
2. Run schema script
3. Verify installation
4. Set up users and permissions

## Rollback
Included rollback scripts for safe migration.
`;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  const exporter = new SchemaExporter(options);
  exporter.export().catch(console.error);
}

module.exports = SchemaExporter;