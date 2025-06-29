# Row-Level Security (RLS) Guide

## Overview

Row-Level Security (RLS) provides database-level tenant isolation in our multi-tenant architecture. This guide covers implementation patterns, best practices, and troubleshooting.

## Implementation

### Database Setup

The RLS setup is automated through scripts in the `scripts/` directory:

1. **setup-rls.sql** - Core RLS policies for all tables
2. **run-rls-setup.ts** - TypeScript runner for applying RLS (`npm run db:setup-rls`)
3. **check-rls.ts** - Verification script for RLS policies (`npm run db:check-rls`)

### Key Concepts

#### 1. Tenant Context

Every database query must include tenant context using the `withTenantContext` wrapper:

```typescript
// Using tenant context provider
import { withTenantContext } from '@/lib/db/tenant-context';

const result = await withTenantContext(tenantId, async (db) => {
  return await db.select().from(users);
});
```

The `withTenantContext` function uses PostgreSQL transactions to set the session variable `app.current_tenant_id` within transaction scope, which automatically resets when the transaction ends, preventing tenant context leakage in connection pools.

#### 2. RLS Policies

Each table has policies enforcing tenant isolation:

```sql
-- Example: Users table RLS policy
CREATE POLICY tenant_isolation ON users
  FOR ALL 
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

#### 3. Transaction-Level Context

Tenant ID is set within transaction scope for automatic cleanup:

```typescript
// Set within transaction (automatically cleaned up)
await database.transaction(async (tx) => {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
  // All operations here are tenant-scoped
  // Context automatically resets when transaction ends
})
```

## Security Considerations

### Critical Rules

1. **Never bypass RLS** - Always use `withTenantContext` for tenant-scoped data
2. **Use utility functions** - Use functions from `lib/db/tenant-utils.ts` instead of raw queries
3. **Validate tenant membership** - Check user belongs to tenant on auth
4. **Audit queries** - Log tenant context for all operations
5. **Test boundaries** - Verify isolation in test suite

### Common Vulnerabilities

1. **Direct database access** - Use `withTenantContext` or tenant utilities instead
2. **Missing tenant context** - Always wrap tenant-scoped operations in `withTenantContext`
3. **Cross-tenant joins** - Carefully review all JOIN operations
4. **Admin access** - Separate admin operations from tenant queries
5. **Bypassing utility functions** - Use `lib/db/tenant-utils.ts` functions for common operations

## Testing RLS

### Unit Tests

```typescript
describe('RLS policies', () => {
  it('prevents cross-tenant data access', async () => {
    const tenant1Data = await withTenantContext(tenant1Id, fetchUsers);
    const tenant2Data = await withTenantContext(tenant2Id, fetchUsers);
    
    expect(tenant1Data).not.toContainEqual(tenant2Data[0]);
  });
});
```

### Manual Testing

```bash
# Setup RLS policies
npm run db:setup-rls

# Run RLS verification
npm run db:check-rls

# Test specific tenant isolation
npm run test:tenant-isolation
```

## Performance Optimisation

### Indexing Strategy

All tables must have composite indexes:

```sql
CREATE INDEX idx_users_tenant ON users(tenant_id, created_at);
CREATE INDEX idx_projects_tenant ON projects(tenant_id, status);
```

### Query Patterns

1. **Filter early** - Apply tenant filter first in queries
2. **Batch operations** - Group by tenant for bulk operations
3. **Connection pooling** - Separate pools per tenant for high-traffic

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check RLS policies are enabled
   - Verify tenant context is set
   - Review policy conditions

2. **Empty results**
   - Confirm tenant_id matches
   - Check session variables
   - Verify data exists for tenant

3. **Performance degradation**
   - Review index usage
   - Check query plans
   - Consider partitioning for large tenants

### Debug Queries

```sql
-- Check current tenant context
SELECT current_setting('app.current_tenant_id', true);

-- View active RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Test policy manually
SET app.current_tenant_id = 'tenant-uuid';
SELECT * FROM users; -- Should only show tenant's users
```

## Migration Management

When adding new tables:

1. Include `tenant_id` column
2. Add foreign key to `tenants` table
3. Create RLS policy
4. Add composite index
5. Update seed data with tenant context

Example migration:

```typescript
export async function up(db: DrizzleDb) {
  // 1. Create table with tenant_id
  await db.schema.createTable('new_table', {
    id: uuid('id').primaryKey(),
    tenant_id: uuid('tenant_id').notNull(),
    // ... other columns
  });
  
  // 2. Add foreign key
  await db.schema.alterTable('new_table')
    .addForeignKey(['tenant_id'], 'tenants', ['id']);
  
  // 3. Apply RLS (run setup-rls.sql)
  await db.execute(rlsSetupSql);
}
```

## Best Practices

1. **Consistent naming** - Always use `tenant_id` column name
2. **Early validation** - Check tenant context at API entry points
3. **Explicit context** - Make tenant context visible in function signatures
4. **Comprehensive testing** - Test every new feature for tenant isolation
5. **Documentation** - Document any RLS exceptions clearly

## Related Resources

- [Architecture Overview](../2-areas/architecture.md#multi-tenancy)
- [Database Schema Guide](./database-schema-guide.md)
- [Security Guidelines](../2-areas/security.md)