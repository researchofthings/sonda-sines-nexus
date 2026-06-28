const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\bmber\\Downloads\\Sines_cleaned.csv', 'utf-8');
const lines = content.split('\n').filter(l => l.trim());
const headers = lines[0].split(',').map(h => h.trim());
console.log('Actual headers:', headers);
console.log('\nChecking first data row:');
const firstRow = lines[1].split(',').map(h => h.trim());
headers.forEach((header, i) => {
  console.log(`${header}: '${firstRow[i]}'`);
});
