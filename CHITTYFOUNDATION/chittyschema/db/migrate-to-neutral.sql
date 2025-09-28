-- Migration Script: Legal Schema → Neutral Schema
-- Updates existing tables to use neutral terminology and structures

BEGIN;

-- =============================================================================
-- UPDATE EXISTING TABLES TO NEUTRAL STRUCTURE
-- =============================================================================

-- Update atomic_facts table to neutral structure
DO $$
BEGIN
    -- Add new neutral columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'fact_type') THEN
        ALTER TABLE atomic_facts ADD COLUMN fact_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'predicate') THEN
        ALTER TABLE atomic_facts ADD COLUMN predicate TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'object_value') THEN
        ALTER TABLE atomic_facts ADD COLUMN object_value TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'object_entity_id') THEN
        ALTER TABLE atomic_facts ADD COLUMN object_entity_id UUID REFERENCES entities(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'certainty_level') THEN
        ALTER TABLE atomic_facts ADD COLUMN certainty_level NUMERIC(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'confidence_score') THEN
        ALTER TABLE atomic_facts ADD COLUMN confidence_score NUMERIC(3,2) DEFAULT 0.5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'extracted_by') THEN
        ALTER TABLE atomic_facts ADD COLUMN extracted_by TEXT DEFAULT 'human';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'extraction_method') THEN
        ALTER TABLE atomic_facts ADD COLUMN extraction_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'extraction_confidence') THEN
        ALTER TABLE atomic_facts ADD COLUMN extraction_confidence NUMERIC(3,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'fact_timestamp') THEN
        ALTER TABLE atomic_facts ADD COLUMN fact_timestamp TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'observed_at') THEN
        ALTER TABLE atomic_facts ADD COLUMN observed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'recorded_at') THEN
        ALTER TABLE atomic_facts ADD COLUMN recorded_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'verification_status') THEN
        ALTER TABLE atomic_facts ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'verified_at') THEN
        ALTER TABLE atomic_facts ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'verified_by') THEN
        ALTER TABLE atomic_facts ADD COLUMN verified_by UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'context') THEN
        ALTER TABLE atomic_facts ADD COLUMN context JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'related_facts') THEN
        ALTER TABLE atomic_facts ADD COLUMN related_facts UUID[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'contradicts_facts') THEN
        ALTER TABLE atomic_facts ADD COLUMN contradicts_facts UUID[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'supports_facts') THEN
        ALTER TABLE atomic_facts ADD COLUMN supports_facts UUID[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'sensitivity_level') THEN
        ALTER TABLE atomic_facts ADD COLUMN sensitivity_level TEXT DEFAULT 'standard';
    END IF;
END $$;

-- Rename columns to neutral terminology
DO $$
BEGIN
    -- Update subject_entity reference
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'entity_id') THEN
        ALTER TABLE atomic_facts RENAME COLUMN entity_id TO subject_entity_id;
    END IF;

    -- Update source reference
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'evidence_id') THEN
        ALTER TABLE atomic_facts RENAME COLUMN evidence_id TO source_information_id;
    END IF;

    -- Update text column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_facts' AND column_name = 'fact_text') THEN
        ALTER TABLE atomic_facts RENAME COLUMN fact_text TO fact_statement;
    END IF;
END $$;

-- Update information_items table structure
DO $$
BEGIN
    -- Add neutral columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_type') THEN
        ALTER TABLE information_items ADD COLUMN content_type TEXT DEFAULT 'document';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_format') THEN
        ALTER TABLE information_items ADD COLUMN content_format TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_summary') THEN
        ALTER TABLE information_items ADD COLUMN content_summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_hash') THEN
        ALTER TABLE information_items ADD COLUMN content_hash TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_size') THEN
        ALTER TABLE information_items ADD COLUMN content_size BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_location') THEN
        ALTER TABLE information_items ADD COLUMN content_location TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'information_tier') THEN
        ALTER TABLE information_items ADD COLUMN information_tier TEXT DEFAULT 'UNVERIFIED';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'source_type') THEN
        ALTER TABLE information_items ADD COLUMN source_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'authenticity_status') THEN
        ALTER TABLE information_items ADD COLUMN authenticity_status TEXT DEFAULT 'unverified';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'content_date') THEN
        ALTER TABLE information_items ADD COLUMN content_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'received_date') THEN
        ALTER TABLE information_items ADD COLUMN received_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'source_entity_id') THEN
        ALTER TABLE information_items ADD COLUMN source_entity_id UUID REFERENCES entities(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'contributor_id') THEN
        ALTER TABLE information_items ADD COLUMN contributor_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'collection_method') THEN
        ALTER TABLE information_items ADD COLUMN collection_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'chain_of_custody') THEN
        ALTER TABLE information_items ADD COLUMN chain_of_custody JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'sensitivity_level') THEN
        ALTER TABLE information_items ADD COLUMN sensitivity_level TEXT DEFAULT 'standard';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'access_restrictions') THEN
        ALTER TABLE information_items ADD COLUMN access_restrictions JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'retention_period') THEN
        ALTER TABLE information_items ADD COLUMN retention_period INTERVAL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'disposal_date') THEN
        ALTER TABLE information_items ADD COLUMN disposal_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'verification_status') THEN
        ALTER TABLE information_items ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'verification_method') THEN
        ALTER TABLE information_items ADD COLUMN verification_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'verified_at') THEN
        ALTER TABLE information_items ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'verified_by') THEN
        ALTER TABLE information_items ADD COLUMN verified_by UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'tags') THEN
        ALTER TABLE information_items ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'information_items' AND column_name = 'custom_metadata') THEN
        ALTER TABLE information_items ADD COLUMN custom_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Migrate data from old columns to new neutral columns
UPDATE atomic_facts
SET
    fact_type = COALESCE(fact_type, 'assertion'),
    predicate = COALESCE(predicate, 'states'),
    object_value = COALESCE(object_value, fact_statement),
    certainty_level = COALESCE(certainty_level, 0.5),
    confidence_score = COALESCE(confidence_score, weight, 0.5),
    recorded_at = COALESCE(recorded_at, created_at),
    verification_status = COALESCE(verification_status, 'pending'),
    sensitivity_level = COALESCE(sensitivity_level, 'standard')
WHERE fact_type IS NULL OR predicate IS NULL;

-- Update information tiers to neutral terminology
UPDATE information_items
SET information_tier = CASE
    WHEN information_tier IS NULL THEN 'UNVERIFIED'
    ELSE information_tier
END;

-- =============================================================================
-- CREATE NEUTRAL VIEWS (SAFE - NO CONFLICTS)
-- =============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS current_entities;
DROP VIEW IF EXISTS entity_graph;
DROP VIEW IF EXISTS information_provenance;
DROP VIEW IF EXISTS fact_verification_summary;

-- Create neutral views
CREATE VIEW current_entities AS
SELECT e.*
FROM entities e
WHERE e.valid_to = 'infinity'
  AND e.status != 'deleted';

CREATE VIEW entity_graph AS
SELECT
    er.id,
    er.source_entity_id,
    es.name as source_name,
    es.entity_type as source_type,
    er.target_entity_id,
    et.name as target_name,
    et.entity_type as target_type,
    er.relationship_type,
    er.strength_score,
    er.confidence_score,
    er.is_current
FROM entity_relationships er
JOIN entities es ON er.source_entity_id = es.id
JOIN entities et ON er.target_entity_id = et.id
WHERE er.is_current = true;

CREATE VIEW information_provenance AS
SELECT
    ii.id,
    ii.chitty_id,
    ii.title,
    ii.content_type,
    ii.information_tier,
    ii.source_entity_id,
    e.name as source_name,
    ii.chain_of_custody,
    ii.verification_status,
    ii.created_at
FROM information_items ii
LEFT JOIN entities e ON ii.source_entity_id = e.id;

CREATE VIEW fact_verification_summary AS
SELECT
    af.id,
    af.chitty_id,
    af.fact_statement,
    af.classification,
    af.certainty_level,
    af.confidence_score,
    af.verification_status,
    ii.title as source_title,
    ii.information_tier as source_tier,
    e.name as subject_name
FROM atomic_facts af
JOIN information_items ii ON af.source_information_id = ii.id
LEFT JOIN entities e ON af.subject_entity_id = e.id;

-- =============================================================================
-- ADD NEUTRAL CONSTRAINTS
-- =============================================================================

-- Add constraints for neutral classifications
DO $$
BEGIN
    -- Add constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_information_tier') THEN
        ALTER TABLE information_items
        ADD CONSTRAINT valid_information_tier
        CHECK (information_tier IN ('PRIMARY_SOURCE', 'OFFICIAL_RECORD', 'INSTITUTIONAL', 'THIRD_PARTY', 'DERIVED', 'REPORTED', 'UNVERIFIED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_authenticity') THEN
        ALTER TABLE information_items
        ADD CONSTRAINT valid_authenticity
        CHECK (authenticity_status IN ('authentic', 'unverified', 'disputed', 'fabricated'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_sensitivity') THEN
        ALTER TABLE information_items
        ADD CONSTRAINT valid_sensitivity
        CHECK (sensitivity_level IN ('public', 'standard', 'sensitive', 'restricted', 'confidential'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_fact_classification') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT valid_fact_classification
        CHECK (classification IN ('OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE', 'DERIVED', 'OPINION', 'HYPOTHESIS'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_certainty') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT valid_certainty
        CHECK (certainty_level BETWEEN 0 AND 1);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_confidence') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT valid_confidence
        CHECK (confidence_score BETWEEN 0 AND 1);
    END IF;
END $$;

-- =============================================================================
-- CREATE NEUTRAL INDEXES
-- =============================================================================

-- Create indexes for performance (safe if they already exist)
CREATE INDEX IF NOT EXISTS idx_atomic_facts_fact_type ON atomic_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_predicate ON atomic_facts(predicate);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_certainty ON atomic_facts(certainty_level);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_confidence ON atomic_facts(confidence_score);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_timestamp ON atomic_facts(fact_timestamp);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_recorded ON atomic_facts(recorded_at);

CREATE INDEX IF NOT EXISTS idx_information_tier ON information_items(information_tier);
CREATE INDEX IF NOT EXISTS idx_information_content_type ON information_items(content_type);
CREATE INDEX IF NOT EXISTS idx_information_authenticity ON information_items(authenticity_status);
CREATE INDEX IF NOT EXISTS idx_information_sensitivity ON information_items(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_information_verification ON information_items(verification_status);

-- =============================================================================
-- UPDATE SCHEMA VERSION
-- =============================================================================

INSERT INTO schema_versions (version_number, version_type, description, applied_by)
VALUES ('1.1.0', 'major', 'Migration to neutral terminology and structures', NULL)
ON CONFLICT (version_number) DO NOTHING;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify migration success
SELECT 'Migration completed successfully. Neutral schema is now active.' as status;

-- Show updated table structures
SELECT
    'atomic_facts' as table_name,
    COUNT(*) as total_facts,
    COUNT(CASE WHEN fact_type IS NOT NULL THEN 1 END) as facts_with_type,
    COUNT(CASE WHEN certainty_level IS NOT NULL THEN 1 END) as facts_with_certainty
FROM atomic_facts
UNION ALL
SELECT
    'information_items' as table_name,
    COUNT(*) as total_items,
    COUNT(CASE WHEN information_tier IS NOT NULL THEN 1 END) as items_with_tier,
    COUNT(CASE WHEN content_type IS NOT NULL THEN 1 END) as items_with_content_type
FROM information_items;