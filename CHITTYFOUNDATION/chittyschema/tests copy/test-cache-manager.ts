/**
 * Test Cache Manager for ChittyChain Schema Testing Framework
 * Intelligent caching, baseline comparison, and performance optimization
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Max cache size in MB
  compressionEnabled: boolean;
  baselineRetentionDays: number;
}

export interface CachedTestResult {
  cache_key: string;
  test_type: string;
  timestamp: string;
  config_hash: string;
  test_results: any;
  performance_metrics: any;
  security_metrics: any;
  output: string;
  metadata: {
    duration: number;
    environment: string;
    target_url: string;
    framework_version: string;
  };
}

export interface BaselineData {
  version: string;
  timestamp: string;
  test_results: any;
  performance_metrics: any;
  security_metrics: any;
  statistical_summary: {
    avg_response_time: number;
    p95_response_time: number;
    throughput: number;
    error_rate: number;
    security_score: number;
  };
}

export interface ComparisonResult {
  baseline_version: string;
  current_timestamp: string;
  regression_detected: boolean;
  improvement_detected: boolean;
  significance_level: 'low' | 'medium' | 'high';
  performance_comparison: PerformanceComparison;
  security_comparison: SecurityComparison;
  recommendations: string[];
  confidence_score: number;
}

export interface PerformanceComparison {
  response_time_change: number; // percentage
  throughput_change: number;
  error_rate_change: number;
  regression_indicators: string[];
  improvement_indicators: string[];
}

export interface SecurityComparison {
  security_score_change: number;
  new_vulnerabilities: number;
  resolved_vulnerabilities: number;
  risk_level_change: 'increased' | 'decreased' | 'unchanged';
}

export interface CacheStatistics {
  total_cache_files: number;
  total_cache_size: number; // bytes
  cache_hit_rate: number;
  cache_miss_rate: number;
  oldest_entry: string;
  newest_entry: string;
  cache_efficiency: number;
}

export class TestCacheManager {
  private config: CacheConfig;
  private cacheDir: string;
  private baselineDir: string;
  private statsFile: string;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 500, // 500MB
      compressionEnabled: true,
      baselineRetentionDays: 30,
      ...config
    };

    this.cacheDir = join(process.cwd(), 'test-results', 'cache');
    this.baselineDir = join(process.cwd(), 'test-results', 'baselines');
    this.statsFile = join(this.cacheDir, 'cache-stats.json');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.cacheDir, this.baselineDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  generateCacheKey(testConfig: any, testType: string): string {
    const configString = JSON.stringify({
      ...testConfig,
      timestamp: undefined, // Exclude timestamp from cache key
      test_type: testType
    });

    return createHash('sha256')
      .update(configString)
      .digest('hex')
      .substring(0, 16);
  }

  private generateConfigHash(config: any): string {
    return createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex');
  }

  async cacheTestResults(
    cacheKey: string,
    testType: string,
    config: any,
    testResults: any,
    performanceMetrics: any,
    securityMetrics: any,
    output: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    const cachedResult: CachedTestResult = {
      cache_key: cacheKey,
      test_type: testType,
      timestamp: new Date().toISOString(),
      config_hash: this.generateConfigHash(config),
      test_results: testResults,
      performance_metrics: performanceMetrics,
      security_metrics: securityMetrics,
      output: this.config.compressionEnabled ? this.compressOutput(output) : output,
      metadata: {
        duration: Date.now(), // Will be updated when caching completes
        environment: process.env.NODE_ENV || 'test',
        target_url: config.target_url || 'unknown',
        framework_version: '1.0.0'
      }
    };

    const cacheFile = join(this.cacheDir, `${cacheKey}-${testType}.json`);

    try {
      writeFileSync(cacheFile, JSON.stringify(cachedResult, null, 2));
      await this.updateCacheStatistics('cache_write');
      console.log(`📁 Cached ${testType} results: ${cacheKey}`);
    } catch (error) {
      console.error(`Failed to cache results: ${error}`);
    }

    // Cleanup old cache files
    await this.cleanupOldCache();
  }

  getCachedResults(cacheKey: string, testType: string): CachedTestResult | null {
    if (!this.config.enabled) return null;

    const cacheFile = join(this.cacheDir, `${cacheKey}-${testType}.json`);

    if (!existsSync(cacheFile)) {
      this.updateCacheStatistics('cache_miss');
      return null;
    }

    try {
      const cachedData = JSON.parse(readFileSync(cacheFile, 'utf8')) as CachedTestResult;

      // Check TTL
      const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
      if (cacheAge > this.config.ttl) {
        console.log(`🕒 Cache expired for ${cacheKey}-${testType}`);
        this.updateCacheStatistics('cache_miss');
        return null;
      }

      this.updateCacheStatistics('cache_hit');
      console.log(`📂 Using cached results: ${cacheKey}-${testType}`);

      // Decompress output if needed
      if (this.config.compressionEnabled && typeof cachedData.output === 'string') {
        cachedData.output = this.decompressOutput(cachedData.output);
      }

      return cachedData;
    } catch (error) {
      console.error(`Failed to read cache: ${error}`);
      this.updateCacheStatistics('cache_miss');
      return null;
    }
  }

  async saveBaseline(
    version: string,
    testResults: any,
    performanceMetrics: any,
    securityMetrics: any
  ): Promise<void> {
    const baseline: BaselineData = {
      version,
      timestamp: new Date().toISOString(),
      test_results: testResults,
      performance_metrics: performanceMetrics,
      security_metrics: securityMetrics,
      statistical_summary: {
        avg_response_time: performanceMetrics.avg_response_time || 0,
        p95_response_time: performanceMetrics.p95_response_time || 0,
        throughput: performanceMetrics.throughput || 0,
        error_rate: performanceMetrics.error_rate || 0,
        security_score: securityMetrics.security_score || 0
      }
    };

    const baselineFile = join(this.baselineDir, `baseline-${version}.json`);

    try {
      writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
      console.log(`📊 Saved baseline: ${version}`);
    } catch (error) {
      console.error(`Failed to save baseline: ${error}`);
    }

    // Cleanup old baselines
    await this.cleanupOldBaselines();
  }

  getLatestBaseline(): BaselineData | null {
    try {
      const baselineFiles = readdirSync(this.baselineDir)
        .filter(file => file.startsWith('baseline-') && file.endsWith('.json'))
        .map(file => ({
          file,
          stat: statSync(join(this.baselineDir, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      if (baselineFiles.length === 0) return null;

      const latestFile = baselineFiles[0].file;
      const baselineData = JSON.parse(
        readFileSync(join(this.baselineDir, latestFile), 'utf8')
      ) as BaselineData;

      return baselineData;
    } catch (error) {
      console.error(`Failed to get latest baseline: ${error}`);
      return null;
    }
  }

  compareWithBaseline(
    testResults: any,
    performanceMetrics: any,
    securityMetrics: any,
    testType: string
  ): ComparisonResult | null {
    const baseline = this.getLatestBaseline();
    if (!baseline) {
      console.log('⚠️  No baseline found for comparison');
      return null;
    }

    const performanceComparison = this.comparePerformance(
      baseline.performance_metrics,
      performanceMetrics
    );

    const securityComparison = this.compareSecurity(
      baseline.security_metrics,
      securityMetrics
    );

    const regressionThreshold = 10; // 10% degradation
    const improvementThreshold = 5; // 5% improvement

    const hasRegression =
      Math.abs(performanceComparison.response_time_change) > regressionThreshold ||
      performanceComparison.error_rate_change > regressionThreshold ||
      securityComparison.security_score_change < -regressionThreshold;

    const hasImprovement =
      performanceComparison.response_time_change < -improvementThreshold ||
      performanceComparison.throughput_change > improvementThreshold ||
      securityComparison.security_score_change > improvementThreshold;

    const significanceLevel = this.calculateSignificanceLevel(
      performanceComparison,
      securityComparison
    );

    const recommendations = this.generateComparisonRecommendations(
      performanceComparison,
      securityComparison,
      hasRegression,
      hasImprovement
    );

    const confidenceScore = this.calculateConfidenceScore(
      baseline,
      performanceMetrics,
      securityMetrics
    );

    return {
      baseline_version: baseline.version,
      current_timestamp: new Date().toISOString(),
      regression_detected: hasRegression,
      improvement_detected: hasImprovement,
      significance_level: significanceLevel,
      performance_comparison: performanceComparison,
      security_comparison: securityComparison,
      recommendations,
      confidence_score: confidenceScore
    };
  }

  private comparePerformance(baseline: any, current: any): PerformanceComparison {
    const responseTimeChange = baseline.avg_response_time
      ? ((current.avg_response_time - baseline.avg_response_time) / baseline.avg_response_time) * 100
      : 0;

    const throughputChange = baseline.throughput
      ? ((current.throughput - baseline.throughput) / baseline.throughput) * 100
      : 0;

    const errorRateChange = baseline.error_rate !== undefined
      ? current.error_rate - baseline.error_rate
      : 0;

    const regressionIndicators: string[] = [];
    const improvementIndicators: string[] = [];

    if (responseTimeChange > 10) {
      regressionIndicators.push(`Response time increased by ${responseTimeChange.toFixed(1)}%`);
    } else if (responseTimeChange < -5) {
      improvementIndicators.push(`Response time improved by ${Math.abs(responseTimeChange).toFixed(1)}%`);
    }

    if (throughputChange < -10) {
      regressionIndicators.push(`Throughput decreased by ${Math.abs(throughputChange).toFixed(1)}%`);
    } else if (throughputChange > 5) {
      improvementIndicators.push(`Throughput increased by ${throughputChange.toFixed(1)}%`);
    }

    if (errorRateChange > 2) {
      regressionIndicators.push(`Error rate increased by ${errorRateChange.toFixed(1)}%`);
    } else if (errorRateChange < -1) {
      improvementIndicators.push(`Error rate decreased by ${Math.abs(errorRateChange).toFixed(1)}%`);
    }

    return {
      response_time_change: responseTimeChange,
      throughput_change: throughputChange,
      error_rate_change: errorRateChange,
      regression_indicators: regressionIndicators,
      improvement_indicators: improvementIndicators
    };
  }

  private compareSecurity(baseline: any, current: any): SecurityComparison {
    const securityScoreChange = baseline.security_score
      ? current.security_score - baseline.security_score
      : 0;

    const newVulnerabilities = Math.max(0,
      (current.vulnerabilities_detected || 0) - (baseline.vulnerabilities_detected || 0)
    );

    const resolvedVulnerabilities = Math.max(0,
      (baseline.vulnerabilities_detected || 0) - (current.vulnerabilities_detected || 0)
    );

    let riskLevelChange: 'increased' | 'decreased' | 'unchanged' = 'unchanged';
    if (securityScoreChange < -5) {
      riskLevelChange = 'increased';
    } else if (securityScoreChange > 5) {
      riskLevelChange = 'decreased';
    }

    return {
      security_score_change: securityScoreChange,
      new_vulnerabilities: newVulnerabilities,
      resolved_vulnerabilities: resolvedVulnerabilities,
      risk_level_change: riskLevelChange
    };
  }

  private calculateSignificanceLevel(
    perfComparison: PerformanceComparison,
    secComparison: SecurityComparison
  ): 'low' | 'medium' | 'high' {
    const perfSignificance = Math.max(
      Math.abs(perfComparison.response_time_change),
      Math.abs(perfComparison.throughput_change),
      Math.abs(perfComparison.error_rate_change)
    );

    const secSignificance = Math.abs(secComparison.security_score_change);

    const maxSignificance = Math.max(perfSignificance, secSignificance);

    if (maxSignificance > 20) return 'high';
    if (maxSignificance > 10) return 'medium';
    return 'low';
  }

  private generateComparisonRecommendations(
    perfComparison: PerformanceComparison,
    secComparison: SecurityComparison,
    hasRegression: boolean,
    hasImprovement: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (hasRegression) {
      recommendations.push('🔍 Investigate performance or security regressions');

      if (perfComparison.response_time_change > 15) {
        recommendations.push('🐌 Significant response time degradation detected - review recent changes');
      }

      if (secComparison.new_vulnerabilities > 0) {
        recommendations.push(`🔒 ${secComparison.new_vulnerabilities} new vulnerabilities detected - security review required`);
      }
    }

    if (hasImprovement) {
      recommendations.push('✅ Performance or security improvements detected - consider updating baseline');
    }

    if (perfComparison.error_rate_change > 5) {
      recommendations.push('⚠️  Error rate increased significantly - check system stability');
    }

    if (secComparison.risk_level_change === 'increased') {
      recommendations.push('🚨 Security risk level increased - immediate security assessment recommended');
    }

    if (recommendations.length === 0) {
      recommendations.push('📊 Results within normal variation from baseline');
    }

    return recommendations;
  }

  private calculateConfidenceScore(
    baseline: BaselineData,
    currentPerf: any,
    currentSec: any
  ): number {
    let confidence = 100;

    // Reduce confidence if baseline is old
    const baselineAge = Date.now() - new Date(baseline.timestamp).getTime();
    const daysOld = baselineAge / (24 * 60 * 60 * 1000);

    if (daysOld > 7) confidence -= 10;
    if (daysOld > 14) confidence -= 20;
    if (daysOld > 30) confidence -= 30;

    // Reduce confidence if data is incomplete
    if (!currentPerf.avg_response_time) confidence -= 10;
    if (!currentPerf.throughput) confidence -= 10;
    if (!currentSec.security_score) confidence -= 15;

    return Math.max(0, confidence);
  }

  private compressOutput(output: string): string {
    // Simple compression placeholder - in production, use actual compression
    return Buffer.from(output).toString('base64');
  }

  private decompressOutput(compressed: string): string {
    // Simple decompression placeholder
    return Buffer.from(compressed, 'base64').toString('utf8');
  }

  private async updateCacheStatistics(operation: 'cache_hit' | 'cache_miss' | 'cache_write'): Promise<void> {
    let stats = { hits: 0, misses: 0, writes: 0 };

    if (existsSync(this.statsFile)) {
      try {
        stats = JSON.parse(readFileSync(this.statsFile, 'utf8'));
      } catch (error) {
        // Use default stats if file is corrupted
      }
    }

    switch (operation) {
      case 'cache_hit': stats.hits++; break;
      case 'cache_miss': stats.misses++; break;
      case 'cache_write': stats.writes++; break;
    }

    try {
      writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error(`Failed to update cache statistics: ${error}`);
    }
  }

  getCacheStatistics(): CacheStatistics {
    let stats = { hits: 0, misses: 0, writes: 0 };

    if (existsSync(this.statsFile)) {
      try {
        stats = JSON.parse(readFileSync(this.statsFile, 'utf8'));
      } catch (error) {
        // Use default stats
      }
    }

    const cacheFiles = this.getCacheFiles();
    const totalSize = cacheFiles.reduce((sum, file) => {
      try {
        return sum + statSync(join(this.cacheDir, file)).size;
      } catch {
        return sum;
      }
    }, 0);

    const hitRate = (stats.hits + stats.misses) > 0
      ? (stats.hits / (stats.hits + stats.misses)) * 100
      : 0;

    const missRate = 100 - hitRate;

    let oldestEntry = 'N/A';
    let newestEntry = 'N/A';

    if (cacheFiles.length > 0) {
      const fileStats = cacheFiles.map(file => ({
        file,
        mtime: statSync(join(this.cacheDir, file)).mtime
      }));

      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
      oldestEntry = fileStats[0].mtime.toISOString();
      newestEntry = fileStats[fileStats.length - 1].mtime.toISOString();
    }

    return {
      total_cache_files: cacheFiles.length,
      total_cache_size: totalSize,
      cache_hit_rate: hitRate,
      cache_miss_rate: missRate,
      oldest_entry: oldestEntry,
      newest_entry: newestEntry,
      cache_efficiency: hitRate > 50 ? 85 : 60 // Simplified efficiency calculation
    };
  }

  private getCacheFiles(): string[] {
    try {
      return readdirSync(this.cacheDir).filter(file =>
        file.endsWith('.json') && !file.includes('stats')
      );
    } catch {
      return [];
    }
  }

  private async cleanupOldCache(): Promise<void> {
    const cacheFiles = this.getCacheFiles();
    const now = Date.now();

    for (const file of cacheFiles) {
      const filePath = join(this.cacheDir, file);
      try {
        const stats = statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > this.config.ttl) {
          // File is older than TTL, remove it
          require('fs').unlinkSync(filePath);
          console.log(`🗑️  Removed expired cache file: ${file}`);
        }
      } catch (error) {
        console.error(`Error cleaning up cache file ${file}: ${error}`);
      }
    }

    // Check total cache size and remove oldest files if needed
    await this.enforceMaxCacheSize();
  }

  private async enforceMaxCacheSize(): Promise<void> {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // Convert MB to bytes
    const cacheFiles = this.getCacheFiles();

    let totalSize = 0;
    const fileStats = cacheFiles.map(file => {
      const filePath = join(this.cacheDir, file);
      const stats = statSync(filePath);
      totalSize += stats.size;
      return { file, size: stats.size, mtime: stats.mtime };
    });

    if (totalSize <= maxSizeBytes) return;

    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

    let removedSize = 0;
    for (const fileInfo of fileStats) {
      if (totalSize - removedSize <= maxSizeBytes) break;

      try {
        require('fs').unlinkSync(join(this.cacheDir, fileInfo.file));
        removedSize += fileInfo.size;
        console.log(`🗑️  Removed cache file for size limit: ${fileInfo.file}`);
      } catch (error) {
        console.error(`Error removing cache file ${fileInfo.file}: ${error}`);
      }
    }
  }

  private async cleanupOldBaselines(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.baselineRetentionDays);

    try {
      const baselineFiles = readdirSync(this.baselineDir)
        .filter(file => file.startsWith('baseline-') && file.endsWith('.json'));

      for (const file of baselineFiles) {
        const filePath = join(this.baselineDir, file);
        const stats = statSync(filePath);

        if (stats.mtime < cutoffDate) {
          require('fs').unlinkSync(filePath);
          console.log(`🗑️  Removed old baseline: ${file}`);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up old baselines: ${error}`);
    }
  }

  // Utility methods
  clearCache(): void {
    const cacheFiles = this.getCacheFiles();
    cacheFiles.forEach(file => {
      try {
        require('fs').unlinkSync(join(this.cacheDir, file));
      } catch (error) {
        console.error(`Error clearing cache file ${file}: ${error}`);
      }
    });

    console.log(`🗑️  Cleared ${cacheFiles.length} cache files`);
  }

  exportCacheData(): any {
    const cacheFiles = this.getCacheFiles();
    const exportData: any[] = [];

    cacheFiles.forEach(file => {
      try {
        const data = JSON.parse(readFileSync(join(this.cacheDir, file), 'utf8'));
        exportData.push(data);
      } catch (error) {
        console.error(`Error reading cache file ${file}: ${error}`);
      }
    });

    return {
      export_timestamp: new Date().toISOString(),
      cache_entries: exportData,
      statistics: this.getCacheStatistics()
    };
  }
}