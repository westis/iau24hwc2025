#!/usr/bin/env node

/**
 * Custom scraping script - Run this to scrape every N seconds
 *
 * ADVANTAGES:
 * - You control the interval (even 10 seconds if needed!)
 * - No external service dependencies
 * - Free (runs on your computer or VPS)
 *
 * DISADVANTAGES:
 * - Must keep running (computer/server must stay on)
 * - No built-in monitoring/alerts
 * - If script crashes, scraping stops
 *
 * USAGE:
 *   node scripts/scrape-every-n-seconds.js
 *
 * PRODUCTION USAGE (with process manager):
 *   pm2 start scripts/scrape-every-n-seconds.js --name race-scraper
 */

// Configuration
const ENDPOINT_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || '534bdef9ca6fa5fef4a324b8b895b17b8f942a8bd9c3f9ef10b61819a7e545ba';
const INTERVAL_SECONDS = parseInt(process.env.SCRAPE_INTERVAL || '30'); // Default 30s

let successCount = 0;
let errorCount = 0;
let lastSuccessTime = null;
let running = true;

async function scrape() {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] Fetching race data...`);

    const response = await fetch(`${ENDPOINT_URL}/api/cron/fetch-race-data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      successCount++;
      lastSuccessTime = new Date();
      console.log(`✅ SUCCESS (${duration}ms):`, JSON.stringify(data, null, 2));
      console.log(`   Stats: ${successCount} successes, ${errorCount} errors`);
    } else {
      errorCount++;
      console.error(`❌ ERROR (${response.status}):`, data);
      console.log(`   Stats: ${successCount} successes, ${errorCount} errors`);
    }
  } catch (error) {
    errorCount++;
    console.error(`❌ EXCEPTION:`, error.message);
    console.log(`   Stats: ${successCount} successes, ${errorCount} errors`);
  }
}

// Sequential loop: wait for completion, then delay, then repeat
async function scrapeLoop() {
  while (running) {
    await scrape(); // Wait for this request to complete

    if (running) {
      // Wait INTERVAL_SECONDS before next request
      await new Promise(resolve => setTimeout(resolve, INTERVAL_SECONDS * 1000));
    }
  }
}

// Start
console.log('='.repeat(80));
console.log('🏃 Race Data Scraper Started');
console.log('='.repeat(80));
console.log(`Endpoint: ${ENDPOINT_URL}/api/cron/fetch-race-data`);
console.log(`Interval: ${INTERVAL_SECONDS} seconds AFTER each request completes`);
console.log(`Strategy: Sequential (prevents request stacking)`);
console.log(`Started: ${new Date().toISOString()}`);
console.log('='.repeat(80));
console.log('');

// Start the sequential scraping loop
scrapeLoop();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🛑 Shutting down...');
  running = false; // Stop the loop
  console.log(`Total successes: ${successCount}`);
  console.log(`Total errors: ${errorCount}`);
  console.log(`Last success: ${lastSuccessTime?.toISOString() || 'Never'}`);
  console.log('='.repeat(80));
  setTimeout(() => process.exit(0), 1000); // Give time to finish current request
});

// Log stats every 5 minutes
setInterval(() => {
  console.log('');
  console.log('-'.repeat(40));
  console.log(`📊 Stats: ${successCount} successes, ${errorCount} errors`);
  console.log(`⏰ Last success: ${lastSuccessTime?.toISOString() || 'Never'}`);
  console.log(`⏱️  Uptime: ${Math.floor(process.uptime())} seconds`);
  console.log('-'.repeat(40));
  console.log('');
}, 5 * 60 * 1000);
