// Debug script to test UltraMsg API
const instanceId = 'instance150203';
const token = 'qd23s4ljh60p0vul';
const phone = '+2348066137843';
const body = 'Test from debug script';

async function testWithFetch() {
  console.log('\n=== Test 1: Using fetch with URLSearchParams ===');
  
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', phone);
  params.append('body', body);
  params.append('priority', '10');
  
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat?${params.toString()}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testWithManualUrl() {
  console.log('\n=== Test 2: Using manual URL (no URLSearchParams) ===');
  
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat?token=${token}&to=${encodeURIComponent(phone)}&body=${encodeURIComponent(body)}&priority=10`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testWithRawUrl() {
  console.log('\n=== Test 3: Using raw URL (no encoding) ===');
  
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat?token=${token}&to=${phone}&body=${body.replace(/ /g, '+')}&priority=10`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
    });
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testTokenAlone() {
  console.log('\n=== Test 4: Check if token works with instance status ===');
  
  const url = `https://api.ultramsg.com/${instanceId}/instance/status?token=${token}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('Testing UltraMsg API...');
  console.log('Instance:', instanceId);
  console.log('Token length:', token.length);
  
  await testTokenAlone();
  await testWithManualUrl();
  await testWithRawUrl();
  await testWithFetch();
}

runTests();
