# Next.js Multi-tenant SaaS with Passkeys

**Language**: This project uses Australian English for all documentation and code.

## 🚨 CRITICAL: Every Feature Must Follow Metrics Workflow

**Before implementing ANY feature, read the [MANDATORY Feature Development Workflow](#mandatory-feature-development-workflow) below.**

### Quick Start for New Features
```bash
# 1. Setup and validate baseline
npm run metrics:full && npm run pr:validate

# 2. Create feature branch  
git checkout -b feature/your-feature

# 3. Implement feature with tests

# 4. Pre-commit workflow (MANDATORY)
npm run metrics:full     # Generate metrics
npm run metrics:test     # Validate pipeline  
npm run pr:validate      # Validate PR readiness
git add -A && git commit -m "feat: your feature"

# 5. Create PR (automated metrics included)
git push origin feature/your-feature
gh pr create --title "feat: your feature"
```

**🎯 Result:** Every PR automatically includes verified metrics and DORA classification.

## Project Overview

Modern Next.js application with:
- Passkeys authentication (WebAuthn)
- Drizzle ORM for database
- Multi-tenant architecture
- Vercel deployment optimised

## Architecture Decisions

### Authentication

- **Primary**: Passkeys via SimpleWebAuthn
- **Fallback**: Magic links for unsupported devices
- **Library**: NextAuth v5 with custom WebAuthn adapter

### Multi-tenancy Strategy

- **Database**: Shared database with tenant_id (Row-Level Security)
- **Tenant Resolution**: Subdomain-based (tenant.app.com)
- **Isolation**: Query-level filtering, middleware validation

### Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth + SimpleWebAuthn
- **Deployment**: Vercel with Edge Functions
- **Caching**: Upstash Redis
- **Storage**: Vercel Blob/S3 with tenant isolation

## Implementation Progress

### Phase 1: Foundation ✅ COMPLETE

- [x] Initialise Next.js project with TypeScript
- [x] Setup Drizzle ORM with PostgreSQL
- [x] Configure multi-tenant database schema
- [x] Setup hosted Supabase development environment
- [x] Implement Row-Level Security (RLS) setup
- [x] Create tenant context provider with `withTenantContext` wrapper
- [x] Enforce tenant context throughout database operations
- [x] Add comprehensive tenant isolation tests
- [x] Add database testing infrastructure

### Phase 2: Authentication ✅ COMPLETE

- [x] **Passkeys Authentication**: Complete WebAuthn implementation with SimpleWebAuthn
- [x] **Registration Flow**: Device-based credential creation with biometric support
- [x] **Login Flow**: Passwordless authentication with discoverable credentials
- [x] **Magic Link Fallback**: Email-based authentication for unsupported devices
- [x] **NextAuth v5 Integration**: Custom Drizzle adapter with JWT sessions
- [x] **Route Protection**: Middleware-based authentication with tenant context
- [x] **Security Features**: Challenge replay protection, credential validation
- [x] **Comprehensive Testing**: Unit and integration tests for auth flows
- [x] **Complete Documentation**: Developer guides and implementation examples

### Phase 3: Multi-tenancy ✅ COMPLETE

- [x] **Tenant Resolution**: Subdomain and path-based tenant identification
- [x] **Row-Level Security**: Database-level tenant isolation with PostgreSQL RLS
- [x] **Tenant Context Provider**: Session utilities with automatic tenant validation
- [x] **API Route Protection**: Tenant-scoped database operations
- [x] **Middleware Integration**: Authentication + tenant resolution in single middleware
- [x] **Security Enforcement**: Transaction-scoped tenant context (prevents leakage)
- [x] **Utility Functions**: Helper functions for common tenant operations
- [x] **Comprehensive Testing**: Tenant isolation and boundary tests

### Phase 4: Core Features 🚧 IN PROGRESS

- [x] **Tenant Dashboard**: Comprehensive overview with metrics and activity feed
- [x] **Onboarding Flow**: New user experience with tenant creation/joining
- [x] **Dashboard Layout**: Professional UI with role-based navigation
- [x] **Quick Actions**: Contextual actions based on user permissions
- [x] **Tenant Creation API**: RESTful endpoints for team management
- [x] **User Management**: Complete team invitation, role changes, and member administration
- [x] **Tenant Settings**: Comprehensive configuration management with 7 categories
- [ ] **Billing Integration**: Subscription management and usage tracking
- [ ] **Admin Panel**: Advanced tenant administration features

### Phase 5: Production Ready

- [ ] Setup Vercel deployment
- [ ] Configure edge functions
- [ ] Implement caching strategy
- [ ] Add monitoring and analytics

## Key Files Structure

```text
app/
├── (auth)/
│   ├── login/
│   └── register/
├── [tenant]/
│   ├── dashboard/
│   ├── settings/
│   └── layout.tsx
├── api/
│   ├── auth/[...nextauth]/
│   └── trpc/[trpc]/
lib/
├── db/
│   ├── schema.ts
│   └── index.ts
├── auth/
│   ├── passkeys.ts
│   └── config.ts
└── tenant/
    ├── context.tsx
    └── middleware.ts
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run database migrations
npm run db:push

# Generate Drizzle types
npm run db:generate

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Type check
npm run typecheck

# Lint
npm run lint

# Generate verified metrics
npm run metrics:generate

# Update CLAUDE.md with metrics
npm run metrics:update

# Generate deployment/DORA metrics
npm run metrics:deployment

# Generate and update all metrics (recommended)
npm run metrics:full

# Test metrics pipeline integrity
npm run metrics:test

# Validate PR readiness (before creating PR)
npm run pr:validate
```

## Documentation Requirements

**IMPORTANT**: Documentation must be updated with every feature implementation.

### Before Committing
1. Update relevant project documentation in `docs/1-projects/`
2. Update area documentation if architecture/security changes in `docs/2-areas/`
3. Add code examples or guides to `docs/3-resources/` if needed
4. Ensure all documentation uses Australian English

### MANDATORY Feature Development Workflow

**⚠️ CRITICAL: This workflow MUST be followed for every feature to maintain accurate metrics and documentation.**

#### Step 1: Pre-Development Setup
```bash
# Ensure you're starting with current metrics
npm run metrics:full
npm run metrics:test  # Must pass before starting
git status           # Ensure clean working directory
```

#### Step 2: Feature Implementation
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Implement your feature with tests
# (Normal development process)
```

#### Step 3: MANDATORY Pre-Commit Workflow
```bash
# 1. Update documentation FIRST (always required)
# Update CLAUDE.md phase progress if needed
# Update relevant documentation

# 2. MANDATORY: Generate fresh metrics
npm run metrics:full

# 3. MANDATORY: Validate metrics pipeline
npm run metrics:test
# ❌ If this fails, STOP and fix issues before proceeding

# 4. MANDATORY: Verify tests pass
npm run test         # Unit tests must pass
npm run typecheck    # No TypeScript errors
npm run lint         # No linting errors

# 5. Stage ALL changes including metrics
git add -A

# 6. Commit with metrics in message
git commit -m "feat: Add [feature name]

📊 Updated Metrics:
- Source files: $(cat verified-facts.json | jq -r '.files.sourceFiles')
- Code lines: $(cat verified-facts.json | jq -r '.lines.sourceLines')  
- Test cases: $(cat verified-facts.json | jq -r '.tests.totalTestCases')
- DORA class: $(cat verified-facts.json | jq -r '.deployment.dora.classification')

🔄 Generated with metrics automation"

# 7. MANDATORY: Validate PR readiness
npm run pr:validate
# ❌ If this fails, fix issues before creating PR
```

#### Step 4: MANDATORY PR Creation
```bash
# Final validation before pushing
npm run pr:validate  # Must show "PR is ready for submission!"

# Push to feature branch
git push origin feature/your-feature-name

# Create PR with MANDATORY metrics summary
gh pr create --title "feat: Add [feature name]" --body "## 🚀 Feature Implementation

### Changes
- [Detailed implementation description]
- [Documentation updates]
- [Test coverage added]

### 📊 VERIFIED METRICS (Auto-Generated)
\`\`\`
Source Code Lines: $(cat verified-facts.json | jq -r '.lines.sourceLines')
Test Cases: $(cat verified-facts.json | jq -r '.tests.totalTestCases') ($(cat verified-facts.json | jq -r '.tests.unitTestCases') unit + $(cat verified-facts.json | jq -r '.tests.e2eTestCases') E2E)
Features Implemented: $(cat verified-facts.json | jq -r '.features | length')
Security Features: $(cat verified-facts.json | jq -r '.security | length')
DORA Classification: $(cat verified-facts.json | jq -r '.deployment.dora.classification')
Deployment Frequency: $(cat verified-facts.json | jq -r '.deployment.frequency.category')
Lead Time: $(cat verified-facts.json | jq -r '.deployment.leadTime.category')
\`\`\`

### 📋 Pre-Submit Checklist
- [x] Feature implemented and tested
- [x] Documentation updated
- [x] Metrics generated: \`npm run metrics:full\`
- [x] Pipeline tested: \`npm run metrics:test\` (100% pass rate)
- [x] All tests passing
- [x] TypeScript errors resolved
- [x] Metrics files committed

📈 **Current Project Status:** $(cat verified-facts.json | jq -r '.features | length') major features implemented

See detailed metrics: [CLAUDE.md#project-metrics--progress-tracking](./CLAUDE.md#project-metrics--progress-tracking)
"
```

### MANDATORY PR Checklist ⚠️

**❌ PRs will be REJECTED if any of these items are incomplete:**

#### Code Quality (Must Pass)
- [ ] **Implementation complete** - Feature fully functional
- [ ] **All tests passing** - `npm run test` shows 100% pass rate
- [ ] **TypeScript clean** - `npm run typecheck` shows no errors
- [ ] **Linting clean** - `npm run lint` shows no errors
- [ ] **Build successful** - `npm run build` completes without errors

#### Metrics Requirements (Automatically Enforced)
- [ ] **✅ CRITICAL: Metrics generated** - `npm run metrics:full` executed
- [ ] **✅ CRITICAL: Pipeline validated** - `npm run metrics:test` shows 100% success
- [ ] **✅ CRITICAL: Facts file updated** - `verified-facts.json` committed with changes
- [ ] **✅ CRITICAL: Deployment metrics current** - `deployment-metrics.json` committed
- [ ] **✅ CRITICAL: CLAUDE.md metrics updated** - Current timestamp in metrics table

#### Documentation Requirements
- [ ] **Feature documentation updated** - CLAUDE.md phase progress updated if applicable
- [ ] **Australian English used** throughout all new content
- [ ] **Code examples provided** where relevant for complex features
- [ ] **Security considerations documented** if applicable

#### Automated Validation (GitHub Actions)
- [ ] **✅ Metrics workflow passes** - GitHub Actions shows green checkmark
- [ ] **✅ PR comment includes metrics** - Automatic metrics comment appears
- [ ] **✅ All metrics files committed** - No missing metrics artifacts

### Enforcement Mechanisms

1. **GitHub Actions will FAIL the PR if:**
   - `npm run metrics:test` doesn't return 100% success
   - Required metrics files are missing
   - Pipeline validation fails

2. **Manual Review Requirements:**
   - All checklist items must be completed
   - PR description must include metrics summary
   - Documentation updates must be present

3. **Blocking Conditions:**
   - Missing `verified-facts.json` or `deployment-metrics.json`
   - Metrics timestamp older than commit timestamp
   - Failed pipeline tests

## Environment Variables

**Recommended: Use hosted Supabase instead of local Docker setup**

```env
# Database - Hosted Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Authentication
AUTH_URL=http://localhost:3000
AUTH_SECRET=[random-32-char-string]

# WebAuthn
RP_NAME="Gymnastics Model"
RP_ID=localhost
ORIGIN=http://localhost:3000

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_test_[your-stripe-secret-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[your-stripe-publishable-key]
STRIPE_WEBHOOKS_SECRET=whsec_[your-webhook-signing-secret]
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/login/[your-portal-url]

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Security Considerations

1. **Tenant Isolation**: Every query must include tenant_id filter
2. **Authentication**: Validate tenant membership on login
3. **API Security**: Check tenant context in all API routes
4. **Data Segregation**: Separate storage buckets per tenant
5. **Rate Limiting**: Per-tenant rate limits

## Performance Optimisations

1. **Edge Runtime**: Auth checks on Vercel Edge
2. **Database Indexing**: Index on (tenant_id, *) for all tables
3. **Caching Strategy**:
   - Session data in Redis
   - Tenant metadata cached
   - API responses with stale-while-revalidate
4. **Code Splitting**: Per-tenant lazy loading

## Testing Strategy

- **Unit Tests**: Vitest for business logic
- **Integration Tests**: Test tenant isolation
- **E2E Tests**: Playwright for critical flows
- **Security Tests**: Tenant boundary testing

## Project Metrics & Progress Tracking

**Verified Facts Generation**: Use `node scripts/fact-check-report.js` to generate accurate metrics.

### Current Metrics (Auto-Updated)
*Last updated: 2025-07-01 06:23:20 UTC*

| Metric | Value | Trend |
|--------|-------|-------|
| Source Files | 84 | ↗️ |
| Source Code Lines | 10,067 | ↗️ |
| Test Code Lines | 1,201 | ↗️ |
| Total Test Cases | 101 (95 unit + 6 E2E) | ↗️ |
| Major Features | 9 | ↗️ |
| Security Features | 3 | ↗️ |
| Dependencies | 17 production + 19 dev | → |
| **Deployment Frequency** | Insufficient data (1 total) | → |
| **Lead Time (Acceptance→Deploy)** | Elite (< 1 hour) (0.03d avg) | → |
| **DORA Classification** | Elite (3.67/4.0) | → |

### Feature Progress Tracking
*Updated automatically from file existence checks*

**Phase 1: Foundation** ✅ (4/4 complete)
- Database schema, tenant context, RLS setup

**Phase 2: Authentication** ✅ (6/6 complete)  
- Passkeys, magic links, NextAuth integration

**Phase 3: Multi-tenancy** ✅ (5/5 complete)
- Tenant resolution, middleware, isolation

**Phase 4: Core Features** 🚧 (7/9 complete)
- Dashboard, onboarding, team management, settings
- Missing: billing integration, admin panel

**Phase 5: Production** ⏳ (0/4 started)
- Deployment, caching, monitoring

## Monitoring

- **APM**: Vercel Analytics
- **Error Tracking**: Sentry with tenant context
- **Database**: Connection pooling metrics
- **Custom Metrics**: Tenant usage tracking
