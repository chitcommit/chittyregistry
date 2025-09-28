/**
 * Security Baseline Manager for ChittyChain Schema Testing Framework
 * Manages security baselines, adaptive testing, and threat intelligence
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface SecurityBaseline {
  version: string;
  timestamp: string;
  security_controls: SecurityControl[];
  compliance_requirements: ComplianceRequirement[];
  threat_signatures: ThreatSignature[];
  risk_thresholds: RiskThresholds;
  test_configurations: TestConfiguration[];
}

export interface SecurityControl {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'input_validation' | 'output_encoding' | 'session_management' | 'encryption' | 'logging';
  status: 'active' | 'disabled' | 'warning' | 'error';
  last_validated: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  implementation_status: 'implemented' | 'partial' | 'not_implemented' | 'unknown';
  effectiveness_score: number; // 0-100
  false_positive_rate: number; // 0-1
  configuration: Record<string, any>;
}

export interface ComplianceRequirement {
  framework: 'GDPR' | 'SOC2' | 'OWASP' | 'ISO27001' | 'HIPAA' | 'PCI_DSS' | 'NIST';
  requirement_id: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'pending';
  last_assessed: string;
  evidence: string[];
  remediation_actions: string[];
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

export interface ThreatSignature {
  id: string;
  name: string;
  category: 'injection' | 'authentication_bypass' | 'privilege_escalation' | 'data_exposure' | 'dos' | 'malware' | 'social_engineering';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_rate: number; // 0-1
  false_positive_rate: number; // 0-1
  last_updated: string;
  source: 'internal' | 'external' | 'threat_intel' | 'security_team';
  mitigation_strategies: string[];
}

export interface RiskThresholds {
  critical_risk_score: number;
  high_risk_score: number;
  medium_risk_score: number;
  acceptable_false_positive_rate: number;
  minimum_detection_rate: number;
  compliance_score_threshold: number;
}

export interface TestConfiguration {
  test_type: string;
  enabled: boolean;
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'on_demand';
  parameters: Record<string, any>;
  success_criteria: SuccessCriteria;
  adaptive_parameters: AdaptiveParameters;
}

export interface SuccessCriteria {
  max_vulnerabilities: { critical: number; high: number; medium: number; low: number };
  min_security_score: number;
  max_false_positive_rate: number;
  min_compliance_score: number;
}

export interface AdaptiveParameters {
  adjust_based_on_results: boolean;
  learning_rate: number;
  threat_intelligence_integration: boolean;
  dynamic_test_selection: boolean;
}

export interface SecurityTestPlan {
  plan_id: string;
  timestamp: string;
  test_categories: TestCategory[];
  risk_scenarios: RiskScenario[];
  compliance_tests: ComplianceTest[];
  adaptive_recommendations: AdaptiveRecommendation[];
  execution_priority: string[];
}

export interface TestCategory {
  name: string;
  description: string;
  tests: SecurityTest[];
  priority: 'high' | 'medium' | 'low';
  estimated_duration: number;
}

export interface SecurityTest {
  id: string;
  name: string;
  description: string;
  attack_vectors: string[];
  expected_outcome: 'block' | 'detect' | 'log' | 'alert';
  severity_if_failed: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskScenario {
  id: string;
  name: string;
  description: string;
  threat_actors: string[];
  attack_chain: string[];
  business_impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
}

export interface ComplianceTest {
  framework: string;
  requirement_id: string;
  test_description: string;
  validation_method: 'automated' | 'manual' | 'hybrid';
  evidence_required: string[];
}

export interface AdaptiveRecommendation {
  category: 'test_optimization' | 'threat_coverage' | 'compliance_improvement' | 'risk_reduction';
  recommendation: string;
  rationale: string;
  implementation_effort: 'low' | 'medium' | 'high';
  expected_impact: 'low' | 'medium' | 'high';
}

export interface BaselineUpdateResult {
  updated: boolean;
  changes: BaselineChange[];
  new_version: string;
  update_reason: string;
  approval_required: boolean;
}

export interface BaselineChange {
  type: 'added' | 'modified' | 'removed';
  component: 'security_control' | 'compliance_requirement' | 'threat_signature' | 'threshold';
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AdaptiveRecommendations {
  immediate_actions: RecommendationItem[];
  short_term_improvements: RecommendationItem[];
  strategic_enhancements: RecommendationItem[];
  threat_landscape_updates: RecommendationItem[];
}

export interface RecommendationItem {
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'high' | 'medium' | 'low';
  timeline: string;
  dependencies: string[];
  success_metrics: string[];
}

export class SecurityBaselineManager {
  private baselineDir: string;
  private threatIntelDir: string;
  private currentBaseline: SecurityBaseline | null = null;

  constructor() {
    this.baselineDir = join(process.cwd(), 'test-results', 'security-baselines');
    this.threatIntelDir = join(process.cwd(), 'test-results', 'threat-intelligence');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.baselineDir, this.threatIntelDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  async initializeBaseline(): Promise<SecurityBaseline> {
    if (this.currentBaseline) {
      return this.currentBaseline;
    }

    // Try to load existing baseline
    const existingBaseline = this.loadLatestBaseline();
    if (existingBaseline) {
      this.currentBaseline = existingBaseline;
      return existingBaseline;
    }

    // Create new baseline
    const newBaseline = this.createDefaultBaseline();
    await this.saveBaseline(newBaseline);
    this.currentBaseline = newBaseline;

    return newBaseline;
  }

  private createDefaultBaseline(): SecurityBaseline {
    const version = `v1.0.0-${Date.now()}`;
    const timestamp = new Date().toISOString();

    return {
      version,
      timestamp,
      security_controls: [
        {
          id: 'auth_001',
          name: 'Pipeline Authentication Required',
          category: 'authentication',
          status: 'active',
          last_validated: timestamp,
          risk_level: 'critical',
          implementation_status: 'implemented',
          effectiveness_score: 95,
          false_positive_rate: 0.02,
          configuration: {
            require_chitty_id: true,
            token_validation: 'strict',
            session_timeout: 3600
          }
        },
        {
          id: 'input_001',
          name: 'SQL Injection Prevention',
          category: 'input_validation',
          status: 'active',
          last_validated: timestamp,
          risk_level: 'critical',
          implementation_status: 'implemented',
          effectiveness_score: 98,
          false_positive_rate: 0.05,
          configuration: {
            parameterized_queries: true,
            input_sanitization: true,
            whitelist_validation: true
          }
        },
        {
          id: 'input_002',
          name: 'XSS Prevention',
          category: 'output_encoding',
          status: 'active',
          last_validated: timestamp,
          risk_level: 'high',
          implementation_status: 'implemented',
          effectiveness_score: 92,
          false_positive_rate: 0.08,
          configuration: {
            output_encoding: true,
            csp_headers: true,
            content_type_validation: true
          }
        },
        {
          id: 'session_001',
          name: 'Session Management',
          category: 'session_management',
          status: 'active',
          last_validated: timestamp,
          risk_level: 'high',
          implementation_status: 'implemented',
          effectiveness_score: 88,
          false_positive_rate: 0.03,
          configuration: {
            secure_cookies: true,
            session_regeneration: true,
            concurrent_session_limits: 5
          }
        },
        {
          id: 'authz_001',
          name: 'Access Control',
          category: 'authorization',
          status: 'active',
          last_validated: timestamp,
          risk_level: 'critical',
          implementation_status: 'implemented',
          effectiveness_score: 94,
          false_positive_rate: 0.04,
          configuration: {
            rbac_enabled: true,
            privilege_validation: true,
            access_logging: true
          }
        }
      ],
      compliance_requirements: [
        {
          framework: 'OWASP',
          requirement_id: 'A01_2021',
          description: 'Broken Access Control Prevention',
          status: 'compliant',
          last_assessed: timestamp,
          evidence: ['access_control_tests_passed', 'authorization_validation'],
          remediation_actions: [],
          priority: 'high'
        },
        {
          framework: 'OWASP',
          requirement_id: 'A03_2021',
          description: 'Injection Prevention',
          status: 'compliant',
          last_assessed: timestamp,
          evidence: ['injection_tests_passed', 'input_validation_implemented'],
          remediation_actions: [],
          priority: 'high'
        },
        {
          framework: 'GDPR',
          requirement_id: 'ART_32',
          description: 'Security of Processing',
          status: 'compliant',
          last_assessed: timestamp,
          evidence: ['encryption_in_transit', 'access_logging', 'data_minimization'],
          remediation_actions: [],
          priority: 'high'
        },
        {
          framework: 'SOC2',
          requirement_id: 'CC6.1',
          description: 'Logical and Physical Access Controls',
          status: 'compliant',
          last_assessed: timestamp,
          evidence: ['access_control_procedures', 'authentication_mechanisms'],
          remediation_actions: [],
          priority: 'medium'
        }
      ],
      threat_signatures: [
        {
          id: 'sig_001',
          name: 'SQL Injection Pattern',
          category: 'injection',
          pattern: '(union|select|insert|delete|drop|exec|script|or\\s+1=1)',
          severity: 'high',
          detection_rate: 0.95,
          false_positive_rate: 0.05,
          last_updated: timestamp,
          source: 'internal',
          mitigation_strategies: ['input_validation', 'parameterized_queries', 'access_control']
        },
        {
          id: 'sig_002',
          name: 'XSS Attack Pattern',
          category: 'injection',
          pattern: '(<script|javascript:|onerror=|onload=|data:text/html)',
          severity: 'medium',
          detection_rate: 0.90,
          false_positive_rate: 0.10,
          last_updated: timestamp,
          source: 'internal',
          mitigation_strategies: ['output_encoding', 'csp_headers', 'input_sanitization']
        },
        {
          id: 'sig_003',
          name: 'Authentication Bypass Attempt',
          category: 'authentication_bypass',
          pattern: '(admin|root|sa).*[\'"`].*[\'"`]|\\bor\\b.*=.*\\bor\\b',
          severity: 'critical',
          detection_rate: 0.92,
          false_positive_rate: 0.03,
          last_updated: timestamp,
          source: 'security_team',
          mitigation_strategies: ['strong_authentication', 'account_lockout', 'monitoring']
        }
      ],
      risk_thresholds: {
        critical_risk_score: 90,
        high_risk_score: 70,
        medium_risk_score: 40,
        acceptable_false_positive_rate: 0.10,
        minimum_detection_rate: 0.85,
        compliance_score_threshold: 85
      },
      test_configurations: [
        {
          test_type: 'penetration_testing',
          enabled: true,
          frequency: 'daily',
          parameters: {
            attack_vectors: ['injection', 'authentication_bypass', 'privilege_escalation'],
            intensity: 'medium',
            scope: 'full_application'
          },
          success_criteria: {
            max_vulnerabilities: { critical: 0, high: 2, medium: 5, low: 10 },
            min_security_score: 85,
            max_false_positive_rate: 0.10,
            min_compliance_score: 90
          },
          adaptive_parameters: {
            adjust_based_on_results: true,
            learning_rate: 0.1,
            threat_intelligence_integration: true,
            dynamic_test_selection: true
          }
        },
        {
          test_type: 'compliance_validation',
          enabled: true,
          frequency: 'weekly',
          parameters: {
            frameworks: ['OWASP', 'GDPR', 'SOC2'],
            validation_depth: 'comprehensive'
          },
          success_criteria: {
            max_vulnerabilities: { critical: 0, high: 0, medium: 2, low: 5 },
            min_security_score: 90,
            max_false_positive_rate: 0.05,
            min_compliance_score: 95
          },
          adaptive_parameters: {
            adjust_based_on_results: false,
            learning_rate: 0.05,
            threat_intelligence_integration: false,
            dynamic_test_selection: false
          }
        }
      ]
    };
  }

  generateSecurityTestPlan(): SecurityTestPlan {
    const baseline = this.currentBaseline;
    if (!baseline) {
      throw new Error('Security baseline not initialized');
    }

    const planId = `plan_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Generate test categories based on current threats and compliance requirements
    const testCategories: TestCategory[] = [
      {
        name: 'Authentication Security',
        description: 'Tests for authentication mechanisms and bypass attempts',
        priority: 'high',
        estimated_duration: 300, // seconds
        tests: [
          {
            id: 'auth_001',
            name: 'Pipeline Authentication Bypass',
            description: 'Attempt to bypass ChittyID pipeline authentication',
            attack_vectors: ['missing_token', 'invalid_token', 'expired_token'],
            expected_outcome: 'block',
            severity_if_failed: 'critical'
          },
          {
            id: 'auth_002',
            name: 'Session Management Validation',
            description: 'Test session security controls',
            attack_vectors: ['session_fixation', 'session_replay', 'concurrent_sessions'],
            expected_outcome: 'detect',
            severity_if_failed: 'high'
          }
        ]
      },
      {
        name: 'Injection Prevention',
        description: 'Tests for various injection attack vectors',
        priority: 'high',
        estimated_duration: 450,
        tests: [
          {
            id: 'inj_001',
            name: 'SQL Injection Testing',
            description: 'Comprehensive SQL injection attack simulation',
            attack_vectors: ['union_based', 'boolean_based', 'time_based', 'error_based'],
            expected_outcome: 'block',
            severity_if_failed: 'critical'
          },
          {
            id: 'inj_002',
            name: 'XSS Prevention Testing',
            description: 'Cross-site scripting attack prevention',
            attack_vectors: ['reflected_xss', 'stored_xss', 'dom_xss'],
            expected_outcome: 'block',
            severity_if_failed: 'medium'
          }
        ]
      },
      {
        name: 'Access Control',
        description: 'Authorization and privilege escalation tests',
        priority: 'high',
        estimated_duration: 360,
        tests: [
          {
            id: 'authz_001',
            name: 'Horizontal Privilege Escalation',
            description: 'Test access to other users\' resources',
            attack_vectors: ['parameter_manipulation', 'direct_object_reference'],
            expected_outcome: 'block',
            severity_if_failed: 'high'
          },
          {
            id: 'authz_002',
            name: 'Vertical Privilege Escalation',
            description: 'Test elevation to admin privileges',
            attack_vectors: ['role_manipulation', 'trust_level_bypass'],
            expected_outcome: 'block',
            severity_if_failed: 'critical'
          }
        ]
      }
    ];

    // Generate risk scenarios
    const riskScenarios: RiskScenario[] = [
      {
        id: 'risk_001',
        name: 'Data Breach via SQL Injection',
        description: 'Attacker exploits SQL injection to access sensitive data',
        threat_actors: ['external_hackers', 'malicious_insiders'],
        attack_chain: ['reconnaissance', 'sql_injection', 'data_exfiltration'],
        business_impact: 'critical',
        likelihood: 'medium'
      },
      {
        id: 'risk_002',
        name: 'Unauthorized Administrative Access',
        description: 'Privilege escalation leads to system compromise',
        threat_actors: ['external_hackers', 'compromised_accounts'],
        attack_chain: ['initial_access', 'privilege_escalation', 'persistence', 'lateral_movement'],
        business_impact: 'high',
        likelihood: 'low'
      }
    ];

    // Generate compliance tests
    const complianceTests: ComplianceTest[] = baseline.compliance_requirements.map(req => ({
      framework: req.framework,
      requirement_id: req.requirement_id,
      test_description: `Validate ${req.description}`,
      validation_method: 'automated',
      evidence_required: req.evidence
    }));

    // Generate adaptive recommendations
    const adaptiveRecommendations: AdaptiveRecommendation[] = [
      {
        category: 'threat_coverage',
        recommendation: 'Increase focus on injection testing based on recent threat intelligence',
        rationale: 'Higher frequency of injection attacks observed in threat landscape',
        implementation_effort: 'low',
        expected_impact: 'medium'
      },
      {
        category: 'test_optimization',
        recommendation: 'Optimize test execution order based on risk prioritization',
        rationale: 'Critical security tests should execute first for faster feedback',
        implementation_effort: 'medium',
        expected_impact: 'high'
      }
    ];

    return {
      plan_id: planId,
      timestamp,
      test_categories: testCategories,
      risk_scenarios: riskScenarios,
      compliance_tests: complianceTests,
      adaptive_recommendations: adaptiveRecommendations,
      execution_priority: ['Authentication Security', 'Injection Prevention', 'Access Control']
    };
  }

  async updateBaseline(
    testResults: any,
    securityMetrics: any,
    forceUpdate: boolean = false
  ): Promise<BaselineUpdateResult | null> {
    const baseline = this.currentBaseline;
    if (!baseline) {
      throw new Error('Security baseline not initialized');
    }

    const changes: BaselineChange[] = [];
    let updateRequired = forceUpdate;

    // Analyze test results for potential baseline updates
    const securityScore = securityMetrics.security_score || 0;
    const vulnerabilitiesDetected = securityMetrics.vulnerabilities_detected || 0;

    // Check if security controls need updates
    for (const control of baseline.security_controls) {
      const controlResults = this.extractControlResults(testResults, control.id);

      if (controlResults) {
        const newEffectiveness = this.calculateEffectiveness(controlResults);
        const effectivenessChange = Math.abs(newEffectiveness - control.effectiveness_score);

        if (effectivenessChange > 10) { // 10% change threshold
          changes.push({
            type: 'modified',
            component: 'security_control',
            id: control.id,
            description: `Effectiveness score changed from ${control.effectiveness_score} to ${newEffectiveness}`,
            impact: effectivenessChange > 20 ? 'high' : 'medium'
          });

          control.effectiveness_score = newEffectiveness;
          control.last_validated = new Date().toISOString();
          updateRequired = true;
        }
      }
    }

    // Check if new threat signatures should be added
    const newThreats = this.identifyNewThreats(testResults, securityMetrics);
    for (const threat of newThreats) {
      baseline.threat_signatures.push(threat);
      changes.push({
        type: 'added',
        component: 'threat_signature',
        id: threat.id,
        description: `New threat signature added: ${threat.name}`,
        impact: threat.severity === 'critical' ? 'high' : 'medium'
      });
      updateRequired = true;
    }

    // Update compliance status based on results
    const complianceUpdates = this.updateComplianceStatus(testResults, baseline.compliance_requirements);
    changes.push(...complianceUpdates);
    if (complianceUpdates.length > 0) {
      updateRequired = true;
    }

    if (!updateRequired) {
      return null;
    }

    // Create new baseline version
    const newVersion = this.generateNewVersion(baseline.version);
    const updatedBaseline: SecurityBaseline = {
      ...baseline,
      version: newVersion,
      timestamp: new Date().toISOString()
    };

    // Save updated baseline
    await this.saveBaseline(updatedBaseline);
    this.currentBaseline = updatedBaseline;

    return {
      updated: true,
      changes,
      new_version: newVersion,
      update_reason: 'Automated update based on test results',
      approval_required: changes.some(c => c.impact === 'high')
    };
  }

  generateAdaptiveRecommendations(
    testResults: any,
    securityMetrics: any
  ): AdaptiveRecommendations {
    const baseline = this.currentBaseline;
    if (!baseline) {
      throw new Error('Security baseline not initialized');
    }

    const immediateActions: RecommendationItem[] = [];
    const shortTermImprovements: RecommendationItem[] = [];
    const strategicEnhancements: RecommendationItem[] = [];
    const threatLandscapeUpdates: RecommendationItem[] = [];

    // Analyze security metrics for immediate actions
    const criticalVulns = securityMetrics.vulnerabilities_detected || 0;
    const securityScore = securityMetrics.security_score || 0;

    if (criticalVulns > 0) {
      immediateActions.push({
        title: 'Address Critical Vulnerabilities',
        description: `${criticalVulns} critical vulnerabilities detected requiring immediate attention`,
        category: 'security',
        priority: 'high',
        effort: 'high',
        impact: 'high',
        timeline: 'immediate',
        dependencies: [],
        success_metrics: ['zero_critical_vulnerabilities', 'security_score_improvement']
      });
    }

    if (securityScore < baseline.risk_thresholds.critical_risk_score) {
      immediateActions.push({
        title: 'Improve Security Score',
        description: `Security score (${securityScore}) below critical threshold (${baseline.risk_thresholds.critical_risk_score})`,
        category: 'security',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        timeline: '24-48 hours',
        dependencies: ['vulnerability_remediation'],
        success_metrics: ['security_score_above_threshold']
      });
    }

    // Short-term improvements based on test patterns
    const failingControls = this.identifyFailingControls(testResults, baseline.security_controls);
    if (failingControls.length > 0) {
      shortTermImprovements.push({
        title: 'Strengthen Security Controls',
        description: `${failingControls.length} security controls showing degraded performance`,
        category: 'security_controls',
        priority: 'medium',
        effort: 'medium',
        impact: 'medium',
        timeline: '1-2 weeks',
        dependencies: ['control_analysis', 'configuration_review'],
        success_metrics: ['improved_control_effectiveness', 'reduced_false_positives']
      });
    }

    // Strategic enhancements based on threat landscape
    if (this.shouldUpdateThreatSignatures(baseline.threat_signatures)) {
      strategicEnhancements.push({
        title: 'Update Threat Detection Signatures',
        description: 'Refresh threat signatures based on latest threat intelligence',
        category: 'threat_detection',
        priority: 'medium',
        effort: 'low',
        impact: 'medium',
        timeline: '2-4 weeks',
        dependencies: ['threat_intelligence_feed'],
        success_metrics: ['improved_detection_rate', 'reduced_false_positives']
      });
    }

    // Compliance-based recommendations
    const nonCompliantRequirements = baseline.compliance_requirements.filter(
      req => req.status === 'non_compliant' || req.status === 'partial'
    );

    if (nonCompliantRequirements.length > 0) {
      shortTermImprovements.push({
        title: 'Address Compliance Gaps',
        description: `${nonCompliantRequirements.length} compliance requirements need attention`,
        category: 'compliance',
        priority: 'high',
        effort: 'high',
        impact: 'high',
        timeline: '2-6 weeks',
        dependencies: ['compliance_audit', 'remediation_planning'],
        success_metrics: ['compliance_score_improvement', 'requirements_met']
      });
    }

    return {
      immediate_actions: immediateActions,
      short_term_improvements: shortTermImprovements,
      strategic_enhancements: strategicEnhancements,
      threat_landscape_updates: threatLandscapeUpdates
    };
  }

  private extractControlResults(testResults: any, controlId: string): any {
    // Extract test results relevant to specific security control
    // This would analyze the test results to find data related to the control
    return testResults?.controls?.[controlId] || null;
  }

  private calculateEffectiveness(controlResults: any): number {
    // Calculate effectiveness score based on test results
    const blockedAttacks = controlResults.blocked || 0;
    const totalAttacks = controlResults.total || 1;

    return Math.round((blockedAttacks / totalAttacks) * 100);
  }

  private identifyNewThreats(testResults: any, securityMetrics: any): ThreatSignature[] {
    // Identify new threat patterns from test results
    const newThreats: ThreatSignature[] = [];

    // This would analyze failed attacks or new attack patterns
    // For now, return empty array as placeholder

    return newThreats;
  }

  private updateComplianceStatus(testResults: any, requirements: ComplianceRequirement[]): BaselineChange[] {
    const changes: BaselineChange[] = [];

    // Update compliance status based on test results
    // This would map test results to compliance requirements

    return changes;
  }

  private generateNewVersion(currentVersion: string): string {
    // Generate new semantic version
    const versionMatch = currentVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const [, major, minor, patch] = versionMatch;
      return `v${major}.${minor}.${parseInt(patch) + 1}-${Date.now()}`;
    }

    return `v1.0.1-${Date.now()}`;
  }

  private identifyFailingControls(testResults: any, controls: SecurityControl[]): SecurityControl[] {
    // Identify controls that are not performing effectively
    return controls.filter(control => {
      const results = this.extractControlResults(testResults, control.id);
      return results && results.effectiveness < 80; // 80% threshold
    });
  }

  private shouldUpdateThreatSignatures(signatures: ThreatSignature[]): boolean {
    // Check if threat signatures are outdated
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return signatures.some(sig =>
      new Date(sig.last_updated) < oneWeekAgo
    );
  }

  private loadLatestBaseline(): SecurityBaseline | null {
    try {
      const baselineFile = join(this.baselineDir, 'current-baseline.json');
      if (existsSync(baselineFile)) {
        return JSON.parse(readFileSync(baselineFile, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load baseline:', error);
    }

    return null;
  }

  private async saveBaseline(baseline: SecurityBaseline): Promise<void> {
    try {
      const baselineFile = join(this.baselineDir, 'current-baseline.json');
      const versionedFile = join(this.baselineDir, `baseline-${baseline.version}.json`);

      // Save both current and versioned copies
      writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
      writeFileSync(versionedFile, JSON.stringify(baseline, null, 2));

      console.log(`📊 Saved security baseline: ${baseline.version}`);
    } catch (error) {
      console.error('Failed to save baseline:', error);
      throw error;
    }
  }

  // Public utility methods
  getBaseline(): SecurityBaseline | null {
    return this.currentBaseline;
  }

  getSecurityControlById(controlId: string): SecurityControl | null {
    return this.currentBaseline?.security_controls.find(c => c.id === controlId) || null;
  }

  getThreatSignatureById(signatureId: string): ThreatSignature | null {
    return this.currentBaseline?.threat_signatures.find(s => s.id === signatureId) || null;
  }

  getComplianceStatus(framework?: string): ComplianceRequirement[] {
    if (!this.currentBaseline) return [];

    return framework
      ? this.currentBaseline.compliance_requirements.filter(r => r.framework === framework)
      : this.currentBaseline.compliance_requirements;
  }
}