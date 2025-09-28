/**
 * Test Data Generator for ChittyChain Schema Testing
 * Generates realistic test data for schemas, attack payloads, and load scenarios
 */

export interface ChittyIdData {
  id: string;
  trustLevel: number;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface SchemaDefinition {
  id: string;
  name: string;
  platform: string;
  entities: EntityDefinition[];
  metadata: {
    version: string;
    created: string;
    compliance: string[];
    tags: string[];
  };
}

export interface EntityDefinition {
  name: string;
  fields: Record<string, FieldDefinition>;
  relationships: RelationshipDefinition[];
}

export interface FieldDefinition {
  type: string;
  required: boolean;
  validation?: string[];
  description?: string;
}

export interface RelationshipDefinition {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  required: boolean;
}

export interface AttackPayload {
  id: string;
  category: 'sql_injection' | 'xss' | 'command_injection' | 'path_traversal' | 'xxe' | 'ssrf';
  payload: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedDetection: boolean;
  bypassTechniques: string[];
  targetEndpoints: string[];
}

export interface LoadTestScenario {
  name: string;
  description: string;
  concurrent_users: number;
  ramp_up_time: number;
  test_duration: number;
  endpoints: LoadTestEndpoint[];
  success_criteria: {
    max_response_time: number;
    min_throughput: number;
    max_error_rate: number;
  };
}

export interface LoadTestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // Probability weight
  payload?: any;
  headers?: Record<string, string>;
}

export interface LegalEntityData {
  id: string;
  name: string;
  type: 'corporation' | 'llc' | 'partnership' | 'individual';
  jurisdiction: string;
  registration_number: string;
  incorporation_date: string;
  status: 'active' | 'inactive' | 'dissolved';
  addresses: AddressData[];
  contacts: ContactData[];
  compliance_data: ComplianceData;
}

export interface AddressData {
  type: 'registered' | 'business' | 'mailing';
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ContactData {
  type: 'primary' | 'legal' | 'technical';
  name: string;
  email: string;
  phone: string;
  title: string;
}

export interface ComplianceData {
  gdpr_applicable: boolean;
  data_retention_period: number;
  privacy_policy_url?: string;
  dpo_contact?: string;
  legal_basis: string[];
}

export class TestDataGenerator {
  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomChoice<T>(array: T[]): T {
    return array[this.random(0, array.length - 1)];
  }

  private randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[this.random(0, chars.length - 1)]).join('');
  }

  generateChittyIds(count: number): ChittyIdData[] {
    const trustLevels = [10, 25, 50, 75, 90, 95];
    const permissionSets = [
      ['read'],
      ['read', 'write'],
      ['read', 'write', 'admin'],
      ['read', 'write', 'admin', 'system'],
      ['superuser']
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `CHITTY-${this.randomString(8).toUpperCase()}`,
      trustLevel: this.randomChoice(trustLevels),
      permissions: this.randomChoice(permissionSets),
      metadata: {
        created: new Date(Date.now() - this.random(0, 365 * 24 * 60 * 60 * 1000)).toISOString(),
        last_used: new Date(Date.now() - this.random(0, 7 * 24 * 60 * 60 * 1000)).toISOString(),
        source: this.randomChoice(['web', 'api', 'mobile', 'cli']),
        region: this.randomChoice(['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'])
      }
    }));
  }

  generateSchemaDefinitions(count: number): SchemaDefinition[] {
    const platforms = ['notion', 'airtable', 'smartsheet', 'monday', 'clickup'];
    const entityTypes = [
      'User', 'Project', 'Task', 'Document', 'Client', 'Contract',
      'Invoice', 'Legal_Matter', 'Case', 'Billing_Entry', 'Time_Entry'
    ];
    const fieldTypes = ['string', 'number', 'boolean', 'date', 'email', 'url', 'text', 'enum'];
    const complianceFrameworks = ['GDPR', 'HIPAA', 'SOX', 'CCPA', 'ISO27001'];

    return Array.from({ length: count }, (_, i) => {
      const entityCount = this.random(2, 6);
      const entities: EntityDefinition[] = Array.from({ length: entityCount }, (_, j) => {
        const fieldCount = this.random(3, 8);
        const fields: Record<string, FieldDefinition> = {};

        for (let k = 0; k < fieldCount; k++) {
          const fieldName = `field_${k + 1}`;
          fields[fieldName] = {
            type: this.randomChoice(fieldTypes),
            required: Math.random() > 0.3,
            validation: Math.random() > 0.7 ? ['length:1-255'] : undefined,
            description: Math.random() > 0.5 ? `Description for ${fieldName}` : undefined
          };
        }

        return {
          name: this.randomChoice(entityTypes),
          fields,
          relationships: Math.random() > 0.5 ? [{
            type: this.randomChoice(['one-to-one', 'one-to-many', 'many-to-many']),
            target: this.randomChoice(entityTypes),
            required: Math.random() > 0.5
          }] : []
        };
      });

      return {
        id: `schema_${this.randomString(8)}`,
        name: `${this.randomChoice(['Legal', 'Finance', 'HR', 'Operations'])} Schema ${i + 1}`,
        platform: this.randomChoice(platforms),
        entities,
        metadata: {
          version: `${this.random(1, 3)}.${this.random(0, 9)}.${this.random(0, 9)}`,
          created: new Date(Date.now() - this.random(0, 180 * 24 * 60 * 60 * 1000)).toISOString(),
          compliance: Array.from({ length: this.random(1, 3) }, () => this.randomChoice(complianceFrameworks)),
          tags: [`${this.randomChoice(platforms)}_schema`, 'generated', 'test_data']
        }
      };
    });
  }

  generateAttackPayloads(): AttackPayload[] {
    const payloads: AttackPayload[] = [
      // SQL Injection
      {
        id: 'sql_001',
        category: 'sql_injection',
        payload: "1' OR '1'='1",
        description: 'Classic SQL injection with OR condition',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['url_encoding', 'double_encoding'],
        targetEndpoints: ['/api/schemas/search', '/api/users/search']
      },
      {
        id: 'sql_002',
        category: 'sql_injection',
        payload: "'; DROP TABLE users; --",
        description: 'SQL injection with DROP TABLE command',
        severity: 'critical',
        expectedDetection: true,
        bypassTechniques: ['case_variation', 'comment_obfuscation'],
        targetEndpoints: ['/api/schemas/create', '/api/schemas/update']
      },
      {
        id: 'sql_003',
        category: 'sql_injection',
        payload: "1 UNION SELECT password FROM users",
        description: 'UNION-based SQL injection for data extraction',
        severity: 'critical',
        expectedDetection: true,
        bypassTechniques: ['whitespace_manipulation', 'hex_encoding'],
        targetEndpoints: ['/api/schemas/validate', '/api/auth/login']
      },

      // XSS
      {
        id: 'xss_001',
        category: 'xss',
        payload: '<script>alert("XSS")</script>',
        description: 'Basic XSS payload with script tag',
        severity: 'medium',
        expectedDetection: true,
        bypassTechniques: ['tag_obfuscation', 'event_handlers'],
        targetEndpoints: ['/api/schemas/create', '/api/comments/create']
      },
      {
        id: 'xss_002',
        category: 'xss',
        payload: '<img src=x onerror=alert(1)>',
        description: 'XSS using image onerror event',
        severity: 'medium',
        expectedDetection: true,
        bypassTechniques: ['attribute_injection', 'javascript_protocol'],
        targetEndpoints: ['/api/schemas/update', '/api/user/profile']
      },
      {
        id: 'xss_003',
        category: 'xss',
        payload: 'javascript:alert(document.cookie)',
        description: 'XSS using javascript protocol',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['protocol_obfuscation', 'encoding'],
        targetEndpoints: ['/api/schemas/create', '/api/links/create']
      },

      // Command Injection
      {
        id: 'cmd_001',
        category: 'command_injection',
        payload: '; cat /etc/passwd',
        description: 'Command injection to read system files',
        severity: 'critical',
        expectedDetection: true,
        bypassTechniques: ['command_chaining', 'backticks'],
        targetEndpoints: ['/api/files/process', '/api/import/csv']
      },
      {
        id: 'cmd_002',
        category: 'command_injection',
        payload: '`whoami`',
        description: 'Command injection using backticks',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['variable_expansion', 'command_substitution'],
        targetEndpoints: ['/api/scripts/run', '/api/tools/execute']
      },

      // Path Traversal
      {
        id: 'path_001',
        category: 'path_traversal',
        payload: '../../../etc/passwd',
        description: 'Directory traversal to access system files',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['url_encoding', 'double_encoding', 'unicode_encoding'],
        targetEndpoints: ['/api/files/read', '/api/download']
      },
      {
        id: 'path_002',
        category: 'path_traversal',
        payload: '..\\..\\..\\windows\\system32\\config\\sam',
        description: 'Windows directory traversal to SAM file',
        severity: 'critical',
        expectedDetection: true,
        bypassTechniques: ['backslash_encoding', 'mixed_separators'],
        targetEndpoints: ['/api/files/read', '/api/backup/restore']
      },

      // XXE
      {
        id: 'xxe_001',
        category: 'xxe',
        payload: '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><test>&xxe;</test>',
        description: 'XML External Entity injection',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['entity_encoding', 'parameter_entities'],
        targetEndpoints: ['/api/import/xml', '/api/schemas/import']
      },

      // SSRF
      {
        id: 'ssrf_001',
        category: 'ssrf',
        payload: 'http://169.254.169.254/latest/meta-data/',
        description: 'SSRF targeting AWS metadata service',
        severity: 'high',
        expectedDetection: true,
        bypassTechniques: ['ip_obfuscation', 'redirect_chains'],
        targetEndpoints: ['/api/webhooks/test', '/api/integrations/validate']
      }
    ];

    return payloads;
  }

  generateLoadTestScenarios(): LoadTestScenario[] {
    return [
      {
        name: 'Basic Load Test',
        description: 'Standard user behavior simulation',
        concurrent_users: 50,
        ramp_up_time: 60, // seconds
        test_duration: 300, // seconds
        endpoints: [
          { path: '/health', method: 'GET', weight: 20 },
          { path: '/api/schemas', method: 'GET', weight: 30 },
          { path: '/api/schemas/validate', method: 'POST', weight: 25, payload: { schema: 'test' } },
          { path: '/api/session/info', method: 'GET', weight: 15 },
          { path: '/api/auth/validate', method: 'POST', weight: 10, payload: { token: 'test' } }
        ],
        success_criteria: {
          max_response_time: 2000, // ms
          min_throughput: 25, // req/s
          max_error_rate: 5 // %
        }
      },
      {
        name: 'High Throughput Test',
        description: 'Testing system limits under high load',
        concurrent_users: 200,
        ramp_up_time: 120,
        test_duration: 600,
        endpoints: [
          { path: '/api/schemas', method: 'GET', weight: 40 },
          { path: '/api/schemas/search', method: 'GET', weight: 30 },
          { path: '/health', method: 'GET', weight: 20 },
          { path: '/api/version', method: 'GET', weight: 10 }
        ],
        success_criteria: {
          max_response_time: 5000,
          min_throughput: 80,
          max_error_rate: 10
        }
      },
      {
        name: 'Stress Test',
        description: 'Breaking point identification',
        concurrent_users: 500,
        ramp_up_time: 300,
        test_duration: 900,
        endpoints: [
          { path: '/api/schemas', method: 'GET', weight: 25 },
          { path: '/api/schemas/validate', method: 'POST', weight: 25, payload: { complex: 'schema' } },
          { path: '/api/session/create', method: 'POST', weight: 20 },
          { path: '/api/webhooks/process', method: 'POST', weight: 15 },
          { path: '/health', method: 'GET', weight: 15 }
        ],
        success_criteria: {
          max_response_time: 10000,
          min_throughput: 20,
          max_error_rate: 25
        }
      },
      {
        name: 'Spike Test',
        description: 'Sudden load increase simulation',
        concurrent_users: 300,
        ramp_up_time: 30, // Very fast ramp-up
        test_duration: 180,
        endpoints: [
          { path: '/api/schemas', method: 'GET', weight: 35 },
          { path: '/api/schemas/create', method: 'POST', weight: 25, payload: { name: 'test' } },
          { path: '/api/auth/login', method: 'POST', weight: 20 },
          { path: '/api/session/update', method: 'PUT', weight: 20 }
        ],
        success_criteria: {
          max_response_time: 8000,
          min_throughput: 15,
          max_error_rate: 20
        }
      }
    ];
  }

  generateLegalEntityData(count: number): LegalEntityData[] {
    const entityTypes: Array<'corporation' | 'llc' | 'partnership' | 'individual'> =
      ['corporation', 'llc', 'partnership', 'individual'];
    const jurisdictions = ['Delaware', 'Nevada', 'California', 'New York', 'Texas', 'Florida'];
    const statuses: Array<'active' | 'inactive' | 'dissolved'> = ['active', 'inactive', 'dissolved'];
    const addressTypes: Array<'registered' | 'business' | 'mailing'> = ['registered', 'business', 'mailing'];
    const contactTypes: Array<'primary' | 'legal' | 'technical'> = ['primary', 'legal', 'technical'];

    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA'];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Jennifer'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    return Array.from({ length: count }, (_, i) => {
      const entityType = this.randomChoice(entityTypes);
      const addressCount = this.random(1, 3);
      const contactCount = this.random(1, 4);

      return {
        id: `entity_${this.randomString(8)}`,
        name: `${this.randomChoice(['Acme', 'Global', 'Premier', 'United', 'Advanced'])} ${this.randomChoice(['Corp', 'LLC', 'Inc', 'Ltd', 'Partners'])}`,
        type: entityType,
        jurisdiction: this.randomChoice(jurisdictions),
        registration_number: `REG${this.random(100000, 999999)}`,
        incorporation_date: new Date(Date.now() - this.random(0, 10 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        status: this.randomChoice(statuses),
        addresses: Array.from({ length: addressCount }, (_, j) => ({
          type: this.randomChoice(addressTypes),
          street: `${this.random(100, 9999)} ${this.randomChoice(['Main', 'Oak', 'Pine', 'Elm', 'Cedar'])} St`,
          city: this.randomChoice(cities),
          state: this.randomChoice(states),
          zip: `${this.random(10000, 99999)}`,
          country: 'US'
        })),
        contacts: Array.from({ length: contactCount }, (_, k) => {
          const firstName = this.randomChoice(firstNames);
          const lastName = this.randomChoice(lastNames);
          return {
            type: this.randomChoice(contactTypes),
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone: `+1-${this.random(200, 999)}-${this.random(200, 999)}-${this.random(1000, 9999)}`,
            title: this.randomChoice(['CEO', 'CTO', 'Legal Counsel', 'CFO', 'COO', 'General Manager'])
          };
        }),
        compliance_data: {
          gdpr_applicable: Math.random() > 0.7,
          data_retention_period: this.random(1, 10) * 365, // days
          privacy_policy_url: Math.random() > 0.5 ? 'https://example.com/privacy' : undefined,
          dpo_contact: Math.random() > 0.8 ? 'dpo@example.com' : undefined,
          legal_basis: this.randomChoice([
            ['legitimate_interest'],
            ['consent'],
            ['contract'],
            ['consent', 'legitimate_interest'],
            ['legal_obligation', 'legitimate_interest']
          ])
        }
      };
    });
  }

  // Utility methods for generating realistic test data
  generateTestSchemaPayload(): any {
    return {
      name: `Test Schema ${this.randomString(6)}`,
      platform: this.randomChoice(['notion', 'airtable', 'smartsheet']),
      entities: [
        {
          name: 'TestEntity',
          fields: {
            title: { type: 'string', required: true },
            status: { type: 'enum', values: ['draft', 'active', 'archived'] },
            created_date: { type: 'date', required: true }
          }
        }
      ]
    };
  }

  generateTestUserPayload(): any {
    const firstName = this.randomChoice(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
    const lastName = this.randomChoice(['Anderson', 'Brown', 'Clark', 'Davis', 'Evans']);

    return {
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${this.randomString(4)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testdomain.com`,
      full_name: `${firstName} ${lastName}`,
      role: this.randomChoice(['user', 'admin', 'viewer']),
      preferences: {
        theme: this.randomChoice(['light', 'dark']),
        notifications: Math.random() > 0.5
      }
    };
  }

  generateTestWebhookPayload(): any {
    return {
      id: `webhook_${this.randomString(12)}`,
      type: this.randomChoice(['page.updated', 'database.updated', 'block.created']),
      timestamp: new Date().toISOString(),
      data: {
        object_id: this.randomString(32),
        changes: this.randomChoice([['title'], ['status'], ['content'], ['properties']])
      }
    };
  }
}