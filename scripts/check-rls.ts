import { config } from 'dotenv'
config()

import postgres from 'postgres'

async function checkRLS() {
    console.log('🔐 Checking Row Level Security (RLS) setup...\n')

    const sql = postgres(process.env.DATABASE_URL!, {
        ssl: { rejectUnauthorized: false }
    })

    try {
        // Check if RLS is enabled on tables
        const rlsStatus = await sql`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'tenants', 'tenant_memberships', 'credentials', 'sessions', 'accounts', 'auth_challenges')
      ORDER BY tablename
    `

        console.log('📊 RLS Status per table:')
        console.table(rlsStatus.map(t => ({
            table: t.tablename,
            rls_enabled: t.rowsecurity ? '✅ Yes' : '❌ No'
        })))

        // Check for existing policies
        const policies = await sql`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `

        if (policies.length > 0) {
            console.log('\n📋 Existing RLS Policies:')
            console.table(policies.map(p => ({
                table: p.tablename,
                policy: p.policyname,
                command: p.cmd,
                roles: p.roles
            })))
        } else {
            console.log('\n⚠️  No RLS policies found!')
        }

        // Check for indexes (important for performance)
        const indexes = await sql`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('tenant_memberships', 'sessions', 'credentials')
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `

        console.log('\n🚀 Performance Indexes:')
        if (indexes.length > 0) {
            console.table(indexes.map(i => ({
                table: i.tablename,
                index: i.indexname,
                definition: i.indexdef.substring(0, 60) + '...'
            })))
        } else {
            console.log('⚠️  No custom indexes found (only primary keys exist)')
        }

    } catch (error) {
        console.error('❌ Error checking RLS:', error)
    } finally {
        await sql.end()
    }
}

checkRLS()