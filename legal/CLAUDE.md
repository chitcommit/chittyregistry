# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Legal Technology Workspace** integrating ChittyOS Framework for comprehensive case management, evidence processing, and attorney onboarding. The repository handles multiple active legal matters with automated document extraction, blockchain verification through ChittyID, and PostgreSQL-based evidence ledgers.

## ⚠️ CRITICAL POLICY ⚠️

**VAULT-ONLY RULE:** Never use files directly from shared drives or unverified sources. ALL evidence must flow through the ChittyID intake pipeline to the ChittyOS-Data vault BEFORE use. The vault is THE ONLY source of truth. See [VAULT-ONLY-POLICY.md](VAULT-ONLY-POLICY.md).

## Essential Commands

### ChittyOS Integration (EXECUTE IMMEDIATELY)
```bash
/chittycheck        # Run ChittyID compliance validation
/status            # Check system and evidence processing status
/deploy            # Deploy to ChittyOS evidence platform
/commit            # Commit with ChittyID for chain of custody
/notebooklm        # NotebookLM sync status and management
```

### Case-Specific Operations

**Vanguard Associates (ARIAS v. BIANCHI)**:
```bash
cd vangaurd/onboarding/
npm start                          # Run main extraction system (CHITTYOS_BIANCHI_EXTRACTION.js)
./EXECUTE_BIANCHI_EXTRACTION.sh   # Execute full case extraction workflow
npm test                          # Run Jest test suite
npm run setup                     # Initialize system configuration
```

**Schatz ARDC Complaint Processing**:
```bash
cd schatz/ardc_complaint/
./schatz_intake_processor.sh      # Process Schatz evidence through ChittyOS intake
python3 schatz_evidence_processor.py  # PostgreSQL-based evidence processor
```

**Guzman Case Management**:
```bash
cd guzman/onboarding/
# Evidence processing through PostgreSQL and ChittyID system
# Documents organized in extracted/ and documents/ directories
```

**NotebookLM Integration**:
```bash
cd notebooklm/
./notebooklm-curate.sh add bianchi evidence /path/to/doc.pdf   # Add file to NotebookLM
./notebooklm-curate.sh list bianchi                            # List curated files
./notebooklm-curate.sh sync bianchi                            # Sync to Google Drive
/notebooklm status                                             # Show sync status
/notebooklm sync-all                                           # Sync all cases
```

## Architecture Overview

### Legal Case Management System
The repository implements a three-tier legal technology architecture:

1. **Evidence Processing Pipeline**
   - PostgreSQL database with Neon provider for enterprise reliability
   - ChittyID blockchain verification for document authenticity
   - Automated classification and relevance scoring
   - Chain of custody tracking with audit trails

2. **Multi-Platform Integration**
   - ChittyChat case discussions and strategy
   - The Docket court filing monitoring
   - Evidence Vault with chain of custody
   - Universal Intake client document processing
   - ChittyChain blockchain verification
   - ChittyChronicle case narratives and research
   - **NotebookLM** selective document sync for AI-powered case analysis

3. **Attorney Onboarding Automation**
   - Automated document extraction from 6+ platforms
   - Dropbox sync for attorney access
   - Real-time notifications and status updates
   - Comprehensive case handoff packages

### Key Components by Case

**ARIAS v. BIANCHI (Case No. 2024D007847)**:
- **Main System**: `vangaurd/onboarding/CHITTYOS_BIANCHI_EXTRACTION.js`
- **Client**: Nicholas Bianchi (Defendant)
- **Status**: Ready for Vanguard Associates (Rob & Kimber) onboarding
- **Integration**: Node.js application with ChittyOS service integration
- **Database**: PostgreSQL evidence ledger with Neon hosting

**Schatz ARDC Complaint**:
- **Complainant**: Nicholas Bianchi vs Jonathan Schatz
- **Evidence System**: PostgreSQL-based with ChittyID verification
- **Key Files**: `ARDC_COMPLAINT_DRAFT.html`, evidence processor scripts
- **Violations**: Illinois Rules 1.1, 1.3, 1.4, 1.16 (Competence, Diligence, Communication)

**Guzman Case Processing**:
- **Case Type**: Divorce/Family Law case
- **Status**: Document organization and evidence extraction
- **System**: PostgreSQL integration with evidence classification

## Critical Environment Variables

```bash
# ChittyID Authentication (REQUIRED)
CHITTY_ID_TOKEN=your_chittyid_token_here

# Database Connections
NEON_CONNECTION_STRING=postgresql://user:pass@host/database
DATABASE_URL=postgresql://...

# ChittyOS Services
CHITTYOS_ACCOUNT_ID=bbf9fcd845e78035b7a135c481e88541
REGISTRY_SERVICE=https://registry.chitty.cc
CHITTYID_SERVICE=https://id.chitty.cc

# Platform Integrations
NOTION_TOKEN=secret_...
DROPBOX_ACCESS_TOKEN=...
```

## Database Architecture

### PostgreSQL Evidence Ledger (Neon)
The system uses enterprise PostgreSQL with the following key tables:

- **evidence_ledger**: Main document tracking with ChittyID integration
- **legal_cases**: Case metadata and court information
- **guzman_case**: Pre-loaded case-specific evidence
- **processing_queue**: Document processing workflow
- **drive_entities**: Drive to entity mapping for classification

### Evidence Classification System
Documents are scored and classified using:
- **Relevance Score** (0-10): Automated content analysis
- **Document Types**: EMAIL, PDF, TEXT, COURT_FILING
- **Evidence Categories**: attorney_communication, critical_evidence, administrative
- **Legal Privilege**: Tracking for privilege assertions

## ChittyID Integration Requirements

**CRITICAL**: All evidence IDs MUST be minted from https://id.chitty.cc
- NO local ID generation allowed
- Token required: `CHITTY_ID_TOKEN` environment variable
- Format: `CHITTY-{ENTITY}-{SEQUENCE}-{CHECKSUM}`
- Entities: EVIDENCE, EMAIL, EVNT, FACT, CASE
- Hard minting for critical evidence ($4/document)
- Soft minting for routine communications ($0.01/document)

## Development Workflow

### Initial Setup
```bash
# 1. Configure required environment variables
export CHITTY_ID_TOKEN=your_token_here
export NEON_CONNECTION_STRING=postgresql://...

# 2. Validate ChittyOS compliance
/chittycheck

# 3. Initialize case-specific systems
cd vangaurd/onboarding/ && npm install
cd schatz/ardc_complaint/ && python3 schatz_evidence_processor.py
```

### Processing Evidence
```bash
# Scan for new documents across all cases
./vangaurd/onboarding/EXECUTE_BIANCHI_EXTRACTION.sh

# Process through evidence analysis
cd schatz/ardc_complaint/
./schatz_intake_processor.sh
python3 schatz_evidence_processor.py

# Verify database integrity
psql $NEON_CONNECTION_STRING -c "SELECT COUNT(*) FROM evidence_ledger;"
```

### Evidence Verification
```bash
# Check ChittyID minting status
curl -H "Authorization: Bearer $CHITTY_ID_TOKEN" https://id.chitty.cc/v1/verify

# Generate evidence reports
psql $NEON_CONNECTION_STRING -c "SELECT chitty_id, filename, classification FROM evidence_ledger ORDER BY intake_date DESC LIMIT 10;"

# View pending processing
psql $NEON_CONNECTION_STRING -c "SELECT * FROM pending_evidence;"
```

## Platform Integration

### Google Drive Locations Monitored:
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/My Drive`
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/LITIGATION_VAULT`
- `/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/Arias V Bianchi`

### External Systems:
- **Dropbox**: Attorney document sharing (`/Vanguard_Cases/ABC_v_XYZ/`)
- **Notion**: Case organization and atomic facts databases
- **ChittyOS Services**: Registry, router, schema, and ID services
- **Email Systems**: Gmail API integration for communication extraction

## Legal Compliance Requirements

### Evidence Handling:
- Chain of custody maintained through PostgreSQL audit logs
- All documents receive ChittyID for blockchain verification
- Legal hold tracking for litigation preservation
- Privilege detection and protection

### Professional Rules Monitoring:
- Illinois Rules of Professional Conduct compliance tracking
- Automated detection of communication breakdowns
- Timeline tracking for responsiveness requirements
- Documentation of attorney performance issues

## Security Considerations

- PostgreSQL with connection pooling for enterprise reliability
- ChittyID blockchain verification for document authenticity
- Encrypted storage for sensitive legal documents
- Audit trails for all evidence access and modifications
- Privilege protection and detection systems

## Common Operations

### Adding New Cases:
1. Create case entry in `legal_cases` table
2. Configure drive mapping in `drive_entities`
3. Set up extraction automation for specific platforms
4. Initialize evidence processing workflows

### Attorney Transitions:
1. Run comprehensive extraction for outgoing counsel
2. Package all case materials with verification
3. Sync to incoming counsel's access systems
4. Provide onboarding documentation and case status

### Evidence Processing:
1. Automated scanning of designated drive locations
2. ChittyID minting based on document classification
3. PostgreSQL storage with metadata extraction
4. Integration with case management workflows