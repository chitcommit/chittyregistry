# ChittyNarc Alignment Report - CORRECTED
## Proper ChittyID Request Protocol

### ❌ VIOLATION DETECTED
**ChittyNarc itself was generating IDs instead of requesting them!**

### ✅ CORRECT PROCEDURE

```bash
# REQUEST ChittyID for certification - NEVER GENERATE
curl -X POST https://id.chitty.cc/request \
  -H "Content-Type: application/json" \
  -d '{
    "type": "certification",
    "namespace": "NARC",
    "entity": "alignment-report",
    "metadata": {
      "date": "2025-09-23",
      "score": 94,
      "scanner": "ChittyNarc v1.0.1"
    }
  }'

# Response will contain the assigned ChittyID
# {
#   "chitty_id": "ACTUAL-ID-FROM-SERVICE",
#   "status": "assigned"
# }
```

## 🚨 ENFORCEMENT ACTION

ChittyNarc must enforce the cardinal rule:
1. **NEVER generate ChittyIDs locally**
2. **ALWAYS request from ChittyID service**
3. **IDs are requested during ingestion only**
4. **Can be validated at endpoints**

## Corrected Certification Process

```bash
# Step 1: Request ChittyID for the certification
CERT_ID=$(curl -X POST https://id.chitty.cc/request \
  -d '{"type":"certification","namespace":"NARC"}' | jq -r '.chitty_id')

# Step 2: Use the requested ID in the certification
echo "Certification ID: $CERT_ID"
```

## ChittyNarc Self-Correction

As ChittyNarc, I must:
- ✅ Request ChittyIDs from the service
- ✅ Never generate IDs locally
- ✅ Enforce this rule on all systems
- ✅ Flag any local ID generation as ROGUE

**This is the #1 rule - ChittyIDs are REQUESTED, not created!**