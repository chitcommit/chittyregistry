-- ChittyOS Registry Database Schema
-- Enhanced with schema authority integration

-- Services table with schema validation
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    health_endpoint VARCHAR(500),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    type VARCHAR(50) NOT NULL DEFAULT 'integration' CHECK (type IN ('core', 'extension', 'integration')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'deprecated')),
    health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),

    -- JSON columns for complex data
    endpoints JSONB,
    dependencies JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    schema_validation JSONB,

    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE,

    -- Indexes for performance
    CONSTRAINT unique_name UNIQUE(name)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_health ON services(health_status);
CREATE INDEX IF NOT EXISTS idx_services_registered ON services(registered_at);

-- Service health history for monitoring
CREATE TABLE IF NOT EXISTS service_health_history (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(255) REFERENCES services(id) ON DELETE CASCADE,
    health_status VARCHAR(50) NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_history_service ON service_health_history(service_id);
CREATE INDEX IF NOT EXISTS idx_health_history_time ON service_health_history(checked_at);

-- Schema authority cache
CREATE TABLE IF NOT EXISTS schema_cache (
    schema_type VARCHAR(255) PRIMARY KEY,
    schema_content JSONB NOT NULL,
    version VARCHAR(50) NOT NULL,
    authority VARCHAR(255) NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Canonical services from authority
CREATE TABLE IF NOT EXISTS canonical_services (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    schema_type VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    authority VARCHAR(255) NOT NULL,
    endpoints JSONB NOT NULL,
    dependencies JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registry events log
CREATE TABLE IF NOT EXISTS registry_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    service_id VARCHAR(255),
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON registry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_service ON registry_events(service_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON registry_events(created_at);

-- Insert core ChittyOS services
INSERT INTO services (id, name, base_url, type, version, features, endpoints) VALUES
('chittyregistry', 'ChittyRegistry', 'https://registry.chitty.cc', 'core', '1.0.0',
 '["service-discovery", "health-monitoring", "schema-validation"]',
 '{"primary": "https://registry.chitty.cc", "health": "https://registry.chitty.cc/health", "discovery": "https://registry.chitty.cc/services"}'),

('chittymcp', 'ChittyMCP', 'https://mcp.chitty.cc', 'core', '1.0.0',
 '["ai-orchestration", "tool-execution", "cloudflare-integration"]',
 '{"primary": "https://mcp.chitty.cc", "health": "https://mcp.chitty.cc/health", "discovery": "https://mcp.chitty.cc/tools"}'),

('chittybridge', 'ChittyBridge', 'https://bridge.chitty.cc', 'core', '1.0.0',
 '["session-sync", "vector-clocks", "distributed-context"]',
 '{"primary": "https://bridge.chitty.cc", "health": "https://bridge.chitty.cc/health", "discovery": "https://bridge.chitty.cc/sessions"}'),

('chittyassets', 'ChittyAssets', 'https://assets.chitty.cc', 'core', '1.0.0',
 '["mcp-authorization", "oauth21", "trust-levels"]',
 '{"primary": "https://assets.chitty.cc", "health": "https://assets.chitty.cc/health", "discovery": "https://assets.chitty.cc/mcp"}')

ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    features = EXCLUDED.features,
    endpoints = EXCLUDED.endpoints;

-- Insert canonical services
INSERT INTO canonical_services (id, name, subdomain, type, schema_type, version, authority, endpoints, dependencies, features) VALUES
('chittyregistry', 'ChittyRegistry', 'registry.chitty.cc', 'core', 'registry-v1', '1.0.0', 'schema.chitty.cc',
 '{"primary": "https://registry.chitty.cc", "health": "https://registry.chitty.cc/health", "discovery": "https://registry.chitty.cc/services"}',
 '[]', '["service-discovery", "health-monitoring", "ai-orchestration"]'),

('chittymcp', 'ChittyMCP', 'mcp.chitty.cc', 'core', 'mcp-agent-v1', '1.0.0', 'schema.chitty.cc',
 '{"primary": "https://mcp.chitty.cc", "health": "https://mcp.chitty.cc/health", "discovery": "https://mcp.chitty.cc/tools"}',
 '["chittyregistry"]', '["ai-orchestration", "tool-execution", "cloudflare-integration"]'),

('chittybridge', 'ChittyBridge', 'bridge.chitty.cc', 'core', 'context-bridge-v1', '1.0.0', 'schema.chitty.cc',
 '{"primary": "https://bridge.chitty.cc", "health": "https://bridge.chitty.cc/health", "discovery": "https://bridge.chitty.cc/sessions"}',
 '["chittyregistry"]', '["session-sync", "vector-clocks", "distributed-context"]'),

('chittyassets', 'ChittyAssets', 'assets.chitty.cc', 'core', 'asset-management-v1', '1.0.0', 'schema.chitty.cc',
 '{"primary": "https://assets.chitty.cc", "health": "https://assets.chitty.cc/health", "discovery": "https://assets.chitty.cc/mcp"}',
 '["chittyregistry"]', '["mcp-authorization", "oauth21", "trust-levels"]')

ON CONFLICT (id) DO UPDATE SET
    synced_at = NOW(),
    version = EXCLUDED.version,
    endpoints = EXCLUDED.endpoints,
    dependencies = EXCLUDED.dependencies,
    features = EXCLUDED.features;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();