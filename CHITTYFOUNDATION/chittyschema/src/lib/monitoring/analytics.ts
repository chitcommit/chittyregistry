/**
 * ChittySchema Analytics and Monitoring
 * Real-time system metrics and data insights
 */

import { EventEmitter } from 'events';

interface AnalyticsEvent {
  event: string;
  timestamp: Date;
  sessionId?: string;
  data?: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ip?: string;
    path?: string;
    method?: string;
  };
}

interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    avgQueryTime: number;
  };
  evidence: {
    submitted: number;
    processed: number;
    pending: number;
  };
  facts: {
    extracted: number;
    verified: number;
    contradictions: number;
  };
  cases: {
    active: number;
    closed: number;
    total: number;
  };
  sync: {
    sessions: number;
    successful: number;
    failed: number;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

export class ChittyAnalytics extends EventEmitter {
  private events: AnalyticsEvent[] = [];
  private metrics: SystemMetrics;
  private startTime: Date;

  constructor() {
    super();
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();
    this.startPeriodicCleanup();
  }

  private initializeMetrics(): SystemMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      database: {
        connections: 0,
        queries: 0,
        avgQueryTime: 0
      },
      evidence: {
        submitted: 0,
        processed: 0,
        pending: 0
      },
      facts: {
        extracted: 0,
        verified: 0,
        contradictions: 0
      },
      cases: {
        active: 0,
        closed: 0,
        total: 0
      },
      sync: {
        sessions: 0,
        successful: 0,
        failed: 0
      },
      uptime: 0,
      memory: process.memoryUsage()
    };
  }

  /**
   * Track an analytics event
   */
  track(event: string, data?: Record<string, any>, metadata?: AnalyticsEvent['metadata']): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: new Date(),
      data,
      metadata
    };

    this.events.push(analyticsEvent);
    this.updateMetrics(event, data);
    this.emit('event', analyticsEvent);

    // Keep only last 10000 events to prevent memory leaks
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  /**
   * Track API request
   */
  trackRequest(method: string, path: string, statusCode: number, responseTime: number, sessionId?: string): void {
    this.track('api_request', {
      method,
      path,
      statusCode,
      responseTime,
      success: statusCode < 400
    }, {
      method,
      path
    });

    // Update request metrics
    this.metrics.requests.total++;
    if (statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update average response time
    const total = this.metrics.requests.total;
    const current = this.metrics.requests.averageResponseTime;
    this.metrics.requests.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
  }

  /**
   * Track database operation
   */
  trackDatabase(operation: string, queryTime: number, success: boolean = true): void {
    this.track('database_query', {
      operation,
      queryTime,
      success
    });

    this.metrics.database.queries++;
    const total = this.metrics.database.queries;
    const current = this.metrics.database.avgQueryTime;
    this.metrics.database.avgQueryTime = ((current * (total - 1)) + queryTime) / total;
  }

  /**
   * Track evidence submission
   */
  trackEvidence(action: 'submitted' | 'processed' | 'pending', evidenceId: string, caseId?: string): void {
    this.track('evidence_action', {
      action,
      evidenceId,
      caseId
    });

    this.metrics.evidence[action]++;
  }

  /**
   * Track fact extraction
   */
  trackFact(action: 'extracted' | 'verified' | 'contradiction', factId: string, evidenceId?: string): void {
    this.track('fact_action', {
      action,
      factId,
      evidenceId
    });

    if (action === 'contradiction') {
      this.metrics.facts.contradictions++;
    } else {
      this.metrics.facts[action]++;
    }
  }

  /**
   * Track case activity
   */
  trackCase(action: 'created' | 'updated' | 'closed', caseId: string): void {
    this.track('case_action', {
      action,
      caseId
    });

    if (action === 'created') {
      this.metrics.cases.total++;
      this.metrics.cases.active++;
    } else if (action === 'closed') {
      this.metrics.cases.active--;
      this.metrics.cases.closed++;
    }
  }

  /**
   * Track sync operations
   */
  trackSync(action: 'session_start' | 'session_success' | 'session_fail', sessionId: string): void {
    this.track('sync_action', {
      action,
      sessionId
    });

    if (action === 'session_start') {
      this.metrics.sync.sessions++;
    } else if (action === 'session_success') {
      this.metrics.sync.successful++;
    } else if (action === 'session_fail') {
      this.metrics.sync.failed++;
    }
  }

  private updateMetrics(event: string, data?: Record<string, any>): void {
    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime();
    this.metrics.memory = process.memoryUsage();
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    this.updateMetrics('metrics_request');
    return { ...this.metrics };
  }

  /**
   * Get events within time range
   */
  getEvents(since?: Date, until?: Date): AnalyticsEvent[] {
    let filteredEvents = this.events;

    if (since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= since);
    }

    if (until) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= until);
    }

    return filteredEvents;
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 100): AnalyticsEvent[] {
    return this.events
      .filter(e => e.event === eventType)
      .slice(-limit);
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyEvents = this.getEvents(hourAgo);
    const dailyEvents = this.getEvents(dayAgo);

    return {
      metrics: this.getMetrics(),
      activity: {
        lastHour: {
          events: hourlyEvents.length,
          requests: hourlyEvents.filter(e => e.event === 'api_request').length,
          evidence: hourlyEvents.filter(e => e.event === 'evidence_action').length,
          facts: hourlyEvents.filter(e => e.event === 'fact_action').length
        },
        lastDay: {
          events: dailyEvents.length,
          requests: dailyEvents.filter(e => e.event === 'api_request').length,
          evidence: dailyEvents.filter(e => e.event === 'evidence_action').length,
          facts: dailyEvents.filter(e => e.event === 'fact_action').length
        }
      },
      performance: {
        averageResponseTime: this.metrics.requests.averageResponseTime,
        successRate: this.metrics.requests.total > 0
          ? (this.metrics.requests.successful / this.metrics.requests.total) * 100
          : 100,
        avgDatabaseQueryTime: this.metrics.database.avgQueryTime
      },
      timestamp: now.toISOString()
    };
  }

  /**
   * Clear old events (keep last 24 hours)
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.events = this.events.filter(e => e.timestamp >= cutoff);
    }, 60 * 60 * 1000); // Clean up every hour
  }

  /**
   * Generate analytics report
   */
  generateReport() {
    const summary = this.getSummary();
    const recentErrors = this.events
      .filter(e => e.event === 'api_request' && e.data?.success === false)
      .slice(-10);

    const topEndpoints = this.events
      .filter(e => e.event === 'api_request')
      .reduce((acc: Record<string, number>, event) => {
        const path = event.data?.path || 'unknown';
        acc[path] = (acc[path] || 0) + 1;
        return acc;
      }, {});

    return {
      summary,
      recentErrors,
      topEndpoints: Object.entries(topEndpoints)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      systemHealth: {
        memoryUsage: (summary.metrics.memory.heapUsed / summary.metrics.memory.heapTotal) * 100,
        uptime: summary.metrics.uptime,
        errorRate: 100 - summary.performance.successRate
      }
    };
  }
}

// Singleton instance
export const analytics = new ChittyAnalytics();

// Express middleware for automatic request tracking
export function analyticsMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const sessionId = req.chittyos?.sessionId;

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      analytics.trackRequest(
        req.method,
        req.path,
        res.statusCode,
        responseTime,
        sessionId
      );
    });

    next();
  };
}