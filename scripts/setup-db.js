// Script to set up Supabase tables
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Setting up database...');

  // Create values table
  const { error: valuesError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS values (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        value REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_values_key ON values(key);
      CREATE INDEX IF NOT EXISTS idx_values_timestamp ON values(timestamp);
    `
  });

  if (valuesError) {
    // Try direct SQL if RPC fails
    console.log('Trying direct table creation...');
    
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('values')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, create it via REST API or SQL
      console.log('Please create the tables manually in Supabase dashboard SQL Editor:');
      console.log(`
-- Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS values (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  value REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_values_key ON values(key);
CREATE INDEX IF NOT EXISTS idx_values_timestamp ON values(timestamp);

CREATE TABLE IF NOT EXISTS current_values (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value REAL NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_current_values_key ON current_values(key);
      `);
    } else {
      console.log('Values table already exists or created successfully');
    }
  } else {
    console.log('Values table created successfully');
  }

  // Create current_values table
  const { error: currentError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS current_values (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_current_values_key ON current_values(key);
    `
  });

  if (currentError) {
    console.log('Current values table may already exist');
  } else {
    console.log('Current values table created successfully');
  }

  console.log('Database setup complete!');
}

setupDatabase().catch(console.error);
