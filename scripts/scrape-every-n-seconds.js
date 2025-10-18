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
const ENDPOINT_URL = process.env.ENDPOINT_URL || process.env.VERCEL_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'secret';
const INTERVAL_SECONDS = parseInt(process.env.SCRAPE_INTERVAL || '20'); // Default 20s
const LAP_CALC_INTERVAL = parseInt(process.env.LAP_CALC_INTERVAL || '60'); // Default 60s

let successCount = 0;
let errorCount = 0;
let lapCalcSuccessCount = 0;
let lapCalcErrorCount = 0;
let lastSuccessTime = null;
let lastLapCalcTime = null;
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
      console.log(`✅ LEADERBOARD UPDATED (${duration}ms):`, JSON.stringify(data, null, 2));
      console.log(`   Stats: ${successCount} leaderboard updates, ${errorCount} errors`);
    } else {
      errorCount++;
      console.error(`❌ ERROR (${response.status}):`, data);
      console.log(`   Stats: ${successCount} leaderboard updates, ${errorCount} errors`);
    }
  } catch (error) {
    errorCount++;
    console.error(`❌ EXCEPTION:`, error.message);
    console.log(`   Stats: ${successCount} leaderboard updates, ${errorCount} errors`);
  }
}

async function calculateLaps() {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] Calculating laps...`);

    const response = await fetch(`${ENDPOINT_URL}/api/cron/calculate-laps`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      lapCalcSuccessCount++;
      lastLapCalcTime = new Date();
      console.log(`✅ LAP CALCULATION DONE (${duration}ms):`, JSON.stringify(data, null, 2));
      console.log(`   Lap Stats: ${lapCalcSuccessCount} successes, ${lapCalcErrorCount} errors`);
    } else {
      lapCalcErrorCount++;
      console.error(`❌ LAP CALC ERROR (${response.status}):`, data);
      console.log(`   Lap Stats: ${lapCalcSuccessCount} successes, ${lapCalcErrorCount} errors`);
    }
  } catch (error) {
    lapCalcErrorCount++;
    console.error(`❌ LAP CALC EXCEPTION:`, error.message);
    console.log(`   Lap Stats: ${lapCalcSuccessCount} successes, ${lapCalcErrorCount} errors`);
  }
}

// Sequential loop: wait for completion, then delay, then repeat
async function scrapeLoop() {
  while (running) {
    await scrape(); // Wait for leaderboard update to complete

    // Check if it's time to calculate laps
    const now = Date.now();
    const shouldCalculateLaps = !lastLapCalcTime ||
      (now - lastLapCalcTime.getTime()) >= (LAP_CALC_INTERVAL * 1000);

    if (shouldCalculateLaps && running) {
      // Run lap calculation (don't wait for it, let it run in background)
      calculateLaps().catch(err => console.error('Lap calculation failed:', err));
    }

    if (running) {
      // Wait INTERVAL_SECONDS before next leaderboard update
      await new Promise(resolve => setTimeout(resolve, INTERVAL_SECONDS * 1000));
    }
  }
}

// Start
console.log('='.repeat(80));
console.log('🏃 Race Data Scraper Started (Decoupled Architecture)');
console.log('='.repeat(80));
console.log(`Leaderboard: ${ENDPOINT_URL}/api/cron/fetch-race-data`);
console.log(`  Interval: ${INTERVAL_SECONDS} seconds AFTER each request completes`);
console.log(`Lap Calculation: ${ENDPOINT_URL}/api/cron/calculate-laps`);
console.log(`  Interval: ${LAP_CALC_INTERVAL} seconds (runs independently)`);
console.log(`Strategy: Sequential leaderboard updates, async lap calculations`);
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
  console.log(`Leaderboard: ${successCount} successes, ${errorCount} errors`);
  console.log(`  Last success: ${lastSuccessTime?.toISOString() || 'Never'}`);
  console.log(`Lap Calculation: ${lapCalcSuccessCount} successes, ${lapCalcErrorCount} errors`);
  console.log(`  Last success: ${lastLapCalcTime?.toISOString() || 'Never'}`);
  console.log('='.repeat(80));
  setTimeout(() => process.exit(0), 1000); // Give time to finish current request
});

// Log stats every 5 minutes
setInterval(() => {
  console.log('');
  console.log('-'.repeat(40));
  console.log(`📊 Leaderboard Stats: ${successCount} successes, ${errorCount} errors`);
  console.log(`   Last success: ${lastSuccessTime?.toISOString() || 'Never'}`);
  console.log(`📊 Lap Calc Stats: ${lapCalcSuccessCount} successes, ${lapCalcErrorCount} errors`);
  console.log(`   Last success: ${lastLapCalcTime?.toISOString() || 'Never'}`);
  console.log(`⏱️  Uptime: ${Math.floor(process.uptime())} seconds`);
  console.log('-'.repeat(40));
  console.log('');
}, 5 * 60 * 1000);
