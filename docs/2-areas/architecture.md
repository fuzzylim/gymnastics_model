# Architecture Guidelines

## Overview

This document outlines the architectural principles and patterns used across the application.

## Core Principles

1. **Tenant Isolation**: Every piece of data must be scoped to a tenant
2. **Security First**: Authentication and authorisation at every layer
3. **Performance**: Sub-100ms response times for critical paths
4. **Scalability**: Horizontal scaling via edge functions

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand for client, React Query for server

### Backend
- **API**: Next.js API routes + tRPC
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth v5 + Passkeys
- **Caching**: Upstash Redis

### Infrastructure
- **Hosting**: Vercel
- **Database**: Neon/Supabase PostgreSQL
- **File Storage**: Vercel Blob/AWS S3
- **CDN**: Vercel Edge Network

## Architectural Patterns

### Multi-tenancy

We use a **shared database with row-level security** approach:

```typescript
// Every table includes tenant_id
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  // ... other fields
});

// All queries filtered by tenant
const tenantUsers = await db
  .select()
  .from(users)
  .where(eq(users.tenantId, currentTenantId));
```

### Authentication Flow

1. User initiates login
2. Check if passkeys available
3. If yes: WebAuthn challenge/response
4. If no: Fallback to magic link
5. Create session with tenant context
6. All subsequent requests validate tenant access

### API Architecture

```
Client → Next.js Middleware → API Route → Service Layer → Database
            ↓
      Tenant Validation
```

### Caching Strategy

- **Edge**: Static assets, public data
- **Redis**: Sessions, tenant metadata
- **Database**: Query result caching
- **Client**: React Query with stale-while-revalidate

## Security Architecture

### Defense in Depth

1. **Edge**: Rate limiting, DDoS protection
2. **Application**: Input validation, CSRF protection
3. **Database**: Prepared statements, row-level security
4. **Infrastructure**: VPC, security groups

### Tenant Boundaries

- Separate storage buckets per tenant
- Database queries always include tenant_id
- API routes validate tenant membership
- Background jobs scoped to tenant

## Performance Guidelines

### Database
- Index on (tenant_id, *) for all tables
- Connection pooling with PgBouncer
- Read replicas for analytics

### Application
- Edge runtime for auth checks
- Lazy loading per tenant
- Image optimisation with next/image
- Code splitting at route level

### Monitoring
- Real User Monitoring (RUM)
- Application Performance Monitoring (APM)
- Error tracking with tenant context
- Custom business metrics

## Deployment Architecture

```
Developer → GitHub → CI/CD → Vercel
                       ↓
                  Preview Deploy
                       ↓
                  Production
```

### Environment Strategy
- Development: Local with Docker
- Staging: Vercel preview deployments
- Production: Vercel with custom domain

## Data Architecture

### Schema Design Principles
1. Normalise to 3NF minimum
2. Denormalise for performance where needed
3. Use UUIDs for all primary keys
4. Soft deletes with deleted_at timestamp

### Backup Strategy
- Daily automated backups
- Point-in-time recovery enabled
- Cross-region replication
- Tenant-specific export capability