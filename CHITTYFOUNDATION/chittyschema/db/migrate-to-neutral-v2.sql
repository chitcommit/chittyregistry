-- Migration Script: Legal Schema → Neutral Schema (Version 2)
-- Updates existing tables to use neutral terminology and structures

BEGIN;

-- =============================================================================
-- MIGRATE ATOMIC_FACTS TO NEUTRAL STRUCTURE
-- =============================================================================

-- Add neutral columns to atomic_facts
ALTER TABLE atomic_facts
ADD COLUMN IF NOT EXISTS fact_statement TEXT,
ADD COLUMN IF NOT EXISTS subject_entity_id UUID,
ADD COLUMN IF NOT EXISTS predicate TEXT,
ADD COLUMN IF NOT EXISTS object_value TEXT,
ADD COLUMN IF NOT EXISTS object_entity_id UUID,
ADD COLUMN IF NOT EXISTS classification TEXT,
ADD COLUMN IF NOT EXISTS certainty_level NUMERIC(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS source_information_id UUID,
ADD COLUMN IF NOT EXISTS extracted_by TEXT DEFAULT 'human',
ADD COLUMN IF NOT EXISTS extraction_method TEXT,
ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS fact_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS related_facts UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contradicts_facts UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS supports_facts UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'standard';

-- Migrate data from old columns to new neutral columns
UPDATE atomic_facts
SET
    fact_statement = COALESCE(fact_statement, text),
    source_information_id = COALESCE(source_information_id, evidence_id),
    classification = CASE
        WHEN classification_level = 'FACT' THEN 'OBSERVATION'
        WHEN classification_level = 'CLAIM' THEN 'ASSERTION'
        WHEN classification_level = 'SPECULATION' THEN 'HYPOTHESIS'
        WHEN classification_level = 'OPINION' THEN 'OPINION'
        ELSE 'ASSERTION'
    END,
    confidence_score = COALESCE(confidence_score, weight, 0.5),
    fact_timestamp = COALESCE(fact_timestamp, timestamped_at),
    recorded_at = COALESCE(recorded_at, created_at),
    verification_status = CASE
        WHEN verified = true THEN 'verified'
        WHEN verified = false THEN 'pending'
        ELSE 'pending'
    END,
    predicate = COALESCE(predicate, 'states'),
    object_value = COALESCE(object_value, text)
WHERE fact_statement IS NULL OR source_information_id IS NULL;

-- =============================================================================
-- MIGRATE INFORMATION_ITEMS TABLE
-- =============================================================================

-- Check if information_items needs migration from master_evidence
DO $$
BEGIN
    -- Migrate master_evidence records to information_items if they don't exist
    INSERT INTO information_items (
        chitty_id, title, content_type, content_hash, content_size,
        information_tier, authenticity_status, created_at, updated_at,
        content_date, source_entity_id, verification_status, tags,
        sensitivity_level, access_restrictions
    )
    SELECT
        me.chitty_id,
        me.title,
        CASE
            WHEN me.evidence_type = 'Document' THEN 'document'
            WHEN me.evidence_type = 'Image' THEN 'image'
            WHEN me.evidence_type = 'Communication' THEN 'communication'
            WHEN me.evidence_type = 'Financial Record' THEN 'data'
            WHEN me.evidence_type = 'Legal Filing' THEN 'document'
            WHEN me.evidence_type = 'Physical Evidence' THEN 'physical'
            ELSE 'other'
        END,
        me.hash_sha256,
        me.file_size,
        CASE
            WHEN me.evidence_tier = 'SELF_AUTHENTICATING' THEN 'PRIMARY_SOURCE'
            WHEN me.evidence_tier = 'GOVERNMENT' THEN 'OFFICIAL_RECORD'
            WHEN me.evidence_tier = 'FINANCIAL_INSTITUTION' THEN 'INSTITUTIONAL'
            WHEN me.evidence_tier = 'INDEPENDENT_THIRD_PARTY' THEN 'THIRD_PARTY'
            WHEN me.evidence_tier = 'BUSINESS_RECORDS' THEN 'INSTITUTIONAL'
            WHEN me.evidence_tier = 'FIRST_PARTY_ADVERSE' THEN 'DERIVED'
            WHEN me.evidence_tier = 'FIRST_PARTY_FRIENDLY' THEN 'REPORTED'
            WHEN me.evidence_tier = 'UNCORROBORATED_PERSON' THEN 'UNVERIFIED'
            ELSE 'UNVERIFIED'
        END,
        'authentic',
        me.created_at,
        me.updated_at,
        me.date_created,
        NULL, -- source_entity_id
        CASE
            WHEN me.verification_status = 'verified' THEN 'verified'
            WHEN me.verification_status = 'pending' THEN 'pending'
            ELSE 'pending'
        END,
        me.tags,
        'standard',
        '{}'::jsonb
    FROM master_evidence me
    WHERE NOT EXISTS (
        SELECT 1 FROM information_items ii
        WHERE ii.chitty_id = me.chitty_id
    );
END $$;

-- =============================================================================
-- UPDATE ENTITY REFERENCES
-- =============================================================================

-- Update entity references to use new neutral foreign keys
DO $$
BEGIN
    -- Add foreign key constraint for atomic_facts.source_information_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_source_information_id_fkey') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_source_information_id_fkey
        FOREIGN KEY (source_information_id) REFERENCES information_items(id);
    END IF;

    -- Add foreign key constraint for atomic_facts.subject_entity_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_subject_entity_id_fkey') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_subject_entity_id_fkey
        FOREIGN KEY (subject_entity_id) REFERENCES entities(id);
    END IF;

    -- Add foreign key constraint for atomic_facts.object_entity_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_object_entity_id_fkey') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_object_entity_id_fkey
        FOREIGN KEY (object_entity_id) REFERENCES entities(id);
    END IF;
END $$;

-- =============================================================================
-- ADD NEUTRAL CONSTRAINTS
-- =============================================================================

-- Add neutral classification constraints
DO $$
BEGIN
    -- Add constraint for neutral fact classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_neutral_classification_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_neutral_classification_check
        CHECK (classification IN ('OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE', 'DERIVED', 'OPINION', 'HYPOTHESIS'));
    END IF;

    -- Add constraint for certainty level
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_certainty_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_certainty_check
        CHECK (certainty_level BETWEEN 0 AND 1);
    END IF;

    -- Add constraint for confidence score
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_confidence_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_confidence_check
        CHECK (confidence_score BETWEEN 0 AND 1);
    END IF;

    -- Add constraint for extraction confidence
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_extraction_confidence_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_extraction_confidence_check
        CHECK (extraction_confidence BETWEEN 0 AND 1 OR extraction_confidence IS NULL);
    END IF;

    -- Add constraint for verification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_verification_status_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_verification_status_check
        CHECK (verification_status IN ('pending', 'verified', 'disputed', 'rejected'));
    END IF;

    -- Add constraint for sensitivity level
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'atomic_facts_sensitivity_check') THEN
        ALTER TABLE atomic_facts
        ADD CONSTRAINT atomic_facts_sensitivity_check
        CHECK (sensitivity_level IN ('public', 'standard', 'sensitive', 'restricted', 'confidential'));
    END IF;
END $$;

-- =============================================================================
-- CREATE NEUTRAL INDEXES
-- =============================================================================

-- Create indexes for new neutral columns
CREATE INDEX IF NOT EXISTS idx_atomic_facts_classification ON atomic_facts(classification);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_certainty ON atomic_facts(certainty_level);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_confidence ON atomic_facts(confidence_score);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_source_info ON atomic_facts(source_information_id);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_subject ON atomic_facts(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_object ON atomic_facts(object_entity_id);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_fact_timestamp ON atomic_facts(fact_timestamp);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_recorded ON atomic_facts(recorded_at);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_verification ON atomic_facts(verification_status);
CREATE INDEX IF NOT EXISTS idx_atomic_facts_sensitivity ON atomic_facts(sensitivity_level);

-- Create indexes for information_items
CREATE INDEX IF NOT EXISTS idx_information_tier ON information_items(information_tier);
CREATE INDEX IF NOT EXISTS idx_information_content_type ON information_items(content_type);
CREATE INDEX IF NOT EXISTS idx_information_authenticity ON information_items(authenticity_status);
CREATE INDEX IF NOT EXISTS idx_information_verification ON information_items(verification_status);

-- =============================================================================
-- CREATE/UPDATE NEUTRAL VIEWS
-- =============================================================================

-- Drop and recreate views with correct column references
DROP VIEW IF EXISTS fact_verification_summary;

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
LEFT JOIN information_items ii ON af.source_information_id = ii.id
LEFT JOIN entities e ON af.subject_entity_id = e.id;

-- =============================================================================
-- CREATE NEUTRAL FUNCTIONS
-- =============================================================================

-- Function to add to chain of custody (updated version)
CREATE OR REPLACE FUNCTION add_custody_entry(
    p_information_id UUID,
    p_actor_id UUID,
    p_action TEXT,
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    custody_entry JSONB;
    new_entry_id UUID;
BEGIN
    new_entry_id := gen_random_uuid();

    custody_entry := jsonb_build_object(
        'id', new_entry_id,
        'timestamp', NOW(),
        'actor_id', p_actor_id,
        'action', p_action,
        'location', p_location,
        'notes', p_notes
    );

    UPDATE information_items
    SET chain_of_custody = COALESCE(chain_of_custody, '[]'::jsonb) || custody_entry
    WHERE id = p_information_id;

    RETURN new_entry_id;
END;
$$ LANGUAGE plpgsql;

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

SELECT 'Neutral migration completed successfully!' as status;

-- Show migration statistics
SELECT
    'atomic_facts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN fact_statement IS NOT NULL THEN 1 END) as with_fact_statement,
    COUNT(CASE WHEN classification IS NOT NULL THEN 1 END) as with_classification,
    COUNT(CASE WHEN source_information_id IS NOT NULL THEN 1 END) as with_source_ref
FROM atomic_facts
UNION ALL
SELECT
    'information_items' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN information_tier IS NOT NULL THEN 1 END) as with_tier,
    COUNT(CASE WHEN content_type IS NOT NULL THEN 1 END) as with_content_type,
    COUNT(CASE WHEN verification_status IS NOT NULL THEN 1 END) as with_verification
FROM information_items;