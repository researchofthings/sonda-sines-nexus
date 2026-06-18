const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugHistory() {
  console.log('Fetching temperatura history...\n');
  
  const { data, error } = await supabase
    .from('measurements')
    .select('id, data, hora, temperatura')
    .not('temperatura', 'is', null)
    .order('data', { ascending: true })
    .order('hora', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(`Total records: ${data.length}`);
  
  if (data.length > 0) {
    console.log('\nFirst 5 records:');
    data.slice(0, 5).forEach(r => {
      console.log(`  ${r.data} ${r.hora} -> ${r.temperatura}`);
    });
    
    console.log('\nLast 5 records:');
    data.slice(-5).forEach(r => {
      console.log(`  ${r.data} ${r.hora} -> ${r.temperatura}`);
    });
    
    // Check date range
    const firstDate = data[0].data;
    const lastDate = data[data.length - 1].data;
    console.log(`\nDate range: ${firstDate} to ${lastDate}`);
    
    // Test date parsing
    const parseDate = (dateStr, timeStr) => {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, ...timeStr.split(':').map(Number));
    };
    
    const mostRecent = data[data.length - 1];
    const referenceTime = parseDate(mostRecent.data, mostRecent.hora).getTime();
    const cutoffTime = referenceTime - (24 * 60 * 60 * 1000); // 1 day back
    
    console.log(`\nMost recent: ${mostRecent.data} ${mostRecent.hora}`);
    console.log(`Reference timestamp: ${referenceTime}`);
    console.log(`Cutoff (1 day ago): ${cutoffTime}`);
    
    // Count records in last 24 hours
    const recentRecords = data.filter(entry => {
      const entryTime = parseDate(entry.data, entry.hora).getTime();
      return entryTime >= cutoffTime;
    });
    
    console.log(`\nRecords in last 24 hours: ${recentRecords.length}`);
    
    // Check for cabo column
    console.log('\nChecking for cabo column...');
    const sampleRecord = data[0];
    const columns = Object.keys(sampleRecord);
    console.log('Columns in measurements table:', columns);
    
    if (columns.includes('cabo')) {
      console.log('WARNING: cabo column still exists!');
      const { data: caboData } = await supabase
        .from('measurements')
        .select('cabo')
        .not('cabo', 'is', null)
        .limit(5);
      console.log('Sample cabo values:', caboData);
    } else {
      console.log('cabo column not found in measurements table');
    }
  }
}

debugHistory().catch(console.error);
