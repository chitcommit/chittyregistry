#!/usr/bin/env tsx
/**
 * Test script for database migration functionality
 * Creates sample data and tests transformation mappings
 */

import { DatabaseMigrator, type MigrationConfig } from './migrate-databases.js';
import chalk from 'chalk';

interface TestData {
  evidence: any[];
  facts: any[];
  cases: any[];
  users: any[];
}

// Sample legacy data for testing
const sampleData: TestData = {
  evidence: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      filename: 'contract_2024.pdf',
      content: 'Employment contract between parties',
      case_id: '456e7890-e89b-12d3-a456-426614174001',
      uploaded_by: '789e0123-e89b-12d3-a456-426614174002',
      created_at: '2024-01-15T10:30:00Z',
      file_size: 1024000,
      hash: 'abc123def456'
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174003',
      title: 'Email Communication',
      description: 'Email thread regarding contract terms',
      type: 'communication',
      reliability: 'verified',
      case_id: '456e7890-e89b-12d3-a456-426614174001',
      submitted_by: '789e0123-e89b-12d3-a456-426614174002',
      submitted_at: '2024-01-16T14:20:00Z'
    }
  ],
  facts: [
    {
      id: '333e4567-e89b-12d3-a456-426614174004',
      statement: 'Employment started on January 1, 2024',
      document_id: '123e4567-e89b-12d3-a456-426614174000',
      confidence: 0.95,
      fact_type: 'date',
      classification: 'fact',
      created_at: '2024-01-15T11:00:00Z'
    },
    {
      id: '433e4567-e89b-12d3-a456-426614174005',
      text: 'Salary amount is $75,000 annually',
      evidence_id: '123e4567-e89b-12d3-a456-426614174000',
      weight: 0.9,
      type: 'amount',
      level: 'observation',
      created_at: '2024-01-15T11:15:00Z'
    }
  ],
  cases: [
    {
      id: '456e7890-e89b-12d3-a456-426614174001',
      case_name: 'Smith vs. Acme Corp Employment Dispute',
      docket_number: 'CV-2024-001234',
      court: 'Cook County Circuit Court',
      status: 'active',
      filing_date: '2024-01-10T00:00:00Z',
      assigned_attorney: '789e0123-e89b-12d3-a456-426614174002',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-16T16:30:00Z'
    }
  ],
  users: [
    {
      id: '789e0123-e89b-12d3-a456-426614174002',
      email: 'j.attorney@lawfirm.com',
      full_name: 'Jane Attorney',
      role: 'attorney',
      organization: 'Smith & Associates Law Firm',
      is_active: true,
      created_at: '2023-12-01T00:00:00Z',
      last_login: '2024-01-16T08:30:00Z'
    },
    {
      id: '889e0123-e89b-12d3-a456-426614174006',
      username: 'paralegal.bob',
      name: 'Bob Paralegal',
      user_type: 'paralegal',
      company: 'Smith & Associates Law Firm',
      status: 'active',
      created_at: '2024-01-05T00:00:00Z'
    }
  ]
};

async function testMigration() {
  console.log(chalk.blue('🧪 Testing ChittySchema Database Migration\n'));

  const config: MigrationConfig = {
    sourceType: 'postgresql',
    targetSchema: 'public',
    preserveIds: false,
    batchSize: 100,
    dryRun: true
  };

  const migrator = new DatabaseMigrator(config);

  // Test each transformation function
  console.log(chalk.yellow('Testing Evidence Transformation...'));
  const transformedEvidence = sampleData.evidence.map((record, index) => {
    try {
      const transformed = (migrator as any).mapEvidence(record);
      console.log(chalk.green(`✅ Evidence ${index + 1}:`), {
        originalId: record.id,
        chittyId: transformed.chittyId,
        title: transformed.title,
        type: transformed.type,
        tier: transformed.tier
      });
      return transformed;
    } catch (error) {
      console.error(chalk.red(`❌ Evidence ${index + 1} failed:`), error);
      return null;
    }
  }).filter(Boolean);

  console.log(chalk.yellow('\nTesting Facts Transformation...'));
  const transformedFacts = sampleData.facts.map((record, index) => {
    try {
      const transformed = (migrator as any).mapFacts(record);
      console.log(chalk.green(`✅ Fact ${index + 1}:`), {
        originalId: record.id,
        chittyId: transformed.chittyId,
        text: transformed.text.substring(0, 50) + '...',
        factType: transformed.factType,
        weight: transformed.weight
      });
      return transformed;
    } catch (error) {
      console.error(chalk.red(`❌ Fact ${index + 1} failed:`), error);
      return null;
    }
  }).filter(Boolean);

  console.log(chalk.yellow('\nTesting Cases Transformation...'));
  const transformedCases = sampleData.cases.map((record, index) => {
    try {
      const transformed = (migrator as any).mapCases(record);
      console.log(chalk.green(`✅ Case ${index + 1}:`), {
        originalId: record.id,
        chittyId: transformed.chittyId,
        title: transformed.title,
        docketNumber: transformed.docketNumber,
        status: transformed.status
      });
      return transformed;
    } catch (error) {
      console.error(chalk.red(`❌ Case ${index + 1} failed:`), error);
      return null;
    }
  }).filter(Boolean);

  console.log(chalk.yellow('\nTesting Users Transformation...'));
  const transformedUsers = sampleData.users.map((record, index) => {
    try {
      const transformed = (migrator as any).mapUsers(record);
      console.log(chalk.green(`✅ User ${index + 1}:`), {
        originalId: record.id,
        chittyId: transformed.chittyId,
        email: transformed.email,
        name: transformed.name,
        role: transformed.role
      });
      return transformed;
    } catch (error) {
      console.error(chalk.red(`❌ User ${index + 1} failed:`), error);
      return null;
    }
  }).filter(Boolean);

  // Test data type mappings
  console.log(chalk.yellow('\nTesting Data Type Mappings...'));

  const evidenceTypes = ['document', 'image', 'email', 'financial', 'unknown'];
  evidenceTypes.forEach(type => {
    const mapped = (migrator as any).mapEvidenceType(type);
    console.log(chalk.blue(`Evidence Type: ${type} → ${mapped}`));
  });

  const evidenceTiers = ['government', 'verified', 'witness', 'unverified', 'unknown'];
  evidenceTiers.forEach(tier => {
    const mapped = (migrator as any).mapEvidenceTier(tier);
    console.log(chalk.blue(`Evidence Tier: ${tier} → ${mapped}`));
  });

  const factTypes = ['date', 'amount', 'admission', 'location', 'unknown'];
  factTypes.forEach(type => {
    const mapped = (migrator as any).mapFactType(type);
    console.log(chalk.blue(`Fact Type: ${type} → ${mapped}`));
  });

  const userRoles = ['admin', 'attorney', 'paralegal', 'witness', 'unknown'];
  userRoles.forEach(role => {
    const mapped = (migrator as any).mapUserRole(role);
    console.log(chalk.blue(`User Role: ${role} → ${mapped}`));
  });

  // Summary
  console.log(chalk.green('\n✅ Migration Test Summary:'));
  console.log(`Evidence Records Transformed: ${transformedEvidence.length}/${sampleData.evidence.length}`);
  console.log(`Fact Records Transformed: ${transformedFacts.length}/${sampleData.facts.length}`);
  console.log(`Case Records Transformed: ${transformedCases.length}/${sampleData.cases.length}`);
  console.log(`User Records Transformed: ${transformedUsers.length}/${sampleData.users.length}`);

  // Test ChittyID generation patterns
  console.log(chalk.yellow('\nTesting ChittyID Patterns...'));
  const evidenceIds = transformedEvidence.map(e => e.chittyId);
  const factIds = transformedFacts.map(f => f.chittyId);
  const caseIds = transformedCases.map(c => c.chittyId);
  const userIds = transformedUsers.map(u => u.chittyId);

  console.log('Evidence ChittyIDs:', evidenceIds);
  console.log('Fact ChittyIDs:', factIds);
  console.log('Case ChittyIDs:', caseIds);
  console.log('User ChittyIDs:', userIds);

  // Verify ID format
  const allIds = [...evidenceIds, ...factIds, ...caseIds, ...userIds];
  const validIds = allIds.filter(id => /^CHITTY-[A-Z]+-[A-F0-9]{16}$/.test(id));

  console.log(chalk.green(`\n✅ ChittyID Format Validation: ${validIds.length}/${allIds.length} valid`));

  if (validIds.length === allIds.length) {
    console.log(chalk.green('🎉 All migration transformations successful!'));
  } else {
    console.log(chalk.red('❌ Some ChittyIDs failed format validation'));
  }
}

// Run test if executed directly
if (process.argv[1] && process.argv[1].endsWith('test-migration.ts')) {
  testMigration().catch(console.error);
}

export { testMigration, sampleData };