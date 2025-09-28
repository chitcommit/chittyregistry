/**
 * ChittySync MCP Agent
 * Manages project synchronization and top context tracking with persistent state
 */

import { McpAgent } from '@cloudflare/agents';
import { z } from 'zod';

export interface SyncProject {
  projectId: string;
  name: string;
  caseId?: string;
  lastSync: string;
  syncStatus: 'active' | 'pending' | 'failed' | 'complete';
  contextSnapshots: ContextSnapshot[];
  participants: string[];
  chittyIds: string[];
}

export interface ContextSnapshot {
  id: string;
  timestamp: string;
  contextType: 'evidence' | 'fact' | 'contradiction' | 'timeline' | 'analysis';
  content: any;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  relatedChittyIds: string[];
}

export interface TopContext {
  id: string;
  projectId: string;
  rank: number;
  contextType: string;
  summary: string;
  lastAccessed: string;
  accessCount: number;
  relevanceScore: number;
  dependencies: string[];
}

export class ChittySyncMCP extends McpAgent {
  initialState = {
    projects: new Map<string, SyncProject>(),
    topContexts: new Map<string, TopContext>(),
    syncMetrics: {
      totalProjects: 0,
      activeSync: 0,
      contextSnapshots: 0,
      lastGlobalSync: null as string | null
    },
    sessionContext: {
      currentProject: null as string | null,
      activeContexts: [] as string[],
      sessionStart: new Date().toISOString()
    }
  };

  async init() {
    // Project Sync Management
    this.server.tool("createSyncProject", {
      name: z.string(),
      caseId: z.string().optional(),
      participants: z.array(z.string()).default([])
    }, async (params) => {
      return await this.createSyncProject(params);
    });

    this.server.tool("syncProject", {
      projectId: z.string(),
      force: z.boolean().default(false)
    }, async ({ projectId, force }) => {
      return await this.syncProject(projectId, force);
    });

    // Context Management
    this.server.tool("captureContext", {
      projectId: z.string(),
      contextType: z.enum(['evidence', 'fact', 'contradiction', 'timeline', 'analysis']),
      content: z.any(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      tags: z.array(z.string()).default([]),
      relatedChittyIds: z.array(z.string()).default([])
    }, async (params) => {
      return await this.captureContext(params);
    });

    this.server.tool("getTopContexts", {
      projectId: z.string(),
      limit: z.number().default(10),
      contextType: z.string().optional()
    }, async ({ projectId, limit, contextType }) => {
      return await this.getTopContexts(projectId, limit, contextType);
    });

    // Session Management
    this.server.tool("setActiveProject", {
      projectId: z.string()
    }, async ({ projectId }) => {
      return await this.setActiveProject(projectId);
    });

    this.server.tool("trackContextAccess", {
      contextId: z.string(),
      accessType: z.enum(['view', 'edit', 'reference']).default('view')
    }, async ({ contextId, accessType }) => {
      return await this.trackContextAccess(contextId, accessType);
    });

    // Cross-Project Sync
    this.server.tool("syncAllProjects", {
      maxConcurrent: z.number().default(5)
    }, async ({ maxConcurrent }) => {
      return await this.syncAllProjects(maxConcurrent);
    });

    // Context Analysis
    this.server.tool("analyzeContextRelevance", {
      projectId: z.string(),
      contextIds: z.array(z.string()).optional()
    }, async ({ projectId, contextIds }) => {
      return await this.analyzeContextRelevance(projectId, contextIds);
    });
  }

  private async createSyncProject(params: any): Promise<{ projectId: string; project: SyncProject }> {
    const projectId = `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const project: SyncProject = {
      projectId,
      name: params.name,
      caseId: params.caseId,
      lastSync: new Date().toISOString(),
      syncStatus: 'active',
      contextSnapshots: [],
      participants: params.participants,
      chittyIds: []
    };

    this.setState({
      projects: this.state.projects.set(projectId, project),
      syncMetrics: {
        ...this.state.syncMetrics,
        totalProjects: this.state.syncMetrics.totalProjects + 1,
        activeSync: this.state.syncMetrics.activeSync + 1
      }
    });

    return { projectId, project };
  }

  private async syncProject(projectId: string, force: boolean): Promise<{ status: string; details: any }> {
    const project = this.state.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check if sync needed (unless forced)
    const timeSinceLastSync = Date.now() - new Date(project.lastSync).getTime();
    const syncThreshold = 5 * 60 * 1000; // 5 minutes

    if (!force && timeSinceLastSync < syncThreshold) {
      return {
        status: 'skipped',
        details: { reason: 'Recent sync', lastSync: project.lastSync }
      };
    }

    // Update project sync status
    const updatedProject = {
      ...project,
      lastSync: new Date().toISOString(),
      syncStatus: 'active' as const
    };

    this.setState({
      projects: this.state.projects.set(projectId, updatedProject),
      syncMetrics: {
        ...this.state.syncMetrics,
        lastGlobalSync: new Date().toISOString()
      }
    });

    // Simulate sync operations
    const syncResult = {
      evidenceSynced: project.contextSnapshots.filter(c => c.contextType === 'evidence').length,
      factsSynced: project.contextSnapshots.filter(c => c.contextType === 'fact').length,
      contradictionsSynced: project.contextSnapshots.filter(c => c.contextType === 'contradiction').length,
      chittyIdsVerified: project.chittyIds.length
    };

    return { status: 'completed', details: syncResult };
  }

  private async captureContext(params: any): Promise<{ contextId: string; snapshot: ContextSnapshot }> {
    const contextId = `CTX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: ContextSnapshot = {
      id: contextId,
      timestamp: new Date().toISOString(),
      contextType: params.contextType,
      content: params.content,
      priority: params.priority,
      tags: params.tags,
      relatedChittyIds: params.relatedChittyIds
    };

    const project = this.state.projects.get(params.projectId);
    if (!project) {
      throw new Error(`Project ${params.projectId} not found`);
    }

    const updatedProject = {
      ...project,
      contextSnapshots: [...project.contextSnapshots, snapshot],
      chittyIds: [...new Set([...project.chittyIds, ...params.relatedChittyIds])]
    };

    // Create/update top context entry
    const topContext: TopContext = {
      id: contextId,
      projectId: params.projectId,
      rank: this.calculateContextRank(params.priority, params.contextType),
      contextType: params.contextType,
      summary: this.generateContextSummary(params.content),
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      relevanceScore: this.calculateRelevanceScore(params.priority, params.tags),
      dependencies: params.relatedChittyIds
    };

    this.setState({
      projects: this.state.projects.set(params.projectId, updatedProject),
      topContexts: this.state.topContexts.set(contextId, topContext),
      syncMetrics: {
        ...this.state.syncMetrics,
        contextSnapshots: this.state.syncMetrics.contextSnapshots + 1
      }
    });

    return { contextId, snapshot };
  }

  private async getTopContexts(projectId: string, limit: number, contextType?: string) {
    const projectContexts = Array.from(this.state.topContexts.values())
      .filter(ctx => ctx.projectId === projectId)
      .filter(ctx => !contextType || ctx.contextType === contextType)
      .sort((a, b) => {
        // Sort by relevance score and recent access
        const scoreA = a.relevanceScore + (a.accessCount * 0.1);
        const scoreB = b.relevanceScore + (b.accessCount * 0.1);
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return {
      contexts: projectContexts,
      totalMatching: projectContexts.length,
      projectId
    };
  }

  private async setActiveProject(projectId: string) {
    const project = this.state.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    this.setState({
      sessionContext: {
        ...this.state.sessionContext,
        currentProject: projectId
      }
    });

    return { activeProject: projectId, project };
  }

  private async trackContextAccess(contextId: string, accessType: string) {
    const topContext = this.state.topContexts.get(contextId);
    if (!topContext) {
      return { status: 'context_not_found', contextId };
    }

    const updatedContext = {
      ...topContext,
      lastAccessed: new Date().toISOString(),
      accessCount: topContext.accessCount + 1,
      relevanceScore: topContext.relevanceScore + this.getAccessBonus(accessType)
    };

    this.setState({
      topContexts: this.state.topContexts.set(contextId, updatedContext)
    });

    return { status: 'tracked', context: updatedContext };
  }

  private async syncAllProjects(maxConcurrent: number) {
    const activeProjects = Array.from(this.state.projects.values())
      .filter(p => p.syncStatus === 'active');

    const results = [];
    for (let i = 0; i < activeProjects.length; i += maxConcurrent) {
      const batch = activeProjects.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(project => this.syncProject(project.projectId, false))
      );
      results.push(...batchResults);
    }

    return {
      totalSynced: results.length,
      successful: results.filter(r => r.status === 'completed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results
    };
  }

  private async analyzeContextRelevance(projectId: string, contextIds?: string[]) {
    const targetContexts = contextIds ?
      contextIds.map(id => this.state.topContexts.get(id)).filter(Boolean) :
      Array.from(this.state.topContexts.values()).filter(ctx => ctx.projectId === projectId);

    const analysis = {
      totalContexts: targetContexts.length,
      averageRelevance: targetContexts.reduce((sum, ctx) => sum + ctx!.relevanceScore, 0) / targetContexts.length,
      contextsByType: this.groupContextsByType(targetContexts as TopContext[]),
      recommendations: this.generateContextRecommendations(targetContexts as TopContext[])
    };

    return analysis;
  }

  private calculateContextRank(priority: string, contextType: string): number {
    const priorityWeight = { high: 100, medium: 50, low: 25 };
    const typeWeight = {
      contradiction: 20,
      evidence: 15,
      fact: 10,
      timeline: 8,
      analysis: 5
    };

    return (priorityWeight[priority as keyof typeof priorityWeight] || 25) +
           (typeWeight[contextType as keyof typeof typeWeight] || 5);
  }

  private generateContextSummary(content: any): string {
    if (typeof content === 'string') {
      return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }
    if (content.title) {
      return content.title;
    }
    return 'Context snapshot';
  }

  private calculateRelevanceScore(priority: string, tags: string[]): number {
    const priorityScore = { high: 1.0, medium: 0.7, low: 0.4 };
    const tagBonus = tags.length * 0.1;
    return (priorityScore[priority as keyof typeof priorityScore] || 0.4) + tagBonus;
  }

  private getAccessBonus(accessType: string): number {
    const bonuses = { view: 0.01, edit: 0.05, reference: 0.03 };
    return bonuses[accessType as keyof typeof bonuses] || 0.01;
  }

  private groupContextsByType(contexts: TopContext[]) {
    return contexts.reduce((groups, ctx) => {
      groups[ctx.contextType] = (groups[ctx.contextType] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private generateContextRecommendations(contexts: TopContext[]) {
    const recommendations = [];

    const lowRelevance = contexts.filter(ctx => ctx.relevanceScore < 0.3);
    if (lowRelevance.length > 0) {
      recommendations.push(`${lowRelevance.length} contexts have low relevance and may need review`);
    }

    const staleContexts = contexts.filter(ctx =>
      Date.now() - new Date(ctx.lastAccessed).getTime() > 7 * 24 * 60 * 60 * 1000
    );
    if (staleContexts.length > 0) {
      recommendations.push(`${staleContexts.length} contexts haven't been accessed in over a week`);
    }

    return recommendations;
  }
}

// Export singleton
export const chittySyncAgent = new ChittySyncMCP();