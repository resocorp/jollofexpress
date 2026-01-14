// Update restaurant phone number in database
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

async function updateRestaurantPhone() {
  console.log('Updating restaurant phone to:', NEW_PHONE);
  
  // Get current settings
  const { data: currentSettings, error: fetchError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'restaurant_info')
    .single();
  
  if (fetchError) {
    console.error('Error fetching settings:', fetchError);
    return;
  }
  
  console.log('Current settings:', currentSettings?.value);
  
  // Update with new phone number
  const updatedValue = {
    ...currentSettings?.value,
    phone: NEW_PHONE,
  };
  
  const { data, error } = await supabase
    .from('settings')
    .update({ value: updatedValue })
    .eq('key', 'restaurant_info')
    .select();
  
  if (error) {
    console.error('Error updating:', error);
    return;
  }
  
  console.log('Updated successfully:', data);
}

updateRestaurantPhone();
