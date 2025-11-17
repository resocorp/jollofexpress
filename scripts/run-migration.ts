// Script to run database migrations using Supabase service client
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read the migration file
  const migrationPath = path.join(__dirname, '../database/migrations/fix_order_items_rls.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🔄 Running migration: fix_order_items_rls.sql');
  console.log('');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DROP POLICY')) {
          console.log('  📝 Dropping existing policy...');
        } else if (statement.includes('CREATE POLICY')) {
          console.log('  📝 Creating new policy...');
        } else if (statement.includes('COMMENT')) {
          console.log('  📝 Adding comment...');
        }

        const { error: stmtError } = await supabase.rpc('exec', {
          query: statement
        });

        if (stmtError) {
          console.error(`  ❌ Error executing statement:`, stmtError);
          throw stmtError;
        }
      }
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('The order_items RLS policy has been updated to:');
    console.log('  - Allow service role access');
    console.log('  - Allow customers to view their own order items');
    console.log('  - Allow kitchen and admin staff to view all order items');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Please run this SQL manually in the Supabase SQL Editor:');
    console.error('https://supabase.com/dashboard/project/_/sql');
    console.error('');
    console.error(migrationSQL);
    process.exit(1);
  }
}

runMigration();
