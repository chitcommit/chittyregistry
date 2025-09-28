/**
 * Topic Sync Client
 * Extracts, categorizes, and synchronizes topics from evidence and facts
 */

import { chittyRouter } from './chittyrouter-client';
import { db, tables } from './db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import crypto from 'crypto';

export interface Topic {
  id: string;
  name: string;
  category: TopicCategory;
  description?: string;
  keywords: string[];
  relevanceScore: number;
  extractedFrom: string[];
  caseId: string;
  parentTopicId?: string;
  chittyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TopicCategory =
  | 'LEGAL_CONCEPT'      // Contract law, tort, jurisdiction
  | 'FACTUAL_ELEMENT'    // Dates, amounts, locations, people
  | 'PROCEDURAL'         // Deadlines, motions, discovery
  | 'EVIDENCE_TYPE'      // Documents, testimony, expert reports
  | 'SUBJECT_MATTER'     // Property, employment, family law
  | 'TEMPORAL'           // Timeline events, sequences
  | 'FINANCIAL'          // Damages, costs, valuations
  | 'RELATIONSHIP'       // Parties, entities, connections
  | 'GEOGRAPHIC'         // Venues, jurisdictions, locations
  | 'REGULATORY'         // Statutes, regulations, compliance
  | 'EXPERT'             // Technical opinions, methodologies
  | 'CREDIBILITY';       // Bias, reliability, authentication

export interface TopicExtraction {
  topics: Topic[];
  relationships: TopicRelationship[];
  clusters: TopicCluster[];
}

export interface TopicRelationship {
  id: string;
  fromTopicId: string;
  toTopicId: string;
  relationshipType: RelationshipType;
  strength: number;
  evidenceSupporting: string[];
  createdAt: Date;
}

export type RelationshipType =
  | 'PREREQUISITE'    // Topic A required for Topic B
  | 'CONTRADICTS'     // Topics conflict
  | 'SUPPORTS'        // Topics reinforce each other
  | 'TEMPORAL'        // Sequential relationship
  | 'CAUSAL'          // Cause and effect
  | 'HIERARCHICAL'    // Parent-child relationship
  | 'COMPARATIVE'     // Similar or alternative topics
  | 'EVIDENTIAL';     // Shared evidence base

export interface TopicCluster {
  id: string;
  name: string;
  description: string;
  topicIds: string[];
  centralTopic: string;
  coherenceScore: number;
  caseId: string;
  createdAt: Date;
}

export interface TopicSyncMetrics {
  topics_extracted: number;
  topics_updated: number;
  relationships_created: number;
  clusters_formed: number;
  sync_errors: number;
  last_sync: Date;
}

export class TopicSyncClient {
  private metrics: TopicSyncMetrics = {
    topics_extracted: 0,
    topics_updated: 0,
    relationships_created: 0,
    clusters_formed: 0,
    sync_errors: 0,
    last_sync: new Date()
  };

  /**
   * Extract topics from evidence content using AI
   */
  async extractTopicsFromEvidence(evidenceId: string): Promise<TopicExtraction> {
    try {
      // Get evidence content
      const [evidence] = await db
        .select()
        .from(tables.masterEvidence)
        .where(eq(tables.masterEvidence.id, evidenceId));

      if (!evidence) {
        throw new Error(`Evidence ${evidenceId} not found`);
      }

      // Use ChittyRouter AI to analyze content for topics
      const analysis = await chittyRouter.analyzeDocument({
        documentType: 'evidence',
        content: evidence.content || '',
        caseId: evidence.caseId!,
        chittyId: evidence.auditNotes?.match(/ChittyID: ([^;]+)/)?.[1] || '',
        metadata: {
          evidenceId,
          type: evidence.type,
          extractTopics: true
        }
      });

      // Transform AI analysis to topic structure
      const topics = await this.processTopicAnalysis(analysis, evidence.caseId!, evidenceId);
      const relationships = await this.extractTopicRelationships(topics);
      const clusters = await this.formTopicClusters(topics, evidence.caseId!);

      this.metrics.topics_extracted += topics.length;
      this.metrics.relationships_created += relationships.length;
      this.metrics.clusters_formed += clusters.length;

      return {
        topics,
        relationships,
        clusters
      };

    } catch (error) {
      this.metrics.sync_errors++;
      console.error(`Topic extraction failed for evidence ${evidenceId}:`, error);
      throw error;
    }
  }

  /**
   * Extract topics from atomic facts
   */
  async extractTopicsFromFacts(caseId: string, factIds?: string[]): Promise<TopicExtraction> {
    try {
      // Get facts to analyze
      let factsQuery = db
        .select()
        .from(tables.atomicFacts)
        .where(eq(tables.atomicFacts.caseId, caseId));

      if (factIds && factIds.length > 0) {
        factsQuery = factsQuery.where(
          and(
            eq(tables.atomicFacts.caseId, caseId),
            inArray(tables.atomicFacts.id, factIds)
          )
        );
      }

      const facts = await factsQuery;

      if (facts.length === 0) {
        return { topics: [], relationships: [], clusters: [] };
      }

      // Combine all fact texts for analysis
      const combinedContent = facts.map(f => f.text).join('\n\n');

      // Analyze combined content
      const analysis = await chittyRouter.analyzeDocument({
        documentType: 'fact',
        content: combinedContent,
        caseId,
        chittyId: `CASE-${caseId}`,
        metadata: {
          factIds,
          factCount: facts.length,
          extractTopics: true
        }
      });

      const topics = await this.processTopicAnalysis(analysis, caseId, facts.map(f => f.id).join(','));
      const relationships = await this.extractTopicRelationships(topics);
      const clusters = await this.formTopicClusters(topics, caseId);

      return {
        topics,
        relationships,
        clusters
      };

    } catch (error) {
      this.metrics.sync_errors++;
      console.error(`Topic extraction from facts failed for case ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Process AI analysis results into Topic objects
   */
  private async processTopicAnalysis(analysis: any, caseId: string, sourceId: string): Promise<Topic[]> {
    const topics: Topic[] = [];

    // Extract topics from AI analysis timeline and extracted facts
    const timelineTopics = this.extractTimelineTopics(analysis.timeline || [], caseId, sourceId);
    const factTopics = this.extractFactTopics(analysis.extractedFacts || [], caseId, sourceId);
    const riskTopics = this.extractRiskTopics(analysis.riskAssessment || {}, caseId, sourceId);

    topics.push(...timelineTopics, ...factTopics, ...riskTopics);

    // Deduplicate topics by name and category
    const uniqueTopics = this.deduplicateTopics(topics);

    // Generate ChittyIDs for new topics
    for (const topic of uniqueTopics) {
      if (!topic.chittyId) {
        const identifier = `${topic.category}:${topic.name}:${caseId}`;
        try {
          const chittyResponse = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=T&trust=3&identifier=${identifier}`);
          const chittyData = await chittyResponse.json();
          topic.chittyId = chittyData.chittyId;
        } catch (error) {
          console.warn(`Failed to generate ChittyID for topic ${topic.name}`);
        }
      }
    }

    return uniqueTopics;
  }

  /**
   * Extract topics from timeline events
   */
  private extractTimelineTopics(timeline: any[], caseId: string, sourceId: string): Topic[] {
    return timeline.map(event => ({
      id: crypto.randomUUID(),
      name: event.event || 'Timeline Event',
      category: 'TEMPORAL' as TopicCategory,
      description: event.significance,
      keywords: [event.date, event.event].filter(Boolean),
      relevanceScore: 0.7,
      extractedFrom: [sourceId],
      caseId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  /**
   * Extract topics from extracted facts
   */
  private extractFactTopics(facts: any[], caseId: string, sourceId: string): Topic[] {
    const topics: Topic[] = [];

    for (const fact of facts) {
      // Categorize fact based on type
      const category = this.categorizeFactType(fact.factType);

      topics.push({
        id: crypto.randomUUID(),
        name: this.extractTopicName(fact.text),
        category,
        description: fact.text,
        keywords: fact.credibilityFactors || [],
        relevanceScore: fact.confidence || 0.5,
        extractedFrom: [sourceId],
        caseId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return topics;
  }

  /**
   * Extract topics from risk assessment
   */
  private extractRiskTopics(riskAssessment: any, caseId: string, sourceId: string): Topic[] {
    const topics: Topic[] = [];

    if (riskAssessment.factors) {
      for (const factor of riskAssessment.factors) {
        topics.push({
          id: crypto.randomUUID(),
          name: factor,
          category: 'LEGAL_CONCEPT',
          description: `Risk factor identified in case analysis`,
          keywords: [factor],
          relevanceScore: riskAssessment.score || 0.5,
          extractedFrom: [sourceId],
          caseId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    return topics;
  }

  /**
   * Categorize fact type to topic category
   */
  private categorizeFactType(factType: string): TopicCategory {
    const mapping: Record<string, TopicCategory> = {
      'DATE': 'TEMPORAL',
      'AMOUNT': 'FINANCIAL',
      'IDENTITY': 'FACTUAL_ELEMENT',
      'LOCATION': 'GEOGRAPHIC',
      'RELATIONSHIP': 'RELATIONSHIP',
      'ACTION': 'FACTUAL_ELEMENT',
      'STATUS': 'LEGAL_CONCEPT',
      'ADMISSION': 'CREDIBILITY'
    };

    return mapping[factType] || 'FACTUAL_ELEMENT';
  }

  /**
   * Extract topic name from text
   */
  private extractTopicName(text: string): string {
    // Simple extraction - take first few meaningful words
    const words = text.split(' ').filter(word =>
      word.length > 3 &&
      !['the', 'and', 'was', 'were', 'that', 'this', 'with', 'from'].includes(word.toLowerCase())
    );

    return words.slice(0, 3).join(' ').substring(0, 100);
  }

  /**
   * Deduplicate topics by name and category
   */
  private deduplicateTopics(topics: Topic[]): Topic[] {
    const seen = new Map<string, Topic>();

    for (const topic of topics) {
      const key = `${topic.category}:${topic.name.toLowerCase()}`;
      const existing = seen.get(key);

      if (existing) {
        // Merge topics - combine sources and take higher relevance
        existing.extractedFrom = [...existing.extractedFrom, ...topic.extractedFrom];
        existing.keywords = [...new Set([...existing.keywords, ...topic.keywords])];
        existing.relevanceScore = Math.max(existing.relevanceScore, topic.relevanceScore);
        existing.updatedAt = new Date();
      } else {
        seen.set(key, topic);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Extract relationships between topics
   */
  private async extractTopicRelationships(topics: Topic[]): Promise<TopicRelationship[]> {
    const relationships: TopicRelationship[] = [];

    // Find hierarchical relationships (parent-child)
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const topicA = topics[i];
        const topicB = topics[j];

        // Check for hierarchical relationship
        if (this.isHierarchical(topicA, topicB)) {
          relationships.push({
            id: crypto.randomUUID(),
            fromTopicId: topicA.id,
            toTopicId: topicB.id,
            relationshipType: 'HIERARCHICAL',
            strength: 0.8,
            evidenceSupporting: [...topicA.extractedFrom, ...topicB.extractedFrom],
            createdAt: new Date()
          });
        }

        // Check for temporal relationship
        if (this.isTemporal(topicA, topicB)) {
          relationships.push({
            id: crypto.randomUUID(),
            fromTopicId: topicA.id,
            toTopicId: topicB.id,
            relationshipType: 'TEMPORAL',
            strength: 0.6,
            evidenceSupporting: [...topicA.extractedFrom, ...topicB.extractedFrom],
            createdAt: new Date()
          });
        }

        // Check for supporting relationship
        if (this.isSupporting(topicA, topicB)) {
          relationships.push({
            id: crypto.randomUUID(),
            fromTopicId: topicA.id,
            toTopicId: topicB.id,
            relationshipType: 'SUPPORTS',
            strength: 0.7,
            evidenceSupporting: [...topicA.extractedFrom, ...topicB.extractedFrom],
            createdAt: new Date()
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Check if topics have hierarchical relationship
   */
  private isHierarchical(topicA: Topic, topicB: Topic): boolean {
    // Simple heuristic: broader category contains narrower
    const hierarchies = [
      ['LEGAL_CONCEPT', 'FACTUAL_ELEMENT'],
      ['SUBJECT_MATTER', 'EVIDENCE_TYPE'],
      ['GEOGRAPHIC', 'TEMPORAL']
    ];

    return hierarchies.some(([parent, child]) =>
      (topicA.category === parent && topicB.category === child) ||
      (topicA.category === child && topicB.category === parent)
    );
  }

  /**
   * Check if topics have temporal relationship
   */
  private isTemporal(topicA: Topic, topicB: Topic): boolean {
    return topicA.category === 'TEMPORAL' || topicB.category === 'TEMPORAL';
  }

  /**
   * Check if topics support each other
   */
  private isSupporting(topicA: Topic, topicB: Topic): boolean {
    // Check for shared keywords or evidence sources
    const sharedKeywords = topicA.keywords.filter(k => topicB.keywords.includes(k));
    const sharedSources = topicA.extractedFrom.filter(s => topicB.extractedFrom.includes(s));

    return sharedKeywords.length > 0 || sharedSources.length > 0;
  }

  /**
   * Form topic clusters based on similarity and relationships
   */
  private async formTopicClusters(topics: Topic[], caseId: string): Promise<TopicCluster[]> {
    const clusters: TopicCluster[] = [];

    // Group topics by category first
    const categoryGroups = topics.reduce((groups, topic) => {
      if (!groups[topic.category]) {
        groups[topic.category] = [];
      }
      groups[topic.category].push(topic);
      return groups;
    }, {} as Record<TopicCategory, Topic[]>);

    // Create clusters for each category with multiple topics
    for (const [category, categoryTopics] of Object.entries(categoryGroups)) {
      if (categoryTopics.length > 1) {
        // Find central topic (highest relevance score)
        const centralTopic = categoryTopics.reduce((central, topic) =>
          topic.relevanceScore > central.relevanceScore ? topic : central
        );

        clusters.push({
          id: crypto.randomUUID(),
          name: `${category} Topics`,
          description: `Topics related to ${category.toLowerCase().replace('_', ' ')}`,
          topicIds: categoryTopics.map(t => t.id),
          centralTopic: centralTopic.id,
          coherenceScore: this.calculateCoherenceScore(categoryTopics),
          caseId,
          createdAt: new Date()
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate coherence score for topic cluster
   */
  private calculateCoherenceScore(topics: Topic[]): number {
    if (topics.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const similarity = this.calculateTopicSimilarity(topics[i], topics[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate similarity between two topics
   */
  private calculateTopicSimilarity(topicA: Topic, topicB: Topic): number {
    // Category match
    const categoryMatch = topicA.category === topicB.category ? 0.4 : 0;

    // Keyword overlap
    const sharedKeywords = topicA.keywords.filter(k => topicB.keywords.includes(k));
    const keywordSimilarity = sharedKeywords.length / Math.max(topicA.keywords.length, topicB.keywords.length) * 0.3;

    // Source overlap
    const sharedSources = topicA.extractedFrom.filter(s => topicB.extractedFrom.includes(s));
    const sourceSimilarity = sharedSources.length / Math.max(topicA.extractedFrom.length, topicB.extractedFrom.length) * 0.3;

    return categoryMatch + keywordSimilarity + sourceSimilarity;
  }

  /**
   * Sync topics to case-specific topic database
   */
  async syncTopicsToCase(caseId: string, extraction: TopicExtraction): Promise<void> {
    try {
      // Store topics in a JSON field or separate table
      // For now, update case with topic summary
      const topicSummary = {
        totalTopics: extraction.topics.length,
        categories: this.summarizeTopicCategories(extraction.topics),
        clusters: extraction.clusters.length,
        relationships: extraction.relationships.length,
        lastExtracted: new Date(),
        topTopics: extraction.topics
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10)
          .map(t => ({
            name: t.name,
            category: t.category,
            relevanceScore: t.relevanceScore
          }))
      };

      // Update case metadata with topic information
      await db
        .update(tables.cases)
        .set({
          // Assuming there's a metadata field in cases table
          // Otherwise, create a separate topics table
          updatedAt: new Date()
        })
        .where(eq(tables.cases.id, caseId));

      console.log(`Synced ${extraction.topics.length} topics for case ${caseId}`);

    } catch (error) {
      console.error(`Failed to sync topics for case ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Summarize topic categories
   */
  private summarizeTopicCategories(topics: Topic[]): Record<TopicCategory, number> {
    return topics.reduce((summary, topic) => {
      summary[topic.category] = (summary[topic.category] || 0) + 1;
      return summary;
    }, {} as Record<TopicCategory, number>);
  }

  /**
   * Get current metrics
   */
  getMetrics(): TopicSyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      topics_extracted: 0,
      topics_updated: 0,
      relationships_created: 0,
      clusters_formed: 0,
      sync_errors: 0,
      last_sync: new Date()
    };
  }
}

// Export singleton
export const topicSync = new TopicSyncClient();