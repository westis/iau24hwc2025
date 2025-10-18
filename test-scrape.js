#!/usr/bin/env node

const ENDPOINT_URL = 'https://iau24hwc2025.ultramarathon.se';
const CRON_SECRET = '534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba';

async function test() {
  console.log(`Testing: ${ENDPOINT_URL}/api/cron/fetch-race-data\n`);

  const response = await fetch(`${ENDPOINT_URL}/api/cron/fetch-race-data`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
