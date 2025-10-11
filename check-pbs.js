const data = require('./data/seed-data.json');
const runners = data.runners;
const withPB = runners.filter(r => r.personal_best_all_time !== null).length;
const withDuv = runners.filter(r => r.duv_id !== null).length;
console.log('Total runners:', runners.length);
console.log('With DUV ID:', withDuv);
console.log('With PB:', withPB);
