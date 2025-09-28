/**
 * Production Deployment Configuration
 * ChittySchema Universal Data Framework
 */

module.exports = {
  // Application Configuration
  app: {
    name: 'ChittySchema',
    version: '0.1.0',
    port: process.env.PORT || 3000,
    environment: 'production'
  },

  // ChittyOS Integration
  chittyos: {
    framework: 'ChittyOS Standard Framework v1.0.1',
    sessionId: process.env.CHITTY_SESSION_ID || 'prod-deployment',
    serviceType: 'schema-service',
    features: {
      migration: true,
      sync: true,
      ai: true,
      blockchain: false, // Enable when ChittyChain is ready
      analytics: true,
      monitoring: true
    }
  },

  // Database Configuration
  database: {
    type: 'postgresql',
    url: process.env.DATABASE_URL,
    provider: 'neon',
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 20,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    schema: 'public'
  },

  // External Services
  services: {
    registry: {
      url: process.env.CHITTY_REGISTRY_URL || 'https://registry.chitty.cc',
      apiKey: process.env.CHITTY_REGISTRY_API_KEY,
      heartbeatInterval: 60000 // 1 minute
    },
    chain: {
      url: process.env.CHITTY_CHAIN_URL || 'https://chain.chitty.cc',
      apiKey: process.env.CHITTY_CHAIN_API_KEY,
      network: process.env.CHITTY_NETWORK || 'mainnet'
    },
    cookCounty: {
      apiUrl: process.env.COOK_COUNTY_API_URL || 'https://api.cookcountyassessor.com',
      apiKey: process.env.COOK_COUNTY_API_KEY,
      useMockData: process.env.USE_MOCK_DATA === 'true'
    }
  },

  // Security Configuration
  security: {
    cors: {
      origins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.chitty.cc', 'https://dashboard.chitty.cc'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Session-ID'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RATE_LIMIT_MAX || 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://registry.chitty.cc', 'https://chain.chitty.cc']
        }
      }
    }
  },

  // Monitoring & Analytics
  monitoring: {
    analytics: {
      enabled: true,
      retentionDays: 30,
      maxEvents: 100000
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      destinations: [
        'console',
        ...(process.env.LOG_FILE ? ['file'] : [])
      ]
    },
    healthcheck: {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      endpoints: [
        '/health',
        '/chittyos/status'
      ]
    }
  },

  // Performance Configuration
  performance: {
    compression: true,
    cache: {
      enabled: true,
      ttl: 300, // 5 minutes
      max: 1000 // max items
    },
    clustering: {
      enabled: process.env.CLUSTER_MODE === 'true',
      workers: process.env.CLUSTER_WORKERS || require('os').cpus().length
    }
  },

  // Migration Configuration
  migration: {
    batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE) || 1000,
    maxConcurrent: parseInt(process.env.MIGRATION_MAX_CONCURRENT) || 5,
    backupBeforeMigration: process.env.BACKUP_BEFORE_MIGRATION !== 'false'
  }
};