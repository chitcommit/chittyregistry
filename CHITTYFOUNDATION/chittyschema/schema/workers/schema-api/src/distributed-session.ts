/**
 * Distributed Session Management for ChittyOS
 * Handles cross-service synchronization with vector clocks and conflict resolution
 */

import { z } from 'zod';

export interface Env {
  SESSION_STORE: KVNamespace;
  SESSION_ENCRYPTION_KEY: string;
  CHITTY_ID_SESSION_SERVICE_URL: string;
  SCHEMA_SERVICE_ID: string;
}

export interface SessionContext {
  session_id: string;
  chitty_id: string;
  service_id: string;
  created_at: string;
  expires_at: string;
  trust_level: number;
  permissions: string[];
  vector_clock: Record<string, number>;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface VectorClock {
  [service_id: string]: number;
}

export class DistributedSessionManager {
  private serviceId: string;

  constructor(private env: Env) {
    this.serviceId = env.SCHEMA_SERVICE_ID;
  }

  /**
   * Get or create session with distributed synchronization
   */
  async getSession(sessionId: string): Promise<SessionContext | null> {
    // Check local cache first
    const localSession = await this.getLocalSession(sessionId);

    if (localSession) {
      // Check if session needs sync
      if (localSession.sync_status === 'pending' || this.isStale(localSession)) {
        await this.syncSession(localSession);
      }
      return localSession;
    }

    // Fetch from distributed session service
    return this.fetchDistributedSession(sessionId);
  }

  /**
   * Create new session with vector clock initialization
   */
  async createSession(chittyId: string, trustLevel: number, permissions: string[]): Promise<SessionContext> {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const session: SessionContext = {
      session_id: sessionId,
      chitty_id: chittyId,
      service_id: this.serviceId,
      created_at: now,
      expires_at: expiresAt,
      trust_level: trustLevel,
      permissions,
      vector_clock: { [this.serviceId]: 1 },
      sync_status: 'synced'
    };

    // Store locally
    await this.storeLocalSession(session);

    // Propagate to distributed session service
    await this.propagateSession(session);

    return session;
  }

  /**
   * Update session with vector clock increment
   */
  async updateSession(sessionId: string, updates: Partial<SessionContext>): Promise<SessionContext | null> {
    const session = await this.getLocalSession(sessionId);
    if (!session) return null;

    // Increment vector clock for this service
    session.vector_clock[this.serviceId] = (session.vector_clock[this.serviceId] || 0) + 1;
    session.sync_status = 'pending';

    // Apply updates
    Object.assign(session, updates);

    // Store updated session
    await this.storeLocalSession(session);

    // Async propagation with retry
    this.propagateSessionAsync(session);

    return session;
  }

  /**
   * Sync session across services with conflict resolution
   */
  async syncSession(localSession: SessionContext): Promise<void> {
    try {
      const distributedSession = await this.fetchDistributedSession(localSession.session_id);

      if (!distributedSession) {
        // Local session is authoritative, propagate it
        await this.propagateSession(localSession);
        localSession.sync_status = 'synced';
        await this.storeLocalSession(localSession);
        return;
      }

      // Compare vector clocks for conflict resolution
      const conflictResolved = await this.resolveConflicts(localSession, distributedSession);

      if (conflictResolved) {
        conflictResolved.sync_status = 'synced';
        await this.storeLocalSession(conflictResolved);
      }

    } catch (error) {
      console.error('Session sync failed:', error);
      localSession.sync_status = 'conflict';
      await this.storeLocalSession(localSession);
    }
  }

  /**
   * Resolve conflicts using vector clock comparison
   */
  private async resolveConflicts(local: SessionContext, distributed: SessionContext): Promise<SessionContext> {
    // Compare vector clocks to determine precedence
    const localClock = local.vector_clock;
    const distributedClock = distributed.vector_clock;

    let localWins = false;
    let distributedWins = false;

    // Check if local clock dominates distributed
    for (const service in distributedClock) {
      if ((localClock[service] || 0) < distributedClock[service]) {
        distributedWins = true;
        break;
      }
    }

    // Check if distributed clock dominates local
    for (const service in localClock) {
      if (localClock[service] > (distributedClock[service] || 0)) {
        localWins = true;
        break;
      }
    }

    if (localWins && !distributedWins) {
      // Local session wins, propagate it
      await this.propagateSession(local);
      return local;
    } else if (distributedWins && !localWins) {
      // Distributed session wins, adopt it
      return distributed;
    } else {
      // Concurrent updates - merge with bias toward higher trust level
      return this.mergeSessionsWithTrustBias(local, distributed);
    }
  }

  /**
   * Merge concurrent sessions with trust level bias
   */
  private mergeSessionsWithTrustBias(local: SessionContext, distributed: SessionContext): SessionContext {
    const merged: SessionContext = {
      ...local,
      trust_level: Math.max(local.trust_level, distributed.trust_level),
      permissions: [...new Set([...local.permissions, ...distributed.permissions])],
      vector_clock: this.mergeVectorClocks(local.vector_clock, distributed.vector_clock),
      expires_at: local.expires_at > distributed.expires_at ? local.expires_at : distributed.expires_at
    };

    return merged;
  }

  /**
   * Merge vector clocks taking maximum value for each service
   */
  private mergeVectorClocks(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 };

    for (const service in clock2) {
      merged[service] = Math.max(merged[service] || 0, clock2[service]);
    }

    return merged;
  }

  /**
   * Check if session is stale based on vector clock age
   */
  private isStale(session: SessionContext): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const lastUpdate = Math.max(...Object.values(session.vector_clock));
    const sessionAge = Date.now() - new Date(session.created_at).getTime();

    return sessionAge > maxAge;
  }

  /**
   * Store session locally with encryption
   */
  private async storeLocalSession(session: SessionContext): Promise<void> {
    const encrypted = await this.encryptSession(session);
    await this.env.SESSION_STORE.put(
      `session:${session.session_id}`,
      encrypted,
      { expirationTtl: 24 * 60 * 60 } // 24 hours
    );
  }

  /**
   * Get session from local storage
   */
  private async getLocalSession(sessionId: string): Promise<SessionContext | null> {
    const encrypted = await this.env.SESSION_STORE.get(`session:${sessionId}`);
    if (!encrypted) return null;

    return this.decryptSession(encrypted);
  }

  /**
   * Fetch session from distributed service
   */
  private async fetchDistributedSession(sessionId: string): Promise<SessionContext | null> {
    try {
      const response = await fetch(`${this.env.CHITTY_ID_SESSION_SERVICE_URL}/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.env.SESSION_ENCRYPTION_KEY}`,
          'X-Service-ID': this.serviceId
        }
      });

      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Failed to fetch distributed session:', error);
      return null;
    }
  }

  /**
   * Propagate session to distributed service
   */
  private async propagateSession(session: SessionContext): Promise<void> {
    await this.withRetry(async () => {
      const response = await fetch(`${this.env.CHITTY_ID_SESSION_SERVICE_URL}/session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.SESSION_ENCRYPTION_KEY}`,
          'X-Service-ID': this.serviceId
        },
        body: JSON.stringify(session)
      });

      if (!response.ok) {
        throw new Error(`Session propagation failed: ${response.statusText}`);
      }
    });
  }

  /**
   * Async session propagation with error handling
   */
  private propagateSessionAsync(session: SessionContext): void {
    this.propagateSession(session).catch(error => {
      console.error('Async session propagation failed:', error);
      // Update sync status to indicate failure
      session.sync_status = 'conflict';
      this.storeLocalSession(session);
    });
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) break;

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError!;
  }

  /**
   * Encrypt session data
   */
  private async encryptSession(session: SessionContext): Promise<string> {
    // Simple implementation - in production use proper encryption
    return btoa(JSON.stringify(session));
  }

  /**
   * Decrypt session data
   */
  private async decryptSession(encrypted: string): Promise<SessionContext> {
    // Simple implementation - in production use proper decryption
    return JSON.parse(atob(encrypted));
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    // Implementation for periodic cleanup
    // This would typically be called by a scheduled worker
  }
}