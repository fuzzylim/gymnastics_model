#!/usr/bin/env node

// Quick database test script for hosted Supabase
const postgres = require('postgres');

async function testDatabase() {
  console.log('🧪 Testing hosted Supabase database...\n');
  
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('❌ DATABASE_URL not found in .env.local');
    console.log('📝 Create .env.local with your Supabase credentials:');
    console.log('   cp .env.local.example .env.local');
    console.log('   # Then edit .env.local with your values from Supabase dashboard');
    process.exit(1);
  }
  
  try {
    const sql = postgres(dbUrl, {
      max: 1,
      connection: { application_name: 'gymnastics_model_test' }
    });
    
    // Test connection
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    console.log('✅ Database connected successfully!');
    console.log(`📅 Server time: ${result[0].time}`);
    console.log(`🗄️  Database: ${result[0].db}`);
    
    // Check if schema exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'tenants', 'tenant_memberships', 'credentials')
      ORDER BY table_name
    `;
    
    console.log(`\n📊 Schema tables: ${tables.length}/4 found`);
    if (tables.length > 0) {
      tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
    } else {
      console.log('💡 No schema found. Run: npm run db:push');
    }
    
    await sql.end();
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log('🔍 Check your DATABASE_URL in .env.local');
    process.exit(1);
  }
}

testDatabase();