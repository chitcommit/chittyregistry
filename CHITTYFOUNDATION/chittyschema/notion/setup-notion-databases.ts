/**
 * Automated Notion Database Setup for ChittyLedger
 * Phase 2 - Verification Layer Implementation
 */

import { Client } from '@notionhq/client';

interface NotionDatabaseConfig {
  name: string;
  description: string;
  icon: string;
  properties: Record<string, any>;
}

export class NotionSetup {
  private notion: Client;

  constructor(integrationToken: string) {
    this.notion = new Client({ auth: integrationToken });
  }

  async setupAllDatabases(): Promise<Record<string, string>> {
    console.log('🚀 Setting up ChittyLedger in Notion...');

    const databases = await this.createDatabases();
    await this.setupRelations(databases);
    await this.createViews(databases);
    await this.setupAutomations(databases);

    console.log('✅ Notion setup complete!');
    return databases;
  }

  private async createDatabases(): Promise<Record<string, string>> {
    const databaseConfigs: Record<string, NotionDatabaseConfig> = {
      people: {
        name: "People Registry",
        description: "Legal entities, parties, organizations, witnesses",
        icon: "👤",
        properties: {
          "Name": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (PEO namespace)"
          },
          "Entity Type": {
            select: {
              options: [
                { name: "INDIVIDUAL", color: "blue" },
                { name: "LLC", color: "green" },
                { name: "CORP", color: "purple" },
                { name: "TRUST", color: "orange" },
                { name: "PARTNERSHIP", color: "yellow" },
                { name: "GOVERNMENT", color: "red" },
                { name: "NGO", color: "pink" }
              ]
            }
          },
          "First Name": { rich_text: {} },
          "Last Name": { rich_text: {} },
          "Aliases": { multi_select: { options: [] } },
          "SSN/EIN": { rich_text: {} },
          "Date of Birth": { date: {} },
          "Incorporation Date": { date: {} },
          "Status": {
            select: {
              options: [
                { name: "ACTIVE", color: "green" },
                { name: "INACTIVE", color: "gray" },
                { name: "DISSOLVED", color: "red" },
                { name: "DECEASED", color: "red" },
                { name: "SUSPENDED", color: "yellow" }
              ]
            }
          },
          "Verification Status": {
            select: {
              options: [
                { name: "PENDING", color: "yellow" },
                { name: "VERIFIED", color: "green" },
                { name: "REJECTED", color: "red" },
                { name: "FLAGGED", color: "orange" }
              ]
            }
          },
          "Bar Number": { rich_text: {} },
          "License State": { rich_text: {} },
          "Trust Score": { number: { format: "number" } },
          "Notes": { rich_text: {} },
          "GDPR Status": {
            select: {
              options: [
                { name: "GRANTED", color: "green" },
                { name: "WITHDRAWN", color: "red" },
                { name: "NOT_APPLICABLE", color: "gray" }
              ]
            }
          },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      places: {
        name: "Places Registry",
        description: "Locations, jurisdictions, venues, addresses",
        icon: "📍",
        properties: {
          "Name": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (PLACE namespace)"
          },
          "Place Type": {
            select: {
              options: [
                { name: "ADDRESS", color: "blue" },
                { name: "VENUE", color: "green" },
                { name: "JURISDICTION", color: "purple" },
                { name: "COURT", color: "red" },
                { name: "GOVERNMENT_BUILDING", color: "orange" },
                { name: "BUSINESS", color: "yellow" },
                { name: "RESIDENCE", color: "pink" }
              ]
            }
          },
          "Street Address": { rich_text: {} },
          "Unit/Suite": { rich_text: {} },
          "City": { rich_text: {} },
          "State/Province": { rich_text: {} },
          "Postal Code": { rich_text: {} },
          "Country": {
            select: {
              options: [
                { name: "USA", color: "blue" },
                { name: "CANADA", color: "red" },
                { name: "MEXICO", color: "green" },
                { name: "OTHER", color: "gray" }
              ]
            }
          },
          "Coordinates": { rich_text: {} },
          "Jurisdiction Level": {
            select: {
              options: [
                { name: "FEDERAL", color: "red" },
                { name: "STATE", color: "blue" },
                { name: "COUNTY", color: "green" },
                { name: "MUNICIPAL", color: "yellow" },
                { name: "TRIBAL", color: "purple" }
              ]
            }
          },
          "Jurisdiction Code": { rich_text: {} },
          "Court Type": { rich_text: {} },
          "Timezone": {
            select: {
              options: [
                { name: "ET", color: "blue" },
                { name: "CT", color: "green" },
                { name: "MT", color: "yellow" },
                { name: "PT", color: "purple" },
                { name: "AT", color: "orange" },
                { name: "HT", color: "red" }
              ]
            }
          },
          "Status": {
            select: {
              options: [
                { name: "ACTIVE", color: "green" },
                { name: "INACTIVE", color: "gray" },
                { name: "DEMOLISHED", color: "red" },
                { name: "RELOCATED", color: "yellow" }
              ]
            }
          },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      things: {
        name: "Things Registry",
        description: "Assets, evidence, property, documents",
        icon: "📦",
        properties: {
          "Name": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (PROP namespace)"
          },
          "Thing Type": {
            select: {
              options: [
                { name: "REAL_ESTATE", color: "brown" },
                { name: "FINANCIAL_ACCOUNT", color: "green" },
                { name: "VEHICLE", color: "blue" },
                { name: "DOCUMENT", color: "gray" },
                { name: "DIGITAL_FILE", color: "purple" },
                { name: "PHYSICAL_EVIDENCE", color: "red" },
                { name: "INTELLECTUAL_PROPERTY", color: "yellow" }
              ]
            }
          },
          "Sub Type": { rich_text: {} },
          "Description": { rich_text: {} },
          "Serial Number": { rich_text: {} },
          "Model Number": { rich_text: {} },
          "Manufacturer": { rich_text: {} },
          "Ownership Type": {
            select: {
              options: [
                { name: "SOLE", color: "blue" },
                { name: "JOINT", color: "green" },
                { name: "TRUST", color: "purple" },
                { name: "CORPORATE", color: "yellow" },
                { name: "GOVERNMENT", color: "red" }
              ]
            }
          },
          "Ownership %": { number: { format: "percent" } },
          "Current Value": { number: { format: "dollar" } },
          "Currency": {
            select: {
              options: [
                { name: "USD", color: "green" },
                { name: "EUR", color: "blue" },
                { name: "CAD", color: "red" },
                { name: "OTHER", color: "gray" }
              ]
            }
          },
          "Valuation Date": { date: {} },
          "Valuation Method": {
            select: {
              options: [
                { name: "APPRAISAL", color: "blue" },
                { name: "MARKET", color: "green" },
                { name: "ASSESSED", color: "yellow" },
                { name: "BOOK_VALUE", color: "purple" },
                { name: "INSURANCE", color: "orange" }
              ]
            }
          },
          "Acquisition Date": { date: {} },
          "Acquisition Cost": { number: { format: "dollar" } },
          "File Hash": { rich_text: {} },
          "File Size": { number: {} },
          "Media URL": { url: {} },
          "Account Number": { rich_text: {} },
          "Institution": { rich_text: {} },
          "Chain of Custody Required": { checkbox: {} },
          "Confidential": { checkbox: {} },
          "Status": {
            select: {
              options: [
                { name: "ACTIVE", color: "green" },
                { name: "TRANSFERRED", color: "blue" },
                { name: "DESTROYED", color: "red" },
                { name: "LOST", color: "yellow" },
                { name: "SEIZED", color: "orange" },
                { name: "DISPUTED", color: "purple" }
              ]
            }
          },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      events: {
        name: "Events Registry",
        description: "Actions, incidents, transactions, hearings",
        icon: "⚡",
        properties: {
          "Name": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (EVNT namespace)"
          },
          "Event Type": {
            select: {
              options: [
                { name: "TRANSACTION", color: "green" },
                { name: "INCIDENT", color: "red" },
                { name: "HEARING", color: "blue" },
                { name: "FILING", color: "purple" },
                { name: "MEETING", color: "yellow" },
                { name: "DISCOVERY", color: "orange" },
                { name: "MOTION", color: "pink" },
                { name: "SETTLEMENT", color: "gray" },
                { name: "VIOLATION", color: "brown" }
              ]
            }
          },
          "Sub Type": { rich_text: {} },
          "Description": { rich_text: {} },
          "Start Time": { date: { time_zone: { name: "America/Chicago" } } },
          "End Time": { date: { time_zone: { name: "America/Chicago" } } },
          "Duration (mins)": { number: {} },
          "Amount": { number: { format: "dollar" } },
          "Currency": {
            select: {
              options: [
                { name: "USD", color: "green" },
                { name: "EUR", color: "blue" },
                { name: "CAD", color: "red" },
                { name: "OTHER", color: "gray" }
              ]
            }
          },
          "Status": {
            select: {
              options: [
                { name: "SCHEDULED", color: "yellow" },
                { name: "IN_PROGRESS", color: "blue" },
                { name: "COMPLETED", color: "green" },
                { name: "CANCELLED", color: "red" },
                { name: "POSTPONED", color: "orange" },
                { name: "DISPUTED", color: "purple" }
              ]
            }
          },
          "Outcome": { rich_text: {} },
          "Legal Significance": { rich_text: {} },
          "Confidential": { checkbox: {} },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      authorities: {
        name: "Authorities Registry",
        description: "Laws, regulations, precedents, rulings",
        icon: "⚖️",
        properties: {
          "Title": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (AUTH namespace)"
          },
          "Authority Type": {
            select: {
              options: [
                { name: "CONSTITUTION", color: "red" },
                { name: "STATUTE", color: "blue" },
                { name: "REGULATION", color: "green" },
                { name: "CASE_LAW", color: "purple" },
                { name: "COURT_ORDER", color: "orange" },
                { name: "EXECUTIVE_ORDER", color: "yellow" },
                { name: "TREATY", color: "pink" },
                { name: "ORDINANCE", color: "gray" }
              ]
            }
          },
          "Sub Type": { rich_text: {} },
          "Citation": { rich_text: {} },
          "Issuing Authority": { rich_text: {} },
          "Court Level": {
            select: {
              options: [
                { name: "SUPREME", color: "red" },
                { name: "APPELLATE", color: "blue" },
                { name: "TRIAL", color: "green" },
                { name: "ADMINISTRATIVE", color: "yellow" }
              ]
            }
          },
          "Effective Date": { date: {} },
          "Expiration Date": { date: {} },
          "Decision Date": { date: {} },
          "Publication Date": { date: {} },
          "Hierarchy Level": { number: {} },
          "Precedential Value": {
            select: {
              options: [
                { name: "BINDING", color: "red" },
                { name: "PERSUASIVE", color: "blue" },
                { name: "INFORMATIONAL", color: "gray" },
                { name: "SUPERSEDED", color: "yellow" }
              ]
            }
          },
          "Full Text": { rich_text: {} },
          "Summary": { rich_text: {} },
          "Key Holdings": { multi_select: { options: [] } },
          "Status": {
            select: {
              options: [
                { name: "ACTIVE", color: "green" },
                { name: "SUPERSEDED", color: "yellow" },
                { name: "REPEALED", color: "red" },
                { name: "EXPIRED", color: "gray" },
                { name: "PENDING", color: "blue" }
              ]
            }
          },
          "URL": { url: {} },
          "Access Level": {
            select: {
              options: [
                { name: "PUBLIC", color: "green" },
                { name: "RESTRICTED", color: "yellow" },
                { name: "CONFIDENTIAL", color: "orange" },
                { name: "CLASSIFIED", color: "red" }
              ]
            }
          },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      cases: {
        name: "Cases Registry",
        description: "Legal matters and litigation",
        icon: "⚖️",
        properties: {
          "Title": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (CASE namespace)"
          },
          "Docket Number": { rich_text: {} },
          "Case Type": {
            select: {
              options: [
                { name: "CIVIL", color: "blue" },
                { name: "CRIMINAL", color: "red" },
                { name: "ADMINISTRATIVE", color: "green" },
                { name: "FAMILY", color: "purple" },
                { name: "PROBATE", color: "orange" },
                { name: "BANKRUPTCY", color: "yellow" },
                { name: "APPELLATE", color: "pink" }
              ]
            }
          },
          "Sub Type": { rich_text: {} },
          "Judge Name": { rich_text: {} },
          "Courtroom": { rich_text: {} },
          "Filing Date": { date: {} },
          "Answer Due Date": { date: {} },
          "Discovery Deadline": { date: {} },
          "Motion Deadline": { date: {} },
          "Trial Date": { date: {} },
          "Status Conference": { date: {} },
          "Estimated Value": { number: { format: "dollar" } },
          "Settlement Amount": { number: { format: "dollar" } },
          "Attorney Fees": { number: { format: "dollar" } },
          "Court Costs": { number: { format: "dollar" } },
          "Status": {
            select: {
              options: [
                { name: "ACTIVE", color: "green" },
                { name: "CLOSED", color: "gray" },
                { name: "APPEALED", color: "blue" },
                { name: "STAYED", color: "yellow" },
                { name: "SETTLED", color: "purple" },
                { name: "DISMISSED", color: "red" }
              ]
            }
          },
          "Resolution Type": {
            select: {
              options: [
                { name: "SETTLEMENT", color: "green" },
                { name: "JUDGMENT", color: "blue" },
                { name: "DISMISSAL", color: "red" },
                { name: "DEFAULT", color: "yellow" }
              ]
            }
          },
          "Resolution Date": { date: {} },
          "Confidential": { checkbox: {} },
          "Case Summary": { rich_text: {} },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      evidence: {
        name: "Evidence Registry",
        description: "Evidence items and documentation",
        icon: "📋",
        properties: {
          "Title": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (EVID namespace)"
          },
          "Evidence Number": { rich_text: {} },
          "Evidence Type": {
            select: {
              options: [
                { name: "DOCUMENTARY", color: "blue" },
                { name: "DEMONSTRATIVE", color: "green" },
                { name: "REAL", color: "purple" },
                { name: "TESTIMONIAL", color: "yellow" },
                { name: "SCIENTIFIC", color: "red" }
              ]
            }
          },
          "Evidence Tier": {
            select: {
              options: [
                { name: "SELF_AUTHENTICATING", color: "red" },
                { name: "GOVERNMENT", color: "blue" },
                { name: "FINANCIAL_INSTITUTION", color: "green" },
                { name: "INDEPENDENT_THIRD_PARTY", color: "purple" },
                { name: "BUSINESS_RECORDS", color: "orange" },
                { name: "FIRST_PARTY_ADVERSE", color: "yellow" },
                { name: "FIRST_PARTY_FRIENDLY", color: "pink" },
                { name: "UNCORROBORATED_PERSON", color: "gray" }
              ]
            }
          },
          "Weight": { number: { format: "percent" } },
          "Submission Date": { date: {} },
          "Authentication Method": { rich_text: {} },
          "Authentication Date": { date: {} },
          "Chain of Custody Verified": { checkbox: {} },
          "Minting Status": {
            select: {
              options: [
                { name: "PENDING", color: "yellow" },
                { name: "MINTED", color: "green" },
                { name: "FAILED", color: "red" }
              ]
            }
          },
          "Block Number": { rich_text: {} },
          "Transaction Hash": { rich_text: {} },
          "Offered Date": { date: {} },
          "Admitted Date": { date: {} },
          "Admissibility Ruling": {
            select: {
              options: [
                { name: "ADMITTED", color: "green" },
                { name: "EXCLUDED", color: "red" },
                { name: "PENDING", color: "yellow" },
                { name: "CONDITIONALLY_ADMITTED", color: "blue" }
              ]
            }
          },
          "Exclusion Reason": { rich_text: {} },
          "Objections Raised": { multi_select: { options: [] } },
          "Content Summary": { rich_text: {} },
          "Status": {
            select: {
              options: [
                { name: "RECEIVED", color: "blue" },
                { name: "UNDER_REVIEW", color: "yellow" },
                { name: "AUTHENTICATED", color: "green" },
                { name: "ADMITTED", color: "purple" },
                { name: "EXCLUDED", color: "red" },
                { name: "SEALED", color: "gray" },
                { name: "RETURNED", color: "orange" }
              ]
            }
          },
          "Notes": { rich_text: {} },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      facts: {
        name: "Atomic Facts",
        description: "Granular factual assertions",
        icon: "🔍",
        properties: {
          "Fact Text": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID (FACT namespace)"
          },
          "Fact Type": {
            select: {
              options: [
                { name: "WHO", color: "blue" },
                { name: "WHAT", color: "green" },
                { name: "WHEN", color: "purple" },
                { name: "WHERE", color: "yellow" },
                { name: "WHY", color: "red" },
                { name: "HOW", color: "orange" },
                { name: "AMOUNT", color: "pink" },
                { name: "CONDITION", color: "gray" },
                { name: "RELATIONSHIP", color: "brown" },
                { name: "STATUS", color: "black" }
              ]
            }
          },
          "Location in Document": { rich_text: {} },
          "Page Number": { number: {} },
          "Line Number": { number: {} },
          "Timestamp in Media": { rich_text: {} },
          "Classification": {
            select: {
              options: [
                { name: "FACT", color: "green" },
                { name: "SUPPORTED_CLAIM", color: "blue" },
                { name: "ASSERTION", color: "yellow" },
                { name: "ALLEGATION", color: "orange" },
                { name: "CONTRADICTION", color: "red" },
                { name: "OPINION", color: "purple" },
                { name: "SPECULATION", color: "gray" }
              ]
            }
          },
          "Certainty Level": {
            select: {
              options: [
                { name: "CERTAIN", color: "green" },
                { name: "PROBABLE", color: "blue" },
                { name: "POSSIBLE", color: "yellow" },
                { name: "UNCERTAIN", color: "red" }
              ]
            }
          },
          "Weight": { number: { format: "percent" } },
          "Credibility Factors": { multi_select: { options: [] } },
          "Bias Indicators": { multi_select: { options: [] } },
          "Temporal Sequence": { number: {} },
          "Verified": { checkbox: {} },
          "Verified Date": { date: {} },
          "Verification Method": {
            select: {
              options: [
                { name: "CROSS_REFERENCE", color: "blue" },
                { name: "INDEPENDENT_SOURCE", color: "green" },
                { name: "EXPERT_ANALYSIS", color: "purple" },
                { name: "DOCUMENTARY_EVIDENCE", color: "orange" },
                { name: "WITNESS_TESTIMONY", color: "yellow" }
              ]
            }
          },
          "Discoverable": { checkbox: {} },
          "Privileged": { checkbox: {} },
          "Privilege Type": {
            select: {
              options: [
                { name: "ATTORNEY_CLIENT", color: "red" },
                { name: "WORK_PRODUCT", color: "blue" },
                { name: "SPOUSAL", color: "purple" },
                { name: "DOCTOR_PATIENT", color: "green" },
                { name: "PRIEST_PENITENT", color: "yellow" }
              ]
            }
          },
          "AI Extracted": { checkbox: {} },
          "AI Confidence": { number: { format: "percent" } },
          "AI Model": { rich_text: {} },
          "Human Reviewed": { checkbox: {} },
          "Tags": { multi_select: { options: [] } },
          "Legal Elements": { multi_select: { options: [] } },
          "Fact Date": { date: {} },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      },

      propertyPins: {
        name: "Property PINs",
        description: "Cook County property integration",
        icon: "🏠",
        properties: {
          "PIN": { title: {} },
          "ChittyID": {
            rich_text: {},
            description: "Official ChittyID"
          },
          "Legal Interest": { rich_text: {} },
          "Property Class": { rich_text: {} },
          "Building Sq Ft": { number: {} },
          "Land Sq Ft": { number: {} },
          "Year Built": { number: {} },
          "Number of Units": { number: {} },
          "Owner Name (County)": { rich_text: {} },
          "Owner Type": {
            select: {
              options: [
                { name: "INDIVIDUAL", color: "blue" },
                { name: "LLC", color: "green" },
                { name: "CORPORATION", color: "purple" },
                { name: "TRUST", color: "orange" },
                { name: "GOVERNMENT", color: "red" },
                { name: "OTHER", color: "gray" }
              ]
            }
          },
          "Acquisition Date": { date: {} },
          "Acquisition Price": { number: { format: "dollar" } },
          "Current Assessed Value": { number: { format: "dollar" } },
          "Market Value": { number: { format: "dollar" } },
          "Land Value": { number: { format: "dollar" } },
          "Building Value": { number: { format: "dollar" } },
          "Last Tax Amount": { number: { format: "dollar" } },
          "Last Tax Year": { number: {} },
          "Tax Exempt": { checkbox: {} },
          "Exemption Type": { rich_text: {} },
          "In Foreclosure": { checkbox: {} },
          "Tax Delinquent": { checkbox: {} },
          "Liens Present": { checkbox: {} },
          "Last Cook County Sync": { date: {} },
          "Sync Status": {
            select: {
              options: [
                { name: "CURRENT", color: "green" },
                { name: "STALE", color: "yellow" },
                { name: "ERROR", color: "red" },
                { name: "MANUAL_OVERRIDE", color: "blue" }
              ]
            }
          },
          "Created Date": { created_time: {} },
          "Last Modified": { last_edited_time: {} }
        }
      }
    };

    const databaseIds: Record<string, string> = {};

    for (const [key, config] of Object.entries(databaseConfigs)) {
      console.log(`📊 Creating ${config.name}...`);

      const database = await this.notion.databases.create({
        parent: {
          type: "page_id",
          page_id: process.env.NOTION_PARENT_PAGE_ID! // You'll need to provide this
        },
        title: [
          {
            type: "text",
            text: {
              content: config.name
            }
          }
        ],
        description: [
          {
            type: "text",
            text: {
              content: config.description
            }
          }
        ],
        icon: {
          type: "emoji",
          emoji: config.icon
        },
        properties: config.properties
      });

      databaseIds[key] = database.id;
      console.log(`✅ Created ${config.name} (${database.id})`);
    }

    return databaseIds;
  }

  private async setupRelations(databases: Record<string, string>): Promise<void> {
    console.log('🔗 Setting up database relations...');

    // Define all the relations that need to be created
    const relations = [
      // People relations
      { db: 'people', property: 'Primary Address', target: 'places' },
      { db: 'people', property: 'Parent Entity', target: 'people' },
      { db: 'people', property: 'Cases', target: 'cases' },
      { db: 'people', property: 'Evidence Submitted', target: 'evidence' },
      { db: 'people', property: 'Facts Asserted', target: 'facts' },
      { db: 'people', property: 'Events Participated', target: 'events' },

      // Places relations
      { db: 'places', property: 'Parent Place', target: 'places' },
      { db: 'places', property: 'Cases', target: 'cases' },
      { db: 'places', property: 'Events', target: 'events' },
      { db: 'places', property: 'People Residing', target: 'people' },
      { db: 'places', property: 'Properties', target: 'propertyPins' },

      // Things relations
      { db: 'things', property: 'Current Owner', target: 'people' },
      { db: 'things', property: 'Current Location', target: 'places' },
      { db: 'things', property: 'Related Evidence', target: 'evidence' },
      { db: 'things', property: 'Related Events', target: 'events' },
      { db: 'things', property: 'Cases', target: 'cases' },

      // Events relations
      { db: 'events', property: 'Location', target: 'places' },
      { db: 'events', property: 'Primary Person', target: 'people' },
      { db: 'events', property: 'Secondary Person', target: 'people' },
      { db: 'events', property: 'All Participants', target: 'people' },
      { db: 'events', property: 'Related Things', target: 'things' },
      { db: 'events', property: 'Parent Event', target: 'events' },
      { db: 'events', property: 'Child Events', target: 'events' },
      { db: 'events', property: 'From Account', target: 'things' },
      { db: 'events', property: 'To Account', target: 'things' },
      { db: 'events', property: 'Governing Authorities', target: 'authorities' },
      { db: 'events', property: 'Evidence Created', target: 'evidence' },
      { db: 'events', property: 'Related Facts', target: 'facts' },
      { db: 'events', property: 'Cases', target: 'cases' },

      // Authorities relations
      { db: 'authorities', property: 'Jurisdiction', target: 'places' },
      { db: 'authorities', property: 'Parent Authority', target: 'authorities' },
      { db: 'authorities', property: 'Child Authorities', target: 'authorities' },
      { db: 'authorities', property: 'Cites Authorities', target: 'authorities' },
      { db: 'authorities', property: 'Cited By', target: 'authorities' },
      { db: 'authorities', property: 'Amended By', target: 'authorities' },
      { db: 'authorities', property: 'Superseded By', target: 'authorities' },
      { db: 'authorities', property: 'Related Events', target: 'events' },
      { db: 'authorities', property: 'Related Cases', target: 'cases' },

      // Cases relations
      { db: 'cases', property: 'Jurisdiction', target: 'places' },
      { db: 'cases', property: 'Venue', target: 'places' },
      { db: 'cases', property: 'Lead Counsel', target: 'people' },
      { db: 'cases', property: 'Opposing Counsel', target: 'people' },
      { db: 'cases', property: 'All Parties', target: 'people' },
      { db: 'cases', property: 'Plaintiffs', target: 'people' },
      { db: 'cases', property: 'Defendants', target: 'people' },
      { db: 'cases', property: 'Parent Case', target: 'cases' },
      { db: 'cases', property: 'Related Cases', target: 'cases' },
      { db: 'cases', property: 'Governing Laws', target: 'authorities' },
      { db: 'cases', property: 'All Evidence', target: 'evidence' },
      { db: 'cases', property: 'All Facts', target: 'facts' },
      { db: 'cases', property: 'Key Events', target: 'events' },

      // Evidence relations
      { db: 'evidence', property: 'Case', target: 'cases' },
      { db: 'evidence', property: 'Evidence Object', target: 'things' },
      { db: 'evidence', property: 'Submitted By', target: 'people' },
      { db: 'evidence', property: 'Authenticated By', target: 'people' },
      { db: 'evidence', property: 'Foundation Witnesses', target: 'people' },
      { db: 'evidence', property: 'Legal Foundation', target: 'authorities' },
      { db: 'evidence', property: 'Key Facts', target: 'facts' },
      { db: 'evidence', property: 'Related Events', target: 'events' },

      // Facts relations
      { db: 'facts', property: 'Source Evidence', target: 'evidence' },
      { db: 'facts', property: 'Case', target: 'cases' },
      { db: 'facts', property: 'Asserted By', target: 'people' },
      { db: 'facts', property: 'Related Person', target: 'people' },
      { db: 'facts', property: 'Related Place', target: 'places' },
      { db: 'facts', property: 'Related Thing', target: 'things' },
      { db: 'facts', property: 'Related Event', target: 'events' },
      { db: 'facts', property: 'Related Authority', target: 'authorities' },
      { db: 'facts', property: 'Supporting Facts', target: 'facts' },
      { db: 'facts', property: 'Contradicting Facts', target: 'facts' },
      { db: 'facts', property: 'Dependencies', target: 'facts' },
      { db: 'facts', property: 'Verified By', target: 'people' },

      // Property PINs relations
      { db: 'propertyPins', property: 'Property', target: 'things' },
      { db: 'propertyPins', property: 'Address', target: 'places' },
      { db: 'propertyPins', property: 'Current Owner', target: 'people' },
      { db: 'propertyPins', property: 'Related Case', target: 'cases' }
    ];

    // Add relation properties to each database
    for (const relation of relations) {
      try {
        await this.notion.databases.update({
          database_id: databases[relation.db],
          properties: {
            [relation.property]: {
              relation: {
                database_id: databases[relation.target]
              }
            }
          }
        });
        console.log(`✅ Added relation: ${relation.db}.${relation.property} → ${relation.target}`);
      } catch (error) {
        console.warn(`⚠️ Failed to add relation ${relation.db}.${relation.property}:`, error.message);
      }
    }
  }

  private async createViews(databases: Record<string, string>): Promise<void> {
    console.log('👁️ Creating database views...');
    // Views would be created through the Notion UI or additional API calls
    // This is a placeholder for view creation logic
  }

  private async setupAutomations(databases: Record<string, string>): Promise<void> {
    console.log('🤖 Setting up automations...');
    // Automations would be set up through Notion's automation features
    // This is a placeholder for automation setup logic
  }
}

// Usage example
export async function setupNotionDatabases(): Promise<void> {
  const integrationToken = process.env.NOTION_INTEGRATION_TOKEN!;
  const setup = new NotionSetup(integrationToken);

  try {
    const databases = await setup.setupAllDatabases();

    console.log('\n🎉 Notion setup complete!');
    console.log('\nDatabase IDs:');
    Object.entries(databases).forEach(([name, id]) => {
      console.log(`  ${name}: ${id}`);
    });

    console.log('\nNext steps:');
    console.log('1. Configure ChittyID automation rules');
    console.log('2. Set up sync between Notion and Neon');
    console.log('3. Create custom views and dashboards');
    console.log('4. Train team on the new system');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// CLI runner
if (require.main === module) {
  setupNotionDatabases().catch(console.error);
}