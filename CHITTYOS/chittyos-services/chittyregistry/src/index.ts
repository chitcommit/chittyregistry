// ChittyRegistry Main Application

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import config from './config';
import { logger } from './utils/logger';
import { RedisService } from './services/RedisService';
import { AuthorityService } from './services/AuthorityService';
import { RegistryService } from './services/RegistryService';
import { HealthMonitor } from './services/HealthMonitor';
import { AuthMiddleware } from './middleware/auth';
import { handleValidationError } from './middleware/validation';
import { createDiscoveryRouter } from './routes/discovery';
import { createRegistrationRouter } from './routes/registration';

class ChittyRegistry {
  private app: express.Application;
  private redis!: RedisService;
  private authority!: AuthorityService;
  private registry!: RegistryService;
  private healthMonitor!: HealthMonitor;
  private auth!: AuthMiddleware;

  constructor() {
    this.app = express();
    this.setupServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupServices(): void {
    // Initialize services
    this.redis = new RedisService(config.redis.url);
    this.authority = new AuthorityService(config.authorities);
    this.registry = new RegistryService(this.redis, this.authority);
    this.healthMonitor = new HealthMonitor(this.registry, config.healthCheck);
    this.auth = new AuthMiddleware(config.chittyId);
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // Check against allowed origins
        const isAllowed = config.security.allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin.replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(origin);
          }
          return allowedOrigin === origin;
        });

        if (isAllowed) {
          callback(null, true);
        } else {
          logger.warn('CORS blocked request', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    if (config.nodeEnv === 'production') {
      const limiter = rateLimit({
        windowMs: config.security.rateLimiting.windowMs,
        max: config.security.rateLimiting.max,
        message: {
          success: false,
          error: 'Too many requests, please try again later'
        },
        standardHeaders: true,
        legacyHeaders: false
      });
      this.app.use(limiter);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Request received', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/v1', createDiscoveryRouter(this.registry));
    this.app.use('/api/v1', createRegistrationRouter(this.registry, this.healthMonitor, this.auth));

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const stats = await this.registry.getRegistryStats();
        const monitoringStats = this.healthMonitor.getMonitoringStats();

        res.json({
          status: 'HEALTHY',
          service: config.serviceName,
          version: config.serviceVersion,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          stats: {
            ...stats,
            monitoring: monitoringStats,
            redis: {
              connected: this.redis.isConnected()
            }
          }
        });
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'UNHEALTHY',
          service: config.serviceName,
          version: config.serviceVersion,
          timestamp: new Date().toISOString(),
          error: 'Service unhealthy'
        });
      }
    });

    // Registry information endpoint
    this.app.get('/info', async (req, res) => {
      try {
        const stats = await this.registry.getRegistryStats();

        res.json({
          service: config.serviceName,
          version: config.serviceVersion,
          description: 'ChittyOS Service Registry and Discovery',
          capabilities: [
            'service-discovery',
            'health-monitoring',
            'service-registry'
          ],
          endpoints: {
            discovery: '/api/v1/discover',
            services: '/api/v1/services',
            registration: '/api/v1/register',
            health: '/health'
          },
          stats,
          authorities: Object.keys(config.authorities)
        });
      } catch (error) {
        logger.error('Info endpoint failed', { error: error.message });
        res.status(500).json({
          error: 'Failed to retrieve service information'
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'ChittyRegistry - Service Registry and Discovery',
        version: config.serviceVersion,
        documentation: 'https://docs.chitty.cc/registry',
        endpoints: {
          health: '/health',
          info: '/info',
          api: '/api/v1'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling(): void {
    // Validation error handler
    this.app.use(handleValidationError);

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        success: false,
        error: config.nodeEnv === 'production' ? 'Internal server error' : error.message
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis');

      // Check authority service health
      const authorityHealth = await this.authority.checkAuthorityHealth();
      const unhealthyAuthorities = Object.entries(authorityHealth)
        .filter(([, health]) => health.status !== 'HEALTHY')
        .map(([name]) => name);

      if (unhealthyAuthorities.length > 0) {
        logger.warn('Some authority services are unhealthy', { unhealthyAuthorities });
      } else {
        logger.info('All authority services are healthy');
      }

      // Bootstrap canonical services
      await this.registry.bootstrapCanonicalServices();
      logger.info('Canonical services bootstrapped');

      // Start health monitoring
      this.healthMonitor.start();
      logger.info('Health monitoring started');

      // Start server
      this.app.listen(config.port, () => {
        logger.info('ChittyRegistry started successfully', {
          port: config.port,
          nodeEnv: config.nodeEnv,
          version: config.serviceVersion
        });
      });

    } catch (error) {
      logger.error('Failed to start ChittyRegistry', { error: error.message });
      await this.shutdown();
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down ChittyRegistry...');

    try {
      // Stop health monitoring
      this.healthMonitor.stop();

      // Disconnect from Redis
      await this.redis.disconnect();

      logger.info('ChittyRegistry shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

// Handle graceful shutdown
const registry = new ChittyRegistry();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await registry.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await registry.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start the registry
registry.start().catch(error => {
  logger.error('Failed to start registry', { error: error.message });
  process.exit(1);
});