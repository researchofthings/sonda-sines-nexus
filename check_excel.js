const XLSX = require('xlsx');

// Read Excel file
const workbook = XLSX.readFile('c:\\Users\\bmber\\Desktop\\Sines_clean.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Check some problematic rows
const range = XLSX.utils.decode_range(worksheet['!ref']);
console.log('Checking some rows around the problematic areas...');

// Check row 501 (where batch 2 failed)
for(let r = 500; r <= 505 && r <= range.e.r; r++) {
  const dateCell = worksheet[XLSX.utils.encode_cell({r, c: 0})];
  const timeCell = worksheet[XLSX.utils.encode_cell({r, c: 1})];
  if(dateCell && timeCell) {
    console.log(`Row ${r+1}: Date="${dateCell.v}", Time="${timeCell.v}"`);
  }
}

// Also check the CSV conversion
const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
const lines = csv.split('\n');
console.log('\nChecking CSV lines around row 501:');
for(let i = 500; i <= 505 && i < lines.length; i++) {
  const parts = lines[i].split(';');
  if(parts.length >= 2) {
    console.log(`CSV Line ${i+1}: Date="${parts[0]}", Time="${parts[1]}"`);
  }
}
