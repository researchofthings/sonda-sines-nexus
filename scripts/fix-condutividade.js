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

async function fixCondutividade() {
  console.log('Fixing condutividade values...\n');
  
  // Get all measurements with condutividade
  const { data, error } = await supabase
    .from('measurements')
    .select('id, condutividade')
    .not('condutividade', 'is', null);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log(`Found ${data.length} records with condutividade`);
  
  let updated = 0;
  let errors = 0;
  
  for (const row of data) {
    const oldValue = row.condutividade;
    // Multiply by 1000 to fix the decimal (45.500 -> 45500)
    const newValue = oldValue * 1000;
    
    const { error: updateError } = await supabase
      .from('measurements')
      .update({ condutividade: newValue })
      .eq('id', row.id);
    
    if (updateError) {
      console.error(`Error updating row ${row.id}:`, updateError);
      errors++;
    } else {
      updated++;
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${data.length} rows...`);
      }
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
  
  // Show sample before/after
  const { data: sample } = await supabase
    .from('measurements')
    .select('condutividade')
    .not('condutividade', 'is', null)
    .limit(3);
  
  console.log('\nSample values after fix:');
  sample.forEach((r, i) => console.log(`${i + 1}. ${r.condutividade}`));
}

fixCondutividade().catch(console.error);
