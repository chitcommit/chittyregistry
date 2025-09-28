-- ChittyLedger - PostgreSQL Production Schema
-- Central schema repository for legal evidence management system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (be careful in production!)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('admin', 'litigator', 'witness', 'analyst', 'viewer')),
    bar_number TEXT,
    phone TEXT,
    trust_score NUMERIC(5,2) DEFAULT 0.0 CHECK (trust_score >= 0 AND trust_score <= 100),
    verified BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMPTZ,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_chitty_id ON users(chitty_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- CASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docket_number TEXT UNIQUE NOT NULL,
    jurisdiction TEXT,
    title TEXT,
    status TEXT CHECK (status IN ('open', 'closed', 'appealed', 'stayed', 'settled')),
    created_by UUID REFERENCES users(id),
    filing_date DATE,
    judge_assigned TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_docket ON cases(docket_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by);

-- =====================================================
-- MASTER EVIDENCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS master_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB,
    media_url TEXT,
    file_hash TEXT UNIQUE,
    type TEXT CHECK (type IN (
        'document', 'audio', 'video', 'image',
        'financial_record', 'contract', 'communication',
        'physical_evidence', 'testimony', 'expert_report'
    )),
    tier TEXT CHECK (tier IN (
        'GOVERNMENT', 'VERIFIED_THIRD_PARTY',
        'WITNESS', 'UNVERIFIED', 'CONTESTED'
    )),
    weight NUMERIC(3,2) CHECK (weight >= 0 AND weight <= 1),
    source TEXT,
    source_verification TEXT,
    authentication_method TEXT,
    is_confidential BOOLEAN DEFAULT FALSE,
    date_received TIMESTAMPTZ,
    date_of_evidence TIMESTAMPTZ,
    minting_status TEXT CHECK (minting_status IN ('Pending', 'Minted', 'Failed')),
    block_number TEXT,
    transaction_hash TEXT,
    audit_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_case ON master_evidence(case_id);
CREATE INDEX idx_evidence_submitted_by ON master_evidence(submitted_by);
CREATE INDEX idx_evidence_hash ON master_evidence(file_hash);
CREATE INDEX idx_evidence_type ON master_evidence(type);
CREATE INDEX idx_evidence_tier ON master_evidence(tier);
CREATE INDEX idx_evidence_metadata_gin ON master_evidence USING GIN (metadata);

-- =====================================================
-- ATOMIC FACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS atomic_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES master_evidence(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id),
    asserted_by UUID REFERENCES users(id),
    text TEXT NOT NULL,
    extracted_from TEXT,
    tags TEXT[],
    fact_type TEXT CHECK (fact_type IN (
        'STATUS', 'ACTION', 'RELATIONSHIP',
        'TEMPORAL', 'FINANCIAL', 'LOCATION'
    )),
    location_in_document TEXT,
    classification_level TEXT CHECK (classification_level IN (
        'FACT', 'CLAIM', 'SPECULATION', 'OPINION'
    )),
    weight NUMERIC(3,2) CHECK (weight >= 0 AND weight <= 1),
    credibility_factors TEXT[],
    timestamped_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    chittychain_status TEXT CHECK (chittychain_status IN ('Pending', 'Minted', 'Failed')),
    verification_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facts_case ON atomic_facts(case_id);
CREATE INDEX idx_facts_evidence ON atomic_facts(evidence_id);
CREATE INDEX idx_facts_asserted_by ON atomic_facts(asserted_by);
CREATE INDEX idx_facts_verified ON atomic_facts(verified);
CREATE INDEX idx_facts_tags_gin ON atomic_facts USING GIN (tags);
CREATE INDEX idx_facts_credibility_gin ON atomic_facts USING GIN (credibility_factors);

-- =====================================================
-- CONTRADICTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id),
    fact_a_id UUID REFERENCES atomic_facts(id),
    fact_b_id UUID REFERENCES atomic_facts(id),
    conflict_type TEXT CHECK (conflict_type IN (
        'DIRECT', 'TEMPORAL', 'LOGICAL', 'PARTIAL'
    )),
    resolution_method TEXT,
    winning_fact UUID REFERENCES atomic_facts(id),
    impact_on_case TEXT,
    detected_by UUID REFERENCES users(id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT no_duplicate_pair CHECK (fact_a_id <> fact_b_id)
);

CREATE INDEX idx_contradictions_case ON contradictions(case_id);
CREATE INDEX idx_contradictions_facts ON contradictions(fact_a_id, fact_b_id);
CREATE INDEX idx_contradictions_resolved ON contradictions(resolved_at);

-- =====================================================
-- CHAIN OF CUSTODY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chain_of_custody (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES master_evidence(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN (
        'CREATED', 'VIEWED', 'MODIFIED', 'TRANSFERRED',
        'AUTHENTICATED', 'CHALLENGED', 'SEALED', 'UNSEALED'
    )),
    performed_by UUID REFERENCES users(id),
    transfer_method TEXT,
    integrity_check_method TEXT,
    integrity_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custody_evidence ON chain_of_custody(evidence_id);
CREATE INDEX idx_custody_performed_by ON chain_of_custody(performed_by);
CREATE INDEX idx_custody_timestamp ON chain_of_custody(timestamp);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    case_id UUID REFERENCES cases(id),
    entity TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    ip_address TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_case ON audit_log(case_id);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_metadata_gin ON audit_log USING GIN (metadata);

-- =====================================================
-- PROPERTY PINS TABLE (Cook County Integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS property_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin TEXT UNIQUE NOT NULL,
    case_id UUID REFERENCES cases(id),
    address TEXT,
    unit TEXT,
    owner_name TEXT,
    owner_type TEXT CHECK (owner_type IN ('INDIVIDUAL', 'LLC', 'CORP', 'TRUST', 'OTHER')),
    acquisition_date DATE,
    acquisition_price NUMERIC(12,2),
    current_assessed_value NUMERIC(12,2),
    last_tax_amount NUMERIC(10,2),
    last_tax_year INTEGER,
    metadata JSONB,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pins_pin ON property_pins(pin);
CREATE INDEX idx_pins_case ON property_pins(case_id);
CREATE INDEX idx_pins_owner ON property_pins(owner_name);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Case summary view
CREATE OR REPLACE VIEW case_summary AS
SELECT
    c.id,
    c.docket_number,
    c.title,
    c.status,
    COUNT(DISTINCT me.id) as evidence_count,
    COUNT(DISTINCT af.id) as fact_count,
    COUNT(DISTINCT con.id) as contradiction_count,
    c.created_at,
    c.updated_at
FROM cases c
LEFT JOIN master_evidence me ON me.case_id = c.id
LEFT JOIN atomic_facts af ON af.case_id = c.id
LEFT JOIN contradictions con ON con.case_id = c.id
GROUP BY c.id;

-- Evidence integrity view
CREATE OR REPLACE VIEW evidence_integrity AS
SELECT
    me.id,
    me.title,
    me.file_hash,
    me.minting_status,
    COUNT(coc.id) as custody_entries,
    MAX(coc.timestamp) as last_custody_action,
    BOOL_AND(coc.integrity_verified) as all_integrity_verified
FROM master_evidence me
LEFT JOIN chain_of_custody coc ON coc.evidence_id = me.id
GROUP BY me.id;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_property_pins_updated_at BEFORE UPDATE ON property_pins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to validate ChittyID format
CREATE OR REPLACE FUNCTION validate_chitty_id(id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN id ~ '^CHITTY-(PEO|PET|PROP|PLACE|AI|EVID|FACT|CASE|USER)-[A-F0-9]{16}$';
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate ChittyID format
ALTER TABLE users ADD CONSTRAINT valid_chitty_id CHECK (validate_chitty_id(chitty_id));

-- =====================================================
-- INITIAL SEED DATA (Optional)
-- =====================================================

-- Insert system admin user (optional)
-- INSERT INTO users (chitty_id, name, email, role, verified, trust_score)
-- VALUES ('CHITTY-USER-SYSTEM00000001', 'System Admin', 'admin@chittychain.local', 'admin', true, 100.0);

-- =====================================================
-- PERMISSIONS (Adjust as needed)
-- =====================================================

-- GRANT USAGE ON SCHEMA public TO chitty_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO chitty_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO chitty_app;