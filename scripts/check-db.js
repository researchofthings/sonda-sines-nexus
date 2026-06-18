const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      }
    });
  }
}

loadEnv();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDB() {
  // List all tables
  console.log('Checking database...\n');
  
  // Try to get any record from measurements to see columns
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching from measurements:', error);
  } else if (data && data.length > 0) {
    console.log('Measurements table columns:', Object.keys(data[0]));
    console.log('Sample record:', data[0]);
  } else {
    console.log('Measurements table is empty');
  }
  
  // Check current_measurements
  const { data: currentData, error: currentError } = await supabase
    .from('current_measurements')
    .select('*')
    .limit(5);
  
  if (currentError) {
    console.error('Error fetching from current_measurements:', currentError);
  } else {
    console.log('\nCurrent measurements count:', currentData.length);
    if (currentData.length > 0) {
      console.log('Columns:', Object.keys(currentData[0]));
      console.log('Sample:', currentData[0]);
    }
  }
}

checkDB().catch(console.error);
