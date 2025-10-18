function parseTime(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Test with examples from the modal
const testCases = [
  '03:49:00',
  '00:06:20',
  '03:42:40',
  '00:06:21',
  '',
  ' 03:49:00 ',  // with spaces
  '03:49:00\n',  // with newline
];

console.log('Testing parseTime function:\n');
testCases.forEach(test => {
  const result = parseTime(test.trim());
  console.log(`parseTime("${test}".trim()) = ${result} seconds (${Math.floor(result/60)}m ${result%60}s)`);
});
