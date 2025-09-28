# ChittyOS Visual Standards
**Canonical Visual Language for ChittyOS Ecosystem**

Version: 1.0.0
Last Updated: 2024-09-24
Scope: All ChittyOS services, tools, and interfaces

---

## Core System Icons

### Status Indicators
These icons represent the four core systems across all ChittyOS tools:

| Icon | System | Description | Usage |
|------|--------|-------------|-------|
| 🆔 | **ID System** | ChittyID token validation & identity management | Used for all authentication, token, and identity-related status |
| 🔀 | **Git System** | Version control, branches, and session management | Used for all git, worktree, and development workflow status |
| 💾 | **Data System** | Database, storage, and persistence layer | Used for all database, R2, and data storage status |
| 🔖 | **Registry System** | Service discovery, registration, and connectivity | Used for all service registry, discovery, and network status |

### Implementation Examples

**Status Line Format:**
```
✅{🆔|🔀|💾|🔖}                    # All systems passing
⚠️{🆔:1|🔀GIT:2|💾|🔖RGSTRY:1}     # Mixed status with issue counts
❌{🆔:1|🔀GIT:3|💾DATA:2|🔖RGSTRY:1} # Critical issues with counts
```

**Full Report Format:**
```
Core Systems:
  🆔:Pass  [GIT]🔀:Pass   [DATA]💾:Warning   [REGISTRY]🔖:Fail   [SECURITY]🔐:?
```

---

## Status Color Coding

### Overall Status Indicators
| Icon | Status | When to Use |
|------|--------|-------------|
| ✅ | **Success** | All systems operational, no issues |
| ⚠️ | **Warning** | Some issues present, system functional |
| ❌ | **Critical** | Violations detected, immediate attention needed |

### Issue Count Color Coding
Apply to **numbers only**, not system names:

| Color | Range | Severity | Example |
|-------|-------|----------|---------|
| 🟢 Green | 0 issues | Perfect | `🔀GIT:0` (but typically shown as just `🔀`) |
| 🟡 Yellow | 1-2 issues | Warning | `🔀GIT:1` or `🔀GIT:2` |
| 🔴 Red | 3+ issues | Critical | `🔀GIT:3` or `🔀GIT:7` |

---

## System Abbreviations

### Extended Labels (when issues present)
| System | Full Label | Abbreviation | Usage Context |
|--------|------------|--------------|---------------|
| ID | `🆔` | `🆔` | Always just emoji |
| Git | `🔀` | `🔀GIT` | When issues detected |
| Data | `💾` | `💾DATA` | When issues detected |
| Registry | `🔖` | `🔖RGSTRY` | When issues detected |

### Compact Display Rules
- **No Issues**: Show emoji only (`🆔`, `🔀`, `💾`, `🔖`)
- **With Issues**: Show emoji + abbreviation + count (`🔀GIT:3`, `🔖RGSTRY:1`)
- **Spacing**: No spaces inside braces for status lines (`{🆔|🔀GIT:2|💾|🔖}`)

---

## Implementation Guidelines

### Status Line Integration
All ChittyOS tools should implement consistent status line format:

```bash
ToolName: STATUS XX% (XvXwXpXf) ❌{🆔:1|🔀GIT:3|💾DATA:1|🔖RGSTRY:1}
```

**Components:**
1. **Tool Name**: Service/tool identifier
2. **Status**: PASS/WARN/FAIL
3. **Score**: Percentage with color coding
4. **Counts**: (violations/warnings/passed/failed)
5. **Systems**: Core systems with issue indicators

### Cross-Tool Consistency
- **ChittyCheck**: Primary implementation reference
- **ChittyNarc**: Should follow same visual patterns
- **ChittyChat**: Status integration using same icons
- **All Services**: Should report using canonical format

### Color Accessibility
- Use semantic meaning, not just color
- Include emoji + text for clarity
- Support monochrome terminals gracefully
- Maintain contrast ratios for readability

---

## Usage Examples

### ChittyCheck Integration
```bash
# Status line
ChittyCheck: FAIL 83% (1v/0w) ❌{🆔:1|🔀GIT:3|💾DATA:1|🔖RGSTRY:1}

# Full report
Core Systems:
  🆔:Warning  [GIT]🔀:Fail   [DATA]💾:Warning   [REGISTRY]🔖:Warning   [SECURITY]🔐:?
```

### ChittyNarc Compliance
```bash
ChittyNarc: WARN 94% (0v/3w) ⚠️{🆔|🔀|💾DATA:2|🔖RGSTRY:1}
```

### Service Health Checks
```bash
ChittyGateway: PASS 100% (0v/0w) ✅{🆔|🔀|💾|🔖}
ChittyRegistry: FAIL 45% (2v/1w) ❌{🆔|🔀GIT:5|💾DATA:1|🔖RGSTRY:3}
```

---

## Extension Points

### Future System Icons
Reserve space for additional core systems:

| Icon | System | Status | Notes |
|------|--------|--------|-------|
| 🔐 | **Security** | Planned | Auth, certificates, encryption |
| 🌐 | **Network** | Planned | Connectivity, DNS, routing |
| 📊 | **Analytics** | Planned | Metrics, logging, monitoring |
| ⚡ | **Performance** | Planned | Speed, optimization, caching |

### Custom Service Integration
Services may extend with domain-specific indicators while maintaining core system compatibility.

---

## Compliance Requirements

### Mandatory Implementation
- All ChittyOS services MUST implement core system status indicators
- Status lines MUST follow canonical format structure
- Icons MUST match exact Unicode characters specified
- Color coding MUST follow severity guidelines

### Recommended Practices
- Include accessibility text alternatives
- Provide both compact and verbose modes
- Support configuration of display preferences
- Log status changes for debugging

### Validation
Use ChittyCheck to validate visual standard compliance:
```bash
chittycheck --visual-standards-check
```

---

**Canonical Authority**: ChittySchema Project
**Implementation Reference**: chittycheck-enhanced.sh, chittycheck-status.sh
**Registry**: https://registry.chitty.cc/standards/visual
**Updates**: Version controlled in chittyschema repository