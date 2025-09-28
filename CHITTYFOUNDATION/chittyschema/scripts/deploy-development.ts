#!/usr/bin/env tsx
/**
 * ChittyOS Development Deployment
 *
 * Sets up local development environment with mock services
 * and pipeline enforcement in monitor mode
 */


async function deployDevelopment() {
  console.log('🚀 Setting up ChittyOS Development Environment');

  // Set development environment variables
  const devEnv = {
    NODE_ENV: 'development',
    CHITTY_PIPELINE_URL: 'http://localhost:3001',
    CHITTY_ID_SERVICE_URL: 'http://localhost:3002',
    CHITTY_TRUST_SERVICE_URL: 'http://localhost:3003',
    CHITTY_AUTH_SERVICE_URL: 'http://localhost:3004',
    CHITTY_DATA_SERVICE_URL: 'http://localhost:3005',
    CHITTY_MONITORING_URL: 'http://localhost:3006',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/chittychain_dev',
    ENFORCEMENT_LEVEL: 'monitor',
    ROLLOUT_STRATEGY: 'immediate'
  };

  // Set environment variables
  for (const [key, value] of Object.entries(devEnv)) {
    process.env[key] = value;
  }

  console.log('✅ Development environment configured');

  // Deploy with development settings
  try {
    const { PipelineEnforcementDeployment } = await import('./deploy-pipeline-enforcement.js');

    const deployment = new PipelineEnforcementDeployment({
      environment: 'development',
      enforcementLevel: 'monitor',
      rolloutStrategy: 'immediate',
      services: ['notion-extension'],
      validationChecks: false
    });

    await deployment.deploy();
    console.log('✅ Development deployment completed');

  } catch (error) {
    console.warn('⚠️ Full deployment skipped in development mode:', error);
    console.log('✅ Basic development setup completed');
  }

  // Test Mac native Notion extension
  console.log('🧪 Testing Mac native Notion extension...');

  try {
    const { createValidatedExtension } = await import('../src/platforms/macos/extensions/notion/index.js');

    // Mock environment for testing
    process.env.NOTION_API_KEY = 'mock_api_key_for_development';
    process.env.CHITTY_PIPELINE_URL = 'http://localhost:3001';

    const extension = createValidatedExtension();
    if (extension) {
      console.log('✅ Mac native Notion extension validation passed');
    } else {
      console.log('⚠️ Mac native Notion extension requires environment setup');
    }
  } catch (error) {
    console.warn('⚠️ Extension test skipped:', error);
  }

  console.log('\n🎉 ChittyOS Development Environment Ready!');
  console.log('📋 Next steps:');
  console.log('  1. Copy .env.example to .env and configure');
  console.log('  2. Run: npm run macos:notion:init');
  console.log('  3. Run: npm run dev');
}

// Run deployment
deployDevelopment().catch(console.error);