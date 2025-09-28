/**
 * Cook County Property Data Connector
 * Interfaces for PIN-based property lookups
 */

export interface PropertyOwnership {
  pin: string;
  owner: string | null;
  ownerType: 'INDIVIDUAL' | 'LLC' | 'CORP' | 'TRUST' | 'OTHER' | null;
  acquisitionDate: string | null;
  acquisitionPrice: number | null;
  address: string | null;
  unit: string | null;
  lastUpdated: string | null;
  source: 'COOK_COUNTY_API' | 'COOK_COUNTY_SCRAPER' | 'MANUAL' | 'UNCONFIGURED';
}

export interface TaxTrendData {
  year: number;
  assessedValue: number;
  taxAmount: number;
  exemptions: string[];
}

export interface PropertyTaxTrend {
  pin: string;
  trend: TaxTrendData[];
  currentAssessedValue: number | null;
  lastTaxAmount: number | null;
  lastTaxYear: number | null;
  lastUpdated: string | null;
  source: 'COOK_COUNTY_API' | 'COOK_COUNTY_SCRAPER' | 'MANUAL' | 'UNCONFIGURED';
}

/**
 * Fetch current ownership information for a PIN
 * @param pin - Property Identification Number
 * @returns Current ownership data
 */
export async function fetchOwnershipByPIN(pin: string): Promise<PropertyOwnership> {
  if (!isValidCookCountyPIN(pin)) {
    throw new Error(`Invalid Cook County PIN format: ${pin}. Expected format: XX-XX-XXX-XXX-XXXX`);
  }

  try {
    // Use Cook County Assessor's Property Search API
    const apiUrl = process.env.COOK_COUNTY_ASSESSOR_API_URL || 'https://www.cookcountyassessor.com/api';
    const response = await fetch(`${apiUrl}/property/${pin}`, {
      headers: {
        'Authorization': `Bearer ${process.env.COOK_COUNTY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Cook County API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      pin,
      owner: data.owner_name || null,
      ownerType: classifyOwnerType(data.owner_name),
      acquisitionDate: data.acquisition_date || null,
      acquisitionPrice: data.acquisition_price || null,
      address: data.property_address || null,
      unit: data.unit || null,
      lastUpdated: new Date().toISOString(),
      source: 'COOK_COUNTY_API'
    };
  } catch (error) {
    console.error(`[Cook County Connector] Failed to fetch ownership for PIN ${pin}:`, error);
    throw error;
  }
}

/**
 * Fetch historical tax assessment trend for a PIN
 * @param pin - Property Identification Number
 * @returns Historical tax trend data
 */
export async function fetchTaxTrendByPIN(pin: string): Promise<PropertyTaxTrend> {
  if (!isValidCookCountyPIN(pin)) {
    throw new Error(`Invalid Cook County PIN format: ${pin}. Expected format: XX-XX-XXX-XXX-XXXX`);
  }

  try {
    // Use Cook County Assessor's Tax History API
    const apiUrl = process.env.COOK_COUNTY_ASSESSOR_API_URL || 'https://www.cookcountyassessor.com/api';
    const response = await fetch(`${apiUrl}/property/${pin}/tax-history`, {
      headers: {
        'Authorization': `Bearer ${process.env.COOK_COUNTY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Cook County API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      pin,
      trend: data.tax_history?.map((year: any) => ({
        year: year.tax_year,
        assessedValue: year.assessed_value,
        taxAmount: year.tax_amount,
        exemptions: year.exemptions || []
      })) || [],
      currentAssessedValue: data.current_assessed_value || null,
      lastTaxAmount: data.last_tax_amount || null,
      lastTaxYear: data.last_tax_year || null,
      lastUpdated: new Date().toISOString(),
      source: 'COOK_COUNTY_API'
    };
  } catch (error) {
    console.error(`[Cook County Connector] Failed to fetch tax trend for PIN ${pin}:`, error);
    throw error;
  }
}

/**
 * Validate PIN format for Cook County
 * @param pin - Property Identification Number
 * @returns true if valid Cook County PIN format
 */
export function isValidCookCountyPIN(pin: string): boolean {
  // Cook County PINs are typically 14 digits with hyphens
  // Format: XX-XX-XXX-XXX-XXXX
  const pattern = /^\d{2}-\d{2}-\d{3}-\d{3}-\d{4}$/;
  return pattern.test(pin);
}

/**
 * Parse PIN components
 * @param pin - Property Identification Number
 * @returns PIN components or null if invalid
 */
export function parsePIN(pin: string): {
  township: string;
  section: string;
  block: string;
  lot: string;
  unit: string;
} | null {
  const match = pin.match(/^(\d{2})-(\d{2})-(\d{3})-(\d{3})-(\d{4})$/);
  if (!match) return null;

  return {
    township: match[1],
    section: match[2],
    block: match[3],
    lot: match[4],
    unit: match[5]
  };
}

/**
 * Classify owner type based on owner name
 * @param ownerName - Name of the property owner
 * @returns Owner type classification
 */
function classifyOwnerType(ownerName: string | null): PropertyOwnership['ownerType'] {
  if (!ownerName) return null;

  const name = ownerName.toUpperCase();

  if (name.includes('LLC')) return 'LLC';
  if (name.includes('CORP') || name.includes('CORPORATION') || name.includes('INC')) return 'CORP';
  if (name.includes('TRUST')) return 'TRUST';

  // Check for individual patterns (names with spaces, commas)
  if (name.includes(',') || name.split(' ').length >= 2) return 'INDIVIDUAL';

  return 'OTHER';
}