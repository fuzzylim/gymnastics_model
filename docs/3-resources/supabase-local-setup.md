# Supabase Local Development Setup

## Overview

This guide explains how to set up and use Supabase for local development, including database, authentication, and storage services.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- Port availability: 3100, 5432, 8000, 9000

## Quick Start

### 1. Start Supabase Services

```bash
./scripts/supabase-start.sh
```

This will start all Supabase services including:
- PostgreSQL database
- Authentication service (GoTrue)
- REST API (PostgREST)
- Realtime subscriptions
- Storage service
- Studio (management UI)
- Email testing (Inbucket)

### 2. Access Points

After starting, you can access:

- **Supabase Studio**: http://localhost:3100
  - Username: `supabase`
  - Password: `this_password_is_insecure_and_should_be_updated`

- **REST API**: http://localhost:8000
  - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
  - Service Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

- **Database**: `postgresql://postgres:postgres@localhost:5432/postgres`

- **Email Testing**: http://localhost:9000
  - View all emails sent by the auth service

### 3. Run Migrations

```bash
./scripts/migrate-supabase.sh
```

This will:
1. Wait for the database to be ready
2. Push your Drizzle schema to the database
3. Optionally seed demo data

## Environment Configuration

### Development .env

```env
# Database URL for Supabase local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Supabase Configuration
SUPABASE_URL="http://localhost:8000"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# NextAuth with Supabase
AUTH_URL="http://localhost:3000"
AUTH_SECRET="your-generated-secret"
```

## Working with the Database

### Using Drizzle Studio

```bash
npm run db:studio
```

This opens Drizzle's database browser at http://localhost:4983

### Direct Database Access

```bash
# Connect with psql
docker exec -it supabase-db psql -U postgres

# List tables
\dt

# Describe a table
\d tenants
```

### Running SQL Queries

You can run SQL directly in Supabase Studio's SQL Editor or via psql.

## Authentication Integration

### Using Supabase Auth with Passkeys

While Supabase doesn't natively support WebAuthn, we can use it alongside our custom passkey implementation:

1. Use Supabase for session management
2. Store passkey credentials in our custom tables
3. Integrate both in NextAuth

### Email Testing

All emails sent by Supabase Auth are captured by Inbucket:
- View emails at http://localhost:9000
- No actual emails are sent
- Perfect for testing auth flows

## Storage Service

### Uploading Files

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/avatar.png', file)
```

### Creating Buckets

Use Supabase Studio or the API to create storage buckets.

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using a port
lsof -i :5432

# Change ports in docker-compose.yml
POSTGRES_PORT=5433 docker-compose up
```

### Database Connection Issues

```bash
# Check if database is ready
docker exec supabase-db pg_isready -U postgres

# View database logs
docker logs supabase-db
```

### Reset Everything

```bash
# Stop services and delete all data
docker-compose down -v
rm -rf supabase/db/data
rm -rf supabase/storage

# Start fresh
./scripts/supabase-start.sh
```

## Production Migration

When ready for production:

1. Create a Supabase project at https://supabase.com
2. Get production connection strings
3. Run migrations on production database
4. Update environment variables

## Security Notes

⚠️ **Important**: The default keys and passwords are for local development only!

For production:
- Generate new JWT secret
- Use secure passwords
- Enable RLS (Row Level Security)
- Configure proper CORS settings
- Use environment-specific keys

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Self-hosting Guide](https://supabase.com/docs/guides/self-hosting)