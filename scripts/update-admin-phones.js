// Update admin phone numbers in database
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

const NEW_PHONE = '+2348106828147';

async function updateAdminPhones() {
  console.log('Updating admin phone numbers to:', NEW_PHONE);
  
  // Get current settings
  const { data: currentSettings, error: fetchError } = await supabase
    .from('notification_settings')
    .select('value')
    .eq('key', 'admin_notifications')
    .single();
  
  if (fetchError) {
    console.error('Error fetching settings:', fetchError);
    return;
  }
  
  console.log('Current settings:', currentSettings?.value);
  
  // Update with new phone number
  const updatedValue = {
    ...currentSettings?.value,
    phone_numbers: [NEW_PHONE],
  };
  
  const { data, error } = await supabase
    .from('notification_settings')
    .update({ value: updatedValue })
    .eq('key', 'admin_notifications')
    .select();
  
  if (error) {
    console.error('Error updating:', error);
    return;
  }
  
  console.log('Updated successfully:', data);
}

updateAdminPhones();
