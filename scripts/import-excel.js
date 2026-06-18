const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
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

async function importExcel(filePath) {
  console.log(`Reading Excel: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Found ${jsonData.length} rows`);
  
  // Extract headers from first row
  const headers = jsonData[0];
  console.log('Headers:', headers);
  
  // Map column indices
  const columnMap = {
    data: headers.indexOf('Data'),
    hora: headers.indexOf('Hora'),
    temperatura: headers.indexOf('Temperatura ÂºC'),
    condutividade: headers.indexOf('Condutividade mS/cm'),
    spCondutividade: headers.indexOf('SpCondutividade mS/cm'),
    salinidade: headers.indexOf('Salinidade PSU'),
    tds: headers.indexOf('TDS mg/l'),
    ph: headers.indexOf('pH'),
    orp: headers.indexOf('ORP mV'),
    do: headers.indexOf('DO mg/l'),
    doSat: headers.indexOf('DO %sat'),
    turbidez: headers.indexOf('Turbidez NTU'),
    focieritrina: headers.indexOf('Focieritrina ug/l'),
    focieritrinaRFU: headers.indexOf('Ficoeritrina RFU'),
    clorofila: headers.indexOf('Clorofila ug/l'),
    clorofilaRFU: headers.indexOf('Clorofila RFU'),
    profundidade: headers.indexOf('Profundidade m')
  };
  
  console.log('Column mapping:', columnMap);
  
  // Parse data rows
  const measurements = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row[columnMap.data] || !row[columnMap.hora]) continue;
    
    // Parse date from Excel format
    let dataValue = row[columnMap.data];
    let dataStr;
    
    if (typeof dataValue === 'number') {
      // Excel serial date - convert to JS date
      // Excel epoch is 1900-01-01, but JS Date is 1970-01-01
      // Excel counts days since 1899-12-30 (with leap year bug)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const daysOffset = dataValue;
      const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      dataStr = `${year}-${month}-${day}`;
    } else {
      // String date - assume DD-MM-YYYY format and convert to YYYY-MM-DD
      const dateMatch = String(dataValue).match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (dateMatch) {
        dataStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      } else {
        dataStr = String(dataValue);
      }
    }
    
    // Parse time - Excel stores time as fraction of a day
    let timeValue = row[columnMap.hora];
    let timeStr;
    if (typeof timeValue === 'number') {
      // Convert fraction of day to hours, minutes, seconds
      const totalSeconds = Math.round(timeValue * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      timeStr = String(timeValue);
    }
    
    measurements.push({
      data: dataStr,
      hora: timeStr,
      temperatura: parseFloat(row[columnMap.temperatura]) || 0,
      condutividade: parseFloat(row[columnMap.condutividade]) || 0,
      sp_condutividade: parseFloat(row[columnMap.spCondutividade]) || 0,
      salinidade: parseFloat(row[columnMap.salinidade]) || 0,
      tds: parseFloat(row[columnMap.tds]) || 0,
      ph: parseFloat(row[columnMap.ph]) || 0,
      orp: parseFloat(row[columnMap.orp]) || 0,
      do_mg: parseFloat(row[columnMap.do]) || 0,
      do_sat: parseFloat(row[columnMap.doSat]) || 0,
      turbidez: parseFloat(row[columnMap.turbidez]) || 0,
      focieritrina: parseFloat(row[columnMap.focieritrina]) || 0,
      focieritrina_rfu: parseFloat(row[columnMap.focieritrinaRFU]) || 0,
      clorofila: parseFloat(row[columnMap.clorofila]) || 0,
      clorofila_rfu: parseFloat(row[columnMap.clorofilaRFU]) || 0,
      profundidade: parseFloat(row[columnMap.profundidade]) || 0
    });
  }
  
  console.log(`\nParsed ${measurements.length} valid measurements`);
  if (measurements.length > 0) {
    console.log('First entry:', measurements[0]);
    console.log('Last entry:', measurements[measurements.length - 1]);
  }
  
  // Clear existing data
  console.log('\nClearing existing data...');
  const { error: deleteError } = await supabase.from('measurements').delete().neq('id', 0);
  if (deleteError) {
    console.error('Error clearing data:', deleteError);
    return;
  }
  
  // Insert new data
  console.log('Inserting new data...');
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < measurements.length; i += batchSize) {
    const batch = measurements.slice(i, i + batchSize);
    const { error: insertError } = await supabase.from('measurements').insert(batch);
    
    if (insertError) {
      console.error(`Error inserting batch ${i}:`, insertError);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${measurements.length} rows...`);
    }
  }
  
  console.log(`\n=== Import Summary ===`);
  console.log(`Total inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node import-excel.js <excel-file>');
  process.exit(1);
}

importExcel(filePath).catch(console.error);
