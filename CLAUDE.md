# Next.js Multi-tenant SaaS with Passkeys

**Language**: This project uses Australian English for all documentation and code.

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

### Phase 1: Foundation

- [x] Initialise Next.js project with TypeScript
- [x] Setup Drizzle ORM with PostgreSQL
- [x] Configure multi-tenant database schema
- [x] Setup hosted Supabase development environment

### Phase 2: Authentication

- [ ] Implement passkeys registration flow
- [ ] Implement passkeys login flow
- [ ] Add magic link fallback
- [ ] Setup NextAuth configuration

### Phase 3: Multi-tenancy

- [ ] Implement tenant resolution middleware
- [ ] Create tenant context provider
- [ ] Add row-level security helpers
- [ ] Setup tenant-scoped API routes

### Phase 4: Core Features

- [ ] Build tenant dashboard
- [ ] Implement user management
- [ ] Add billing/subscription logic
- [ ] Create admin panel

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

# Type check
npm run typecheck

# Lint
npm run lint
```

## Documentation Requirements

**IMPORTANT**: Documentation must be updated with every feature implementation.

### Before Committing
1. Update relevant project documentation in `docs/1-projects/`
2. Update area documentation if architecture/security changes in `docs/2-areas/`
3. Add code examples or guides to `docs/3-resources/` if needed
4. Ensure all documentation uses Australian English

### Commit Workflow
```bash
# 1. Update documentation FIRST
# 2. Stage all changes including docs
git add -A

# 3. Commit with descriptive message
git commit -m "feat: Add tenant isolation with updated docs"

# 4. Push to feature branch
git push origin feature/branch-name

# 5. Create PR with documentation summary
gh pr create --title "feat: Add feature" --body "## Changes
- Implementation details
- Documentation updates
- Test coverage"
```

### PR Checklist
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Australian English used throughout
- [ ] PARA structure maintained
- [ ] Examples provided where relevant

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

## Monitoring

- **APM**: Vercel Analytics
- **Error Tracking**: Sentry with tenant context
- **Database**: Connection pooling metrics
- **Custom Metrics**: Tenant usage tracking
