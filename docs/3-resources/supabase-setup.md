# Supabase Setup Guide

## Using Hosted Supabase (Recommended)

Instead of running Supabase locally, use hosted Supabase for all environments:

### 1. Create Projects

1. **Development**: Create a project at https://supabase.com
2. **Production**: Create a separate production project
3. **Testing**: Use same as dev or create dedicated test project

### 2. Get Credentials

From your Supabase project dashboard:

1. Go to **Settings → Database**
   - Copy the connection string (postgres://...)
   
2. Go to **Settings → API**
   - Copy the Project URL
   - Copy the `anon` key
   - Copy the `service_role` key

### 3. Environment Setup

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth
AUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret-key-here

# WebAuthn
RP_NAME="Gymnastics Model"
RP_ID=localhost
ORIGIN=http://localhost:3000
```

### 4. Deploy Schema

```bash
# Push your Drizzle schema to Supabase
npm run db:push

# Verify with Drizzle Studio
npm run db:studio
```

### 5. Benefits of Hosted Supabase

- ✅ No Docker dependencies
- ✅ Automatic backups
- ✅ Built-in auth UI
- ✅ Edge functions
- ✅ Real-time subscriptions
- ✅ Storage buckets
- ✅ Row Level Security built-in

## Production Environment

For production, create a separate Supabase project:

1. Create production project at https://supabase.com
2. Set up environment variables in Vercel/your hosting platform
3. Use same schema deployment: `npm run db:push`
4. Configure custom domain and SSL if needed