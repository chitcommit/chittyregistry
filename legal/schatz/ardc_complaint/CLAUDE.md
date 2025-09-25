# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARDC (Attorney Registration and Disciplinary Commission) complaint evidence processing system for the matter of Nicholas Bianchi vs. Jonathan Schatz. This is a legal evidence management and processing system integrated with ChittyOS Framework for secure evidence handling, blockchain verification, and automated document analysis.

## Essential Commands

### Evidence Processing
```bash
# Process Schatz evidence through ChittyOS intake
./schatz_intake_processor.sh

# Run Python evidence processor for database management
python3 schatz_evidence_processor.py

# Generate evidence report from PostgreSQL database
psql $NEON_CONNECTION_STRING -c "SELECT chitty_id, filename, schatz_relevance_score FROM evidence_ledger WHERE schatz_relevance_score >= 5 ORDER BY schatz_relevance_score DESC;"
```

### ChittyOS Integration (EXECUTE IMMEDIATELY)
```bash
/chittycheck        # Run ChittyID compliance validation
/status            # Check system and evidence processing status
/deploy            # Deploy to ChittyOS evidence platform
/commit            # Commit with ChittyID for chain of custody
```

## Architecture

The system consists of three primary components working together to process legal evidence:

### 1. Evidence Processing Pipeline
- **schatz_evidence_processor.py**: PostgreSQL-based evidence ledger with Neon database integration and ChittyID service
- **schatz_intake_processor.sh**: Bash script that scans Google Drive locations for Schatz-related documents
- **Database Schema**: Two PostgreSQL tables - `evidence_ledger` for document tracking and `schatz_timeline` for case chronology
- **Connection Pooling**: ThreadedConnectionPool for high-performance database operations

### 2. Document Classification System
Documents are classified and scored based on:
- **Relevance Score** (0-10): Automated scoring based on content analysis
- **Document Types**: EMAIL, PDF, TEXT with specific metadata extraction
- **Evidence Categories**: attorney_communication, administrative, critical_evidence
- **Legal Privilege**: Tracking for privilege assertions

### 3. ChittyOS Integration
- **ChittyID Minting**: Critical evidence receives blockchain verification through hard minting ($4/document)
- **Soft Minting**: Routine communications use cost-effective soft minting ($0.01/document)
- **Evidence API**: Integration with evidence.chitty.cc for processing and ledger.chitty.cc for blockchain

## Key Evidence Locations

The system scans these Google Drive locations:
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/My Drive`
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/LITIGATION_VAULT`
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/Arias V Bianchi`

## Critical Evidence Files

### Primary Evidence
- **EXHIBIT_K-1_DECEMBER_2_2024_EMAIL**: Key email showing attorney negligence (hard mint required)
- **ARDC_COMPLAINT_DRAFT.html**: Draft complaint with specific rule violations documented
- **PostgreSQL Database**: Neon-hosted database containing all processed evidence with enterprise-grade reliability

### Manifests
- **SCHATZ_MINTING_MANIFEST.json**: ChittyID minting strategy for evidence preservation
- **CHITTYOS_ROUTER_MANIFEST.json**: Routing configuration for legal processing node
- **CLOUDFLARE_AI_WORKER_MANIFEST.json**: AI processing instructions for document analysis

## Development Workflow

### Initial Setup
```bash
# 1. Configure required environment variables
export CHITTY_ID_TOKEN=your_token_here
export NEON_CONNECTION_STRING=postgresql://user:pass@host/database

# 2. Validate environment
/chittycheck

# 3. Initialize evidence database (creates tables if not exists)
python3 schatz_evidence_processor.py
```

### Processing New Evidence
```bash
# 1. Scan for new documents
./schatz_intake_processor.sh

# 2. Process through Python analyzer
python3 schatz_evidence_processor.py

# 3. Generate updated report
sqlite3 schatz_evidence.db < generate_report.sql
```

### Evidence Verification
```bash
# Check evidence integrity in PostgreSQL
psql $NEON_CONNECTION_STRING -c "SELECT chitty_id, file_hash, schatz_relevance_score FROM evidence_ledger ORDER BY schatz_relevance_score DESC LIMIT 10;"

# Verify database connection
psql $NEON_CONNECTION_STRING -c "SELECT COUNT(*) as total_evidence FROM evidence_ledger;"

# Verify ChittyID minting status
curl -H "Authorization: Bearer $CHITTY_ID_TOKEN" https://id.chitty.cc/v1/verify
```

## ARDC Compliance Requirements

The system tracks Illinois Rules of Professional Conduct violations:
- **Rule 1.1**: Competence failures
- **Rule 1.3**: Diligence violations
- **Rule 1.4**: Communication breakdowns
- **Rule 1.16**: Improper withdrawal/abandonment
- **Rule 137**: Sanctions for false pleadings

## ChittyID Integration Requirements

**CRITICAL**: All evidence IDs MUST be minted from https://id.chitty.cc
- NO local ID generation allowed
- Token required: `CHITTY_ID_TOKEN` environment variable
- Database required: `NEON_CONNECTION_STRING` environment variable
- Format: `CHITTY-{ENTITY}-{SEQUENCE}-{CHECKSUM}`
- Entities: EVIDENCE, EMAIL, EVNT, FACT
- PostgreSQL with connection pooling for enterprise reliability
