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
  console.log('Checking latest data in Supabase...\n');
  
  // Get count
  const { count, error: countError } = await supabase
    .from('measurements')
    .select('*', { count: 'exact', head: true })
    .not('temperatura', 'is', null);
  
  if (countError) {
    console.error('Count error:', countError);
  } else {
    console.log('Total records with temperatura:', count);
  }
  
  // Get 5 newest
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .not('temperatura', 'is', null)
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n5 newest records:');
    data.forEach((r, i) => console.log(i + 1 + '.', r.data, r.hora, 'Temp:', r.temperatura));
  }
  
  // Get 5 oldest
  const { data: oldData, error: oldError } = await supabase
    .from('measurements')
    .select('*')
    .not('temperatura', 'is', null)
    .order('data', { ascending: true })
    .order('hora', { ascending: true })
    .limit(5);
  
  if (oldError) {
    console.error('Old error:', oldError);
  } else {
    console.log('\n5 oldest records:');
    oldData.forEach((r, i) => console.log(i + 1 + '.', r.data, r.hora, 'Temp:', r.temperatura));
  }
}

check().catch(console.error);
