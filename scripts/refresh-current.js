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

async function refresh() {
  console.log('Getting latest measurements...\n');
  
  // Get latest measurement
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
    .limit(1);
  
  if (error || !data || data.length === 0) {
    console.error('Error fetching measurements:', error);
    return;
  }
  
  const latest = data[0];
  console.log('Latest measurement:', latest.data, latest.hora);
  
  // Define measurement types to update
  const measurementTypes = [
    { key: 'temperatura', value: latest.temperatura, unit: 'ºC' },
    { key: 'condutividade', value: latest.condutividade, unit: 'mS/cm' },
    { key: 'spCondutividade', value: latest.sp_condutividade, unit: 'mS/cm' },
    { key: 'salinidade', value: latest.salinidade, unit: 'PSU' },
    { key: 'tds', value: latest.tds, unit: 'mg/l' },
    { key: 'ph', value: latest.ph, unit: '' },
    { key: 'orp', value: latest.orp, unit: 'mV' },
    { key: 'do', value: latest.do_mg, unit: 'mg/l' },
    { key: 'doSat', value: latest.do_sat, unit: '%sat' },
    { key: 'turbidez', value: latest.turbidez, unit: 'NTU' },
    { key: 'focieritrina', value: latest.focieritrina, unit: 'ug/l' },
    { key: 'focieritrinaRFU', value: latest.focieritrina_rfu, unit: 'RFU' },
    { key: 'clorofila', value: latest.clorofila, unit: 'ug/l' },
    { key: 'clorofilaRFU', value: latest.clorofila_rfu, unit: 'RFU' },
    { key: 'profundidade', value: latest.profundidade, unit: 'm' },
  ];
  
  console.log('\nUpdating current_measurements...\n');
  
  for (const m of measurementTypes) {
    if (m.value !== undefined && m.value !== null) {
      const { error: upsertError } = await supabase
        .from('current_measurements')
        .upsert(
          {
            key: m.key,
            value: m.value,
            unit: m.unit,
            data: latest.data,
            hora: latest.hora,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      
      if (upsertError) {
        console.error(`Error updating ${m.key}:`, upsertError);
      } else {
        console.log(`Updated ${m.key}: ${m.value} ${m.unit}`);
      }
    }
  }
  
  console.log('\nDone!');
}

refresh().catch(console.error);
