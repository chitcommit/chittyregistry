// Neon Database Service for ChittyRegistry
// Provides persistent storage for registry data, health history, and MCP agent state

import { Client } from 'pg';
import { logger } from '../utils/logger';

export class NeonService {
  private client: Client;
  private connected = false;

  constructor(private connectionString: string) {
    this.client = new Client({
      connectionString: this.connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      logger.info('Connected to Neon database');

      // Initialize schema
      await this.initializeSchema();
    } catch (error) {
      logger.error('Failed to connect to Neon database', { error: error.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();
      this.connected = false;
      logger.info('Disconnected from Neon database');
    } catch (error) {
      logger.error('Failed to disconnect from Neon database', { error: error.message });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async initializeSchema(): Promise<void> {
    try {
      // Services table for persistent registry data
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          chitty_id VARCHAR(255) UNIQUE NOT NULL,
          service_name VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT,
          version VARCHAR(50) NOT NULL,
          base_url VARCHAR(500) NOT NULL,
          category VARCHAR(100) NOT NULL,
          capabilities JSONB DEFAULT '[]',
          endpoints JSONB DEFAULT '[]',
          health_check JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          trust_score INTEGER DEFAULT 0,
          trust_level VARCHAR(50) DEFAULT 'UNVERIFIED',
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          registered_by VARCHAR(255),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_canonical BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true
        )
      `);

      // Health history table for monitoring trends
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS health_history (
          id SERIAL PRIMARY KEY,
          service_name VARCHAR(255) NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_time INTEGER DEFAULT 0,
          uptime DECIMAL(5,2) DEFAULT 0,
          details JSONB DEFAULT '{}',
          checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_name) REFERENCES services(service_name) ON DELETE CASCADE
        )
      `);

      // MCP agent sessions for stateful interactions
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS mcp_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_id VARCHAR(255),
          state JSONB DEFAULT '{}',
          preferences JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          queries_count INTEGER DEFAULT 0
        )
      `);

      // Service usage analytics
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS service_usage (
          id SERIAL PRIMARY KEY,
          service_name VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          session_id VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          parameters JSONB DEFAULT '{}',
          response_time INTEGER DEFAULT 0,
          success BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_name) REFERENCES services(service_name) ON DELETE CASCADE
        )
      `);

      // Authority service status
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS authority_status (
          id SERIAL PRIMARY KEY,
          authority_name VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_time INTEGER DEFAULT 0,
          details JSONB DEFAULT '{}',
          checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for performance
      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_services_name ON services(service_name);
        CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
        CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
        CREATE INDEX IF NOT EXISTS idx_health_service_time ON health_history(service_name, checked_at);
        CREATE INDEX IF NOT EXISTS idx_mcp_session ON mcp_sessions(session_id);
        CREATE INDEX IF NOT EXISTS idx_usage_service_time ON service_usage(service_name, created_at);
      `);

      logger.info('Neon database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Neon database schema', { error: error.message });
      throw error;
    }
  }

  // Service Management
  async upsertService(service: any): Promise<void> {
    try {
      await this.client.query(`
        INSERT INTO services (
          chitty_id, service_name, display_name, description, version,
          base_url, category, capabilities, endpoints, health_check,
          metadata, trust_score, trust_level, registered_by, is_canonical
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (service_name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          version = EXCLUDED.version,
          base_url = EXCLUDED.base_url,
          category = EXCLUDED.category,
          capabilities = EXCLUDED.capabilities,
          endpoints = EXCLUDED.endpoints,
          health_check = EXCLUDED.health_check,
          metadata = EXCLUDED.metadata,
          trust_score = EXCLUDED.trust_score,
          trust_level = EXCLUDED.trust_level,
          last_updated = CURRENT_TIMESTAMP
      `, [
        service.chittyId,
        service.serviceName,
        service.displayName,
        service.description,
        service.version,
        service.baseUrl,
        service.category,
        JSON.stringify(service.capabilities || []),
        JSON.stringify(service.endpoints || []),
        JSON.stringify(service.healthCheck || {}),
        JSON.stringify(service.metadata || {}),
        service.trustScore || 0,
        service.trustLevel || 'UNVERIFIED',
        service.registeredBy,
        service.metadata?.canonical || false
      ]);
    } catch (error) {
      logger.error('Failed to upsert service in Neon', { error: error.message, service: service.serviceName });
      throw error;
    }
  }

  async getService(serviceName: string): Promise<any> {
    try {
      const result = await this.client.query(
        'SELECT * FROM services WHERE service_name = $1 AND is_active = true',
        [serviceName]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get service from Neon', { error: error.message, serviceName });
      return null;
    }
  }

  async getServices(filters: any = {}): Promise<any[]> {
    try {
      let query = 'SELECT * FROM services WHERE is_active = true';
      const params: any[] = [];
      let paramCount = 0;

      if (filters.category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(filters.category);
      }

      if (filters.capability) {
        paramCount++;
        query += ` AND capabilities ? $${paramCount}`;
        params.push(filters.capability);
      }

      query += ' ORDER BY service_name';

      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get services from Neon', { error: error.message, filters });
      return [];
    }
  }

  // Health Monitoring
  async recordHealthStatus(serviceName: string, health: any): Promise<void> {
    try {
      await this.client.query(`
        INSERT INTO health_history (service_name, status, response_time, uptime, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        serviceName,
        health.status,
        health.responseTime || 0,
        health.uptime || 0,
        JSON.stringify(health.details || {})
      ]);
    } catch (error) {
      logger.error('Failed to record health status in Neon', { error: error.message, serviceName });
    }
  }

  async getHealthHistory(serviceName: string, hours: number = 24): Promise<any[]> {
    try {
      const result = await this.client.query(`
        SELECT * FROM health_history
        WHERE service_name = $1 AND checked_at > NOW() - INTERVAL '${hours} hours'
        ORDER BY checked_at DESC
        LIMIT 100
      `, [serviceName]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get health history from Neon', { error: error.message, serviceName });
      return [];
    }
  }

  // MCP Agent State Management
  async getMCPSession(sessionId: string): Promise<any> {
    try {
      const result = await this.client.query(
        'SELECT * FROM mcp_sessions WHERE session_id = $1',
        [sessionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get MCP session from Neon', { error: error.message, sessionId });
      return null;
    }
  }

  async upsertMCPSession(sessionId: string, userId: string, state: any, preferences: any = {}): Promise<void> {
    try {
      await this.client.query(`
        INSERT INTO mcp_sessions (session_id, user_id, state, preferences, queries_count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (session_id) DO UPDATE SET
          state = EXCLUDED.state,
          preferences = EXCLUDED.preferences,
          updated_at = CURRENT_TIMESTAMP,
          last_active = CURRENT_TIMESTAMP,
          queries_count = mcp_sessions.queries_count + 1
      `, [
        sessionId,
        userId,
        JSON.stringify(state),
        JSON.stringify(preferences)
      ]);
    } catch (error) {
      logger.error('Failed to upsert MCP session in Neon', { error: error.message, sessionId });
    }
  }

  // Analytics
  async recordServiceUsage(serviceName: string, userId: string, sessionId: string, action: string, parameters: any, responseTime: number, success: boolean): Promise<void> {
    try {
      await this.client.query(`
        INSERT INTO service_usage (service_name, user_id, session_id, action, parameters, response_time, success)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        serviceName,
        userId,
        sessionId,
        action,
        JSON.stringify(parameters),
        responseTime,
        success
      ]);
    } catch (error) {
      logger.error('Failed to record service usage in Neon', { error: error.message });
    }
  }

  async getUsageAnalytics(serviceName?: string, days: number = 7): Promise<any> {
    try {
      let query = `
        SELECT
          service_name,
          COUNT(*) as total_requests,
          AVG(response_time) as avg_response_time,
          COUNT(CASE WHEN success THEN 1 END) as successful_requests,
          COUNT(DISTINCT user_id) as unique_users,
          DATE_TRUNC('day', created_at) as date
        FROM service_usage
        WHERE created_at > NOW() - INTERVAL '${days} days'
      `;

      const params: any[] = [];
      if (serviceName) {
        query += ' AND service_name = $1';
        params.push(serviceName);
      }

      query += ' GROUP BY service_name, DATE_TRUNC(\'day\', created_at) ORDER BY date DESC';

      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get usage analytics from Neon', { error: error.message });
      return [];
    }
  }

  // Authority Status
  async recordAuthorityStatus(authorityName: string, status: string, responseTime: number, details: any): Promise<void> {
    try {
      await this.client.query(`
        INSERT INTO authority_status (authority_name, status, response_time, details)
        VALUES ($1, $2, $3, $4)
      `, [
        authorityName,
        status,
        responseTime,
        JSON.stringify(details)
      ]);
    } catch (error) {
      logger.error('Failed to record authority status in Neon', { error: error.message });
    }
  }

  async getLatestAuthorityStatus(): Promise<any[]> {
    try {
      const result = await this.client.query(`
        SELECT DISTINCT ON (authority_name)
          authority_name, status, response_time, details, checked_at
        FROM authority_status
        ORDER BY authority_name, checked_at DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get authority status from Neon', { error: error.message });
      return [];
    }
  }
}