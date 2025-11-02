/**
 * Clear Old Print Jobs
 * Removes old pending print jobs from the queue
 * 
 * Usage: node scripts/clear-old-print-jobs.js [hours]
 * Example: node scripts/clear-old-print-jobs.js 24  # Clear jobs older than 24 hours
 */

// Load environment variables
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const HOURS_OLD = parseInt(process.argv[2] || '24');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🗑️  Clear Old Print Jobs');
console.log('=======================\n');
console.log(`Removing jobs older than ${HOURS_OLD} hours\n`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY\n');
  process.exit(1);
}

async function clearOldJobs() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - HOURS_OLD);
    
    console.log(`Cutoff time: ${cutoffTime.toISOString()}\n`);
    
    // Get old pending jobs
    const { data: oldJobs, error: fetchError } = await supabase
      .from('print_queue')
      .select('id, created_at, order_id')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString());
    
    if (fetchError) {
      console.error('❌ Error fetching jobs:', fetchError.message);
      process.exit(1);
    }
    
    if (!oldJobs || oldJobs.length === 0) {
      console.log('✅ No old jobs to clear');
      process.exit(0);
    }
    
    console.log(`Found ${oldJobs.length} old job(s):\n`);
    oldJobs.forEach((job, index) => {
      const age = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000 / 3600);
      console.log(`   ${index + 1}. ${job.id.substring(0, 8)}... (${age}h old)`);
    });
    
    console.log('\n⚠️  These jobs will be marked as failed.\n');
    
    // Mark as failed instead of deleting (for audit trail)
    const { error: updateError } = await supabase
      .from('print_queue')
      .update({
        status: 'failed',
        error_message: `Cleared: Job older than ${HOURS_OLD} hours`,
        processed_at: new Date().toISOString(),
      })
      .in('id', oldJobs.map(j => j.id));
    
    if (updateError) {
      console.error('❌ Error updating jobs:', updateError.message);
      process.exit(1);
    }
    
    console.log(`✅ Cleared ${oldJobs.length} old job(s)\n`);
    console.log('Jobs marked as failed (not deleted) for audit trail.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearOldJobs();
