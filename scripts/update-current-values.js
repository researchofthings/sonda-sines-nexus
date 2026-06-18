const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const measurementTypes = [
  { key: 'temperatura', column: 'temperatura', unit: 'ºC' },
  { key: 'condutividade', column: 'condutividade', unit: 'mS/cm' },
  { key: 'spCondutividade', column: 'sp_condutividade', unit: 'mS/cm' },
  { key: 'salinidade', column: 'salinidade', unit: 'PSU' },
  { key: 'tds', column: 'tds', unit: 'mg/l' },
  { key: 'ph', column: 'ph', unit: '' },
  { key: 'orp', column: 'orp', unit: 'mV' },
  { key: 'do', column: 'do_mg', unit: 'mg/l' },
  { key: 'doSat', column: 'do_sat', unit: '%sat' },
  { key: 'turbidez', column: 'turbidez', unit: 'NTU' },
  { key: 'focieritrina', column: 'focieritrina', unit: 'ug/l' },
  { key: 'focieritrinaRFU', column: 'focieritrina_rfu', unit: 'RFU' },
  { key: 'clorofila', column: 'clorofila', unit: 'ug/l' },
  { key: 'clorofilaRFU', column: 'clorofila_rfu', unit: 'RFU' },
  { key: 'profundidade', column: 'profundidade', unit: 'm' },
  { key: 'cabo', column: 'cabo', unit: 'V' },
];

async function updateCurrentValues() {
  // Get the most recent measurement
  const { data: latest, error } = await supabase
    .from('measurements')
    .select('*')
    .order('data', { ascending: false })
    .order('hora', { ascending: false })
    .limit(1)
    .single();

  if (error || !latest) {
    console.error('Error getting latest measurement:', error);
    return;
  }

  console.log('Latest measurement:', latest);

  // Upsert each value to current_measurements
  for (const type of measurementTypes) {
    const value = latest[type.column];
    if (value !== null && value !== undefined) {
      const { error: upsertError } = await supabase
        .from('current_measurements')
        .upsert({
          key: type.key,
          value: value,
          unit: type.unit,
          data: latest.data,
          hora: latest.hora,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (upsertError) {
        console.error(`Error upserting ${type.key}:`, upsertError);
      } else {
        console.log(`Updated ${type.key}: ${value} ${type.unit}`);
      }
    }
  }

  console.log('\nCurrent values updated!');
}

updateCurrentValues().catch(console.error);
