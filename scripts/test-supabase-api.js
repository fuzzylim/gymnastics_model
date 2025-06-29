#!/usr/bin/env node

// Test Supabase API connectivity instead of direct PostgreSQL
// Note: fetch is global in Node.js 18+

async function testSupabaseAPI() {
  console.log('🧪 Testing Supabase API connectivity...\n');
  
  // Load environment variables
  require('dotenv').config();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !anonKey) {
    console.log('❌ Missing Supabase environment variables');
    console.log('📝 Make sure .env has:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  try {
    // Test API health
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (!healthResponse.ok) {
      throw new Error(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    console.log('✅ Supabase API connection successful!');
    console.log(`📍 Project URL: ${supabaseUrl}`);
    console.log(`🔑 API Key: ${anonKey.substring(0, 20)}...`);
    
    // Try to query existing tables
    const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (tablesResponse.ok) {
      console.log('✅ REST API accessible');
    } else {
      console.log('⚠️ REST API accessible but no tables found (expected before migration)');
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Supabase API test failed: ${error.message}`);
    return false;
  }
}

testSupabaseAPI().then(success => {
  if (success) {
    console.log('\n💡 Next steps:');
    console.log('   1. Deploy schema: npm run db:push');
    console.log('   2. If that fails due to IPv6, use Supabase dashboard to run SQL');
    console.log('   3. Then test: npm run test');
  }
  process.exit(success ? 0 : 1);
});