/**
 * Sync Status Tracking
 * Real-time tracking of project sync operations and status
 */

import { EventEmitter } from 'events';
import { SyncStatus, ProjectState, SyncConfig } from './config.js';

export interface SyncEvent {
  sessionId: string;
  eventType: 'started' | 'progress' | 'completed' | 'error' | 'paused' | 'resumed';
  timestamp: Date;
  data?: any;
}

export interface SyncMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalRecordsSynced: number;
  averageSyncTime: number;
  lastSyncTime?: Date;
}

export class SyncTracker extends EventEmitter {
  private sessions = new Map<string, { config: SyncConfig; status: SyncStatus; state: ProjectState }>();
  private events: SyncEvent[] = [];
  private maxEvents = 1000;

  constructor() {
    super();
  }

  /**
   * Track a new sync session
   */
  trackSession(sessionId: string, config: SyncConfig, initialState: ProjectState): void {
    const status: SyncStatus = {
      lastSync: null,
      status: 'idle',
      conflicts: 0,
      pendingChanges: 0
    };

    this.sessions.set(sessionId, { config, status, state: initialState });
    this.emitEvent(sessionId, 'started', { config, state: initialState });
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: SyncStatus['status'], error?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status.status = status;
    session.status.lastSync = new Date();
    if (error) {
      session.status.error = error;
    }

    this.emitEvent(sessionId, status === 'error' ? 'error' : 'progress', {
      status,
      error,
      lastSync: session.status.lastSync
    });
  }

  /**
   * Update sync progress
   */
  updateSyncProgress(sessionId: string, pendingChanges: number, conflicts: number = 0): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status.pendingChanges = pendingChanges;
    session.status.conflicts = conflicts;
    session.status.lastSync = new Date();

    this.emitEvent(sessionId, 'progress', {
      pendingChanges,
      conflicts,
      lastSync: session.status.lastSync
    });
  }

  /**
   * Update project state
   */
  updateProjectState(sessionId: string, updates: Partial<ProjectState>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = { ...session.state, ...updates };
    this.emitEvent(sessionId, 'progress', { stateUpdate: updates });
  }

  /**
   * Complete a sync session
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status.status = 'idle';
    session.status.pendingChanges = 0;
    session.status.lastSync = new Date();

    this.emitEvent(sessionId, 'completed', {
      completedAt: session.status.lastSync,
      finalState: session.state
    });
  }

  /**
   * Pause a sync session
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status.status = 'paused';
    this.emitEvent(sessionId, 'paused', { pausedAt: new Date() });
  }

  /**
   * Resume a sync session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status.status = 'idle';
    this.emitEvent(sessionId, 'resumed', { resumedAt: new Date() });
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): { config: SyncConfig; status: SyncStatus; state: ProjectState } | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Map<string, { config: SyncConfig; status: SyncStatus; state: ProjectState }> {
    const activeSessions = new Map();

    for (const [sessionId, session] of this.sessions) {
      if (session.status.status === 'syncing' || session.status.status === 'idle') {
        activeSessions.set(sessionId, session);
      }
    }

    return activeSessions;
  }

  /**
   * Get sync metrics
   */
  getMetrics(): SyncMetrics {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.status.status === 'syncing' || s.status.status === 'idle');
    const completedSessions = sessions.filter(s => s.status.status === 'idle' && s.status.lastSync);
    const failedSessions = sessions.filter(s => s.status.status === 'error');

    const completedTimes = completedSessions
      .map(s => s.status.lastSync?.getTime() || 0)
      .filter(t => t > 0);

    const averageSyncTime = completedTimes.length > 0
      ? completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length
      : 0;

    const lastSyncTime = completedTimes.length > 0
      ? new Date(Math.max(...completedTimes))
      : undefined;

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      completedSessions: completedSessions.length,
      failedSessions: failedSessions.length,
      totalRecordsSynced: 0, // Would need to track this separately
      averageSyncTime,
      lastSyncTime
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): SyncEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a specific session
   */
  getSessionEvents(sessionId: string, limit: number = 20): SyncEvent[] {
    return this.events
      .filter(event => event.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * Clean up old sessions
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThanMs);

    for (const [sessionId, session] of this.sessions) {
      if (session.status.lastSync && session.status.lastSync < cutoff) {
        this.sessions.delete(sessionId);
      }
    }

    // Clean up old events
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Emit a sync event
   */
  private emitEvent(sessionId: string, eventType: SyncEvent['eventType'], data?: any): void {
    const event: SyncEvent = {
      sessionId,
      eventType,
      timestamp: new Date(),
      data
    };

    this.events.push(event);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.emit('sync_event', event);
    this.emit(`sync_${eventType}`, event);
  }
}

// Global sync tracker instance
export const syncTracker = new SyncTracker();