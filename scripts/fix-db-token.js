// Fix the database token
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const correctToken = envVars.ULTRAMSG_TOKEN;
const correctInstanceId = envVars.ULTRAMSG_INSTANCE_ID;

async function fixToken() {
  console.log('Updating database with correct token...');
  console.log('Instance ID:', correctInstanceId);
  console.log('Token:', correctToken);
  
  const { data, error } = await supabase
    .from('notification_settings')
    .update({
      value: {
        enabled: true,
        instance_id: correctInstanceId,
        token: correctToken,
      }
    })
    .eq('key', 'ultramsg')
    .select();
  
  if (error) {
    console.error('Error updating:', error);
    return;
  }
  
  console.log('Updated successfully:', data);
  
  // Verify
  const { data: verify } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', 'ultramsg')
    .single();
    
  console.log('Verified:', verify?.value);
}

fixToken();
