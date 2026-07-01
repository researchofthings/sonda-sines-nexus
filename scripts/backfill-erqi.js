const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// SI formulas matching page.tsx calculateSI
function si_doSat(x) {
  if (x >= 80) return 100;
  if (x < 50) return 10;
  if (x < 60) return 30;
  return 30 + (x - 60) * 2.5;
}
function si_clorofila(x) { return Math.max(0, Math.min(100, (1 - (x / 20)) * 100)); }
function si_turbidez(x) { return Math.max(0, Math.min(100, (1 - (x / 80)) * 100)); }
function si_spCond(x) { return Math.max(0, Math.min(100, (1 - Math.abs(x * 1000 - 54000) / 4000) * 100)); }
function si_ph(x) { return Math.max(0, Math.min(100, (1 - Math.abs(x - 7.9) / 0.4) * 100)); }
function si_temperatura(x) { return Math.max(0, Math.min(100, Math.exp(-Math.pow(x - 16.5, 2) / (2 * Math.pow(1.5, 2))) * 100)); }
function si_orp(x) { return Math.max(0, Math.min(100, ((x - 100) / 270) * 100)); }

function calculateERQI(row) {
  const doSat   = si_doSat(row.do_sat ?? 0);
  const chlA    = si_clorofila(row.clorofila ?? 0);
  const turb    = si_turbidez(row.turbidez ?? 0);
  const spCond  = si_spCond(row.sp_condutividade ?? 0);
  const ph      = si_ph(row.ph ?? 0);
  const temp    = si_temperatura(row.temperatura ?? 0);
  const orp     = si_orp(row.orp ?? 0);

  const erqi = (doSat * 0.25 + chlA * 0.15 + turb * 0.15 + spCond * 0.10 + ph * 0.15 + temp * 0.10 + orp * 0.15);

  return {
    data: row.data,
    hora: row.hora,
    erqi: Math.round(erqi * 100) / 100,
    si_do_sat: Math.round(doSat * 100) / 100,
    si_clorofila: Math.round(chlA * 100) / 100,
    si_turbidez: Math.round(turb * 100) / 100,
    si_sp_condutividade: Math.round(spCond * 100) / 100,
    si_ph: Math.round(ph * 100) / 100,
    si_temperatura: Math.round(temp * 100) / 100,
    si_orp: Math.round(orp * 100) / 100,
  };
}

async function main() {
  console.log('Fetching all measurements...');
  const { data: measurements, error } = await supabase
    .from('measurements')
    .select('data,hora,do_sat,clorofila,turbidez,sp_condutividade,ph,temperatura,orp')
    .order('data', { ascending: true })
    .order('hora', { ascending: true });

  if (error) { console.error('Fetch error:', error); return; }
  console.log(`Processing ${measurements.length} rows...`);

  const rows = measurements.map(calculateERQI);

  // Clear existing erqi_history first
  await supabase.from('erqi_history').delete().neq('id', 0);
  console.log('Cleared existing erqi_history');

  // Insert in batches of 500
  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error: insertError } = await supabase.from('erqi_history').insert(batch);
    if (insertError) { console.error('Insert error:', insertError); return; }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${rows.length}`);
  }

  console.log('Done! Sample:', JSON.stringify(rows[rows.length - 1]));
}

main();
