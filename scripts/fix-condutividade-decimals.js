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
  console.error('Error: Missing Supabase credentials in .env.local');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCondutividadeDecimals() {
  console.log('Fetching all measurements with condutividade values...');
  
  const { data, error } = await supabase
    .from('measurements')
    .select('id, condutividade')
    .not('condutividade', 'is', null);
  
  if (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} records with condutividade values`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const record of data) {
    const originalValue = record.condutividade;
    
    // Check if value has a decimal point that shouldn't be there
    // Values like 45.500 should become 45500
    // But values like 7.5 should stay as 7.5
    
    // The pattern is: if it ends with .000, .500, etc. (thousands separator style)
    // We need to determine which values are wrong
    
    // For condutividade, typical range is 48000-56000 mS/cm
    // So values like 45.500 are likely 45500, not 45.5
    // Values like 50.200 are likely 50200, not 50.2
    
    const stringValue = String(originalValue);
    
    // If the value has a decimal point and the part after decimal is 3 digits (like .500, .200)
    // it's likely a thousands separator issue
    if (stringValue.includes('.') && /^\d+\.\d{3}$/.test(stringValue)) {
      // Remove the decimal point
      const fixedValue = parseFloat(stringValue.replace('.', ''));
      
      console.log(`Record ${record.id}: ${originalValue} → ${fixedValue}`);
      
      const { error: updateError } = await supabase
        .from('measurements')
        .update({ condutividade: fixedValue })
        .eq('id', record.id);
      
      if (updateError) {
        console.error(`Error updating record ${record.id}:`, updateError);
      } else {
        fixedCount++;
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total records processed: ${data.length}`);
  console.log(`Records fixed: ${fixedCount}`);
  console.log(`Records skipped (no change needed): ${skippedCount}`);
  
  console.log('\nDone!');
}

fixCondutividadeDecimals().catch(console.error);
