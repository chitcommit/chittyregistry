# ChittyOS Help Definitions
**Central Knowledge Base for Command Help and Definitions**

Version: 1.0.0
Last Updated: 2024-09-24

---

## Core Systems Definitions

### 🆔 ID System (ChittyID)
**Purpose**: Identity generation, validation, and management
**Components**:
- ChittyID token validation (CHITTY_ID_TOKEN)
- Identity service connectivity (id.chitty.cc)
- Token format verification (CT-xxxx pattern)
- Authorization pipeline enforcement

**Common Issues**:
- Missing or placeholder token (`YOUR_TOKEN_HERE_REPLACE_ME`)
- Invalid token format
- Service unreachable
- Expired tokens

---

### 🔀 Git System (Version Control)
**Purpose**: Development workflow and session management
**Components**:
- Git repository status
- Branch management (avoid main/master)
- Worktree usage for session isolation
- Uncommitted changes tracking
- Untracked files monitoring

**Common Issues**:
- Working directly on main/master branch
- Uncommitted changes in working directory
- Too many untracked files
- Not using git worktrees for sessions

---

### 💾 Data System (Storage & Persistence)
**Purpose**: Database and object storage configuration
**Components**:
- Database connectivity (Neon PostgreSQL)
- Object storage (R2/Cloudflare)
- Connection strings validation
- Storage bucket configuration

**Common Issues**:
- Missing DATABASE_URL or NEON_DATABASE_URL
- Missing R2_BUCKET or CLOUDFLARE_R2_BUCKET
- Invalid connection strings
- Permission issues

---

### 🔖 Registry System (Service Discovery)
**Purpose**: Service registration, discovery, and connectivity
**Components**:
- Registry service (registry.chitty.cc)
- Account ID configuration
- Service health monitoring
- Cross-service communication

**Common Issues**:
- Missing REGISTRY_SERVICE configuration
- Service unreachable
- Missing CHITTYOS_ACCOUNT_ID
- Network connectivity problems

---

### 🔐 Security System (Authentication & Authorization)
**Purpose**: Security policies, certificates, and access control
**Components**:
- SSL/TLS certificate validation
- Security headers enforcement
- Access control policies
- Vulnerability scanning
- Penetration testing results

**Common Issues**:
- Expired certificates
- Missing security headers
- Weak authentication
- Failed security scans
- Open vulnerabilities

---

## Command Definitions

### ChittyCheck Commands
```bash
chittycheck                    # Full system validation
chittycheck --help             # Show help and definitions
chittycheck --qa               # Include QA testing
chittycheck --security         # Security-focused scan
chittycheck --verbose          # Detailed output
chittycheck --fix              # Auto-fix issues where possible
```

### Status Commands
```bash
chittycheck_status "badge"     # Full status line format
chittycheck_status "compact"   # Minimal status format
chittycheck_status "full"      # Detailed status report
```

---

## Status Indicators Guide

### Overall Status
| Icon | Meaning | Condition |
|------|---------|-----------|
| ✅ | **Success** | All systems operational, no issues detected |
| ⚠️ | **Warning** | Some issues present, system functional with caveats |
| ❌ | **Critical** | Violations detected, immediate attention required |

### Issue Count Colors
| Color | Range | Severity | Action Required |
|-------|-------|----------|-----------------|
| 🟢 Green | 0 issues | Perfect | None - maintain current state |
| 🟡 Yellow | 1-2 issues | Warning | Review and address when convenient |
| 🔴 Red | 3+ issues | Critical | Immediate attention required |

---

## Troubleshooting Guide

### Common Fixes

**🆔 ID System Issues**:
1. Set valid CHITTY_ID_TOKEN in .env
2. Verify token format (not placeholder)
3. Check id.chitty.cc connectivity
4. Refresh token if expired

**🔀 Git System Issues**:
1. Create feature branch: `git checkout -b feature/my-work`
2. Commit changes: `git add . && git commit -m "description"`
3. Use git worktrees: `git worktree add ../session-name branch-name`
4. Clean untracked files: `git clean -fd`

**💾 Data System Issues**:
1. Configure DATABASE_URL in .env
2. Set R2_BUCKET or CLOUDFLARE_R2_BUCKET
3. Test database connectivity
4. Verify storage permissions

**🔖 Registry System Issues**:
1. Set REGISTRY_SERVICE=https://registry.chitty.cc
2. Configure CHITTYOS_ACCOUNT_ID
3. Test registry connectivity: `curl registry.chitty.cc/health`
4. Register service if needed

**🔐 Security System Issues**:
1. Update SSL certificates
2. Configure security headers
3. Run security scan: `chittycheck --security`
4. Address vulnerability reports

---

## Environment Variables Reference

### Required Variables
```bash
CHITTY_ID_TOKEN=ct_xxx...           # ChittyID authentication token
DATABASE_URL=postgresql://...        # Primary database connection
REGISTRY_SERVICE=https://registry... # Service registry endpoint
CHITTYOS_ACCOUNT_ID=bbf9fcd8...     # Account identifier
```

### Optional Variables
```bash
R2_BUCKET=chittyos-data             # Object storage bucket
CLOUDFLARE_R2_BUCKET=backup-store   # Backup storage
NEON_DATABASE_URL=postgresql://...   # Alternative database
```

---

## Integration Patterns

### Service Health Checks
All services should implement:
```bash
GET /health                         # Basic health check
GET /status                         # Detailed status report
POST /validate                      # Configuration validation
```

### Status Line Integration
Services should report using canonical format:
```bash
ServiceName: STATUS XX% (XvXwXpXf) ❌{🆔:1|🔀GIT:3|💾DATA:1|🔖RGSTRY:1|🔐SEC:2}
```

---

## Getting Help

### Command Help
- `chittycheck --help` - Show command help
- `chittycheck --examples` - Show usage examples
- `chittycheck --troubleshoot` - Interactive troubleshooting

### Documentation
- **Visual Standards**: `/chittyschema/docs/VISUAL_STANDARDS.md`
- **Help Definitions**: `/chittyschema/docs/HELP_DEFINITIONS.md`
- **Project Docs**: `CLAUDE.md` in each project

### Support Resources
- **Registry**: https://registry.chitty.cc
- **ChittyID**: https://id.chitty.cc
- **Documentation**: https://docs.chitty.cc
- **Issues**: GitHub issues in respective repositories

---

**Canonical Authority**: ChittySchema Project
**Updates**: Version controlled in chittyschema repository
**Usage**: Referenced by all ChittyOS tools for consistent help