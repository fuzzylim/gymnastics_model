# Project Scripts

This directory contains utility scripts for development, testing, and metrics generation.

## Metrics & Analysis

### `fact-check-report.js`
Generates comprehensive codebase statistics and verified facts.

**Usage:**
```bash
node scripts/fact-check-report.js
# or
npm run metrics:generate
```

**Output:**
- Console report with detailed statistics
- `verified-facts.json` with structured data
- File counts, line counts, test statistics
- Technology stack analysis
- Implemented features detection

### `update-claude-metrics.js`
Updates the metrics table in CLAUDE.md with current verified facts.

**Usage:**
```bash
node scripts/update-claude-metrics.js
# or
npm run metrics:update
```

**Requirements:**
- Must run `fact-check-report.js` first to generate `verified-facts.json`
- Updates CLAUDE.md metrics table automatically
- Adds timestamp to track when metrics were last updated

### `deployment-metrics.js`
Collects comprehensive DevOps and DORA metrics from git history.

**Usage:**
```bash
node scripts/deployment-metrics.js
# or  
npm run metrics:deployment
```

**Metrics Collected:**
- **Deployment Frequency**: How often deployments occur
- **Lead Time**: Time from acceptance (PR merge) to deployment
- **Change Failure Rate**: Percentage of changes requiring fixes
- **DORA Classification**: Elite/High/Medium/Low maturity rating

**Output:**
- Console report with DORA metrics
- `deployment-metrics.json` with detailed analysis
- Integration with main fact checking

### `test-metrics-pipeline.js`
Validates the entire metrics collection and update pipeline.

**Usage:**
```bash
node scripts/test-metrics-pipeline.js
# or
npm run metrics:test
```

**Tests Performed:**
- Script file existence and validity
- NPM script execution
- JSON file structure validation
- Metrics data integrity checks
- GitHub Actions workflow presence
- Cross-file data consistency

**Output:**
- Comprehensive test report with success/warning/error counts
- 100% success rate indicates pipeline ready for production

### Combined Workflow
```bash
npm run metrics:full
```
Runs all metrics scripts in sequence for complete update including deployment metrics.

### `validate-pr-ready.js`
Comprehensive validation script to ensure PR follows all required workflows.

**Usage:**
```bash
node scripts/validate-pr-ready.js
# or
npm run pr:validate
```

**Validations Performed:**
- Git status (no uncommitted changes)
- Required metrics files present and recent
- All tests passing (unit, typecheck, lint, metrics)
- CLAUDE.md metrics timestamp current
- Feature branch (not main/master)
- Commit message includes metrics

**Output:**
- Pass/warning/error breakdown
- Specific remediation steps for failures
- 100% success rate required for PR submission

### Testing Workflow
```bash
npm run metrics:test    # Validate pipeline integrity
npm run pr:validate     # Validate PR readiness
```
Complete validation before each PR submission.

## Database Scripts

### `run-rls-setup.ts`
Sets up Row-Level Security (RLS) policies for tenant isolation.

### `check-rls.ts`
Validates RLS implementation and tenant isolation.

### `test-db.js`
Basic database connectivity and schema validation tests.

## Testing Scripts

### `analyze-codebase.js`
Detailed codebase analysis including:
- File type categorization
- Line counting with comment/code separation
- Test case enumeration
- Dependency analysis

## GitHub Actions Integration

The `metrics-update.yml` workflow automatically:
- Generates metrics on every PR
- Updates CLAUDE.md on main branch pushes
- Comments PR with current statistics
- Uploads metrics as artifacts

## Usage in Development Workflow

1. **Before committing features:**
   ```bash
   npm run metrics:full
   git add -A
   git commit -m "feat: new feature with updated metrics"
   ```

2. **For academic paper fact-checking:**
   ```bash
   npm run metrics:generate
   cat verified-facts.json | jq '.'
   ```

3. **Automated in CI/CD:**
   - Metrics generated on every PR
   - CLAUDE.md updated automatically
   - Facts verified and tracked over time

## Output Files

- `verified-facts.json` - Structured metrics data
- Console output - Human-readable reports
- Updated `CLAUDE.md` - Project documentation with current metrics

All metrics are verified by actual codebase analysis, not estimates or assumptions.