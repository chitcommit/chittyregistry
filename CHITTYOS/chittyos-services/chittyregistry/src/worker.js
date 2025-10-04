// ChittyRegistry Cloudflare Worker

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Route handling
    const path = url.pathname.replace('/registry', '');

    // Health check endpoint
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'HEALTHY',
        service: 'chittyregistry',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        deployment: 'cloudflare-worker',
        stats: {
          totalServices: 35,
          healthyServices: await getHealthyServicesCount(env),
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Service discovery endpoint
    if (path === '/api/v1/services' || path === '/api/v1/discover') {
      const services = await getCanonicalServices(env);
      return new Response(JSON.stringify({
        success: true,
        count: services.length,
        services: services
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get specific service
    const serviceMatch = path.match(/^\/api\/v1\/services\/(.+)$/);
    if (serviceMatch) {
      const serviceName = serviceMatch[1];
      const service = await getService(env, serviceName);

      if (!service) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Service not found'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        service: service
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Registry info endpoint
    if (path === '/info') {
      return new Response(JSON.stringify({
        service: 'chittyregistry',
        version: '1.0.0',
        description: 'ChittyOS Service Registry and Discovery',
        capabilities: [
          'service-discovery',
          'health-monitoring',
          'service-registry'
        ],
        endpoints: {
          discovery: '/api/v1/discover',
          services: '/api/v1/services',
          health: '/health'
        },
        deployment: 'cloudflare-worker',
        ecosystem: 'ChittyOS'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Default 404
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      path: url.pathname
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};

// Get canonical ChittyOS services
async function getCanonicalServices(env) {
  return [
    // Core Infrastructure
    { serviceName: 'chittyschema', displayName: 'ChittySchema', baseUrl: 'https://schema.chitty.cc', category: 'core-infrastructure' },
    { serviceName: 'chittyid', displayName: 'ChittyID', baseUrl: 'https://id.chitty.cc', category: 'core-infrastructure' },
    { serviceName: 'chittyauth', displayName: 'ChittyAuth', baseUrl: 'https://auth.chitty.cc', category: 'core-infrastructure' },
    { serviceName: 'chittyregistry', displayName: 'ChittyRegistry', baseUrl: 'https://registry.chitty.cc', category: 'core-infrastructure' },
    { serviceName: 'chittycanon', displayName: 'ChittyCanon', baseUrl: 'https://canon.chitty.cc', category: 'core-infrastructure' },
    { serviceName: 'chittybeacon', displayName: 'ChittyBeacon', baseUrl: 'https://beacon.chitty.cc', category: 'core-infrastructure' },

    // Security & Verification
    { serviceName: 'chittyverify', displayName: 'ChittyVerify', baseUrl: 'https://verify.chitty.cc', category: 'security-verification' },
    { serviceName: 'chittytrust', displayName: 'ChittyTrust', baseUrl: 'https://trust.chitty.cc', category: 'security-verification' },
    { serviceName: 'chittyentry', displayName: 'ChittyEntry', baseUrl: 'https://entry.chitty.cc', category: 'security-verification' },
    { serviceName: 'chittycertify', displayName: 'ChittyCertify', baseUrl: 'https://certify.chitty.cc', category: 'security-verification' },

    // Blockchain
    { serviceName: 'chittychain', displayName: 'ChittyChain', baseUrl: 'https://chain.chitty.cc', category: 'blockchain-infrastructure' },
    { serviceName: 'chittyoracle', displayName: 'ChittyOracle', baseUrl: 'https://oracle.chitty.cc', category: 'blockchain-infrastructure' },
    { serviceName: 'chittyexplorer', displayName: 'ChittyExplorer', baseUrl: 'https://explorer.chitty.cc', category: 'blockchain-infrastructure' },
    { serviceName: 'chittystake', displayName: 'ChittyStake', baseUrl: 'https://stake.chitty.cc', category: 'blockchain-infrastructure' },
    { serviceName: 'chittyledger', displayName: 'ChittyLedger', baseUrl: 'https://ledger.chitty.cc', category: 'blockchain-infrastructure' },

    // AI & Intelligence
    { serviceName: 'chittymcp', displayName: 'ChittyMCP', baseUrl: 'https://mcp.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittyrouter', displayName: 'ChittyRouter', baseUrl: 'https://router.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittyforce', displayName: 'ChittyForce', baseUrl: 'https://force.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittyintel', displayName: 'ChittyIntel', baseUrl: 'https://intel.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittyinsight', displayName: 'ChittyInsight', baseUrl: 'https://insight.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittydna', displayName: 'ChittyDNA', baseUrl: 'https://dna.chitty.cc', category: 'ai-intelligence' },
    { serviceName: 'chittyapi', displayName: 'ChittyAPI', baseUrl: 'https://api.chitty.cc', category: 'ai-intelligence' },

    // Document & Evidence
    { serviceName: 'chittychronicle', displayName: 'ChittyChronicle', baseUrl: 'https://chronicle.chitty.cc', category: 'document-evidence' },
    { serviceName: 'chittytrace', displayName: 'ChittyTrace', baseUrl: 'https://trace.chitty.cc', category: 'document-evidence' },
    { serviceName: 'chittyassets', displayName: 'ChittyAssets', baseUrl: 'https://assets.chitty.cc', category: 'document-evidence' },

    // Business Operations
    { serviceName: 'chittychat', displayName: 'ChittyChat', baseUrl: 'https://chat.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittyfinance', displayName: 'ChittyFinance', baseUrl: 'https://finance.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittyflow', displayName: 'ChittyFlow', baseUrl: 'https://flow.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittyresolution', displayName: 'ChittyResolution', baseUrl: 'https://resolution.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittycredit', displayName: 'ChittyCredit', baseUrl: 'https://credit.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittyforge', displayName: 'ChittyForge', baseUrl: 'https://forge.chitty.cc', category: 'business-operations' },
    { serviceName: 'chittybrand', displayName: 'ChittyBrand', baseUrl: 'https://brand.chitty.cc', category: 'business-operations' },

    // Foundation & Governance
    { serviceName: 'chittymonitor', displayName: 'ChittyMonitor', baseUrl: 'https://monitor.chitty.cc', category: 'foundation-governance' },
    { serviceName: 'chittyscore', displayName: 'ChittyScore', baseUrl: 'https://score.chitty.cc', category: 'foundation-governance' },
    { serviceName: 'chittypay', displayName: 'ChittyPay', baseUrl: 'https://pay.chitty.cc', category: 'foundation-governance' }
  ];
}

// Get specific service
async function getService(env, serviceName) {
  const services = await getCanonicalServices(env);
  return services.find(s => s.serviceName === serviceName);
}

// Get count of healthy services (simplified for Worker)
async function getHealthyServicesCount(env) {
  // In production, this would check actual health status
  // For now, return a reasonable default
  return 12;
}