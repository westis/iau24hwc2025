// Export database to JSON seed data
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'iau24hwc.db');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'seed-data.json');

console.log('Opening database:', DB_PATH);
const db = new Database(DB_PATH, { readonly: true });

// Export runners with their performance history
const runners = db.prepare('SELECT * FROM runners ORDER BY id').all();

// Add performance history to each runner
const runnersWithPerformances = runners.map(runner => {
  const performances = db.prepare('SELECT * FROM performances WHERE runner_id = ? ORDER BY event_date DESC')
    .all(runner.id)
    .map(p => ({
      eventId: p.event_id,
      eventName: p.event_name,
      date: p.event_date,
      distance: p.distance,
      rank: p.rank,
      eventType: p.event_type,
    }));

  // Calculate years from performance history
  let allTimeYear = runner.personal_best_all_time_year;
  let last2YearsYear = runner.personal_best_last_2_years_year;

  if (!allTimeYear && runner.personal_best_all_time && performances.length > 0) {
    const bestPerf = performances.find(p => Math.abs(p.distance - runner.personal_best_all_time) < 0.01);
    if (bestPerf) {
      allTimeYear = new Date(bestPerf.date).getFullYear();
    }
  }

  if (!last2YearsYear && runner.personal_best_last_2_years && performances.length > 0) {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const recentPerfs = performances.filter(p => new Date(p.date) >= threeYearsAgo);
    const bestRecentPerf = recentPerfs.find(p => Math.abs(p.distance - runner.personal_best_last_2_years) < 0.01);
    if (bestRecentPerf) {
      last2YearsYear = new Date(bestRecentPerf.date).getFullYear();
    }
  }

  return {
    ...runner,
    personal_best_all_time_year: allTimeYear,
    personal_best_last_2_years_year: last2YearsYear,
    performanceHistory: performances,
  };
});

const data = {
  runners: runnersWithPerformances,
  performances: db.prepare('SELECT * FROM performances ORDER BY id').all(),
  matchCandidates: db.prepare('SELECT * FROM match_candidates ORDER BY id').all(),
  teams: db.prepare('SELECT * FROM teams ORDER BY id').all(),
};

console.log('Export stats:');
console.log('  Runners:', data.runners.length);
console.log('  Performances:', data.performances.length);
console.log('  Match Candidates:', data.matchCandidates.length);
console.log('  Teams:', data.teams.length);
console.log('  Runners with PB years:', data.runners.filter(r => r.personal_best_all_time_year || r.personal_best_last_2_years_year).length);

// Write to file
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
console.log('\nExported to:', OUTPUT_PATH);

db.close();
