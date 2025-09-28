/**
 * Test Data Generator for Realistic ChittyChain Schema Testing
 * Generates comprehensive, realistic test data for security, performance, and functional testing
 */

import { randomBytes, createHash } from 'crypto';

export interface ChittyIdFormat {
  id: string;
  format: 'v4' | 'legacy' | 'invalid';
  trustLevel: 'low' | 'standard' | 'high' | 'admin';
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface SchemaDefinition {
  platform: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
  constraints: ConstraintDefinition[];
  metadata: SchemaMetadata;
}

export interface EntityDefinition {
  name: string;
  tableName: string;
  fields: FieldDefinition[];
  indexes: IndexDefinition[];
  permissions: PermissionDefinition;
}

export interface FieldDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  constraints: string[];
  sensitive: boolean;
}

export interface RelationshipDefinition {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: string;
  to: string;
  foreignKey: string;
  cascadeDelete: boolean;
}

export interface ConstraintDefinition {
  type: 'unique' | 'check' | 'foreign_key' | 'primary_key';
  fields: string[];
  expression?: string;
  referencedTable?: string;
}

export interface SchemaMetadata {
  version: string;
  description: string;
  author: string;
  tags: string[];
  compliance: string[];
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface PermissionDefinition {
  read: string[];
  write: string[];
  delete: string[];
  admin: string[];
}

export interface AttackPayload {
  category: 'sql_injection' | 'xss' | 'xxe' | 'command_injection' | 'path_traversal' | 'deserialization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  payload: string;
  description: string;
  expectedDetection: boolean;
  bypassTechniques: string[];
}

export interface LoadTestScenario {
  name: string;
  description: string;
  userCount: number;
  rampUpTime: number;
  duration: number;
  thinkTime: number;
  requests: LoadTestRequest[];
}

export interface LoadTestRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: any;
  weight: number;
  expectedResponseTime: number;
}

export class TestDataGenerator {
  private readonly COMMON_PASSWORDS = [
    'password123', 'admin', '123456', 'password', 'admin123',
    'root', 'test', 'user', 'guest', 'demo'
  ];

  private readonly COMMON_USERNAMES = [
    'admin', 'administrator', 'root', 'test', 'user', 'guest',
    'demo', 'support', 'system', 'service'
  ];

  private readonly LEGAL_ENTITY_TYPES = [
    'individual', 'corporation', 'llc', 'partnership', 'trust',
    'government', 'nonprofit', 'cooperative'
  ];

  private readonly COMPLIANCE_STANDARDS = [
    'GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI-DSS', 'SOC2', 'ISO27001'
  ];

  /**
   * Generate realistic ChittyID tokens for testing
   */
  generateChittyIds(count: number = 10): ChittyIdFormat[] {
    const ids: ChittyIdFormat[] = [];

    for (let i = 0; i < count; i++) {
      const format = this.randomChoice(['v4', 'legacy', 'invalid'] as const);
      const trustLevel = this.randomChoice(['low', 'standard', 'high', 'admin'] as const);

      let id: string;
      switch (format) {
        case 'v4':
          id = `CHITTY-${this.generateUuidV4()}`;
          break;
        case 'legacy':
          id = `CHITTY-${this.generateLegacyId()}`;
          break;
        case 'invalid':
          id = this.generateInvalidChittyId();
          break;
      }

      const issuedAt = Date.now() - Math.random() * 86400000; // Last 24 hours
      const expiresAt = issuedAt + (trustLevel === 'admin' ? 3600000 : 7200000); // 1-2 hours

      ids.push({
        id,
        format,
        trustLevel,
        issuedAt,
        expiresAt,
        signature: this.generateSignature(id, issuedAt)
      });
    }

    return ids;
  }

  /**
   * Generate comprehensive schema definitions for testing
   */
  generateSchemaDefinitions(count: number = 5): SchemaDefinition[] {
    const schemas: SchemaDefinition[] = [];

    const sampleEntities = [
      'users', 'organizations', 'contracts', 'documents', 'transactions',
      'cases', 'clients', 'matters', 'billing', 'timesheets', 'invoices',
      'court_filings', 'depositions', 'evidence', 'witnesses'
    ];

    for (let i = 0; i < count; i++) {
      const platform = this.randomChoice(['postgresql', 'mysql', 'mongodb', 'sqlite'] as const);
      const entityCount = Math.floor(Math.random() * 5) + 3; // 3-7 entities
      const selectedEntities = this.randomSample(sampleEntities, entityCount);

      const entities = selectedEntities.map(name => this.generateEntityDefinition(name, platform));
      const relationships = this.generateRelationships(entities);
      const constraints = this.generateConstraints(entities);

      schemas.push({
        platform,
        entities,
        relationships,
        constraints,
        metadata: {
          version: `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.0`,
          description: `Legal technology schema for ${this.randomChoice(['case management', 'document processing', 'billing system', 'client portal'])}`,
          author: this.generatePersonName(),
          tags: this.randomSample(['legal', 'finance', 'documents', 'compliance', 'audit'], 3),
          compliance: this.randomSample(this.COMPLIANCE_STANDARDS, 2)
        }
      });
    }

    return schemas;
  }

  /**
   * Generate realistic attack payloads for penetration testing
   */
  generateAttackPayloads(): AttackPayload[] {
    return [
      // SQL Injection payloads
      {
        category: 'sql_injection',
        severity: 'critical',
        payload: "'; DROP TABLE users; --",
        description: 'Classic SQL injection with table drop',
        expectedDetection: true,
        bypassTechniques: ['unicode encoding', 'comment obfuscation']
      },
      {
        category: 'sql_injection',
        severity: 'high',
        payload: "' UNION SELECT password FROM admin_users WHERE '1'='1",
        description: 'Union-based SQL injection for password extraction',
        expectedDetection: true,
        bypassTechniques: ['case variation', 'whitespace manipulation']
      },
      {
        category: 'sql_injection',
        severity: 'medium',
        payload: "1' OR SLEEP(5) --",
        description: 'Time-based blind SQL injection',
        expectedDetection: true,
        bypassTechniques: ['function obfuscation']
      },

      // XSS payloads
      {
        category: 'xss',
        severity: 'high',
        payload: '<script>alert("XSS")</script>',
        description: 'Basic reflected XSS',
        expectedDetection: true,
        bypassTechniques: ['encoding', 'tag variation']
      },
      {
        category: 'xss',
        severity: 'high',
        payload: '<img src="x" onerror="alert(\'XSS\')">',
        description: 'Event-based XSS using image tag',
        expectedDetection: true,
        bypassTechniques: ['attribute encoding', 'protocol variation']
      },
      {
        category: 'xss',
        severity: 'medium',
        payload: 'javascript:alert("XSS")',
        description: 'JavaScript protocol XSS',
        expectedDetection: true,
        bypassTechniques: ['protocol encoding']
      },

      // Command Injection
      {
        category: 'command_injection',
        severity: 'critical',
        payload: '; cat /etc/passwd',
        description: 'Unix command injection to read system files',
        expectedDetection: true,
        bypassTechniques: ['command chaining', 'environment variables']
      },
      {
        category: 'command_injection',
        severity: 'high',
        payload: '$(whoami)',
        description: 'Command substitution injection',
        expectedDetection: true,
        bypassTechniques: ['backtick variation', 'variable expansion']
      },

      // Path Traversal
      {
        category: 'path_traversal',
        severity: 'high',
        payload: '../../../etc/passwd',
        description: 'Directory traversal to access system files',
        expectedDetection: true,
        bypassTechniques: ['encoding', 'null byte injection']
      },
      {
        category: 'path_traversal',
        severity: 'medium',
        payload: '....//....//....//etc/passwd',
        description: 'Double encoding path traversal',
        expectedDetection: true,
        bypassTechniques: ['unicode encoding', 'mixed separators']
      },

      // XXE (XML External Entity)
      {
        category: 'xxe',
        severity: 'high',
        payload: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
        description: 'XML External Entity injection to read local files',
        expectedDetection: true,
        bypassTechniques: ['parameter entities', 'blind XXE']
      },

      // Deserialization
      {
        category: 'deserialization',
        severity: 'critical',
        payload: 'rO0ABXNyABNqYXZhLnV0aWwuQXJyYXlMaXN0eIHSHZnHYZ0DAAFJAARzaXpleHAAAAABdwQAAAABc3IAEGphdmEubGFuZy5TdHJpbmc=',
        description: 'Java deserialization payload (base64 encoded)',
        expectedDetection: true,
        bypassTechniques: ['gadget chain variation', 'custom serialization']
      }
    ];
  }

  /**
   * Generate load testing scenarios
   */
  generateLoadTestScenarios(): LoadTestScenario[] {
    return [
      {
        name: 'Normal Business Load',
        description: 'Typical daily usage pattern',
        userCount: 50,
        rampUpTime: 300, // 5 minutes
        duration: 1800, // 30 minutes
        thinkTime: 5000, // 5 seconds
        requests: [
          {
            endpoint: '/api/v1/schema/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { platform: 'postgresql', entities: ['users', 'documents'] },
            weight: 30,
            expectedResponseTime: 500
          },
          {
            endpoint: '/api/v1/schema/validate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { schema: 'sample_schema' },
            weight: 40,
            expectedResponseTime: 200
          },
          {
            endpoint: '/health',
            method: 'GET',
            headers: {},
            weight: 20,
            expectedResponseTime: 50
          },
          {
            endpoint: '/api/v1/schema/deploy',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { schema_id: 'test_schema', environment: 'staging' },
            weight: 10,
            expectedResponseTime: 1000
          }
        ]
      },

      {
        name: 'Peak Traffic Simulation',
        description: 'High load during peak business hours',
        userCount: 200,
        rampUpTime: 600, // 10 minutes
        duration: 3600, // 1 hour
        thinkTime: 2000, // 2 seconds
        requests: [
          {
            endpoint: '/api/v1/schema/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { platform: 'postgresql', entities: ['cases', 'clients', 'billing'] },
            weight: 35,
            expectedResponseTime: 800
          },
          {
            endpoint: '/api/v1/schema/validate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { schema: 'complex_schema' },
            weight: 45,
            expectedResponseTime: 300
          },
          {
            endpoint: '/session/create',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { trustLevel: 'standard' },
            weight: 15,
            expectedResponseTime: 150
          },
          {
            endpoint: '/api/v1/notion/webhook',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Notion-Signature': 'sha256=test' },
            body: { event: 'page_update', data: {} },
            weight: 5,
            expectedResponseTime: 100
          }
        ]
      },

      {
        name: 'Stress Test - Breaking Point',
        description: 'Extreme load to find system limits',
        userCount: 500,
        rampUpTime: 300, // 5 minutes
        duration: 1800, // 30 minutes
        thinkTime: 500, // 0.5 seconds
        requests: [
          {
            endpoint: '/api/v1/schema/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: this.generateLargeSchemaPayload(),
            weight: 60,
            expectedResponseTime: 2000
          },
          {
            endpoint: '/api/v1/schema/validate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: this.generateLargeSchemaPayload(),
            weight: 30,
            expectedResponseTime: 1000
          },
          {
            endpoint: '/session/create',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { trustLevel: 'high' },
            weight: 10,
            expectedResponseTime: 200
          }
        ]
      },

      {
        name: 'Gradual Ramp Up',
        description: 'Slow increase to monitor scaling behavior',
        userCount: 100,
        rampUpTime: 1800, // 30 minutes
        duration: 3600, // 1 hour
        thinkTime: 10000, // 10 seconds
        requests: [
          {
            endpoint: '/api/v1/schema/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Chitty-ID': 'CHITTY-test-id' },
            body: { platform: 'mysql', entities: ['organizations', 'contracts'] },
            weight: 50,
            expectedResponseTime: 400
          },
          {
            endpoint: '/health',
            method: 'GET',
            headers: {},
            weight: 50,
            expectedResponseTime: 50
          }
        ]
      }
    ];
  }

  /**
   * Generate realistic legal entity data
   */
  generateLegalEntityData(count: number = 100): any[] {
    const entities = [];

    for (let i = 0; i < count; i++) {
      const entityType = this.randomChoice(this.LEGAL_ENTITY_TYPES);

      entities.push({
        id: this.generateUuidV4(),
        name: this.generateCompanyName(),
        type: entityType,
        jurisdiction: this.randomChoice(['Delaware', 'California', 'New York', 'Texas', 'Nevada']),
        registration_number: this.generateRegistrationNumber(),
        tax_id: this.generateTaxId(),
        status: this.randomChoice(['active', 'inactive', 'pending', 'dissolved']),
        created_at: this.generateRecentDate(),
        updated_at: new Date().toISOString(),
        contact_info: {
          email: this.generateEmail(),
          phone: this.generatePhoneNumber(),
          address: this.generateAddress()
        },
        compliance_requirements: this.randomSample(this.COMPLIANCE_STANDARDS, 2),
        risk_level: this.randomChoice(['low', 'medium', 'high']),
        annual_revenue: Math.floor(Math.random() * 10000000) + 100000, // $100K - $10M
        employee_count: Math.floor(Math.random() * 1000) + 1
      });
    }

    return entities;
  }

  /**
   * Generate webhook payloads for Notion integration testing
   */
  generateNotionWebhookPayloads(): any[] {
    return [
      {
        event: 'page.created',
        timestamp: new Date().toISOString(),
        data: {
          page_id: this.generateUuidV4(),
          parent_id: this.generateUuidV4(),
          title: 'Contract Review - Acme Corp',
          properties: {
            status: 'In Progress',
            priority: 'High',
            assigned_to: this.generatePersonName(),
            due_date: this.generateFutureDate()
          }
        }
      },
      {
        event: 'page.updated',
        timestamp: new Date().toISOString(),
        data: {
          page_id: this.generateUuidV4(),
          changes: {
            status: { from: 'Draft', to: 'Under Review' },
            updated_by: this.generatePersonName(),
            updated_at: new Date().toISOString()
          }
        }
      },
      {
        event: 'database.created',
        timestamp: new Date().toISOString(),
        data: {
          database_id: this.generateUuidV4(),
          title: 'Case Management Database',
          schema: {
            case_number: 'title',
            client_name: 'text',
            status: 'select',
            created_date: 'date'
          }
        }
      }
    ];
  }

  // Private utility methods
  private generateUuidV4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateLegacyId(): string {
    return `LEGACY-${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateInvalidChittyId(): string {
    const invalidFormats = [
      'INVALID-123',
      'CHITTY-' + 'x'.repeat(35), // Too short
      'CHITTY-' + 'x'.repeat(37), // Too long
      'chitty-lowercase-id', // Wrong case
      'CHITTY_UNDERSCORE_ID', // Wrong separator
      '' // Empty
    ];
    return this.randomChoice(invalidFormats);
  }

  private generateSignature(id: string, timestamp: number): string {
    return createHash('sha256')
      .update(`${id}:${timestamp}:secret_key`)
      .digest('hex');
  }

  private generateEntityDefinition(name: string, platform: string): EntityDefinition {
    const commonFields = [
      { name: 'id', type: this.getPrimaryKeyType(platform), nullable: false, constraints: ['PRIMARY KEY'], sensitive: false },
      { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', constraints: [], sensitive: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', constraints: [], sensitive: false }
    ];

    const specificFields = this.generateSpecificFields(name, platform);

    return {
      name,
      tableName: `${name}_table`,
      fields: [...commonFields, ...specificFields],
      indexes: this.generateIndexes(name, [...commonFields, ...specificFields]),
      permissions: {
        read: ['user', 'admin'],
        write: ['admin'],
        delete: ['admin'],
        admin: ['super_admin']
      }
    };
  }

  private generateSpecificFields(entityName: string, platform: string): FieldDefinition[] {
    const fieldTemplates: Record<string, FieldDefinition[]> = {
      users: [
        { name: 'email', type: 'varchar(255)', nullable: false, constraints: ['UNIQUE'], sensitive: true },
        { name: 'password_hash', type: 'varchar(255)', nullable: false, constraints: [], sensitive: true },
        { name: 'first_name', type: 'varchar(100)', nullable: false, constraints: [], sensitive: true },
        { name: 'last_name', type: 'varchar(100)', nullable: false, constraints: [], sensitive: true },
        { name: 'role', type: 'varchar(50)', nullable: false, defaultValue: 'user', constraints: [], sensitive: false }
      ],
      organizations: [
        { name: 'name', type: 'varchar(255)', nullable: false, constraints: [], sensitive: false },
        { name: 'registration_number', type: 'varchar(50)', nullable: true, constraints: ['UNIQUE'], sensitive: false },
        { name: 'tax_id', type: 'varchar(20)', nullable: true, constraints: [], sensitive: true },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: 'active', constraints: [], sensitive: false }
      ],
      contracts: [
        { name: 'title', type: 'varchar(255)', nullable: false, constraints: [], sensitive: false },
        { name: 'contract_number', type: 'varchar(50)', nullable: false, constraints: ['UNIQUE'], sensitive: false },
        { name: 'value', type: 'decimal(15,2)', nullable: true, constraints: [], sensitive: true },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: 'draft', constraints: [], sensitive: false },
        { name: 'effective_date', type: 'date', nullable: true, constraints: [], sensitive: false },
        { name: 'expiration_date', type: 'date', nullable: true, constraints: [], sensitive: false }
      ]
    };

    return fieldTemplates[entityName] || [
      { name: 'name', type: 'varchar(255)', nullable: false, constraints: [], sensitive: false },
      { name: 'description', type: 'text', nullable: true, constraints: [], sensitive: false }
    ];
  }

  private generateIndexes(entityName: string, fields: FieldDefinition[]): IndexDefinition[] {
    const indexes = [];

    // Add index for email fields
    const emailField = fields.find(f => f.name === 'email');
    if (emailField) {
      indexes.push({
        name: `idx_${entityName}_email`,
        fields: ['email'],
        unique: true,
        type: 'btree' as const
      });
    }

    // Add index for commonly searched fields
    const nameField = fields.find(f => f.name === 'name');
    if (nameField) {
      indexes.push({
        name: `idx_${entityName}_name`,
        fields: ['name'],
        unique: false,
        type: 'btree' as const
      });
    }

    return indexes;
  }

  private generateRelationships(entities: EntityDefinition[]): RelationshipDefinition[] {
    const relationships = [];

    // Generate some realistic relationships
    const userEntity = entities.find(e => e.name === 'users');
    const orgEntity = entities.find(e => e.name === 'organizations');
    const contractEntity = entities.find(e => e.name === 'contracts');

    if (userEntity && orgEntity) {
      relationships.push({
        type: 'many-to-many' as const,
        from: 'users',
        to: 'organizations',
        foreignKey: 'user_organization',
        cascadeDelete: false
      });
    }

    if (contractEntity && orgEntity) {
      relationships.push({
        type: 'one-to-many' as const,
        from: 'organizations',
        to: 'contracts',
        foreignKey: 'organization_id',
        cascadeDelete: true
      });
    }

    return relationships;
  }

  private generateConstraints(entities: EntityDefinition[]): ConstraintDefinition[] {
    const constraints = [];

    entities.forEach(entity => {
      // Add primary key constraint
      constraints.push({
        type: 'primary_key' as const,
        fields: ['id']
      });

      // Add unique constraints for email fields
      const emailField = entity.fields.find(f => f.name === 'email');
      if (emailField) {
        constraints.push({
          type: 'unique' as const,
          fields: ['email']
        });
      }
    });

    return constraints;
  }

  private generateLargeSchemaPayload(): any {
    return {
      platform: 'postgresql',
      entities: Array.from({ length: 20 }, (_, i) => `entity_${i}`),
      complex_relationships: true,
      include_indexes: true,
      include_constraints: true,
      metadata: {
        description: 'Large complex schema for stress testing',
        version: '2.0.0'
      }
    };
  }

  private getPrimaryKeyType(platform: string): string {
    switch (platform) {
      case 'postgresql': return 'serial';
      case 'mysql': return 'int AUTO_INCREMENT';
      case 'sqlite': return 'integer';
      case 'mongodb': return 'ObjectId';
      default: return 'int';
    }
  }

  private randomChoice<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomSample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private generatePersonName(): string {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    return `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
  }

  private generateCompanyName(): string {
    const prefixes = ['Acme', 'Global', 'Innovative', 'Premier', 'Strategic', 'Dynamic'];
    const suffixes = ['Corp', 'LLC', 'Inc', 'Solutions', 'Partners', 'Group', 'Enterprises'];
    return `${this.randomChoice(prefixes)} ${this.randomChoice(suffixes)}`;
  }

  private generateEmail(): string {
    const domains = ['example.com', 'test.org', 'sample.net', 'demo.co'];
    const username = Math.random().toString(36).substring(2, 10);
    return `${username}@${this.randomChoice(domains)}`;
  }

  private generatePhoneNumber(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  private generateAddress(): any {
    return {
      street: `${Math.floor(Math.random() * 9999) + 1} ${this.randomChoice(['Main', 'Oak', 'Pine', 'Elm'])} St`,
      city: this.randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
      state: this.randomChoice(['NY', 'CA', 'IL', 'TX', 'AZ']),
      zip: Math.floor(Math.random() * 90000) + 10000
    };
  }

  private generateRegistrationNumber(): string {
    return `REG-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  }

  private generateTaxId(): string {
    return `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000000) + 1000000}`;
  }

  private generateRecentDate(): string {
    const daysAgo = Math.floor(Math.random() * 365);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  private generateFutureDate(): string {
    const daysAhead = Math.floor(Math.random() * 90) + 1;
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0]; // Return date only
  }
}