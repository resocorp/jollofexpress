// Check database notification settings
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

async function checkSettings() {
  console.log('=== Environment Variables ===');
  console.log('ULTRAMSG_INSTANCE_ID:', envVars.ULTRAMSG_INSTANCE_ID);
  console.log('ULTRAMSG_TOKEN:', envVars.ULTRAMSG_TOKEN);
  
  console.log('\n=== Database Settings ===');
  const { data, error } = await supabase
    .from('notification_settings')
    .select('key, value')
    .in('key', ['ultramsg', 'customer_notifications', 'admin_notifications']);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Raw data:', JSON.stringify(data, null, 2));
  
  // Check ultramsg settings specifically
  const ultramsgSettings = data?.find(d => d.key === 'ultramsg');
  if (ultramsgSettings) {
    console.log('\n=== UltraMsg Settings from DB ===');
    console.log('Value:', JSON.stringify(ultramsgSettings.value, null, 2));
    console.log('Has instance_id:', !!ultramsgSettings.value?.instance_id);
    console.log('Has token:', !!ultramsgSettings.value?.token);
    if (ultramsgSettings.value?.token) {
      console.log('DB Token length:', ultramsgSettings.value.token.length);
      console.log('DB Token first 4:', ultramsgSettings.value.token.substring(0, 4));
    }
  }
}

checkSettings();
