# Account 121 CI/CD Strategy
## Clean MCP Portal Integration

**Account ID**: `0bc21e3a5a9de1a4cc843be9c3e98121`
**Email**: nick@chittycorp.com
**Organization**: ChittyCorp LLC
**Purpose**: Clean MCP Portal integration - avoiding the mess of Account 541

---

## 🎯 Core Principles

### 1. **Single Source of Truth**
- Main repository: `chitcommit/chittyregistry`
- All services deploy from this monorepo
- No scattered deployments across multiple repos

### 2. **Automated CI/CD Pipeline**
- GitHub Actions workflow: `.github/workflows/account-121-deploy.yml`
- Triggers on push to `main` and `session-*` branches
- Service-specific deployments based on changed paths
- Manual deployment via workflow_dispatch for selective services

### 3. **Account Segregation**
- **Account 121** (Clean) - All new MCP Portal services
- **Account 541** (Old Mess) - **DEPRECATED - DO NOT USE**
- CI/CD validation blocks Account 541 references

---

## 🚀 Deployed Services

### Core Services (Account 121)

| Service | Worker Name | Domain | Repository Path | Status |
|---------|------------|--------|-----------------|--------|
| **ChittyAuth** | chittyauth-mcp-121 | auth.chitty.cc | CHITTYOS/chittyos-services/chittyauth | ✅ Live |
| **ChittyRegistry** | chittyregistry-universal | registry.chitty.cc | CHITTYOS/chittyos-services/chittyregistry | ✅ Live |
| **ChittyRouter** | chitty-ultimate-worker | router.chitty.cc | CHITTYOS/chittyos-services/chittyrouter | ✅ Live |
| **ChittyID Foundation** | chittyid-foundation | id.chitty.cc | CHITTYFOUNDATION/chittyid | ✅ Live |
| **ChittySchema MCP** | chittyschema-mcp | schema.chitty.cc | CHITTYFOUNDATION/chittyschema | 🔧 Configured |
| **ChittyOS Platform** | chittyos-platform-production | gateway.chitty.cc, sync.chitty.cc, api.chitty.cc | chittychat | ✅ Live |
| **MCP Portal** | chittyos-mcp-portal | portal.chitty.cc | chittychat (unified) | ✅ Live |

### Routes Configuration

**ChittyOS Platform Production** (`chittyos-platform-production`):
```toml
routes = [
  # Core
  { pattern = "sync.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "api.chitty.cc/*", zone_name = "chitty.cc" },

  # AI & MCP
  { pattern = "ai.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "langchain.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "mcp.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "portal.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "cases.chitty.cc/*", zone_name = "chitty.cc" },

  # Identity & Auth
  { pattern = "id.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "auth.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "registry.chitty.cc/*", zone_name = "chitty.cc" },

  # Data & Verification
  { pattern = "canon.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "verify.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "chat.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "schema.chitty.cc/*", zone_name = "chitty.cc" },

  # Infrastructure
  { pattern = "beacon.chitty.cc/*", zone_name = "chitty.cc" },
  { pattern = "email.chitty.cc/*", zone_name = "chitty.cc" }
]
```

---

## 🔄 CI/CD Workflow

### Validation Stage
```yaml
- Check Account ID Compliance (blocks Account 541)
- ChittyID compliance check (chittycheck-enhanced.sh)
- Prevent legacy format usage (CHITTY-* format blocked)
```

### Deployment Stages

**1. Path-Based Triggers**:
- Changes to `CHITTYOS/chittyos-services/chittyauth/**` → Deploy ChittyAuth
- Changes to `CHITTYOS/chittyos-services/chittyregistry/**` → Deploy ChittyRegistry
- Changes to `CHITTYOS/chittyos-services/chittyrouter/**` → Deploy ChittyRouter
- Changes to `CHITTYFOUNDATION/chittyid/**` → Deploy ChittyID
- Changes to `CHITTYFOUNDATION/chittyschema/**` → Deploy ChittySchema MCP
- Changes to `chittychat/**` → Deploy ChittyOS Platform

**2. Manual Deployment**:
```bash
# Via GitHub Actions UI
Service: [all | chittyauth | chittyregistry | chittyrouter | chittyid | chittyschema | chittychat]
Environment: [staging | production]
```

**3. Deployment Commands**:
```bash
# Each service uses:
npx wrangler deploy --env [staging|production]

# Environment variables from GitHub Secrets:
- CLOUDFLARE_API_TOKEN_121  # Account 121 specific token
- CLOUDFLARE_ACCOUNT_ID     # Hardcoded to 0bc21e3a5a9de1a4cc843be9c3e98121
- CHITTY_ID_TOKEN          # ChittyOS global API key
```

---

## 🔐 Secrets Management

### GitHub Secrets Required

| Secret Name | Purpose | Source |
|------------|---------|--------|
| `CLOUDFLARE_API_TOKEN_121` | Cloudflare Workers deployment | Cloudflare Dashboard → API Tokens |
| `CHITTY_ID_TOKEN` | ChittyOS service authentication | 1Password: ChittyCorp LLC/global_api_key |

### 1Password Integration

```bash
# Retrieve ChittyCorp LLC global API key
op://Private/gxyne23yqngvk2nzjwl62uakx4/ChittyCorp LLC/global_api_key
```

### Environment Variables per Service

**ChittyAuth**:
- `CHITTYAUTH_URL=https://auth.chitty.cc`
- `CHITTYAUTH_CLIENT_ID` (from secrets)

**ChittyRegistry**:
- `CHITTY_REGISTRY_URL=https://registry.chitty.cc`
- `DATABASE_URL` (Neon PostgreSQL)

**ChittyRouter**:
- `AI_MODEL_PRIMARY=@cf/meta/llama-4-scout-17b-16e-instruct`
- `CHITTYID_FOUNDATION_URL=https://id.chitty.cc`

**ChittyID**:
- `CHITTYID_SERVICE_URL=https://id.chitty.cc`
- `MCP_ENFORCE_FORMAT=true` (blocks CHITTY-* format)

**ChittySchema**:
- `DATABASE_URL` (Neon PostgreSQL)
- `NOTION_TOKEN` (Notion integration)
- `CHITTYID_FOUNDATION_URL=https://id.chitty.cc`

---

## 📊 Registry Notification

After deployment, workflow notifies ChittyOS Registry:

```bash
curl -X POST https://gateway.chitty.cc/api/v1/registry/deployment \
  -H "Authorization: Bearer ${CHITTY_ID_TOKEN}" \
  -d '{
    "account": "Account-121-Clean-MCP-Portal",
    "accountId": "0bc21e3a5a9de1a4cc843be9c3e98121",
    "email": "nick@chittycorp.com",
    "environment": "production",
    "ref": "main",
    "timestamp": "2025-10-03T14:00:00Z"
  }'
```

---

## 🛡️ Preventing Account 541 Contamination

### Automated Checks

**1. Pre-deployment Validation**:
```bash
# Blocks deployment if Account 541 found
grep -r "bbf9fcd845e78035b7a135c481e88541" --include="wrangler*.toml" .
if [ $? -eq 0 ]; then
  echo "❌ ERROR: Account 541 references found!"
  exit 1
fi
```

**2. ChittyID Compliance**:
```bash
# Enforces official VV-G-LLL-SSSS-T-YM-C-X format
# Blocks CHITTY-* legacy format
bash chittycheck/chittycheck-enhanced.sh --ci
```

**3. Code Review Requirements**:
- All PRs require approval
- Automated check for Account 541 in changed files
- ChittyID format validation in PR checks

---

## 🔧 Local Development

### Setup
```bash
# 1. Login to Account 121
wrangler login
wrangler whoami  # Verify: nick@chittycorp.com, Account: 0bc21e3a5a9de1a4cc843be9c3e98121

# 2. Configure environment
export CLOUDFLARE_ACCOUNT_ID="0bc21e3a5a9de1a4cc843be9c3e98121"
export CHITTY_ID_TOKEN="$(op read 'op://Private/gxyne23yqngvk2nzjwl62uakx4/ChittyCorp LLC/global_api_key')"

# 3. Run ChittyCheck
/Users/nb/.claude/projects/-/chittycheck/chittycheck-enhanced.sh

# 4. Start development
cd [service-directory]
npm run dev
```

### Testing Deployments

**Staging**:
```bash
npx wrangler deploy --env staging
```

**Production**:
```bash
# Via GitHub Actions only (requires approval)
# Manual via workflow_dispatch
```

---

## 📈 Monitoring & Health Checks

### Service Health Endpoints

| Service | Health Check | Expected Response |
|---------|-------------|-------------------|
| ChittyAuth | https://auth.chitty.cc/health | `{"status":"healthy"}` |
| ChittyRegistry | https://registry.chitty.cc/health | `{"status":"ok"}` |
| ChittyRouter | https://router.chitty.cc/health | `{"status":"online"}` |
| ChittyID | https://id.chitty.cc/health | `{"status":"operational"}` |
| MCP Portal | https://portal.chitty.cc/health | `{"status":"ready"}` |
| Platform | https://gateway.chitty.cc/health | `{"status":"active"}` |

### Dashboard Access

**Cloudflare Workers Dashboard**:
```
https://dash.cloudflare.com/0bc21e3a5a9de1a4cc843be9c3e98121/workers-and-pages
```

**GitHub Actions**:
```
https://github.com/chitcommit/chittyregistry/actions
```

---

## 🚨 Incident Response

### If Account 541 Contamination Detected

**1. Immediate Actions**:
```bash
# Stop all deployments
gh workflow disable account-121-deploy.yml

# Audit all wrangler configs
find . -name "wrangler*.toml" -exec grep -H "account_id" {} \;

# Identify contaminated services
grep -r "bbf9fcd845e78035b7a135c481e88541" . --include="*.toml"
```

**2. Remediation**:
```bash
# Replace Account 541 with Account 121
find . -name "wrangler*.toml" -exec sed -i '' 's/bbf9fcd845e78035b7a135c481e88541/0bc21e3a5a9de1a4cc843be9c3e98121/g' {} \;

# Add comment for clarity
# account_id = "0bc21e3a5a9de1a4cc843be9c3e98121"  # Account 121 - Clean MCP Portal
```

**3. Re-enable CI/CD**:
```bash
gh workflow enable account-121-deploy.yml
git add -A
git commit -m "Fix: Remove Account 541 contamination"
git push origin main
```

---

## 📝 Change Management

### Adding New Services

**1. Create Service Directory**:
```bash
mkdir -p CHITTYOS/chittyos-services/[service-name]
cd CHITTYOS/chittyos-services/[service-name]
```

**2. Configure wrangler.toml**:
```toml
name = "[service-name]"
account_id = "0bc21e3a5a9de1a4cc843be9c3e98121"  # Account 121 - Clean MCP Portal
compatibility_date = "2024-09-23"

[env.production]
routes = [
  { pattern = "[service].chitty.cc/*", zone_name = "chitty.cc" }
]
```

**3. Update CI/CD Workflow**:
Add deployment job to `.github/workflows/account-121-deploy.yml`

**4. Register with ChittyOS Registry**:
```bash
curl -X POST https://gateway.chitty.cc/api/v1/registry/services \
  -H "Authorization: Bearer ${CHITTY_ID_TOKEN}" \
  -d '{
    "serviceName": "[service-name]",
    "endpoint": "https://[service].chitty.cc",
    "accountId": "0bc21e3a5a9de1a4cc843be9c3e98121"
  }'
```

---

## ✅ Success Criteria

Account 121 is considered "clean" when:

- ✅ All services deployed to Account 121 (0bc21e3a5a9de1a4cc843be9c3e98121)
- ✅ Zero Account 541 references in active code
- ✅ CI/CD validation passes (no Account 541 blocks deployment)
- ✅ ChittyID compliance at 100% (official format only)
- ✅ All services registered in ChittyOS Registry
- ✅ Health checks return 200 OK for all endpoints
- ✅ MCP Portal integration functional at portal.chitty.cc
- ✅ GitHub repository connected: chitcommit/chittyregistry
- ✅ Automated deployments working for staging and production

---

**Last Updated**: 2025-10-03
**Maintained By**: ChittyOS Platform Team
**Contact**: nick@chittycorp.com
