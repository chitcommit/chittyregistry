#!/usr/bin/env python3
"""
Jonathan Schatz Evidence Processor
ChittyOS Universal Intake Integration
"""

import os
import hashlib
import json
import psycopg2
import psycopg2.extras
import psycopg2.pool
import requests
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from contextlib import contextmanager

class SchatzEvidenceProcessor:
    def __init__(self, connection_string=None, pool_size=5):
        self.connection_string = connection_string or os.environ.get('NEON_CONNECTION_STRING')
        if not self.connection_string:
            raise ValueError("NEON_CONNECTION_STRING environment variable not set")

        # Initialize connection pool for better performance
        try:
            self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                1, pool_size, self.connection_string
            )
        except psycopg2.Error as e:
            raise RuntimeError(f"Failed to create database connection pool: {e}")

        self.init_database()

    @contextmanager
    def get_db_connection(self):
        """Get database connection from pool with automatic cleanup"""
        conn = None
        try:
            conn = self.connection_pool.getconn()
            yield conn
        except psycopg2.Error as e:
            if conn:
                conn.rollback()
            raise RuntimeError(f"Database operation failed: {e}")
        finally:
            if conn:
                self.connection_pool.putconn(conn)
        
    def init_database(self):
        """Initialize PostgreSQL evidence database"""
        with self.get_db_connection() as conn:
            cursor = conn.cursor()

        # Create evidence ledger table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evidence_ledger (
                chitty_id VARCHAR(255) PRIMARY KEY,
                original_path TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_hash VARCHAR(64) NOT NULL,
                file_size BIGINT,
                content_type VARCHAR(100),
                created_at TIMESTAMP,
                modified_at TIMESTAMP,
                ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                schatz_relevance_score INTEGER,
                document_type VARCHAR(50),
                email_from TEXT,
                email_to TEXT,
                email_subject TEXT,
                email_date TEXT,
                tags TEXT,
                summary TEXT,
                legal_privilege VARCHAR(100),
                evidence_category VARCHAR(100)
            )
        ''')

        # Create Schatz case timeline table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schatz_timeline (
                id SERIAL PRIMARY KEY,
                date TEXT,
                event_type VARCHAR(100),
                description TEXT,
                evidence_id VARCHAR(255),
                document_reference TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evidence_id) REFERENCES evidence_ledger (chitty_id)
            )
        ''')

            conn.commit()
    
    def generate_chitty_id(self, filepath):
        """Request ChittyOS universal ID from central service"""
        # Get ChittyID token from environment
        chitty_token = os.environ.get('CHITTY_ID_TOKEN')
        if not chitty_token:
            raise ValueError("CHITTY_ID_TOKEN environment variable not set")

        # Prepare metadata for ID minting
        file_stats = os.stat(filepath)
        metadata = {
            "entity_type": "EVIDENCE",
            "filepath": filepath,
            "file_size": file_stats.st_size,
            "file_mtime": file_stats.st_mtime,
            "case": "ARDC_SCHATZ_2025",
            "domain": "LEGAL"
        }

        # Request ID from ChittyID service
        try:
            response = requests.post(
                "https://id.chitty.cc/v1/mint",
                headers={
                    "Authorization": f"Bearer {chitty_token}",
                    "Content-Type": "application/json"
                },
                json=metadata,
                timeout=10
            )

            if response.status_code == 200:
                return response.json().get('chitty_id')
            else:
                # Service error - raise exception to stop processing
                raise RuntimeError(f"ChittyID service error: {response.status_code} - Cannot proceed without valid ChittyID")

        except requests.exceptions.RequestException as e:
            # Connection failed - raise exception to stop processing
            raise RuntimeError(f"Failed to connect to ChittyID service: {e} - Cannot proceed without valid ChittyID")
    
    def calculate_file_hash(self, filepath):
        """Calculate SHA256 hash of file"""
        hasher = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def extract_email_metadata(self, filepath):
        """Extract email metadata from .eml files"""
        metadata = {}
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
                # Extract basic email headers
                lines = content.split('\n')
                for line in lines[:50]:  # Check first 50 lines for headers
                    if line.startswith('From:'):
                        metadata['from'] = line[5:].strip()
                    elif line.startswith('To:'):
                        metadata['to'] = line[3:].strip()
                    elif line.startswith('Subject:'):
                        metadata['subject'] = line[8:].strip()
                    elif line.startswith('Date:'):
                        metadata['date'] = line[5:].strip()
                        
        except Exception as e:
            print(f"Error processing email {filepath}: {e}")
            
        return metadata
    
    def assess_schatz_relevance(self, filepath, content_sample=""):
        """Score document relevance to Schatz case (0-10)"""
        score = 0
        filepath_lower = filepath.lower()
        content_lower = content_sample.lower()
        
        # High relevance indicators
        if 'schatz' in filepath_lower or 'schatz' in content_lower:
            score += 8
        if 'jonathanschatz@allenglassman.com' in content_lower:
            score += 9
        if 'allen glassman' in content_lower:
            score += 6
        
        # Medium relevance indicators  
        if any(term in content_lower for term in ['attorney', 'legal', 'counsel']):
            score += 3
        if any(term in content_lower for term in ['retainer', 'billing', 'invoice']):
            score += 4
            
        return min(score, 10)
    
    def process_document(self, filepath):
        """Process a single document into evidence ledger"""
        try:
            chitty_id = self.generate_chitty_id(filepath)
            file_hash = self.calculate_file_hash(filepath)
            file_stats = os.stat(filepath)
            
            # Determine document type and extract metadata
            filename = os.path.basename(filepath)
            email_metadata = {}
            content_sample = ""
            
            if filepath.endswith('.eml'):
                email_metadata = self.extract_email_metadata(filepath)
                document_type = "EMAIL"
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content_sample = f.read(10000)  # First 10KB
                except:
                    pass
            elif filepath.endswith('.pdf'):
                document_type = "PDF"
            elif filepath.endswith('.txt'):
                document_type = "TEXT"
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content_sample = f.read(5000)  # First 5KB
                except:
                    pass
            else:
                document_type = "UNKNOWN"
            
            # Calculate relevance score
            relevance_score = self.assess_schatz_relevance(filepath, content_sample)
            
            # Insert into database
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO evidence_ledger
                (chitty_id, original_path, filename, file_hash, file_size, content_type,
                 created_at, modified_at, schatz_relevance_score, document_type,
                 email_from, email_to, email_subject, email_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (chitty_id) DO UPDATE SET
                    original_path = EXCLUDED.original_path,
                    filename = EXCLUDED.filename,
                    file_hash = EXCLUDED.file_hash,
                    file_size = EXCLUDED.file_size,
                    content_type = EXCLUDED.content_type,
                    modified_at = EXCLUDED.modified_at,
                    schatz_relevance_score = EXCLUDED.schatz_relevance_score,
                    document_type = EXCLUDED.document_type,
                    email_from = EXCLUDED.email_from,
                    email_to = EXCLUDED.email_to,
                    email_subject = EXCLUDED.email_subject,
                    email_date = EXCLUDED.email_date
            ''', (
                chitty_id,
                filepath,
                filename,
                file_hash,
                file_stats.st_size,
                document_type,
                datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                relevance_score,
                document_type,
                email_metadata.get('from', ''),
                email_metadata.get('to', ''),
                email_metadata.get('subject', ''),
                email_metadata.get('date', '')
            ))

                conn.commit()
            
            print(f"✓ Processed: {filename} [ChittyID: {chitty_id}] [Relevance: {relevance_score}/10]")
            return chitty_id
            
        except Exception as e:
            print(f"✗ Error processing {filepath}: {e}")
            return None
    
    def scan_directory(self, directory):
        """Recursively scan directory for relevant documents"""
        print(f"Scanning directory: {directory}")
        processed_count = 0
        
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(('.eml', '.msg', '.pdf', '.txt', '.docx')):
                    filepath = os.path.join(root, file)
                    chitty_id = self.process_document(filepath)
                    if chitty_id:
                        processed_count += 1
        
        print(f"Processed {processed_count} documents")
        return processed_count
    
    def generate_report(self):
        """Generate evidence report for ARDC complaint"""
        with self.get_db_connection() as conn:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get all Schatz-relevant documents
        cursor.execute('''
            SELECT * FROM evidence_ledger 
            WHERE schatz_relevance_score >= 5 
            ORDER BY schatz_relevance_score DESC, ingested_at
        ''')
        
        results = cursor.fetchall()
        
        report = f"""
# JONATHAN SCHATZ - EVIDENCE LEDGER REPORT
Generated: {datetime.now().isoformat()}
Total Relevant Documents: {len(results)}

## HIGH PRIORITY EVIDENCE (Score 8-10)
"""
        
        high_priority = [r for r in results if r['schatz_relevance_score'] >= 8]
        for doc in high_priority:
            report += f"- **{doc['filename']}** (ChittyID: {doc['chitty_id']})\n"
            report += f"  Path: {doc['original_path']}\n"
            report += f"  Type: {doc['document_type']} | Score: {doc['schatz_relevance_score']}/10\n"
            if doc['email_from']:
                report += f"  From: {doc['email_from']} | To: {doc['email_to']}\n"
                report += f"  Subject: {doc['email_subject']}\n"
            report += "\n"
        
        report += "\n## MEDIUM PRIORITY EVIDENCE (Score 5-7)\n"
        medium_priority = [r for r in results if 5 <= r['schatz_relevance_score'] < 8]
        for doc in medium_priority:
            report += f"- {doc['filename']} (Score: {doc['schatz_relevance_score']}/10)\n"

        # Connection automatically closed by context manager
        
        # Save report
        report_path = "SCHATZ_EVIDENCE_REPORT.md"
        with open(report_path, 'w') as f:
            f.write(report)
        
        print(f"Report generated: {report_path}")
        return report

if __name__ == "__main__":
    # Ensure required environment variables are configured
    if not os.environ.get('CHITTY_ID_TOKEN'):
        print("ERROR: CHITTY_ID_TOKEN environment variable not set")
        print("Please set: export CHITTY_ID_TOKEN=your_token_here")
        exit(1)

    if not os.environ.get('NEON_CONNECTION_STRING'):
        print("ERROR: NEON_CONNECTION_STRING environment variable not set")
        print("Please set: export NEON_CONNECTION_STRING=postgresql://user:pass@host/database")
        exit(1)

    processor = SchatzEvidenceProcessor()
    
    # Scan key directories
    directories_to_scan = [
        "/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/My Drive",
        "/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/LITIGATION_VAULT",
        "/Users/nb/Library/CloudStorage/GoogleDrive-nick@aribia.llc/Shared drives/Arias V Bianchi"
    ]
    
    for directory in directories_to_scan:
        if os.path.exists(directory):
            processor.scan_directory(directory)
        else:
            print(f"Directory not found: {directory}")
    
    # Generate report
    processor.generate_report()