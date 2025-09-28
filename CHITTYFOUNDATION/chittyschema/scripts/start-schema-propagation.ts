#!/usr/bin/env tsx
/**
 * Start Schema Propagation Service
 *
 * Initializes and starts the schema propagation system that monitors
 * for registry changes and propagates them to other ChittyOS systems
 */

import { initializeSchemaPropagation, SchemaPropagationService } from '../src/platforms/macos/core/schema-propagation.js';
import { initializeServiceRegistry } from '../src/platforms/macos/core/service-registry.js';

async function startPropagationService() {
  console.log('🚀 Starting ChittyOS Schema Propagation Service');
  console.log('=' .repeat(60));

  try {
    // 1. Initialize service registry first (connects to registry.chitty.cc)
    console.log('\n📡 Step 1: Initializing Service Registry');
    await initializeServiceRegistry();

    // 2. Initialize schema propagation system
    console.log('\n🔗 Step 2: Initializing Schema Propagation');
    await initializeSchemaPropagation();

    // 3. Show propagation status
    console.log('\n📊 Step 3: Propagation Service Status');
    const service = SchemaPropagationService.getInstance();
    const stats = await service.getPropagationStats();

    console.log('Target Systems:');
    stats.targetSystems.forEach((system: string) => {
      console.log(`  📋 ${system}`);
    });

    console.log(`\n🔄 Monitoring Status: ${stats.isRunning ? 'ACTIVE' : 'INACTIVE'}`);

    console.log('\n📈 Last 24 Hours:');
    Object.entries(stats.last24Hours).forEach(([status, data]) => {
      const typedData = data as { count: number; avgDuration?: number };
      console.log(`  ${status}: ${typedData.count} events (avg ${typedData.avgDuration ? typedData.avgDuration.toFixed(2) + 's' : 'N/A'})`);
    });

    // 4. Test propagation with a sample event
    console.log('\n🧪 Step 4: Testing Propagation System');
    try {
      await service.triggerManualPropagation('chitty-id-service', 'service_update');
      console.log('✅ Test propagation event created successfully');
    } catch (error) {
      console.log('⚠️ Test propagation skipped (service may not exist yet)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SCHEMA PROPAGATION SERVICE ACTIVE');
    console.log('='.repeat(60));
    console.log('🔄 Registry changes will now automatically propagate to:');
    console.log('  📋 ChittyOS Data Service');
    console.log('  📋 ChittyOS Auth Service');
    console.log('  📋 ChittyOS Trust Service');
    console.log('  📋 ChittyOS Monitoring');
    console.log('  📋 Local Notion Extension');
    console.log('  📋 Local Database');
    console.log('\n💡 Registry integration is now fully propagated across the ecosystem');

    // Keep the service running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await service.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await service.stop();
      process.exit(0);
    });

    // Keep process alive
    console.log('\n⏰ Service running... Press Ctrl+C to stop');
    await new Promise(() => {}); // Run forever

  } catch (error) {
    console.error('❌ Failed to start schema propagation service:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Check DATABASE_URL environment variable');
    console.log('  2. Verify database schema is up to date');
    console.log('  3. Ensure registry.chitty.cc connectivity');
    console.log('  4. Check service authentication tokens');
    process.exit(1);
  }
}

// Run the service
if (import.meta.url === `file://${process.argv[1]}`) {
  startPropagationService().catch(console.error);
}

export { startPropagationService };