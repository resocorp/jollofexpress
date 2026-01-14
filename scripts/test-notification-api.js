// Test the notification API endpoint
async function testNotificationAPI() {
  const response = await fetch('http://localhost:3000/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: '+2348066137843'
    })
  });
  
  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', data);
}

testNotificationAPI();
