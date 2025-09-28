# ChittyID Service - Sole Authority for All IDs
## NO Local Generation - Everything Requests from Service

### 🚨 CARDINAL RULE
**ALL IDs in the entire ChittyOS ecosystem MUST be requested from https://id.chitty.cc**

---

## ✅ Correct Implementation Examples

### JavaScript/Node.js
```javascript
// CORRECT - Requesting from ChittyID service
async function mintChittyId(domain, subtype) {
  const r = await fetch('https://id.chitty.cc/v1/mint', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${process.env.CHITTY_ID_TOKEN}` },
    body: JSON.stringify({ domain, subtype })
  });
  return (await r.json()).chitty_id;
}
```

### Python
```python
# CORRECT - Requesting from ChittyID service
async with session.post(f"{ID_BASE}/v1/mint",
                      json={"domain": "legal", "subtype": "evidence"},
                      headers={"authorization": f"Bearer {ID_TOKEN}"}) as r:
    r.raise_for_status()
    return (await r.json())["chitty_id"]
```

### Bash/cURL
```bash
# CORRECT - Requesting from ChittyID service
CHITTY_ID=$(curl -X POST https://id.chitty.cc/v1/mint \
  -H "Authorization: Bearer $CHITTY_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"legal","subtype":"case"}' | jq -r '.chitty_id')
```

---

## ❌ VIOLATIONS TO DETECT & ELIMINATE

### Local Generation Patterns (ALL FORBIDDEN)
```javascript
// WRONG - Local generation
const id = `CHITTY-${namespace}-${crypto.randomBytes(8).toString('hex')}`;

// WRONG - UUID generation
const id = uuid.v4();

// WRONG - Timestamp-based IDs
const id = `ID-${Date.now()}`;

// WRONG - Sequential IDs
const id = `CASE-${++counter}`;

// WRONG - Hash-based IDs
const id = crypto.createHash('sha256').update(data).digest('hex');
```

---

## 📊 Multi-Case Support with ChittyID

### Case ID Assignment
```bash
# Request ChittyID for new case
curl -X POST https://id.chitty.cc/v1/mint \
  -d '{"domain":"legal","subtype":"case","metadata":{"year":"2024","court":"D"}}'

# Returns: CT-01-1-CHI-XXXX-3-2409-L-CC (example format)
```

### Evidence Assignment per Case
```python
# Each evidence item gets ChittyID linked to case
evidence_id = await mint_chitty_id("legal", "evidence")
# Store with case association
await store_evidence(evidence_id, case_id, evidence_data)
```

### Case Partitioning
- Storage: `evidence/{case_id}/{chitty_id}_{filename}`
- Database: `WHERE case_id = 'CHITTY-CASE-ID'`
- Processing: `--case-id CHITTY-CASE-ID`

---

## 🔒 ChittyNarc Enforcement Rules

### Rule 1: Detect Local Generation
```python
# ChittyNarc scanner
def detect_rogue_id_generation(code):
    patterns = [
        r'uuid\.v[0-9]',
        r'crypto\.randomBytes',
        r'Date\.now\(\)',
        r'Math\.random',
        r'nanoid',
        r'shortid',
        r'\+\+counter',
        r'INCREMENT'
    ]
    for pattern in patterns:
        if re.search(pattern, code):
            return "VIOLATION: Local ID generation detected"
```

### Rule 2: Enforce Service Dependency
```javascript
// ChittyNarc enforcement
if (!process.env.CHITTY_ID_TOKEN) {
  throw new Error("VIOLATION: No ChittyID token - cannot generate IDs");
}

if (!isReachable('https://id.chitty.cc')) {
  throw new Error("VIOLATION: ChittyID service unreachable - cannot proceed");
}
```

### Rule 3: Validate All IDs
```python
# ChittyNarc validation
def validate_chitty_id(id_string):
    # IDs must come from service - validate format
    if not id_string.startswith('CT-'):
        return False
    # Check with service
    response = requests.get(f"https://id.chitty.cc/v1/validate/{id_string}")
    return response.json()['valid']
```

---

## 🚀 Implementation Checklist

### Immediate Actions
- [ ] Remove ALL local ID generation code
- [ ] Add ChittyID service checks to startup
- [ ] Require CHITTY_ID_TOKEN in all environments
- [ ] Update documentation to emphasize service dependency

### ChittyNarc Monitoring
- [ ] Scan for uuid, nanoid, shortid imports
- [ ] Detect crypto.randomBytes usage
- [ ] Flag any ID not starting with 'CT-'
- [ ] Alert on ChittyID service downtime

### Multi-Case Implementation
- [ ] Request ChittyID for each new case
- [ ] Link all evidence to case ChittyID
- [ ] Partition storage by case ChittyID
- [ ] Filter queries by case ChittyID

---

## 🎯 System Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │ Request ID
         ▼
┌─────────────────┐
│ ChittyID Service│ ◀── SOLE AUTHORITY
│ id.chitty.cc    │
└────────┬────────┘
         │ Returns: CT-01-1-CHI-XXXX-3-YYMM-L-CC
         ▼
┌─────────────────┐
│   Application   │
│  Stores/Uses ID │
└─────────────────┘
```

**NO FALLBACKS - NO LOCAL GENERATION - SERVICE OR FAIL**

---

## ⚠️ Critical Understanding

The system is **ID-service-dependent by design**:
- No ChittyID service = No processing
- No fallback generation allowed
- Fail fast if service unavailable
- ALL IDs must be traceable to service

This creates a **unified identity namespace** across:
- All cases
- All evidence types
- All storage layers
- All system components

**ChittyID service at https://id.chitty.cc is the ONLY source of truth for identity.**

---

*ChittyNarc will enforce this rule with zero tolerance for violations.*