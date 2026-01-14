// Test with environment variables exactly as the app does
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

const instanceId = envVars.ULTRAMSG_INSTANCE_ID;
const token = envVars.ULTRAMSG_TOKEN;

console.log('=== Environment Check ===');
console.log('Instance ID:', JSON.stringify(instanceId));
console.log('Token:', JSON.stringify(token));
console.log('Token length:', token?.length);
console.log('Token chars:', token?.split('').map(c => c.charCodeAt(0)));

async function testSend() {
  const phone = '+2348066137843';
  const body = 'Test from env script';
  
  // Build URL exactly like the client does
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', phone);
  params.append('body', body);
  params.append('priority', '10');
  
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat?${params.toString()}`;
  
  console.log('\n=== Request Details ===');
  console.log('Full URL:', url);
  console.log('Params string:', params.toString());
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = await response.json();
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSend();
