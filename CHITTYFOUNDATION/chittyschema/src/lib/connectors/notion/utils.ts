/**
 * Notion Connector Utilities - Neutral Universal Framework
 *
 * Utility functions for data transformation, validation, and mapping
 * between legal terminology and neutral universal framework
 */

import {
  NeutralEntity,
  UniversalInformation,
  AtomicFact,
  EntityType,
  InformationTier,
  FactClassification,
  ValidationError
} from './types';

// =============================================================================
// LEGAL TO NEUTRAL MAPPING
// =============================================================================

/**
 * Maps legal terminology to neutral universal framework
 */
export function mapLegalToNeutral(legalData: any): any {
  const mappings = {
    // Core terminology mappings
    'evidence': 'information',
    'case': 'context',
    'legal_case': 'investigation_context',
    'witness': 'entity',
    'defendant': 'entity',
    'plaintiff': 'entity',
    'attorney': 'entity',
    'judge': 'entity',
    'court': 'entity',
    'jurisdiction': 'place',
    'legal_document': 'document',
    'testimony': 'communication',
    'deposition': 'communication',
    'exhibit': 'information_item',
    'filing': 'document',
    'motion': 'document',
    'brief': 'document',
    'order': 'document',
    'judgment': 'document',
    'verdict': 'fact',
    'allegation': 'assertion',
    'claim': 'assertion',
    'finding': 'fact',
    'ruling': 'fact',

    // Status mappings
    'pending': 'pending',
    'active': 'active',
    'closed': 'completed',
    'dismissed': 'cancelled',
    'settled': 'resolved',

    // Evidence tier mappings
    'SELF_AUTHENTICATING': 'PRIMARY_SOURCE',
    'GOVERNMENT': 'OFFICIAL_RECORD',
    'FINANCIAL_INSTITUTION': 'INSTITUTIONAL',
    'INDEPENDENT_THIRD_PARTY': 'THIRD_PARTY',
    'BUSINESS_RECORDS': 'INSTITUTIONAL',
    'FIRST_PARTY_ADVERSE': 'THIRD_PARTY',
    'FIRST_PARTY_FRIENDLY': 'REPORTED',
    'UNCORROBORATED_PERSON': 'UNVERIFIED',

    // Fact classification mappings
    'FACT': 'OBSERVATION',
    'SUPPORTED_CLAIM': 'ASSERTION',
    'ASSERTION': 'ASSERTION',
    'ALLEGATION': 'ASSERTION',
    'CONTRADICTION': 'OPINION'
  };

  return transformObjectKeys(legalData, mappings);
}

/**
 * Maps neutral framework back to legal terminology
 */
export function mapNeutralToLegal(neutralData: any): any {
  const mappings = {
    // Reverse mappings
    'information': 'evidence',
    'context': 'case',
    'investigation_context': 'legal_case',
    'entity': 'party',
    'place': 'jurisdiction',
    'document': 'legal_document',
    'communication': 'testimony',
    'information_item': 'exhibit',

    // Reverse status mappings
    'pending': 'pending',
    'active': 'active',
    'completed': 'closed',
    'cancelled': 'dismissed',
    'resolved': 'settled',

    // Reverse tier mappings
    'PRIMARY_SOURCE': 'SELF_AUTHENTICATING',
    'OFFICIAL_RECORD': 'GOVERNMENT',
    'INSTITUTIONAL': 'BUSINESS_RECORDS',
    'THIRD_PARTY': 'INDEPENDENT_THIRD_PARTY',
    'REPORTED': 'FIRST_PARTY_FRIENDLY',
    'UNVERIFIED': 'UNCORROBORATED_PERSON',

    // Reverse classification mappings
    'OBSERVATION': 'FACT',
    'ASSERTION': 'SUPPORTED_CLAIM',
    'OPINION': 'ALLEGATION'
  };

  return transformObjectKeys(neutralData, mappings);
}

// =============================================================================
// NOTION-SPECIFIC MAPPINGS
// =============================================================================

/**
 * Maps neutral data to Notion property format
 */
export function mapNeutralToNotion(data: any, entityType: string): any {
  const notionProperties: any = {};

  switch (entityType) {
    case 'entity':
      return mapEntityToNotion(data);
    case 'information':
      return mapInformationToNotion(data);
    case 'fact':
      return mapFactToNotion(data);
    default:
      return data;
  }
}

function mapEntityToNotion(entity: NeutralEntity): any {
  return {
    'ChittyID': { rich_text: [{ text: { content: entity.chittyId } }] },
    'Name': { title: [{ text: { content: entity.name } }] },
    'Entity Type': { select: { name: entity.entityType } },
    'Entity Subtype': entity.entitySubtype ? { rich_text: [{ text: { content: entity.entitySubtype } }] } : { rich_text: [] },
    'Description': entity.description ? { rich_text: [{ text: { content: entity.description } }] } : { rich_text: [] },
    'Status': { select: { name: entity.status } },
    'Visibility': { select: { name: entity.visibility } },
    'Classification': entity.classification ? { rich_text: [{ text: { content: entity.classification } }] } : { rich_text: [] },
    'Context Tags': {
      multi_select: entity.contextTags?.map(tag => ({ name: tag })) || []
    },
    'Verification Status': { select: { name: entity.verificationStatus } },
    'Access Level': { select: { name: entity.accessLevel } },
    'Metadata': entity.metadata ? { rich_text: [{ text: { content: JSON.stringify(entity.metadata) } }] } : { rich_text: [] }
  };
}

function mapInformationToNotion(info: UniversalInformation): any {
  return {
    'ChittyID': { rich_text: [{ text: { content: info.chittyId } }] },
    'Title': { title: [{ text: { content: info.title } }] },
    'Content Type': { select: { name: info.contentType } },
    'Content Format': info.contentFormat ? { rich_text: [{ text: { content: info.contentFormat } }] } : { rich_text: [] },
    'Content Summary': info.contentSummary ? { rich_text: [{ text: { content: info.contentSummary } }] } : { rich_text: [] },
    'Information Tier': { select: { name: info.informationTier } },
    'Authenticity Status': { select: { name: info.authenticityStatus } },
    'Content Hash': info.contentHash ? { rich_text: [{ text: { content: info.contentHash } }] } : { rich_text: [] },
    'Content Size': info.contentSize ? { number: info.contentSize } : { number: null },
    'Content Location': info.contentLocation ? { url: info.contentLocation } : { url: null },
    'Sensitivity Level': { select: { name: info.sensitivityLevel } },
    'Verification Status': { select: { name: info.verificationStatus } },
    'Tags': {
      multi_select: info.tags?.map(tag => ({ name: tag })) || []
    },
    'Content Date': info.contentDate ? { date: { start: info.contentDate.toISOString().split('T')[0] } } : { date: null },
    'Received Date': info.receivedDate ? { date: { start: info.receivedDate.toISOString().split('T')[0] } } : { date: null }
  };
}

function mapFactToNotion(fact: AtomicFact): any {
  return {
    'ChittyID': { rich_text: [{ text: { content: fact.chittyId } }] },
    'Fact Statement': { title: [{ text: { content: fact.factStatement } }] },
    'Fact Type': fact.factType ? { rich_text: [{ text: { content: fact.factType } }] } : { rich_text: [] },
    'Classification': { select: { name: fact.classification } },
    'Predicate': fact.predicate ? { rich_text: [{ text: { content: fact.predicate } }] } : { rich_text: [] },
    'Object Value': fact.objectValue ? { rich_text: [{ text: { content: fact.objectValue } }] } : { rich_text: [] },
    'Certainty Level': { number: fact.certaintyLevel },
    'Confidence Score': { number: fact.confidenceScore },
    'Weight': { number: fact.weight },
    'Extracted By': { select: { name: fact.extractedBy } },
    'Extraction Method': fact.extractionMethod ? { rich_text: [{ text: { content: fact.extractionMethod } }] } : { rich_text: [] },
    'Extraction Confidence': fact.extractionConfidence ? { number: fact.extractionConfidence } : { number: null },
    'Fact Timestamp': fact.factTimestamp ? { date: { start: fact.factTimestamp.toISOString() } } : { date: null },
    'Observed At': fact.observedAt ? { date: { start: fact.observedAt.toISOString() } } : { date: null },
    'Verification Status': { select: { name: fact.verificationStatus } },
    'Sensitivity Level': { select: { name: fact.sensitivityLevel } },
    'Context': fact.context ? { rich_text: [{ text: { content: JSON.stringify(fact.context) } }] } : { rich_text: [] }
  };
}

// =============================================================================
// DATA VALIDATION
// =============================================================================

/**
 * Validates neutral entity data
 */
export function validateNeutralEntity(entity: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!entity.name || entity.name.trim() === '') {
    errors.push(new ValidationError('Name is required', 'name', entity.name));
  }

  if (!entity.entityType) {
    errors.push(new ValidationError('Entity type is required', 'entityType', entity.entityType));
  }

  // Valid entity types
  const validTypes: EntityType[] = ['PEO', 'PLACE', 'PROP', 'EVNT', 'AUTH'];
  if (entity.entityType && !validTypes.includes(entity.entityType)) {
    errors.push(new ValidationError('Invalid entity type', 'entityType', entity.entityType));
  }

  // Valid status values
  const validStatuses = ['Active', 'Inactive', 'Archived', 'Deleted'];
  if (entity.status && !validStatuses.includes(entity.status)) {
    errors.push(new ValidationError('Invalid status', 'status', entity.status));
  }

  // Valid visibility values
  const validVisibilities = ['Public', 'Restricted', 'Private'];
  if (entity.visibility && !validVisibilities.includes(entity.visibility)) {
    errors.push(new ValidationError('Invalid visibility', 'visibility', entity.visibility));
  }

  return errors;
}

/**
 * Validates neutral information data
 */
export function validateNeutralInformation(info: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!info.title || info.title.trim() === '') {
    errors.push(new ValidationError('Title is required', 'title', info.title));
  }

  if (!info.contentType) {
    errors.push(new ValidationError('Content type is required', 'contentType', info.contentType));
  }

  if (!info.informationTier) {
    errors.push(new ValidationError('Information tier is required', 'informationTier', info.informationTier));
  }

  // Valid content types
  const validContentTypes = ['Document', 'Image', 'Audio', 'Video', 'Data', 'Communication', 'Physical', 'Other'];
  if (info.contentType && !validContentTypes.includes(info.contentType)) {
    errors.push(new ValidationError('Invalid content type', 'contentType', info.contentType));
  }

  // Valid information tiers
  const validTiers: InformationTier[] = ['PRIMARY_SOURCE', 'OFFICIAL_RECORD', 'INSTITUTIONAL', 'THIRD_PARTY', 'DERIVED', 'REPORTED', 'UNVERIFIED'];
  if (info.informationTier && !validTiers.includes(info.informationTier)) {
    errors.push(new ValidationError('Invalid information tier', 'informationTier', info.informationTier));
  }

  return errors;
}

/**
 * Validates neutral fact data
 */
export function validateNeutralFact(fact: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!fact.factStatement || fact.factStatement.trim() === '') {
    errors.push(new ValidationError('Fact statement is required', 'factStatement', fact.factStatement));
  }

  if (!fact.classification) {
    errors.push(new ValidationError('Classification is required', 'classification', fact.classification));
  }

  // Valid classifications
  const validClassifications: FactClassification[] = ['OBSERVATION', 'MEASUREMENT', 'ASSERTION', 'INFERENCE', 'DERIVED', 'OPINION', 'HYPOTHESIS'];
  if (fact.classification && !validClassifications.includes(fact.classification)) {
    errors.push(new ValidationError('Invalid classification', 'classification', fact.classification));
  }

  // Numeric range validations
  if (fact.certaintyLevel !== undefined && (fact.certaintyLevel < 0 || fact.certaintyLevel > 1)) {
    errors.push(new ValidationError('Certainty level must be between 0 and 1', 'certaintyLevel', fact.certaintyLevel));
  }

  if (fact.confidenceScore !== undefined && (fact.confidenceScore < 0 || fact.confidenceScore > 1)) {
    errors.push(new ValidationError('Confidence score must be between 0 and 1', 'confidenceScore', fact.confidenceScore));
  }

  if (fact.weight !== undefined && (fact.weight < 0 || fact.weight > 1)) {
    errors.push(new ValidationError('Weight must be between 0 and 1', 'weight', fact.weight));
  }

  return errors;
}

/**
 * Generic validation function
 */
export function validateNeutralData(data: any, type: 'entity' | 'information' | 'fact'): ValidationError[] {
  switch (type) {
    case 'entity':
      return validateNeutralEntity(data);
    case 'information':
      return validateNeutralInformation(data);
    case 'fact':
      return validateNeutralFact(data);
    default:
      return [];
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Transforms object keys using a mapping dictionary
 */
function transformObjectKeys(obj: any, mappings: Record<string, string>): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeys(item, mappings));
  }

  const transformed: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = mappings[key] || key;

    if (typeof value === 'string' && mappings[value]) {
      transformed[newKey] = mappings[value];
    } else if (typeof value === 'object') {
      transformed[newKey] = transformObjectKeys(value, mappings);
    } else {
      transformed[newKey] = value;
    }
  }

  return transformed;
}

/**
 * Sanitizes strings for Notion
 */
export function sanitizeForNotion(str: string): string {
  if (!str) return '';

  // Remove or replace characters that Notion doesn't handle well
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim()
    .substring(0, 2000); // Limit length
}

/**
 * Formats dates for Notion API
 */
export function formatDateForNotion(date: Date | string | undefined): string | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Extracts plain text from Notion rich text
 */
export function extractNotionText(richText: any[]): string {
  if (!Array.isArray(richText) || richText.length === 0) {
    return '';
  }

  return richText
    .map(block => block.text?.content || '')
    .join('');
}

/**
 * Creates a ChittyID-compatible identifier
 */
export function createIdentifier(namespace: string, value: string): string {
  // Clean and format the value for ChittyID generation
  const cleanValue = value
    .replace(/[^a-zA-Z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  return `${namespace}:${cleanValue}`;
}

/**
 * Generates a short hash for identifiers
 */
export async function generateShortHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16)
    .toUpperCase();
}

/**
 * Validates ChittyID format
 */
export function isValidChittyId(chittyId: string): boolean {
  // Basic ChittyID format validation
  const pattern = /^CHITTY-[A-Z]+-[A-F0-9]{16}$/;
  return pattern.test(chittyId);
}

/**
 * Extracts namespace from ChittyID
 */
export function extractChittyIdNamespace(chittyId: string): string | null {
  const match = chittyId.match(/^CHITTY-([A-Z]+)-[A-F0-9]{16}$/);
  return match ? match[1] : null;
}

/**
 * Batches array into smaller chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Delays execution for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      await delay(delayMs);
    }
  }

  throw lastError!;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merges objects deeply
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}