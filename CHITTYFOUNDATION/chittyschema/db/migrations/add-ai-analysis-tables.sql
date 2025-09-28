-- =====================================================
-- AI Analysis Schema Migration
-- Adds missing AI analysis tables per litigation manual requirements
-- =====================================================

-- Update schema version
INSERT INTO schema_versions (version, description, migration_script)
VALUES ('1.1.0', 'Add AI analysis tables for ChittyRouter integration', 'add-ai-analysis-tables.sql');

-- =====================================================
-- AI ANALYSIS INFRASTRUCTURE
-- =====================================================

-- AI Analysis Sessions (from manual requirement)
-- Tracks Claude, GPT, Gemini, Llama analysis sessions
CREATE TABLE ai_analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Evidence and Case References
    evidence_id UUID,
    case_id UUID,
    aggregate_id UUID NOT NULL, -- For event sourcing correlation

    -- AI Model Information
    model_used TEXT NOT NULL CHECK (model_used IN ('claude', 'gpt', 'gemini', 'llama', 'claude-4', 'gpt-4', 'gpt-3.5', 'gemini-pro')),
    model_version TEXT,
    routing_method TEXT DEFAULT 'CHITTYROUTER' CHECK (routing_method = 'CHITTYROUTER'),

    -- Analysis Configuration
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('fact_extraction', 'contradiction_detection', 'timeline_analysis', 'evidence_classification', 'risk_assessment', 'compliance_check')),
    analysis_config JSONB,

    -- Input/Output Metrics
    input_tokens INTEGER,
    output_tokens INTEGER,
    processing_time_ms INTEGER,

    -- Quality Metrics
    confidence_score NUMERIC(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    quality_score NUMERIC(5,2) CHECK (quality_score >= 0 AND quality_score <= 1),

    -- Analysis Results
    extracted_facts JSONB, -- Array of fact objects
    detected_contradictions JSONB, -- Array of contradiction objects
    timeline_events JSONB, -- Array of timeline events
    risk_factors JSONB, -- Risk assessment results
    compliance_flags JSONB, -- Compliance issues detected

    -- Session Management
    session_id UUID,
    correlation_id UUID,
    user_id UUID,

    -- Status and Timestamps
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Foreign Key Constraints (will be added based on existing schema)
    CONSTRAINT fk_ai_session_evidence FOREIGN KEY (evidence_id) REFERENCES things(id),
    CONSTRAINT fk_ai_session_user FOREIGN KEY (user_id) REFERENCES people(id),
    CONSTRAINT fk_ai_session_creator FOREIGN KEY (created_by) REFERENCES people(id)
);

CREATE INDEX idx_ai_sessions_chitty_id ON ai_analysis_sessions(chitty_id);
CREATE INDEX idx_ai_sessions_evidence ON ai_analysis_sessions(evidence_id);
CREATE INDEX idx_ai_sessions_case ON ai_analysis_sessions(case_id);
CREATE INDEX idx_ai_sessions_model ON ai_analysis_sessions(model_used, model_version);
CREATE INDEX idx_ai_sessions_type ON ai_analysis_sessions(analysis_type);
CREATE INDEX idx_ai_sessions_status ON ai_analysis_sessions(status, started_at);
CREATE INDEX idx_ai_sessions_correlation ON ai_analysis_sessions(correlation_id);
CREATE INDEX idx_ai_sessions_session ON ai_analysis_sessions(session_id);

-- AI Comparative Analysis (multi-model consensus)
-- Supports comparison across multiple AI models for consensus
CREATE TABLE ai_comparative_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Evidence and Analysis References
    evidence_id UUID,
    case_id UUID,
    primary_session_id UUID REFERENCES ai_analysis_sessions(id),

    -- Model Comparison
    primary_model TEXT NOT NULL,
    secondary_models TEXT[] NOT NULL,
    models_compared INTEGER NOT NULL DEFAULT 2,

    -- Consensus Analysis
    consensus_reached BOOLEAN DEFAULT FALSE,
    consensus_threshold NUMERIC(3,2) DEFAULT 0.75,
    variance_score NUMERIC(5,2) CHECK (variance_score >= 0 AND variance_score <= 1),
    agreement_percentage NUMERIC(5,2),

    -- Comparative Results
    fact_agreement JSONB, -- Facts agreed upon by models
    fact_disagreement JSONB, -- Facts with disagreement
    contradiction_consensus JSONB, -- Agreed contradictions
    risk_assessment_range JSONB, -- Min/max risk scores

    -- Final Recommendation
    final_recommendation JSONB,
    confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    recommendation_basis TEXT,

    -- Quality Metrics
    analysis_quality_score NUMERIC(5,2),
    reliability_score NUMERIC(5,2),

    -- Session Management
    comparison_session_id UUID,
    user_id UUID,

    -- Status and Timestamps
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Foreign Key Constraints
    CONSTRAINT fk_ai_comparative_evidence FOREIGN KEY (evidence_id) REFERENCES things(id),
    CONSTRAINT fk_ai_comparative_user FOREIGN KEY (user_id) REFERENCES people(id),
    CONSTRAINT fk_ai_comparative_creator FOREIGN KEY (created_by) REFERENCES people(id)
);

CREATE INDEX idx_ai_comparative_chitty_id ON ai_comparative_analysis(chitty_id);
CREATE INDEX idx_ai_comparative_evidence ON ai_comparative_analysis(evidence_id);
CREATE INDEX idx_ai_comparative_case ON ai_comparative_analysis(case_id);
CREATE INDEX idx_ai_comparative_primary ON ai_comparative_analysis(primary_session_id);
CREATE INDEX idx_ai_comparative_consensus ON ai_comparative_analysis(consensus_reached, variance_score);
CREATE INDEX idx_ai_comparative_status ON ai_comparative_analysis(status, started_at);

-- AI Model Performance Tracking
-- Monitors AI model accuracy and performance over time
CREATE TABLE ai_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Model Information
    model_name TEXT NOT NULL,
    model_version TEXT,

    -- Performance Metrics
    accuracy_score NUMERIC(5,2),
    precision_score NUMERIC(5,2),
    recall_score NUMERIC(5,2),
    f1_score NUMERIC(5,2),

    -- Task-Specific Performance
    fact_extraction_accuracy NUMERIC(5,2),
    contradiction_detection_accuracy NUMERIC(5,2),
    timeline_accuracy NUMERIC(5,2),

    -- Usage Statistics
    total_analyses INTEGER DEFAULT 0,
    successful_analyses INTEGER DEFAULT 0,
    failed_analyses INTEGER DEFAULT 0,
    average_processing_time_ms INTEGER,
    average_confidence_score NUMERIC(5,2),

    -- Time Period
    measurement_period_start TIMESTAMPTZ NOT NULL,
    measurement_period_end TIMESTAMPTZ NOT NULL,

    -- Performance Benchmarks
    benchmark_dataset TEXT,
    ground_truth_comparisons INTEGER,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_performance_model ON ai_model_performance(model_name, model_version);
CREATE INDEX idx_ai_performance_period ON ai_model_performance(measurement_period_start, measurement_period_end);
CREATE INDEX idx_ai_performance_accuracy ON ai_model_performance(accuracy_score);

-- AI Analysis Results Materialized View
-- Pre-computed view for faster reporting
CREATE MATERIALIZED VIEW ai_analysis_summary AS
SELECT
    s.evidence_id,
    s.case_id,
    COUNT(*) as total_analyses,
    COUNT(DISTINCT s.model_used) as models_used,
    AVG(s.confidence_score) as avg_confidence,
    AVG(s.processing_time_ms) as avg_processing_time,
    COUNT(c.id) as comparative_analyses,
    AVG(c.variance_score) as avg_variance,
    COUNT(CASE WHEN c.consensus_reached THEN 1 END) as consensus_count,
    MAX(s.completed_at) as latest_analysis
FROM ai_analysis_sessions s
LEFT JOIN ai_comparative_analysis c ON s.evidence_id = c.evidence_id
WHERE s.status = 'COMPLETED'
GROUP BY s.evidence_id, s.case_id;

CREATE INDEX idx_ai_summary_evidence ON ai_analysis_summary(evidence_id);
CREATE INDEX idx_ai_summary_case ON ai_analysis_summary(case_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_ai_analysis_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_analysis_summary;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ai_analysis_sessions IS 'Tracks individual AI analysis sessions per §23 Model Routing Policy';
COMMENT ON TABLE ai_comparative_analysis IS 'Multi-model consensus analysis per litigation manual requirements';
COMMENT ON TABLE ai_model_performance IS 'Performance tracking for AI models to ensure quality';
COMMENT ON COLUMN ai_analysis_sessions.routing_method IS 'Must be CHITTYROUTER per §36 - no direct AI provider calls';
COMMENT ON COLUMN ai_comparative_analysis.consensus_reached IS 'Indicates if models reached agreement above threshold';