# Database Schema Guide

## Overview

This guide explains the multi-tenant database schema implemented with Drizzle ORM and PostgreSQL.

## Core Tables

### Tenants

The central table for multi-tenancy:

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  subscription_status ENUM('active', 'cancelled', 'past_due', 'trialing') DEFAULT 'trialing',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Key Features:**
- Unique slug for URL-based tenant resolution
- Optional custom domain support
- Flexible settings as JSONB
- Subscription status tracking

### Users

Global user table (not tenant-scoped):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email_verified TIMESTAMP,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Key Features:**
- Single user record across all tenants
- Email as primary identifier
- NextAuth compatible structure

### Tenant Memberships

Many-to-many relationship between users and tenants:

```sql
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member' NOT NULL,
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Key Features:**
- Role-based access control
- Invitation tracking
- Audit trail for membership changes

## Authentication Tables

### Credentials (Passkeys)

Stores WebAuthn credentials:

```sql
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0 NOT NULL,
  transports JSONB,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_used TIMESTAMP
);
```

**Key Features:**
- WebAuthn credential storage
- Counter for replay attack prevention
- Transport method tracking
- User-friendly naming

### Auth Challenges

Temporary challenge storage for WebAuthn:

```sql
CREATE TABLE auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'registration' or 'authentication'
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Key Features:**
- Replay attack prevention
- Automatic expiration
- Type differentiation

### Sessions

NextAuth session management:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Relationships

### Tenant → Users (via Memberships)
- One tenant has many memberships
- Each membership links to one user
- Role-based permissions per tenant

### User → Credentials
- One user can have multiple passkeys
- Each credential belongs to one user
- Enables multi-device authentication

### User → Sessions
- One user can have multiple active sessions
- Sessions expire automatically
- Supports multiple devices

## Multi-Tenant Patterns

### Row-Level Security

All tenant-scoped data includes `tenant_id`:

```typescript
// Always filter by tenant
const tenantUsers = await db
  .select()
  .from(tenantMemberships)
  .where(eq(tenantMemberships.tenantId, currentTenantId))
```

### Tenant Resolution

Three methods for tenant identification:

1. **Subdomain**: `acme.app.com`
2. **Custom Domain**: `acme.com` 
3. **Path-based**: `/app/acme` (fallback)

### Data Isolation

- No cross-tenant data leakage
- Middleware validates tenant access
- API routes check tenant membership

## Utility Functions

### Tenant Operations

```typescript
// Get tenant by slug
const tenant = await getTenantBySlug('acme-corp')

// Check user access
const hasAccess = await userHasTenantAccess(userId, tenantId)

// Get user's role
const role = await getUserTenantRole(userId, tenantId)
```

### Authentication Operations

```typescript
// User management
const user = await getUserByEmail('user@example.com')

// Credential management
const credentials = await getUserCredentials(userId)

// Challenge handling
const challenge = await createChallenge({
  challenge: 'random-string',
  userId,
  type: 'authentication',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
})
```

## Migration Management

### Generating Migrations

```bash
npm run db:generate
```

### Applying Migrations

```bash
npm run db:push
```

### Seeding Data

```bash
npm run db:seed
```

## Development Setup

### Local PostgreSQL with Docker

```bash
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gymnastics_model \
  -p 5432:5432 \
  -d postgres:15
```

### Environment Configuration

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/gymnastics_model"
```

## Security Considerations

### Data Protection
- All foreign keys have CASCADE deletes
- No orphaned data
- Automatic cleanup of expired challenges

### Tenant Isolation
- Every query must include tenant context
- Middleware validates access
- No direct database access from frontend

### Authentication Security
- Passkey credentials stored securely
- Challenge-response prevents replay attacks
- Session tokens are randomly generated

## Performance Optimisations

### Indexing Strategy
```sql
-- Critical indexes for multi-tenancy
CREATE INDEX idx_tenant_memberships_tenant_user ON tenant_memberships(tenant_id, user_id);
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
```

### Connection Pooling
- Single connection in production
- Multiple connections in development
- Automatic connection cleanup

### Query Optimisation
- Use prepared statements
- Select only required fields
- Implement proper pagination