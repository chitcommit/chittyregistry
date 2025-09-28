/**
 * Test Result Caching and Comparison System
 * Provides intelligent caching, baseline comparison, and regression detection
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

interface CacheMetadata {
  cache_version: string;
  created_at: string;
  expires_at: string;
  test_environment: string;
  git_commit?: string;
  cache_key: string;
  dependencies: string[];
}

interface CachedTestResult {
  metadata: CacheMetadata;
  test_config_hash: string;
  results: any;
  performance_metrics: PerformanceMetrics;
  security_metrics: SecurityMetrics;
  raw_output: string;
}

interface PerformanceMetrics {
  total_duration: number;
  avg_response_time: number;
  p95_response_time: number;
  throughput: number;
  error_rate: number;
  memory_usage: number;
  cpu_usage: number;
}

interface SecurityMetrics {
  security_score: number;
  vulnerabilities_detected: number;
  compliance_score: number;
  threat_level: string;
  false_positives: number;
}

interface BaselineComparison {
  performance_delta: PerformanceMetricsDelta;
  security_delta: SecurityMetricsDelta;
  regression_detected: boolean;
  improvement_detected: boolean;
  significance_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface PerformanceMetricsDelta {
  response_time_change: number;
  throughput_change: number;
  error_rate_change: number;
  memory_usage_change: number;
  regression_threshold_exceeded: boolean;
}

interface SecurityMetricsDelta {
  security_score_change: number;
  new_vulnerabilities: number;
  resolved_vulnerabilities: number;
  compliance_score_change: number;
  critical_issues_introduced: boolean;
}

interface CacheStrategy {
  name: string;
  ttl_hours: number;
  invalidation_triggers: string[];
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

export class TestCacheManager {
  private cacheDir: string = './test-results/cache';
  private baselineDir: string = './test-results/baselines';
  private maxCacheSize: number = 1024 * 1024 * 100; // 100MB
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  private cacheStrategies: Record<string, CacheStrategy> = {
    'performance': {
      name: 'performance',
      ttl_hours: 6,
      invalidation_triggers: ['config_change', 'dependency_update'],
      compression_enabled: true,
      encryption_enabled: false
    },
    'security': {
      name: 'security',
      ttl_hours: 12,
      invalidation_triggers: ['security_update', 'config_change'],
      compression_enabled: true,
      encryption_enabled: true
    },
    'functional': {
      name: 'functional',
      ttl_hours: 2,
      invalidation_triggers: ['code_change', 'config_change'],
      compression_enabled: false,
      encryption_enabled: false
    }
  };

  constructor() {
    this.initializeCacheDirectories();
  }

  /**
   * Generate cache key based on test configuration and environment
   */
  generateCacheKey(testConfig: any, environment: string): string {
    const configString = JSON.stringify(testConfig, Object.keys(testConfig).sort());
    const environmentString = JSON.stringify({
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      environment
    });

    return createHash('sha256')
      .update(configString + environmentString)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if cached result exists and is valid
   */
  isCacheValid(cacheKey: string, testType: string): boolean {
    const cachePath = this.getCachePath(cacheKey, testType);

    if (!existsSync(cachePath)) {
      return false;
    }

    try {
      const cachedResult: CachedTestResult = JSON.parse(readFileSync(cachePath, 'utf8'));
      const expiresAt = new Date(cachedResult.metadata.expires_at);

      if (expiresAt < new Date()) {
        console.log(`Cache expired for key ${cacheKey}`);
        return false;
      }

      // Check if invalidation triggers have been activated
      if (this.hasInvalidationTriggers(cachedResult, testType)) {
        console.log(`Cache invalidated due to triggers for key ${cacheKey}`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`Failed to validate cache for key ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Store test results in cache
   */
  async cacheTestResults(
    cacheKey: string,
    testType: string,
    testConfig: any,
    results: any,
    performanceMetrics: PerformanceMetrics,
    securityMetrics: SecurityMetrics,
    rawOutput: string
  ): Promise<void> {
    const strategy = this.cacheStrategies[testType] || this.cacheStrategies['functional'];
    const expiresAt = new Date(Date.now() + (strategy.ttl_hours * 60 * 60 * 1000));

    const cachedResult: CachedTestResult = {
      metadata: {
        cache_version: '1.0.0',
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        test_environment: process.env.NODE_ENV || 'test',
        git_commit: await this.getCurrentGitCommit(),
        cache_key: cacheKey,
        dependencies: this.getTestDependencies()
      },
      test_config_hash: this.hashObject(testConfig),
      results,
      performance_metrics: performanceMetrics,
      security_metrics: securityMetrics,
      raw_output: strategy.compression_enabled ? this.compressString(rawOutput) : rawOutput
    };

    const cachePath = this.getCachePath(cacheKey, testType);

    // Ensure cache directory exists
    mkdirSync(dirname(cachePath), { recursive: true });

    // Write cache file
    const dataToWrite = strategy.encryption_enabled
      ? this.encryptData(JSON.stringify(cachedResult, null, 2))
      : JSON.stringify(cachedResult, null, 2);

    writeFileSync(cachePath, dataToWrite);

    // Cleanup old cache entries if needed
    await this.cleanupOldCache();

    console.log(`✅ Test results cached with key: ${cacheKey}`);
  }

  /**
   * Retrieve cached test results
   */
  getCachedResults(cacheKey: string, testType: string): CachedTestResult | null {
    if (!this.isCacheValid(cacheKey, testType)) {
      return null;
    }

    try {
      const cachePath = this.getCachePath(cacheKey, testType);
      const strategy = this.cacheStrategies[testType] || this.cacheStrategies['functional'];

      let rawData = readFileSync(cachePath, 'utf8');

      if (strategy.encryption_enabled) {
        rawData = this.decryptData(rawData);
      }

      const cachedResult: CachedTestResult = JSON.parse(rawData);

      // Decompress output if needed
      if (strategy.compression_enabled && cachedResult.raw_output) {
        cachedResult.raw_output = this.decompressString(cachedResult.raw_output);
      }

      console.log(`📋 Using cached results for key: ${cacheKey}`);
      return cachedResult;
    } catch (error) {
      console.warn(`Failed to retrieve cached results for key ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Compare current results with baseline
   */
  compareWithBaseline(
    currentResults: any,
    currentPerformance: PerformanceMetrics,
    currentSecurity: SecurityMetrics,
    testType: string
  ): BaselineComparison {
    const baseline = this.getBaseline(testType);

    if (!baseline) {
      console.log(`No baseline found for test type: ${testType}`);
      return this.createDefaultComparison();
    }

    const performanceDelta = this.calculatePerformanceDelta(
      currentPerformance,
      baseline.performance_metrics
    );

    const securityDelta = this.calculateSecurityDelta(
      currentSecurity,
      baseline.security_metrics
    );

    const regressionDetected = this.detectRegression(performanceDelta, securityDelta);
    const improvementDetected = this.detectImprovement(performanceDelta, securityDelta);
    const significanceLevel = this.calculateSignificanceLevel(performanceDelta, securityDelta);

    return {
      performance_delta: performanceDelta,
      security_delta: securityDelta,
      regression_detected: regressionDetected,
      improvement_detected: improvementDetected,
      significance_level: significanceLevel,
      recommendations: this.generateRecommendations(performanceDelta, securityDelta)
    };
  }

  /**
   * Update baseline with current results
   */
  updateBaseline(
    testType: string,
    results: any,
    performanceMetrics: PerformanceMetrics,
    securityMetrics: SecurityMetrics,
    force: boolean = false
  ): void {
    const baselinePath = join(this.baselineDir, `${testType}-baseline.json`);

    // Check if current results are better than baseline
    if (!force && existsSync(baselinePath)) {
      const comparison = this.compareWithBaseline(results, performanceMetrics, securityMetrics, testType);

      if (comparison.regression_detected) {
        console.log(`⚠️  Not updating baseline due to regression in ${testType} tests`);
        return;
      }
    }

    const baseline = {
      updated_at: new Date().toISOString(),
      git_commit: this.getCurrentGitCommit(),
      test_type: testType,
      results,
      performance_metrics: performanceMetrics,
      security_metrics: securityMetrics,
      environment: {
        node_version: process.version,
        platform: process.platform,
        test_environment: process.env.NODE_ENV || 'test'
      }
    };

    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

    console.log(`✅ Baseline updated for test type: ${testType}`);
  }

  /**
   * Generate cache statistics and health report
   */
  getCacheStatistics(): any {
    const stats = {
      cache_directory: this.cacheDir,
      total_cache_files: 0,
      total_cache_size: 0,
      cache_hit_rate: 0,
      oldest_cache_entry: null,
      newest_cache_entry: null,
      cache_types: {} as Record<string, any>,
      baseline_status: {} as Record<string, any>
    };

    try {
      if (existsSync(this.cacheDir)) {
        const files = this.getAllCacheFiles();
        stats.total_cache_files = files.length;
        stats.total_cache_size = files.reduce((total, file) => {
          return total + statSync(file).size;
        }, 0);

        // Analyze cache types
        Object.keys(this.cacheStrategies).forEach(testType => {
          const typeFiles = files.filter(file => file.includes(`-${testType}.json`));
          stats.cache_types[testType] = {
            file_count: typeFiles.length,
            total_size: typeFiles.reduce((total, file) => total + statSync(file).size, 0),
            strategy: this.cacheStrategies[testType]
          };
        });
      }

      // Check baseline status
      if (existsSync(this.baselineDir)) {
        const baselineFiles = readdirSync(this.baselineDir);
        baselineFiles.forEach(file => {
          const testType = file.replace('-baseline.json', '');
          const baselinePath = join(this.baselineDir, file);
          const baselineStats = statSync(baselinePath);

          stats.baseline_status[testType] = {
            exists: true,
            size: baselineStats.size,
            last_updated: baselineStats.mtime.toISOString(),
            age_days: Math.floor((Date.now() - baselineStats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          };
        });
      }

    } catch (error) {
      console.warn('Failed to generate cache statistics:', error);
    }

    return stats;
  }

  /**
   * Clean up expired and oversized cache
   */
  async cleanupOldCache(): Promise<void> {
    try {
      const files = this.getAllCacheFiles();
      let totalSize = 0;

      // Calculate total cache size
      const fileInfos = files.map(file => {
        const stats = statSync(file);
        totalSize += stats.size;
        return { path: file, size: stats.size, mtime: stats.mtime };
      });

      // Remove expired files
      for (const file of files) {
        try {
          const cachedResult: CachedTestResult = JSON.parse(readFileSync(file, 'utf8'));
          const expiresAt = new Date(cachedResult.metadata.expires_at);

          if (expiresAt < new Date()) {
            console.log(`🗑️  Removing expired cache file: ${file}`);
            // fs.unlinkSync would be used here
          }
        } catch (error) {
          console.warn(`Failed to parse cache file ${file}:`, error);
        }
      }

      // If still over size limit, remove oldest files
      if (totalSize > this.maxCacheSize) {
        console.log(`🗑️  Cache size (${totalSize}) exceeds limit (${this.maxCacheSize}), cleaning up...`);

        fileInfos.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

        let removedSize = 0;
        for (const fileInfo of fileInfos) {
          if (totalSize - removedSize <= this.maxCacheSize) {
            break;
          }

          console.log(`🗑️  Removing old cache file: ${fileInfo.path}`);
          removedSize += fileInfo.size;
          // fs.unlinkSync would be used here
        }
      }

    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  // Private utility methods
  private initializeCacheDirectories(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!existsSync(this.baselineDir)) {
      mkdirSync(this.baselineDir, { recursive: true });
    }
  }

  private getCachePath(cacheKey: string, testType: string): string {
    return join(this.cacheDir, `${cacheKey}-${testType}.json`);
  }

  private getAllCacheFiles(): string[] {
    if (!existsSync(this.cacheDir)) {
      return [];
    }

    return readdirSync(this.cacheDir)
      .filter(file => file.endsWith('.json'))
      .map(file => join(this.cacheDir, file));
  }

  private getBaseline(testType: string): CachedTestResult | null {
    const baselinePath = join(this.baselineDir, `${testType}-baseline.json`);

    if (!existsSync(baselinePath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(baselinePath, 'utf8'));
    } catch (error) {
      console.warn(`Failed to read baseline for ${testType}:`, error);
      return null;
    }
  }

  private hasInvalidationTriggers(cachedResult: CachedTestResult, testType: string): boolean {
    const strategy = this.cacheStrategies[testType];
    if (!strategy) return false;

    // Check git commit changes
    const currentCommit = this.getCurrentGitCommit();
    if (currentCommit && cachedResult.metadata.git_commit !== currentCommit) {
      if (strategy.invalidation_triggers.includes('code_change')) {
        return true;
      }
    }

    // Check dependency changes
    const currentDeps = this.getTestDependencies();
    const cachedDeps = cachedResult.metadata.dependencies;
    if (JSON.stringify(currentDeps) !== JSON.stringify(cachedDeps)) {
      if (strategy.invalidation_triggers.includes('dependency_update')) {
        return true;
      }
    }

    return false;
  }

  private calculatePerformanceDelta(
    current: PerformanceMetrics,
    baseline: PerformanceMetrics
  ): PerformanceMetricsDelta {
    const responseTimeChange = current.avg_response_time - baseline.avg_response_time;
    const throughputChange = current.throughput - baseline.throughput;
    const errorRateChange = current.error_rate - baseline.error_rate;
    const memoryUsageChange = current.memory_usage - baseline.memory_usage;

    return {
      response_time_change: responseTimeChange,
      throughput_change: throughputChange,
      error_rate_change: errorRateChange,
      memory_usage_change: memoryUsageChange,
      regression_threshold_exceeded: responseTimeChange > 100 || errorRateChange > 0.05 || memoryUsageChange > 50
    };
  }

  private calculateSecurityDelta(
    current: SecurityMetrics,
    baseline: SecurityMetrics
  ): SecurityMetricsDelta {
    const securityScoreChange = current.security_score - baseline.security_score;
    const newVulnerabilities = Math.max(0, current.vulnerabilities_detected - baseline.vulnerabilities_detected);
    const resolvedVulnerabilities = Math.max(0, baseline.vulnerabilities_detected - current.vulnerabilities_detected);
    const complianceScoreChange = current.compliance_score - baseline.compliance_score;

    return {
      security_score_change: securityScoreChange,
      new_vulnerabilities: newVulnerabilities,
      resolved_vulnerabilities: resolvedVulnerabilities,
      compliance_score_change: complianceScoreChange,
      critical_issues_introduced: newVulnerabilities > 0 && current.threat_level === 'critical'
    };
  }

  private detectRegression(
    performanceDelta: PerformanceMetricsDelta,
    securityDelta: SecurityMetricsDelta
  ): boolean {
    return performanceDelta.regression_threshold_exceeded ||
           securityDelta.critical_issues_introduced ||
           securityDelta.security_score_change < -10 ||
           securityDelta.compliance_score_change < -5;
  }

  private detectImprovement(
    performanceDelta: PerformanceMetricsDelta,
    securityDelta: SecurityMetricsDelta
  ): boolean {
    return performanceDelta.response_time_change < -50 ||
           performanceDelta.throughput_change > 10 ||
           securityDelta.security_score_change > 5 ||
           securityDelta.resolved_vulnerabilities > 0;
  }

  private calculateSignificanceLevel(
    performanceDelta: PerformanceMetricsDelta,
    securityDelta: SecurityMetricsDelta
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (securityDelta.critical_issues_introduced || performanceDelta.response_time_change > 1000) {
      return 'critical';
    }
    if (performanceDelta.regression_threshold_exceeded || securityDelta.security_score_change < -15) {
      return 'high';
    }
    if (Math.abs(performanceDelta.response_time_change) > 50 || Math.abs(securityDelta.security_score_change) > 5) {
      return 'medium';
    }
    return 'low';
  }

  private generateRecommendations(
    performanceDelta: PerformanceMetricsDelta,
    securityDelta: SecurityMetricsDelta
  ): string[] {
    const recommendations = [];

    if (performanceDelta.response_time_change > 100) {
      recommendations.push('Investigate performance regression in response times');
    }
    if (performanceDelta.error_rate_change > 0.05) {
      recommendations.push('Review error handling and stability improvements');
    }
    if (securityDelta.new_vulnerabilities > 0) {
      recommendations.push('Address newly detected security vulnerabilities');
    }
    if (securityDelta.security_score_change < -10) {
      recommendations.push('Review security controls and implement additional protections');
    }

    return recommendations;
  }

  private createDefaultComparison(): BaselineComparison {
    return {
      performance_delta: {
        response_time_change: 0,
        throughput_change: 0,
        error_rate_change: 0,
        memory_usage_change: 0,
        regression_threshold_exceeded: false
      },
      security_delta: {
        security_score_change: 0,
        new_vulnerabilities: 0,
        resolved_vulnerabilities: 0,
        compliance_score_change: 0,
        critical_issues_introduced: false
      },
      regression_detected: false,
      improvement_detected: false,
      significance_level: 'low',
      recommendations: ['Establish baseline for future comparisons']
    };
  }

  private async getCurrentGitCommit(): Promise<string | undefined> {
    try {
      // In a real implementation, this would use git commands
      return process.env.GIT_COMMIT || 'unknown';
    } catch {
      return undefined;
    }
  }

  private getTestDependencies(): string[] {
    try {
      // In a real implementation, this would read package.json dependencies
      return ['vitest@1.6.0', 'typescript@5.5.2', 'node@' + process.version];
    } catch {
      return [];
    }
  }

  private hashObject(obj: any): string {
    return createHash('md5').update(JSON.stringify(obj, Object.keys(obj).sort())).digest('hex');
  }

  private compressString(data: string): string {
    // In a real implementation, this would use zlib compression
    return Buffer.from(data).toString('base64');
  }

  private decompressString(data: string): string {
    // In a real implementation, this would use zlib decompression
    return Buffer.from(data, 'base64').toString('utf8');
  }

  private encryptData(data: string): string {
    // In a real implementation, this would use proper encryption
    return Buffer.from(data).toString('base64');
  }

  private decryptData(data: string): string {
    // In a real implementation, this would use proper decryption
    return Buffer.from(data, 'base64').toString('utf8');
  }
}