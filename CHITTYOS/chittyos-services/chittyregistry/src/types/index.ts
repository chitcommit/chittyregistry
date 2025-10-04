// ChittyRegistry Types - Using authoritative schemas from schema.chitty.cc and canon.chitty.cc

import { z } from 'zod';

// Service Definition Schema (from schema.chitty.cc)
export const ServiceSchema = z.object({
  chittyId: z.string().min(1, 'ChittyID is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version'),
  baseUrl: z.string().url('Must be valid URL'),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    description: z.string().optional(),
    authenticated: z.boolean().default(false),
    rateLimit: z.number().optional()
  })),
  healthCheck: z.object({
    path: z.string().default('/health'),
    method: z.enum(['GET', 'HEAD']).default('GET'),
    expectedStatus: z.number().default(200),
    timeout: z.number().default(5000)
  }),
  category: z.enum([
    'core-infrastructure',
    'security-verification',
    'blockchain-infrastructure',
    'ai-intelligence',
    'document-evidence',
    'business-operations',
    'foundation-governance'
  ]),
  dependencies: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  certificationLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  metadata: z.record(z.any()).default({})
});

export type Service = z.infer<typeof ServiceSchema>;

// Health Status Schema (from canon.chitty.cc)
export const HealthStatusSchema = z.object({
  serviceId: z.string(),
  status: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']),
  lastCheck: z.string().datetime(),
  responseTime: z.number().min(0),
  uptime: z.number().min(0),
  details: z.object({
    version: z.string().optional(),
    dependencies: z.record(z.enum(['HEALTHY', 'UNHEALTHY'])).optional(),
    metrics: z.record(z.number()).optional(),
    errors: z.array(z.string()).optional()
  }).optional()
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// Service Registration Request Schema
export const ServiceRegistrationSchema = z.object({
  service: ServiceSchema,
  registrationToken: z.string().min(1, 'Registration token required'),
  environment: z.enum(['development', 'staging', 'production']).default('production')
});

export type ServiceRegistration = z.infer<typeof ServiceRegistrationSchema>;

// Discovery Query Schema
export const DiscoveryQuerySchema = z.object({
  serviceName: z.string().optional(),
  category: z.string().optional(),
  capability: z.string().optional(),
  healthStatus: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).optional(),
  certificationLevel: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  includeUnhealthy: z.boolean().default(false)
});

export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

// ChittyOS Service Definitions (canonical from canon.chitty.cc)
export const CHITTYOS_SERVICES = {
  // Core Infrastructure
  'chittyschema': {
    serviceName: 'chittyschema',
    displayName: 'ChittySchema',
    baseUrl: 'https://schema.chitty.cc',
    description: 'Schema Registry and Validation',
    category: 'core-infrastructure' as const,
    capabilities: ['schema-validation', 'type-definitions', 'canonical-schemas'] as string[]
  },
  'chittyid': {
    serviceName: 'chittyid',
    displayName: 'ChittyID',
    baseUrl: 'https://id.chitty.cc',
    description: 'Identity and JWT Service',
    category: 'core-infrastructure' as const,
    capabilities: ['identity-management', 'jwt-tokens', 'authentication'] as string[]
  },
  'chittyauth': {
    serviceName: 'chittyauth',
    displayName: 'ChittyAuth',
    baseUrl: 'https://auth.chitty.cc',
    description: 'Authentication and Authorization',
    category: 'core-infrastructure' as const,
    capabilities: ['authentication', 'authorization', 'session-management'] as string[]
  },
  'chittyregistry': {
    serviceName: 'chittyregistry',
    displayName: 'ChittyRegistry',
    baseUrl: 'https://registry.chitty.cc',
    description: 'Service Registry and Discovery',
    category: 'core-infrastructure' as const,
    capabilities: ['service-discovery', 'health-monitoring', 'service-registry'] as string[]
  },
  'chittycanon': {
    serviceName: 'chittycanon',
    displayName: 'ChittyCanon',
    baseUrl: 'https://canon.chitty.cc',
    description: 'Canonical Data Standards',
    category: 'core-infrastructure' as const,
    capabilities: ['data-standards', 'canonical-definitions', 'reference-data'] as string[]
  },
  'chittybeacon': {
    serviceName: 'chittybeacon',
    displayName: 'ChittyBeacon',
    baseUrl: 'https://beacon.chitty.cc',
    description: 'Service Discovery and Health Monitoring',
    category: 'core-infrastructure' as const,
    capabilities: ['health-monitoring', 'service-discovery', 'alerting'] as string[]
  },

  // Security & Verification
  'chittyverify': {
    serviceName: 'chittyverify',
    displayName: 'ChittyVerify',
    baseUrl: 'https://verify.chitty.cc',
    description: 'Verification and Compliance',
    category: 'security-verification' as const,
    capabilities: ['verification', 'compliance-checking', 'audit-trails'] as string[]
  },
  'chittytrust': {
    serviceName: 'chittytrust',
    displayName: 'ChittyTrust',
    baseUrl: 'https://trust.chitty.cc',
    description: '6D Trust Scoring Engine',
    category: 'security-verification' as const,
    capabilities: ['trust-scoring', 'reputation-management', '6d-analysis'] as string[]
  },
  'chittyentry': {
    serviceName: 'chittyentry',
    displayName: 'ChittyEntry',
    baseUrl: 'https://entry.chitty.cc',
    description: 'Enterprise Access Control',
    category: 'security-verification' as const,
    capabilities: ['access-control', 'enterprise-auth', 'permission-management'] as string[]
  },
  'chittycertify': {
    serviceName: 'chittycertify',
    displayName: 'ChittyCertify',
    baseUrl: 'https://certify.chitty.cc',
    description: 'ChittyCertified Compliance and Verification',
    category: 'security-verification' as const,
    capabilities: ['certification', 'compliance-verification', 'audit-certification'] as string[]
  },

  // AI & Intelligence
  'chittymcp': {
    serviceName: 'chittymcp',
    displayName: 'ChittyMCP',
    baseUrl: 'https://mcp.chitty.cc',
    description: 'Model Context Protocol Server and AI Integration',
    category: 'ai-intelligence' as const,
    capabilities: ['mcp-server', 'ai-integration', 'context-protocol'] as string[]
  },
  'chittyrouter': {
    serviceName: 'chittyrouter',
    displayName: 'ChittyRouter',
    baseUrl: 'https://router.chitty.cc',
    description: 'AI Gateway and Orchestration',
    category: 'ai-intelligence' as const,
    capabilities: ['ai-routing', 'request-orchestration', 'load-balancing'] as string[]
  },
  'chittyforce': {
    serviceName: 'chittyforce',
    displayName: 'ChittyForce',
    baseUrl: 'https://force.chitty.cc',
    description: 'AI Platform and Executive Services',
    category: 'ai-intelligence' as const,
    capabilities: ['ai-platform', 'executive-services', 'decision-support'] as string[]
  },
  'chittydna': {
    serviceName: 'chittydna',
    displayName: 'ChittyDNA',
    baseUrl: 'https://dna.chitty.cc',
    description: 'AI DNA Ownership and Data Rights Management',
    category: 'ai-intelligence' as const,
    capabilities: ['dna-management', 'pdx-protocol', 'data-rights'] as string[]
  },

  // Business Operations (continued)
  'chittychat': {
    serviceName: 'chittychat',
    displayName: 'ChittyChat',
    baseUrl: 'https://chat.chitty.cc',
    description: 'Project Management and Communication',
    category: 'business-operations' as const,
    capabilities: ['project-management', 'team-communication', 'collaboration'] as string[]
  },
  'chittyfinance': {
    serviceName: 'chittyfinance',
    displayName: 'ChittyFinance',
    baseUrl: 'https://finance.chitty.cc',
    description: 'Financial Operations Platform',
    category: 'business-operations' as const,
    capabilities: ['financial-operations', 'accounting', 'reporting'] as string[]
  },
  'chittyflow': {
    serviceName: 'chittyflow',
    displayName: 'ChittyFlow',
    baseUrl: 'https://flow.chitty.cc',
    description: 'Workflow Automation and Process Management',
    category: 'business-operations' as const,
    capabilities: ['workflow-automation', 'process-management', 'business-rules'] as string[]
  },
  'chittyresolution': {
    serviceName: 'chittyresolution',
    displayName: 'ChittyResolution',
    baseUrl: 'https://resolution.chitty.cc',
    description: 'Dispute Resolution and Case Management',
    category: 'business-operations' as const,
    capabilities: ['dispute-resolution', 'case-management', 'mediation'] as string[]
  },
  'chittycredit': {
    serviceName: 'chittycredit',
    displayName: 'ChittyCredit',
    baseUrl: 'https://credit.chitty.cc',
    description: 'Credit Analysis and Financial Assessment',
    category: 'business-operations' as const,
    capabilities: ['credit-analysis', 'financial-assessment', 'risk-evaluation'] as string[]
  },
  'chittyforge': {
    serviceName: 'chittyforge',
    displayName: 'ChittyForge',
    baseUrl: 'https://forge.chitty.cc',
    description: 'Development and Deployment Tools',
    category: 'business-operations' as const,
    capabilities: ['development-tools', 'deployment-automation', 'ci-cd'] as string[]
  },
  'chittybrand': {
    serviceName: 'chittybrand',
    displayName: 'ChittyBrand',
    baseUrl: 'https://brand.chitty.cc',
    description: 'Brand Management and Marketing Platform',
    category: 'business-operations' as const,
    capabilities: ['brand-management', 'marketing-campaigns', 'brand-consistency', 'marketing-analytics'] as string[]
  }
} as const;

// Authority Integration Schemas
export const AuthorityServiceSchema = z.object({
  chittySchema: z.object({
    url: z.literal('https://schema.chitty.cc'),
    endpoints: z.object({
      validateSchema: z.string().default('/validate'),
      getSchema: z.string().default('/schema'),
      listSchemas: z.string().default('/schemas')
    })
  }),
  chittyCanon: z.object({
    url: z.literal('https://canon.chitty.cc'),
    endpoints: z.object({
      getCanonical: z.string().default('/canonical'),
      validateData: z.string().default('/validate'),
      getStandards: z.string().default('/standards')
    })
  }),
  chittyId: z.object({
    url: z.literal('https://id.chitty.cc'),
    endpoints: z.object({
      validateToken: z.string().default('/validate'),
      generateToken: z.string().default('/token'),
      refreshToken: z.string().default('/refresh')
    })
  }),
  chittyTrust: z.object({
    url: z.literal('https://trust.chitty.cc'),
    endpoints: z.object({
      getTrustScore: z.string().default('/score'),
      validateTrust: z.string().default('/validate'),
      updateScore: z.string().default('/update')
    })
  })
});

export type AuthorityServices = z.infer<typeof AuthorityServiceSchema>;

// Registry Configuration Schema
export const RegistryConfigSchema = z.object({
  authorities: AuthorityServiceSchema,
  cache: z.object({
    ttl: z.number().default(300), // 5 minutes
    maxSize: z.number().default(1000)
  }),
  healthCheck: z.object({
    interval: z.number().default(30000), // 30 seconds
    timeout: z.number().default(5000),   // 5 seconds
    retries: z.number().default(3)
  }),
  security: z.object({
    requireAuthentication: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['https://chitty.cc', 'https://*.chitty.cc']),
    rateLimiting: z.object({
      windowMs: z.number().default(900000), // 15 minutes
      max: z.number().default(100)
    })
  })
});

export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;