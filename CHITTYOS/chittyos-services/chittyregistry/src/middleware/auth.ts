// Authentication Middleware - Integration with ChittyID

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../utils/logger';

interface ChittyIDConfig {
  url: string;
  clientId: string;
  clientSecret: string;
}

interface AuthenticatedRequest extends Request {
  chittyId?: string;
  token?: {
    chittyId: string;
    scope: string[];
    exp: number;
    iat: number;
  };
}

export class AuthMiddleware {
  constructor(private config: ChittyIDConfig) {}

  /**
   * Middleware to validate ChittyID tokens
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Missing or invalid authorization header'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token with ChittyID service
      const validation = await this.validateWithChittyID(token);
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }

      // Decode token to get user information
      const decoded = jwt.decode(token) as any;
      if (!decoded) {
        res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
        return;
      }

      req.chittyId = decoded.chittyId;
      req.token = decoded;

      next();

    } catch (error) {
      logger.error('Authentication failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }
  };

  /**
   * Middleware to check if user has required scope
   */
  requireScope = (requiredScope: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.token) {
        res.status(401).json({
          success: false,
          error: 'Token not found'
        });
        return;
      }

      if (!req.token.scope?.includes(requiredScope)) {
        res.status(403).json({
          success: false,
          error: `Insufficient permissions. Required scope: ${requiredScope}`
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware for service registration - requires admin scope
   */
  requireServiceAdmin = this.requireScope('service:admin');

  /**
   * Middleware for service registration - allows service owners
   */
  requireServiceOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.token) {
        res.status(401).json({
          success: false,
          error: 'Token not found'
        });
        return;
      }

      // Check if user has admin scope (can manage any service)
      if (req.token.scope?.includes('service:admin')) {
        next();
        return;
      }

      // Check if user has service owner scope for this specific service
      const serviceName = req.params.serviceName || req.body.service?.serviceName;
      if (!serviceName) {
        res.status(400).json({
          success: false,
          error: 'Service name not provided'
        });
        return;
      }

      const serviceOwnerScope = `service:owner:${serviceName}`;
      if (req.token.scope?.includes(serviceOwnerScope)) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Must be service owner or admin'
      });

    } catch (error) {
      logger.error('Service owner check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };

  /**
   * Optional authentication - sets user info if token is present
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
      }

      const token = authHeader.substring(7);
      const validation = await this.validateWithChittyID(token);

      if (validation.valid) {
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          req.chittyId = decoded.chittyId;
          req.token = decoded;
        }
      }

      next();

    } catch (error) {
      logger.warn('Optional authentication failed', { error: error.message });
      next(); // Continue without authentication
    }
  };

  /**
   * Validate token with ChittyID service
   */
  private async validateWithChittyID(token: string): Promise<{ valid: boolean; chittyId?: string }> {
    try {
      const response = await axios.post(
        `${this.config.url}/validate`,
        {
          token,
          context: {
            service: 'chittyregistry',
            action: 'token-validation'
          }
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ChittyRegistry/1.0'
          }
        }
      );

      return {
        valid: response.data.valid,
        chittyId: response.data.chittyId
      };

    } catch (error) {
      logger.error('ChittyID validation failed', {
        error: error.message,
        status: error.response?.status
      });
      return { valid: false };
    }
  }

  /**
   * Generate service registration token
   */
  async generateServiceToken(chittyId: string, serviceName: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.config.url}/token`,
        {
          chittyId,
          scope: [`service:owner:${serviceName}`],
          audience: 'chittyregistry',
          expiresIn: '1h'
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.clientSecret}` // Service-to-service auth
          }
        }
      );

      return response.data.token;

    } catch (error) {
      logger.error('Failed to generate service token', {
        error: error.message,
        chittyId,
        serviceName
      });
      return null;
    }
  }

  /**
   * Refresh an expired token
   */
  async refreshToken(refreshToken: string): Promise<{ token?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.config.url}/refresh`,
        { refreshToken },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return { token: response.data.token };

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      return { error: 'Token refresh failed' };
    }
  }
}

export { AuthenticatedRequest };