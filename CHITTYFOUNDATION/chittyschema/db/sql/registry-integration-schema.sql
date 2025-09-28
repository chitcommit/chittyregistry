-- Registry Integration Schema Update
-- Adds tables to track central registry services and propagate to other systems

-- Service Registry Table
-- Stores services discovered from registry.chitty.cc
CREATE TABLE IF NOT EXISTS service_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT UNIQUE NOT NULL,
    service_name TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('core', 'platform', 'extension', 'utility', 'integration')),
    status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'beta', 'experimental')),

    -- Endpoints
    primary_endpoint TEXT NOT NULL,
    health_endpoint TEXT,
    api_endpoint TEXT,
    docs_endpoint TEXT,

    -- Capabilities and dependencies
    capabilities JSONB DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,

    -- Authentication
    auth_type TEXT CHECK (auth_type IN ('bearer', 'api-key', 'oauth', 'service-token')),
    auth_required BOOLEAN DEFAULT true,

    -- Pipeline compliance
    pipeline_compliant BOOLEAN DEFAULT false,
    enforcement_level TEXT CHECK (enforcement_level IN ('strict', 'monitor', 'disabled')),
    intercept_chitty_id BOOLEAN DEFAULT false,
    require_pipeline_token BOOLEAN DEFAULT false,

    -- Metadata
    description TEXT,
    maintainer TEXT,
    repository TEXT,
    documentation TEXT,
    tags JSONB DEFAULT '[]'::jsonb,

    -- Registry sync info
    registry_url TEXT DEFAULT 'https://registry.chitty.cc',
    last_sync_from_registry TIMESTAMPTZ,
    registry_version TEXT,

    -- Timestamps
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Health Monitoring
-- Tracks health status of registered services
CREATE TABLE IF NOT EXISTS service_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL REFERENCES service_registry(service_id) ON DELETE CASCADE,

    -- Health metrics
    is_healthy BOOLEAN DEFAULT false,
    response_time_ms INTEGER,
    last_check TIMESTAMPTZ DEFAULT NOW(),
    consecutive_failures INTEGER DEFAULT 0,

    -- Compliance monitoring
    pipeline_compliant BOOLEAN DEFAULT false,
    compliance_violations INTEGER DEFAULT 0,
    last_violation TIMESTAMPTZ,

    -- Status tracking
    status_code INTEGER,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registry Sync Log
-- Tracks synchronization events with central registry
CREATE TABLE IF NOT EXISTS registry_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync details
    registry_url TEXT NOT NULL,
    sync_type TEXT CHECK (sync_type IN ('manual', 'automatic', 'health_check')),
    sync_status TEXT CHECK (sync_status IN ('success', 'failure', 'partial')),

    -- Results
    services_discovered INTEGER DEFAULT 0,
    services_updated INTEGER DEFAULT 0,
    services_added INTEGER DEFAULT 0,
    services_removed INTEGER DEFAULT 0,

    -- Performance
    sync_duration_ms INTEGER,
    registry_latency_ms INTEGER,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Configuration
-- Stores configuration for registry integration and propagation
CREATE TABLE IF NOT EXISTS system_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type TEXT CHECK (config_type IN ('registry', 'pipeline', 'enforcement', 'sync')),

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_restart BOOLEAN DEFAULT false,

    -- Change tracking
    created_by TEXT,
    updated_by TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Propagation Log
-- Tracks how registry changes are propagated to other systems
CREATE TABLE IF NOT EXISTS schema_propagation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Propagation details
    target_system TEXT NOT NULL,
    propagation_type TEXT CHECK (propagation_type IN ('service_add', 'service_update', 'service_remove', 'config_change')),
    propagation_status TEXT CHECK (propagation_status IN ('pending', 'in_progress', 'success', 'failure')),

    -- Change details
    service_id TEXT,
    change_summary TEXT,
    change_details JSONB,

    -- Results
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_registry_service_id ON service_registry(service_id);
CREATE INDEX IF NOT EXISTS idx_service_registry_category ON service_registry(category);
CREATE INDEX IF NOT EXISTS idx_service_registry_status ON service_registry(status);
CREATE INDEX IF NOT EXISTS idx_service_registry_pipeline_compliant ON service_registry(pipeline_compliant);
CREATE INDEX IF NOT EXISTS idx_service_registry_last_sync ON service_registry(last_sync_from_registry);

CREATE INDEX IF NOT EXISTS idx_service_health_service_id ON service_health(service_id);
CREATE INDEX IF NOT EXISTS idx_service_health_is_healthy ON service_health(is_healthy);
CREATE INDEX IF NOT EXISTS idx_service_health_last_check ON service_health(last_check);

CREATE INDEX IF NOT EXISTS idx_registry_sync_log_status ON registry_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_registry_sync_log_started_at ON registry_sync_log(started_at);

CREATE INDEX IF NOT EXISTS idx_system_configuration_key ON system_configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configuration_type ON system_configuration(config_type);
CREATE INDEX IF NOT EXISTS idx_system_configuration_active ON system_configuration(is_active);

CREATE INDEX IF NOT EXISTS idx_schema_propagation_target ON schema_propagation_log(target_system);
CREATE INDEX IF NOT EXISTS idx_schema_propagation_status ON schema_propagation_log(propagation_status);
CREATE INDEX IF NOT EXISTS idx_schema_propagation_service ON schema_propagation_log(service_id);

-- Insert default system configurations
INSERT INTO system_configuration (config_key, config_value, config_type, description) VALUES
    ('registry.url', '"https://registry.chitty.cc"', 'registry', 'Central tool registry URL'),
    ('registry.sync_interval', '300000', 'registry', 'Registry sync interval in milliseconds'),
    ('registry.auto_sync', 'true', 'registry', 'Enable automatic registry synchronization'),
    ('pipeline.enforcement_level', '"strict"', 'pipeline', 'Pipeline enforcement level'),
    ('pipeline.mandatory_compliance', 'true', 'pipeline', 'Require all services to be pipeline compliant'),
    ('propagation.enabled', 'true', 'sync', 'Enable schema propagation to other systems'),
    ('propagation.batch_size', '50', 'sync', 'Batch size for schema propagation'),
    ('propagation.retry_attempts', '3', 'sync', 'Number of retry attempts for failed propagations')
ON CONFLICT (config_key) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update timestamps
DROP TRIGGER IF EXISTS update_service_registry_updated_at ON service_registry;
CREATE TRIGGER update_service_registry_updated_at
    BEFORE UPDATE ON service_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_health_updated_at ON service_health;
CREATE TRIGGER update_service_health_updated_at
    BEFORE UPDATE ON service_health
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_configuration_updated_at ON system_configuration;
CREATE TRIGGER update_system_configuration_updated_at
    BEFORE UPDATE ON system_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log service registry changes for propagation
CREATE OR REPLACE FUNCTION log_service_registry_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change for propagation to other systems
    IF TG_OP = 'INSERT' THEN
        INSERT INTO schema_propagation_log (target_system, propagation_type, service_id, change_summary, change_details)
        VALUES ('all_systems', 'service_add', NEW.service_id,
                'New service registered: ' || NEW.service_name,
                jsonb_build_object('service', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO schema_propagation_log (target_system, propagation_type, service_id, change_summary, change_details)
        VALUES ('all_systems', 'service_update', NEW.service_id,
                'Service updated: ' || NEW.service_name,
                jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO schema_propagation_log (target_system, propagation_type, service_id, change_summary, change_details)
        VALUES ('all_systems', 'service_remove', OLD.service_id,
                'Service removed: ' || OLD.service_name,
                jsonb_build_object('service', row_to_json(OLD)));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to automatically log service registry changes
DROP TRIGGER IF EXISTS log_service_registry_changes ON service_registry;
CREATE TRIGGER log_service_registry_changes
    AFTER INSERT OR UPDATE OR DELETE ON service_registry
    FOR EACH ROW
    EXECUTE FUNCTION log_service_registry_change();

-- Function to get all active pipeline-compliant services
CREATE OR REPLACE FUNCTION get_pipeline_compliant_services()
RETURNS TABLE (
    service_id TEXT,
    service_name TEXT,
    primary_endpoint TEXT,
    auth_type TEXT,
    capabilities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.service_id,
        sr.service_name,
        sr.primary_endpoint,
        sr.auth_type,
        sr.capabilities
    FROM service_registry sr
    WHERE sr.status = 'active'
      AND sr.pipeline_compliant = true
    ORDER BY sr.service_name;
END;
$$ language 'plpgsql';

-- Function to get system health overview
CREATE OR REPLACE FUNCTION get_system_health_overview()
RETURNS TABLE (
    total_services INTEGER,
    healthy_services INTEGER,
    unhealthy_services INTEGER,
    pipeline_compliant INTEGER,
    last_sync TIMESTAMPTZ,
    health_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_services,
        COUNT(CASE WHEN sh.is_healthy THEN 1 END)::INTEGER as healthy_services,
        COUNT(CASE WHEN NOT sh.is_healthy THEN 1 END)::INTEGER as unhealthy_services,
        COUNT(CASE WHEN sr.pipeline_compliant THEN 1 END)::INTEGER as pipeline_compliant,
        MAX(sr.last_sync_from_registry) as last_sync,
        ROUND(
            (COUNT(CASE WHEN sh.is_healthy THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
            2
        ) as health_percentage
    FROM service_registry sr
    LEFT JOIN service_health sh ON sr.service_id = sh.service_id
    WHERE sr.status = 'active';
END;
$$ language 'plpgsql';

-- Comments for documentation
COMMENT ON TABLE service_registry IS 'Central registry of all ChittyOS services discovered from registry.chitty.cc';
COMMENT ON TABLE service_health IS 'Health monitoring and compliance tracking for registered services';
COMMENT ON TABLE registry_sync_log IS 'Log of synchronization events with central registry';
COMMENT ON TABLE system_configuration IS 'System-wide configuration for registry integration and pipeline enforcement';
COMMENT ON TABLE schema_propagation_log IS 'Tracks propagation of registry changes to other systems';

COMMENT ON FUNCTION get_pipeline_compliant_services() IS 'Returns all active services that are pipeline compliant';
COMMENT ON FUNCTION get_system_health_overview() IS 'Provides health overview of all registered services';
COMMENT ON FUNCTION log_service_registry_change() IS 'Automatically logs service registry changes for propagation';
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp on record changes';