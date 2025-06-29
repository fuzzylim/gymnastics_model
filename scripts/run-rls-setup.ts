import { config } from 'dotenv';
config();

import { promises as fs } from 'fs';
import postgres from 'postgres';

async function setupRLS() {
  console.log('🔐 Setting up Row Level Security...');
  
  const sql = postgres(process.env.DATABASE_URL || '', {
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Read the SQL file
    const sqlContent = await fs.readFile('./scripts/setup-rls.sql', 'utf8');
    
    // Split into statements (basic approach, might need improvement for complex SQL)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log();
    
    // Execute each statement
    for (const statement of statements) {
      try {
        if (statement.trim().length > 0) {
          await sql`${sql.unsafe(statement)}`;
          console.log('✅ Executed:', statement.substring(0, 60) + '...');
        }
      } catch (error: any) {
        console.error('❌ Error executing:', statement.substring(0, 60) + '...');
        console.error('   Error:', error.message);
      }
    }
    
    console.log('✅ RLS setup completed');
    
  } catch (error: any) {
    console.error('❌ Error setting up RLS:', error.message);
  } finally {
    await sql.end();
  }
}

setupRLS();
