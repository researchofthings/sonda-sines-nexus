const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('Loaded environment variables from .env.local');
}

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read CSV file
const csvPath = process.argv[2] || 'C:\\Users\\bmber\\Downloads\\Sines.csv';

console.log(`Reading CSV file: ${csvPath}`);

// Read file with different encodings
let content;
try {
  content = fs.readFileSync(csvPath, 'utf-8');
} catch (e) {
  try {
    content = fs.readFileSync(csvPath, 'latin1');
  } catch (e2) {
    console.error('Could not read file with UTF-8 or Latin1 encoding');
    process.exit(1);
  }
}

// Parse CSV
const lines = content.split(/\r?\n/).filter(l => l.trim());
if (lines.length < 2) {
  console.error('CSV file must have at least a header and one data row');
  process.exit(1);
}

const separator = lines[0].includes(';') ? ';' : ',';
const headers = lines[0].split(separator).map(h => h.trim());

console.log('Headers:', headers);
console.log(`Total rows: ${lines.length - 1}`);

// Map CSV columns to database columns
const columnMap = {
  'Data': 'data',
  'Hora': 'hora',
  'Temperatura ºC': 'temperatura',
  'Temperature (ºC)': 'temperatura',
  'Temperatura ?C': 'temperatura',
  'Temperatura': 'temperatura',
  'Condutividade mS/cm': 'condutividade',
  'SpCondutividade mS/cm': 'sp_condutividade',
  'SpCondutivity (25ºC) mS/cm': 'sp_condutividade',
  'Salinidade PSU': 'salinidade',
  'TDS mg/l': 'tds',
  'pH': 'ph',
  'ORP mV': 'orp',
  'DO mg/l': 'do_mg',
  'DO %sat': 'do_sat',
  'Turbidez NTU': 'turbidez',
  'Focieritrina ug/l': 'focieritrina',
  'Focoeritrina RFU': 'focieritrina_rfu',
  'chlorophyll-a  ug/l': 'clorofila',
  'Clorofila ug/l': 'clorofila',
  'Clorofila RFU': 'clorofila_rfu',
  'Profundidade m': 'profundidade'
};

// Parse rows
const measurements = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(separator).map(v => v.trim());
  const row = {};
  
  headers.forEach((header, index) => {
    const dbColumn = columnMap[header];
    if (dbColumn) {
      const value = values[index];
      if (value === '' || value === undefined) {
        row[dbColumn] = null;
      } else if (dbColumn === 'data') {
        // Convert DD-MM-YY, DD/MM/YY, MM-DD-YY, or MM/DD/YY to YYYY-MM-DD
        const parts = value.split(/[-\/]/);
        if (parts.length === 3) {
          let year = parts[2];
          let month = parts[1];
          let day = parts[0];
          
          // Convert 2-digit year to 4-digit year (assuming 2000s)
          if (year.length === 2) {
            year = '20' + year;
          }
          
          // Check if month > 12, then it's likely DD/MM format and we need to swap
          if (parseInt(month) > 12) {
            // Swap day and month
            [day, month] = [month, day];
          }
          
          // Validate the date
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            row[dbColumn] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // Invalid date, skip this row
            console.warn(`Invalid date: ${value}, skipping row`);
            return;
          }
        } else {
          row[dbColumn] = value;
        }
      } else if (dbColumn === 'hora') {
        row[dbColumn] = value;
      } else {
        row[dbColumn] = parseFloat(value.replace(',', '.'));
      }
    }
  });
  
  // Skip rows with empty data or hora
  if (row.data && row.hora) {
    measurements.push(row);
  }
}

console.log(`Parsed ${measurements.length} measurements`);
console.log('Sample row:', measurements[0]);

// Insert into Supabase in batches (APPEND mode - no clearing)
async function importData() {
  console.log('Importing data in APPEND mode (existing data will be preserved)...');
  
  const batchSize = 500;
  let inserted = 0;
  let errors = [];
  
  for (let i = 0; i < measurements.length; i += batchSize) {
    const batch = measurements.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(measurements.length/batchSize)} (${batch.length} rows)`);
    
    try {
      const { error } = await supabase.from('measurements').insert(batch);
      if (error) {
        console.error(`Batch insert error:`, error);
        errors.push({
          batch: Math.floor(i/batchSize),
          error: error
        });
      } else {
        inserted += batch.length;
        console.log(`Inserted ${batch.length} rows`);
      }
    } catch (err) {
      console.error(`Error inserting batch ${Math.floor(i/batchSize)}:`, err);
      errors.push({
        batch: Math.floor(i/batchSize),
        error: err
      });
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total inserted: ${inserted}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('Error details:', errors);
  }
  
  console.log('\nDone!');
}

importData().catch(console.error);
