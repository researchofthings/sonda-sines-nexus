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
  console.log('Checking measurements table (latest entry):\n');
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Latest measurement:', data[0].data, data[0].hora);
    console.log('- temperatura:', data[0].temperatura);
    console.log('- condutividade:', data[0].condutividade);
    console.log('- sp_condutividade:', data[0].sp_condutividade);
    console.log('- salinidade:', data[0].salinidade);
    console.log('- tds:', data[0].tds);
    console.log('- clorofila_rfu:', data[0].clorofila_rfu);
  } else {
    console.log('No data found');
  }
}

check().catch(console.error);
