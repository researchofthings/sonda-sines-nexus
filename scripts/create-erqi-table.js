const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Test by inserting a dummy row to see if table exists
  const { error: testError } = await supabase.from('erqi_history').select('id').limit(1);
  if (!testError) {
    console.log('erqi_history table already exists');
    return;
  }

  console.log('Table does not exist. Please run this SQL in your Supabase dashboard SQL editor:');
  console.log(`
CREATE TABLE erqi_history (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  erqi NUMERIC,
  si_do_sat NUMERIC,
  si_clorofila NUMERIC,
  si_turbidez NUMERIC,
  si_sp_condutividade NUMERIC,
  si_ph NUMERIC,
  si_temperatura NUMERIC,
  si_orp NUMERIC
);
CREATE INDEX idx_erqi_history_data_hora ON erqi_history (data DESC, hora DESC);
  `);
}

main();
