// Export database to JSON seed data
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'iau24hwc.db');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'seed-data.json');

console.log('Opening database:', DB_PATH);
const db = new Database(DB_PATH, { readonly: true });

// Export all tables
const data = {
  runners: db.prepare('SELECT * FROM runners ORDER BY id').all(),
  performances: db.prepare('SELECT * FROM performances ORDER BY id').all(),
  matchCandidates: db.prepare('SELECT * FROM match_candidates ORDER BY id').all(),
  teams: db.prepare('SELECT * FROM teams ORDER BY id').all(),
};

console.log('Export stats:');
console.log('  Runners:', data.runners.length);
console.log('  Performances:', data.performances.length);
console.log('  Match Candidates:', data.matchCandidates.length);
console.log('  Teams:', data.teams.length);

// Write to file
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
console.log('\nExported to:', OUTPUT_PATH);

db.close();
