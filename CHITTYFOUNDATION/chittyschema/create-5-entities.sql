-- =====================================================
-- 5-ENTITY SYSTEM DEPLOYMENT FOR CHITTYCHAIN
-- Creates: people, places, things, events, authorities
-- =====================================================

-- PEOPLE (PEO) - Individuals, legal persons, entities
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Identity Information
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    legal_name TEXT NOT NULL,
    aliases TEXT[],

    -- Entity Classification
    entity_type TEXT NOT NULL CHECK (entity_type IN ('INDIVIDUAL', 'LLC', 'CORP', 'TRUST', 'PARTNERSHIP', 'GOVERNMENT', 'NGO')),
    sub_type TEXT,

    -- Identification Numbers
    ssn TEXT, -- For individuals (encrypted)
    ein TEXT, -- For entities
    foreign_id TEXT, -- For international entities

    -- Temporal Information
    date_of_birth DATE, -- For individuals
    date_of_incorporation DATE, -- For entities
    date_of_dissolution DATE,

    -- Location References
    place_of_birth_id UUID,
    incorporation_place_id UUID,
    primary_address_id UUID,

    -- Hierarchical Relationships
    parent_entity_id UUID REFERENCES people(id),

    -- Status and Verification
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISSOLVED', 'DECEASED', 'SUSPENDED')),
    verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'FLAGGED')),
    verification_method TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,

    -- GDPR Compliance
    gdpr_lawful_basis TEXT,
    gdpr_consent_status TEXT CHECK (gdpr_consent_status IN ('granted', 'withdrawn', 'not_applicable')),
    gdpr_deleted BOOLEAN DEFAULT FALSE,
    gdpr_deleted_at TIMESTAMPTZ,
    retention_period INTERVAL,

    -- Temporal Versioning
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version_number INTEGER DEFAULT 1,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_people_chitty_id ON people(chitty_id);
CREATE INDEX IF NOT EXISTS idx_people_legal_name ON people(legal_name);
CREATE INDEX IF NOT EXISTS idx_people_entity_type ON people(entity_type);
CREATE INDEX IF NOT EXISTS idx_people_parent ON people(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_people_temporal ON people(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_people_verification ON people(verification_status, verified_at);

-- PLACES (PLACE) - Locations, venues, jurisdictions
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Basic Information
    name TEXT NOT NULL,
    place_type TEXT NOT NULL CHECK (place_type IN ('ADDRESS', 'VENUE', 'JURISDICTION', 'COURT', 'GOVERNMENT_BUILDING', 'BUSINESS', 'RESIDENCE', 'LANDMARK')),
    sub_type TEXT,

    -- Address Components
    street_address TEXT,
    unit_number TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'USA',

    -- Geographic Information
    coordinates POINT, -- PostGIS point type for precise location
    elevation NUMERIC(10,2),
    timezone TEXT,

    -- Hierarchical Relationships
    parent_place_id UUID REFERENCES places(id),

    -- Jurisdiction Information
    jurisdiction_level TEXT CHECK (jurisdiction_level IN ('FEDERAL', 'STATE', 'COUNTY', 'MUNICIPAL', 'TRIBAL')),
    jurisdiction_code TEXT,
    court_type TEXT, -- For court venues

    -- Status and Verification
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEMOLISHED', 'RELOCATED')),
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID,

    -- Temporal Versioning
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version_number INTEGER DEFAULT 1,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_places_chitty_id ON places(chitty_id);
CREATE INDEX IF NOT EXISTS idx_places_type ON places(place_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_places_parent ON places(parent_place_id);
CREATE INDEX IF NOT EXISTS idx_places_jurisdiction ON places(jurisdiction_level, jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_places_temporal ON places(valid_from, valid_to);

-- THINGS (PROP) - Property, assets, objects, evidence items
CREATE TABLE IF NOT EXISTS things (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Basic Information
    name TEXT NOT NULL,
    description TEXT,
    thing_type TEXT NOT NULL CHECK (thing_type IN ('REAL_ESTATE', 'FINANCIAL_ACCOUNT', 'VEHICLE', 'DOCUMENT', 'DIGITAL_FILE', 'PHYSICAL_EVIDENCE', 'INTELLECTUAL_PROPERTY', 'ARTWORK', 'JEWELRY', 'EQUIPMENT')),
    sub_type TEXT,

    -- Physical Characteristics
    serial_number TEXT,
    model_number TEXT,
    manufacturer TEXT,
    year_manufactured INTEGER,
    physical_condition TEXT,

    -- Ownership Information
    current_owner_id UUID REFERENCES people(id),
    ownership_type TEXT CHECK (ownership_type IN ('SOLE', 'JOINT', 'TRUST', 'CORPORATE', 'GOVERNMENT')),
    ownership_percentage NUMERIC(5,2) DEFAULT 100.00,

    -- Financial Information
    current_value NUMERIC(15,2),
    currency TEXT DEFAULT 'USD',
    valuation_date DATE,
    valuation_method TEXT CHECK (valuation_method IN ('APPRAISAL', 'MARKET', 'ASSESSED', 'BOOK_VALUE', 'INSURANCE')),
    acquisition_date DATE,
    acquisition_cost NUMERIC(15,2),

    -- Location Information
    current_location_id UUID REFERENCES places(id),

    -- Digital Asset Information
    file_hash TEXT, -- SHA-256 hash for digital files
    file_size BIGINT, -- Size in bytes
    mime_type TEXT,
    media_url TEXT,

    -- Financial Account Information
    account_number TEXT, -- Encrypted
    routing_number TEXT,
    institution_name TEXT,
    institution_id TEXT,

    -- Legal Status
    chain_of_custody_required BOOLEAN DEFAULT FALSE,
    is_confidential BOOLEAN DEFAULT FALSE,
    confidentiality_level TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRANSFERRED', 'DESTROYED', 'LOST', 'SEIZED', 'DISPUTED')),

    -- Verification
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID,

    -- Temporal Versioning
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version_number INTEGER DEFAULT 1,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_things_chitty_id ON things(chitty_id);
CREATE INDEX IF NOT EXISTS idx_things_type ON things(thing_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_things_owner ON things(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_things_location ON things(current_location_id);
CREATE INDEX IF NOT EXISTS idx_things_hash ON things(file_hash);
CREATE INDEX IF NOT EXISTS idx_things_temporal ON things(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_things_confidential ON things(is_confidential, confidentiality_level);

-- EVENTS (EVNT) - Actions, transactions, incidents, occurrences
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Basic Information
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('TRANSACTION', 'INCIDENT', 'HEARING', 'FILING', 'MEETING', 'DISCOVERY', 'MOTION', 'SETTLEMENT', 'VIOLATION', 'ACQUISITION', 'TRANSFER')),
    sub_type TEXT,

    -- Temporal Information
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    timezone TEXT,
    duration_minutes INTEGER,

    -- Participants
    primary_person_id UUID REFERENCES people(id),
    secondary_person_id UUID REFERENCES people(id),
    witness_ids UUID[],

    -- Location and Objects
    location_id UUID REFERENCES places(id),
    related_thing_ids UUID[],

    -- Event Relationships
    parent_event_id UUID REFERENCES events(id),
    sequence_number INTEGER, -- Order in a sequence of related events

    -- Financial Information (for transactions)
    amount NUMERIC(15,2),
    currency TEXT DEFAULT 'USD',
    from_account_id UUID,
    to_account_id UUID,

    -- Legal Information
    legal_significance TEXT,
    statutory_deadline TIMESTAMPTZ,

    -- Status and Outcome
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'DISPUTED')),
    outcome TEXT,
    outcome_details JSONB,

    -- Evidence and Documentation
    evidence_ids UUID[],
    document_ids UUID[],

    -- Confidentiality
    is_confidential BOOLEAN DEFAULT FALSE,
    confidentiality_level TEXT,

    -- Verification
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID,

    -- Temporal Versioning
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version_number INTEGER DEFAULT 1,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_events_chitty_id ON events(chitty_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_participants ON events(primary_person_id, secondary_person_id);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_temporal ON events(valid_from, valid_to);

-- AUTHORITIES (AUTH) - Laws, regulations, precedents, rulings
CREATE TABLE IF NOT EXISTS authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chitty_id TEXT UNIQUE NOT NULL,

    -- Basic Information
    title TEXT NOT NULL,
    citation TEXT, -- Legal citation format
    authority_type TEXT NOT NULL CHECK (authority_type IN ('CONSTITUTION', 'STATUTE', 'REGULATION', 'CASE_LAW', 'COURT_ORDER', 'ADMINISTRATIVE_ORDER', 'EXECUTIVE_ORDER', 'TREATY', 'ORDINANCE')),
    sub_type TEXT,

    -- Source Information
    issuing_authority TEXT NOT NULL,
    jurisdiction_id UUID REFERENCES places(id),
    court_level TEXT CHECK (court_level IN ('SUPREME', 'APPELLATE', 'TRIAL', 'ADMINISTRATIVE')),

    -- Temporal Information
    effective_date DATE,
    expiration_date DATE,
    decision_date DATE,
    publication_date DATE,

    -- Legal Hierarchy
    parent_authority_id UUID REFERENCES authorities(id),
    hierarchy_level INTEGER, -- 1=Constitutional, 2=Statutory, 3=Regulatory, etc.
    precedential_value TEXT CHECK (precedential_value IN ('BINDING', 'PERSUASIVE', 'INFORMATIONAL', 'SUPERSEDED')),

    -- Content
    full_text TEXT,
    summary TEXT,
    key_holdings TEXT[],

    -- Legal Relationships
    cites_authorities UUID[], -- Authorities this one cites
    cited_by_authorities UUID[], -- Authorities that cite this one
    amended_by_authorities UUID[], -- Authorities that amend this one
    superseded_by_authority UUID REFERENCES authorities(id),

    -- Status
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'REPEALED', 'EXPIRED', 'PENDING')),

    -- Access Information
    url TEXT,
    access_level TEXT DEFAULT 'PUBLIC' CHECK (access_level IN ('PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'CLASSIFIED')),

    -- Verification
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    verified_by UUID,

    -- Temporal Versioning
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT 'infinity',
    version_number INTEGER DEFAULT 1,

    -- Metadata and Audit
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_authorities_chitty_id ON authorities(chitty_id);
CREATE INDEX IF NOT EXISTS idx_authorities_citation ON authorities(citation);
CREATE INDEX IF NOT EXISTS idx_authorities_type ON authorities(authority_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_authorities_jurisdiction ON authorities(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_authorities_hierarchy ON authorities(parent_authority_id, hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_authorities_dates ON authorities(effective_date, expiration_date);
CREATE INDEX IF NOT EXISTS idx_authorities_temporal ON authorities(valid_from, valid_to);