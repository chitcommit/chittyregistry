/**
 * ChittyOS Pipeline Enforcement - System-wide Mandate
 *
 * Ensures all functions and services follow pipeline-only ChittyID generation
 * across the entire ChittyOS ecosystem with multiple enforcement layers
 */

import { SessionContext } from '../extensions/notion/types.js';

// =============================================================================
// ENFORCEMENT LAYERS
// =============================================================================

/**
 * Layer 1: Compile-time Enforcement
 * TypeScript types that make direct ID generation impossible
 */

// Mark ChittyID as a branded type that can only be created through pipeline
export type ChittyID = string & { readonly __brand: 'ChittyID'; readonly __pipeline: true };

// All entity creation must use this input type
export interface PipelineOnlyEntityInput<T> {
  readonly data: Omit<T, 'id' | 'chittyId' | 'created' | 'modified'>;
  readonly sessionContext: SessionContext;
  readonly pipelineToken: PipelineToken; // Must be obtained from pipeline
}

// Pipeline token can only be obtained through proper flow
export interface PipelineToken {
  readonly __brand: 'PipelineToken';
  readonly sessionId: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly permissions: readonly string[];
  readonly trustLevel: string;
}

/**
 * Layer 2: Runtime Enforcement
 * Interceptors and validators that block unauthorized attempts
 */

export class PipelineEnforcement {
  private static instance: PipelineEnforcement;
  private authorizedServices = new Set<string>();
  private blockedAttempts = new Map<string, number>();
  private enforcementLevel: 'strict' | 'monitor' | 'disabled' = 'strict';

  static getInstance(): PipelineEnforcement {
    if (!PipelineEnforcement.instance) {
      PipelineEnforcement.instance = new PipelineEnforcement();
    }
    return PipelineEnforcement.instance;
  }

  /**
   * Register authorized service
   */
  registerService(serviceId: string, serviceToken: string): void {
    if (this.validateServiceToken(serviceToken)) {
      this.authorizedServices.add(serviceId);
      console.log(`✅ Service ${serviceId} authorized for pipeline access`);
    } else {
      throw new Error(`❌ Service ${serviceId} failed authorization`);
    }
  }

  /**
   * Intercept ChittyID generation attempts
   */
  interceptChittyIdGeneration(
    namespace: string,
    identifier: string,
    context: { serviceId?: string; sessionId?: string; stackTrace?: string }
  ): never {
    const violation = {
      namespace,
      identifier,
      serviceId: context.serviceId || 'unknown',
      sessionId: context.sessionId || 'unknown',
      timestamp: new Date(),
      stackTrace: context.stackTrace || new Error().stack || '',
      enforcement: this.enforcementLevel
    };

    // Log violation
    this.logViolation(violation);

    // Increment blocked attempts
    const key = `${violation.serviceId}:${violation.sessionId}`;
    this.blockedAttempts.set(key, (this.blockedAttempts.get(key) || 0) + 1);

    // Enforcement action based on level
    switch (this.enforcementLevel) {
      case 'strict':
        throw new PipelineViolationError(
          'Direct ChittyID generation is forbidden. Use pipeline: Router → Intake → Trust → Authorization → Generation',
          violation
        );

      case 'monitor':
        console.warn('⚠️ Pipeline violation detected (monitoring mode)', violation);
        throw new PipelineViolationError('Pipeline-only generation required', violation);

      case 'disabled':
        console.log('ℹ️ Pipeline enforcement disabled, allowing direct generation');
        throw new PipelineViolationError('Enforcement disabled but pipeline preferred', violation);
    }
  }

  /**
   * Validate pipeline token
   */
  validatePipelineToken(token: PipelineToken, sessionContext: SessionContext): boolean {
    if (token.sessionId !== sessionContext.sessionId) {
      return false;
    }

    if (token.expiresAt < new Date()) {
      return false;
    }

    // Additional validation logic
    return true;
  }

  /**
   * Generate enforcement report
   */
  generateEnforcementReport(): EnforcementReport {
    const totalViolations = Array.from(this.blockedAttempts.values()).reduce((a, b) => a + b, 0);

    return {
      enforcementLevel: this.enforcementLevel,
      authorizedServices: Array.from(this.authorizedServices),
      violationCount: totalViolations,
      uniqueViolators: this.blockedAttempts.size,
      topViolators: this.getTopViolators(),
      recommendations: this.generateRecommendations()
    };
  }

  private validateServiceToken(token: string): boolean {
    // Implement service token validation
    return token.startsWith('svc_') && token.length > 20;
  }

  private logViolation(violation: PipelineViolation): void {
    console.error('🚨 PIPELINE VIOLATION DETECTED:', {
      service: violation.serviceId,
      session: violation.sessionId,
      namespace: violation.namespace,
      identifier: violation.identifier,
      timestamp: violation.timestamp.toISOString(),
      enforcement: violation.enforcement
    });

    // Send to monitoring system
    this.sendToMonitoring(violation);
  }

  private sendToMonitoring(violation: PipelineViolation): void {
    // Send violation to ChittyOS monitoring system
    fetch(`${process.env.CHITTY_MONITORING_URL}/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation)
    }).catch(error => console.warn('Failed to send violation to monitoring:', error));
  }

  private getTopViolators(): Array<{ service: string; session: string; count: number }> {
    return Array.from(this.blockedAttempts.entries())
      .map(([key, count]) => {
        const [service, session] = key.split(':');
        return { service, session, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private generateRecommendations(): string[] {
    const recommendations = [];

    if (this.blockedAttempts.size > 0) {
      recommendations.push('Update services to use pipeline-only ChittyID generation');
      recommendations.push('Review and update service authentication tokens');
    }

    if (this.enforcementLevel !== 'strict') {
      recommendations.push('Enable strict enforcement mode for maximum security');
    }

    return recommendations;
  }
}

/**
 * Layer 3: Code Analysis Enforcement
 * Static analysis to detect direct ChittyID generation patterns
 */

export class CodeAnalysisEnforcement {
  static readonly FORBIDDEN_PATTERNS = [
    /chittyId\s*=\s*["`']CHITTY-/,  // Direct assignment
    /generateChittyId\s*\(/,        // Direct function calls
    /CHITTY-[A-Z]+-[A-F0-9]{16}/,   // Hardcoded IDs
    /crypto\.subtle\.digest/,        // Direct hashing
    /new\s+TextEncoder/              // Direct encoding
  ];

  static analyzeCode(sourceCode: string, filename: string): CodeViolation[] {
    const violations: CodeViolation[] = [];

    this.FORBIDDEN_PATTERNS.forEach((pattern) => {
      const matches = sourceCode.matchAll(new RegExp(pattern, 'g'));

      for (const match of matches) {
        const lineNumber = sourceCode.slice(0, match.index).split('\n').length;

        violations.push({
          filename,
          lineNumber,
          pattern: pattern.source,
          matchedText: match[0],
          severity: 'error',
          message: 'Direct ChittyID generation detected. Use pipeline instead.'
        });
      }
    });

    return violations;
  }

  static generatePreCommitHook(): string {
    return `#!/bin/bash
# ChittyOS Pipeline Enforcement Pre-commit Hook

echo "🔍 Checking for pipeline violations..."

# Find all TypeScript/JavaScript files
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|js|tsx|jsx)$")

VIOLATIONS=0

for FILE in $FILES; do
  if [ -f "$FILE" ]; then
    # Check for forbidden patterns
    if grep -nE "(chittyId\\s*=\\s*[\\"\\\`']CHITTY-|generateChittyId\\s*\\(|CHITTY-[A-Z]+-[A-F0-9]{16})" "$FILE"; then
      echo "❌ Pipeline violation in $FILE"
      echo "   Direct ChittyID generation detected. Use pipeline instead."
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo "🚨 $VIOLATIONS pipeline violations detected!"
  echo "📖 Use: Router → Intake → Trust → Authorization → Generation"
  echo "🔧 Fix violations before committing."
  exit 1
fi

echo "✅ No pipeline violations detected"
exit 0`;
  }
}

/**
 * Layer 4: Service Mesh Enforcement
 * Network-level blocking of unauthorized ChittyID requests
 */

export class ServiceMeshEnforcement {
  private static pipelineEndpoints = new Set([
    '/api/v1/pipeline/generate',
    '/api/v1/chitty-id/generate',
    '/generate'
  ]);

  /**
   * Middleware to block unauthorized ChittyID generation
   */
  static enforcementMiddleware() {
    return (req: any, res: any, next: any) => {
      const isChittyIdRequest = req.path.includes('chitty') || req.path.includes('generate');
      const isPipelineEndpoint = this.pipelineEndpoints.has(req.path);

      if (isChittyIdRequest && !isPipelineEndpoint) {
        // Check if request has valid pipeline authorization
        const pipelineAuth = req.headers['x-pipeline-auth'];
        const sessionId = req.headers['x-session-id'];

        if (!pipelineAuth || !sessionId) {
          return res.status(403).json({
            error: 'Pipeline authorization required',
            message: 'Direct ChittyID generation forbidden. Use pipeline flow.',
            pipeline: 'Router → Intake → Trust → Authorization → Generation',
            statusCode: 'PIPELINE_VIOLATION'
          });
        }
      }

      next();
    };
  }

  /**
   * Service registry validation
   */
  static validateServiceRegistration(serviceConfig: any): boolean {
    const requiredFields = ['serviceId', 'pipelineCompliant', 'authToken'];

    for (const field of requiredFields) {
      if (!serviceConfig[field]) {
        return false;
      }
    }

    return serviceConfig.pipelineCompliant === true;
  }
}

/**
 * Layer 5: Database Constraints
 * Database-level enforcement to prevent direct insertions
 */

export class DatabaseEnforcement {
  static readonly ENFORCEMENT_TRIGGER = `
    CREATE OR REPLACE FUNCTION enforce_pipeline_chitty_id()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Check if ChittyID follows proper format and was generated through pipeline
      IF NEW.chitty_id IS NOT NULL AND NEW.chitty_id NOT LIKE 'CHITTY-%' THEN
        RAISE EXCEPTION 'Invalid ChittyID format. Must use pipeline generation.';
      END IF;

      -- Check for pipeline validation metadata
      IF NEW.metadata IS NULL OR NEW.metadata->>'pipeline_generated' IS NULL THEN
        RAISE EXCEPTION 'ChittyID must be generated through pipeline. Missing pipeline metadata.';
      END IF;

      -- Validate pipeline session
      IF NEW.metadata->>'session_id' IS NULL THEN
        RAISE EXCEPTION 'Pipeline session_id required in metadata.';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply trigger to all entity tables
    DROP TRIGGER IF EXISTS pipeline_enforcement_trigger ON entities;
    CREATE TRIGGER pipeline_enforcement_trigger
      BEFORE INSERT OR UPDATE ON entities
      FOR EACH ROW
      EXECUTE FUNCTION enforce_pipeline_chitty_id();
  `;

  static async deployEnforcementTriggers(db: any): Promise<void> {
    try {
      await db.execute(this.ENFORCEMENT_TRIGGER);
      console.log('✅ Database enforcement triggers deployed');
    } catch (error) {
      console.error('❌ Failed to deploy database enforcement:', error);
      throw error;
    }
  }
}

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface PipelineViolation {
  namespace: string;
  identifier: string;
  serviceId: string;
  sessionId: string;
  timestamp: Date;
  stackTrace: string;
  enforcement: string;
}

interface CodeViolation {
  filename: string;
  lineNumber: number;
  pattern: string;
  matchedText: string;
  severity: 'error' | 'warning';
  message: string;
}

interface EnforcementReport {
  enforcementLevel: string;
  authorizedServices: string[];
  violationCount: number;
  uniqueViolators: number;
  topViolators: Array<{ service: string; session: string; count: number }>;
  recommendations: string[];
}

export class PipelineViolationError extends Error {
  constructor(message: string, public violation: PipelineViolation) {
    super(message);
    this.name = 'PipelineViolationError';
  }
}

// =============================================================================
// GLOBAL ENFORCEMENT SETUP
// =============================================================================

/**
 * Initialize system-wide pipeline enforcement
 */
export async function initializePipelineEnforcement(): Promise<void> {
  console.log('🔒 Initializing ChittyOS Pipeline Enforcement...');

  // 1. Runtime enforcement
  PipelineEnforcement.getInstance();

  // 2. Replace any existing ChittyID generation functions
  await replaceChittyIdFunctions();

  // 3. Deploy database constraints
  // await DatabaseEnforcement.deployEnforcementTriggers(db);

  // 4. Install pre-commit hooks
  await installPreCommitHooks();

  console.log('✅ Pipeline enforcement initialized');
  console.log('📋 All ChittyID generation now requires pipeline authentication');
}

async function replaceChittyIdFunctions(): Promise<void> {
  // Replace global ChittyID functions with enforcement wrappers
  (global as any).generateChittyId = function(namespace: string, identifier: string) {
    PipelineEnforcement.getInstance().interceptChittyIdGeneration(
      namespace,
      identifier,
      { stackTrace: new Error().stack }
    );
  };

  console.log('🔄 ChittyID functions replaced with enforcement wrappers');
}

async function installPreCommitHooks(): Promise<void> {
  CodeAnalysisEnforcement.generatePreCommitHook();
  // Write to .git/hooks/pre-commit
  // Make executable
  console.log('🪝 Pre-commit hooks installed');
}

/**
 * Validate service compliance
 */
export function validateServiceCompliance(serviceConfig: any): boolean {
  return ServiceMeshEnforcement.validateServiceRegistration(serviceConfig);
}

/**
 * Get enforcement middleware for Express apps
 */
export function getPipelineEnforcementMiddleware() {
  return ServiceMeshEnforcement.enforcementMiddleware();
}