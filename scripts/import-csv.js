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
    console.error('Failed to read file:', e2);
    process.exit(1);
  }
}

// Parse CSV
const lines = content.split(/\r?\n/).filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim());

console.log('Headers:', headers);
console.log(`Total rows: ${lines.length - 1}`);

// Map CSV columns to database columns
const columnMap = {
  'Data': 'data',
  'Hora': 'hora',
  'Temperatura ºC': 'temperatura',
  'Condutividade mS/cm': 'condutividade',
  'SpCondutividade mS/cm': 'sp_condutividade',
  'Salinidade PSU': 'salinidade',
  'TDS mg/l': 'tds',
  'pH': 'ph',
  'ORP mV': 'orp',
  'DO mg/l': 'do_mg',
  'DO %sat': 'do_sat',
  'Turbidez NTU': 'turbidez',
  'Focieritrina ug/l': 'focieritrina',
  'Ficoeritrina RFU': 'focieritrina_rfu',
  'Clorofila ug/l': 'clorofila',
  'Clorofila RFU': 'clorofila_rfu',
  'Profundidade m': 'profundidade',
  'Cabo V': 'cabo'
};

// Parse rows
const measurements = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.trim());
  const row = {};
  
  headers.forEach((header, index) => {
    const dbColumn = columnMap[header];
    if (dbColumn) {
      const value = values[index];
      if (value === '' || value === undefined) {
        row[dbColumn] = null;
      } else if (dbColumn === 'data') {
        // Convert DD-MM-YYYY to YYYY-MM-DD
        const parts = value.split('-');
        if (parts.length === 3) {
          row[dbColumn] = `${parts[2]}-${parts[1]}-${parts[0]}`;
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
  
  measurements.push(row);
}

console.log(`Parsed ${measurements.length} measurements`);
console.log('Sample row:', measurements[0]);

// Insert into Supabase in batches
async function importData() {
  // First, clear existing data
  console.log('Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('measurements')
    .delete()
    .neq('id', 0);
  
  if (deleteError) {
    console.error('Error clearing data:', deleteError);
  } else {
    console.log('Existing data cleared');
  }
  
  const batchSize = 100;
  let inserted = 0;
  let errors = [];
  
  for (let i = 0; i < measurements.length; i += batchSize) {
    const batch = measurements.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('measurements')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
      errors.push({ batch: i, error });
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${measurements.length} rows`);
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Total inserted: ${inserted}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('Error details:', errors.slice(0, 3));
  }
}

importData().catch(console.error);
