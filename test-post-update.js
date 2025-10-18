// Test script to post a race update
// This helps us see the actual error from the server

const fetch = require('node-fetch');

async function testPostUpdate() {
  const response = await fetch('http://localhost:3000/api/race/updates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: 'Test update',
      contentSv: 'Test uppdatering',
      updateType: 'manual',
      priority: 'medium',
      category: 'general',
      mediaType: 'text',
      allowComments: true,
      sendNotification: false,
      isSticky: false,
    }),
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testPostUpdate();
