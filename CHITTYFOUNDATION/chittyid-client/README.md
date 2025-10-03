# @chittyos/chittyid-client

Official ChittyOS client for ChittyID minting service

## Installation

```bash
npm install @chittyos/chittyid-client
```

## Usage

```typescript
import ChittyIDClient from '@chittyos/chittyid-client';

// Initialize client
const client = new ChittyIDClient({
  serviceUrl: 'https://id.chitty.cc/v1', // optional, this is default
  apiKey: process.env.CHITTY_ID_TOKEN, // optional, for authenticated requests
  timeout: 10000 // optional, default 10s
});

// Mint a single ChittyID
const chittyId = await client.mint({
  entity: 'PEO',
  name: 'John Doe',
  metadata: {
    email: 'john@example.com'
  }
});

// Validate a ChittyID
const result = await client.validate('VV-G-LLL-0001-T-25-C-X');
console.log(result.valid); // true/false

// Batch mint multiple IDs
const ids = await client.mintBatch([
  { entity: 'PEO', name: 'Alice' },
  { entity: 'PLACE', name: 'Building A' },
  { entity: 'PROP', name: 'Asset 123' }
]);
```

## SERVICE OR FAIL Principle

This client implements the **SERVICE OR FAIL** principle:
- ✅ All IDs are minted from `id.chitty.cc` service
- ❌ **NO local generation** - throws error if service unavailable
- ⚠️ Applications must handle service failures gracefully

## API

### `ChittyIDClient.mint(request: ChittyIDRequest): Promise<string>`

Request minting of a single ChittyID.

**Parameters:**
- `entity`: One of `PEO | PLACE | PROP | EVNT | AUTH | INFO | FACT | CONTEXT | ACTOR`
- `name`: Optional name/description
- `metadata`: Optional metadata object

**Returns:** ChittyID string in format `VV-G-LLL-SSSS-T-YM-C-X`

**Throws:** Error if service is unavailable

### `ChittyIDClient.validate(chittyId: string): Promise<ValidationResult>`

Validate a ChittyID against service and format.

**Returns:** `{ valid: boolean, chittyId?: string, entity?: string, error?: string }`

### `ChittyIDClient.mintBatch(requests: ChittyIDRequest[]): Promise<string[]>`

Mint multiple ChittyIDs in a single request.

**Returns:** Array of ChittyID strings

**Throws:** Error if service is unavailable

### `ChittyIDClient.healthCheck(): Promise<boolean>`

Check if ChittyID service is available.

**Returns:** `true` if service is healthy, `false` otherwise

## Format

ChittyID Official Format: `VV-G-LLL-SSSS-T-YM-C-X`

- `VV` = 2-letter version code
- `G` = Generation
- `LLL` = 3-letter location code
- `SSSS` = 4-digit sequence number
- `T` = Type code
- `YM` = Year-month
- `C` = Category
- `X` = Checksum

## License

MIT © ChittyOS Foundation
