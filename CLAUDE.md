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

- [ ] Initialise Next.js project with TypeScript
- [ ] Setup Drizzle ORM with PostgreSQL
- [ ] Configure multi-tenant database schema
- [ ] Setup development environment

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

## Environment Variables

```env
# Database
DATABASE_URL=

# Authentication
AUTH_URL=
AUTH_SECRET=

# WebAuthn
RP_NAME=
RP_ID=
ORIGIN=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Vercel
VERCEL_URL=
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
