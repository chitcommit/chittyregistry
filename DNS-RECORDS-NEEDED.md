# DNS Records Needed for ChittyCorp CI/CD

## Issue
Worker routes are deployed to `chittyos-platform-production` but DNS records don't exist for all subdomains.

## Current Status

### ✅ Working (DNS exists):
- `id.chitty.cc` → 104.21.62.164, 172.67.137.24
- `portal.chitty.cc` → 104.21.62.164, 172.67.137.24
- `mcp.chitty.cc` → Working

### ❌ Missing DNS Records:
- `auth.chitty.cc`
- `registry.chitty.cc`
- `gateway.chitty.cc`
- `sync.chitty.cc`
- `api.chitty.cc`

## Solution

### Option 1: Wildcard DNS (Recommended)
Add a wildcard CNAME record in Cloudflare DNS:

```
Type: CNAME
Name: *
Content: chitty.cc
Proxy: Yes (Orange cloud)
TTL: Auto
```

This will route ALL subdomains to the worker automatically.

### Option 2: Individual DNS Records
Add CNAME records for each subdomain:

```
Type: CNAME
Name: auth
Content: chitty.cc
Proxy: Yes

Type: CNAME
Name: registry
Content: chitty.cc
Proxy: Yes

Type: CNAME
Name: gateway
Content: chitty.cc
Proxy: Yes

Type: CNAME
Name: sync
Content: chitty.cc
Proxy: Yes

Type: CNAME
Name: api
Content: chitty.cc
Proxy: Yes
```

## Steps to Fix (Cloudflare Dashboard)

1. Log in to Cloudflare Dashboard
2. Select `chitty.cc` zone
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Create wildcard CNAME:
   - Type: `CNAME`
   - Name: `*`
   - Target: `chitty.cc`
   - Proxy status: Proxied (orange cloud)
   - TTL: Auto
6. Click **Save**

## Verification

After adding DNS records, verify with:

```bash
# Test DNS resolution
nslookup auth.chitty.cc
nslookup registry.chitty.cc
nslookup gateway.chitty.cc

# Test service health
curl https://auth.chitty.cc/health
curl https://registry.chitty.cc/health
curl https://gateway.chitty.cc/health
```

## Worker Routes Already Deployed

All routes are configured in `wrangler.optimized.toml` and deployed:

```toml
[[routes]]
pattern = "sync.chitty.cc/*"
zone_name = "chitty.cc"

[[routes]]
pattern = "api.chitty.cc/*"
zone_name = "chitty.cc"

[[routes]]
pattern = "auth.chitty.cc/*"
zone_name = "chitty.cc"

[[routes]]
pattern = "registry.chitty.cc/*"
zone_name = "chitty.cc"

# ... and 10+ more routes
```

Worker: `chittyos-platform-production`
Account: ChittyCorp CI/CD (0bc21e3a5a9de1a4cc843be9c3e98121)
Latest Version: 8814a03c-a4d8-43bb-a3a1-1643c3efaa0d

## Once DNS is Fixed

All services should immediately start working:
- ✅ auth.chitty.cc/health
- ✅ registry.chitty.cc/health
- ✅ gateway.chitty.cc/health
- ✅ sync.chitty.cc/health
- ✅ api.chitty.cc/health

No additional deployment needed - routes are already live!
