#!/bin/bash

# ChittyCheck Lite - Quick ChittyID Compliance Check
# Checks for rogue ID generation patterns

echo "🔍 ChittyCheck Lite - ChittyID Enforcement Scanner"
echo "=================================================="

VIOLATIONS=0
WARNINGS=0
PASSED=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "\n📋 Checking ChittyID Compliance..."

# Check for CHITTY_ID_TOKEN
if [ -z "$CHITTY_ID_TOKEN" ]; then
    echo -e "${RED}❌ CHITTY_ID_TOKEN not configured - cannot request IDs${NC}"
    ((VIOLATIONS++))
else
    echo -e "${GREEN}✅ CHITTY_ID_TOKEN configured${NC}"
    ((PASSED++))
fi

# Check for rogue packages in package.json
if [ -f "package.json" ]; then
    echo -e "\n📦 Checking for rogue ID packages..."

    ROGUE_PACKAGES=(uuid nanoid shortid cuid)
    for pkg in "${ROGUE_PACKAGES[@]}"; do
        if grep -q "\"$pkg\"" package.json; then
            echo -e "${RED}❌ Rogue ID package found: $pkg${NC}"
            ((VIOLATIONS++))
        fi
    done

    if [ $VIOLATIONS -eq 0 ]; then
        echo -e "${GREEN}✅ No rogue ID packages in dependencies${NC}"
        ((PASSED++))
    fi
fi

# Scan for rogue ID generation patterns
echo -e "\n🔍 Scanning for rogue ID generation patterns..."

ROGUE_PATTERNS=(
    "uuid\.v[0-9]"
    "crypto\.randomBytes"
    "Date\.now()"
    "Math\.random"
    "nanoid"
    "shortid"
    "++counter"
    "generateId"
    "generateID"
    "genId"
    "makeId"
)

# Search in source files (excluding ChittyCheck itself and test mocks)
for pattern in "${ROGUE_PATTERNS[@]}"; do
    FOUND=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) \
            -not -path "./node_modules/*" \
            -not -path "./dist/*" \
            -not -path "./build/*" \
            -not -name "chittycheck*" \
            -not -path "./tests/*/mock*" \
            -not -path "./tests/setup*" \
            -exec grep -l "$pattern" {} \; 2>/dev/null)

    if [ ! -z "$FOUND" ]; then
        # Filter out legitimate test usage and ChittyID service calls
        REAL_VIOLATIONS=""
        for file in $FOUND; do
            # Skip if it's just test mocking
            if ! grep -q "mock\|test\|spec" "$file" 2>/dev/null; then
                # Check if generateId is used with ChittyID service
                if [ "$pattern" = "generateId" ]; then
                    if grep -q "id\.chitty\.cc\|CHITTY_ID_API\|/api/generate" "$file" 2>/dev/null; then
                        # This is legitimate - calling ChittyID service
                        continue
                    fi
                fi
                REAL_VIOLATIONS="$REAL_VIOLATIONS$file\n"
            fi
        done

        if [ ! -z "$REAL_VIOLATIONS" ]; then
            echo -e "${RED}❌ Rogue pattern '$pattern' found in:${NC}"
            echo -e "$REAL_VIOLATIONS" | head -3
            ((VIOLATIONS++))
        fi
    fi
done

# Check for authorized ChittyID patterns
echo -e "\n🌐 Checking for ChittyID service calls..."

AUTHORIZED_PATTERNS=(
    "https://id.chitty.cc/v1/mint"
    "mintChittyId"
    "requestChittyId"
    "CHITTY_ID_TOKEN"
)

FOUND_AUTHORIZED=false
for pattern in "${AUTHORIZED_PATTERNS[@]}"; do
    FOUND=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) \
            -not -path "./node_modules/*" \
            -not -path "./dist/*" \
            -not -path "./build/*" \
            -exec grep -l "$pattern" {} \; 2>/dev/null | head -1)

    if [ ! -z "$FOUND" ]; then
        echo -e "${GREEN}✅ Found ChittyID service call pattern: $pattern${NC}"
        FOUND_AUTHORIZED=true
        ((PASSED++))
        break
    fi
done

if [ "$FOUND_AUTHORIZED" = false ]; then
    echo -e "${YELLOW}⚠️  No ChittyID service calls found${NC}"
    ((WARNINGS++))
fi

# Check for duplicate .env files
echo -e "\n⚙️  Checking environment configuration..."

ENV_FILES=(.env .env.chittyos .env.local .env.production)
FOUND_ENV_FILES=()

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        FOUND_ENV_FILES+=("$env_file")
    fi
done

if [ ${#FOUND_ENV_FILES[@]} -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Multiple env files found: ${FOUND_ENV_FILES[*]}${NC}"
    ((WARNINGS++))
elif [ ${#FOUND_ENV_FILES[@]} -eq 1 ]; then
    echo -e "${GREEN}✅ Single env file: ${FOUND_ENV_FILES[0]}${NC}"
    ((PASSED++))
fi

# Check database for 5-entity system
if [ ! -z "$DATABASE_URL" ]; then
    echo -e "\n🗄️  Checking database connection..."
    echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
    ((PASSED++))
else
    echo -e "\n🗄️  Checking database connection..."
    echo -e "${YELLOW}⚠️  DATABASE_URL not configured${NC}"
    ((WARNINGS++))
fi

# Report
echo -e "\n=================================================="
echo "📊 CHITTYCHECK REPORT"
echo "=================================================="

TOTAL=$((VIOLATIONS + WARNINGS + PASSED))
if [ $TOTAL -gt 0 ]; then
    SCORE=$((PASSED * 100 / TOTAL))
else
    SCORE=0
fi

echo "📈 COMPLIANCE SCORE: $SCORE%"
echo "   Violations: $VIOLATIONS"
echo "   Warnings: $WARNINGS"
echo "   Passed: $PASSED"

echo -e "\n🔒 CHITTYID ENFORCEMENT:"
if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}   ❌ FAILED - Local ID generation detected!${NC}"
    echo "   ALL IDs must be requested from https://id.chitty.cc"
    echo "   NO fallbacks, NO local generation, SERVICE OR FAIL"
else
    echo -e "${GREEN}   ✅ PASSED - No local ID generation detected${NC}"
    echo "   System correctly depends on ChittyID service"
fi

echo "=================================================="

if [ $VIOLATIONS -gt 0 ]; then
    echo -e "\n${RED}❌ ChittyCheck FAILED - Critical violations must be fixed${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  ChittyCheck PASSED with warnings${NC}"
    exit 0
else
    echo -e "\n${GREEN}✅ ChittyCheck PASSED - System fully compliant${NC}"
    exit 0
fi