import { db, tables } from '../src/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Helper function to generate official ChittyID
async function generateChittyId(type: string, identifier: string): Promise<string> {
  const response = await fetch(`https://id.chitty.cc/api/generate?region=1&jurisdiction=USA&type=${type}&trust=3&identifier=${identifier}`);
  const data = await response.json();
  return data.chittyId;
}

async function seed() {
  console.log('🌱 Starting seed process...\n');

  try {
    // Create system admin user
    const adminId = crypto.randomUUID();
    const adminChittyId = await generateChittyId('P', 'admin@chittychain.local');

    console.log('Creating system admin user...');
    await db.insert(tables.users).values({
      id: adminId,
      chittyId: adminChittyId,
      name: 'System Admin',
      email: 'admin@chittychain.local',
      role: 'admin',
      barNumber: null,
      phone: null,
      trustScore: '100.0',
      verified: true,
      lastActivity: new Date(),
      twoFAEnabled: true
    });
    console.log(`✓ Admin created with ChittyID: ${adminChittyId}`);

    // Create a sample litigator
    const litigatorId = crypto.randomUUID();
    const litigatorChittyId = await generateChittyId('P', 'nicholas.bianchi@law.example.com');

    console.log('Creating sample litigator...');
    await db.insert(tables.users).values({
      id: litigatorId,
      chittyId: litigatorChittyId,
      name: 'Nicholas Bianchi',
      email: 'nicholas.bianchi@law.example.com',
      role: 'litigator',
      barNumber: 'IL-2019-12345',
      phone: '312-555-0100',
      trustScore: '85.0',
      verified: true,
      lastActivity: new Date(),
      twoFAEnabled: false
    });
    console.log(`✓ Litigator created with ChittyID: ${litigatorChittyId}`);

    // Create the Arias v. Bianchi case
    const caseChittyId = await generateChittyId('D', '2024D007847');

    console.log('\nCreating Arias v. Bianchi case...');
    const [insertedCase] = await db.insert(tables.cases).values({
      docketNumber: '2024D007847',
      jurisdiction: 'ILLINOIS-COOK',
      title: 'Arias v. Bianchi',
      status: 'open',
      createdBy: litigatorId,
      filingDate: '2024-01-15',
      judgeAssigned: 'Hon. Patricia Williams'
    }).returning({ id: tables.cases.id });

    const caseId = insertedCase.id;
    console.log(`✓ Case created with ChittyID: ${caseChittyId}`);

    // Load and create evidence for each PIN
    const pinsPath = path.join(process.cwd(), 'data', 'pins.json');
    const pinsData = JSON.parse(fs.readFileSync(pinsPath, 'utf-8'));

    console.log('\nCreating property evidence for PINs...');
    for (const pinData of pinsData) {
      const evidenceId = crypto.randomUUID();
      const fileHash = crypto
        .createHash('sha256')
        .update(`${evidenceId}:${pinData.pin}:${Date.now()}`)
        .digest('hex');
      const evidenceChittyId = await generateChittyId('D', fileHash);
      const propChittyId = await generateChittyId('L', `PIN:${pinData.pin}`);

      await db.insert(tables.masterEvidence).values({
        id: evidenceId,
        caseId,
        submittedBy: litigatorId,
        title: `Cook County Property Record - PIN ${pinData.pin}`,
        content: `Property located at ${pinData.address} ${pinData.unit}, ${pinData.city}, ${pinData.state} ${pinData.zip}`,
        metadata: {
          ...pinData,
          propertyChittyId: propChittyId
        },
        mediaUrl: null,
        fileHash,
        type: 'financial_record',
        tier: 'GOVERNMENT',
        weight: '0.95',
        source: 'Cook County Assessor',
        sourceVerification: 'Pending',
        authenticationMethod: 'County Records',
        isConfidential: false,
        dateReceived: new Date(),
        dateOfEvidence: null,
        mintingStatus: 'Pending',
        blockNumber: null,
        transactionHash: null,
        auditNotes: `ChittyID: ${evidenceChittyId}; PropertyChittyID: ${propChittyId}`
      });

      console.log(`✓ Evidence created for PIN ${pinData.pin}`);
      console.log(`  - Evidence ChittyID: ${evidenceChittyId}`);
      console.log(`  - Property ChittyID: ${propChittyId}`);

      // Create chain of custody entry
      await db.insert(tables.chainOfCustody).values({
        id: crypto.randomUUID(),
        evidenceId,
        action: 'CREATED',
        performedBy: litigatorId,
        transferMethod: 'SEED_IMPORT',
        integrityCheckMethod: 'SHA256',
        integrityVerified: true,
        notes: 'Initial import from PIN data',
        timestamp: new Date()
      });
    }

    // Create sample atomic facts
    console.log('\nCreating atomic facts...');

    const facts = [
      {
        text: 'All four properties were acquired before the marriage date of August 15, 2023',
        factType: 'TEMPORAL',
        classificationLevel: 'FACT',
        weight: '0.95'
      },
      {
        text: 'Nicholas Bianchi is sole owner on deeds for properties at 541 W Addison and 4343 N Clarendon',
        factType: 'STATUS',
        classificationLevel: 'FACT',
        weight: '0.90'
      },
      {
        text: 'ARIBIA LLC, with Nicholas Bianchi as sole member, owns 550 W Surf St Unit C-211',
        factType: 'RELATIONSHIP',
        classificationLevel: 'FACT',
        weight: '0.90'
      },
      {
        text: 'No spouse signatures appear on any property acquisition documents',
        factType: 'STATUS',
        classificationLevel: 'FACT',
        weight: '0.85'
      }
    ];

    for (const factData of facts) {
      const factId = crypto.randomUUID();
      // @ts-ignore - ChittyID generated but not used in current seed implementation
      const _factChittyId = await generateChittyId('D', `${caseId}:${factData.text}`);

      await db.insert(tables.atomicFacts).values({
        id: factId,
        caseId,
        evidenceId: null,
        assertedBy: litigatorId,
        text: factData.text,
        extractedFrom: 'Property Records Analysis',
        tags: ['property', 'ownership', 'premarital'],
        factType: factData.factType,
        locationInDocument: null,
        classificationLevel: factData.classificationLevel,
        weight: factData.weight,
        credibilityFactors: ['government_record', 'deed_verified'],
        timestampedAt: new Date(),
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
        chittychainStatus: 'Pending',
        verificationMethod: null
      });

      console.log(`✓ Fact created: "${factData.text.substring(0, 50)}..."`);
    }

    // Create audit log entries
    console.log('\nCreating audit log entries...');
    await db.insert(tables.auditLog).values({
      id: crypto.randomUUID(),
      userId: adminId,
      caseId,
      entity: 'seed',
      entityId: caseId,
      action: 'SEED_COMPLETE',
      ipAddress: '127.0.0.1',
      sessionId: 'seed-script',
      success: true,
      metadata: {
        users: 2,
        cases: 1,
        evidence: pinsData.length,
        facts: facts.length
      }
    });

    console.log('\n✅ Seed completed successfully!');
    console.log(`
Summary:
--------
- Users created: 2
- Case created: ${caseId}
- Evidence items: ${pinsData.length}
- Atomic facts: ${facts.length}
- Chain of custody entries: ${pinsData.length}

You can now start the server with: npm run dev
    `);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });