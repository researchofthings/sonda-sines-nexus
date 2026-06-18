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

async function check() {
  console.log('Checking current_measurements...\n');
  const { data, error } = await supabase
    .from('current_measurements')
    .select('*')
    .order('key');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Keys in current_measurements:');
  data.forEach(r => {
    console.log('-', r.key + ':', r.value, r.unit);
  });
  
  console.log('\nMissing keys?');
  const expected = ['temperatura', 'condutividade', 'spCondutividade', 'salinidade', 'tds', 'ph', 'orp', 'do', 'doSat', 'turbidez', 'focieritrina', 'focieritrinaRFU', 'clorofila', 'clorofilaRFU', 'profundidade'];
  const found = data.map(r => r.key);
  expected.forEach(k => {
    if (!found.includes(k)) console.log('MISSING:', k);
  });
}

check().catch(console.error);
